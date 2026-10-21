import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb, generateLinkCode, getCreatorBalance, addAuditLog, runTransaction } from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth';

const router = Router();

router.get('/mine', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const creator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;
  if (!creator) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }

  const links = db.prepare(`
    SELECT l.*, p.name as product_name, p.product_url,
      c.name_en as creator_name_en,
      (SELECT COUNT(*) FROM click_logs WHERE link_id = l.id) as clicks
    FROM links l
    JOIN products p ON l.product_id = p.id
    JOIN creators c ON l.creator_id = c.id
    WHERE l.creator_id = ?
    ORDER BY l.created_at DESC
  `).all(creator.id);
  res.json({ ok: true, data: links });
});

router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
  const db = getDb();
  const links = db.prepare(`
    SELECT l.*, c.display_name as creator_name, p.name as product_name,
      (SELECT COUNT(*) FROM click_logs WHERE link_id = l.id) as clicks
    FROM links l
    JOIN creators c ON l.creator_id = c.id
    JOIN products p ON l.product_id = p.id
    ORDER BY l.created_at DESC
  `).all();
  res.json({ ok: true, data: links });
});

router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const { productId, channel, contentTitle } = req.body;
  if (!productId || !channel) {
    res.status(400).json({ error: '상품과 채널은 필수입니다.' });
    return;
  }

  const db = getDb();
  let creatorId: string;

  if (req.user!.role === 'admin' && req.body.creatorId) {
    creatorId = req.body.creatorId;
  } else {
    const creator = db.prepare('SELECT id, status FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string; status: string } | undefined;
    if (!creator) {
      res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
      return;
    }
    if (creator.status === 'suspended') {
      res.status(403).json({ error: '정지된 크리에이터 계정입니다.' });
      return;
    }
    creatorId = creator.id;
  }

  const product = db.prepare('SELECT id, sale_status, info_ready FROM products WHERE id = ?').get(productId) as { id: string; sale_status: string; info_ready: number } | undefined;
  if (!product) {
    res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    return;
  }
  if (product.sale_status !== 'active' || !product.info_ready) {
    res.status(400).json({ error: '현재 링크를 발급할 수 없는 상품입니다.' });
    return;
  }

  let code = generateLinkCode();
  while (db.prepare('SELECT id FROM links WHERE code = ?').get(code)) {
    code = generateLinkCode();
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare('INSERT INTO links (id, code, creator_id, product_id, channel, content_title, issued_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, code, creatorId, productId, channel, contentTitle || '', req.user!.id, now
  );

  const link = db.prepare(`
    SELECT l.*, p.name as product_name, p.product_url,
      c.name_en as creator_name_en, 0 as clicks
    FROM links l
    JOIN products p ON l.product_id = p.id
    JOIN creators c ON l.creator_id = c.id
    WHERE l.id = ?
  `).get(id);

  res.status(201).json({ ok: true, data: link });
});

