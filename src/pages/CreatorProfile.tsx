import { getCreators, formatDate } from '../store/data';
import { CHANNEL_LABELS, CREATOR_STATUS_LABELS } from '../types';

interface Props {
  creatorId: string;
}

export default function CreatorProfile({ creatorId }: Props) {
  const creators = getCreators();
  const creator = creators.find(c => c.id === creatorId);

  if (!creator) {
    return <div className="container" style={{ padding: 48 }}><div className="empty-state"><p>크리에이터를 찾을 수 없습니다.</p></div></div>;
  }

  return (
    <div className="container" style={{ padding: '32px 16px 64px', maxWidth: 720 }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>프로필</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        크리에이터 정보 <span className="text-test-data">테스트 데이터</span>
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--surface-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--steel)',
            flexShrink: 0,
          }}>
            {creator.name[0]}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{creator.name}</h2>
            <span className={`badge ${creator.status === 'approved' ? 'badge-success' : creator.status === 'rejected' ? 'badge-critical' : 'badge-pending'}`}>
              {CREATOR_STATUS_LABELS[creator.status]}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 4 }}>이메일</div>
            <div style={{ fontSize: 15 }}>{creator.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 4 }}>연락처</div>
            <div style={{ fontSize: 15 }}>{creator.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 4 }}>활동 분야</div>
            <div style={{ fontSize: 15 }}>{creator.category}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 4 }}>신청일</div>
            <div style={{ fontSize: 15 }}>{formatDate(creator.appliedAt)}</div>
          </div>
          {creator.approvedAt && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 4 }}>승인일</div>
              <div style={{ fontSize: 15 }}>{formatDate(creator.approvedAt)}</div>
            </div>
          )}
        </div>
      </div>

      <h2 className="section-subtitle">활동 채널</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {creator.channels.map((ch, i) => (
          <div key={i} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="badge badge-info">{CHANNEL_LABELS[ch.type]}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{ch.accountName}</span>
            <span style={{ fontSize: 13, color: 'var(--steel)', wordBreak: 'break-all' }}>{ch.url}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
