import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb, addAuditLog } from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth';

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || (() => {
  console.warn('[security] ENCRYPTION_KEY가 설정되지 않았습니다. 임시 키를 사용합니다.');
  return crypto.randomBytes(16).toString('hex');
})();

function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex').subarray(0, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key.length === 32 ? key : crypto.createHash('sha256').update(ENCRYPTION_KEY).digest(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('잘못된 암호화 데이터 형식');
  const [ivHex, tagHex, encrypted] = parts;
  const key = Buffer.from(ENCRYPTION_KEY, 'hex').subarray(0, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key.length === 32 ? key : crypto.createHash('sha256').update(ENCRYPTION_KEY).digest(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function maskAccountNumber(enc: string): string {
  try {
    const num = decrypt(enc);
    if (num.length <= 4) return '****';
    return '*'.repeat(num.length - 4) + num.slice(-4);
  } catch {
    return '****';
  }
}

// --- Creator self-service ---
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const creator = db.prepare(`
    SELECT c.*, u.email
    FROM creators c
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id = ?
  `).get(req.user!.id) as Record<string, unknown> | undefined;

  if (!creator) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }

  res.json({
    ok: true,
    data: {
      ...creator,
      channels: JSON.parse(creator.channels as string || '[]'),
      selected_products: JSON.parse(creator.selected_products as string || '[]'),
    },
  });
});

router.put('/me', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const creator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;
  if (!creator) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }

  const { display_name, phone, category, channels } = req.body;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (display_name !== undefined) { updates.push('display_name = ?'); values.push(display_name); }
  if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
  if (category !== undefined) { updates.push('category = ?'); values.push(category); }
  if (channels !== undefined) { updates.push('channels = ?'); values.push(JSON.stringify(channels)); }

  if (updates.length === 0) {
    res.status(400).json({ error: '수정할 항목이 없습니다.' });
    return;
  }

  values.push(creator.id);
  db.prepare(`UPDATE creators SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  if (display_name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(display_name, req.user!.id);
  }

  const updated = db.prepare(`
    SELECT c.*, u.email
    FROM creators c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(creator.id) as Record<string, unknown>;

  res.json({
    ok: true,
    data: {
      ...updated,
      channels: JSON.parse(updated.channels as string || '[]'),
    },
  });
});

// --- Admin ---
router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
  const db = getDb();
  const creators = db.prepare(`
    SELECT c.*, u.email, u.status as user_status,
      (SELECT COUNT(*) FROM links WHERE creator_id = c.id) as link_count,
      (SELECT COUNT(*) FROM orders WHERE creator_id = c.id) as order_count,
      (SELECT COALESCE(SUM(amount), 0) FROM point_ledger WHERE creator_id = c.id) as balance
    FROM creators c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
  `).all();

  res.json({
    ok: true,
    data: creators.map((c: Record<string, unknown>) => ({
      ...c,
      channels: JSON.parse(c.channels as string || '[]'),
      selected_products: JSON.parse(c.selected_products as string || '[]'),
    })),
  });
});

router.get('/:id', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const creator = db.prepare(`
    SELECT c.*, u.email, u.status as user_status
    FROM creators c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.params.id) as Record<string, unknown> | undefined;

  if (!creator) {
    res.status(404).json({ error: '크리에이터를 찾을 수 없습니다.' });
    return;
  }

  if (req.user!.role !== 'admin') {
    const ownCreator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;
    if (!ownCreator || ownCreator.id !== req.params.id) {
      res.status(403).json({ error: '권한이 없습니다.' });
      return;
    }
  }

  res.json({
    ok: true,
    data: {
      ...creator,
      channels: JSON.parse(creator.channels as string || '[]'),
      selected_products: JSON.parse(creator.selected_products as string || '[]'),
    },
  });
});

router.patch('/:id/status', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const { status, reason } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    res.status(400).json({ error: '유효하지 않은 상태입니다.' });
    return;
  }

  const db = getDb();
  const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!creator) {
    res.status(404).json({ error: '크리에이터를 찾을 수 없습니다.' });
    return;
  }

  const prevStatus = creator.status;
  db.prepare('UPDATE creators SET status = ? WHERE id = ?').run(status, req.params.id);
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, creator.user_id);

  addAuditLog(req.user!.id, 'creator_status_change', 'creator', req.params.id, { status: prevStatus }, { status }, reason);

  const updated = db.prepare(`
    SELECT c.*, u.email
    FROM creators c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.params.id) as Record<string, unknown>;

  res.json({
    ok: true,
    data: {
      ...updated,
      channels: JSON.parse(updated.channels as string || '[]'),
      selected_products: JSON.parse(updated.selected_products as string || '[]'),
    },
  });
});

