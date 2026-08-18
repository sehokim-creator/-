"use client";

import { useMemo, useState } from "react";
import {
  budgetApprovals,
  budgetAsOf,
  budgetClosedMonths,
  budgetFiscalMonths,
  budgetLines,
  budgetMonthly,
  budgetTransactions,
} from "./budget-actuals";
import type { BudgetLine } from "./budget-actuals";

/*
 * 비용·계약 — laid out after the 예산관리 대시보드 it replaces.
 *
 * The structure, the card order, the risk bands, the TOP-8 comparison, the
 * numbered overrun list and the click-a-row-for-detail table are all that
 * dashboard's. Three things are deliberately not copied:
 *
 *  1. Chart.js. The standalone build has to open from a filesystem with no
 *     network, so the donut, gauge and column chart are hand-rolled SVG/CSS.
 *  2. Its 양호/여유 colours. Teal #2dd4bf against green #22c55e measures ΔE 12.3
 *     for normal vision (floor is 15) and 6.9 under tritanopia — the two "no
 *     action needed" states were nearly the same colour. Re-stepped to
 *     green/blue, which passes every check.
 *  3. Its "편성 NaN + 증액 NaN" subtitle and its percent-ordered overrun list.
 *     The export has no 편성/증액 split to show, and ordering overruns by percent
 *     puts a 0원-budget line above a 1.6억 one.
 *
 * Added, because the dashboard has a gauge labelled 추이 but no time axis at all:
 * a monthly column chart, and elapsed-time pacing on every rate.
 */

/* ------------------------------------------------------------------ format */

function won(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e8) return `${(value / 1e8).toFixed(1)}억`;
  if (abs >= 1e4) return `${Math.round(value / 1e4).toLocaleString("ko-KR")}만`;
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function fullWon(value: number): string {
  return value.toLocaleString("ko-KR");
}

function billion(value: number): string {
  return `${(value / 1e8).toFixed(1)}억`;
}

function rateOf(line: { budget: number; used: number }): number {
  if (line.budget > 0) return (line.used / line.budget) * 100;
  return line.used > 0 ? Infinity : 0;
}

function showRate(rate: number): string {
  return Number.isFinite(rate) ? `${rate.toFixed(1)}%` : "예산 0원";
}

/* -------------------------------------------------------------- risk bands */

type RiskKey = "over" | "watch" | "ok" | "spare";

const riskMeta: Record<RiskKey, { label: string; range: string }> = {
  over: { label: "초과", range: ">100%" },
  watch: { label: "주의", range: "80~100%" },
  ok: { label: "양호", range: "50~80%" },
  spare: { label: "여유", range: "<50%" },
};

const riskOrder: RiskKey[] = ["over", "watch", "ok", "spare"];

function riskOf(line: { budget: number; used: number }): RiskKey {
  const rate = rateOf(line);
  if (rate > 100) return "over";
  if (rate >= 80) return "watch";
  if (rate >= 50) return "ok";
  return "spare";
}

/* ----------------------------------------------------------------- pacing */

const elapsedRate = Math.round((budgetClosedMonths / budgetFiscalMonths) * 100);

/* ------------------------------------------------------------- aggregates */

const totalBudget = budgetLines.reduce((sum, line) => sum + line.budget, 0);
const totalUsed = budgetLines.reduce((sum, line) => sum + line.used, 0);
const totalRemain = totalBudget - totalUsed;
const overallRate = (totalUsed / totalBudget) * 100;

const forecast = budgetClosedMonths ? (totalUsed / budgetClosedMonths) * budgetFiscalMonths : 0;
const forecastVariance = totalBudget - forecast;

const riskCounts = riskOrder.reduce<Record<RiskKey, number>>((acc, key) => {
  acc[key] = budgetLines.filter((line) => riskOf(line) === key).length;
  return acc;
}, { over: 0, watch: 0, ok: 0, spare: 0 });

const unusedCount = budgetLines.filter((line) => line.used === 0).length;

const overLines = budgetLines
  .filter((line) => line.used > line.budget)
  .map((line) => ({ ...line, over: line.used - line.budget }))
  .sort((a, b) => b.over - a.over);

const watchLines = budgetLines
  .filter((line) => riskOf(line) === "watch")
  .sort((a, b) => rateOf(b) - rateOf(a));

