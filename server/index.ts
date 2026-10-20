import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { getDb, seedDatabase } from './db';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import linkRoutes from './routes/links';
import orderRoutes from './routes/orders';
import pointRoutes from './routes/points';
import settlementRoutes from './routes/settlements';
import creatorRoutes from './routes/creators';
import adminRoutes from './routes/admin';
import integrationRoutes from './routes/integrations';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// --- Link redirect handler ---
app.get('/r/:code', (req, res) => {
  const db = getDb();
  const link = db.prepare(`
    SELECT l.id, l.product_id, p.cafe24_secret_url
    FROM links l
    JOIN products p ON l.product_id = p.id
    WHERE l.code = ?
  `).get(req.params.code) as { id: string; product_id: string; cafe24_secret_url: string } | undefined;

  if (!link) {
    res.status(404).send('링크를 찾을 수 없습니다.');
    return;
  }

  const ipRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ip = Array.isArray(ipRaw) ? ipRaw[0] : ipRaw;
  const ipHash = crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'hnhs')).digest('hex').slice(0, 16);

  db.prepare(
    'INSERT INTO click_logs (id, link_id, ip_hash, user_agent, referer, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    crypto.randomUUID(),
    link.id,
    ipHash,
    (req.headers['user-agent'] || '').slice(0, 500),
    (req.headers['referer'] || '').slice(0, 1000),
    new Date().toISOString()
  );

  if (link.cafe24_secret_url) {
    res.redirect(302, link.cafe24_secret_url);
  } else {
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    res.redirect(302, `${baseUrl}/#/creator/products`);
  }
});

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations', integrationRoutes);

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// --- Init and start ---
getDb();
seedDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] listening on port ${PORT}`);
  console.log(`[server] environment: ${process.env.NODE_ENV || 'development'}`);
  if (!process.env.JWT_SECRET) console.warn('[security] JWT_SECRET not set — using random key');
  if (!process.env.ENCRYPTION_KEY) console.warn('[security] ENCRYPTION_KEY not set — using random key');
});
