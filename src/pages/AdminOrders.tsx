import { useState } from 'react';
import { getOrders, getProducts, getCreators, getLinks, updateOrderStatus, createTestOrder, formatKRW, formatDate } from '../store/data';
import { CHANNEL_LABELS, ORDER_STATUS_LABELS } from '../types';
import type { OrderStatus } from '../types';

interface Props {
  onRefresh: () => void;
}

export default function AdminOrders({ onRefresh }: Props) {
  const [orders, setOrders] = useState(getOrders());
  const [createLinkId, setCreateLinkId] = useState('');
  const products = getProducts();
  const creators = getCreators();
  const links = getLinks();

  const refreshData = () => {
    setOrders(getOrders());
    onRefresh();
  };

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    refreshData();
  };

  const handleCreateOrder = () => {
    if (!createLinkId) {
      alert('링크를 선택해주세요.');
      return;
    }
    createTestOrder(createLinkId);
    setCreateLinkId('');
    refreshData();
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>주문 관리</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        테스트 주문 조회 및 상태 관리 <span className="text-test-data">테스트 데이터</span>
      </p>

      {/* Create test order */}
      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>테스트 주문 생성</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label className="form-label">귀속 링크</label>
            <select className="select-field" value={createLinkId} onChange={e => setCreateLinkId(e.target.value)} aria-label="귀속 링크 선택">
              <option value="">선택하세요</option>
              {links.map(l => {
                const creator = creators.find(c => c.id === l.creatorId);
                const product = products.find(p => p.id === l.productId);
                return (
                  <option key={l.id} value={l.id}>
                    {creator?.name} — {product?.name} ({CHANNEL_LABELS[l.channel]}) [{l.linkCode}]
                  </option>
                );
              })}
            </select>
          </div>
          <button className="btn-buy" onClick={handleCreateOrder}>생성</button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state"><p>주문이 없습니다.</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>주문일</th>
                <th>크리에이터</th>
                <th>상품</th>
                <th>채널</th>
                <th style={{ textAlign: 'right' }}>금액</th>
                <th>주문 상태</th>
                <th style={{ textAlign: 'right' }}>수수료</th>
                <th>변경</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice().reverse().map(o => {
                const creator = creators.find(c => c.id === o.creatorId);
                const product = products.find(p => p.id === o.productId);
                return (
                  <tr key={o.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(o.orderedAt)}</td>
                    <td>{creator?.name}</td>
                    <td>{product?.name}</td>
                    <td><span className="badge badge-info">{CHANNEL_LABELS[o.channel]}</span></td>
                    <td style={{ textAlign: 'right' }}>{formatKRW(o.amount)}</td>
                    <td>
                      <span className={`badge ${o.status === 'confirmed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-critical' : 'badge-pending'}`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatKRW(o.commission)}
                      <div style={{ fontSize: 11, color: 'var(--stone)' }}>
                        {o.status === 'payment_pending' ? '(예상)' : o.status === 'confirmed' ? '(확정)' : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {o.status !== 'confirmed' && (
                          <button
                            className="btn-ghost btn-small"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleStatusChange(o.id, 'confirmed')}
                          >
                            확정
                          </button>
                        )}
                        {o.status !== 'cancelled' && (
                          <button
                            className="btn-ghost btn-small"
                            style={{ fontSize: 11, padding: '4px 10px', color: 'var(--critical)' }}
                            onClick={() => handleStatusChange(o.id, 'cancelled')}
                          >
                            취소
                          </button>
                        )}
                        {o.status !== 'payment_pending' && (
                          <button
                            className="btn-ghost btn-small"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleStatusChange(o.id, 'payment_pending')}
                          >
                            대기
                          </button>
                        )}
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
