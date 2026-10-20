import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, formatKRW, formatPercent } from '../store/data';
import ProductImage from '../components/ProductImage';

interface Props {
  creatorId: string;
  onRefresh: () => void;
}

export default function CreatorProducts({ creatorId, onRefresh }: Props) {
  const products = getProducts();
  const navigate = useNavigate();

  return (
    <div className="container" style={{ padding: '32px 16px 64px' }}>
      <h1 className="section-title">상품 둘러보기</h1>
      <p style={{ fontSize: 14, color: 'var(--steel)', marginBottom: 24 }}>
        홍보할 상품을 선택하고 링크를 발급하세요 <span className="text-test-data">테스트 데이터</span>
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
      }}>
        {products.map(p => (
          <div key={p.id} className="card card-featured" style={{
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px 16px',
            }}>
              <ProductImage name={p.name} infoReady={p.infoReady} size={140} rounded="var(--rounded-xxl)" />
            </div>
            <div style={{ padding: '0 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{p.name}</h3>
              {p.infoReady ? (
                <>
                  <p style={{ fontSize: 14, color: 'var(--charcoal)', marginBottom: 8, lineHeight: 1.5, flex: 1 }}>
                    {p.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 14, color: 'var(--steel)' }}>
                      가격: <strong>{formatKRW(p.price)}</strong>
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>
                      수수료 {formatPercent(p.commissionRate)}
                    </span>
                  </div>
                  <button
                    className="btn-buy"
                    style={{ width: '100%' }}
                    onClick={() => navigate('/creator/links', { state: { productId: p.id } })}
                  >
                    링크 발급하기
                  </button>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--stone)', fontStyle: 'italic', marginBottom: 8 }}>
                    제품 정보 준비 중
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--stone)' }}>
                    수수료율: {formatPercent(p.commissionRate)} (예시)
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-test-data" style={{ textAlign: 'center', marginTop: 16 }}>
        ※ 가격과 수수료율은 테스트 예시이며, 실제 판매 조건이 아닙니다.
      </p>
    </div>
  );
}
