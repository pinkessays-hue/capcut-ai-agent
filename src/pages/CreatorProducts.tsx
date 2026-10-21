import { useState, useEffect } from 'react';
import { getProducts } from '../api/products';
import { getOrCreateLink } from '../api/links';
import { getSiteUrl } from '../api/client';
import { formatKRW } from '../types';
import type { Product } from '../types';
import ProductImage from '../components/ProductImage';

export default function CreatorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
    getSiteUrl().then(setSiteUrl).catch(() => {});
  }, []);

  const handleCopyLink = async (productId: string) => {
    setCopyingId(productId);
    setCopiedId(null);
    setErrorMsg(null);
    try {
      const res = await getOrCreateLink(productId);
      if (!res.data) throw new Error('링크 생성 실패');

      const link = res.data;
      const product = products.find(p => p.id === productId);
      const productUrl = link.productUrl || product?.productUrl;

      let utmUrl: string;
      if (productUrl) {
        const sep = productUrl.includes('?') ? '&' : '?';
        const src = encodeURIComponent(link.creatorNameEn || link.linkCode);
        const med = encodeURIComponent(link.channel || 'direct');
        utmUrl = `${productUrl}${sep}cafe_mkt=${link.linkCode}&utm_source=${src}&utm_medium=${med}&utm_campaign=${link.linkCode}`;
      } else if (siteUrl) {
        utmUrl = `${siteUrl}/r/${link.linkCode}`;
      } else {
        utmUrl = `/r/${link.linkCode}`;
      }

      await navigator.clipboard.writeText(utmUrl);
      setCopiedId(productId);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '링크 생성에 실패했습니다.');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setCopyingId(null);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>판매 가능 상품</h1>

      {copiedId && (
        <div style={{
          background: 'var(--primary-soft)',
          color: 'var(--primary)',
          padding: '12px 16px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>✓</span>
          개인 마케팅 링크가 복사됐어요
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fff0f0',
          color: 'var(--critical)',
          padding: '10px 14px',
          borderRadius: 10,
          fontSize: 13,
          marginBottom: 16,
        }}>
          {errorMsg}
        </div>
      )}

      {products.length === 0 ? (
        <div className="empty-state"><p>등록된 상품이 없습니다.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ overflow: 'hidden' }}>
              <ProductImage product={p} />
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                  {p.name}
                  {p.saleStatus !== 'active' && (
                    <span className="badge badge-pending" style={{ marginLeft: 8 }}>
                      {p.saleStatus === 'preparing' ? '준비 중' : '판매 종료'}
                    </span>
                  )}
                </div>
                {p.infoReady ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 12 }}>{p.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 700 }}>{formatKRW(p.price)}</span>
                      <span className="badge badge-info">수수료 {(p.commissionRate * 100).toFixed(0)}%</span>
                    </div>
                    {p.saleStatus === 'active' && (
                      <button
                        className="btn-buy"
                        style={{ width: '100%', fontSize: 13 }}
                        onClick={() => handleCopyLink(p.id)}
                        disabled={copyingId === p.id}
                      >
                        {copyingId === p.id ? '링크 생성 중...' : copiedId === p.id ? '복사됨!' : '링크 복사'}
                      </button>
                    )}
                    {p.saleStatus === 'active' && p.productUrl && (
                      <a href={p.productUrl} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost" style={{ width: '100%', display: 'block', textAlign: 'center', fontSize: 13, marginTop: 8 }}>
                        상품 보기
                      </a>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--stone)', fontStyle: 'italic' }}>제품 정보 준비 중</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
