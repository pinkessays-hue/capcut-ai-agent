import { useState } from 'react';
import { getOrders, getCreators, getProducts, updateSettlementStatus, formatKRW, formatDate } from '../store/data';
import { SETTLEMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from '../types';
import type { SettlementStatus } from '../types';

interface Props {
  onRefresh: () => void;
}

export default function AdminSettlement({ onRefresh }: Props) {
  const [orders, setOrders] = useState(getOrders());
  const creators = getCreators();
  const products = getProducts();

  const refreshData = () => {
    setOrders(getOrders());
    onRefresh();
  };

  const handleStatusChange = (orderId: string, status: SettlementStatus) => {
    updateSettlementStatus(orderId, status);
    refreshData();
  };

  const confirmedOrders = orders.filter(o => o.status === 'confirmed');

  const creatorSettlement = creators.map(c => {
    const co = confirmedOrders.filter(o => o.creatorId === c.id);
    return {
      creator: c,
      pending: co.filter(o => o.settlementStatus === 'pending').reduce((s, o) => s + o.commission, 0),
      approved: co.filter(o => o.settlementStatus === 'approved').reduce((s, o) => s + o.commission, 0),
      paid: co.filter(o => o.settlementStatus === 'paid').reduce((s, o) => s + o.commission, 0),
      total: co.reduce((s, o) => s + o.commission, 0),
    };
  }).filter(cs => cs.total > 0);

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>정산 관리</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        크리에이터별 수수료 정산 <span className="text-test-data">테스트 데이터 — 실제 송금 없음</span>
      </p>

      {/* Creator-level summary */}
      <h2 className="section-subtitle">크리에이터별 수수료 현황</h2>
      {creatorSettlement.length === 0 ? (
        <div className="empty-state"><p>정산 대상이 없습니다.</p></div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 32 }}>
          <table>
            <thead>
              <tr>
                <th>크리에이터</th>
                <th style={{ textAlign: 'right' }}>정산 대기</th>
                <th style={{ textAlign: 'right' }}>승인</th>
                <th style={{ textAlign: 'right' }}>지급 완료</th>
                <th style={{ textAlign: 'right' }}>합계</th>
              </tr>
            </thead>
            <tbody>
              {creatorSettlement.map(cs => (
                <tr key={cs.creator.id}>
                  <td><strong>{cs.creator.name}</strong></td>
                  <td style={{ textAlign: 'right' }}>{formatKRW(cs.pending)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{formatKRW(cs.approved)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatKRW(cs.paid)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatKRW(cs.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order-level detail */}
      <h2 className="section-subtitle">주문별 정산 상태</h2>
      {confirmedOrders.length === 0 ? (
        <div className="empty-state"><p>구매 확정된 주문이 없습니다.</p></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>크리에이터</th>
                <th>상품</th>
                <th>주문일</th>
                <th style={{ textAlign: 'right' }}>수수료</th>
                <th>정산 상태</th>
                <th>변경</th>
              </tr>
            </thead>
            <tbody>
              {confirmedOrders.slice().reverse().map(o => {
                const creator = creators.find(c => c.id === o.creatorId);
                const product = products.find(p => p.id === o.productId);
                return (
                  <tr key={o.id}>
                    <td>{creator?.name}</td>
                    <td>{product?.name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(o.orderedAt)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatKRW(o.commission)}</td>
                    <td>
                      <span className={`badge ${o.settlementStatus === 'paid' ? 'badge-success' : o.settlementStatus === 'approved' ? 'badge-info' : 'badge-pending'}`}>
                        {SETTLEMENT_STATUS_LABELS[o.settlementStatus]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {o.settlementStatus !== 'approved' && (
                          <button
                            className="btn-ghost btn-small"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleStatusChange(o.id, 'approved')}
                          >
                            승인
                          </button>
                        )}
                        {o.settlementStatus !== 'paid' && (
                          <button
                            className="btn-buy btn-small"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleStatusChange(o.id, 'paid')}
                          >
                            지급 완료
                          </button>
                        )}
                        {o.settlementStatus !== 'pending' && (
                          <button
                            className="btn-ghost btn-small"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => handleStatusChange(o.id, 'pending')}
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
