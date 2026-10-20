import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type LoginMode = 'email' | 'simple';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, loginSimple } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'email') {
      if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return; }
    } else {
      if (!nickname || !pin) { setError('닉네임과 PIN을 입력해주세요.'); return; }
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) { setError('PIN은 숫자 6자리여야 합니다.'); return; }
    }

    setSubmitting(true);
    try {
      if (mode === 'email') {
        await login(email, password);
      } else {
        await loginSimple(nickname, pin);
      }
      navigate('/creator');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>로그인</h1>
        <p style={{ fontSize: 13, color: 'var(--steel)', textAlign: 'center', marginBottom: 20 }}>
          홈앤힐 · 쉬어 크리에이터 파트너스
        </p>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-soft)', borderRadius: 10, padding: 3 }}>
          <button
            type="button"
            onClick={() => setMode('email')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: mode === 'email' ? 600 : 400,
              background: mode === 'email' ? '#fff' : 'transparent',
              color: mode === 'email' ? 'var(--ink)' : 'var(--steel)',
              border: 'none', cursor: 'pointer',
              boxShadow: mode === 'email' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            이메일 로그인
          </button>
          <button
            type="button"
            onClick={() => setMode('simple')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: mode === 'simple' ? 600 : 400,
              background: mode === 'simple' ? '#fff' : 'transparent',
              color: mode === 'simple' ? 'var(--ink)' : 'var(--steel)',
              border: 'none', cursor: 'pointer',
              boxShadow: mode === 'simple' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            간편 로그인
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--critical-soft)', color: 'var(--critical)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'email' ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">이메일</label>
                <input
                  className="input-field"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">비밀번호</label>
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">닉네임</label>
                <input
                  className="input-field"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="닉네임"
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">PIN (6자리)</label>
                <input
                  className="input-field"
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]*"
                  value={pin}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPin(v);
                  }}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  disabled={submitting}
                  style={{
                    letterSpacing: '0.5em',
                    textAlign: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                />
              </div>
            </>
          )}
          <button className="btn-buy" type="submit" disabled={submitting} style={{ width: '100%', padding: '12px 0' }}>
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--steel)' }}>
          아직 계정이 없으신가요?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            크리에이터 가입
          </Link>
        </div>
      </div>
    </div>
  );
}
