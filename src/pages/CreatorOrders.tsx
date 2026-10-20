import { getOrders, getProducts, getLinks, formatKRW, formatDate } from '../store/data';
import { CHANNEL_LABELS, ORDER_STATUS_LABELS, SETTLEMENT_STATUS_LABELS } from '../types';

interface Props {
  creatorId: string;
}

export default function CreatorOrders({ creatorId }: Props) {
  const orders = getOrders().filter(o => o.creatorId === creatorId);
  const products = getProducts();
  const links = getLinks();

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>실적 내역</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        주문별 상세 실적과 수수료 내역 <span className="text-test-data">테스트 데이터</span>
      </p>

      {orders.length === 0 ? (
        <div className="empty-state"><p>아직 귀속된 주문이 없습니다.</p></div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 12 }}>
            {orders.slice().reverse().map(o => {
              const product = products.find(p => p.id === o.productId);
              return (
                <div key={o.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{product?.name}</strong>
                    <span className={`badge ${o.status === 'confirmed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-critical' : 'badge-pending'}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--steel)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>주문일: {formatDate(o.orderedAt)}</span>
                    <span>채널: {CHANNEL_LABELS[o.channel]}</span>
                    <span>콘텐츠: {o.contentTitle}</span>
                    <span>주문 금액: {formatKRW(o.amount)}</span>
                    <span>수수료: <strong style={{ color: 'var(--primary)' }}>{formatKRW(o.commission)}</strong> ({o.status === 'payment_pending' ? '예상' : '확정'})</span>
                    <span>정산: <span className={`badge btn-small ${o.settlementStatus === 'paid' ? 'badge-success' : o.settlementStatus === 'approved' ? 'badge-info' : 'badge-pending'}`}>{SETTLEMENT_STATUS_LABELS[o.settlementStatus]}</span></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="desktop-table table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>주문일</th>
                  <th>상품</th>
                  <th>채널</th>
                  <th>콘텐츠</th>
                  <th style={{ textAlign: 'right' }}>주문 금액</th>
                  <th>주문 상태</th>
                  <th style={{ textAlign: 'right' }}>수수료</th>
                  <th>정산 상태</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice().reverse().map(o => {
                  const product = products.find(p => p.id === o.productId);
                  return (
                    <tr key={o.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(o.orderedAt)}</td>
                      <td>{product?.name}</td>
                      <td><span className="badge badge-info">{CHANNEL_LABELS[o.channel]}</span></td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.contentTitle}</td>
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
                        <span className={`badge ${o.settlementStatus === 'paid' ? 'badge-success' : o.settlementStatus === 'approved' ? 'badge-info' : 'badge-pending'}`}>
                          {SETTLEMENT_STATUS_LABELS[o.settlementStatus]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <style>{`
            @media (max-width: 767px) {
              .desktop-table { display: none !important; }
              .mobile-cards { display: flex !important; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
