"use client";

import { useState } from "react";
import { BuildingPicker, getWorkplaceBuilding } from "./workplace-locations";
import type { BuildingId } from "./workplace-locations";

type BudgetCategory = {
  id: string;
  name: string;
  owner: string;
  budget: number;
  actual: number;
  committed: number;
};

const pangyoBudget: BudgetCategory[] = [
  { id: "lease", name: "임차·관리비", owner: "Workplace 운영", budget: 5.6, actual: 3.3, committed: 1.2 },
  { id: "facility", name: "시설·유지보수", owner: "시설 운영", budget: 2.4, actual: 1.4, committed: 0.4 },
  { id: "oa", name: "OA·IT 자산", owner: "OA 자산관리", budget: 2.1, actual: 1.1, committed: 0.3 },
  { id: "welfare", name: "복리후생·주차", owner: "총무 운영", budget: 1.2, actual: 0.7, committed: 0.1 },
  { id: "project", name: "확장·이전 프로젝트", owner: "Workplace 기획", budget: 0.7, actual: 0.3, committed: 0.1 },
];

const budgetRequests = [
  { id: "BR-2026-087", type: "OA·IT", title: "디자인팀 모니터 신규 구매", amount: "2,400만원", costCenter: "IT-2100", status: "예산 검토" },
  { id: "BR-2026-084", type: "시설", title: "14층 냉난방 개선 작업", amount: "1,200만원", costCenter: "FM-3300", status: "승인 대기" },
  { id: "BR-2026-079", type: "공간", title: "신규 좌석 가구 도입", amount: "8,500만원", costCenter: "WP-4100", status: "예산 확보" },
];

export const costSignals = [
  { id: "편의점 운영비", owner: "복리후생 운영", source: "ERP·편의점 비용 모니터링", amount: "18,400,000원", baseline: "15,600,000원", change: "+18%", notable: true },
  { id: "공용부 전력비", owner: "시설 운영", source: "ERP·Green Metrics", amount: "32,800,000원", baseline: "31,400,000원", change: "+4%", notable: false },
];

export const contractReviewCount = 4;

export function getBudgetOverview() {
  const totals = pangyoBudget.reduce((sum, item) => ({
    budget: sum.budget + item.budget,
    actual: sum.actual + item.actual,
    committed: sum.committed + item.committed,
  }), { budget: 0, actual: 0, committed: 0 });
  return { ...totals, available: totals.budget - totals.actual - totals.committed };
}

function budgetRequestTone(status: string) {
  if (status === "예산 확보") return "secured";
  if (status === "승인 대기") return "approval";
  return "review";
}

function BudgetGlyph({ name }: { name: "wallet" | "check" | "link" }) {
  const content = {
    wallet: <><path d="M4 6.5h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h12"/><path d="M16 11h6v4h-6a2 2 0 0 1 0-4Z"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>,
  }[name];
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{content}</svg>;
}

function billionWon(value: number) {
  return `${value.toFixed(1)}억원`;
}

