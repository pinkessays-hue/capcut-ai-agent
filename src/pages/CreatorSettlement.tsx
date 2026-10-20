import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWalletSummary } from '../api/points';
import { getMySettlements, requestSettlement } from '../api/settlements';
import { formatKRW, formatDate, SETTLEMENT_STATUS_LABELS } from '../types';
import type { Settlement } from '../types';

export default function CreatorSettlement() {
  const [wallet, setWallet] = useState({ available: 0, pending: 0, totalEarned: 0, totalSettled: 0 });
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = () => {
    getWalletSummary().then(res => { if (res.data) setWallet(res.data); }).catch(() => {});
    getMySettlements().then(res => { if (res.data) setSettlements(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleRequest = async () => {
    setError('');
    setRequesting(true);
    try {
      await requestSettlement();
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '정산 요청에 실패했습니다.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>정산</h1>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">사용 가능</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{formatKRW(wallet.available)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">적립 대기</div>
          <div className="stat-value">{formatKRW(wallet.pending)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">총 정산</div>
          <div className="stat-value">{formatKRW(wallet.totalSettled)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>정산 요청</div>
            <div style={{ fontSize: 13, color: 'var(--steel)' }}>
              5,000원 이상 시 등록된 기본 계좌로 정산됩니다.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => navigate('/creator/bank-account')}>계좌 관리</button>
            <button className="btn-buy" disabled={wallet.available < 5000 || requesting} onClick={handleRequest}>
              {requesting ? '처리 중...' : '정산 요청'}
            </button>
          </div>
        </div>
        {error && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--critical)' }}>{error}</div>}
      </div>

      <h2 className="section-subtitle">정산 내역</h2>
      {settlements.length === 0 ? (
        <div className="empty-state"><p>정산 내역이 없습니다.</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>요청일</th>
                <th style={{ textAlign: 'right' }}>금액</th>
                <th>상태</th>
                <th>계좌</th>
                <th>완료일</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(s.requestedAt)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatKRW(s.amount)}</td>
                  <td>
                    <span className={`badge ${s.status === 'completed' ? 'badge-success' : s.status === 'failed' ? 'badge-critical' : s.status === 'processing' ? 'badge-info' : 'badge-pending'}`}>
                      {SETTLEMENT_STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td>{s.bankName ? `${s.bankName} ${s.accountNumberMasked}` : '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{s.completedAt ? formatDate(s.completedAt) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
