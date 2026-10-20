# 카페24 자사몰 연동 가이드

## 1. 카페24 개발자센터 앱 등록

1. [카페24 개발자센터](https://developers.cafe24.com/) 로그인
2. **앱 관리** → **앱 등록**
3. 앱 정보 입력:
   - 앱 이름: `홈앤힐 쉬어 파트너스`
   - 리다이렉트 URI: `{SITE_URL}/api/admin/integrations/cafe24/callback`
4. **필요 권한(Scope)**:
   - `mall.read_order` — 주문 조회
   - `mall.read_product` — 상품 조회
5. 발급된 **Client ID**와 **Client Secret** 기록

## 2. 환경 변수 설정

`.env` 파일 또는 호스팅 환경 변수에 아래 값을 설정합니다.

```
CAFE24_MALL_ID=your-mall-id
CAFE24_CLIENT_ID=your-client-id
CAFE24_CLIENT_SECRET=your-client-secret
SITE_URL=https://your-domain.com
```

| 변수 | 설명 | 예시 |
|------|------|------|
| `CAFE24_MALL_ID` | 카페24 쇼핑몰 ID | `myshop` |
| `CAFE24_CLIENT_ID` | 개발자센터에서 발급받은 클라이언트 ID | `AbCdEf...` |
| `CAFE24_CLIENT_SECRET` | 개발자센터에서 발급받은 시크릿 키 | `xYz123...` |
| `SITE_URL` | 서비스 도메인 (프로토콜 포함) | `https://creator.hnhs.co` |
| `ATTRIBUTION_WINDOW_DAYS` | 클릭→주문 귀속 윈도우 일수 (기본: 30) | `30` |

## 3. OAuth 인증 플로우

1. 관리자 페이지 → **연동** 메뉴 진입
2. **카페24 연동** 섹션에서 "연동하기" 클릭
3. 카페24 OAuth 인증 페이지로 리디렉션
4. 권한 승인 → 콜백 URL로 인증 코드 전달
5. 서버가 인증 코드를 access_token/refresh_token으로 교환
6. 토큰은 서버 DB(`settings` 테이블)에 암호화 저장

## 4. 웹훅 설정

카페24 개발자센터에서 웹훅을 등록합니다:

- **웹훅 URL**: `{SITE_URL}/api/admin/integrations/cafe24/webhook`
- **이벤트**: 주문 생성, 주문 상태 변경, 취소, 환불
- **시크릿**: 카페24에서 발급하는 웹훅 서명 검증용 시크릿

웹훅 수신 시 HMAC-SHA256 서명을 검증한 뒤 처리합니다.

## 5. 주문 동기화

### 자동 동기화
- 웹훅으로 실시간 주문 이벤트 수신
- 중복 방지: `cafe24_order_id` UNIQUE 제약

### 수동 동기화
- 관리자 → 매출분석 → "주문 동기화" 버튼
- 기간 지정 가능 (기본: 최근 30일)
- 웹훅 누락분 보정 용도

### 주문 귀속(Attribution)
1. **tracking_code 매칭**: 주문의 tracking_code가 크리에이터 링크 코드와 일치하면 귀속
2. **클릭 윈도우 매칭**: tracking_code가 없으면, 주문 상품의 cafe24 상품번호로 최근 클릭 기록 조회 (ATTRIBUTION_WINDOW_DAYS 이내)
3. **수동 귀속**: 관리자가 직접 귀속 설정 가능

귀속 유형은 `attribution_type` 필드에 기록됩니다: `tracking_code`, `click_window`, `manual`, `none`

## 6. 데이터 저장 구조

| 테이블 | 용도 |
|--------|------|
| `orders` | 주문 데이터 (cafe24 연동 필드 포함) |
| `cafe24_order_events` | 카페24 웹훅 원본 이벤트 로그 |
| `clicks` | 크리에이터 링크 클릭 기록 |
| `settings` | 카페24 OAuth 토큰, 동기화 시각 등 |

## 7. 보안 유의사항

- 카페24 API 토큰은 서버 DB에만 저장되며, API 응답에 포함되지 않습니다.
- 클라이언트 시크릿은 환경 변수에서만 읽으며, 로그에 출력하지 않습니다.
- 웹훅은 서명 검증 후에만 처리합니다.
- 카페24 상품 비밀 코드와 링크는 브라우저에 노출되지 않습니다.
- 리디렉션(링크 클릭 → 카페24 상품 페이지)은 서버에서 처리합니다.

## 8. 배포 체크리스트

- [ ] 환경 변수 설정 완료 (CAFE24_MALL_ID, CAFE24_CLIENT_ID, CAFE24_CLIENT_SECRET)
- [ ] SITE_URL이 실제 운영 도메인으로 설정됨
- [ ] 카페24 개발자센터에서 리다이렉트 URI 등록 완료
- [ ] 카페24 웹훅 URL 등록 완료
- [ ] OAuth 인증 완료 (관리자 → 연동 메뉴)
- [ ] 주문 동기화 테스트 완료
- [ ] SSL/HTTPS 적용 완료 (웹훅 수신 필수)
