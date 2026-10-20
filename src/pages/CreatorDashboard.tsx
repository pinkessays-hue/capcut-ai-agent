import { getCreators, getLinks, getOrders, getProducts, formatKRW } from '../store/data';
import { CHANNEL_LABELS } from '../types';

interface Props {
  creatorId: string;
}

export default function CreatorDashboard({ creatorId }: Props) {
  const creators = getCreators();
  const creator = creators.find(c => c.id === creatorId);
  const links = getLinks().filter(l => l.creatorId === creatorId);
  const orders = getOrders().filter(o => o.creatorId === creatorId);

  if (!creator) {
    return <div className="container" style={{ padding: 48 }}><div className="empty-state"><p>크리에이터를 찾을 수 없습니다.</p></div></div>;
  }

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const totalOrders = orders.length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed');
  const pendingOrders = orders.filter(o => o.status === 'payment_pending');
  const conversionRate = totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(1) : '0.0';

  const totalSales = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.amount, 0);
  const confirmedCommission = confirmedOrders.reduce((s, o) => s + o.commission, 0);
  const pendingCommission = pendingOrders.reduce((s, o) => s + o.commission, 0);
  const paidAmount = orders.filter(o => o.settlementStatus === 'paid').reduce((s, o) => s + o.commission, 0);
  const awaitingSettlement = orders.filter(o => o.settlementStatus === 'pending' && o.status === 'confirmed').reduce((s, o) => s + o.commission, 0);
  const approvedSettlement = orders.filter(o => o.settlementStatus === 'approved').reduce((s, o) => s + o.commission, 0);

  const channelStats = links.reduce((acc, link) => {
    const key = link.channel;
    if (!acc[key]) acc[key] = { clicks: 0, orders: 0, sales: 0 };
    acc[key].clicks += link.clicks;
    const linkOrders = orders.filter(o => o.linkId === link.id && o.status !== 'cancelled');
    acc[key].orders += linkOrders.length;
    acc[key].sales += linkOrders.reduce((s, o) => s + o.amount, 0);
    return acc;
  }, {} as Record<string, { clicks: number; orders: number; sales: number }>);

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title" style={{ marginBottom: 4 }}>
          안녕하세요, {creator.name}님
        </h1>
        <p style={{ fontSize: 14, color: 'var(--steel)' }}>
          크리에이터 대시보드 <span className="text-test-data" style={{ marginLeft: 8 }}>테스트 데이터</span>
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <div className="stat-card">
          <div className="stat-label">총 클릭 수</div>
          <div className="stat-value">{totalClicks.toLocaleString()}</div>
          <div className="stat-sub">내 링크 전체 클릭</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">테스트 주문 수</div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-sub">귀속된 전체 주문</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">전환율</div>
          <div className="stat-value">{conversionRate}%</div>
          <div className="stat-sub">클릭 대비 주문</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">테스트 매출</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatKRW(totalSales)}</div>
          <div className="stat-sub">취소 제외 합계</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">확정 수수료</div>
          <div className="stat-value" style={{ color: 'var(--primary)', fontSize: 20 }}>{formatKRW(confirmedCommission)}</div>
          <div className="stat-sub">구매 확정분</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">예상 수수료</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatKRW(pendingCommission)}</div>
          <div className="stat-sub">결제 대기분</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">정산 대기</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatKRW(awaitingSettlement + approvedSettlement)}</div>
          <div className="stat-sub">미지급 확정 수수료</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">지급 완료</div>
          <div className="stat-value" style={{ color: 'var(--success)', fontSize: 20 }}>{formatKRW(paidAmount)}</div>
          <div className="stat-sub">지급 완료 금액</div>
        </div>
      </div>

      {Object.keys(channelStats).length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="section-subtitle">채널별 성과</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>채널</th>
                  <th style={{ textAlign: 'right' }}>클릭 수</th>
                  <th style={{ textAlign: 'right' }}>주문 수</th>
                  <th style={{ textAlign: 'right' }}>매출</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(channelStats).map(([ch, stats]) => (
                  <tr key={ch}>
                    <td><span className="badge badge-info">{CHANNEL_LABELS[ch as keyof typeof CHANNEL_LABELS]}</span></td>
                    <td style={{ textAlign: 'right' }}>{stats.clicks.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{stats.orders}</td>
                    <td style={{ textAlign: 'right' }}>{formatKRW(stats.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="section-subtitle">최근 주문</h2>
        {orders.length === 0 ? (
          <div className="empty-state"><p>아직 주문이 없습니다.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>주문일</th>
                  <th>상품</th>
                  <th>채널</th>
                  <th style={{ textAlign: 'right' }}>금액</th>
                  <th>상태</th>
                  <th style={{ textAlign: 'right' }}>수수료</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(-5).reverse().map(o => {
                  const product = getProducts().find(p => p.id === o.productId);
                  return (
                    <tr key={o.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(o.orderedAt).toLocaleDateString('ko-KR')}</td>
                      <td>{product?.name || o.productId}</td>
                      <td><span className="badge badge-info">{CHANNEL_LABELS[o.channel]}</span></td>
                      <td style={{ textAlign: 'right' }}>{formatKRW(o.amount)}</td>
                      <td>
                        <span className={`badge ${o.status === 'confirmed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-critical' : 'badge-pending'}`}>
                          {o.status === 'confirmed' ? '확정' : o.status === 'cancelled' ? '취소' : '대기'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatKRW(o.commission)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

