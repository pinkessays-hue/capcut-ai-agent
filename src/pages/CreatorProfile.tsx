import { useState, useEffect, type FormEvent } from 'react';
import { getMyProfile } from '../api/creators';
import { setNickname as apiSetNickname, checkNickname } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, CHANNEL_LABELS } from '../types';
import type { Creator } from '../types';

export default function CreatorProfile() {
  const [profile, setProfile] = useState<Creator | null>(null);
  const { user } = useAuth();
  const [newNickname, setNewNickname] = useState('');
  const [newPin, setNewPin] = useState('');
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMsg, setNicknameMsg] = useState('');
  const [nicknameMsgType, setNicknameMsgType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    getMyProfile().then(res => { if (res.data) setProfile(res.data); }).catch(() => {});
  }, []);

  const handleCheckNickname = async () => {
    if (!newNickname.trim() || newNickname.trim().length < 2) {
      setNicknameMsg('닉네임은 2자 이상이어야 합니다.');
      setNicknameMsgType('error');
      return;
    }
    setCheckingNickname(true);
    try {
      const res = await checkNickname(newNickname.trim());
      setNicknameAvailable(res.data?.available ?? false);
      setNicknameMsg(res.data?.available ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.');
      setNicknameMsgType(res.data?.available ? 'success' : 'error');
    } catch {
      setNicknameMsg('확인 중 오류가 발생했습니다.');
      setNicknameMsgType('error');
    } finally {
      setCheckingNickname(false);
    }
  };

  const handleSetNickname = async (e: FormEvent) => {
    e.preventDefault();
    if (!newNickname.trim() || newNickname.trim().length < 2) {
      setNicknameMsg('닉네임은 2자 이상이어야 합니다.');
      setNicknameMsgType('error');
      return;
    }
    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setNicknameMsg('PIN은 숫자 6자리여야 합니다.');
      setNicknameMsgType('error');
      return;
    }
    setNicknameSaving(true);
    try {
      const res = await apiSetNickname(newNickname.trim(), newPin);
      if (res.ok) {
        setNicknameMsg('닉네임과 PIN이 설정되었습니다.');
        setNicknameMsgType('success');
        setNewNickname('');
        setNewPin('');
        setNicknameAvailable(null);
      } else {
        setNicknameMsg(res.error || res.message || '설정에 실패했습니다.');
        setNicknameMsgType('error');
      }
    } catch (err: unknown) {
      setNicknameMsg(err instanceof Error ? err.message : '설정에 실패했습니다.');
      setNicknameMsgType('error');
    } finally {
      setNicknameSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="container" style={{ padding: '32px 16px 64px' }}>
        <div className="empty-state"><p>프로필 정보를 불러오는 중...</p></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>프로필</h1>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>이름</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{profile.name}</div>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>이메일</div>
            <div style={{ fontSize: 15 }}>{profile.email}</div>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>연락처</div>
            <div style={{ fontSize: 15 }}>{profile.phone}</div>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>상태</div>
            <span className={`badge ${profile.status === 'active' ? 'badge-success' : 'badge-critical'}`}>
              {profile.status === 'active' ? '활성' : '정지'}
            </span>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>카테고리</div>
            <div style={{ fontSize: 15 }}>{profile.category || '-'}</div>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>가입일</div>
            <div style={{ fontSize: 15 }}>{formatDate(profile.createdAt)}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="form-label" style={{ marginBottom: 4 }}>활동 채널</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {profile.channels.map(ch => (
                <span key={ch} className="badge badge-info">{CHANNEL_LABELS[ch] || ch}</span>
              ))}
              {profile.channelOther && (
                <span className="badge badge-info">{profile.channelOther}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>간편 로그인 설정</h2>
        {user?.nickname && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface-soft)', borderRadius: 10, fontSize: 13 }}>
            현재 닉네임: <strong>{user.nickname}</strong>
          </div>
        )}
        <form onSubmit={handleSetNickname}>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">닉네임</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-field"
                value={newNickname}
                onChange={e => { setNewNickname(e.target.value); setNicknameAvailable(null); setNicknameMsg(''); }}
                placeholder="영문/숫자/한글 2~20자"
                maxLength={20}
                disabled={nicknameSaving}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCheckNickname}
                disabled={checkingNickname || nicknameSaving || !newNickname.trim()}
                style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: 13 }}
              >
                {checkingNickname ? '확인 중...' : '중복확인'}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">PIN (6자리)</label>
            <input
              className="input-field"
              type="tel"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              value={newPin}
              onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
              placeholder="000000"
              disabled={nicknameSaving}
              style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: 24, fontWeight: 700, maxWidth: 200 }}
            />
          </div>
          {nicknameMsg && (
            <div style={{
              fontSize: 13, marginBottom: 12,
              color: nicknameMsgType === 'success' ? 'var(--success)' : 'var(--critical)',
            }}>
              {nicknameMsg}
            </div>
          )}
          <button
            className="btn-buy"
            type="submit"
            disabled={nicknameSaving}
            style={{ padding: '10px 24px' }}
          >
            {nicknameSaving ? '저장 중...' : user?.nickname ? '닉네임/PIN 변경' : '닉네임/PIN 설정'}
          </button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 12, lineHeight: 1.5 }}>
          닉네임과 PIN을 설정하면 간편 로그인을 사용할 수 있습니다.<br />
          PIN은 본인만 알 수 있으며, 분실 시 이 화면에서 재설정할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
