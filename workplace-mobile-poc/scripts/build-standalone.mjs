/*
 * Packages the POC as one self-contained .html file.
 *
 *   node scripts/build-standalone.mjs [outputPath]
 *
 * Everything is inlined — JS, CSS, and the Pretendard variable font as a
 * base64 data URL — so the result opens from the filesystem with no server and
 * no network access. That is the point: it is the only form of this POC that
 * someone can review on a phone or a machine where nothing can be installed.
 *
 * The font is ~285 KB before base64 and grows about a third in encoding, so the
 * file lands near 900 KB. Worth it: without the real font the layout falls back
 * to a system face and the 17 non-standard weights in globals.css collapse onto
 * whatever the fallback happens to have, which changes how every screen reads.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staging = resolve(root, ".standalone");
const output = resolve(process.cwd(), process.argv[2] ?? "workplace-poc.html");

console.log("building bundle…");
execFileSync("npx", ["vite", "build", "--config", "scripts/standalone/vite.config.mjs"], {
  cwd: root,
  stdio: "inherit",
});

const js = readFileSync(resolve(staging, "bundle.js"), "utf8");
// Vite names the lib-mode stylesheet after the package, not after fileName.
const sheets = readdirSync(staging).filter((name) => name.endsWith(".css"));
if (sheets.length !== 1) throw new Error(`expected exactly one stylesheet in .standalone, found ${sheets.length}`);
const cssPath = resolve(staging, sheets[0]);
let css = readFileSync(cssPath, "utf8");

// Inline the font. The @font-face in globals.css points at /fonts/… which
// resolves to the filesystem root under file://, so it has to become a data URL.
const font = readFileSync(resolve(root, "public/fonts/PretendardStdVariable.woff2")).toString("base64");
const fontUrl = `url("data:font/woff2;base64,${font}") format("woff2-variations")`;
const before = css;
css = css.replace(/url\(["']?\/fonts\/PretendardStdVariable\.woff2["']?\)\s*format\(["']woff2-variations["']\)/g, fontUrl);
if (css === before) throw new Error("font reference not found in the built CSS — the @font-face src changed");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Workplace POC</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
rmSync(staging, { recursive: true, force: true });

const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`\n${output}`);
console.log(`  total ${kb(Buffer.byteLength(html))} — css ${kb(css.length)}, js ${kb(js.length)}, font ${kb(font.length)}`);
if (html.includes('type="module"')) throw new Error("module script leaked into the output; it will not run under file://");
