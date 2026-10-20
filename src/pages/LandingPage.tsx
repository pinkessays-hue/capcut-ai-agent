import { useState, useEffect } from 'react';
import { getProducts } from '../api/products';
import { formatKRW } from '../types';
import type { Product } from '../types';
import ProductImage from '../components/ProductImage';

interface Props {
  onApply: () => void;
}

export default function LandingPage({ onApply }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    getProducts()
      .then(res => { if (res.data) setProducts(res.data); })
      .catch(() => {});
  }, []);

  const faqs = [
    { q: '누구나 참여할 수 있나요?', a: 'SNS 또는 블로그 채널을 운영 중이신 분이라면 누구나 가입 후 바로 참여하실 수 있습니다.' },
    { q: '수수료는 어떻게 받나요?', a: '구매 확정 후 포인트로 적립되며, 5,000원 이상 적립 시 등록하신 계좌로 정산 요청할 수 있습니다.' },
    { q: '링크는 어떻게 추적되나요?', a: '발급받은 개인 마케팅 링크를 통해 유입된 방문과 주문이 자동으로 추적됩니다.' },
    { q: '여러 채널에서 활동해도 되나요?', a: '네, YouTube·Instagram·TikTok·네이버 블로그·오늘의집 등 여러 채널에서 동시에 활동하실 수 있습니다.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #f0f5ff 0%, #e8f0fe 50%, #fff 100%)',
        padding: '80px 16px 64px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.3, marginBottom: 16 }}>
          홈앤힐 · 쉬어<br />크리에이터 파트너스
        </h1>
        <p style={{ fontSize: 16, color: 'var(--charcoal)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>
          프리미엄 가구를 소개하고 수수료를 받으세요.<br />
          가입 즉시 마케팅 링크가 발급됩니다.
        </p>
        <button className="btn-buy" style={{ fontSize: 16, padding: '14px 36px' }} onClick={onApply}>
          크리에이터로 참여하기
        </button>
      </section>

      {/* How it works */}
      <section className="container" style={{ padding: '64px 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 40 }}>참여 방법</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, maxWidth: 800, margin: '0 auto' }}>
          {[
            { step: '1', title: '가입', desc: '간단한 정보 입력으로 크리에이터 가입' },
            { step: '2', title: '링크 발급', desc: '판매할 상품을 선택하고 개인 링크 생성' },
            { step: '3', title: '홍보', desc: 'SNS, 블로그 등에 링크를 공유' },
            { step: '4', title: '수익', desc: '구매 확정 시 수수료 포인트 적립' },
          ].map(item => (
            <div key={item.step} className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 18, margin: '0 auto 12px',
              }}>
                {item.step}
              </div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--steel)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      {products.length > 0 && (
        <section style={{ background: 'var(--surface-soft)', padding: '64px 16px' }}>
          <div className="container">
            <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 40 }}>판매 상품</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto' }}>
              {products.map(p => (
                <div key={p.id} className="card" style={{ overflow: 'hidden' }}>
                  <ProductImage product={p} />
                  <div style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{p.name}</div>
                    {p.infoReady ? (
                      <>
                        <div style={{ fontSize: 13, color: 'var(--steel)', marginBottom: 8 }}>{p.description}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{formatKRW(p.price)}</span>
                          <span className="badge badge-info">수수료 {(p.commissionRate * 100).toFixed(0)}%</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--stone)', fontStyle: 'italic' }}>제품 정보 준비 중</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="container" style={{ padding: '64px 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>자주 묻는 질문</h2>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, i) => (
            <div key={i} className="card" style={{ overflow: 'hidden' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', padding: '16px 20px', border: 'none', background: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', fontWeight: 600, fontSize: 14, textAlign: 'left',
                }}
              >
                {faq.q}
                <span style={{ fontSize: 18, color: 'var(--stone)', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '48px 16px 80px' }}>
        <button className="btn-buy" style={{ fontSize: 16, padding: '14px 36px' }} onClick={onApply}>
          지금 시작하기
        </button>
      </section>
    </div>
  );
}
