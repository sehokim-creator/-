"use client";

import { useState } from "react";
import type { RequestItem } from "./page";

const monthlyCompletedCount = 43;

type PipelineStage = "신청" | "승인" | "OA 처리" | "AMS 반영";
const stages: PipelineStage[] = ["신청", "승인", "OA 처리", "AMS 반영"];

function stageIndex(request: RequestItem) {
  if (request.status === "완료") return 3;
  if (request.status === "처리 중") return 2;
  return request.approval ? 1 : 2;
}

function OaGlyph({ name }: { name: "box" | "link" }) {
  const content = {
    box: <><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>,
  }[name];
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{content}</svg>;
}

function OaCaseCard({ request, onAdvance }: { request: RequestItem; onAdvance: (request: RequestItem) => void }) {
  const current = stageIndex(request);
  return (
    <article className="oa-case-card">
      <div className="oa-case-top"><span>{request.serviceItem ?? request.category}</span><span className={`status-badge status-${request.status.replace(" ", "-")}`}>{request.status}</span></div>
      <h3>{request.title}</h3>
      <p>{request.id} · {request.updated}</p>
      <div className="oa-pipeline">
        {stages.map((stage, index) => (
          <div className={`oa-pipeline-step ${index < current ? "done" : index === current ? "current" : ""}`} key={stage}>
            <span className="oa-pipeline-dot" />
            {index < stages.length - 1 && <span className="oa-pipeline-line" />}
            <small>{stage}</small>
          </div>
        ))}
      </div>
      <div className="oa-case-assignment">
        <div><small>담당</small><b>{request.assignee}</b></div>
        <div><small>처리 기준</small><b>{request.sla}</b></div>
        <div><small>승인</small><b>{request.approval ?? "승인 없음"}</b></div>
      </div>
      <button className="oa-primary-button" onClick={() => onAdvance(request)}>
        {current === 1 ? "승인 완료·OA 접수" : current === 2 ? "완료·AMS 반영" : "처리 결과 기록·완료"}
      </button>
    </article>
  );
}

export function OaAdminScreen({ requests, onAdvance }: { requests: RequestItem[]; onAdvance: (request: RequestItem) => void }) {
  const [tab, setTab] = useState<"cases" | "ams">("cases");
  const [filter, setFilter] = useState<"전체" | "승인 대기" | "반납">("전체");
  const oaRequests = requests.filter((request) => request.category === "OA·IT" && request.status !== "완료");
  const approvalCount = oaRequests.filter((request) => Boolean(request.approval)).length;
  const returnCount = oaRequests.filter((request) => request.serviceItem === "반납").length;
  const filtered = oaRequests.filter((request) => {
    if (filter === "승인 대기") return Boolean(request.approval);
    if (filter === "반납") return request.serviceItem === "반납";
    return true;
  });

  return (
    <main className="screen oa-admin-screen">
      <section className="oa-admin-intro">
        <div><h1>OA 신청·반납 업무</h1><p>Workplace Portal에서는 신청 접수, 승인, OA 처리, 반납 완료 상태만 운영합니다.</p></div>
        <span className="tag-positive">AMS 연동</span>
      </section>

      <section className="oa-boundary-note"><b>업무 경계</b><p>자산번호·시리얼·감가·재고·이력의 원장은 AMS가 담당하고, 이 화면은 요청 흐름과 요약 현황만 다룹니다.</p></section>
      <section className="oa-boundary-note poc"><b>POC 예시 데이터</b><p>아래 수치와 요청은 화면 흐름 검증용 샘플이며 실제 AMS 데이터가 아닙니다.</p></section>

      <section className="budget-kpi-grid oa-kpi-grid">
        <article><span>처리할 요청</span><b>{oaRequests.length}<small>건</small></b><small>신청·반납</small></article>
        <article className={approvalCount > 0 ? "available" : ""}><span>승인 대기</span><b>{approvalCount}<small>건</small></b><small>팀장 확인</small></article>
        <article><span>반납 진행</span><b>{returnCount}<small>건</small></b><small>회수·확인</small></article>
        <article><span>이번 달 완료</span><b>{monthlyCompletedCount}<small>건</small></b><small>AMS 반영 포함</small></article>
      </section>

      <div className="segment-control oa-tab-control">
        <button type="button" className={tab === "cases" ? "selected" : ""} onClick={() => setTab("cases")}>신청·반납 업무</button>
        <button type="button" className={tab === "ams" ? "selected" : ""} onClick={() => setTab("ams")}>AMS 요약 현황</button>
      </div>

      {tab === "ams" ? (
        <section className="budget-empty-state">
          <span><OaGlyph name="box" /></span>
          <h2>AMS 요약 현황은 준비 중이에요</h2>
          <p>AMS 자산 원장 연동 이후 지급·대여·재고 요약을 이 탭에서 확인할 수 있어요.</p>
        </section>
      ) : (
        <>
          <div className="filter-tabs oa-filter-tabs" role="tablist">
            {(["전체", "승인 대기", "반납"] as const).map((item) => (
              <button role="tab" aria-selected={filter === item} className={filter === item ? "selected" : ""} key={item} onClick={() => setFilter(item)}>
                {item} {item === "전체" ? oaRequests.length : item === "승인 대기" ? approvalCount : returnCount}
              </button>
            ))}
          </div>
          <div className="oa-case-list">
            {filtered.map((request) => <OaCaseCard key={request.id} request={request} onAdvance={onAdvance} />)}
          </div>
        </>
      )}

      <section className="budget-integration-card">
        <span><OaGlyph name="link" /></span>
        <div><small>운영 전 연동</small><b>Portal은 요청·승인·처리 상태를, AMS는 자산 원장과 지급·반납 결과를 소유하도록 API와 감사로그를 연결해야 합니다.</b></div>
      </section>
    </main>
  );
}
