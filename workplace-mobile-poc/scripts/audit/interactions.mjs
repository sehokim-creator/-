/*
 * Clicks every control on the busiest screens and reports runtime errors.
 *
 *   npm run audit:interact            # 1440px
 *   npm run audit:interact -- 390     # phone
 *
 * "blocked" counts controls that were visible but could not be clicked. Two
 * causes are expected: rows scrolled outside a fixed-height list container, and
 * anything behind an open dialog — 비용·계약 opens one on the first row click, so
 * the rest of that screen's controls report blocked.
 */

import { goTo, launch, signIn } from "./lib.mjs";

const SCREENS = ["home", "request", "mine", "seat", "ops", "oaAdmin", "peopleAdmin", "seatAdmin", "budgetAdmin"];
const SELECTOR =
  ".screen button:not([disabled]):not(.bottom-nav button), .screen [role=tab], .screen input[type=checkbox]";

const width = Number(process.argv[2] ?? 1440);
const browser = await launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });

const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text().slice(0, 160));
});
page.on("pageerror", (error) => errors.push(`PAGEERROR ${error.message.slice(0, 160)}`));

await signIn(page);

for (const id of SCREENS) {
  if (!(await goTo(page, id))) continue;
  await page.waitForTimeout(400);

  const total = (await page.$$(SELECTOR)).length;
  const before = errors.length;
  const blocked = [];
  let clicked = 0;

  for (let index = 0; index < Math.min(total, 45); index += 1) {
    const element = (await page.$$(SELECTOR))[index];
    if (!element) continue;
    const info = await element.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        label: (node.textContent || node.getAttribute("aria-label") || "").trim().slice(0, 28),
        visible:
          box.width > 0 && box.height > 0 && style.visibility !== "hidden" && Number(style.opacity) > 0.05,
        inView: box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth,
        hitsSelf: Boolean(top) && (top === node || node.contains(top) || top.contains(node)),
      };
    });
    if (!info.visible) continue;
    if (info.inView && !info.hitsSelf) {
      blocked.push(info.label);
      continue;
    }
    try {
      await element.click({ timeout: 900 });
      clicked += 1;
      await page.waitForTimeout(70);
    } catch {
      blocked.push(info.label);
    }
  }

  const fresh = errors.slice(before);
  console.log(`${id}: controls=${total} clicked=${clicked} blocked=${blocked.length} errors=${fresh.length}`);
  if (fresh.length) console.log("   ", fresh.slice(0, 3));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
}

console.log("TOTAL ERRORS:", errors.length);
await browser.close();
process.exit(errors.length ? 1 : 0);
