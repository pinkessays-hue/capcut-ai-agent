import { useState, useEffect } from 'react';
import { getAllCreators, updateCreatorStatus } from '../api/creators';
import { formatDate, CHANNEL_LABELS } from '../types';
import type { Creator } from '../types';

export default function AdminCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);

  const loadData = () => {
    getAllCreators().then(res => { if (res.data) setCreators(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateCreatorStatus(id, newStatus);
      loadData();
    } catch { /* silent */ }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>크리에이터 관리</h1>

      {creators.length === 0 ? (
        <div className="empty-state"><p>등록된 크리에이터가 없습니다.</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>채널</th>
                <th>상태</th>
                <th>가입일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {creators.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.channels.map(ch => (
                        <span key={ch} className="badge badge-info" style={{ fontSize: 11 }}>{CHANNEL_LABELS[ch]}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-critical'}`}>
                      {c.status === 'active' ? '활성' : '정지'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.createdAt)}</td>
                  <td>
                    <button
                      className="btn-ghost btn-small"
                      style={{ color: c.status === 'active' ? 'var(--critical)' : 'var(--success)' }}
                      onClick={() => handleToggleStatus(c.id, c.status)}
                    >
                      {c.status === 'active' ? '정지' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
