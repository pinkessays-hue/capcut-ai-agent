# 홈앤힐 · 쉬어 크리에이터 파트너스 — 테스트 MVP

크리에이터 제휴 커머스 관리 시스템 MVP입니다.
크리에이터가 개인 마케팅 링크를 발급받아 상품을 홍보하고, 클릭·주문·수수료·정산을 추적하는 구조입니다.

> **테스트 전용** — 실제 API, 결제, 인증, 송금 연동 없이 localStorage 기반으로 동작합니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 주요 화면

| 영역 | 경로 | 설명 |
|------|------|------|
| 랜딩 | `/` | 서비스 소개, 참여 방법, 수익 구조, FAQ |
| 지원 | `/apply` | 크리에이터 지원 신청 폼 |
| 크리에이터 대시보드 | `/creator` | 클릭·주문·수수료 현황 |
| 크리에이터 상품 | `/creator/products` | 판매 가능 상품 목록 |
| 크리에이터 링크 | `/creator/links` | 링크 발급·관리·테스트 클릭 |
| 크리에이터 주문 | `/creator/orders` | 주문 내역 확인 |
| 크리에이터 정산 | `/creator/settlement` | 정산 현황·요청 |
| 크리에이터 프로필 | `/creator/profile` | 프로필 정보 |
| 운영자 대시보드 | `/admin` | 전체 현황·데이터 초기화 |
| 운영자 크리에이터 | `/admin/creators` | 크리에이터 승인·관리 |
| 운영자 상품 | `/admin/products` | 상품 정보 수정 |
| 운영자 링크 | `/admin/links` | 링크 현황·테스트 주문 |
| 운영자 주문 | `/admin/orders` | 주문 상태 변경 |
| 운영자 정산 | `/admin/settlement` | 정산 상태 관리 |

## 테스트 방법

1. **랜딩 → 지원**: "크리에이터로 참여하기" 클릭 → 지원서 작성 → 제출
2. **크리에이터/운영자 전환**: 우측 상단 토글 버튼
3. **링크 발급**: 크리에이터 > 링크 > "+ 새 링크 발급" → 상품·채널·제목 선택 → 생성
4. **테스트 클릭**: 각 링크의 "테스트 방문 (+1 클릭)" 버튼
5. **테스트 주문**: 운영자 > 링크 > "테스트 주문 생성" 또는 운영자 > 주문에서 생성
6. **주문 상태 변경**: 운영자 > 주문 > 확정/취소/대기
7. **정산 흐름**: 운영자 > 정산 > 승인/지급 완료
8. **데이터 초기화**: 운영자 대시보드 > "테스트 데이터 초기화"

## 기술 스택

- React 18 + TypeScript + Vite
- react-router-dom (HashRouter)
- localStorage 기반 데이터 저장
- Meta Design System 원칙 적용 (자체 구현)

## 실제 연동되지 않은 부분

- 네이버 스마트스토어 API (주문/매출 연동)
- SNS 플랫폼 API (YouTube, Instagram, TikTok, Naver Blog, 오늘의집)
- 실제 계정 인증/로그인
- 실제 결제/송금
- 링크 클릭 추적 (실제로는 리다이렉트 서버 필요)
- 수수료 자동 정산/입금

## 주요 파일

```
src/
├── types/index.ts          # 타입 정의
├── store/
│   ├── data.ts             # 데이터 레이어 (localStorage CRUD)
│   └── attribution.ts      # AttributionProvider 인터페이스
├── components/
│   ├── Navbar.tsx           # 상단 내비게이션
│   └── ProductImage.tsx     # 상품 플레이스홀더 이미지
├── pages/
│   ├── LandingPage.tsx      # 랜딩 페이지
│   ├── ApplyPage.tsx        # 크리에이터 지원
│   ├── Creator*.tsx         # 크리에이터 6개 화면
│   └── Admin*.tsx           # 운영자 6개 화면
├── App.tsx                  # 라우팅 + 레이아웃
├── main.tsx                 # 엔트리포인트
└── index.css                # 글로벌 스타일
```
