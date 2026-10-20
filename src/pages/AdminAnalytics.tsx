import { useState, useEffect } from 'react';
import { getAnalytics } from '../api/admin';
import type { AnalyticsData } from '../api/admin';
import { formatKRW } from '../types';

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(toDateStr(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(toDateStr(now));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    getAnalytics(startDate, endDate)
      .then(res => {
        if (res.data) setData(res.data);
        else setError('데이터를 불러올 수 없습니다.');
      })
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const cafe24 = data?.cafe24Status;

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>매출분석</h1>

      {cafe24 && !cafe24.connected && (
        <div style={{
          background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 10,
          padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#795548',
        }}>
          카페24 연동이 설정되지 않았습니다. 실제 주문 데이터를 확인하려면{' '}
          <strong>연동 설정</strong>에서 카페24 인증 정보를 등록해주세요.
          연동 전에는 수동 등록 주문만 표시됩니다.
        </div>
      )}

      {cafe24 && cafe24.connected && (
        <div style={{
          background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 10,
          padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#2E7D32',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <span>카페24 연동됨 {cafe24.lastSync ? `· 마지막 동기화: ${cafe24.lastSync}` : ''} · 동기화된 주문: {cafe24.totalSyncedOrders}건</span>
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">시작일</label>
            <input className="input-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 160 }} />
          </div>
          <div>
            <label className="form-label">종료일</label>
            <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 160 }} />
          </div>
          <button className="btn-buy" onClick={fetchData} disabled={loading} style={{ padding: '10px 20px' }}>
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--critical-soft)', color: 'var(--critical)', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="empty-state"><p>데이터를 불러오는 중...</p></div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="총 주문" value={`${data.summary.totalOrders}건`} />
            <StatCard label="총 매출" value={formatKRW(data.summary.totalSales)} />
            <StatCard label="확정 매출" value={formatKRW(data.summary.confirmedSales)} />
            <StatCard label="취소 금액" value={formatKRW(data.summary.cancelledAmount)} warn />
            <StatCard label="환불 금액" value={formatKRW(data.summary.refundedAmount)} warn />
            <StatCard label="총 수수료" value={formatKRW(data.summary.totalCommission)} />
            <StatCard label="귀속 주문" value={`${data.summary.attributedOrders}건`} />
            <StatCard label="미귀속 주문" value={`${data.summary.unattributedOrders}건`} sub />
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>일별 추이</h2>
            {data.daily.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--stone)' }}>해당 기간 데이터가 없습니다.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>날짜</th>
                      <th style={{ textAlign: 'right' }}>주문</th>
                      <th style={{ textAlign: 'right' }}>매출</th>
                      <th style={{ textAlign: 'right' }}>취소</th>
                      <th style={{ textAlign: 'right' }}>취소 금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map(d => (
                      <tr key={d.date}>
                        <td>{d.date}</td>
                        <td style={{ textAlign: 'right' }}>{d.orders}건</td>
                        <td style={{ textAlign: 'right' }}>{formatKRW(d.sales)}</td>
                        <td style={{ textAlign: 'right' }}>{d.cancels}건</td>
                        <td style={{ textAlign: 'right' }}>{formatKRW(d.cancelAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>상품별 매출</h2>
            {data.byProduct.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--stone)' }}>해당 기간 데이터가 없습니다.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>상품</th>
                      <th style={{ textAlign: 'right' }}>주문</th>
                      <th style={{ textAlign: 'right' }}>수량</th>
                      <th style={{ textAlign: 'right' }}>매출</th>
                      <th style={{ textAlign: 'right' }}>취소</th>
                      <th style={{ textAlign: 'right' }}>취소 금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProduct.map(p => (
                      <tr key={p.productId}>
                        <td>{p.productName}</td>
                        <td style={{ textAlign: 'right' }}>{p.orders}건</td>
                        <td style={{ textAlign: 'right' }}>{p.quantity}개</td>
                        <td style={{ textAlign: 'right' }}>{formatKRW(p.sales)}</td>
                        <td style={{ textAlign: 'right' }}>{p.cancels}건</td>
                        <td style={{ textAlign: 'right' }}>{formatKRW(p.cancelAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>크리에이터별 실적</h2>
            {data.byCreator.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--stone)' }}>해당 기간 데이터가 없습니다.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>크리에이터</th>
                      <th style={{ textAlign: 'right' }}>주문</th>
                      <th style={{ textAlign: 'right' }}>매출</th>
                      <th style={{ textAlign: 'right' }}>수수료</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCreator.map(c => (
                      <tr key={c.creatorId}>
                        <td>{c.creatorName}</td>
                        <td style={{ textAlign: 'right' }}>{c.orders}건</td>
                        <td style={{ textAlign: 'right' }}>{formatKRW(c.sales)}</td>
                        <td style={{ textAlign: 'right' }}>{formatKRW(c.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={{ fontSize: 12, color: 'var(--stone)', textAlign: 'center', marginTop: 8 }}>
            주문 귀속은 크리에이터 링크를 통해 유입된 후 구매 확정된 건만 포함됩니다.
            클릭만 기록된 건은 포함되지 않습니다.
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, warn, sub }: { label: string; value: string; warn?: boolean; sub?: boolean }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 18, fontWeight: 700,
        color: warn ? 'var(--critical)' : sub ? 'var(--stone)' : 'var(--ink)',
      }}>
        {value}
      </div>
    </div>
  );
}