const byType = (["Opex", "Capex"] as const).map((type) => {
  const rows = budgetLines.filter((line) => line.type === type);
  return {
    type,
    count: rows.length,
    budget: rows.reduce((sum, line) => sum + line.budget, 0),
    used: rows.reduce((sum, line) => sum + line.used, 0),
  };
});

const byAccount = (() => {
  const map = new Map<string, { acct: string; budget: number; used: number; count: number }>();
  for (const line of budgetLines) {
    const row = map.get(line.acct) ?? { acct: line.acct, budget: 0, used: 0, count: 0 };
    row.budget += line.budget;
    row.used += line.used;
    row.count += 1;
    map.set(line.acct, row);
  }
  return [...map.values()].sort((a, b) => b.budget - a.budget);
})();

const txByCode = (() => {
  const map = new Map<string, typeof budgetTransactions>();
  for (const tx of budgetTransactions) {
    const rows = map.get(tx.code) ?? [];
    rows.push(tx);
    map.set(tx.code, rows);
  }
  for (const rows of map.values()) rows.sort((a, b) => b.date.localeCompare(a.date));
  return map;
})();

const monthlyPeak = Math.max(...budgetMonthly.map((month) => month.amount), 1);
const monthlyPlan = totalBudget / budgetFiscalMonths;

export const contractReviewCount = Object.keys(budgetApprovals).length;
export const topOverspend = overLines[0];

/** 운영현황 화면이 쓰는 요약값. 억원 단위. */
export function getBudgetOverview() {
  return {
    budget: totalBudget / 1e8,
    actual: totalUsed / 1e8,
    available: totalRemain / 1e8,
    usedRate: Math.round(overallRate),
    elapsedRate,
  };
}

/* -------------------------------------------------------------------- marks */

/** 상태는 색만으로 전달하지 않습니다 — 배지가 항상 한글 라벨을 함께 답니다. */
function RiskBadge({ line }: { line: { budget: number; used: number } }) {
  const key = riskOf(line);
  return <span className={`budget-risk-badge risk-${key}`}>{riskMeta[key].label}</span>;
}

/** 사용율 막대. 경과율 표식을 함께 그려 무엇에 대비한 비율인지 남깁니다. */
function RateBar({ line, showMarker = true }: { line: { budget: number; used: number }; showMarker?: boolean }) {
  const rate = rateOf(line);
  const width = Number.isFinite(rate) ? Math.min(rate, 100) : 100;
  return (
    <span className={`budget-rate-bar risk-${riskOf(line)}`}>
      <i style={{ width: `${width}%` }} />
      {showMarker && <b style={{ left: `${elapsedRate}%` }} title={`연간 경과 ${elapsedRate}%`} />}
    </span>
  );
}

/** 유형별 예산 구성 도넛. 가운데는 전체 사용율. */
function Donut({ segments, centerValue, centerLabel }: {
  segments: Array<{ key: string; value: number; className: string }>;
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="budget-donut">
      <svg viewBox="0 0 110 110" width="128" height="128" aria-hidden="true">
        <circle className="budget-donut-track" cx="55" cy="55" r={radius} />
        {segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const dash = `${Math.max(length - 2, 0)} ${circumference - Math.max(length - 2, 0)}`;
          const rotation = (offset / total) * 360 - 90;
          offset += segment.value;
          return (
            <circle
              key={segment.key}
              className={segment.className}
              cx="55"
              cy="55"
              r={radius}
              strokeDasharray={dash}
              transform={`rotate(${rotation} 55 55)`}
            />
          );
        })}
      </svg>
      <span className="budget-donut-center"><b>{centerValue}</b><small>{centerLabel}</small></span>
    </div>
  );
}

/** 반원 게이지. 원본의 '예산 사용 현황 추이' 자리에 들어가는 마크입니다. */
function Gauge({ rate }: { rate: number }) {
  const clamped = Math.max(0, Math.min(rate, 100));
  const radius = 62;
  const arc = Math.PI * radius;
  return (
    <div className="budget-gauge">
      <svg viewBox="0 0 150 84" width="100%" height="112" aria-hidden="true">
        <path className="budget-gauge-track" d={`M 13 75 A ${radius} ${radius} 0 0 1 137 75`} />
        <path
          className="budget-gauge-fill"
          d={`M 13 75 A ${radius} ${radius} 0 0 1 137 75`}
          strokeDasharray={`${(clamped / 100) * arc} ${arc}`}
        />
      </svg>
      <span className="budget-gauge-center"><b>{rate.toFixed(1)}%</b><small>전체 예산 사용율</small></span>
    </div>
  );
}