router.post('/quick', authMiddleware, (req: AuthRequest, res) => {
  const { productId, channel } = req.body;
  if (!productId) {
    res.status(400).json({ error: '상품 ID는 필수입니다.' });
    return;
  }

  const db = getDb();
  const creator = db.prepare('SELECT id, status FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string; status: string } | undefined;
  if (!creator) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }
  if (creator.status !== 'active') {
    res.status(403).json({ error: '승인된 크리에이터만 링크를 생성할 수 있습니다.' });
    return;
  }

  const product = db.prepare('SELECT id, sale_status, info_ready, product_url FROM products WHERE id = ?').get(productId) as { id: string; sale_status: string; info_ready: number; product_url: string } | undefined;
  if (!product) {
    res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    return;
  }
  if (product.sale_status !== 'active' || !product.info_ready) {
    res.status(400).json({ error: '현재 링크를 발급할 수 없는 상품입니다.' });
    return;
  }

  const existing = db.prepare(`
    SELECT l.*, p.product_url, c.name_en as creator_name_en,
      (SELECT COUNT(*) FROM click_logs WHERE link_id = l.id) as clicks
    FROM links l
    JOIN products p ON l.product_id = p.id
    JOIN creators c ON l.creator_id = c.id
    WHERE l.creator_id = ? AND l.product_id = ? AND l.active = 1
    ORDER BY l.created_at DESC LIMIT 1
  `).get(creator.id, productId) as Record<string, unknown> | undefined;

  if (existing) {
    res.json({ ok: true, data: existing, reused: true });
    return;
  }

  let code = generateLinkCode();
  while (db.prepare('SELECT id FROM links WHERE code = ?').get(code)) {
    code = generateLinkCode();
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const linkChannel = channel || 'direct';

  db.prepare('INSERT INTO links (id, code, creator_id, product_id, channel, content_title, issued_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, code, creator.id, productId, linkChannel, '', req.user!.id, now
  );

  const link = db.prepare(`
    SELECT l.*, p.product_url, c.name_en as creator_name_en, 0 as clicks
    FROM links l
    JOIN products p ON l.product_id = p.id
    JOIN creators c ON l.creator_id = c.id
    WHERE l.id = ?
  `).get(id);

  res.status(201).json({ ok: true, data: link, reused: false });
});

router.post('/admin-issue', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const { creatorId, productIds } = req.body;
  if (!creatorId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: '크리에이터 ID와 상품 목록은 필수입니다.' });
    return;
  }

  const db = getDb();
  const creator = db.prepare('SELECT id, status FROM creators WHERE id = ?').get(creatorId) as { id: string; status: string } | undefined;
  if (!creator) {
    res.status(404).json({ error: '크리에이터를 찾을 수 없습니다.' });
    return;
  }
  if (creator.status !== 'active') {
    res.status(400).json({ error: '승인된 크리에이터에게만 링크를 발급할 수 있습니다.' });
    return;
  }

  const now = new Date().toISOString();
  const results: { productId: string; linkId: string; code: string; existing: boolean }[] = [];

  try {
    runTransaction(() => {
      for (const productId of productIds) {
        const product = db.prepare('SELECT id, sale_status FROM products WHERE id = ?').get(productId) as { id: string; sale_status: string } | undefined;
        if (!product) continue;

        const existing = db.prepare('SELECT id, code FROM links WHERE creator_id = ? AND product_id = ? AND active = 1').get(creatorId, productId) as { id: string; code: string } | undefined;
        if (existing) {
          results.push({ productId, linkId: existing.id, code: existing.code, existing: true });
          continue;
        }

        let code = generateLinkCode();
        while (db.prepare('SELECT id FROM links WHERE code = ?').get(code)) {
          code = generateLinkCode();
        }

        const linkId = uuidv4();
        db.prepare('INSERT INTO links (id, code, creator_id, product_id, channel, content_title, active, issued_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
          linkId, code, creatorId, productId, 'direct', '', 1, req.user!.id, now
        );
        results.push({ productId, linkId, code, existing: false });
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: '링크 발급 중 오류가 발생했습니다.', detail: message });
    return;
  }

  addAuditLog(req.user!.id, 'links_admin_issue', 'creator', creatorId, null, { productIds, results });

  const links = db.prepare(`
    SELECT l.*, c.display_name as creator_name, p.name as product_name,
      (SELECT COUNT(*) FROM click_logs WHERE link_id = l.id) as clicks
    FROM links l
    JOIN creators c ON l.creator_id = c.id
    JOIN products p ON l.product_id = p.id
    WHERE l.creator_id = ? AND l.active = 1
    ORDER BY l.created_at DESC
  `).all(creatorId);

  res.status(201).json({ ok: true, data: links, issued: results });
});

router.patch('/:id/toggle-active', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const db = getDb();
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!link) {
    res.status(404).json({ error: '링크를 찾을 수 없습니다.' });
    return;
  }

  const newActive = link.active === 1 ? 0 : 1;
  db.prepare('UPDATE links SET active = ? WHERE id = ?').run(newActive, req.params.id);

  addAuditLog(req.user!.id, 'link_toggle_active', 'link', req.params.id, { active: link.active }, { active: newActive });

  res.json({ ok: true, data: { ...link, active: newActive } });
});

