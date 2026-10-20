import ProductImage from '../components/ProductImage';
import { getProducts } from '../store/data';
import { useState } from 'react';

interface LandingPageProps {
  onApply: () => void;
}

const FAQ_ITEMS = [
  {
    q: '어떤 채널에서 활동할 수 있나요?',
    a: '유튜브, 인스타그램, 틱톡, 네이버 블로그, 오늘의집 등 다양한 채널에서 활동하실 수 있습니다.',
  },
  {
    q: '수수료는 어떻게 계산되나요?',
    a: '상품별로 수수료율이 정해져 있으며, 고객이 크리에이터의 링크를 통해 구매를 확정하면 판매 금액의 일정 비율이 수수료로 지급됩니다.',
  },
  {
    q: '마이크로 인플루언서도 참여할 수 있나요?',
    a: '네, 팔로워 수와 관계없이 가구·인테리어에 관심 있는 크리에이터라면 누구나 신청하실 수 있습니다.',
  },
  {
    q: '정산은 언제 이루어지나요?',
    a: '구매 확정 후 정산 심사를 거쳐 월 단위로 지급됩니다. 정산 현황은 크리에이터 대시보드에서 확인하실 수 있습니다.',
  },
];

export default function LandingPage({ onApply }: LandingPageProps) {
  const products = getProducts();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--surface-soft) 0%, #e8edf2 100%)',
        padding: '80px 16px 64px',
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 48,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 400px', maxWidth: 560 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>
              홈앤힐 · 쉬어 크리에이터 파트너스
            </p>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 700,
              lineHeight: 1.2,
              color: 'var(--ink-deep)',
              marginBottom: 16,
            }}>
              콘텐츠로 좋아하는 제품을<br />소개하고 수익을 만들어보세요
            </h1>
            <p style={{ fontSize: 17, color: 'var(--charcoal)', marginBottom: 32, lineHeight: 1.6 }}>
              홈앤힐·쉬어의 가구와 리빙 제품을 여러분의 채널에서 소개하고,
              판매가 이루어질 때마다 수수료를 받으세요.
              유튜브, 인스타그램, 틱톡, 블로그, 오늘의집까지 모든 채널에서 참여할 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={onApply}>
                크리에이터로 참여하기
              </button>
              <a href="#how-it-works" className="btn-secondary" style={{ textDecoration: 'none' }}>
                프로그램 알아보기
              </a>
            </div>
          </div>
          <div style={{
            flex: '1 1 300px',
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
          }}>
            <ProductImage name="포미 리프트업 침대" infoReady={true} size={180} rounded="var(--rounded-xxxl)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ProductImage name="휴고 플립" infoReady={true} size={120} rounded="var(--rounded-xxl)" />
              <ProductImage name="리클라이너 소파" infoReady={false} size={120} rounded="var(--rounded-xxl)" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '80px 16px' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, textAlign: 'center', marginBottom: 48 }}>
            참여 방법
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24,
          }}>
            {[
              { step: '01', title: '신청', desc: '간단한 정보를 입력하고 크리에이터로 신청합니다.' },
              { step: '02', title: '승인', desc: '운영팀의 검토 후 크리에이터 자격이 부여됩니다.' },
              { step: '03', title: '링크 발급', desc: '홍보할 상품과 채널을 선택해 나만의 링크를 만듭니다.' },
              { step: '04', title: '수익 창출', desc: '링크를 통한 구매가 확정되면 수수료가 지급됩니다.' },
            ].map(item => (
              <div key={item.step} className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--ink-deep)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 16,
                  fontWeight: 700,
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission */}
      <section style={{ background: 'var(--surface-soft)', padding: '64px 16px' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, marginBottom: 16 }}>
            수익 구조
          </h2>
          <p style={{ fontSize: 16, color: 'var(--charcoal)', marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
            상품별로 4~6%의 수수료율이 적용됩니다. 구매 확정 시 수수료가 확정되며,
            취소·반품 시에는 수수료가 발생하지 않습니다.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div className="stat-card" style={{ minWidth: 140 }}>
              <div className="stat-label">기본 수수료율</div>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>4~6%</div>
              <div className="stat-sub">상품별 차등 적용</div>
            </div>
            <div className="stat-card" style={{ minWidth: 140 }}>
              <div className="stat-label">정산 주기</div>
              <div className="stat-value">월 1회</div>
              <div className="stat-sub">구매 확정 기준</div>
            </div>
            <div className="stat-card" style={{ minWidth: 140 }}>
              <div className="stat-label">최소 참여 조건</div>
              <div className="stat-value">없음</div>
              <div className="stat-sub">누구나 신청 가능</div>
            </div>
          </div>
          <p className="text-test-data" style={{ marginTop: 16 }}>
            ※ 수수료율과 정산 조건은 테스트 예시이며, 실제 판매 조건이 아닙니다.
          </p>
        </div>
      </section>

      {/* Products */}
      <section style={{ padding: '80px 16px' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, textAlign: 'center', marginBottom: 48 }}>
            참여 가능한 상품
          </h2>
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
                  padding: '32px 24px',
                }}>
                  <ProductImage name={p.name} infoReady={p.infoReady} size={140} rounded="var(--rounded-xxl)" />
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{p.name}</h3>
                  {p.infoReady ? (
                    <>
                      <p style={{ fontSize: 14, color: 'var(--charcoal)', marginBottom: 8, lineHeight: 1.5 }}>{p.description}</p>
                      <p style={{ fontSize: 14, color: 'var(--steel)' }}>
                        예시 수수료율: <strong style={{ color: 'var(--primary)' }}>{(p.commissionRate * 100).toFixed(0)}%</strong>
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: 14, color: 'var(--stone)', fontStyle: 'italic' }}>
                      제품 정보 준비 중
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-test-data" style={{ textAlign: 'center', marginTop: 16 }}>
            ※ 가격과 수수료율은 테스트 예시이며, 실제 판매 조건이 아닙니다.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: 'var(--surface-soft)', padding: '64px 16px' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>
            자주 묻는 질문
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 24px',
                    textAlign: 'left',
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--ink-deep)',
                    background: 'none',
                    border: 'none',
                  }}
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <span style={{
                    color: 'var(--steel)',
                    fontSize: 18,
                    transform: openFaq === i ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}>
                    ▾
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{
                    padding: '0 24px 18px',
                    fontSize: 15,
                    color: 'var(--charcoal)',
                    lineHeight: 1.6,
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 16px', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, marginBottom: 16 }}>
            지금 크리에이터로 시작하세요
          </h2>
          <p style={{ fontSize: 16, color: 'var(--charcoal)', marginBottom: 32 }}>
            여러분의 채널에서 홈앤힐·쉬어 제품을 소개하고 수익을 만들어보세요.
          </p>
          <button className="btn-primary" onClick={onApply} style={{ fontSize: 16, padding: '16px 40px' }}>
            크리에이터 신청하기
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--hairline-soft)',
        padding: '32px 16px',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--stone)',
      }}>
        <span className="text-test-data" style={{ marginRight: 8 }}>테스트 데이터</span>
        홈앤힐 · 쉬어 크리에이터 파트너스 — 테스트 MVP (실제 서비스 아님)
      </footer>
    </div>
  );
}
