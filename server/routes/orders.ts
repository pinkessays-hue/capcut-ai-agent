import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, addAuditLog, getCreatorBalance, runTransaction } from '../db';
import { authMiddleware, requireRole, AuthRequest } from '../auth';

const router = Router();

router.get('/mine', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const creator = db.prepare('SELECT id FROM creators WHERE user_id = ?').get(req.user!.id) as { id: string } | undefined;
  if (!creator) {
    res.status(404).json({ error: '크리에이터 정보를 찾을 수 없습니다.' });
    return;
  }

  const orders = db.prepare(`
    SELECT o.id, o.link_id, o.product_id, o.channel, o.content_title,
           o.amount, o.order_status, o.commission, o.commission_rate,
           o.created_at, o.updated_at, p.name as product_name
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.creator_id = ?
    ORDER BY o.created_at DESC
  `).all(creator.id);
  res.json({ ok: true, data: orders });
});

router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
  const db = getDb();
  const orders = db.prepare(`
    SELECT o.*, c.display_name as creator_name, p.name as product_name
    FROM orders o
    LEFT JOIN creators c ON o.creator_id = c.id
    LEFT JOIN products p ON o.product_id = p.id
    ORDER BY o.created_at DESC
  `).all();
  res.json({ ok: true, data: orders });
});

router.patch('/:id/status', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const { status, reason } = req.body;
  const validStatuses = ['payment_pending', 'confirmed', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: '유효하지 않은 주문 상태입니다.' });
    return;
  }

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!order) {
    res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    return;
  }

  const prevStatus = order.order_status as string;
  const now = new Date().toISOString();
  const creatorId = order.creator_id as string;

  try {
    runTransaction(() => {
      if (status === 'confirmed' && prevStatus !== 'confirmed') {
        const commission = Math.round((order.amount as number) * (order.commission_rate as number));
        db.prepare('UPDATE orders SET order_status = ?, commission = ?, updated_at = ? WHERE id = ?').run(status, commission, now, req.params.id);

        if (creatorId) {
          const existingCredit = db.prepare("SELECT id FROM point_ledger WHERE order_id = ? AND entry_type = 'credit'").get(req.params.id);
          if (!existingCredit) {
            const balance = getCreatorBalance(creatorId);
            db.prepare('INSERT INTO point_ledger (id, creator_id, order_id, entry_type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
              uuidv4(), creatorId, req.params.id, 'credit', commission, balance + commission, '주문 확정 수수료', now
            );
          }
        }
      } else if ((status === 'cancelled' || status === 'refunded') && prevStatus === 'confirmed') {
        const commission = order.commission as number;
        db.prepare('UPDATE orders SET order_status = ?, commission = 0, updated_at = ? WHERE id = ?').run(status, now, req.params.id);

        if (creatorId && commission > 0) {
          const balance = getCreatorBalance(creatorId);
          db.prepare('INSERT INTO point_ledger (id, creator_id, order_id, entry_type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
            uuidv4(), creatorId, req.params.id, 'cancel', -commission, balance - commission, `주문 ${status === 'cancelled' ? '취소' : '환불'} 수수료 회수`, now
          );
        }
      } else {
        const commission = status === 'cancelled' || status === 'refunded' ? 0 : (order.commission as number);
        db.prepare('UPDATE orders SET order_status = ?, commission = ?, updated_at = ? WHERE id = ?').run(status, commission, now, req.params.id);
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: '주문 상태 변경 실패', detail: message });
    return;
  }

  addAuditLog(req.user!.id, 'order_status_change', 'order', req.params.id, { status: prevStatus }, { status }, reason);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ ok: true, data: updated });
});

router.post('/test', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: '운영 환경에서는 테스트 주문을 생성할 수 없습니다.' });
    return;
  }

  const { linkId } = req.body;
  if (!linkId) {
    res.status(400).json({ error: '링크 ID는 필수입니다.' });
    return;
  }

  const db = getDb();
  const link = db.prepare('SELECT l.*, p.price, p.commission_rate FROM links l JOIN products p ON l.product_id = p.id WHERE l.id = ?').get(linkId) as {
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
