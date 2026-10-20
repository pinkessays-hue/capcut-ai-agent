import { useState, useEffect } from 'react';
import { getProducts } from '../api/products';
import { getMyLinks } from '../api/links';
import { formatPercent, formatDate, CHANNEL_LABELS } from '../types';
import type { Product, AffiliateLink } from '../types';

export default function CreatorLinks() {
  const [products, setProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = () => {
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
    getMyLinks().then(res => { if (res.data) setLinks(res.data); }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const baseUrl = window.location.origin;

  const copyLink = (code: string, id: string) => {
    navigator.clipboard.writeText(`${baseUrl}/r/${code}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>마케팅 링크</h1>

      {links.length === 0 ? (
        <div className="empty-state">
          <p>아직 발급된 링크가 없습니다.</p>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginTop: 8 }}>운영자가 승인 후 링크를 발급해드립니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(link => {
            const product = products.find(p => p.id === link.productId);
            const linkUrl = `${baseUrl}/r/${link.linkCode}`;

            return (
              <div key={link.id} className="card" style={{ padding: 16, opacity: link.active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{product?.name || '상품'}</span>
                    <span className="badge badge-info" style={{ marginLeft: 8 }}>{CHANNEL_LABELS[link.channel] || link.channel}</span>
                    {!link.active && <span className="badge badge-critical" style={{ marginLeft: 4 }}>비활성</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--stone)' }}>{formatDate(link.createdAt)}</span>
                </div>
                {link.contentTitle && <p style={{ fontSize: 13, color: 'var(--charcoal)', marginBottom: 8 }}>{link.contentTitle}</p>}
                <div style={{ fontSize: 12, color: 'var(--steel)', marginBottom: 4 }}>
                  링크: <code style={{ background: 'var(--surface-soft)', padding: '2px 6px', borderRadius: 4, fontSize: 11, wordBreak: 'break-all' }}>{linkUrl}</code>
                  &nbsp;· 수수료율: {formatPercent(link.commissionRateAtCreation)}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--steel)', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span>클릭 <strong style={{ color: 'var(--ink)' }}>{link.clicks}</strong></span>
                  <span style={{ color: 'var(--stone)' }}>주문: 연동 전</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-ghost btn-small" onClick={() => copyLink(link.linkCode, link.id)}>
                    {copiedId === link.id ? '복사됨!' : '링크 복사'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--surface-soft)', borderRadius: 10, fontSize: 13, color: 'var(--stone)' }}>
        주문 추적은 카페24 연동 후 자동으로 시작됩니다. 현재는 클릭 수만 추적됩니다.
      </div>
    </div>
  );
}
