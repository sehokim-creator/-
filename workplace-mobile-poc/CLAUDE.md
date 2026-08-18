# CLAUDE.md

총무(Workplace) 포털 POC. 이 파일은 새 세션이 맥락 없이도 바로 이어서 작업하도록 쓴 것입니다.

## 무엇인가

임직원용 총무 서비스 포털 + 관리자 콘솔. 화면 15개, 모바일과 데스크탑 레이아웃이 한 코드에서 갈립니다.
React 19 + Next App Router를 **vinext**(Vite 기반)로 돌리며 Cloudflare Workers를 타깃으로 합니다.

원래 다른 호스팅 플랫폼에서 개발되다 핸드오프된 저장소라, 일부 원본 설정 파일이 넘어오지 않았습니다.
자세한 목록은 `docs/DESKTOP_SETUP.md`의 "넘어오지 않은 것" 절에 있습니다.

## 실행

```bash
npm install
npm run dev          # http://localhost:3000
```

로그인 화면이 먼저 뜹니다. 아무 이메일이나 넣거나 **데모 계정으로 둘러보기**를 누르면 통과합니다.
`app/login.tsx`는 흐름만 보여주는 데모 게이트이고 실제 인증이 아닙니다 — 우회됩니다.

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | 시트 파싱·매핑 단위 테스트 6건 |
| `npm run standalone` | 서버·네트워크 없이 열리는 단일 `.html` 산출 |
| `npm run import:budget -- <파일.html>` | 예산관리 대시보드 내보내기 재수입 |
| `npm run audit` | 15개 화면 레이아웃 점검 (Playwright 필요) |
| `npm run audit:interact` | 컨트롤 전수 클릭 + 런타임 에러 |

`sites:*` 스크립트는 원본 호스팅 플랫폼용이며 `scripts/sites-env.sh`가 없어서 **동작하지 않습니다**.
지우지 않은 건 그 호스트가 어떻게 빌드했는지 기록으로 남기기 위해서입니다.

## 코드 지도

| 파일 | 내용 |
| --- | --- |
| `app/page.tsx` | 앱 셸, 좌측 2단 네비게이션, 헤더 프로필, 홈·요청·내 요청·운영현황, 요청 카탈로그 정의 |
| `app/globals.css` | 전체 스타일 8,000여 줄. 모바일 우선이고 1024px에서 데스크탑으로 갈립니다 |
| `app/seat-management.tsx` | 좌석 도면·정책·예약 (임직원용 + 관리자용) |
| `app/room-management.tsx` | 회의실 찾기·예약 |
| `app/budget-management.tsx` | 비용·계약 대시보드 |
| `app/budget-actuals.ts` | **실제 예산 데이터**. 생성 파일이므로 직접 수정하지 말고 `import:budget`을 다시 돌리세요 |
| `app/people-directory.tsx` | 구성원 지원 현황 |
| `app/oa-management.tsx` | OA 신청·반납 |
| `app/domain-roadmap.tsx` | 아직 데이터가 연결되지 않은 6개 도메인 화면 |
| `app/login.tsx` | 데모 로그인 게이트 |
| `lib/sheets-source.ts` | 구글 시트 → 앱 필드 매핑, 셀 파싱 |
| `app/api/sheets/[id]/route.ts` | 서비스 계정으로 시트를 읽는 라우트 |

## 이 프로젝트에서 지켜온 규칙

- **데이터가 없으면 만들지 않습니다.** 예산 내보내기에 `발주·약정` 필드가 없어서 그 지표를 지웠습니다.
  화면에 있는 숫자는 출처가 있거나 POC 예시임이 화면에 적혀 있어야 합니다.
- **모바일은 승인된 상태입니다.** 데스크탑 작업은 `@media (min-width: 1024px)` 안에서 하고,
  기본 규칙을 바꿨으면 390px를 다시 확인하세요. 과거에 여기서 회귀가 여러 번 났습니다.
- **상태 색은 라벨과 함께 씁니다.** 색만으로 상태를 전달하지 않습니다.
- **차트는 직접 그립니다.** 단일 `.html` 산출물이 네트워크 없이 열려야 해서 CDN 차트 라이브러리를 못 씁니다.
- **레이아웃을 바꾸면 `npm run audit`으로 확인합니다.** 예상되는 오탐 목록은 `scripts/audit/README.md`에 있습니다.

## 실제 데이터 주의

`app/budget-actuals.ts`에는 **실제 금액·거래처명·사내 품의 URL**이 들어 있습니다.
이 저장소는 비공개이며 그대로 유지해야 합니다. `npm run standalone` 산출물에도 같은 데이터가
인라인으로 들어가므로 공개 저장소나 외부에 올리면 안 됩니다.
