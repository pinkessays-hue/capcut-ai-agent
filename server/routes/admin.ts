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

  const totalOrders = db.prepare(
    "SELECT COUNT(*) as cnt FROM orders WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day')"
  ).get(start, end) as { cnt: number };

  const totalSales = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day') AND order_status != 'cancelled'"
  ).get(start, end) as { total: number };

  const confirmedSales = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day') AND order_status = 'confirmed'"
  ).get(start, end) as { total: number };

  const cancelledAmount = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day') AND order_status = 'cancelled'"
  ).get(start, end) as { total: number };

  const refundedAmount = db.prepare(
    "SELECT COALESCE(SUM(refund_amount), 0) as total FROM orders WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day') AND refund_amount > 0"
  ).get(start, end) as { total: number };

  const totalCommission = db.prepare(
    "SELECT COALESCE(SUM(commission), 0) as total FROM orders WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day') AND order_status = 'confirmed'"
  ).get(start, end) as { total: number };

  const attributedOrders = db.prepare(
    "SELECT COUNT(*) as cnt FROM orders WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day') AND link_id IS NOT NULL AND link_id != ''"
  ).get(start, end) as { cnt: number };

  const unattributedOrders = db.prepare(
    "SELECT COUNT(*) as cnt FROM orders WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day') AND (link_id IS NULL OR link_id = '')"
  ).get(start, end) as { cnt: number };

  const daily = db.prepare(`
    SELECT date(ordered_at) as date,
      COUNT(*) as orders,
      COALESCE(SUM(CASE WHEN order_status != 'cancelled' THEN amount ELSE 0 END), 0) as sales,
      SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancels,
      COALESCE(SUM(CASE WHEN order_status = 'cancelled' THEN amount ELSE 0 END), 0) as cancelAmount
    FROM orders
    WHERE ordered_at >= ? AND ordered_at < date(?, '+1 day')
    GROUP BY date(ordered_at)
    ORDER BY date(ordered_at)
  `).all(start, end) as { date: string; orders: number; sales: number; cancels: number; cancelAmount: number }[];

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
    WHERE o.ordered_at >= ? AND o.ordered_at < date(?, '+1 day')
    GROUP BY o.product_id
    ORDER BY sales DESC
  `).all(start, end) as { productId: string; productName: string; orders: number; sales: number; quantity: number; cancels: number; cancelAmount: number }[];

  const byCreator = db.prepare(`
    SELECT o.creator_id as creatorId,
      COALESCE(c.name, o.creator_id) as creatorName,
      COUNT(*) as orders,
      COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.amount ELSE 0 END), 0) as sales,
      COALESCE(SUM(CASE WHEN o.order_status = 'confirmed' THEN o.commission ELSE 0 END), 0) as commission
    FROM orders o
    LEFT JOIN creators c ON o.creator_id = c.id
    WHERE o.ordered_at >= ? AND o.ordered_at < date(?, '+1 day')
      AND o.link_id IS NOT NULL AND o.link_id != ''
    GROUP BY o.creator_id
    ORDER BY sales DESC
  `).all(start, end) as { creatorId: string; creatorName: string; orders: number; sales: number; commission: number }[];

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

router.get('/analytics', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const startDate = (req.query.startDate as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
  const startISO = `${startDate}T00:00:00Z`;
  const endISO = `${endDate}T23:59:59Z`;

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(amount), 0) as total_sales,
      COALESCE(SUM(CASE WHEN order_status = 'confirmed' THEN amount ELSE 0 END), 0) as confirmed_sales,
      COALESCE(SUM(CASE WHEN order_status = 'cancelled' THEN amount ELSE 0 END), 0) as cancelled_amount,
      COALESCE(SUM(CASE WHEN order_status = 'confirmed' THEN commission ELSE 0 END), 0) as total_commission,
      COALESCE(SUM(CASE WHEN creator_id IS NOT NULL THEN 1 ELSE 0 END), 0) as attributed_orders,
      COALESCE(SUM(CASE WHEN creator_id IS NULL THEN 1 ELSE 0 END), 0) as unattributed_orders
    FROM orders
    WHERE created_at >= ? AND created_at <= ?
  `).get(startISO, endISO) as Record<string, number>;

  const refundRow = db.prepare(`
    SELECT COALESCE(SUM(refund_amount), 0) as total
    FROM orders
    WHERE created_at >= ? AND created_at <= ? AND refund_amount > 0
  `).get(startISO, endISO) as { total: number };

  const daily = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as orders,
      COALESCE(SUM(amount), 0) as sales,
      SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancels,
      COALESCE(SUM(CASE WHEN order_status = 'cancelled' THEN amount ELSE 0 END), 0) as cancel_amount
    FROM orders
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all(startISO, endISO);

  const byProduct = db.prepare(`
    SELECT
      o.product_id,
      COALESCE(p.name, '미지정') as product_name,
      COUNT(*) as orders,
      COALESCE(SUM(o.amount), 0) as sales,
      COUNT(*) as quantity,
      SUM(CASE WHEN o.order_status = 'cancelled' THEN 1 ELSE 0 END) as cancels,
      COALESCE(SUM(CASE WHEN o.order_status = 'cancelled' THEN o.amount ELSE 0 END), 0) as cancel_amount
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.created_at >= ? AND o.created_at <= ?
    GROUP BY o.product_id
    ORDER BY sales DESC
  `).all(startISO, endISO);

  const byCreator = db.prepare(`
    SELECT
      o.creator_id,
      COALESCE(c.display_name, '미귀속') as creator_name,
      COUNT(*) as orders,
      COALESCE(SUM(o.amount), 0) as sales,
      COALESCE(SUM(CASE WHEN o.order_status = 'confirmed' THEN o.commission ELSE 0 END), 0) as commission
    FROM orders o
    LEFT JOIN creators c ON o.creator_id = c.id
    WHERE o.created_at >= ? AND o.created_at <= ?
    GROUP BY o.creator_id
    ORDER BY sales DESC
  `).all(startISO, endISO);

  const lastSync = db.prepare("SELECT value FROM settings WHERE key = 'cafe24_last_sync'").get() as { value: string } | undefined;
  const totalSynced = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE cafe24_order_id IS NOT NULL").get() as { cnt: number };

  res.json({
    ok: true,
    data: {
      summary: {
        totalOrders: summary.total_orders,
        totalSales: summary.total_sales,
        confirmedSales: summary.confirmed_sales,
        cancelledAmount: summary.cancelled_amount,
        refundedAmount: refundRow.total,
        totalCommission: summary.total_commission,
        attributedOrders: summary.attributed_orders,
        unattributedOrders: summary.unattributed_orders,
      },
      daily,
      byProduct,
      byCreator,
      cafe24Status: {
        connected: cafe24Client.isConfigured(),
        lastSync: lastSync?.value || null,
        totalSyncedOrders: totalSynced.cnt,
      },
    },
  });
});

export default router;