/* -------------------------------------------------------------------- modal */

function DetailModal({ line, onClose }: { line: BudgetLine; onClose: () => void }) {
  const [tab, setTab] = useState<"approval" | "tx">("approval");
  const approvals = budgetApprovals[line.code] ?? [];
  const transactions = txByCode.get(line.code) ?? [];
  const rate = rateOf(line);

  return (
    <div className="budget-modal-scrim" role="dialog" aria-modal="true" aria-label={`${line.name} 상세`} onClick={onClose}>
      <div className="budget-modal" onClick={(event) => event.stopPropagation()}>
        <div className="budget-modal-head">
          <div>
            <b>{line.name}</b>
            <small>{line.code} · {line.acct} · {line.type}</small>
          </div>
          <button type="button" className="budget-modal-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div className="budget-modal-figures">
          <span><small>총 예산</small><b>{fullWon(line.budget)}원</b></span>
          <span><small>사용금액</small><b className={line.used > line.budget ? "over" : undefined}>{fullWon(line.used)}원</b></span>
          <span><small>잔여예산</small><b className={line.remain < 0 ? "over" : "left"}>{fullWon(line.remain)}원</b></span>
        </div>
        <RateBar line={line} />
        <div className="budget-modal-rate">
          <small>사용율 {showRate(rate)} · 연간 경과 {elapsedRate}%</small>
          <RiskBadge line={line} />
        </div>

        <div className="budget-modal-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "approval"} className={tab === "approval" ? "selected" : ""} onClick={() => setTab("approval")}>
            계약·사업추진 {approvals.length}
          </button>
          <button role="tab" aria-selected={tab === "tx"} className={tab === "tx" ? "selected" : ""} onClick={() => setTab("tx")}>
            세부 지출 내역 {transactions.length}
          </button>
        </div>

        {tab === "approval" ? (
          approvals.length ? (
            <ul className="budget-modal-approvals">
              {approvals.map((approval) => (
                <li key={approval.url}>
                  <span className="budget-approval-cat">{approval.category}</span>
                  <a href={approval.url} target="_blank" rel="noreferrer">{approval.name}</a>
                </li>
              ))}
            </ul>
          ) : <p className="budget-modal-empty">연결된 품의가 없습니다.</p>
        ) : (
          transactions.length ? (
            <ul className="budget-modal-tx">
              {transactions.map((tx, index) => (
                <li key={`${tx.date}-${index}`}>
                  <small>{tx.date}</small>
                  <span>{tx.desc || tx.name}</span>
                  <em>{fullWon(tx.amount)}원</em>
                  <small className="budget-modal-owner">{tx.owner}</small>
                </li>
              ))}
            </ul>
          ) : <p className="budget-modal-empty">집행 내역이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- screen */

const PAGE_SIZE = 25;
type SortKey = "budget" | "used" | "remain" | "rate";
type FilterKey = "all" | RiskKey | "Opex" | "Capex";

const filterChips: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "전체" },
  { key: "over", label: "초과" },
  { key: "watch", label: "주의" },
  { key: "ok", label: "양호" },
  { key: "spare", label: "여유" },
  { key: "Opex", label: "Opex" },
  { key: "Capex", label: "Capex" },
];

export function BudgetAdminScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "budget", desc: true });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<BudgetLine | null>(null);
  const [topScope, setTopScope] = useState<"over" | "watch" | "both">("over");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = budgetLines.filter((line) => {
      if (needle && !`${line.code} ${line.name} ${line.acct}`.toLowerCase().includes(needle)) return false;
      if (filter === "all") return true;
      if (filter === "Opex" || filter === "Capex") return line.type === filter;
      return riskOf(line) === filter;
    });
    const value = (line: BudgetLine) => {
      if (sort.key === "budget") return line.budget;
      if (sort.key === "used") return line.used;
      if (sort.key === "remain") return line.remain;
      const rate = rateOf(line);
      return Number.isFinite(rate) ? rate : Number.MAX_SAFE_INTEGER;
    };
    list = [...list].sort((a, b) => (sort.desc ? value(b) - value(a) : value(a) - value(b)));
    return list;
  }, [query, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const shownBudget = rows.reduce((sum, line) => sum + line.budget, 0);
  const shownUsed = rows.reduce((sum, line) => sum + line.used, 0);

  const topList = useMemo(() => {
    const pool = topScope === "over" ? overLines : topScope === "watch" ? watchLines : [...overLines, ...watchLines];
    return pool.slice(0, 6);
  }, [topScope]);

  const topAccounts = byAccount.slice(0, 8);
  const accountPeak = Math.max(...topAccounts.map((row) => row.budget), 1);

  const changeSort = (key: SortKey) => {
    setPage(1);
    setSort((prev) => (prev.key === key ? { key, desc: !prev.desc } : { key, desc: true }));
  };
  const sortMark = (key: SortKey) => (sort.key === key ? (sort.desc ? "↓" : "↑") : "↕");

  return (
    <main className="screen budget-dash">
      <section className="budget-dash-head">
        <div>
          <h1>비용·계약 관리</h1>
          <p>{budgetAsOf.slice(0, 4)} · 예산코드 {budgetLines.length}개 항목 전체 현황</p>
        </div>
        <span className="budget-asof-pill">기준 {budgetAsOf.replace(/-/g, ".")}</span>
      </section>

      <section className="budget-source-note">
        <b>실제 데이터</b>
        <p>예산관리 대시보드 내보내기 · {budgetClosedMonths}개월 마감 · 거래 {budgetTransactions.length}건. 운영에서는 세부내역 시트를 직접 읽습니다.</p>
      </section>

      <section className="budget-stat-row">
        <article className="budget-stat tone-navy">
          <small>총 예산</small><b>{billion(totalBudget)}</b><em>{budgetLines.length}개 항목</em>
        </article>
        <article className="budget-stat tone-teal">
          <small>총 사용금액</small><b>{billion(totalUsed)}</b><em>사용율 {overallRate.toFixed(1)}% · 경과 {elapsedRate}%</em>
        </article>
        <article className="budget-stat tone-green">
          <small>잔여예산</small><b>{billion(totalRemain)}</b><em>전체의 {(100 - overallRate).toFixed(1)}% 미사용</em>
        </article>
        <article className="budget-stat tone-red">
          <small>예산 초과 항목</small><b>{riskCounts.over}건</b><em>초과 합계 {won(overLines.reduce((sum, line) => sum + line.over, 0))}</em>
        </article>
        <article className="budget-stat tone-amber">
          <small>주의 항목 (80~100%)</small><b>{riskCounts.watch}건</b><em>사용율 모니터링 권고</em>
        </article>
        <article className="budget-stat tone-gray">
          <small>미집행 항목 (0%)</small><b>{unusedCount}건</b><em>사용액 미발생</em>
        </article>
      </section>

      <div className="budget-grid-3">
        <section className="budget-card">
          <div className="budget-card-head"><h2>유형별 예산 현황</h2></div>
          <div className="budget-type-row">
            <Donut
              segments={byType.map((row) => ({ key: row.type, value: row.budget, className: `budget-donut-${row.type.toLowerCase()}` }))}
              centerValue={`${overallRate.toFixed(1)}%`}
              centerLabel="전체 사용율"
            />
            <div className="budget-type-blocks">
              <ul className="budget-donut-legend">
                {byType.map((row) => (
                  <li key={row.type}><i className={`budget-donut-${row.type.toLowerCase()}`} />{row.type}</li>
                ))}
              </ul>
              {byType.map((row) => (
                <div className="budget-type-block" key={row.type}>
                  <div className="budget-type-block-top">
                    <span><em className={`budget-type-chip type-${row.type.toLowerCase()}`}>{row.type}</em>{row.count}건</span>
                    <b>{rateOf(row).toFixed(1)}%</b>
                  </div>
                  <RateBar line={row} />
                  <div className="budget-type-block-foot"><small>예산 {billion(row.budget)}</small><small>사용 {billion(row.used)}</small></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="budget-card">
          <div className="budget-card-head"><h2>위험도 분포</h2><span>{budgetLines.length}건</span></div>
          <div className="budget-risk-bar">
            {riskOrder.map((key) => (
              <i
                key={key}
                className={`risk-${key}`}
                style={{ width: `${(riskCounts[key] / budgetLines.length) * 100}%` }}
                title={`${riskMeta[key].label} ${riskCounts[key]}건`}
              />
            ))}
          </div>
          <ul className="budget-risk-legend">
            {riskOrder.map((key) => (
              <li key={key}>
                <i className={`risk-${key}`} />
                <span>{riskMeta[key].label} ({riskMeta[key].range})</span>
                <em className={`risk-${key}`}>{riskCounts[key]}건</em>
              </li>
            ))}
          </ul>
          <div className="budget-card-head budget-card-head-sub"><h2>전체 예산 사용율</h2></div>
          <Gauge rate={overallRate} />
          <p className="budget-note">
            연말 착지 전망 <b>{billion(forecast)}</b> · {forecastVariance >= 0 ? "예산 내" : "예산 초과"} {won(Math.abs(forecastVariance))}.
            마감 {budgetClosedMonths}개월 균등 환산이며 계절성은 반영하지 않습니다.
          </p>
        </section>

        <section className="budget-card">
          <div className="budget-card-head"><h2>계정 카테고리별 사용 현황</h2></div>
          <ul className="budget-acct-list">
            {byAccount.slice(0, 10).map((row) => (
              <li key={row.acct}>
                <span className="budget-acct-name" title={row.acct}>{row.acct}</span>
                <span className="budget-acct-bar">
                  <RateBar line={row} />
                  <span className="budget-acct-ends"><small>{won(row.used)}</small><small>{won(row.budget)}</small></span>
                </span>
                <em className={`risk-${riskOf(row)}`}>{rateOf(row).toFixed(1)}%</em>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="budget-grid-2">
        <section className="budget-card">
          <div className="budget-card-head"><h2>예산 규모 TOP 8 — 계정별 비교</h2></div>
          <ul className="budget-top-legend">
            <li><i className="budget-col-plan" />총예산</li>
            <li><i className="budget-col-used" />사용금액</li>
          </ul>
          <div className="budget-top-chart">
            {topAccounts.map((row) => (
              <div className="budget-top-col" key={row.acct} title={`${row.acct} · 예산 ${won(row.budget)} · 사용 ${won(row.used)}`}>
                <div className="budget-top-pair">
                  <i className="budget-col-plan" style={{ height: `${(row.budget / accountPeak) * 100}%` }} />
                  <i className="budget-col-used" style={{ height: `${(row.used / accountPeak) * 100}%` }} />
                </div>
                <small>{row.acct}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="budget-card">
          <div className="budget-card-head">
            <h2>초과·주의 TOP 항목</h2>
            <select value={topScope} onChange={(event) => setTopScope(event.target.value as typeof topScope)} aria-label="표시 범위">
              <option value="over">초과 항목만</option>
              <option value="watch">주의 항목만</option>
              <option value="both">초과 + 주의</option>
            </select>
          </div>
          <ol className="budget-top-list">
            {topList.map((line, index) => (
              <li key={line.code} className={`risk-${riskOf(line)}`}>
                <span className="budget-top-rank">{String(index + 1).padStart(2, "0")}</span>
                <button type="button" title={line.name} onClick={() => setDetail(line)}>{line.name}</button>
                <small>{line.code}</small>
                <RateBar line={line} showMarker={false} />
                <em className={`risk-${riskOf(line)}`}>{showRate(rateOf(line))}</em>
              </li>
            ))}
          </ol>
          {topList.length === 0 && <p className="budget-modal-empty">해당 항목이 없습니다.</p>}
        </section>
      </div>

      <section className="budget-card">
        <div className="budget-card-head">
          <h2>월별 집행 추이</h2>
          <span>월 평균 예산 {won(monthlyPlan)}</span>
        </div>
        <div className="budget-trend" role="img" aria-label={`월별 집행액. ${budgetMonthly.map((month) => `${Number(month.month.slice(5))}월 ${won(month.amount)}`).join(", ")}`}>
          <span className="budget-trend-plan" style={{ bottom: `${Math.min((monthlyPlan / monthlyPeak) * 100, 100)}%` }}><em>월 평균 예산</em></span>
          {budgetMonthly.map((month) => (
            <div className="budget-trend-col" key={month.month} title={`${month.month} ${won(month.amount)}`}>
              <b>{billion(month.amount)}</b>
              <div className="budget-trend-bar" style={{ height: `${(month.amount / monthlyPeak) * 100}%` }} />
              <small>{Number(month.month.slice(5))}월</small>
            </div>
          ))}
        </div>
        <p className="budget-note">원본 대시보드에는 시간축이 없어 새로 넣었습니다. 1~2월이 거의 0이고 3월에 몰린 형태라, 균등 환산 전망보다 실제 착지가 높을 수 있습니다.</p>
      </section>

      <section className="budget-card budget-table-card">
        <div className="budget-card-head budget-table-head">
          <h2>전체 예산코드 항목 상세<small>행을 누르면 계약·지출 상세가 열립니다</small></h2>
          <div className="budget-table-controls">
            <span className="budget-search"><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="코드·항목명·계정 검색" aria-label="예산코드 검색" /></span>
            <div className="budget-chip-row">
              {filterChips.map((chip) => (
                <button key={chip.key} type="button" className={filter === chip.key ? "selected" : ""} onClick={() => { setFilter(chip.key); setPage(1); }}>{chip.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="budget-table">
          <div className="budget-table-row budget-table-header">
            <span>코드</span>
            <span>항목명</span>
            <span>유형</span>
            <span>계정</span>
            <button type="button" onClick={() => changeSort("budget")}>예산 {sortMark("budget")}</button>
            <button type="button" onClick={() => changeSort("used")}>사용금액 {sortMark("used")}</button>
            <button type="button" onClick={() => changeSort("remain")}>잔여예산 {sortMark("remain")}</button>
            <button type="button" onClick={() => changeSort("rate")}>사용율 {sortMark("rate")}</button>
            <span>상태</span>
          </div>
          {pageRows.map((line) => {
            const approvals = budgetApprovals[line.code]?.length ?? 0;
            return (
              <div
                className={`budget-table-row budget-table-body risk-row-${riskOf(line)}`}
                key={line.code}
                role="button"
                tabIndex={0}
                onClick={() => setDetail(line)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetail(line); } }}
              >
                <span className="budget-cell-code">{line.code}</span>
                <span className="budget-cell-name" title={line.name}>
                  {line.name}
                  {approvals > 0 && <em className="budget-cell-clip">{approvals}건</em>}
                </span>
                <span><em className={`budget-type-chip type-${line.type.toLowerCase()}`}>{line.type}</em></span>
                <span className="budget-cell-acct" title={line.acct}>{line.acct}</span>
                <span className="budget-cell-num">{fullWon(line.budget)}</span>
                <span className="budget-cell-num">{fullWon(line.used)}</span>
                <span className={`budget-cell-num ${line.remain < 0 ? "over" : "left"}`}>{fullWon(line.remain)}</span>
                <span className="budget-cell-rate"><RateBar line={line} showMarker={false} /><em className={`risk-${riskOf(line)}`}>{showRate(rateOf(line))}</em></span>
                <span><RiskBadge line={line} /></span>
              </div>
            );
          })}
        </div>

        <div className="budget-table-summary">
          <span>필터 결과 <b>{rows.length}건</b></span>
          <span>예산 합계 <b>{fullWon(shownBudget)}</b></span>
          <span>사용 합계 <b>{fullWon(shownUsed)}</b></span>
          <span>잔여 합계 <b>{fullWon(shownBudget - shownUsed)}</b></span>
          <span>평균 사용율 <b>{shownBudget ? ((shownUsed / shownBudget) * 100).toFixed(1) : "0.0"}%</b></span>
        </div>

        {totalPages > 1 && (
          <div className="budget-pagination">
            <button type="button" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} aria-label="이전 페이지">‹</button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
              <button key={number} type="button" className={number === current ? "selected" : ""} onClick={() => setPage(number)}>{number}</button>
            ))}
            <button type="button" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages} aria-label="다음 페이지">›</button>
            <small>{(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} / {rows.length}건</small>
          </div>
        )}
      </section>

      {detail && <DetailModal line={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}
