/*
 * Shared helpers for the screen audits.
 *
 * Playwright is not a dependency of this project — the audits are opt-in, see
 * scripts/audit/README.md. CHROMIUM_PATH exists because the sandbox this was
 * written in ships a browser at a fixed path; on a normal machine leave it unset
 * and Playwright resolves its own download.
 */

export const BASE_URL = process.env.AUDIT_URL ?? "http://localhost:3000";

export async function launch() {
  const { chromium } = await import("playwright");
  const executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch(executablePath ? { executablePath } : {});
}

/** Every screen the left rail can reach, by its data-nav id. */
export const SCREENS = [
  ["home", "홈"],
  ["request", "업무 요청"],
  ["seat", "좌석·공간"],
  ["mine", "내 요청"],
  ["ops", "운영현황"],
  ["oaAdmin", "OA 신청·반납"],
  ["peopleAdmin", "구성원 지원 현황"],
  ["accessAdmin", "출입·보안 관리"],
  ["parkingAdmin", "주차 관리"],
  ["welfareAdmin", "복리후생·물품 운영"],
  ["seatAdmin", "좌석·공간 관리"],
  ["assetAdmin", "자산·렌탈 관리"],
  ["licenseAdmin", "SW·라이선스 관리"],
  ["budgetAdmin", "비용·계약"],
  ["approvalAdmin", "승인·전결 기준"],
];

/** Signs in past the demo gate. */
export async function signIn(page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.click(".login-sso");
  await page.waitForTimeout(900);
}

/*
 * Navigates to a screen.
 *
 * The desktop nav is two columns: the panel only lists the open rail section, so
 * a destination in a closed section has to have its section opened first. Returns
 * false when the item is desktop-only and the viewport is a phone.
 */
export async function goTo(page, id) {
  const section = await page.evaluate(
    (navId) => document.querySelector(`[data-nav="${navId}"]`)?.dataset.section,
    id,
  );
  if (section) {
    const rail = await page.$(`[data-rail="${section}"]`);
    if (rail && (await rail.isVisible())) {
      await rail.click();
      await page.waitForTimeout(120);
    }
  }
  const button = await page.$(`[data-nav="${id}"]`);
  if (!button || !(await button.isVisible())) return false;
  await button.click();
  return true;
}