export function BudgetAdminScreen() {
  const [buildingId, setBuildingId] = useState<BuildingId>("pangyo");
  const [year, setYear] = useState("2026");
  const [tab, setTab] = useState<"budget" | "contract">("budget");
  const categories = buildingId === "pangyo" && year === "2026" ? pangyoBudget : [];
  const totals = categories.reduce((sum, item) => ({
    budget: sum.budget + item.budget,
    actual: sum.actual + item.actual,
    committed: sum.committed + item.committed,
  }), { budget: 0, actual: 0, committed: 0 });
  const available = totals.budget - totals.actual - totals.committed;
  const actualRate = totals.budget ? Math.round((totals.actual / totals.budget) * 100) : 0;
  const exposureRate = totals.budget ? Math.round(((totals.actual + totals.committed) / totals.budget) * 100) : 0;

  return (
    <main className="screen budget-admin-screen">
      <section className="budget-admin-intro">
        <div><p className="eyebrow">COST &amp; CONTRACT</p><h1>비용·계약 관리</h1><p>업무 요청·예산·집행·계약 갱신을 연결하되 회계 원장은 ERP에 유지합니다.</p></div>
        <label><span>회계연도</span><select value={year} onChange={(event) => setYear(event.target.value)}><option>2026</option><option>2025</option></select></label>
      </section>

      <BuildingPicker value={buildingId} label="예산 건물" onChange={setBuildingId} />
      <p className="budget-poc-note">현재 금액은 POC 예시 데이터이며, 실제 운영에서는 ERP의 승인예산·발주·전표 값을 읽어옵니다.</p>

      <div className="segment-control budget-tab-control">
        <button type="button" className={tab === "budget" ? "selected" : ""} onClick={() => setTab("budget")}>예산·비용</button>
        <button type="button" className={tab === "contract" ? "selected" : ""} onClick={() => setTab("contract")}>계약</button>
      </div>

      {tab === "contract" ? (
        <section className="budget-empty-state">
          <span><BudgetGlyph name="link" /></span>
          <h2>계약 관리는 준비 중이에요</h2>
          <p>계약 갱신 D-90/D-60/D-30/D-7 알림은 운영 백엔드 연동 이후 이 탭에서 제공됩니다.</p>
        </section>
      ) : categories.length === 0 ? (
        <section className="budget-empty-state">
          <span><BudgetGlyph name="wallet" /></span>
          <h2>{getWorkplaceBuilding(buildingId).name} {year} 예산 미등록</h2>
          <p>건물 개설 프로젝트와 비용센터를 연결하면 승인예산·발주약정·실제집행을 이 화면에서 확인할 수 있어요.</p>
          <button>예산 연동 설정</button>
        </section>
      ) : <>
        <section className="budget-kpi-grid">
          <article><span>승인 예산</span><b>{billionWon(totals.budget)}</b><small>{year} 회계연도</small></article>
          <article><span>실제 집행</span><b>{billionWon(totals.actual)}</b><small>{actualRate}% 사용</small></article>
          <article><span>발주·약정</span><b>{billionWon(totals.committed)}</b><small>아직 미지급</small></article>
          <article className="available"><span>가용 잔액</span><b>{billionWon(available)}</b><small>요청 가능 금액</small></article>
        </section>

        <section className="budget-utilization-card">
          <div className="budget-utilization-top"><span><small>집행 + 약정 기준</small><b>예산 노출도 {exposureRate}%</b></span><em>{exposureRate < 80 ? "정상" : "주의"}</em></div>
          <div className="budget-master-bar"><span style={{ width: `${actualRate}%` }} /><em style={{ left: `${actualRate}%`, width: `${Math.max(0, exposureRate - actualRate)}%` }} /></div>
          <div className="budget-bar-legend"><span className="actual">실제 집행 {actualRate}%</span><span className="commit">발주·약정 {exposureRate - actualRate}%</span><span className="remain">잔여 {100 - exposureRate}%</span></div>
        </section>

        <section className="budget-section-heading"><div><p className="eyebrow">COST SIGNAL</p><h2>비용 이상 신호</h2></div><span>{costSignals.length}개</span></section>
        <div className="budget-cost-signal-list">
          {costSignals.map((signal) => (
            <article key={signal.id} className={`budget-cost-signal-card${signal.notable ? " notable" : ""}`}>
              <div className="budget-cost-signal-top"><small>{signal.owner}</small><em>{signal.change}</em></div>
              <b>{signal.id}</b>
              <small className="budget-cost-signal-source">{signal.source}</small>
              <div className="budget-cost-signal-amounts"><b>{signal.amount}</b><small>기준 {signal.baseline}</small></div>
            </article>
          ))}
        </div>

        <section className="budget-section-heading"><div><p className="eyebrow">BY CATEGORY</p><h2>항목별 예산 현황</h2></div><button>상세 보고서</button></section>
        <div className="budget-category-list">
          {categories.map((item) => {
            const used = Math.round((item.actual / item.budget) * 100);
            const committed = Math.round((item.committed / item.budget) * 100);
            const remaining = item.budget - item.actual - item.committed;
            return <article key={item.id}>
              <div className="budget-category-top"><span><b>{item.name}</b><small>{item.owner}</small></span><em>{billionWon(remaining)} 남음</em></div>
              <div className="budget-category-bar"><span style={{ width: `${used}%` }} /><em style={{ left: `${used}%`, width: `${committed}%` }} /></div>
              <dl><div><dt>예산</dt><dd>{billionWon(item.budget)}</dd></div><div><dt>집행</dt><dd>{billionWon(item.actual)}</dd></div><div><dt>약정</dt><dd>{billionWon(item.committed)}</dd></div></dl>
            </article>;
          })}
        </div>

        <section className="budget-section-heading request-heading"><div><p className="eyebrow">CONNECTED REQUESTS</p><h2>예산 검토 업무</h2></div><span>{budgetRequests.length}건</span></section>
        <div className="budget-request-list">
          {budgetRequests.map((request) => <article key={request.id}>
            <div className="budget-request-top"><span>{request.type}</span><em className={budgetRequestTone(request.status)}>{request.status}</em></div>
            <h3>{request.title}</h3>
            <p><b>{request.amount}</b><span>{request.costCenter} · {request.id}</span></p>
            <button>요청·승인 내역 보기</button>
          </article>)}
        </div>

        <section className="budget-integration-card">
          <span><BudgetGlyph name="link" /></span>
          <div><small>INTEGRATION MODEL</small><b>회계 원장은 ERP, 이 화면은 운영 통합창구</b><p>예산원장·비용센터·발주·전표는 사내 ERP를 기준으로 두고, 이 시스템은 업무 요청과 승인 상태를 연결해 보여줍니다.</p></div>
          <ul><li><BudgetGlyph name="check" /><span>예산원장·비용센터</span><em>ERP</em></li><li><BudgetGlyph name="check" /><span>구매·발주 약정</span><em>구매시스템</em></li><li><BudgetGlyph name="check" /><span>업무요청·승인</span><em>현재 포털</em></li></ul>
        </section>
      </>}
    </main>
  );
}
