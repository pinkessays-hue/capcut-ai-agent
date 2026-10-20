import { Router } from 'express';
import { getDb } from '../db';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

function getCreatorIdFromUser(userId: string): string | null {
  const db = getDb();
  const creator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(userId) as { id: string } | undefined;
  return creator?.id || null;
}

router.get('/summary', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  let creatorId: string | null;

  if (req.user!.role === 'admin' && req.query.creatorId) {
    creatorId = req.query.creatorId as string;
  } else {
    creatorId = getCreatorIdFromUser(req.user!.id);
  }

  if (!creatorId) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }

  const totalCredits = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM point_ledger WHERE creator_id = ? AND entry_type = 'credit'").get(creatorId) as { total: number };
  const totalCancels = db.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM point_ledger WHERE creator_id = ? AND entry_type IN ('cancel', 'reversal')").get(creatorId) as { total: number };
  const totalPayouts = db.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM point_ledger WHERE creator_id = ? AND entry_type = 'payout'").get(creatorId) as { total: number };

  const available = totalCredits.total - totalCancels.total - totalPayouts.total;
  const pendingOrders = db.prepare("SELECT COALESCE(SUM(commission), 0) as total FROM orders WHERE creator_id = ? AND order_status = 'payment_pending'").get(creatorId) as { total: number };

  res.json({
    ok: true,
    data: {
      available,
      pending: pendingOrders.total,
      totalEarned: totalCredits.total,
      totalSettled: totalPayouts.total,
    },
  });
});

router.get('/ledger', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  let creatorId: string | null;

  if (req.user!.role === 'admin' && req.query.creatorId) {
    creatorId = req.query.creatorId as string;
  } else {
    creatorId = getCreatorIdFromUser(req.user!.id);
  }

  if (!creatorId) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const entries = db.prepare('SELECT * FROM point_ledger WHERE creator_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(creatorId, limit, offset);

  res.json({ ok: true, data: entries });
});

export default router;
