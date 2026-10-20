import { useState, useEffect } from 'react';
import { getAllSettlements, updateSettlementStatus } from '../api/settlements';
import { getAllCreators } from '../api/creators';
import { formatKRW, formatDate, SETTLEMENT_STATUS_LABELS } from '../types';
import type { Settlement, SettlementStatus, Creator } from '../types';

export default function AdminSettlement() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);

  const loadData = () => {
    getAllSettlements().then(res => { if (res.data) setSettlements(res.data); }).catch(() => {});
    getAllCreators().then(res => { if (res.data) setCreators(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleStatusChange = async (id: string, status: SettlementStatus) => {
    await updateSettlementStatus(id, status).catch(() => {});
    loadData();
  };

  const creatorSummary = creators.map(c => {
    const cs = settlements.filter(s => s.creatorId === c.id);
    return {
      creator: c,
      pending: cs.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0),
      processing: cs.filter(s => s.status === 'processing').reduce((sum, s) => sum + s.amount, 0),
      completed: cs.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount, 0),
      total: cs.reduce((sum, s) => sum + s.amount, 0),
    };
  }).filter(cs => cs.total > 0);

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>정산 관리</h1>

      <h2 className="section-subtitle">크리에이터별 정산 현황</h2>
      {creatorSummary.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 32 }}><p>정산 대상이 없습니다.</p></div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 32 }}>
          <table>
            <thead>
              <tr>
                <th>크리에이터</th>
                <th style={{ textAlign: 'right' }}>대기</th>
                <th style={{ textAlign: 'right' }}>처리 중</th>
                <th style={{ textAlign: 'right' }}>완료</th>
                <th style={{ textAlign: 'right' }}>합계</th>
              </tr>
            </thead>
            <tbody>
              {creatorSummary.map(cs => (
                <tr key={cs.creator.id}>
                  <td><strong>{cs.creator.name}</strong></td>
                  <td style={{ textAlign: 'right' }}>{formatKRW(cs.pending)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{formatKRW(cs.processing)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatKRW(cs.completed)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatKRW(cs.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-subtitle">정산 내역</h2>
      {settlements.length === 0 ? (
        <div className="empty-state"><p>정산 내역이 없습니다.</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>크리에이터</th>
                <th>요청일</th>
                <th style={{ textAlign: 'right' }}>금액</th>
                <th>계좌</th>
                <th>상태</th>
                <th>변경</th>
              </tr>
            </thead>
            <tbody>
              {settlements.slice().reverse().map(s => {
                const cr = creators.find(c => c.id === s.creatorId);
                return (
                  <tr key={s.id}>
                    <td>{cr?.name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(s.requestedAt)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatKRW(s.amount)}</td>
                    <td>{s.bankName ? `${s.bankName} ${s.accountNumberMasked}` : '-'}</td>
                    <td>
                      <span className={`badge ${s.status === 'completed' ? 'badge-success' : s.status === 'failed' ? 'badge-critical' : s.status === 'processing' ? 'badge-info' : 'badge-pending'}`}>
                        {SETTLEMENT_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {s.status === 'pending' && <button className="btn-ghost btn-small" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleStatusChange(s.id, 'processing')}>처리 시작</button>}
                        {s.status === 'processing' && (
                          <>
                            <button className="btn-buy btn-small" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleStatusChange(s.id, 'completed')}>지급 완료</button>
                            <button className="btn-ghost btn-small" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--critical)' }} onClick={() => handleStatusChange(s.id, 'failed')}>실패</button>
                          </>
                        )}
                        {s.status === 'failed' && <button className="btn-ghost btn-small" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleStatusChange(s.id, 'pending')}>재시도</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
