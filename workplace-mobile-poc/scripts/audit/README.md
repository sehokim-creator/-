# 화면 점검 스크립트

레이아웃·런타임 회귀를 잡는 스크립트입니다. Playwright는 **기본 의존성이 아닙니다** —
브라우저 다운로드가 수백 MB라서 필요할 때만 설치하도록 뺐습니다.

```bash
npm i -D playwright
npx playwright install chromium
```

## 실행

개발 서버를 먼저 띄운 상태에서 실행합니다.

```bash
npm run dev                 # 다른 터미널
npm run audit               # 15개 화면 × 1440px / 390px 레이아웃 점검
npm run audit:interact      # 컨트롤 전수 클릭 + 런타임 에러
npm run audit:interact -- 390
```

주소가 다르면 `AUDIT_URL=http://localhost:5173 npm run audit`.

## 정상인데 플래그가 뜨는 항목

전부 실제 결함이 아니라 의도된 동작입니다. 새로 뜨는 플래그만 보면 됩니다.

| 화면 | 플래그 | 이유 |
| --- | --- | --- |
| 좌석·공간 | `clipped: map-seat` | 좌석 터치 영역을 넓히는 투명한 `::before`(사방 6px)가 넘침으로 측정됩니다 |
| 운영현황 | `clipped: queue-section` | 화면 끝까지 붙이는 20px 의도된 여백입니다 |
| 비용·계약 | `blocked` 다수 | 첫 행 클릭에서 상세 모달이 열리고 그 뒤 컨트롤이 스크림에 가려집니다 |
| 좌석·공간 관리 | `blocked` 다수 | 고정 높이 목록 컨테이너 밖으로 스크롤된 행입니다 |
