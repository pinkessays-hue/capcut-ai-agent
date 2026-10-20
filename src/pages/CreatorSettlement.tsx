import { useState } from 'react';
import { getOrders, getProducts, formatKRW, formatDate, updateSettlementStatus } from '../store/data';
import { ORDER_STATUS_LABELS, SETTLEMENT_STATUS_LABELS } from '../types';

interface Props {
  creatorId: string;
}

export default function CreatorSettlement({ creatorId }: Props) {
  const [orders, setOrders] = useState(getOrders().filter(o => o.creatorId === creatorId));
  const products = getProducts();

  const confirmedOrders = orders.filter(o => o.status === 'confirmed');
  const pendingSettlement = confirmedOrders.filter(o => o.settlementStatus === 'pending');
  const approvedSettlement = confirmedOrders.filter(o => o.settlementStatus === 'approved');
  const paidSettlement = confirmedOrders.filter(o => o.settlementStatus === 'paid');

  const pendingAmount = pendingSettlement.reduce((s, o) => s + o.commission, 0);
  const approvedAmount = approvedSettlement.reduce((s, o) => s + o.commission, 0);
  const paidAmount = paidSettlement.reduce((s, o) => s + o.commission, 0);

  const handleRequestSettlement = (orderId: string) => {
    updateSettlementStatus(orderId, 'approved');
    setOrders(getOrders().filter(o => o.creatorId === creatorId));
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>정산</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        수수료 정산 현황 <span className="text-test-data">테스트 데이터 — 실제 송금 없음</span>
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <div className="stat-card">
          <div className="stat-label">정산 대기</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatKRW(pendingAmount)}</div>
          <div className="stat-sub">구매 확정 · 미요청</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">정산 승인</div>
          <div className="stat-value" style={{ color: 'var(--primary)', fontSize: 20 }}>{formatKRW(approvedAmount)}</div>
          <div className="stat-sub">정산 요청 · 지급 예정</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">지급 완료</div>
          <div className="stat-value" style={{ color: 'var(--success)', fontSize: 20 }}>{formatKRW(paidAmount)}</div>
          <div className="stat-sub">지급 완료 누적</div>
        </div>
      </div>

      <h2 className="section-subtitle">구매 확정 주문</h2>

      {confirmedOrders.length === 0 ? (
        <div className="empty-state"><p>구매 확정된 주문이 없습니다.</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>주문일</th>
                <th>상품</th>
                <th style={{ textAlign: 'right' }}>금액</th>
                <th style={{ textAlign: 'right' }}>수수료</th>
                <th>정산 상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {confirmedOrders.slice().reverse().map(o => {
                const product = products.find(p => p.id === o.productId);
                return (
                  <tr key={o.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(o.orderedAt)}</td>
                    <td>{product?.name}</td>
                    <td style={{ textAlign: 'right' }}>{formatKRW(o.amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatKRW(o.commission)}</td>
                    <td>
                      <span className={`badge ${o.settlementStatus === 'paid' ? 'badge-success' : o.settlementStatus === 'approved' ? 'badge-info' : 'badge-pending'}`}>
                        {SETTLEMENT_STATUS_LABELS[o.settlementStatus]}
                      </span>
                    </td>
                    <td>
                      {o.settlementStatus === 'pending' && (
                        <button
                          className="btn-ghost btn-small"
                          onClick={() => handleRequestSettlement(o.id)}
                        >
                          정산 요청
                        </button>
                      )}
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
