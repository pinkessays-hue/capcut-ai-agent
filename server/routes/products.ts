import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, addAuditLog } from '../db';
import { authMiddleware, optionalAuth, requireRole, AuthRequest } from '../auth';

const uploadDir = path.join(import.meta.dirname, '..', '..', 'uploads', 'products');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('지원하지 않는 이미지 형식입니다.'));
  },
});

const router = Router();

router.get('/', optionalAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const isAdmin = req.user?.role === 'admin';
  const cols = isAdmin
    ? '*'
    : 'id, name, original_name, description, image_placeholder, thumbnail_url, product_url, commission_rate, sale_status, info_ready, price, created_at, updated_at';
  const products = db.prepare(`SELECT ${cols} FROM products ORDER BY created_at`).all();
  res.json({ ok: true, data: products });
});

router.get('/:id', optionalAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const isAdmin = req.user?.role === 'admin';
  const cols = isAdmin
    ? '*'
    : 'id, name, original_name, description, image_placeholder, thumbnail_url, product_url, commission_rate, sale_status, info_ready, price, created_at, updated_at';
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

  const fields = ['name', 'original_name', 'description', 'image_placeholder', 'thumbnail_url', 'product_url', 'cafe24_product_code', 'cafe24_secret_url', 'commission_rate', 'sale_status', 'info_ready', 'price'];
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

router.post('/:id/thumbnail', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  upload.single('thumbnail')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || '이미지 업로드 실패' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: '이미지 파일이 필요합니다.' });
      return;
    }

    const db = getDb();
    const product = db.prepare('SELECT id, thumbnail_url FROM products WHERE id = ?').get(req.params.id) as { id: string; thumbnail_url: string } | undefined;
    if (!product) {
      fs.unlinkSync(req.file.path);
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }

    if (product.thumbnail_url) {
      const oldPath = path.join(uploadDir, path.basename(product.thumbnail_url));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const thumbnailUrl = `/uploads/products/${req.file.filename}`;
    db.prepare('UPDATE products SET thumbnail_url = ?, updated_at = ? WHERE id = ?').run(thumbnailUrl, new Date().toISOString(), req.params.id);

    addAuditLog(req.user!.id, 'product_thumbnail_upload', 'product', req.params.id, { thumbnail_url: product.thumbnail_url }, { thumbnail_url: thumbnailUrl });

    res.json({ ok: true, data: { thumbnailUrl } });
  });
});

export default router;
