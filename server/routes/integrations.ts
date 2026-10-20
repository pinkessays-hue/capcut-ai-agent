import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb, addAuditLog } from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth';
import { cafe24Client } from '../providers/cafe24';
import { payoutProvider } from '../providers/payout';

const router = Router();

// --- Cafe24 OAuth ---
router.get('/cafe24/oauth', authMiddleware, requireRole('admin'), (_req, res) => {
  if (!cafe24Client.isConfigured()) {
    res.status(400).json({ error: 'Cafe24 연동이 설정되지 않았습니다. CAFE24_MALL_ID, CAFE24_CLIENT_ID, CAFE24_CLIENT_SECRET 환경 변수를 설정하세요.' });
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  const url = cafe24Client.getOAuthUrl(state);
  res.json({ ok: true, url });
});

router.get('/cafe24/callback', async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    res.status(400).send('인증 코드가 없습니다.');
    return;
  }

  try {
    const redirectUri = `${process.env.BASE_URL || 'http://localhost:3001'}/api/integrations/cafe24/callback`;
    const tokens = await cafe24Client.exchangeCode(code, redirectUri);

    const db = getDb();
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cafe24_access_token', tokens.access_token);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cafe24_refresh_token', tokens.refresh_token);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cafe24_token_expires', tokens.expires_at);

    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    res.redirect(`${baseUrl}/#/admin/integrations?cafe24=connected`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).send(`Cafe24 인증 실패: ${message}`);
  }
});

// --- Cafe24 Webhook ---
router.post('/cafe24/webhook', async (req, res) => {
  const signature = req.headers['x-cafe24-hmac-sha256'] as string;
  if (signature && !cafe24Client.verifyWebhookSignature(JSON.stringify(req.body), signature)) {
    res.status(401).json({ error: '유효하지 않은 웹훅 서명입니다.' });
    return;
  }

  const { resource, event_no, order } = req.body;
  if (!resource || !order) {
    res.sendStatus(200);
    return;
  }

  const db = getDb();

  const existingOrder = db.prepare('SELECT id FROM orders WHERE cafe24_order_id = ?').get(order.order_id);
  if (existingOrder) {
    res.sendStatus(200);
    return;
  }

  const attributionWindowDays = parseInt(
    (db.prepare("SELECT value FROM settings WHERE key = 'attribution_window_days'").get() as { value: string } | undefined)?.value || '30'
  );
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - attributionWindowDays);

  let linkId: string | null = null;
  let creatorId: string | null = null;
  let productId: string | null = null;
  let channel: string | null = null;
  let contentTitle: string | null = null;
  let commissionRate = 0;

  if (order.tracking_code) {
    const link = db.prepare(`
      SELECT l.id, l.creator_id, l.product_id, l.channel, l.content_title, p.commission_rate
      FROM links l
      JOIN products p ON l.product_id = p.id
      WHERE l.code = ?
    `).get(order.tracking_code) as {
      id: string; creator_id: string; product_id: string;
      channel: string; content_title: string; commission_rate: number;
    } | undefined;

    if (link) {
      const recentClick = db.prepare(
        'SELECT id FROM click_logs WHERE link_id = ? AND created_at >= ? LIMIT 1'
      ).get(link.id, windowStart.toISOString());

      if (recentClick) {
        linkId = link.id;
        creatorId = link.creator_id;
        productId = link.product_id;
        channel = link.channel;
        contentTitle = link.content_title;
        commissionRate = link.commission_rate;
      }
    }
  }

  const orderAmount = parseInt(order.actual_payment_amount || order.order_amount || '0');
  const commission = creatorId ? Math.round(orderAmount * commissionRate) : 0;
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO orders (id, link_id, creator_id, product_id, cafe24_order_id, channel, content_title, amount, order_status, commission, commission_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    uuidv4(), linkId, creatorId, productId,
    order.order_id, channel, contentTitle,
    orderAmount, 'payment_pending', commission, commissionRate,
    now, now
  );

  addAuditLog(null, 'webhook_order_created', 'order', order.order_id, null, {
    linkId, creatorId, amount: orderAmount, source: 'cafe24_webhook',
    event: resource,
  });

  res.sendStatus(200);
});

// --- Cafe24 Order Sync ---
router.post('/cafe24/sync', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  if (!cafe24Client.isConfigured()) {
    res.status(400).json({ error: 'Cafe24 연동이 설정되지 않았습니다.' });
    return;
  }

  const db = getDb();
  const accessTokenRow = db.prepare("SELECT value FROM settings WHERE key = 'cafe24_access_token'").get() as { value: string } | undefined;
  if (!accessTokenRow) {
    res.status(400).json({ error: 'Cafe24 인증이 필요합니다. OAuth 연동을 먼저 완료하세요.' });
    return;
  }

  try {
    const orders = await cafe24Client.listOrders(accessTokenRow.value, {
      startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });

    let synced = 0;
    for (const order of orders) {
      const existing = db.prepare('SELECT id FROM orders WHERE cafe24_order_id = ?').get(order.order_id);
      if (!existing) {
        db.prepare(
          'INSERT INTO orders (id, link_id, creator_id, product_id, cafe24_order_id, channel, content_title, amount, order_status, commission, commission_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          uuidv4(), null, null, null,
          order.order_id, null, null,
          parseInt(order.actual_payment_amount || '0'),
          'payment_pending', 0, 0,
          order.order_date || new Date().toISOString(),
          new Date().toISOString()
        );
        synced++;
      }
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cafe24_last_sync', new Date().toISOString());

    addAuditLog(req.user!.id, 'cafe24_order_sync', 'integration', 'cafe24', null, { synced, total: orders.length });
    res.json({ ok: true, data: { synced } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: '주문 동기화 실패', detail: message });
  }
});

// --- Cafe24 Status ---
router.get('/cafe24/status', authMiddleware, requireRole('admin'), (_req, res) => {
  res.json({
    ok: true,
    data: cafe24Client.getStatus(),
  });
});

// --- Payout Status ---
router.get('/payout/status', authMiddleware, requireRole('admin'), (_req, res) => {
  res.json({
    ok: true,
    data: {
      configured: payoutProvider.isConfigured(),
      provider: payoutProvider.getProviderName(),
    },
  });
});

export default router;
