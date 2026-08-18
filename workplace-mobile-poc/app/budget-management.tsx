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

/* ---------------------------------------------------------------------------
 * Money formatting
 *
 * The source is in 원 and spans seven orders of magnitude — a 25억 lease line
 * next to a 1만원 licence. One unit for all of it either loses the small lines
 * or makes the big ones unreadable, so the unit follows the magnitude.
 * ------------------------------------------------------------------------- */

function won(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}억원`;
  if (abs >= 1e4) return `${Math.round(value / 1e4).toLocaleString("ko-KR")}만원`;
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function billion(value: number): string {
  return `${(value / 1e8).toFixed(1)}억`;
}

function percent(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/* ---------------------------------------------------------------------------
 * Pacing
 *
 * A spend total cannot be read on its own: 36% used is healthy in June and
 * alarming in February. Elapsed is counted in closed months, which is the basis
 * finance reconciles on, and every rate on the screen is shown against it.
 * ------------------------------------------------------------------------- */

const elapsedRate = percent(budgetClosedMonths, budgetFiscalMonths);

type PaceTone = "good" | "warning" | "critical" | "info";

function paceOf(usedRate: number): { tone: PaceTone; label: string } {
  const delta = usedRate - elapsedRate;
  if (delta > 15) return { tone: "critical", label: "초과 페이스" };
  if (delta > 5) return { tone: "warning", label: "빠른 집행" };
  if (delta < -20) return { tone: "info", label: "집행 지연" };
  return { tone: "good", label: "정상 페이스" };
}

function signedPoints(value: number): string {
  const mark = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${mark}${Math.abs(value)}%p`;
}

/* ---------------------------------------------------------------------------
 * Derived views over the snapshot
 * ------------------------------------------------------------------------- */

const totals = budgetLines.reduce(
  (sum, line) => ({ budget: sum.budget + line.budget, used: sum.used + line.used }),
  { budget: 0, used: 0 },
);
const totalRemain = totals.budget - totals.used;
const usedRate = percent(totals.used, totals.budget);

/*
 * Year-end landing, straight-line from the closed months. Deliberately the
 * simplest defensible method rather than a seasonal model — the card states the
 * basis beside the number, because an unstated forecast is worse than none.
 */
const forecast = budgetClosedMonths ? (totals.used / budgetClosedMonths) * budgetFiscalMonths : 0;
const forecastVariance = totals.budget - forecast;

/*
 * Overrun ranking is by absolute 원, not by percent.
 *
 * The source dashboard ranks on pct, which puts a 0원-budget line that spent
 * 20만원 (1284%) above a 1.6억 licence line at 114% — the percent is arithmetic
 * noise when the denominator is near zero, and it buries the overrun that
 * actually costs money. Percent is still shown; it just does not decide order.
 */
const overBudget = budgetLines
  .filter((line) => line.used > line.budget)
  .map((line) => ({ ...line, over: line.used - line.budget }))
  .sort((a, b) => b.over - a.over);

const watchList = budgetLines
  .filter((line) => line.used <= line.budget && line.budget > 0 && line.used / line.budget >= 0.8)
  .sort((a, b) => b.used / b.budget - a.used / a.budget);

const unusedList = budgetLines
  .filter((line) => line.used === 0 && line.budget > 0)
  .sort((a, b) => b.budget - a.budget);

function groupByAccount(lines: typeof budgetLines) {
  const map = new Map<string, { acct: string; budget: number; used: number; count: number }>();
  for (const line of lines) {
    const row = map.get(line.acct) ?? { acct: line.acct, budget: 0, used: 0, count: 0 };
    row.budget += line.budget;
    row.used += line.used;
    row.count += 1;
    map.set(line.acct, row);
  }
  return [...map.values()].sort((a, b) => b.budget - a.budget);
}

const byType = (["Opex", "Capex"] as const).map((type) => {
  const rows = budgetLines.filter((line) => line.type === type);
  return {
    type,
    budget: rows.reduce((sum, line) => sum + line.budget, 0),
    used: rows.reduce((sum, line) => sum + line.used, 0),
    count: rows.length,
  };
});

/*
 * Owner load. The transaction export carries a 담당자 the source dashboard never
 * surfaces, and "who is running which spend" is a question a 총무 lead asks
 * before the account breakdown.
 */
