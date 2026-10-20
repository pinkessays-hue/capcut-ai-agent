import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { hashSync } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'hnhs.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const d = db;

  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('creator','admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
      display_name TEXT NOT NULL,
      phone TEXT,
      category TEXT,
      channels TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
      created_at TEXT NOT NULL,
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_placeholder TEXT DEFAULT '',
      cafe24_product_code TEXT DEFAULT '',
      cafe24_secret_url TEXT DEFAULT '',
      commission_rate REAL NOT NULL DEFAULT 0,
      sale_status TEXT NOT NULL DEFAULT 'active' CHECK(sale_status IN ('active','inactive','preparing')),
      info_ready INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      creator_id TEXT NOT NULL REFERENCES creators(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      channel TEXT NOT NULL,
      content_title TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS click_logs (
      id TEXT PRIMARY KEY,
      link_id TEXT NOT NULL REFERENCES links(id),
      ip_hash TEXT,
      user_agent TEXT,
      referer TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      link_id TEXT,
      creator_id TEXT,
      product_id TEXT,
      cafe24_order_id TEXT UNIQUE,
      channel TEXT,
      content_title TEXT,
      amount INTEGER NOT NULL DEFAULT 0,
      order_status TEXT NOT NULL DEFAULT 'payment_pending',
      commission INTEGER NOT NULL DEFAULT 0,
      commission_rate REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS point_ledger (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL REFERENCES creators(id),
      order_id TEXT,
      entry_type TEXT NOT NULL CHECK(entry_type IN ('credit','cancel','payout','reversal')),
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      creator_id TEXT UNIQUE NOT NULL REFERENCES creators(id),
      bank_name TEXT NOT NULL,
      account_number_enc TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL REFERENCES creators(id),
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
      payout_reference TEXT,
      idempotency_key TEXT UNIQUE,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      before_value TEXT,
      after_value TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_links_code ON links(code);
    CREATE INDEX IF NOT EXISTS idx_links_creator ON links(creator_id);
    CREATE INDEX IF NOT EXISTS idx_click_logs_link ON click_logs(link_id);
    CREATE INDEX IF NOT EXISTS idx_click_logs_ip ON click_logs(ip_hash, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_creator ON orders(creator_id);
    CREATE INDEX IF NOT EXISTS idx_orders_link ON orders(link_id);
    CREATE INDEX IF NOT EXISTS idx_orders_cafe24 ON orders(cafe24_order_id);
    CREATE INDEX IF NOT EXISTS idx_point_ledger_creator ON point_ledger(creator_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_creator ON settlements(creator_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);
  `);
}

export function seedDatabase(): void {
  const d = getDb();
  const now = new Date().toISOString();

  const existingAdmin = d.prepare('SELECT id FROM users WHERE email = ?').get('admin@hnhs.co');
  if (!existingAdmin) {
    const adminId = uuidv4();
    d.prepare(
      'INSERT INTO users (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@hnhs.co', hashSync('admin1234', 10), '운영자', 'admin', 'active', now);
  }

  const existingProducts = d.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number };
  if (existingProducts.cnt === 0) {
    const insertProduct = d.prepare(
      'INSERT INTO products (id, name, description, image_placeholder, cafe24_product_code, cafe24_secret_url, commission_rate, sale_status, info_ready, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertProduct.run('prod_1', '포미 리프트업 침대', '전동 리프트업 기능으로 편안한 수납과 취침을 동시에. 원터치 리모컨으로 간편 조작.', 'bed', '', '', 0.05, 'active', 1, 890000, now, now);
    insertProduct.run('prod_2', '리클라이너 소파', '', 'sofa', '', '', 0.04, 'preparing', 0, 0, now, now);
    insertProduct.run('prod_3', '휴고 플립', '접이식 디자인으로 좁은 공간에서도 편안한 휴식. 컴팩트하게 접어 보관 가능.', 'chair', '', '', 0.06, 'active', 1, 450000, now, now);
  }

  const existingSettings = d.prepare('SELECT COUNT(*) as cnt FROM settings').get() as { cnt: number };
  if (existingSettings.cnt === 0) {
    const insertSetting = d.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('settlement_min_amount', process.env.SETTLEMENT_MIN_AMOUNT || '5000');
    insertSetting.run('attribution_window_days', process.env.ATTRIBUTION_WINDOW_DAYS || '30');
  }

  if (process.env.NODE_ENV !== 'production') {
    seedTestData(d, now);
  }
}

function seedTestData(d: Database.Database, now: string): void {
  const existingTestCreators = d.prepare("SELECT COUNT(*) as cnt FROM users WHERE email LIKE '%@example.com'").get() as { cnt: number };
  if (existingTestCreators.cnt > 0) return;

  const user1Id = uuidv4();
  const user2Id = uuidv4();
  const creator1Id = uuidv4();
  const creator2Id = uuidv4();

  d.prepare('INSERT INTO users (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    user1Id, 'haneul@example.com', hashSync('test1234', 10), '김하늘', 'creator', 'active', '2024-09-15T10:00:00Z'
  );
  d.prepare('INSERT INTO users (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    user2Id, 'junseo@example.com', hashSync('test1234', 10), '이준서', 'creator', 'active', '2024-10-01T09:00:00Z'
  );

  d.prepare('INSERT INTO creators (id, user_id, display_name, phone, category, channels, status, created_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    creator1Id, user1Id, '김하늘', '010-0000-0001', '인테리어 / 홈스타일링',
    JSON.stringify([
      { type: 'youtube', url: 'https://youtube.com/@example_haneul', accountName: '하늘의 인테리어' },
      { type: 'instagram', url: 'https://instagram.com/example_haneul', accountName: '@example_haneul' },
    ]),
    'active', '2024-09-15T10:00:00Z', '2024-09-15T10:00:00Z'
  );
  d.prepare('INSERT INTO creators (id, user_id, display_name, phone, category, channels, status, created_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    creator2Id, user2Id, '이준서', '010-0000-0002', '가구 리뷰 / 리빙',
    JSON.stringify([
      { type: 'naver_blog', url: 'https://blog.naver.com/example_junseo', accountName: '준서의 리빙로그' },
    ]),
    'active', '2024-10-01T09:00:00Z', '2024-10-01T09:00:00Z'
  );

  const link1Id = uuidv4();
  const link2Id = uuidv4();
  const link3Id = uuidv4();

  const insertLink = d.prepare('INSERT INTO links (id, code, creator_id, product_id, channel, content_title, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertLink.run(link1Id, 'HN1YT001', creator1Id, 'prod_1', 'youtube', '포미 리프트업 침대 솔직 리뷰', '2024-09-20T10:00:00Z');
  insertLink.run(link2Id, 'HN1IG002', creator1Id, 'prod_3', 'instagram', '휴고 플립 언박싱', '2024-09-25T14:00:00Z');
  insertLink.run(link3Id, 'JS2NB003', creator2Id, 'prod_1', 'naver_blog', '신혼 침실 꾸미기 – 포미 리프트업', '2024-10-05T09:00:00Z');

  const insertClick = d.prepare('INSERT INTO click_logs (id, link_id, ip_hash, user_agent, referer, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (let i = 0; i < 142; i++) {
    insertClick.run(uuidv4(), link1Id, `hash_${i % 50}`, 'test-agent', '', `2024-09-${20 + Math.floor(i / 10)}T${10 + (i % 12)}:00:00Z`);
  }
  for (let i = 0; i < 87; i++) {
    insertClick.run(uuidv4(), link2Id, `hash_${i % 40}`, 'test-agent', '', `2024-09-${25 + Math.floor(i / 15)}T${10 + (i % 12)}:00:00Z`);
  }
  for (let i = 0; i < 63; i++) {
    insertClick.run(uuidv4(), link3Id, `hash_${i % 30}`, 'test-agent', '', `2024-10-${5 + Math.floor(i / 10)}T${9 + (i % 12)}:00:00Z`);
  }

  const order1Id = uuidv4();
  const order2Id = uuidv4();
  const order3Id = uuidv4();
  const order4Id = uuidv4();
  const order5Id = uuidv4();

  const insertOrder = d.prepare('INSERT INTO orders (id, link_id, creator_id, product_id, cafe24_order_id, channel, content_title, amount, order_status, commission, commission_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertOrder.run(order1Id, link1Id, creator1Id, 'prod_1', 'TEST-ORD-001', 'youtube', '포미 리프트업 침대 솔직 리뷰', 890000, 'confirmed', 44500, 0.05, '2024-09-22T16:30:00Z', '2024-09-22T16:30:00Z');
  insertOrder.run(order2Id, link1Id, creator1Id, 'prod_1', 'TEST-ORD-002', 'youtube', '포미 리프트업 침대 솔직 리뷰', 890000, 'confirmed', 44500, 0.05, '2024-10-01T11:00:00Z', '2024-10-01T11:00:00Z');
  insertOrder.run(order3Id, link2Id, creator1Id, 'prod_3', 'TEST-ORD-003', 'instagram', '휴고 플립 언박싱', 450000, 'payment_pending', 27000, 0.06, '2024-10-18T09:30:00Z', '2024-10-18T09:30:00Z');
  insertOrder.run(order4Id, link3Id, creator2Id, 'prod_1', 'TEST-ORD-004', 'naver_blog', '신혼 침실 꾸미기 – 포미 리프트업', 890000, 'cancelled', 0, 0.05, '2024-10-10T14:00:00Z', '2024-10-10T14:00:00Z');
  insertOrder.run(order5Id, link3Id, creator2Id, 'prod_1', 'TEST-ORD-005', 'naver_blog', '신혼 침실 꾸미기 – 포미 리프트업', 890000, 'confirmed', 44500, 0.05, '2024-10-12T10:00:00Z', '2024-10-12T10:00:00Z');

  const insertLedger = d.prepare('INSERT INTO point_ledger (id, creator_id, order_id, entry_type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertLedger.run(uuidv4(), creator1Id, order1Id, 'credit', 44500, 44500, '주문 확정 수수료', '2024-09-22T16:30:00Z');
  insertLedger.run(uuidv4(), creator1Id, order2Id, 'credit', 44500, 89000, '주문 확정 수수료', '2024-10-01T11:00:00Z');
  insertLedger.run(uuidv4(), creator2Id, order5Id, 'credit', 44500, 44500, '주문 확정 수수료', '2024-10-12T10:00:00Z');
}

export function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function getCreatorBalance(creatorId: string): number {
  const d = getDb();
  const row = d.prepare('SELECT COALESCE(SUM(amount), 0) as balance FROM point_ledger WHERE creator_id = ?').get(creatorId) as { balance: number };
  return row.balance;
}

export function addAuditLog(
  userId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  beforeValue: unknown,
  afterValue: unknown,
  reason?: string
): void {
  const d = getDb();
  d.prepare(
    'INSERT INTO audit_log (id, user_id, action, target_type, target_id, before_value, after_value, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    uuidv4(),
    userId,
    action,
    targetType,
    targetId,
    beforeValue ? JSON.stringify(beforeValue) : null,
    afterValue ? JSON.stringify(afterValue) : null,
    reason || null,
    new Date().toISOString()
  );
}
