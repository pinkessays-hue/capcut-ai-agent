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
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO cafe24_order_events (id, cafe24_order_id, event_type, raw_data, processed, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(uuidv4(), order.order_id, resource, JSON.stringify(req.body), 0, now);

  const existingOrder = db.prepare('SELECT id, order_status FROM orders WHERE cafe24_order_id = ?').get(order.order_id) as { id: string; order_status: string } | undefined;

  if (existingOrder) {
    const cafe24Status = order.order_status || order.status;
    const refundAmount = parseInt(order.refund_amount || '0');
    const updates: string[] = [];
    const params: unknown[] = [];

    if (cafe24Status) {
      updates.push('cafe24_order_status = ?');
      params.push(cafe24Status);
      if (['cancelled', 'returned', 'refunded'].some(s => cafe24Status.includes(s))) {
        updates.push("order_status = 'cancelled'");
      } else if (['paid', 'confirmed', 'shipped', 'delivered'].some(s => cafe24Status.includes(s))) {
        updates.push("order_status = 'confirmed'");
      }
    }
    if (refundAmount > 0) {
      updates.push('refund_amount = ?');
      params.push(refundAmount);
    }
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(now, existingOrder.id);
      db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    db.prepare('UPDATE cafe24_order_events SET processed = 1 WHERE cafe24_order_id = ? AND processed = 0').run(order.order_id);
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
  let attributionType = 'none';

  const trackingCode = order.tracking_code || order.tracking?.utm_source;
  if (trackingCode) {
    const link = db.prepare(`
      SELECT l.id, l.creator_id, l.product_id, l.channel, l.content_title, p.commission_rate
      FROM links l JOIN products p ON l.product_id = p.id
      WHERE l.code = ? AND l.active = 1
    `).get(trackingCode) as { id: string; creator_id: string; product_id: string; channel: string; content_title: string; commission_rate: number } | undefined;

    if (link) {
      linkId = link.id;
      creatorId = link.creator_id;
      productId = link.product_id;
      channel = link.channel;
      contentTitle = link.content_title;
      commissionRate = link.commission_rate;
      attributionType = 'tracking_code';
    }
  }

  if (!creatorId && order.items) {
    const productNos = (order.items as { product_no?: string }[]).map(i => i.product_no).filter(Boolean);
    for (const pno of productNos) {
      const product = db.prepare('SELECT id, commission_rate FROM products WHERE cafe24_product_code = ?').get(pno) as { id: string; commission_rate: number } | undefined;
      if (product) {
        const recentClick = db.prepare(`
          SELECT l.id, l.creator_id, l.channel, l.content_title
          FROM click_logs cl JOIN links l ON cl.link_id = l.id
          WHERE l.product_id = ? AND cl.created_at >= ? AND l.active = 1
          ORDER BY cl.created_at DESC LIMIT 1
        `).get(product.id, windowStart.toISOString()) as { id: string; creator_id: string; channel: string; content_title: string } | undefined;

        if (recentClick) {
          linkId = recentClick.id;
          creatorId = recentClick.creator_id;
          productId = product.id;
          channel = recentClick.channel;
          contentTitle = recentClick.content_title;
          commissionRate = product.commission_rate;
          attributionType = 'click_window';
          break;
        }
      }
    }
  }

  const orderAmount = parseInt(order.actual_payment_amount || order.order_amount || '0');
  const commission = creatorId ? Math.round(orderAmount * commissionRate) : 0;

  db.prepare(
    'INSERT INTO orders (id, link_id, creator_id, product_id, cafe24_order_id, channel, content_title, amount, order_status, commission, commission_rate, attribution_type, cafe24_order_status, cafe24_product_no, order_date, payment_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    uuidv4(), linkId, creatorId, productId,
    order.order_id, channel, contentTitle,
    orderAmount, 'payment_pending', commission, commissionRate,
    attributionType, order.order_status || null,
    order.items?.[0]?.product_no || null,
    order.order_date || null, order.payment_date || null,
    now, now
  );

  db.prepare('UPDATE cafe24_order_events SET processed = 1 WHERE cafe24_order_id = ? AND processed = 0').run(order.order_id);

  addAuditLog(null, 'webhook_order_created', 'order', order.order_id, null, {
    linkId, creatorId, amount: orderAmount, attributionType, source: 'cafe24_webhook',
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

  const startDate = (req.body.startDate as string) || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const endDate = (req.body.endDate as string) || new Date().toISOString().split('T')[0];

  try {
    const orders = await cafe24Client.listOrders(accessTokenRow.value, { startDate, endDate });
    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();

    for (const order of orders) {
      const existing = db.prepare('SELECT id, order_status FROM orders WHERE cafe24_order_id = ?').get(order.order_id) as { id: string; order_status: string } | undefined;

      if (existing) {
        const amount = parseInt(order.actual_payment_amount || '0');
        const cafe24Status = order.order_status;
        let newStatus = existing.order_status;
        if (cafe24Status && ['cancelled', 'returned', 'refunded'].some(s => cafe24Status.includes(s))) {
          newStatus = 'cancelled';
        } else if (cafe24Status && ['paid', 'confirmed', 'shipped', 'delivered'].some(s => cafe24Status.includes(s))) {
          newStatus = 'confirmed';
        }
        db.prepare('UPDATE orders SET amount = ?, order_status = ?, cafe24_order_status = ?, updated_at = ? WHERE id = ?')
          .run(amount, newStatus, cafe24Status || null, now, existing.id);
        updated++;
      } else {
        db.prepare(
          'INSERT INTO orders (id, link_id, creator_id, product_id, cafe24_order_id, channel, content_title, amount, order_status, commission, commission_rate, attribution_type, cafe24_order_status, order_date, payment_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          uuidv4(), null, null, null,
          order.order_id, null, null,
          parseInt(order.actual_payment_amount || '0'),
          'payment_pending', 0, 0,
          'none', order.order_status || null,
          order.order_date || null, order.payment_date || null,
          order.order_date || now, now
        );
        created++;
      }
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cafe24_last_sync', now);

    addAuditLog(req.user!.id, 'cafe24_order_sync', 'integration', 'cafe24', null, {
      created, updated, total: orders.length, startDate, endDate,
    });
    res.json({ ok: true, data: { synced: created, updated, total: orders.length } });
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