const byOwner = (() => {
  const map = new Map<string, { owner: string; amount: number; count: number }>();
  for (const tx of budgetTransactions) {
    const row = map.get(tx.owner) ?? { owner: tx.owner, amount: 0, count: 0 };
    row.amount += tx.amount;
    row.count += 1;
    map.set(tx.owner, row);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
})();

const monthlyPeak = Math.max(...budgetMonthly.map((month) => month.amount), 1);
const monthlyPlan = totals.budget / budgetFiscalMonths;
const recentTransactions = [...budgetTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

const approvalCodes = Object.entries(budgetApprovals);
export const contractReviewCount = approvalCodes.length;

const lineByCode = new Map(budgetLines.map((line) => [line.code, line]));

/** 운영현황 화면이 쓰는 요약값. 억원 단위. */
export function getBudgetOverview() {
  return {
    budget: totals.budget / 1e8,
    actual: totals.used / 1e8,
    available: totalRemain / 1e8,
    usedRate,
    elapsedRate,
  };
}

/** 운영현황 예외 카드가 쓰는 최대 초과 항목. */
export const topOverspend = overBudget[0];

/* ---------------------------------------------------------------------------
 * Marks
 * ------------------------------------------------------------------------- */

/** 상태는 색만으로 전달하지 않습니다 — 모든 톤이 이 마크와 단어를 함께 씁니다. */
function PaceGlyph({ tone }: { tone: PaceTone }) {
  const content = {
    good: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    warning: <><path d="M12 4l8 15H4l8-15Z" /><path d="M12 10v4M12 16.5v.5" /></>,
    critical: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16v.5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8" /><path d="m8.5 12.5 3.5 3.5 3.5-3.5" /></>,
  }[tone];
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {content}
    </svg>
  );
}

function PaceBadge({ rate }: { rate: number }) {
  const pace = paceOf(rate);
  return (
    <em className={`pace-${pace.tone}`}>
      <PaceGlyph tone={pace.tone} />
      {pace.label} {signedPoints(rate - elapsedRate)}
    </em>
  );
}

/** 집행률 막대. 경과율 표식을 함께 그려 "무엇에 대비한 비율인지"를 남깁니다. */
function UsageBar({ rate, label, size }: { rate: number; label: string; size?: "lg" }) {
  return (
    <div
      className={`budget-usage-bar${size === "lg" ? " budget-usage-bar-lg" : ""}`}
      role="img"
      aria-label={`${label} 집행 ${rate}퍼센트, 연간 경과 ${elapsedRate}퍼센트`}
    >
      <span className={rate > 100 ? "over" : undefined} style={{ width: `${Math.min(rate, 100)}%` }} />
      <i className="budget-pace-marker" style={{ left: `${elapsedRate}%` }} title={`연간 경과 ${elapsedRate}%`} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Screen
 * ------------------------------------------------------------------------- */

export function BudgetAdminScreen() {
  const [tab, setTab] = useState<"budget" | "approval">("budget");
  const [scope, setScope] = useState<"all" | "Opex" | "Capex">("all");

  const accounts = useMemo(
    () => groupByAccount(scope === "all" ? budgetLines : budgetLines.filter((line) => line.type === scope)),
    [scope],
  );

  return (
    <main className="screen budget-admin-screen">
      <section className="budget-admin-intro">
        <div>
          <h1>비용·계약 관리</h1>
          <p>예산관리 대시보드 {budgetAsOf} 스냅샷입니다. 회계 원장은 ERP에 두고, 이 화면은 집행 페이스와 조치 대상을 봅니다.</p>
        </div>
        <p className="budget-asof"><span>기준일</span><b>{budgetAsOf}</b></p>
      </section>

      <section className="budget-source-note">
        <b>실제 데이터</b>
        <p>{budgetClosedMonths}개월 마감 · 예산항목 {budgetLines.length}건 · 거래 {budgetTransactions.length}건. 월별 내보내기를 다시 넣으면 그대로 갱신됩니다.</p>
      </section>

      <div className="segment-control budget-tab-control">
        <button type="button" className={tab === "budget" ? "selected" : ""} onClick={() => setTab("budget")}>예산·집행</button>
        <button type="button" className={tab === "approval" ? "selected" : ""} onClick={() => setTab("approval")}>계약·품의 {contractReviewCount}</button>
      </div>

      {tab === "approval" ? (
        <>
          <section className="budget-section-heading"><div><h2>품의·계약이 연결된 예산코드</h2></div><span>{contractReviewCount}개 코드</span></section>
          <div className="budget-approval-list">
            {approvalCodes.map(([code, approvals]) => {
              const line = lineByCode.get(code);
              return (
                <article key={code}>
                  <div className="budget-approval-top">
                    <span><b>{line ? line.name : code}</b><small>{code}{line ? ` · ${line.acct}` : ""}</small></span>
                    {line && <em>{won(line.used)} / {won(line.budget)}</em>}
                  </div>
                  <ul>
                    {approvals.map((approval) => (
                      <li key={approval.url}>
                        <span className="budget-approval-cat">{approval.category}</span>
                        <a href={approval.url} target="_blank" rel="noreferrer">{approval.name}</a>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <p className="budget-poc-note">품의 링크는 사내망에서만 열립니다.</p>
        </>
      ) : (
        <>
          <section className="budget-kpi-grid">
            <article><span>총 예산</span><b>{billion(totals.budget)}<small>원</small></b><small>편성 + 증액</small></article>
            <article><span>집행</span><b>{billion(totals.used)}<small>원</small></b><small>{usedRate}% 사용</small></article>
            <article className="available"><span>잔여</span><b>{billion(totalRemain)}<small>원</small></b><small>{100 - usedRate}% 남음</small></article>
            <article className={forecastVariance >= 0 ? "available" : "attention"}>
              <span>연말 착지 전망</span>
              <b>{billion(forecast)}<small>원</small></b>
              <small>{forecastVariance >= 0 ? "예산 내" : "예산 초과"} {won(Math.abs(forecastVariance))}</small>
            </article>
          </section>

          <section className="budget-pacing-card">
            <div className="budget-pacing-head">
              <span><small>연간 경과 {elapsedRate}% 대비</small><b>집행률 {usedRate}%</b></span>
              <PaceBadge rate={usedRate} />
            </div>
            <UsageBar rate={usedRate} label="전체" size="lg" />
            <div className="budget-bar-legend">
              <span className="actual">집행 {usedRate}% · {won(totals.used)}</span>
              <span className="remain">잔여 {100 - usedRate}% · {won(totalRemain)}</span>
              <span className="elapsed">연간 경과 {elapsedRate}% ({budgetClosedMonths}개월 마감)</span>
            </div>
            <p className="budget-forecast-basis">착지 전망은 마감 {budgetClosedMonths}개월 집행액의 균등 환산값입니다. 계절성은 반영하지 않습니다.</p>
          </section>

          <section className="budget-section-heading"><div><h2>월별 집행 추이</h2></div><span>월 평균 예산 {won(monthlyPlan)}</span></section>
          <section className="budget-trend-card">
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
            <p className="budget-forecast-basis">1~2월 집행이 낮고 3월에 몰린 형태입니다. 균등 환산 전망은 이 계절성을 반영하지 않으므로 실제 착지는 전망보다 높을 수 있습니다.</p>
          </section>

          <section className="budget-section-heading"><div><h2>조치가 필요한 항목</h2></div><span>초과 {overBudget.length} · 주의 {watchList.length} · 미집행 {unusedList.length}</span></section>
          <div className="budget-risk-grid">
            <article className="budget-risk-card critical">
              <div className="budget-risk-top"><span><PaceGlyph tone="critical" />예산 초과</span><b>{overBudget.length}건</b></div>
              <ul>
                {overBudget.slice(0, 4).map((line) => (
                  <li key={line.code}><span>{line.name}</span><em>+{won(line.over)}<small>{Math.round(line.pct)}%</small></em></li>
                ))}
              </ul>
              <small>초과 금액순입니다. 비율순으로 두면 예산 0원 항목이 위로 올라와 실제 손실 크기를 가립니다.</small>
            </article>

            <article className="budget-risk-card warning">
              <div className="budget-risk-top"><span><PaceGlyph tone="warning" />주의 80~100%</span><b>{watchList.length}건</b></div>
              <ul>
                {watchList.slice(0, 4).map((line) => (
                  <li key={line.code}><span>{line.name}</span><em>{percent(line.used, line.budget)}%<small>{won(line.remain)} 남음</small></em></li>
                ))}
              </ul>
              <small>연말까지 잔액으로 버틸 수 있는지 확인이 필요한 항목입니다.</small>
            </article>

            <article className="budget-risk-card info">
              <div className="budget-risk-top"><span><PaceGlyph tone="info" />미집행 0%</span><b>{unusedList.length}건</b></div>
              <ul>
                {unusedList.slice(0, 4).map((line) => (
                  <li key={line.code}><span>{line.name}</span><em>{won(line.budget)}</em></li>
                ))}
              </ul>
              <small>반기가 지나도 집행이 없는 예산입니다. 재배정 검토 대상입니다.</small>
            </article>
          </div>

          <section className="budget-section-heading"><div><h2>유형별 집행</h2></div></section>
          <div className="budget-type-grid">
            {byType.map((row) => (
              <article key={row.type}>
                <div className="budget-type-top">
                  <span><b>{row.type}</b><small>{row.count}개 항목</small></span>
                  <PaceBadge rate={percent(row.used, row.budget)} />
                </div>
                <UsageBar rate={percent(row.used, row.budget)} label={row.type} />
                <dl>
                  <div><dt>예산</dt><dd>{won(row.budget)}</dd></div>
                  <div><dt>집행</dt><dd>{won(row.used)}</dd></div>
                  <div><dt>잔여</dt><dd>{won(row.budget - row.used)}</dd></div>
                </dl>
              </article>
            ))}
          </div>

          <section className="budget-section-heading">
            <div><h2>계정별 집행 현황</h2></div>
            <div className="segment-control budget-account-filter">
              {(["all", "Opex", "Capex"] as const).map((value) => (
                <button key={value} type="button" className={scope === value ? "selected" : ""} onClick={() => setScope(value)}>
                  {value === "all" ? "전체" : value}
                </button>
              ))}
            </div>
          </section>
          <div className="budget-account-table">
            <div className="budget-account-row budget-account-head">
              <span>계정</span><span>예산</span><span>집행</span><span>집행률</span><span>페이스</span>
            </div>
            {accounts.slice(0, 12).map((row) => {
              const rate = percent(row.used, row.budget);
              return (
                <div className="budget-account-row" key={row.acct}>
                  <span title={row.acct}><b>{row.acct}</b><small>{row.count}건</small></span>
                  <span>{won(row.budget)}</span>
                  <span>{won(row.used)}</span>
                  <span className="budget-account-rate"><UsageBar rate={rate} label={row.acct} /><small>{rate}%</small></span>
                  <span><PaceBadge rate={rate} /></span>
                </div>
              );
            })}
          </div>

          <section className="budget-section-heading"><div><h2>담당자별 집행</h2></div><span>거래 {budgetTransactions.length}건</span></section>
          <div className="budget-owner-grid">
            {byOwner.map((row) => (
              <article key={row.owner}>
                <div className="budget-owner-top"><b>{row.owner}</b><em>{row.count}건</em></div>
                <div className="budget-usage-bar budget-owner-bar"><span style={{ width: `${percent(row.amount, byOwner[0].amount)}%` }} /></div>
                <small>{won(row.amount)}</small>
              </article>
            ))}
          </div>

          <section className="budget-section-heading"><div><h2>최근 집행 내역</h2></div><span>최근 {recentTransactions.length}건</span></section>
          <div className="budget-tx-list">
            {recentTransactions.map((tx, index) => (
              <article key={`${tx.code}-${tx.date}-${index}`}>
                <div className="budget-tx-top"><small>{tx.date}</small><em>{won(tx.amount)}</em></div>
                <b>{tx.desc || tx.name}</b>
                <small>{tx.name} · {tx.owner}</small>
              </article>
            ))}
          </div>

          <section className="budget-integration-card">
            <div>
              <b>운영 전환 시 연결 지점</b>
              <p>지금은 대시보드 내보내기 스냅샷을 읽습니다. 운영에서는 세부내역 시트를 직접 읽어 같은 화면을 갱신하고, 예산원장·전표는 ERP를 기준으로 둡니다.</p>
            </div>
            <ul>
              <li><span>예산항목·집행액</span><em>세부내역 시트</em></li>
              <li><span>예산원장·전표</span><em>ERP</em></li>
              <li><span>품의·계약</span><em>사내 결재</em></li>
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
