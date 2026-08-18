/*
 * Layout sweep over every screen at a desktop and a phone width.
 *
 *   npm run audit
 *
 * Flags three things per screen: horizontal page overflow, text overflowing its
 * box while not intentionally ellipsised, and blocks so narrow they wrap per
 * character (which is what a collapsed grid looks like). Console and page errors
 * are collected per viewport.
 *
 * Two flags are expected and are not defects:
 *   - 좌석·공간 "clipped: map-seat" — the invisible ::before that widens the seat
 *     touch target reads as 6px of overflow.
 *   - 운영현황 "clipped: queue-section" — that section bleeds 20px to the screen
 *     edge on purpose.
 */

import { goTo, launch, SCREENS, signIn } from "./lib.mjs";

const browser = await launch();
let failures = 0;

for (const width of [1440, 390]) {
  console.log(`\n===== ${width}px =====`);
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 120)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text().slice(0, 120)}`);
  });

  await signIn(page);

  for (const [id, name] of SCREENS) {
    if (!(await goTo(page, id))) {
      console.log(`  ${name.padEnd(16)} skipped (desktop only)`);
      continue;
    }
    await page.waitForTimeout(600);

    const result = await page.evaluate(() => {
      const root = document.documentElement;
      const clipped = [];
      const squeezed = [];
      for (const element of document.querySelectorAll(
        "main .card, main section, main article, main button, main b, main h1, main h2, main dd",
      )) {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        const text = (element.textContent ?? "").trim().slice(0, 24);
        if (
          element.scrollWidth > element.clientWidth + 2 &&
          style.textOverflow !== "ellipsis" &&
          style.overflowX === "visible"
        ) {
          clipped.push(`${element.className || element.tagName}:${text}`);
        }
        if (text.length > 6 && box.width < 90 && box.height > box.width * 2) {
          squeezed.push(`${element.className || element.tagName}(${Math.round(box.width)}px):${text}`);
        }
      }
      return {
        overflow: root.scrollWidth - root.clientWidth,
        clipped: [...new Set(clipped)].slice(0, 4),
        squeezed: [...new Set(squeezed)].slice(0, 4),
        hasMain: Boolean(document.querySelector("main")),
      };
    });

    const flags = [];
    if (result.overflow > 1) flags.push(`hScroll+${result.overflow}`);
    if (result.clipped.length) flags.push(`clipped:${result.clipped.length}`);
    if (result.squeezed.length) flags.push(`squeezed:${result.squeezed.length}`);
    if (!result.hasMain) flags.push("NO MAIN");
    console.log(`  ${name.padEnd(16)} ${flags.length ? `⚠ ${flags.join(" ")}` : "ok"}`);
    result.squeezed.forEach((entry) => console.log(`      squeezed: ${entry}`));
    result.clipped.forEach((entry) => console.log(`      clipped: ${entry}`));
  }

  if (errors.length) {
    failures += errors.length;
    console.log("  errors:", [...new Set(errors)]);
  } else {
    console.log("  errors: none");
  }
  await context.close();
}

await browser.close();
process.exit(failures ? 1 : 0);
