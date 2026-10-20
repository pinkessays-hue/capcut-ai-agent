import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db';
import { hashPassword, verifyPassword, generateToken, authMiddleware, AuthRequest } from '../auth';

const router = Router();

router.post('/register', (req, res) => {
  const { email, password, name, phone, category, channels, selectedProducts, termsAgreed, privacyAgreed, nickname } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: '이메일, 비밀번호, 이름은 필수입니다.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
    return;
  }
  if (!termsAgreed || !privacyAgreed) {
    res.status(400).json({ error: '필수 약관에 동의해야 합니다.' });
    return;
  }
  if (!selectedProducts || !Array.isArray(selectedProducts) || selectedProducts.length === 0) {
    res.status(400).json({ error: '홍보 희망 상품을 1개 이상 선택해주세요.' });
    return;
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: '이미 등록된 이메일입니다.' });
    return;
  }

  let nicknameVal: string | null = null;
  let pinHash: string | null = null;
  let generatedPin: string | null = null;
  if (nickname && typeof nickname === 'string' && nickname.trim().length >= 2) {
    nicknameVal = nickname.trim();
    const existingNick = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nicknameVal);
    if (existingNick) {
      res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
      return;
    }
    generatedPin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    pinHash = hashPassword(generatedPin);
  }

  const now = new Date().toISOString();
  const userId = uuidv4();
  const creatorId = uuidv4();
  const passwordHash = hashPassword(password);

  const insertUser = db.prepare(
    'INSERT INTO users (id, email, password_hash, name, role, status, nickname, pin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertCreator = db.prepare(
    'INSERT INTO creators (id, user_id, display_name, phone, category, channels, selected_products, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const txn = db.transaction(() => {
    insertUser.run(userId, email, passwordHash, name, 'creator', 'active', nicknameVal, pinHash, now);
    insertCreator.run(
      creatorId, userId, name, phone || '', category || '',
      JSON.stringify(channels || []),
      JSON.stringify(selectedProducts),
      'pending', now
    );
  });

  try {
    txn();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.', detail: message });
    return;
  }

  const token = generateToken(userId, 'creator');
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.status(201).json({
    ok: true,
    token,
    pin: generatedPin || undefined,
    user: { id: userId, email, name, role: 'creator', nickname: nicknameVal, creatorId, creatorStatus: 'pending' },
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: '이메일과 비밀번호를 입력하세요.' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT id, email, password_hash, name, role, status FROM users WHERE email = ?').get(email) as {
    id: string; email: string; password_hash: string; name: string; role: string; status: string;
  } | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    return;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: '정지된 계정입니다. 운영자에게 문의하세요.' });
    return;
  }

  let creatorId: string | null = null;
  let creatorStatus: string | null = null;
  if (user.role === 'creator') {
    const creator = db.prepare('SELECT id, status, rejection_reason FROM creators WHERE user_id = ?').get(user.id) as { id: string; status: string; rejection_reason: string | null } | undefined;
    if (creator?.status === 'suspended') {
      res.status(403).json({ error: '정지된 크리에이터 계정입니다. 운영자에게 문의하세요.' });
      return;
    }
    if (creator?.status === 'rejected') {
      res.status(403).json({ error: `신청이 반려되었습니다.${creator.rejection_reason ? ' 사유: ' + creator.rejection_reason : ''} 문의가 필요하면 운영자에게 연락해주세요.` });
      return;
    }
    creatorId = creator?.id || null;
    creatorStatus = creator?.status || null;
  }

  const token = generateToken(user.id, user.role);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, creatorId, creatorStatus },
  });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.post('/password-reset-request', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: '이메일을 입력하세요.' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;

  // Always return success to prevent email enumeration
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      `reset_token:${user.id}`,
      JSON.stringify({ token: resetToken, expiresAt: expiry })
    );
    console.log(`[auth] 비밀번호 재설정 토큰 생성됨 (사용자: ${user.id}). 이메일 발송 서비스가 연결되지 않아 콘솔에 출력합니다: ${resetToken}`);
  }

  res.json({ message: '등록된 이메일인 경우 재설정 안내가 발송됩니다. (이메일 서비스 미연동 — 서버 로그를 확인하세요)' });
});

