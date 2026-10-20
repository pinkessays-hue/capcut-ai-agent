import { useState, useEffect } from 'react';
import { getMyProfile } from '../api/creators';
import { formatDate, CHANNEL_LABELS } from '../types';
import type { Creator } from '../types';

export default function CreatorProfile() {
  const [profile, setProfile] = useState<Creator | null>(null);

  useEffect(() => {
    getMyProfile().then(res => { if (res.data) setProfile(res.data); }).catch(() => {});
  }, []);

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
    </div>
  );
}