router.patch('/:id/reissue', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const db = getDb();
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!link) {
    res.status(404).json({ error: '링크를 찾을 수 없습니다.' });
    return;
  }

  let code = generateLinkCode();
  while (db.prepare('SELECT id FROM links WHERE code = ?').get(code)) {
    code = generateLinkCode();
  }

  const oldCode = link.code;
  db.prepare('UPDATE links SET code = ?, active = 1 WHERE id = ?').run(code, req.params.id);

  addAuditLog(req.user!.id, 'link_reissue', 'link', req.params.id, { code: oldCode }, { code });

  const updated = db.prepare(`
    SELECT l.*, c.display_name as creator_name, p.name as product_name,
      (SELECT COUNT(*) FROM click_logs WHERE link_id = l.id) as clicks
    FROM links l
    JOIN creators c ON l.creator_id = c.id
    JOIN products p ON l.product_id = p.id
    WHERE l.id = ?
  `).get(req.params.id);

  res.json({ ok: true, data: updated });
});

router.get('/:id/stats', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id) as { id: string; creator_id: string } | undefined;
  if (!link) {
    res.status(404).json({ error: '링크를 찾을 수 없습니다.' });
    return;
  }

  if (req.user!.role !== 'admin') {
    const creator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;
    if (!creator || creator.id !== link.creator_id) {
      res.status(403).json({ error: '권한이 없습니다.' });
      return;
    }
  }

  const clicks = db.prepare('SELECT COUNT(*) as count FROM click_logs WHERE link_id = ?').get(req.params.id) as { count: number };
  const orders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE link_id = ?').get(req.params.id) as { count: number };
  const revenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE link_id = ? AND order_status != 'cancelled'").get(req.params.id) as { total: number };
  const commission = db.prepare("SELECT COALESCE(SUM(commission), 0) as total FROM orders WHERE link_id = ? AND order_status = 'confirmed'").get(req.params.id) as { total: number };

  res.json({
    ok: true,
    data: {
      linkId: req.params.id,
      clicks: clicks.count,
      orders: orders.count,
      revenue: revenue.total,
      commission: commission.total,
    },
  });
});

router.post('/:id/test-click', authMiddleware, (req: AuthRequest, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: '운영 환경에서는 테스트 클릭을 생성할 수 없습니다.' });
    return;
  }

  const db = getDb();
  const link = db.prepare('SELECT id FROM links WHERE id = ?').get(req.params.id);
  if (!link) {
    res.status(404).json({ error: '링크를 찾을 수 없습니다.' });
    return;
  }

  const ipHash = crypto.createHash('sha256').update(`test-${Date.now()}`).digest('hex').slice(0, 16);
  db.prepare('INSERT INTO click_logs (id, link_id, ip_hash, user_agent, referer, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), req.params.id, ipHash, 'test-agent', '', new Date().toISOString()
  );

  res.json({ ok: true, message: '테스트 클릭이 기록되었습니다.' });
});

router.post('/:linkId/test-order', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: '운영 환경에서는 테스트 주문을 생성할 수 없습니다.' });
    return;
  }

  const db = getDb();
  const link = db.prepare('SELECT l.*, p.price, p.commission_rate FROM links l JOIN products p ON l.product_id = p.id WHERE l.id = ?').get(req.params.linkId) as {
    id: string; creator_id: string; product_id: string; channel: string; content_title: string;
    price: number; commission_rate: number;
  } | undefined;

  if (!link) {
    res.status(404).json({ error: '링크를 찾을 수 없습니다.' });
    return;
  }

  const amount = link.price || 100000;
  const commission = Math.round(amount * link.commission_rate);
  const now = new Date().toISOString();
  const orderId = uuidv4();

  db.prepare(
    'INSERT INTO orders (id, link_id, creator_id, product_id, cafe24_order_id, channel, content_title, amount, order_status, commission, commission_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(orderId, link.id, link.creator_id, link.product_id, `TEST-${orderId.slice(0, 8).toUpperCase()}`, link.channel, link.content_title, amount, 'payment_pending', commission, link.commission_rate, now, now);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.status(201).json({ ok: true, data: order });
});

export default router;
