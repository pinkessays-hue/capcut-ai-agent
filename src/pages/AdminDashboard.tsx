import { getCreators, getLinks, getOrders, formatKRW, resetAllData } from '../store/data';
import { CHANNEL_LABELS } from '../types';
import type { ChannelType } from '../types';

export default function AdminDashboard() {
  const creators = getCreators();
  const links = getLinks();
  const orders = getOrders();

  const approvedCreators = creators.filter(c => c.status === 'approved').length;
  const pendingCreators = creators.filter(c => c.status === 'pending').length;
  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const totalOrders = orders.length;
  const activeSales = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.amount, 0);
  const confirmedCommission = orders.filter(o => o.status === 'confirmed').reduce((s, o) => s + o.commission, 0);
  const pendingSettlement = orders.filter(o => o.settlementStatus === 'pending' && o.status === 'confirmed').reduce((s, o) => s + o.commission, 0);
  const approvedSettlement = orders.filter(o => o.settlementStatus === 'approved').reduce((s, o) => s + o.commission, 0);

  const channelStats: Record<string, { clicks: number; orders: number; sales: number }> = {};
  links.forEach(link => {
    if (!channelStats[link.channel]) channelStats[link.channel] = { clicks: 0, orders: 0, sales: 0 };
    channelStats[link.channel].clicks += link.clicks;
    const lo = orders.filter(o => o.linkId === link.id && o.status !== 'cancelled');
    channelStats[link.channel].orders += lo.length;
    channelStats[link.channel].sales += lo.reduce((s, o) => s + o.amount, 0);
  });

  const handleReset = () => {
    if (confirm('모든 테스트 데이터를 초기화하시겠습니까?')) {
      resetAllData();
      window.location.reload();
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>운영자 현황</h1>
          <p style={{ fontSize: 14, color: 'var(--steel)' }}>
            전체 서비스 현황 <span className="text-test-data">테스트 데이터</span>
          </p>
        </div>
        <button className="btn-ghost btn-small" onClick={handleReset} style={{ color: 'var(--critical)' }}>
          테스트 데이터 초기화
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <div className="stat-card">
          <div className="stat-label">승인 크리에이터</div>
          <div className="stat-value">{approvedCreators}</div>
          <div className="stat-sub">심사 대기: {pendingCreators}명</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">발급 링크</div>
          <div className="stat-value">{links.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">총 클릭 수</div>
          <div className="stat-value">{totalClicks.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">테스트 주문 수</div>
          <div className="stat-value">{totalOrders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">테스트 매출</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatKRW(activeSales)}</div>
          <div className="stat-sub">취소 제외</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">확정 수수료 합계</div>
          <div className="stat-value" style={{ color: 'var(--primary)', fontSize: 20 }}>{formatKRW(confirmedCommission)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">지급 대기 수수료</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatKRW(pendingSettlement + approvedSettlement)}</div>
          <div className="stat-sub">대기 {formatKRW(pendingSettlement)} + 승인 {formatKRW(approvedSettlement)}</div>
        </div>
      </div>

      <h2 className="section-subtitle">채널별 성과</h2>
      {Object.keys(channelStats).length === 0 ? (
        <div className="empty-state"><p>채널 데이터가 없습니다.</p></div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 32 }}>
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
                  <td><span className="badge badge-info">{CHANNEL_LABELS[ch as ChannelType]}</span></td>
                  <td style={{ textAlign: 'right' }}>{stats.clicks.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{stats.orders}</td>
                  <td style={{ textAlign: 'right' }}>{formatKRW(stats.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