router.patch('/:id/approve', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const db = getDb();
  const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!creator) {
    res.status(404).json({ error: '크리에이터를 찾을 수 없습니다.' });
    return;
  }
  if (creator.status !== 'pending') {
    res.status(400).json({ error: '대기 중인 신청만 승인할 수 있습니다.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE creators SET status = ?, approved_at = ? WHERE id = ?').run('active', now, req.params.id);

  addAuditLog(req.user!.id, 'creator_approve', 'creator', req.params.id, { status: 'pending' }, { status: 'active' });

  const updated = db.prepare(`
    SELECT c.*, u.email
    FROM creators c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.params.id) as Record<string, unknown>;

  res.json({
    ok: true,
    data: {
      ...updated,
      channels: JSON.parse(updated.channels as string || '[]'),
      selected_products: JSON.parse(updated.selected_products as string || '[]'),
    },
  });
});

router.patch('/:id/reject', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const { reason } = req.body;
  const db = getDb();
  const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!creator) {
    res.status(404).json({ error: '크리에이터를 찾을 수 없습니다.' });
    return;
  }
  if (creator.status !== 'pending') {
    res.status(400).json({ error: '대기 중인 신청만 반려할 수 있습니다.' });
    return;
  }

  db.prepare('UPDATE creators SET status = ?, rejection_reason = ? WHERE id = ?').run('rejected', reason || null, req.params.id);

  addAuditLog(req.user!.id, 'creator_reject', 'creator', req.params.id, { status: 'pending' }, { status: 'rejected', reason });

  const updated = db.prepare(`
    SELECT c.*, u.email
    FROM creators c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.params.id) as Record<string, unknown>;

  res.json({
    ok: true,
    data: {
      ...updated,
      channels: JSON.parse(updated.channels as string || '[]'),
      selected_products: JSON.parse(updated.selected_products as string || '[]'),
    },
  });
});

// --- Bank account ---
router.put('/:id/bank-account', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();

  if (req.user!.role !== 'admin') {
    const ownCreator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;
    if (!ownCreator || ownCreator.id !== req.params.id) {
      res.status(403).json({ error: '본인의 계좌 정보만 수정할 수 있습니다.' });
      return;
    }
  }

  const { bankName, accountNumber, accountHolder } = req.body;
  if (!bankName || !accountNumber || !accountHolder) {
    res.status(400).json({ error: '은행명, 계좌번호, 예금주를 모두 입력하세요.' });
    return;
  }

  const now = new Date().toISOString();
  const encryptedAccount = encrypt(accountNumber);

  const existing = db.prepare('SELECT id FROM bank_accounts WHERE creator_id = ?').get(req.params.id) as { id: string } | undefined;

  if (existing) {
    db.prepare('UPDATE bank_accounts SET bank_name = ?, account_number_enc = ?, account_holder = ?, verified = 0, updated_at = ? WHERE creator_id = ?').run(
      bankName, encryptedAccount, accountHolder, now, req.params.id
    );
  } else {
    db.prepare('INSERT INTO bank_accounts (id, creator_id, bank_name, account_number_enc, account_holder, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      uuidv4(), req.params.id, bankName, encryptedAccount, accountHolder, 0, now, now
    );
  }

  addAuditLog(req.user!.id, 'bank_account_update', 'bank_account', req.params.id, null, { bankName, accountHolder });

  res.json({ ok: true, message: '계좌 정보가 등록되었습니다. 운영자가 확인 후 정산이 가능합니다.' });
});

router.get('/:id/bank-account', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();

  if (req.user!.role !== 'admin') {
    const ownCreator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;
    if (!ownCreator || ownCreator.id !== req.params.id) {
      res.status(403).json({ error: '권한이 없습니다.' });
      return;
    }
  }

  const account = db.prepare('SELECT * FROM bank_accounts WHERE creator_id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!account) {
    res.json({ ok: true, data: null });
    return;
  }

  res.json({
    ok: true,
    data: {
      id: account.id,
      bankName: account.bank_name,
      accountNumberMasked: maskAccountNumber(account.account_number_enc as string),
      accountHolder: account.account_holder,
      verified: !!account.verified,
      updatedAt: account.updated_at,
    },
  });
});

router.put('/:id/bank-account/verify', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const db = getDb();
  const account = db.prepare('SELECT id FROM bank_accounts WHERE creator_id = ?').get(req.params.id);
  if (!account) {
    res.status(404).json({ error: '등록된 계좌가 없습니다.' });
    return;
  }

  db.prepare('UPDATE bank_accounts SET verified = 1, updated_at = ? WHERE creator_id = ?').run(new Date().toISOString(), req.params.id);
  addAuditLog(req.user!.id, 'bank_account_verify', 'bank_account', req.params.id, { verified: false }, { verified: true });
  res.json({ ok: true });
});

export default router;
