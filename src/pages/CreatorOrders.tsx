import { useState, useEffect } from 'react';
import { getMyOrders } from '../api/orders';
import { formatKRW, formatDate, CHANNEL_LABELS, ORDER_STATUS_LABELS } from '../types';
import type { Order } from '../types';

export default function CreatorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    getMyOrders().then(res => { if (res.data) setOrders(res.data); }).catch(() => {});
  }, []);

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>주문 내역</h1>

      {orders.length === 0 ? (
        <div className="empty-state"><p>주문 내역이 없습니다.</p></div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.slice().reverse().map(o => (
              <div key={o.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{o.contentTitle}</span>
                  <span className={`badge ${o.status === 'confirmed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-critical' : 'badge-pending'}`}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--steel)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <span>{formatDate(o.orderedAt)}</span>
                  <span>{CHANNEL_LABELS[o.channel]}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 14 }}>
                  <span>금액: <strong>{formatKRW(o.amount)}</strong></span>
                  <span style={{ color: 'var(--primary)' }}>수수료: <strong>{formatKRW(o.commission)}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="desktop-only table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>주문일</th>
                  <th>콘텐츠</th>
                  <th>채널</th>
                  <th style={{ textAlign: 'right' }}>금액</th>
                  <th>상태</th>
                  <th style={{ textAlign: 'right' }}>수수료</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice().reverse().map(o => (
                  <tr key={o.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(o.orderedAt)}</td>
                    <td>{o.contentTitle}</td>
                    <td><span className="badge badge-info">{CHANNEL_LABELS[o.channel]}</span></td>
                    <td style={{ textAlign: 'right' }}>{formatKRW(o.amount)}</td>
                    <td>
                      <span className={`badge ${o.status === 'confirmed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-critical' : 'badge-pending'}`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{formatKRW(o.commission)}</td>
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
