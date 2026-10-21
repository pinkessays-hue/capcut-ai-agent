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
      selected_products TEXT DEFAULT '[]',
      rejection_reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended','rejected')),
      created_at TEXT NOT NULL,
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      original_name TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_placeholder TEXT DEFAULT '',
      product_url TEXT DEFAULT '',
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
      active INTEGER NOT NULL DEFAULT 1,
      issued_by TEXT,
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

    CREATE TABLE IF NOT EXISTS cafe24_order_events (
      id TEXT PRIMARY KEY,
      cafe24_order_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      raw_data TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
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
    CREATE INDEX IF NOT EXISTS idx_cafe24_events_order ON cafe24_order_events(cafe24_order_id);
    CREATE INDEX IF NOT EXISTS idx_cafe24_events_processed ON cafe24_order_events(processed);
  `);

  migrateSchema(d);
}

function migrateSchema(d: Database.Database): void {
  const hasCol = (table: string, col: string) => {
    const info = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return info.some(c => c.name === col);
  };

  if (!hasCol('products', 'original_name')) {
    d.exec(`ALTER TABLE products ADD COLUMN original_name TEXT DEFAULT ''`);
  }
  if (!hasCol('products', 'product_url')) {
    d.exec(`ALTER TABLE products ADD COLUMN product_url TEXT DEFAULT ''`);
  }
  if (!hasCol('creators', 'selected_products')) {
    d.exec(`ALTER TABLE creators ADD COLUMN selected_products TEXT DEFAULT '[]'`);
  }
  if (!hasCol('creators', 'rejection_reason')) {
    d.exec(`ALTER TABLE creators ADD COLUMN rejection_reason TEXT`);
  }
  if (!hasCol('links', 'active')) {
    d.exec(`ALTER TABLE links ADD COLUMN active INTEGER NOT NULL DEFAULT 1`);
  }
  if (!hasCol('links', 'issued_by')) {
    d.exec(`ALTER TABLE links ADD COLUMN issued_by TEXT`);
  }

  if (!hasCol('users', 'nickname')) {
    d.exec(`ALTER TABLE users ADD COLUMN nickname TEXT`);
  }
  if (!hasCol('users', 'pin')) {
    d.exec(`ALTER TABLE users ADD COLUMN pin TEXT`);
  }
  try { d.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname)`); } catch { /* exists */ }

  if (!hasCol('creators', 'name_en')) {
    d.exec(`ALTER TABLE creators ADD COLUMN name_en TEXT DEFAULT ''`);
  }

  if (!hasCol('products', 'thumbnail_url')) {
    d.exec(`ALTER TABLE products ADD COLUMN thumbnail_url TEXT DEFAULT ''`);
  }

  if (!hasCol('orders', 'attribution_type')) {
    d.exec(`ALTER TABLE orders ADD COLUMN attribution_type TEXT DEFAULT 'none'`);
  }
  if (!hasCol('orders', 'cafe24_order_status')) {
    d.exec(`ALTER TABLE orders ADD COLUMN cafe24_order_status TEXT`);
  }
  if (!hasCol('orders', 'refund_amount')) {
    d.exec(`ALTER TABLE orders ADD COLUMN refund_amount INTEGER DEFAULT 0`);
  }
  if (!hasCol('orders', 'cafe24_product_no')) {
    d.exec(`ALTER TABLE orders ADD COLUMN cafe24_product_no TEXT`);
  }
  if (!hasCol('orders', 'order_date')) {
    d.exec(`ALTER TABLE orders ADD COLUMN order_date TEXT`);
  }
  if (!hasCol('orders', 'payment_date')) {
    d.exec(`ALTER TABLE orders ADD COLUMN payment_date TEXT`);
  }

  const creatorInfo = d.prepare(`PRAGMA table_info(creators)`).all() as { name: string; type: string }[];
  const statusCol = creatorInfo.find(c => c.name === 'status');
  if (statusCol) {
    try {
      d.exec(`INSERT INTO creators (id, user_id, display_name, status, created_at) VALUES ('__migrate_test', '__mt', 'test', 'pending', '2024-01-01')`);
      d.exec(`DELETE FROM creators WHERE id = '__migrate_test'`);
    } catch {
      d.exec(`PRAGMA foreign_keys = OFF`);
      d.exec(`DROP TABLE IF EXISTS creators_new`);
      d.exec(`
        CREATE TABLE creators_new (
          id TEXT PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
          display_name TEXT NOT NULL,
          phone TEXT,
          category TEXT,
          channels TEXT DEFAULT '[]',
          selected_products TEXT DEFAULT '[]',
          rejection_reason TEXT,
          name_en TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended','rejected')),
          created_at TEXT NOT NULL,
          approved_at TEXT
        );
        INSERT INTO creators_new (id, user_id, display_name, phone, category, channels, selected_products, rejection_reason, name_en, status, created_at, approved_at)
          SELECT id, user_id, display_name, phone, category, channels,
            COALESCE(selected_products, '[]'), rejection_reason, COALESCE(name_en, ''), status, created_at, approved_at
          FROM creators;
        DROP TABLE creators;
        ALTER TABLE creators_new RENAME TO creators;
      `);
      d.exec(`PRAGMA foreign_keys = ON`);
    }
  }
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
      'INSERT INTO products (id, name, original_name, description, image_placeholder, product_url, cafe24_product_code, cafe24_secret_url, commission_rate, sale_status, info_ready, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertProduct.run('prod_1', '포미 2단 리프트업 침대', '포미 2단 리프트업 침대 엠보형 LK', '전동 리프트업 기능으로 편안한 수납과 취침을 동시에. 원터치 리모컨으로 간편 조작.', 'bed', 'https://homeandheal.co.kr/product/detail.html?product_no=303&cate_no=35&display_group=1', '', '', 0.05, 'active', 1, 890000, now, now);
    insertProduct.run('prod_2', '홈앤힐 무드랙 시스템장', '', '모듈형 수납 시스템으로 공간에 맞게 자유롭게 조합. 깔끔한 정리와 인테리어를 동시에.', 'shelf', 'https://homeandheal.co.kr/product/detail.html?product_no=54&cate_no=28&display_group=1', '', '', 0.05, 'active', 1, 0, now, now);
    insertProduct.run('prod_3', '홈앤힐 미니랩 높이각도조절 책상', '', '높이와 각도를 자유롭게 조절하는 스마트 책상. 재택근무와 학습에 최적화된 인체공학 설계.', 'desk', 'https://homeandheal.co.kr/product/detail.html?product_no=59&cate_no=28&display_group=1', '', '', 0.05, 'active', 1, 0, now, now);
    insertProduct.run('prod_4', '홈앤힐 포그 구스 모듈소파', '', '구스다운 충전재로 포근한 착석감. 모듈 구성으로 공간에 맞춰 자유롭게 배치 가능.', 'sofa', 'https://homeandheal.co.kr/product/detail.html?product_no=14&cate_no=28&display_group=1', '', '', 0.05, 'active', 1, 0, now, now);
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

  d.prepare('INSERT INTO creators (id, user_id, display_name, phone, category, channels, name_en, status, created_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    creator1Id, user1Id, '김하늘', '010-0000-0001', '인테리어 / 홈스타일링',
    JSON.stringify([
      { type: 'youtube', url: 'https://youtube.com/@example_haneul', accountName: '하늘의 인테리어' },
      { type: 'instagram', url: 'https://instagram.com/example_haneul', accountName: '@example_haneul' },
    ]),
    'haneul',
    'active', '2024-09-15T10:00:00Z', '2024-09-15T10:00:00Z'
  );
  d.prepare('INSERT INTO creators (id, user_id, display_name, phone, category, channels, name_en, status, created_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    creator2Id, user2Id, '이준서', '010-0000-0002', '가구 리뷰 / 리빙',
    JSON.stringify([
      { type: 'naver_blog', url: 'https://blog.naver.com/example_junseo', accountName: '준서의 리빙로그' },
    ]),
    'junseo',
    'active', '2024-10-01T09:00:00Z', '2024-10-01T09:00:00Z'
  );

  const link1Id = uuidv4();
  const link2Id = uuidv4();
  const link3Id = uuidv4();

  const insertLink = d.prepare('INSERT INTO links (id, code, creator_id, product_id, channel, content_title, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertLink.run(link1Id, 'HN1YT001', creator1Id, 'prod_1', 'youtube', '포미 리프트업 침대 솔직 리뷰', '2024-09-20T10:00:00Z');
  insertLink.run(link2Id, 'HN1IG002', creator1Id, 'prod_4', 'instagram', '포그 구스 모듈소파 언박싱', '2024-09-25T14:00:00Z');
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
  insertOrder.run(order3Id, link2Id, creator1Id, 'prod_4', 'TEST-ORD-003', 'instagram', '포그 구스 모듈소파 언박싱', 0, 'payment_pending', 0, 0.05, '2024-10-18T09:30:00Z', '2024-10-18T09:30:00Z');
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
