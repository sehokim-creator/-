"use client";

/*
 * Admin domains that today live in the GA team's spreadsheets. Each entry
 * records which sheet is the current source of truth, which reference product
 * owns the pattern, and what the portal screen has to take over. These are
 * intake screens for review, not built-out modules — the POC deliberately does
 * not fake operational data for a domain it has no data contract for yet.
 *
 * Sheet titles below are demo labels rather than the team's real document
 * names, so this build can be shared outside the company. Only an internal
 * build should carry the actual titles.
 */

export type DomainKey =
  | "access"
  | "parking"
  | "welfare"
  | "asset"
  | "license"
  | "approval";

type DomainPlan = {
  title: string;
  summary: string;
  reference: string;
  owner: string;
  sheets: Array<{ name: string; note: string }>;
  scope: string[];
  depends: string;
};

export const domainPlans: Record<DomainKey, DomainPlan> = {
  access: {
    title: "출입·보안 관리",
    summary: "외부인 출입카드 대장과 지문 등록·회수를 사람과 기간 기준으로 관리합니다.",
    reference: "Envoy 방문자·현장 경험 / ServiceNow WSD Visitor Management",
    owner: "출입보안 운영",
    sheets: [
      { name: "외부 인원 출입카드 대장", note: "어시스턴트·센터관리용·외주협력사·외부감사대응·건물관리 카드" },
      { name: "지문 등록·삭제 절차 가이드", note: "지문 등록·삭제 절차 문서" },
      { name: "출입보안 설비 공사 이력", note: "공사 이력" },
    ],
    scope: [
      "카드 종류별 대장을 사람·업체·유효기간 기준으로 통합",
      "만료·미회수 카드를 운영현황 예외 항목으로 승격",
      "방문자 사전등록 → 출입 권한 → 회수까지 한 흐름으로 연결",
      "지문 등록·삭제를 요청 유형으로 만들어 문서 대신 요청으로 처리",
    ],
    depends: "방문·출입 도메인, 구성원 도메인",
  },
  parking: {
    title: "주차 관리",
    summary: "정기주차권 입차율과 주차 대기열을 함께 보고 배정 순번을 관리합니다.",
    reference: "Robin 이용률 Analytics / WSD Reservation Management(주차)",
    owner: "주차 운영 · 정산 담당",
    sheets: [
      { name: "정기주차권 입차율 리포트", note: "월별 입차율 자동 계산" },
      { name: "구성원 지원 대장", note: "주차 대기 순번" },
    ],
    scope: [
      "월별 입차율을 이용률 지표로 옮기고 잔여면 기준을 자동 계산",
      "주차 대기열을 대기 순번·배정 예정일이 보이는 목록으로 전환",
      "방문 차량 등록과 정기권 신청을 같은 자원 기준으로 묶기",
    ],
    depends: "예약 도메인, 구성원 도메인",
  },
  welfare: {
    title: "복리후생·물품 운영",
    summary: "편의점·경조사·육아용품·도서공간처럼 신청과 비용이 함께 움직이는 운영 업무입니다.",
    reference: "Freshservice Service Catalog / WSD Case Management",
    owner: "복리후생 운영 · 총무 비품 운영",
    sheets: [
      { name: "사내 편의점 운영비 모니터링", note: "운영 예산 및 데일리 사용 금액" },
      { name: "경조사 물품 발송 이력", note: "화환·화분 등 외부 발송 이력" },
      { name: "육아용품 지원 신청 현황", note: "사내 신청 현황" },
      { name: "사내 도서공간 이용 현황", note: "도서공간 운영 데이터" },
      { name: "사내 굿즈 재고 현황", note: "보유 굿즈 수량" },
      { name: "Green Metrics", note: "친환경 활동 지표" },
    ],
    scope: [
      "신청 히스토리를 서비스 카탈로그 요청 유형으로 흡수",
      "데일리 사용 금액을 비용 이상 신호와 같은 기준으로 연결",
      "재고형(굿즈·비품)과 이용형(도서공간) 지표를 분리",
    ],
    depends: "요청·Case 도메인, 물품 재고 도메인, 비용 도메인",
  },
  asset: {
    title: "자산·렌탈 관리",
    summary: "렌탈 기기와 지급 자산의 위치·계약 주기를 관리합니다. 자산 원장은 AMS가 계속 소유합니다.",
    reference: "ServiceNow WSD Maintenance Management / OnSpace 공간 정책",
    owner: "OA 자산관리 · 시설 운영",
    sheets: [
      { name: "렌탈 기기 현황", note: "정수기·방역 등 렌탈 기기 리스트 및 위치" },
      { name: "구성원 지원 대장", note: "렌탈 자산·별도 구매·업무용 휴대폰·의자 지급 대기" },
    ],
    scope: [
      "렌탈 기기를 건물·층·구역에 배치해 공간 마스터와 연결",
      "계약 주기·점검 주기를 갱신 알림 대상으로 승격",
      "의자 등 지급 대기열을 순번이 보이는 목록으로 전환",
      "자산번호·시리얼·이력은 AMS에 두고 요약만 조회",
    ],
    depends: "OA 현황(AMS) 도메인, 건물·층 도메인, 계약 도메인",
  },
  license: {
    title: "SW·라이선스 관리",
    summary: "SaaS 좌석 수와 라이선스 갱신·단가 변동을 한 화면에서 봅니다.",
    reference: "SaaS Management(SAM) / WSD Lease Administration의 갱신 모델",
    owner: "SW 중앙관리",
    sheets: [
      { name: "AI 도구 좌석 수·CAP 설정", note: "좌석 수량·CAP" },
      { name: "개발도구 라이선스 단가 변동·할인율 검토", note: "단가 변동·할인율" },
      { name: "SW 중앙관리 대시보드 구축 계획", note: "진행 중 프로젝트" },
    ],
    scope: [
      "제품별 보유 좌석·사용 좌석·CAP을 한 줄로 비교",
      "미사용 좌석을 회수 대상 예외로 승격",
      "갱신일·단가 변동을 계약 갱신 알림과 같은 기준으로 통합",
    ],
    depends: "계약 도메인, 비용 도메인, 구성원 도메인",
  },
  approval: {
    title: "승인·전결 기준",
    summary: "요청 금액과 유형에 따른 전결 단계를 마스터로 관리해 화면의 승인 단계를 여기서 결정합니다.",
    reference: "Freshservice Approval Workflow / WSD Case Management",
    owner: "법무·컴플라이언스",
    sheets: [
      { name: "직무 전결 기준", note: "직무별 전결 기준" },
      { name: "재산종합보험 갱신 비교 분석", note: "갱신 의사결정 기준 예시" },
    ],
    scope: [
      "지금 화면에 문자열로 박혀 있는 승인 단계를 전결 기준 마스터에서 계산",
      "금액 구간·요청 유형별 승인자를 표로 관리",
      "승인 이력을 요청별 감사 로그로 남기기",
    ],
    depends: "요청·Case 도메인, 구성원 도메인, 비용 도메인",
  },
};

