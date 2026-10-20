# 홈앤힐 · 쉬어 크리에이터 파트너스

크리에이터 제휴 커머스 관리 시스템입니다.
크리에이터가 개인 마케팅 링크를 발급받아 상품을 홍보하고, 클릭·주문·수수료·정산을 추적합니다.

## 실행 방법

```bash
npm install
npm run dev
```

백엔드(포트 3001)와 프론트엔드(포트 5173)가 동시에 시작됩니다.
브라우저에서 `http://localhost:5173` 접속하세요.

### 환경 변수 (.env)

```
JWT_SECRET=<32자 이상 랜덤 문자열>
ENCRYPTION_KEY=<64자 hex 문자열 (32바이트)>
IP_SALT=<임의 문자열>
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Cafe24 연동 (선택)
CAFE24_MALL_ID=
CAFE24_CLIENT_ID=
CAFE24_CLIENT_SECRET=
CAFE24_REDIRECT_URI=

# 지급대행사 (선택)
PAYOUT_PROVIDER=
PAYOUT_API_KEY=
PAYOUT_SECRET_KEY=
```

미설정 시 임시 키가 자동 생성되며 서버 재시작 시 기존 토큰이 무효화됩니다.

### 기본 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 운영자 | admin@hnhs.co | admin1234 |

크리에이터 계정은 회원가입(`/register`) 시 자동 생성됩니다.

## 아키텍처

```
[브라우저] ──API──▶ [Express 서버 :3001] ──▶ [SQLite DB]
                         │
                    /r/:code  ──▶ 302 리다이렉트 (카페24 비밀 URL)
                         │
                    /api/integrations/cafe24/webhook ──▶ 주문 귀속
```

- **프론트엔드**: React 18 + TypeScript + Vite
- **백엔드**: Express 5 + better-sqlite3 + JWT (bcryptjs)
- **인증**: JWT Bearer Token (sessionStorage), httpOnly 쿠키 병행
- **암호화**: AES-256-GCM (계좌번호)
- **라우팅**: BrowserRouter (react-router-dom v7)

## 주요 화면

| 영역 | 경로 | 설명 |
|------|------|------|
| 랜딩 | `/` | 서비스 소개, 상품 목록(API), FAQ |
| 로그인 | `/login` | 이메일/비밀번호 인증 |
| 회원가입 | `/register` | 크리에이터 계정 자동 생성 + 링크 자동 발급 |
| 크리에이터 대시보드 | `/creator` | 클릭·주문·수수료 현황 |
| 크리에이터 상품 | `/creator/products` | 판매 가능 상품 목록 |
| 크리에이터 링크 | `/creator/links` | 링크 발급·관리 |
| 크리에이터 주문 | `/creator/orders` | 주문 내역 확인 |
| 크리에이터 정산 | `/creator/settlement` | 정산 현황·요청 |
| 크리에이터 지갑 | `/creator/wallet` | 포인트 잔액·거래 내역 |
| 크리에이터 계좌 | `/creator/bank-account` | 계좌 등록·관리 |
| 크리에이터 프로필 | `/creator/profile` | 프로필 정보 수정 |
| 운영자 대시보드 | `/admin` | 전체 현황·테스트 데이터 초기화 |
| 운영자 크리에이터 | `/admin/creators` | 크리에이터 관리·정지 |
| 운영자 상품 | `/admin/products` | 상품 정보 수정 |
| 운영자 링크 | `/admin/links` | 링크 현황 |
| 운영자 주문 | `/admin/orders` | 주문 상태 변경 (확정→수수료 적립) |
| 운영자 정산 | `/admin/settlement` | 정산 상태 관리 |
| 운영자 연동 | `/admin/integrations` | 카페24·지급대행 연동 상태 |

## 테스트 방법

1. **회원가입**: `/register` → 정보 입력 → 크리에이터 계정 + 마케팅 링크 자동 생성
2. **링크 발급**: 크리에이터 > 링크 > "+ 새 링크 발급"
3. **테스트 클릭**: 크리에이터 > 링크 > "테스트 클릭" 버튼 (테스트 모드에서만)
4. **테스트 주문**: 운영자 > 링크 > "테스트 주문 생성" (테스트 모드에서만)
5. **주문 확정**: 운영자 > 주문 > 상태를 "확정"으로 변경 → 수수료 포인트 적립
6. **정산 요청**: 크리에이터 > 정산 > "정산 요청" (최소 5,000원)
7. **데이터 초기화**: 운영자 대시보드 > "테스트 데이터 초기화" (테스트 모드에서만)

