import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, addAuditLog } from '../db';
import { authMiddleware, optionalAuth, requireRole, AuthRequest } from '../auth';

const router = Router();

router.get('/', optionalAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const isAdmin = req.user?.role === 'admin';
  const cols = isAdmin
    ? '*'
    : 'id, name, original_name, description, image_placeholder, product_url, commission_rate, sale_status, info_ready, price, created_at, updated_at';
  const products = db.prepare(`SELECT ${cols} FROM products ORDER BY created_at`).all();
  res.json({ ok: true, data: products });
});

router.get('/:id', optionalAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const isAdmin = req.user?.role === 'admin';
  const cols = isAdmin
    ? '*'
    : 'id, name, original_name, description, image_placeholder, product_url, commission_rate, sale_status, info_ready, price, created_at, updated_at';
  const product = db.prepare(`SELECT ${cols} FROM products WHERE id = ?`).get(req.params.id);
  if (!product) {
    res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    return;
  }
  res.json({ ok: true, data: product });
});

router.post('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const { name, original_name, description, image_placeholder, product_url, cafe24_product_code, cafe24_secret_url, commission_rate, sale_status, info_ready, price } = req.body;
  if (!name) {
    res.status(400).json({ error: '상품명은 필수입니다.' });
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  db.prepare(
    'INSERT INTO products (id, name, original_name, description, image_placeholder, product_url, cafe24_product_code, cafe24_secret_url, commission_rate, sale_status, info_ready, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, original_name || '', description || '', image_placeholder || '', product_url || '', cafe24_product_code || '', cafe24_secret_url || '', commission_rate || 0, sale_status || 'active', info_ready ? 1 : 0, price || 0, now, now);

  addAuditLog(req.user!.id, 'product_create', 'product', id, null, { name, sale_status });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json({ ok: true, data: product });
});

router.put('/:id', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  const db = getDb();
  const before = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!before) {
    res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    return;
  }

  const fields = ['name', 'original_name', 'description', 'image_placeholder', 'product_url', 'cafe24_product_code', 'cafe24_secret_url', 'commission_rate', 'sale_status', 'info_ready', 'price'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(field === 'info_ready' ? (req.body[field] ? 1 : 0) : req.body[field]);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: '수정할 항목이 없습니다.' });
    return;
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(req.params.id);

  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const after = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  addAuditLog(req.user!.id, 'product_update', 'product', req.params.id, before, after);

  res.json({ ok: true, data: after });
});

export default router;
