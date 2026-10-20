import { useState, useEffect } from 'react';
import { getMyLinks } from '../api/links';
import { getMyOrders } from '../api/orders';
import { getWalletSummary } from '../api/points';
import { formatKRW, formatDate, CHANNEL_LABELS, ORDER_STATUS_LABELS } from '../types';
import type { AffiliateLink, Order, ChannelType } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallet, setWallet] = useState({ available: 0, pending: 0, totalEarned: 0, totalSettled: 0 });

  useEffect(() => {
    getMyLinks().then(res => { if (res.data) setLinks(res.data); }).catch(() => {});
    getMyOrders().then(res => { if (res.data) setOrders(res.data); }).catch(() => {});
    getWalletSummary().then(res => { if (res.data) setWallet(res.data); }).catch(() => {});
  }, []);

  const isPending = user?.creatorStatus === 'pending';
  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const hasRealOrders = orders.some(o => o.cafe24OrderId && !o.cafe24OrderId.startsWith('TEST-'));

  const channelMap: Record<string, { clicks: number }> = {};
  links.forEach(l => {
    if (!channelMap[l.channel]) channelMap[l.channel] = { clicks: 0 };
    channelMap[l.channel].clicks += l.clicks;
  });

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>크리에이터 대시보드</h1>

      {isPending && (
        <div style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '14px 18px', borderRadius: 12, marginBottom: 24, fontSize: 14 }}>
          신청이 접수되었습니다. 운영자 승인 후 마케팅 링크가 발급됩니다.
        </div>
      )}

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">내 링크</div>
          <div className="stat-value">{links.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">총 클릭</div>
          <div className="stat-value">{totalClicks.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">주문 현황</div>
          <div className="stat-value" style={{ fontSize: 14, color: 'var(--stone)' }}>
            {hasRealOrders ? `${orders.length}건` : '주문 연동 전'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">포인트 잔액</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{formatKRW(wallet.available)}</div>
        </div>
      </div>

      {!hasRealOrders && (
        <div style={{ background: 'var(--surface-soft)', padding: '12px 16px', borderRadius: 10, fontSize: 13, color: 'var(--stone)', marginBottom: 24 }}>
          주문·수수료 추적은 카페24 주문 연동이 완료된 후 자동으로 시작됩니다. 현재는 클릭 수만 추적됩니다.
        </div>
      )}

      {Object.keys(channelMap).length > 0 && (
        <>
          <h2 className="section-subtitle">채널별 클릭</h2>
          <div className="table-wrapper" style={{ marginBottom: 32 }}>
            <table>
              <thead><tr><th>채널</th><th style={{ textAlign: 'right' }}>클릭</th></tr></thead>
              <tbody>
                {Object.entries(channelMap).map(([ch, stat]) => (
                  <tr key={ch}>
                    <td><span className="badge badge-info">{CHANNEL_LABELS[ch as ChannelType] || ch}</span></td>
                    <td style={{ textAlign: 'right' }}>{stat.clicks.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasRealOrders && orders.length > 0 && (
        <>
          <h2 className="section-subtitle">최근 주문</h2>
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
        </>
      )}
    </div>
  );
}