router.post('/password-reset', (req, res) => {
  const { userId, resetToken, newPassword } = req.body;
  if (!userId || !resetToken || !newPassword) {
    res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
    return;
  }

  const db = getDb();
  const stored = db.prepare("SELECT value FROM settings WHERE key = ?").get(`reset_token:${userId}`) as { value: string } | undefined;
  if (!stored) {
    res.status(400).json({ error: '유효하지 않은 재설정 요청입니다.' });
    return;
  }

  const { token: storedToken, expiresAt } = JSON.parse(stored.value);
  if (storedToken !== resetToken || new Date(expiresAt) < new Date()) {
    res.status(400).json({ error: '만료되었거나 유효하지 않은 토큰입니다.' });
    return;
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), userId);
  db.prepare("DELETE FROM settings WHERE key = ?").run(`reset_token:${userId}`);
  res.json({ message: '비밀번호가 변경되었습니다.' });
});

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, role, status, nickname, created_at FROM users WHERE id = ?').get(req.user!.id) as {
    id: string; email: string; name: string; role: string; status: string; nickname: string | null; created_at: string;
  } | undefined;

  if (!user) {
    res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    return;
  }

  let creatorId: string | null = null;
  let creatorStatus: string | null = null;
  let creatorInfo = null;
  if (user.role === 'creator') {
    const creator = db.prepare('SELECT * FROM creators WHERE user_id = ?').get(user.id) as Record<string, unknown> | undefined;
    if (creator) {
      creatorId = creator.id as string;
      creatorStatus = creator.status as string;
      creatorInfo = {
        ...creator,
        channels: JSON.parse(creator.channels as string || '[]'),
        selected_products: JSON.parse(creator.selected_products as string || '[]'),
      };
    }
  }

  res.json({
    ok: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      nickname: user.nickname || null,
      creatorId,
      creatorStatus,
    },
    creator: creatorInfo,
  });
});

router.post('/change-password', authMiddleware, (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력하세요.' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: '새 비밀번호는 8자 이상이어야 합니다.' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string } | undefined;
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    return;
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), req.user!.id);
  res.json({ ok: true, message: '비밀번호가 변경되었습니다.' });
});

router.post('/login/simple', (req, res) => {
  const { nickname, pin } = req.body;
  if (!nickname || !pin) {
    res.status(400).json({ error: '닉네임과 PIN을 입력하세요.' });
    return;
  }
  if (!/^\d{6}$/.test(pin)) {
    res.status(400).json({ error: 'PIN은 숫자 6자리여야 합니다.' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT id, email, password_hash, name, role, status, nickname, pin FROM users WHERE nickname = ?').get(nickname) as {
    id: string; email: string; password_hash: string; name: string; role: string; status: string; nickname: string; pin: string;
  } | undefined;

  if (!user || !user.pin || !verifyPassword(pin, user.pin)) {
    res.status(401).json({ error: '닉네임 또는 PIN이 올바르지 않습니다.' });
    return;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: '정지된 계정입니다. 운영자에게 문의하세요.' });
    return;
  }

  let creatorId: string | null = null;
  let creatorStatus: string | null = null;
  if (user.role === 'creator') {
    const creator = db.prepare('SELECT id, status, rejection_reason FROM creators WHERE user_id = ?').get(user.id) as { id: string; status: string; rejection_reason: string | null } | undefined;
    if (creator?.status === 'suspended') {
      res.status(403).json({ error: '정지된 크리에이터 계정입니다.' });
      return;
    }
    if (creator?.status === 'rejected') {
      res.status(403).json({ error: `신청이 반려되었습니다.${creator.rejection_reason ? ' 사유: ' + creator.rejection_reason : ''}` });
      return;
    }
    creatorId = creator?.id || null;
    creatorStatus = creator?.status || null;
  }

  const token = generateToken(user.id, user.role);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, nickname: user.nickname, creatorId, creatorStatus },
  });
});

router.post('/nickname/set', authMiddleware, (req: AuthRequest, res) => {
  const { nickname, pin } = req.body;
  if (!nickname || !pin) {
    res.status(400).json({ error: '닉네임과 PIN을 입력하세요.' });
    return;
  }
  if (nickname.length < 2 || nickname.length > 20) {
    res.status(400).json({ error: '닉네임은 2~20자여야 합니다.' });
    return;
  }
  if (!/^\d{6}$/.test(pin)) {
    res.status(400).json({ error: 'PIN은 숫자 6자리여야 합니다.' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE nickname = ? AND id != ?').get(nickname, req.user!.id);
  if (existing) {
    res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
    return;
  }

  const pinHash = hashPassword(pin);
  db.prepare('UPDATE users SET nickname = ?, pin = ? WHERE id = ?').run(nickname, pinHash, req.user!.id);
  res.json({ ok: true, message: '닉네임과 PIN이 설정되었습니다.' });
});

router.get('/nickname/check/:nickname', (req, res) => {
  const { nickname } = req.params;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
  res.json({ ok: true, data: { available: !existing } });
});

export default router;
