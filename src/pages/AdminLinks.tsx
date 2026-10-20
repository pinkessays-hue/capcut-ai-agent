import { useState } from 'react';
import { getLinks, getOrders, getCreators, getProducts, recordClick, createTestOrder, formatKRW, formatPercent, formatDate } from '../store/data';
import { CHANNEL_LABELS } from '../types';

interface Props {
  onRefresh: () => void;
}

export default function AdminLinks({ onRefresh }: Props) {
  const [links, setLinks] = useState(getLinks());
  const [orders, setOrders] = useState(getOrders());
  const creators = getCreators();
  const products = getProducts();

  const refreshData = () => {
    setLinks(getLinks());
    setOrders(getOrders());
    onRefresh();
  };

  const handleClick = (linkId: string) => {
    recordClick(linkId);
    refreshData();
  };

  const handleCreateOrder = (linkId: string) => {
    createTestOrder(linkId);
    refreshData();
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 4 }}>링크 관리</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        전체 제휴 링크 및 실적 <span className="text-test-data">테스트 데이터</span>
      </p>

      {links.length === 0 ? (
        <div className="empty-state"><p>발급된 링크가 없습니다.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(link => {
            const creator = creators.find(c => c.id === link.creatorId);
            const product = products.find(p => p.id === link.productId);
            const linkOrders = orders.filter(o => o.linkId === link.id);
            const sales = linkOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.amount, 0);
            const commission = linkOrders.reduce((s, o) => s + o.commission, 0);

            return (
              <div key={link.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{product?.name}</span>
                    <span className="badge badge-info" style={{ marginLeft: 8 }}>{CHANNEL_LABELS[link.channel]}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--stone)' }}>
                    {creator?.name} · {formatDate(link.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>
                  {link.contentTitle}
                </p>
                <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 4 }}>
                  링크 코드: <code style={{ background: 'var(--surface-soft)', padding: '2px 6px', borderRadius: 4 }}>{link.linkCode}</code>
                  &nbsp;· 수수료율: {formatPercent(link.commissionRateAtCreation)}
                </div>
                <div style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 13,
                  color: 'var(--steel)',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}>
                  <span>클릭 <strong style={{ color: 'var(--ink)' }}>{link.clicks}</strong></span>
                  <span>주문 <strong style={{ color: 'var(--ink)' }}>{linkOrders.length}</strong></span>
                  <span>매출 <strong style={{ color: 'var(--ink)' }}>{formatKRW(sales)}</strong></span>
                  <span>수수료 <strong style={{ color: 'var(--primary)' }}>{formatKRW(commission)}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-ghost btn-small" onClick={() => handleClick(link.id)}>
                    테스트 클릭 (+1)
                  </button>
                  <button className="btn-ghost btn-small" onClick={() => handleCreateOrder(link.id)}>
                    테스트 주문 생성
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
