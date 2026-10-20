import { useState, useEffect } from 'react';
import { getProducts } from '../api/products';
import { formatKRW } from '../types';
import type { Product } from '../types';
import ProductImage from '../components/ProductImage';

export default function CreatorProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts().then(res => { if (res.data) setProducts(res.data); }).catch(() => {});
  }, []);

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>판매 가능 상품</h1>

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
                    {p.saleStatus === 'active' && p.productUrl && (
                      <a href={p.productUrl} target="_blank" rel="noopener noreferrer"
                        className="btn-ghost" style={{ width: '100%', display: 'block', textAlign: 'center', fontSize: 13 }}>
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