export function DomainRoadmapScreen({ domain }: { domain: DomainKey }) {
  const plan = domainPlans[domain];

  return (
    <main className="screen domain-roadmap-screen">
      <section className="oa-admin-intro">
        <div>
          
          <h1>{plan.title}</h1>
          <p>{plan.summary}</p>
        </div>
        <span className="tag-attention">데이터 연결 예정</span>
      </section>

      <section className="oa-boundary-note poc">
        <b>이 화면의 상태</b>
        <p>
          아직 운영 데이터가 연결되지 않은 도메인입니다. 실제 수치를 임의로 만들지 않고, 현재 운영
          중인 원천과 화면으로 옮길 범위만 정리했습니다.
        </p>
      </section>

      <div className="domain-roadmap-grid">
        <section className="card domain-roadmap-card">
          <div className="section-heading"><div><h2>지금 운영 중인 원천</h2></div><small>{plan.sheets.length}개</small></div>
          <ul className="domain-sheet-list">
            {plan.sheets.map((sheet) => (
              <li key={sheet.name}>
                <b>{sheet.name}</b>
                <small>{sheet.note}</small>
              </li>
            ))}
          </ul>
          <dl className="domain-meta">
            <div><dt>담당</dt><dd>{plan.owner}</dd></div>
            <div><dt>필요 도메인</dt><dd>{plan.depends}</dd></div>
          </dl>
        </section>

        <section className="card domain-roadmap-card">
          <div className="section-heading"><div><h2>화면으로 옮길 범위</h2></div></div>
          <ol className="domain-scope-list">
            {plan.scope.map((item) => <li key={item}>{item}</li>)}
          </ol>
          <p className="domain-reference"><b>참고 레퍼런스</b>{plan.reference}</p>
        </section>
      </div>
    </main>
  );
}
