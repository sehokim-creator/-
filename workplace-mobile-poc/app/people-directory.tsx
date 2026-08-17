"use client";

import { useState } from "react";

type PersonStatus = "재직" | "입사 예정" | "퇴사 예정";

type Person = {
  id: string;
  name: string;
  department: string;
  title: string;
  status: PersonStatus;
  workplace: string;
  seat: string;
  amsAssets: string;
  access: string;
  parking: string;
  oaLoan: string;
  openRequests: number;
};

const people: Person[] = [
  { id: "T10482", name: "김세호", department: "Product", title: "Product Manager", status: "재직", workplace: "지식재산센터 · 14층", seat: "14F-N-A-001", amsAssets: "2대 · 조회", access: "정상", parking: "정기권", oaLoan: "없음", openRequests: 1 },
  { id: "T11803", name: "박서연", department: "Engineering", title: "Software Engineer", status: "재직", workplace: "지식재산센터 · 15층", seat: "공유좌석", amsAssets: "2대 · 조회", access: "정상", parking: "없음", oaLoan: "iPad · D+4 지연", openRequests: 0 },
  { id: "T12041", name: "이준호", department: "Design", title: "Product Designer", status: "입사 예정", workplace: "지식재산센터 · 배정 대기", seat: "배정 대기", amsAssets: "지급 대기", access: "발급 대기", parking: "없음", oaLoan: "없음", openRequests: 0 },
  { id: "T09512", name: "최유진", department: "People", title: "People Partner", status: "퇴사 예정", workplace: "지식재산센터 · 3층", seat: "3F-A-014", amsAssets: "1대 · 반납 필요", access: "회수 예정", parking: "없음", oaLoan: "노트북 · 반납 필요", openRequests: 0 },
  { id: "T11777", name: "정하늘", department: "Sales", title: "Account Executive", status: "재직", workplace: "지식재산센터 · 17층", seat: "17F-A-022", amsAssets: "1대 · 조회", access: "정상", parking: "정기권", oaLoan: "없음", openRequests: 0 },
];

export function getPeopleOverview() {
  return {
    active: 512,
    onboarding: 8,
    offboarding: people.filter((person) => person.status === "퇴사 예정").length + 2,
    mismatches: 4,
  };
}

function personTone(status: PersonStatus) {
  if (status === "재직") return "status-완료";
  if (status === "입사 예정") return "status-접수";
  return "status-처리-중";
}

export function PeopleDirectoryScreen() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(people[0].id);
  const overview = getPeopleOverview();
  const filtered = people.filter((person) => {
    const searchable = `${person.name} ${person.id} ${person.department}`.toLowerCase();
    return !query.trim() || searchable.includes(query.toLowerCase());
  });
  const selected = people.find((person) => person.id === selectedId) ?? people[0];

  return (
    <main className="screen people-directory-screen">
      <section className="oa-admin-intro">
        <div><p className="eyebrow">구성원 지원 현황</p><h1>한 사람의 Workplace 업무를 한눈에</h1><p>구성원 한 명을 기준으로 근무지·좌석·출입·주차·OA 현황·요청을 연결해 확인하는 관리자 조회 화면입니다.</p></div>
        <span className="tag-positive">통합 조회</span>
      </section>

      <section className="oa-boundary-note"><b>이 화면의 역할</b><p>새로운 인사시스템이 아니라, HR을 기준 정보로 사용해 흩어진 Workplace 업무를 구성원별로 모아 보는 관리자 조회 화면입니다.</p></section>
      <section className="oa-boundary-note poc"><b>POC 예시 데이터</b><p>HR·GA User Management의 구조를 재현한 샘플이며 실제 인사정보가 아닙니다. 인사 원본은 변경하지 않습니다.</p></section>

      <section className="budget-kpi-grid oa-kpi-grid">
        <article><span>재직 구성원</span><b>{overview.active}<small>명</small></b><small>POC 스냅샷</small></article>
        <article><span>입사 준비</span><b>{overview.onboarding}<small>명</small></b><small>7일 이내</small></article>
        <article><span>퇴사 준비</span><b>{overview.offboarding}<small>명</small></b><small>OA 반납·권한</small></article>
        <article className="available"><span>정보 불일치</span><b>{overview.mismatches}<small>건</small></b><small>확인 필요</small></article>
      </section>

      <div className="search-field people-search">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름·사번·부서 검색" />
      </div>

      <div className="people-list">
        {filtered.map((person) => (
          <button key={person.id} className={`people-row ${selectedId === person.id ? "selected" : ""}`} onClick={() => setSelectedId(person.id)}>
            <span className="people-avatar" aria-hidden="true">{person.name[0]}</span>
            <span className="people-row-copy"><b>{person.name}</b><small>{person.department} · {person.id}</small></span>
            <span className={`status-badge ${personTone(person.status)}`}>{person.status}</span>
          </button>
        ))}
      </div>

      <section className="card people-detail-card">
        <div className="people-detail-head">
          <span className="people-avatar" aria-hidden="true">{selected.name[0]}</span>
          <span><small>{selected.id}</small><b>{selected.name}</b><em>{selected.title} · {selected.department}</em></span>
          <span className={`status-badge ${personTone(selected.status)}`}>{selected.status}</span>
        </div>
        <dl className="people-detail-grid">
          <div><dt>근무지</dt><dd>{selected.workplace}</dd></div>
          <div><dt>좌석</dt><dd>{selected.seat}</dd></div>
          <div><dt>AMS 지급 현황</dt><dd>{selected.amsAssets}</dd></div>
          <div><dt>출입</dt><dd>{selected.access}</dd></div>
          <div><dt>주차</dt><dd>{selected.parking}</dd></div>
          <div><dt>OA 대여</dt><dd>{selected.oaLoan}</dd></div>
          <div><dt>열린 요청</dt><dd>{selected.openRequests}건</dd></div>
        </dl>
        <p className="people-oa-scope-note"><b>OA 정보 범위</b><br />지급·대여 수량과 반납 필요 여부만 AMS에서 받아 표시합니다. 자산번호·시리얼·이력은 AMS에서 관리합니다.</p>
      </section>

      <DataFoundationCard />
    </main>
  );
}

export function DataFoundationCard() {
  const domains = [
    { name: "구성원", sources: 5 },
    { name: "건물·층", sources: 3 },
    { name: "좌석·공간", sources: 4 },
    { name: "요청·Case", sources: 4 },
    { name: "OA 현황(AMS)", sources: 2 },
    { name: "물품 재고", sources: 3 },
    { name: "예약", sources: 0 },
    { name: "방문·출입", sources: 1 },
    { name: "계약", sources: 1 },
    { name: "비용", sources: 5 },
  ];
  return (
    <section className="card data-foundation-card">
      <div className="section-heading"><div><p className="eyebrow">DATA FOUNDATION</p><h2>Sheet가 아닌 공통 데이터로 연결</h2></div><small>17개 Sheet → 10개 도메인</small></div>
      <div className="data-foundation-grid">
        {domains.map((domain) => (
          <div className="data-foundation-item" key={domain.name}><b>{domain.name}</b><span>{domain.sources}개 원본</span></div>
        ))}
      </div>
      <p>화면은 업무 단위로 구성하고, 각 Sheet는 원본 시스템·동기화 방향·품질 규칙을 가진 데이터 원천으로만 관리합니다.</p>
    </section>
  );
}
