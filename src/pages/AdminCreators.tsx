import { useState } from 'react';
import { getCreators, updateCreatorStatus, formatDate } from '../store/data';
import { CHANNEL_LABELS, CREATOR_STATUS_LABELS } from '../types';
import type { CreatorStatus } from '../types';

interface Props {
  onRefresh: () => void;
  onSelectCreator: (id: string) => void;
}

export default function AdminCreators({ onRefresh, onSelectCreator }: Props) {
  const [creators, setCreators] = useState(getCreators());

  const refreshData = () => {
    setCreators(getCreators());
    onRefresh();
  };

  const handleStatusChange = (id: string, status: CreatorStatus) => {
    updateCreatorStatus(id, status);
    refreshData();
  };

  const pending = creators.filter(c => c.status === 'pending');
  const approved = creators.filter(c => c.status === 'approved');
  const rejected = creators.filter(c => c.status === 'rejected');

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>크리에이터 관리</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        신청자 심사 및 상태 관리 <span className="text-test-data">테스트 데이터</span>
      </p>

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="section-subtitle">심사 대기 ({pending.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(c => (
              <div key={c.id} className="card" style={{ padding: 16, borderLeft: '4px solid var(--attention)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: 16 }}>{c.name}</strong>
                    <span className="badge badge-pending" style={{ marginLeft: 8 }}>심사 중</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--stone)' }}>신청: {formatDate(c.appliedAt)}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>
                  {c.email} · {c.phone} · {c.category}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {c.channels.map((ch, i) => (
                    <span key={i} className="badge badge-info" style={{ fontSize: 11 }}>
                      {CHANNEL_LABELS[ch.type]}: {ch.accountName}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-buy btn-small" onClick={() => handleStatusChange(c.id, 'approved')}>승인</button>
                  <button className="btn-ghost btn-small" style={{ color: 'var(--critical)' }} onClick={() => handleStatusChange(c.id, 'rejected')}>반려</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <h2 className="section-subtitle">승인된 크리에이터 ({approved.length})</h2>
        {approved.length === 0 ? (
          <div className="empty-state"><p>승인된 크리에이터가 없습니다.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>채널</th>
                  <th>활동 분야</th>
                  <th>승인일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {approved.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.channels.map((ch, i) => (
                          <span key={i} className="badge badge-info" style={{ fontSize: 11 }}>{CHANNEL_LABELS[ch.type]}</span>
                        ))}
                      </div>
                    </td>
                    <td>{c.category}</td>
                    <td>{c.approvedAt ? formatDate(c.approvedAt) : '-'}</td>
                    <td>
                      <button className="btn-ghost btn-small" onClick={() => onSelectCreator(c.id)}>
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejected.length > 0 && (
        <div>
          <h2 className="section-subtitle">반려 ({rejected.length})</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>채널</th>
                  <th>신청일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rejected.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      {c.channels.map((ch, i) => (
                        <span key={i} className="badge badge-info" style={{ fontSize: 11, marginRight: 4 }}>{CHANNEL_LABELS[ch.type]}</span>
                      ))}
                    </td>
                    <td>{formatDate(c.appliedAt)}</td>
                    <td>
                      <button className="btn-ghost btn-small" onClick={() => handleStatusChange(c.id, 'approved')}>재승인</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