## 보안

- 인증 토큰은 `sessionStorage`에 저장 (localStorage 사용 안 함)
- 카페24 비밀 상품 코드/URL은 관리자 API에서만 반환, 브라우저에 노출하지 않음
- `/r/:code` 리다이렉트는 서버에서 처리, 비밀 URL을 클라이언트에 전달하지 않음
- 계좌번호는 AES-256-GCM으로 암호화 저장, 화면에는 마스킹(`****1234`) 표시
- 클릭 로그의 IP는 SHA-256 해시로 익명화
- 카페24 웹훅은 HMAC 서명 검증
- 감사 로그(audit_log) 자동 기록
- API 접근 토큰/시크릿은 서버 환경 변수에서만 사용

## 프로젝트 구조

```
server/
├── index.ts              # Express 서버 진입점, /r/:code 리다이렉트
├── db.ts                 # SQLite 스키마·시드·헬퍼
├── auth.ts               # JWT 인증 미들웨어
├── routes/
│   ├── auth.ts           # 로그인/회원가입/비밀번호 변경
│   ├── products.ts       # 상품 CRUD
│   ├── links.ts          # 링크 발급·통계
│   ├── orders.ts         # 주문 관리·상태 변경
│   ├── points.ts         # 포인트 요약·원장
│   ├── settlements.ts    # 정산 요청·관리
│   ├── creators.ts       # 크리에이터 프로필·계좌·관리
│   ├── admin.ts          # 대시보드·연동 상태·감사 로그
│   └── integrations.ts   # 카페24 OAuth·웹훅·동기화
└── providers/
    ├── cafe24.ts          # Cafe24 API 클라이언트
    └── payout.ts          # 지급대행사 인터페이스

src/
├── api/                   # API 클라이언트 모듈
│   ├── client.ts          # 기본 HTTP 클라이언트 (Bearer 인증)
│   ├── auth.ts            # 인증 API
│   ├── products.ts        # 상품 API
│   ├── links.ts           # 링크 API
│   ├── orders.ts          # 주문 API
│   ├── points.ts          # 포인트 API
│   ├── settlements.ts     # 정산 API
│   ├── creators.ts        # 크리에이터 API
│   ├── admin.ts           # 관리자 API
│   └── bank.ts            # 계좌 API
├── contexts/
│   └── AuthContext.tsx     # 인증 상태 관리
├── components/
│   ├── Navbar.tsx          # 내비게이션
│   ├── ProtectedRoute.tsx  # 인증·역할 기반 라우트 가드
│   ├── TestModeBanner.tsx  # 테스트 모드 배너
│   └── ProductImage.tsx    # 상품 플레이스홀더
├── pages/
│   ├── LandingPage.tsx     # 랜딩 (API에서 상품 로드)
│   ├── LoginPage.tsx       # 로그인
│   ├── RegisterPage.tsx    # 회원가입
│   ├── Creator*.tsx        # 크리에이터 8개 화면
│   └── Admin*.tsx          # 운영자 7개 화면
├── types/index.ts          # 공유 타입
├── App.tsx                 # 라우팅
└── index.css               # 스타일
```

## DB 테이블

| 테이블 | 용도 |
|--------|------|
| users | 사용자 계정 (이메일, 해시된 비밀번호, 역할) |
| creators | 크리에이터 프로필 (채널, 카테고리, 상태) |
| products | 상품 (가격, 수수료율, 카페24 코드) |
| links | 마케팅 링크 (고유 코드, 크리에이터-상품 매핑) |
| click_logs | 클릭 로그 (IP 해시, UA, 리퍼러) |
| orders | 주문 (금액, 수수료, 상태) |
| point_ledger | 포인트 원장 (불변, credit/cancel/payout/reversal) |
| settlements | 정산 (상태, 멱등성 키, 지급 참조) |
| bank_accounts | 계좌 (암호화된 계좌번호, 인증 여부) |
| settings | 시스템 설정 (최소 정산 금액 등) |
| audit_log | 감사 로그 (변경 전/후 스냅샷) |
