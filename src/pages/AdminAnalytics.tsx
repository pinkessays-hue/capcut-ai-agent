import { useState, useEffect, useCallback } from 'react';
import { getAnalytics, syncCafe24Orders, getIntegrationStatus, type AnalyticsData, type DailyData, type ProductData, type CreatorData } from '../api/admin';
import { formatKRW } from '../types';

type Period = '7d' | '30d' | '90d' | 'custom';

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div style={{
    background: 'var(--surface-soft)', borderRadius: 12, padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 4,
  }}>
    <span style={{ fontSize: 12, color: 'var(--steel)' }}>{label}</span>
    <span style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
    {sub && <span style={{ fontSize: 11, color: 'var(--stone)' }}>{sub}</span>}
  </div>
);

const DailyChart = ({ daily }: { daily: DailyData[] }) => {
  if (daily.length === 0) return <p style={{ fontSize: 13, color: 'var(--stone)' }}>해당 기간 데이터가 없습니다.</p>;
  const maxSales = Math.max(...daily.map(d => d.sales), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 180, padding: '0 4px', minWidth: daily.length * 20 }}>
        {daily.map(d => (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 16 }}>
            <div
              style={{
                width: '100%', maxWidth: 40,
                height: Math.max(4, (d.sales / maxSales) * 150),
                background: d.cancels > 0 ? 'var(--critical)' : 'var(--primary)',
                borderRadius: '4px 4px 0 0',
                opacity: 0.8,
              }}
              title={`${d.date}: ${d.sales.toLocaleString()}원 (${d.orders}건${d.cancels > 0 ? `, 취소 ${d.cancels}건` : ''})`}
            />
            <span style={{ fontSize: 9, color: 'var(--stone)', marginTop: 4, writingMode: 'vertical-rl', whiteSpace: 'nowrap', height: 28 }}>
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductTable = ({ data }: { data: ProductData[] }) => {
  if (data.length === 0) return <p style={{ fontSize: 13, color: 'var(--stone)' }}>데이터가 없습니다.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--hairline)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>상품</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>주문</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>매출</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>취소</th>
          </tr>
        </thead>
        <tbody>
          {data.map(p => (
            <tr key={p.productId || 'none'} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
              <td style={{ padding: '8px 12px' }}>{p.productName}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{p.orders}건</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatKRW(p.sales)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: p.cancels > 0 ? 'var(--critical)' : 'inherit' }}>
                {p.cancels > 0 ? `${p.cancels}건 (${formatKRW(p.cancelAmount)})` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CreatorTable = ({ data }: { data: CreatorData[] }) => {
  if (data.length === 0) return <p style={{ fontSize: 13, color: 'var(--stone)' }}>데이터가 없습니다.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--hairline)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>크리에이터</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>주문</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>매출</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>수수료</th>
          </tr>
        </thead>
        <tbody>
          {data.map(c => (
            <tr key={c.creatorId || 'none'} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
              <td style={{ padding: '8px 12px' }}>{c.creatorName}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{c.orders}건</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatKRW(c.sales)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--primary)' }}>{formatKRW(c.commission)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cafe24Connected, setCafe24Connected] = useState(false);
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateRange = useCallback(() => {
    if (period === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd };
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }, [period, customStart, customEnd]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const [analyticsRes, statusRes] = await Promise.all([
        getAnalytics(start, end),
        getIntegrationStatus(),
      ]);
      if (analyticsRes.data) setData(analyticsRes.data);
      if (statusRes.data) setCafe24Connected(statusRes.data.cafe24.connected);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try { await syncCafe24Orders(); await loadData(); } catch { /* silent */ } finally { setSyncing(false); }
  };

  const periodOptions: { key: Period; label: string }[] = [
    { key: '7d', label: '7일' },
    { key: '30d', label: '30일' },
    { key: '90d', label: '90일' },
    { key: 'custom', label: '직접 선택' },
  ];

  const s = data?.summary;

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>매출 분석</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {periodOptions.map(opt => (
            <button
              key={opt.key}
              className={`pill-tab ${period === opt.key ? 'pill-tab-active' : ''}`}
              onClick={() => setPeriod(opt.key)}
              style={{ fontSize: 12 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" className="input-field" style={{ width: 160 }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
          <span style={{ color: 'var(--stone)' }}>~</span>
          <input type="date" className="input-field" style={{ width: 160 }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
        </div>
      )}

      {!cafe24Connected && (
        <div className="card" style={{ padding: 24, marginBottom: 24, border: '2px dashed var(--hairline)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>카페24 연동 필요</h3>
          <p style={{ fontSize: 13, color: 'var(--steel)', lineHeight: 1.6, marginBottom: 16 }}>
            실제 주문 데이터를 불러오려면 카페24 자사몰 연동이 필요합니다.
          </p>
          <ol style={{ fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 16 }}>
            <li>카페24 개발자센터에서 앱 등록</li>
            <li>필요 권한: <code style={{ background: 'var(--surface-soft)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>mall.read_order</code>, <code style={{ background: 'var(--surface-soft)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>mall.read_product</code></li>
            <li>환경 변수 설정: CAFE24_MALL_ID, CAFE24_CLIENT_ID, CAFE24_CLIENT_SECRET</li>
            <li>관리자 &rarr; 연동 메뉴에서 OAuth 인증 완료</li>
          </ol>
          <p style={{ fontSize: 12, color: 'var(--stone)' }}>
            현재 표시되는 데이터는 테스트 주문 데이터입니다. 카페24 연동 후 실제 매출 데이터로 교체됩니다.
          </p>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><p>데이터 로딩 중...</p></div>
      ) : !s ? (
        <div className="empty-state"><p>분석 데이터를 불러올 수 없습니다.</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
            <StatCard label="총 주문" value={`${s.totalOrders}건`} />
            <StatCard label="총 매출" value={formatKRW(s.totalSales)} />
            <StatCard label="확정 매출" value={formatKRW(s.confirmedSales)} />
            <StatCard label="취소 금액" value={formatKRW(s.cancelledAmount)} />
            <StatCard label="환불 금액" value={formatKRW(s.refundedAmount)} />
            <StatCard label="수수료 합계" value={formatKRW(s.totalCommission)} />
            <StatCard label="귀속 주문" value={`${s.attributedOrders}건`} sub={s.unattributedOrders > 0 ? `미귀속 ${s.unattributedOrders}건` : undefined} />
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>일별 매출</h3>
            <DailyChart daily={data!.daily} />
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>상품별 매출</h3>
            <ProductTable data={data!.byProduct} />
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>크리에이터별 매출</h3>
            <CreatorTable data={data!.byCreator} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>카페24 연동 상태</h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13 }}>
                상태: <strong style={{ color: data!.cafe24Status.connected ? 'var(--success)' : 'var(--critical)' }}>
                  {data!.cafe24Status.connected ? '연동됨' : '미연동'}
                </strong>
              </span>
              {data!.cafe24Status.lastSync && (
                <span style={{ fontSize: 12, color: 'var(--stone)' }}>
                  마지막 동기화: {new Date(data!.cafe24Status.lastSync).toLocaleString('ko-KR')}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--stone)' }}>
                동기화된 주문: {data!.cafe24Status.totalSyncedOrders}건
              </span>
            </div>
            {cafe24Connected && (
              <button className="btn-ghost btn-small" onClick={handleSync} disabled={syncing}>
                {syncing ? '동기화 중...' : '주문 동기화'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
