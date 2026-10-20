import { Router } from 'express';
import { getDb, seedDatabase } from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth';
import { cafe24Client } from '../providers/cafe24';
import { payoutProvider } from '../providers/payout';

const router = Router();

router.get('/dashboard', authMiddleware, requireRole('admin'), (_req, res) => {
  const db = getDb();

  const totalCreators = db.prepare('SELECT COUNT(*) as cnt FROM creators').get() as { cnt: number };
  const activeCreators = db.prepare("SELECT COUNT(*) as cnt FROM creators WHERE status = 'active'").get() as { cnt: number };
  const totalLinks = db.prepare('SELECT COUNT(*) as cnt FROM links').get() as { cnt: number };
  const totalClicks = db.prepare('SELECT COUNT(*) as cnt FROM click_logs').get() as { cnt: number };
  const totalOrders = db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number };
  const totalSales = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE order_status != 'cancelled'").get() as { total: number };
  const totalCommission = db.prepare("SELECT COALESCE(SUM(commission), 0) as total FROM orders WHERE order_status = 'confirmed'").get() as { total: number };
  const pendingSettlement = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM settlements WHERE status IN ('pending', 'processing')").get() as { total: number };

  res.json({
    ok: true,
    data: {
      totalCreators: totalCreators.cnt,
      activeCreators: activeCreators.cnt,
      totalLinks: totalLinks.cnt,
      totalClicks: totalClicks.cnt,
      totalOrders: totalOrders.cnt,
      totalSales: totalSales.total,
      totalCommission: totalCommission.total,
      pendingSettlement: pendingSettlement.total,
    },
  });
});

router.get('/integrations', authMiddleware, requireRole('admin'), (_req, res) => {
  const db = getDb();
  const lastSync = db.prepare("SELECT value FROM settings WHERE key = 'cafe24_last_sync'").get() as { value: string } | undefined;

  res.json({
    ok: true,
    data: {
      cafe24: {
        connected: cafe24Client.isConfigured(),
        mallId: cafe24Client.isConfigured() ? cafe24Client.getStatus().mallId : undefined,
        lastSync: lastSync?.value,
      },
      payout: {
        configured: payoutProvider.isConfigured(),
        provider: payoutProvider.getProviderName(),
      },
    },
  });
});

router.get('/test-mode', (_req, res) => {
  res.json({
    ok: true,
    data: {
      testMode: process.env.NODE_ENV !== 'production',
    },
  });
});

router.post('/reset-test-data', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: '운영 환경에서는 테스트 데이터를 초기화할 수 없습니다.' });
    return;
  }

  const db = getDb();

  db.exec(`
    DELETE FROM click_logs WHERE link_id IN (SELECT id FROM links WHERE creator_id IN (SELECT id FROM creators WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com')));
    DELETE FROM point_ledger WHERE creator_id IN (SELECT id FROM creators WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
    DELETE FROM settlements WHERE creator_id IN (SELECT id FROM creators WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
    DELETE FROM bank_accounts WHERE creator_id IN (SELECT id FROM creators WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
    DELETE FROM orders WHERE creator_id IN (SELECT id FROM creators WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
    DELETE FROM links WHERE creator_id IN (SELECT id FROM creators WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
    DELETE FROM audit_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com');
    DELETE FROM creators WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com');
    DELETE FROM users WHERE email LIKE '%@example.com';
  `);

  seedDatabase();

  res.json({ ok: true, message: '테스트 데이터가 초기화되었습니다.' });
});

router.get('/audit-log', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const entries = db.prepare(`
    SELECT a.*, u.email as user_email, u.name as user_name
    FROM audit_log a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM audit_log').get() as { cnt: number };

  res.json({ ok: true, entries, total: total.cnt, limit, offset });
});

export default router;
