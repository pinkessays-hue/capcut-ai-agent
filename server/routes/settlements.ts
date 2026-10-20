import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getCreatorBalance, addAuditLog } from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth';
import { payoutProvider } from '../providers/payout';

const router = Router();

function getCreatorIdFromUser(userId: string): string | null {
  const db = getDb();
  const creator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(userId) as { id: string } | undefined;
  return creator?.id || null;
}

router.get('/mine', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const creatorId = getCreatorIdFromUser(req.user!.id);
  if (!creatorId) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }
  const settlements = db.prepare('SELECT * FROM settlements WHERE creator_id = ? ORDER BY created_at DESC').all(creatorId);
  res.json({ ok: true, data: settlements });
});

router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
  const db = getDb();
  const settlements = db.prepare(`
    SELECT s.*, c.display_name as creator_name
    FROM settlements s
    JOIN creators c ON s.creator_id = c.id
    ORDER BY s.created_at DESC
  `).all();
  res.json({ ok: true, data: settlements });
});

router.post('/request', authMiddleware, async (req: AuthRequest, res) => {
  const db = getDb();
  const creatorId = req.user!.role === 'admin' && req.body.creatorId
    ? req.body.creatorId
    : getCreatorIdFromUser(req.user!.id);

  if (!creatorId) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }

  const balance = getCreatorBalance(creatorId);
  const minAmountRow = db.prepare("SELECT value FROM settings WHERE key = 'settlement_min_amount'").get() as { value: string } | undefined;
  const minAmount = parseInt(minAmountRow?.value || '5000');

  if (balance < minAmount) {
    res.status(400).json({ error: `사용 가능 포인트가 최소 정산 금액(${minAmount.toLocaleString()}원) 미만입니다.`, balance, minAmount });
    return;
  }

  const bankAccount = db.prepare('SELECT * FROM bank_accounts WHERE creator_id = ?').get(creatorId) as { bank_name: string; account_holder: string; verified: number } | undefined;
  if (!bankAccount) {
    res.status(400).json({ error: '계좌 정보가 등록되지 않았습니다. 계좌를 먼저 등록하세요.' });
    return;
  }
  if (!bankAccount.verified) {
    res.status(400).json({ error: '계좌 확인이 완료되지 않았습니다.' });
    return;
  }

  const pendingSettlement = db.prepare("SELECT id FROM settlements WHERE creator_id = ? AND status IN ('pending', 'processing')").get(creatorId);
  if (pendingSettlement) {
    res.status(400).json({ error: '이미 처리 중인 정산 요청이 있습니다.' });
    return;
  }

  const idempotencyKey = `settlement_${creatorId}_${Date.now()}`;
  const settlementId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO settlements (id, creator_id, amount, status, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(settlementId, creatorId, balance, 'pending', idempotencyKey, now);

  if (!payoutProvider.isConfigured()) {
    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(settlementId);
    res.status(201).json({
      ok: true,
      data: settlement,
      warning: '지급대행사가 연결되지 않았습니다. 운영자가 지급대행사 설정을 완료한 후 자동 지급이 진행됩니다.',
    });
    return;
  }

  try {
    db.prepare("UPDATE settlements SET status = 'processing' WHERE id = ?").run(settlementId);

    const result = await payoutProvider.requestPayout({
      creatorId,
      amount: balance,
      bankName: bankAccount.bank_name,
      accountNumber: '',
      accountHolder: bankAccount.account_holder,
      idempotencyKey,
    });

    if (result.success) {
      db.prepare("UPDATE settlements SET status = ?, payout_reference = ?, completed_at = ? WHERE id = ?").run(
        result.status, result.reference, result.status === 'completed' ? now : null, settlementId
      );
      const newBalance = getCreatorBalance(creatorId);
      db.prepare('INSERT INTO point_ledger (id, creator_id, order_id, entry_type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), creatorId, null, 'payout', -balance, newBalance - balance, `정산 지급 (${settlementId})`, now
      );
    } else {
      db.prepare("UPDATE settlements SET status = 'failed', error_message = ? WHERE id = ?").run(result.errorMessage, settlementId);
    }

    addAuditLog(req.user!.id, 'settlement_request', 'settlement', settlementId, null, { amount: balance, status: result.status });
    const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(settlementId);
    res.status(201).json({ ok: true, data: settlement });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    db.prepare("UPDATE settlements SET status = 'failed', error_message = ? WHERE id = ?").run(message, settlementId);
    res.status(500).json({ error: '정산 처리 중 오류가 발생했습니다.', detail: message });
  }
});

router.patch('/:id/status', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'completed', 'failed'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: '유효하지 않은 상태입니다.' });
    return;
  }

  const db = getDb();
  const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!settlement) {
    res.status(404).json({ error: '정산 건을 찾을 수 없습니다.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE settlements SET status = ?, completed_at = ? WHERE id = ?').run(
    status, status === 'completed' ? now : null, req.params.id
  );

  addAuditLog(req.user!.id, 'settlement_status_change', 'settlement', req.params.id,
    { status: settlement.status }, { status });

  const updated = db.prepare('SELECT * FROM settlements WHERE id = ?').get(req.params.id);
  res.json({ ok: true, data: updated });
});

router.get('/settings', authMiddleware, (_req, res) => {
  const db = getDb();
  const minAmount = db.prepare("SELECT value FROM settings WHERE key = 'settlement_min_amount'").get() as { value: string } | undefined;
  const windowDays = db.prepare("SELECT value FROM settings WHERE key = 'attribution_window_days'").get() as { value: string } | undefined;

  res.json({
    ok: true,
    data: {
      settlementMinAmount: parseInt(minAmount?.value || '5000'),
      attributionWindowDays: parseInt(windowDays?.value || '30'),
      payoutProviderConnected: payoutProvider.isConfigured(),
      payoutProviderName: payoutProvider.getProviderName(),
    },
  });
});

router.put('/settings', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const db = getDb();
  const { settlementMinAmount, attributionWindowDays } = req.body;

  if (settlementMinAmount !== undefined) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('settlement_min_amount', String(settlementMinAmount));
  }
  if (attributionWindowDays !== undefined) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('attribution_window_days', String(attributionWindowDays));
  }

  addAuditLog(req.user!.id, 'settings_update', 'settings', 'settlement', null, { settlementMinAmount, attributionWindowDays });
  res.json({ ok: true });
});

export default router;
