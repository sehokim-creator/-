# 데스크탑으로 옮기기

원격 세션에서 하던 작업을 세호님 PC에서 그대로 이어서 하기 위한 문서입니다.

---

## 1. 준비물

| | 필요한 것 | 확인 |
| --- | --- | --- |
| Node | **22.13 이상** (`node --experimental-strip-types`를 씁니다) | `node -v` |
| Git | 아무 최신 버전 | `git --version` |
| 셸 | **Git Bash 또는 WSL 권장** | — |

npm 스크립트는 PowerShell·cmd에서도 돌아가게 고쳐뒀습니다. 다만 `sites:*` 스크립트만 bash가
필요하고, 그건 어차피 동작하지 않는 잔재입니다(4절 참고).

## 2. 가져오기

```bash
git clone -b claude/workplace-mobile-poc-setup-prj0e8 https://github.com/sehokim-creator/-.git workplace
cd workplace/workplace-mobile-poc
npm install
npm run dev
```

`http://localhost:3000` 에서 로그인 화면이 뜹니다. **데모 계정으로 둘러보기**를 누르면 통과합니다.

바로 확인해 보실 것:

```bash
npm run typecheck    # 0개 오류여야 합니다
npm test             # 6건 통과여야 합니다
npm run standalone   # workplace-poc.html 생성 (더블클릭하면 열립니다)
```

## 3. 데이터가 온전한지 확인

예산 데이터는 커밋되어 있어 별도 이전이 필요 없습니다. 원본 대시보드와 대조한 결과입니다.

| 항목 | 원본 | 커밋본 |
| --- | --- | --- |
| 예산 항목 | 109건 | 109건 |
| 거래 내역 | 439건 | 439건 |
| 품의 연결 코드 | 25건 | 25건 |
| 품의 링크 | 67건 | 67건 |
| 예산 합계 | 6,837,680,118원 | 6,837,680,118원 |
| 집행 합계 | 2,450,274,971원 | 2,450,274,971원 |

다음 달 내보내기로 갱신할 때:

```bash
npm run import:budget -- "C:/Users/sehokim/Downloads/지영쓰_예산관리_대시보드_2026_7.html"
```

기준일은 파일명이 아니라 **가장 최근 거래일**에서 뽑습니다. 마감 개월 수가 페이싱·착지 전망 계산의
기준이라 파일명을 믿으면 안 됩니다.

## 4. 넘어오지 않은 것

이 저장소는 다른 호스팅 플랫폼에서 핸드오프된 것이고, 원본 설정 일부가 빠져 있습니다.
**전부 무해하지만 알고 계셔야 합니다.**

| 없는 파일 | 영향 | 대응 |
| --- | --- | --- |
| `scripts/sites-env.sh` | `sites:*` 스크립트 전부 실패 | 원본 호스트 전용. 로컬 개발에 불필요 |
| `postcss.config.mjs` | `globals.css`의 `@import "tailwindcss"`가 처리되지 않음 | **그대로 두세요.** 스타일은 손으로 쓴 CSS가 전부 담당하며, Tailwind를 켜면 preflight가 전체 화면을 깨뜨립니다 |
| `tsconfig.json` | 타입체크 불가였음 | 이번에 새로 만들었습니다 |
| `eslint.config.*` | `npm run lint` 실패 | 필요하면 만들어 드립니다 |
| `wrangler.jsonc` | Workers 배포 설정 없음 | 로컬 개발·단일 HTML에는 불필요 |

`tests/rendered-html.test.mjs`도 원본 호스트가 주입하던 메타태그를 검사하므로 여기서는 실패합니다.
그래서 `npm test`의 기본 경로에서 빼뒀고, 파일은 기록으로 남겨뒀습니다.

## 5. 데스크탑에서 새로 가능해지는 것

원격 세션에서 막혀 있던 것들입니다.

**로컬 파일을 그냥 읽습니다.** CSV·HTML을 첨부하지 않고 경로만 알려주면 됩니다.

**사내망이 열립니다.** `app/budget-actuals.ts`의 품의 링크(`internal.tosspayments.bz/...`)가 열립니다.

**서비스 계정 키 없이 시트를 붙여볼 수 있습니다.** 조직 정책으로 서비스 계정 키 생성이 막혀 있어도,
로컬 개발에서는 본인 계정으로 인증해 우회할 수 있습니다.

```bash
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/spreadsheets.readonly,https://www.googleapis.com/auth/cloud-platform
gcloud auth application-default set-quota-project <프로젝트ID>
```

이건 **개발용**입니다. 배포는 사람 계정에 묶으면 안 되니 결국 서비스 계정이 필요합니다.
설정 절차는 `docs/SHEETS_INTEGRATION.md`에 있습니다.

## 6. 이어서 할 일

**남아 있는 것**

1. **구매요청 시트 반영** — 공유 링크가 401이라 못 읽었습니다. CSV로 주시면 비품·소모품 폼의
   드롭다운·레이아웃을 맞추고, 안 쓰는 항목을 빼고 빠진 항목을 넣습니다.
   시트 없이도 확실한 문제 3가지는 그 대화에 정리해 뒀습니다 — 금액 미계산, 예산코드 미수집, 1건=1품목 제약.
2. **비용·계약 화면을 시트에서 읽게 연결** — `lib/sheets-source.ts`에 `budget-lines` 바인딩과
   API 라우트는 준비됐지만, 화면이 아직 `app/budget-actuals.ts`(커밋된 스냅샷)를 읽습니다.
   스냅샷을 폴백으로 두고 API를 우선하도록 바꾸면 됩니다.
3. **세부내역 시트의 탭 이름·헤더 텍스트 확정** — 지금은 가정값입니다. 실제와 다르면 그 필드가
   `null`이 되고, 응답의 `missingHeaders`에 드러납니다.
4. **SSO** — 실데이터를 붙이기 전에 필요합니다. 현재 API는 인증이 없고 로그인은 데모입니다.

**미해결로 남은 것**

- 모바일 "업무 진행 단계" 겹침 제보를 320~414px 전 구간에서 재현하지 못했습니다.
  어느 화면·어느 폭인지 확인되면 다시 볼 수 있습니다.

**데이터 미연결 화면 6개**

출입·보안 / 주차 / 복리후생·물품 / 자산·렌탈 / SW·라이선스 / 승인·전결 기준은 현재 운영 원천과
옮길 범위만 정리한 로드맵 화면입니다(`app/domain-roadmap.tsx`).

## 7. 보안

`app/budget-actuals.ts`에 **실제 금액·거래처명·사내 품의 URL**이 있습니다.

- 이 저장소는 **비공개**입니다. 그대로 유지하세요.
- `npm run standalone` 산출물에도 같은 데이터가 인라인으로 들어갑니다.
  같은 계정의 **공개** 저장소(`sehokim-creator/--2`)에 올리면 그대로 공개됩니다.
- 금액을 스케일링한 데모용 버전이 필요하면 만들어 드릴 수 있습니다.
