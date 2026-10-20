import { useState, useEffect } from 'react';
import { getAllLinks, simulateClick, simulateOrder } from '../api/links';
import { getProducts } from '../api/products';
import { getAllCreators } from '../api/creators';
import { formatKRW, formatPercent, formatDate, CHANNEL_LABELS } from '../types';
import type { AffiliateLink, Product, Creator } from '../types';

export default function AdminLinks() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);

  const loadData = () => {
    getAllLinks().then(res => { if (res.data) setLinks(res.data); }).catch(() => {});
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
    getAllCreators().then(res => { if (res.data) setCreators(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleClick = async (id: string) => {
    await simulateClick(id).catch(() => {});
    loadData();
  };

  const handleCreateOrder = async (linkId: string) => {
    await simulateOrder(linkId).catch(() => {});
    loadData();
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>링크 관리</h1>

      {links.length === 0 ? (
        <div className="empty-state"><p>발급된 링크가 없습니다.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(link => {
            const creator = creators.find(c => c.id === link.creatorId);
            const product = products.find(p => p.id === link.productId);

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
                <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>{link.contentTitle}</p>
                <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 4 }}>
                  코드: <code style={{ background: 'var(--surface-soft)', padding: '2px 6px', borderRadius: 4 }}>{link.linkCode}</code>
                  &nbsp;· 수수료율: {formatPercent(link.commissionRateAtCreation)}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--steel)', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span>클릭 <strong style={{ color: 'var(--ink)' }}>{link.clicks}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-ghost btn-small" onClick={() => handleClick(link.id)}>테스트 클릭 (+1)</button>
                  <button className="btn-ghost btn-small" onClick={() => handleCreateOrder(link.id)}>테스트 주문 생성</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
