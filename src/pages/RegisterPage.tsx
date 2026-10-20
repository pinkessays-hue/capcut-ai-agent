import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CHANNEL_LABELS } from '../types';
import type { ChannelType } from '../types';

const CHANNEL_OPTIONS: ChannelType[] = ['youtube', 'instagram', 'tiktok', 'naver_blog', 'ohouse', 'other'];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [channelOther, setChannelOther] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const toggleChannel = (ch: ChannelType) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !phone) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (password !== passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (channels.length === 0) { setError('활동 채널을 1개 이상 선택해주세요.'); return; }
    if (channels.includes('other') && !channelOther.trim()) { setError('기타 채널명을 입력해주세요.'); return; }
    if (!termsAgreed || !privacyAgreed) { setError('약관에 동의해주세요.'); return; }

    setSubmitting(true);
    try {
      await register({
        name, email, password, phone, category,
        channels,
        channelOther: channels.includes('other') ? channelOther.trim() : undefined,
        termsAgreed, privacyAgreed,
      });
      navigate('/creator');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 16px 64px' }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>크리에이터 가입</h1>
        <p style={{ fontSize: 13, color: 'var(--steel)', textAlign: 'center', marginBottom: 24 }}>
          가입과 동시에 크리에이터 계정이 생성되고 마케팅 링크를 바로 발급할 수 있습니다.
        </p>

        {error && (
          <div style={{ background: 'var(--critical-soft)', color: 'var(--critical)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">이름 *</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" disabled={submitting} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">이메일 *</label>
            <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" autoComplete="email" disabled={submitting} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">비밀번호 *</label>
              <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" autoComplete="new-password" disabled={submitting} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">비밀번호 확인 *</label>
              <input className="input-field" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="비밀번호 확인" autoComplete="new-password" disabled={submitting} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">연락처 *</label>
            <input className="input-field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" disabled={submitting} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">카테고리</label>
            <select className="select-field" value={category} onChange={e => setCategory(e.target.value)} disabled={submitting}>
              <option value="">선택하세요</option>
              <option value="interior">인테리어</option>
              <option value="lifestyle">라이프스타일</option>
              <option value="tech">테크/가전</option>
              <option value="beauty">뷰티</option>
              <option value="other">기타</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">활동 채널 *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CHANNEL_OPTIONS.map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  disabled={submitting}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    border: channels.includes(ch) ? '2px solid var(--primary)' : '1px solid var(--hairline)',
                    background: channels.includes(ch) ? 'var(--primary-soft)' : '#fff',
                    color: channels.includes(ch) ? 'var(--primary)' : 'var(--charcoal)',
                    cursor: 'pointer',
                    fontWeight: channels.includes(ch) ? 600 : 400,
                  }}
                >
                  {CHANNEL_LABELS[ch]}
                </button>
              ))}
            </div>
            {channels.includes('other') && (
              <input
                className="input-field"
                style={{ marginTop: 8 }}
                value={channelOther}
                onChange={e => setChannelOther(e.target.value)}
                placeholder="채널명 (예: 브런치, 카카오뷰)"
                disabled={submitting}
              />
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--charcoal)', cursor: 'pointer' }}>
              <input type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)} disabled={submitting} style={{ marginTop: 2 }} />
              <span>[필수] 이용약관에 동의합니다. <em style={{ color: 'var(--stone)', fontStyle: 'normal', fontSize: 11 }}>(관리자 설정에서 문구 수정 가능)</em></span>
            </label>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--charcoal)', cursor: 'pointer' }}>
              <input type="checkbox" checked={privacyAgreed} onChange={e => setPrivacyAgreed(e.target.checked)} disabled={submitting} style={{ marginTop: 2 }} />
              <span>[필수] 개인정보 수집·이용에 동의합니다. <em style={{ color: 'var(--stone)', fontStyle: 'normal', fontSize: 11 }}>(관리자 설정에서 문구 수정 가능)</em></span>
            </label>
          </div>

          <button className="btn-buy" type="submit" disabled={submitting} style={{ width: '100%', padding: '12px 0' }}>
            {submitting ? '가입 중...' : '크리에이터로 가입하기'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--steel)' }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
