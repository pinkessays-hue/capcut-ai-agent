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

router.get('/analytics', authMiddleware, requireRole('admin'), (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate, endDate 필수' });
    return;
  }

  const db = getDb();
  const start = String(startDate);
  const end = String(endDate);
  const startISO = `${start}T00:00:00Z`;
  const endISO = `${end}T23:59:59Z`;

  const totalOrders = db.prepare(
    "SELECT COUNT(*) as cnt FROM orders WHERE created_at >= ? AND created_at <= ?"
  ).get(startISO, endISO) as { cnt: number };

  const totalSales = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE created_at >= ? AND created_at <= ? AND order_status != 'cancelled'"
  ).get(startISO, endISO) as { total: number };

  const confirmedSales = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE created_at >= ? AND created_at <= ? AND order_status = 'confirmed'"
  ).get(startISO, endISO) as { total: number };

  const cancelledAmount = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE created_at >= ? AND created_at <= ? AND order_status = 'cancelled'"
  ).get(startISO, endISO) as { total: number };

  const refundedAmount = db.prepare(
    "SELECT COALESCE(SUM(refund_amount), 0) as total FROM orders WHERE created_at >= ? AND created_at <= ? AND refund_amount > 0"
  ).get(startISO, endISO) as { total: number };

  const totalCommission = db.prepare(
    "SELECT COALESCE(SUM(commission), 0) as total FROM orders WHERE created_at >= ? AND created_at <= ? AND order_status = 'confirmed'"
  ).get(startISO, endISO) as { total: number };

  const attributedOrders = db.prepare(
    "SELECT COUNT(*) as cnt FROM orders WHERE created_at >= ? AND created_at <= ? AND link_id IS NOT NULL AND link_id != ''"
  ).get(startISO, endISO) as { cnt: number };

  const unattributedOrders = db.prepare(
    "SELECT COUNT(*) as cnt FROM orders WHERE created_at >= ? AND created_at <= ? AND (link_id IS NULL OR link_id = '')"
  ).get(startISO, endISO) as { cnt: number };

  const daily = db.prepare(`
    SELECT date(created_at) as date,
      COUNT(*) as orders,
      COALESCE(SUM(CASE WHEN order_status != 'cancelled' THEN amount ELSE 0 END), 0) as sales,
      SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancels,
      COALESCE(SUM(CASE WHEN order_status = 'cancelled' THEN amount ELSE 0 END), 0) as cancelAmount
    FROM orders
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY date(created_at)
    ORDER BY date(created_at)
  `).all(startISO, endISO) as { date: string; orders: number; sales: number; cancels: number; cancelAmount: number }[];

  const byProduct = db.prepare(`
    SELECT o.product_id as productId,
      COALESCE(p.name, o.product_id) as productName,
      COUNT(*) as orders,
      COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.amount ELSE 0 END), 0) as sales,
      COUNT(*) as quantity,
      SUM(CASE WHEN o.order_status = 'cancelled' THEN 1 ELSE 0 END) as cancels,
      COALESCE(SUM(CASE WHEN o.order_status = 'cancelled' THEN o.amount ELSE 0 END), 0) as cancelAmount
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.created_at >= ? AND o.created_at <= ?
    GROUP BY o.product_id
    ORDER BY sales DESC
  `).all(startISO, endISO) as { productId: string; productName: string; orders: number; sales: number; quantity: number; cancels: number; cancelAmount: number }[];

  const byCreator = db.prepare(`
    SELECT o.creator_id as creatorId,
      COALESCE(c.display_name, o.creator_id) as creatorName,
      COUNT(*) as orders,
      COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.amount ELSE 0 END), 0) as sales,
      COALESCE(SUM(CASE WHEN o.order_status = 'confirmed' THEN o.commission ELSE 0 END), 0) as commission
    FROM orders o
    LEFT JOIN creators c ON o.creator_id = c.id
    WHERE o.created_at >= ? AND o.created_at <= ?
      AND o.link_id IS NOT NULL AND o.link_id != ''
    GROUP BY o.creator_id
    ORDER BY sales DESC
  `).all(startISO, endISO) as { creatorId: string; creatorName: string; orders: number; sales: number; commission: number }[];

  const lastSync = db.prepare("SELECT value FROM settings WHERE key = 'cafe24_last_sync'").get() as { value: string } | undefined;
  const totalSyncedOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE cafe24_order_id IS NOT NULL AND cafe24_order_id != ''").get() as { cnt: number };

  res.json({
    ok: true,
    data: {
      summary: {
        totalOrders: totalOrders.cnt,
        totalSales: totalSales.total,
        confirmedSales: confirmedSales.total,
        cancelledAmount: cancelledAmount.total,
        refundedAmount: refundedAmount.total,
        totalCommission: totalCommission.total,
        attributedOrders: attributedOrders.cnt,
        unattributedOrders: unattributedOrders.cnt,
      },
      daily,
      byProduct,
      byCreator,
      cafe24Status: {
        connected: cafe24Client.isConfigured(),
        lastSync: lastSync?.value || null,
        totalSyncedOrders: totalSyncedOrders.cnt,
      },
    },
  });
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
