import { useState, useEffect } from 'react';
import { getMyLinks } from '../api/links';
import { getMyOrders } from '../api/orders';
import { getWalletSummary } from '../api/points';
import { formatKRW, formatDate, CHANNEL_LABELS, ORDER_STATUS_LABELS } from '../types';
import type { AffiliateLink, Order, ChannelType } from '../types';

export default function CreatorDashboard() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallet, setWallet] = useState({ available: 0, pending: 0, totalEarned: 0, totalSettled: 0 });

  useEffect(() => {
    getMyLinks().then(res => { if (res.data) setLinks(res.data); }).catch(() => {});
    getMyOrders().then(res => { if (res.data) setOrders(res.data); }).catch(() => {});
    getWalletSummary().then(res => { if (res.data) setWallet(res.data); }).catch(() => {});
  }, []);

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const totalSales = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.amount, 0);
  const totalCommission = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.commission, 0);
  const convRate = totalClicks > 0 ? (orders.length / totalClicks * 100).toFixed(1) : '0.0';

  const channelMap: Record<string, { clicks: number; orders: number; sales: number }> = {};
  links.forEach(l => {
    if (!channelMap[l.channel]) channelMap[l.channel] = { clicks: 0, orders: 0, sales: 0 };
    channelMap[l.channel].clicks += l.clicks;
  });
  orders.forEach(o => {
    if (!channelMap[o.channel]) channelMap[o.channel] = { clicks: 0, orders: 0, sales: 0 };
    channelMap[o.channel].orders++;
    if (o.status !== 'cancelled') channelMap[o.channel].sales += o.amount;
  });

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>크리에이터 대시보드</h1>

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card"><div className="stat-label">총 클릭</div><div className="stat-value">{totalClicks.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">주문 수</div><div className="stat-value">{orders.length}</div></div>
        <div className="stat-card"><div className="stat-label">전환율</div><div className="stat-value">{convRate}%</div></div>
        <div className="stat-card"><div className="stat-label">총 매출</div><div className="stat-value">{formatKRW(totalSales)}</div></div>
        <div className="stat-card"><div className="stat-label">총 수수료</div><div className="stat-value" style={{ color: 'var(--primary)' }}>{formatKRW(totalCommission)}</div></div>
        <div className="stat-card"><div className="stat-label">사용 가능 포인트</div><div className="stat-value" style={{ color: 'var(--success)' }}>{formatKRW(wallet.available)}</div></div>
      </div>

      {Object.keys(channelMap).length > 0 && (
        <>
          <h2 className="section-subtitle">채널별 실적</h2>
          <div className="table-wrapper" style={{ marginBottom: 32 }}>
            <table>
              <thead><tr><th>채널</th><th style={{ textAlign: 'right' }}>클릭</th><th style={{ textAlign: 'right' }}>주문</th><th style={{ textAlign: 'right' }}>매출</th></tr></thead>
              <tbody>
                {Object.entries(channelMap).map(([ch, stat]) => (
                  <tr key={ch}>
                    <td><span className="badge badge-info">{CHANNEL_LABELS[ch as ChannelType] || ch}</span></td>
                    <td style={{ textAlign: 'right' }}>{stat.clicks.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{stat.orders}</td>
                    <td style={{ textAlign: 'right' }}>{formatKRW(stat.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="section-subtitle">최근 주문</h2>
      {orders.length === 0 ? (
        <div className="empty-state"><p>주문 내역이 없습니다.</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>주문일</th><th>콘텐츠</th><th>채널</th><th style={{ textAlign: 'right' }}>금액</th><th>상태</th><th style={{ textAlign: 'right' }}>수수료</th></tr></thead>
            <tbody>
              {orders.slice(-10).reverse().map(o => (
                <tr key={o.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(o.orderedAt)}</td>
                  <td>{o.contentTitle}</td>
                  <td><span className="badge badge-info">{CHANNEL_LABELS[o.channel] || o.channel}</span></td>
                  <td style={{ textAlign: 'right' }}>{formatKRW(o.amount)}</td>
                  <td><span className={`badge ${o.status === 'confirmed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-critical' : 'badge-pending'}`}>{ORDER_STATUS_LABELS[o.status]}</span></td>
                  <td style={{ textAlign: 'right' }}>{formatKRW(o.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
