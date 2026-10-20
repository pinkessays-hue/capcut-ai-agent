import { useState, useEffect } from 'react';
import { getWalletSummary, getLedger } from '../api/points';
import { requestSettlement, getMySettlements } from '../api/settlements';
import { formatKRW, formatDate, POINT_STATUS_LABELS } from '../types';
import type { LedgerEntry, Settlement } from '../types';

const LEDGER_TYPE_LABELS: Record<string, string> = {
  credit: '적립',
  cancel: '취소/환수',
  payout: '정산 출금',
  reversal: '정산 실패 복원',
};

export default function CreatorWallet() {
  const [summary, setSummary] = useState({ available: 0, pending: 0, totalEarned: 0, totalSettled: 0 });
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  const loadData = () => {
    getWalletSummary().then(res => { if (res.data) setSummary(res.data); }).catch(() => {});
    getLedger().then(res => { if (res.data) setLedger(res.data); }).catch(() => {});
    getMySettlements().then(res => { if (res.data) setSettlements(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleRequestSettlement = async () => {
    setError('');
    setRequesting(true);
    try {
      const res = await requestSettlement();
      if (!res.ok) { setError(res.error || '정산 요청에 실패했습니다.'); return; }
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '정산 요청 중 오류가 발생했습니다.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>포인트 지갑</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        수수료 포인트 적립·정산 현황
      </p>

      {/* Summary cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">사용 가능</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{formatKRW(summary.available)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">적립 대기</div>
          <div className="stat-value">{formatKRW(summary.pending)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">총 적립</div>
          <div className="stat-value">{formatKRW(summary.totalEarned)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">총 정산</div>
          <div className="stat-value">{formatKRW(summary.totalSettled)}</div>
        </div>
      </div>

      {/* Settlement request */}
      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>정산 요청</div>
            <div style={{ fontSize: 13, color: 'var(--steel)' }}>
              사용 가능 포인트가 5,000원 이상일 때 정산을 요청할 수 있습니다.
              {summary.available < 5000 && <span style={{ color: 'var(--critical)', marginLeft: 8 }}>잔액 부족</span>}
            </div>
          </div>
          <button
            className="btn-buy"
            disabled={summary.available < 5000 || requesting}
            onClick={handleRequestSettlement}
          >
            {requesting ? '처리 중...' : '정산 요청'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--critical)' }}>{error}</div>
        )}
      </div>

      {/* Settlement history */}
      {settlements.length > 0 && (
        <>
          <h2 className="section-subtitle">정산 내역</h2>
          <div className="table-wrapper" style={{ marginBottom: 32 }}>
            <table>
              <thead>
                <tr>
                  <th>요청일</th>
                  <th style={{ textAlign: 'right' }}>금액</th>
                  <th>상태</th>
                  <th>은행</th>
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
                        {POINT_STATUS_LABELS[s.status === 'completed' ? 'settled' : s.status === 'processing' ? 'settlement_processing' : s.status === 'failed' ? 'settlement_failed' : 'available'] || s.status}
                      </span>
                    </td>
                    <td>{s.bankName ? `${s.bankName} ${s.accountNumberMasked}` : '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.completedAt ? formatDate(s.completedAt) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Ledger */}
      <h2 className="section-subtitle">포인트 이력</h2>
      {ledger.length === 0 ? (
        <div className="empty-state"><p>포인트 이력이 없습니다.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ledger.map(entry => (
            <div key={entry.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span className={`badge ${entry.type === 'credit' ? 'badge-success' : entry.type === 'payout' ? 'badge-info' : 'badge-critical'}`} style={{ marginRight: 8 }}>
                  {LEDGER_TYPE_LABELS[entry.type]}
                </span>
                <span style={{ fontSize: 13, color: 'var(--charcoal)' }}>{entry.description}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: entry.amount >= 0 ? 'var(--primary)' : 'var(--critical)' }}>
                  {entry.amount >= 0 ? '+' : ''}{formatKRW(entry.amount)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--stone)' }}>
                  잔액 {formatKRW(entry.balanceAfter)} · {formatDate(entry.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
