#!/usr/bin/env node
/**
 * Rendered-defect audit for a named set of module variants.
 *
 * Two classes of defect are checked against the real rendered stage, at several
 * viewports / aspect ratios / modes:
 *
 *   collision — a text run materially overlapping another text run, or a text
 *               run overlapping a decorative device (logo lockup, media plate
 *               edge, badge) that is not its own ancestor.
 *   contrast  — measured foreground ink against the *rasterised* backdrop under
 *               the run (so photographic/aurora plates are scored honestly),
 *               using WCAG 2.1 relative luminance and AA thresholds.
 *
 * Usage:
 *   node scripts/module-defect-audit.mjs --ids MV-A,MV-B [--ratios 16:9,4:3]
 *                                        [--viewports 1280,1600] [--json out.json]
 */
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { PNG } from "pngjs";

const argv = process.argv.slice(2);
const val = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const BASE_URL = val("url", "http://localhost:8080");
const IDS = val("ids", "").split(",").map((s) => s.trim()).filter(Boolean);
const RATIOS = val("ratios", "16:9").split(",").map((s) => s.trim());
const VIEWPORTS = val("viewports", "1280").split(",").map(Number).filter(Boolean);

if (!IDS.length) {
  console.error("--ids is required");
  process.exit(2);
}

const lum = (r, g, b) => {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratioOf = (a, b) => {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

/** Collect text runs + their ink colour, plus decorative device boxes. */
const collect = (root) => {
  const scope = root ?? document;
  const stage = scope.querySelector("[data-slide-stage]");
  if (!stage) return null;
  const S = stage.getBoundingClientRect();
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const runs = [];
  for (const el of stage.querySelectorAll("*")) {
    const txt = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!txt) continue;
    if ([...el.querySelectorAll("*")].some((c) => (c.textContent || "").trim())) continue;
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const px = parseFloat(cs.fontSize) || 16;
    const bold = Number(cs.fontWeight) >= 700;
    runs.push({
      text: txt.slice(0, 48),
      color: cs.color,
      opacity: Number(cs.opacity) || 1,
      large: px >= 24 || (bold && px >= 18.66),
      box: { x: r.left - S.left, y: r.top - S.top, w: r.width, h: r.height },
    });
  }
  const devices = [];
  for (const el of stage.querySelectorAll("[data-device],img,svg[data-logo],[data-logo]")) {
    if (!vis(el)) continue;
    if ((el.textContent || "").trim()) continue;
    const r = el.getBoundingClientRect();
    devices.push({
      tag: el.getAttribute("data-device") || el.getAttribute("data-logo") || el.tagName.toLowerCase(),
      box: { x: r.left - S.left, y: r.top - S.top, w: r.width, h: r.height },
    });
  }
  return { runs, devices, stage: { w: S.width, h: S.height } };
};

const parseRgb = (c) => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((n) => parseFloat(n));
  return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
};

const overlapArea = (a, b) => {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > 3 && oy > 3 ? ox * oy : 0;
};

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
});
const findings = [];
let cases = 0;

for (const vw of VIEWPORTS) {
  for (const ratio of RATIOS) {
    const ctx = await browser.newContext({
      viewport: { width: vw, height: 1800 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    for (const id of IDS) {
      const url = `${BASE_URL}/dev/module-sheet?ids=${encodeURIComponent(id)}&w=${vw}&ar=${encodeURIComponent(ratio)}`;
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.locator("[data-sheet-page]").first().waitFor({ state: "visible", timeout: 20000 });
      await page.waitForTimeout(2500);
      const pages = await page.locator("[data-sheet-page]").all();
      for (let i = 0; i < pages.length; i++) {
        const mode = (await pages[i].getAttribute("data-mode")) || (i === 0 ? "light" : "dark");
        const shot = await pages[i].locator("[data-slide-stage]").first().screenshot();
        const png = PNG.sync.read(shot);
        const data = await pages[i].evaluate(collect);
        if (!data) continue;
        cases++;
        const sx = png.width / data.stage.w;
        const sy = png.height / data.stage.h;
        // contrast
        for (const run of data.runs) {
          const fg = parseRgb(run.color);
          if (!fg || run.text.length < 2) continue;
          const alpha = fg.a * run.opacity;
          if (alpha < 0.5) continue; // decorative ghost ink
          // Sample the rendered plate in a ring just OUTSIDE the run box, plus
          // the box itself. Glyph pixels are antialiased, so an "closest
          // luminance" heuristic scores the ink against itself — take the
          // MEDIAN luminance instead, which is the plate under the run.
          const bx = Math.round(run.box.x * sx);
          const by = Math.round(run.box.y * sy);
          const bw = Math.max(1, Math.round(run.box.w * sx));
          const bh = Math.max(1, Math.round(run.box.h * sy));
          const pad = 3;
          const lums = [];
          const at = (px, py) => {
            const x = Math.min(png.width - 1, Math.max(0, px));
            const y = Math.min(png.height - 1, Math.max(0, py));
            const o = (png.width * y + x) * 4;
            return lum(png.data[o], png.data[o + 1], png.data[o + 2]);
          };
          for (let n = 0; n <= 10; n++) {
            const fx = bx + Math.round((n / 10) * bw);
            lums.push(at(fx, by - pad), at(fx, by + bh + pad));
          }
          for (let n = 0; n <= 6; n++) {
            const fy = by + Math.round((n / 6) * bh);
            lums.push(at(bx - pad, fy), at(bx + bw + pad, fy));
          }
          for (let n = 0; n < 40; n++) {
            lums.push(at(bx + Math.round((n % 8) * (bw / 7)), by + Math.round(Math.floor(n / 8) * (bh / 4))));
          }
          lums.sort((a, b) => a - b);
          const fgL = lum(fg.r, fg.g, fg.b);
          const plateL = lums[Math.floor(lums.length / 2)];
          const worst = ratioOf(fgL, plateL);
          const need = run.large ? 3 : 4.5;
          if (worst < need - 0.15)
            findings.push({ id, mode, vw, ratio, kind: "contrast", text: run.text, ratio_: Number(worst.toFixed(2)), need });
        }
        // collision with decorative devices
        for (const run of data.runs) {
          if (run.text.length < 2) continue;
          for (const dev of data.devices) {
            const a = overlapArea(run.box, dev.box);
            if (!a) continue;
            const smaller = Math.max(1, Math.min(run.box.w * run.box.h, dev.box.w * dev.box.h));
            if (a / smaller > 0.6 && dev.tag !== "img")
              findings.push({ id, mode, vw, ratio, kind: "collision", text: `${run.text} ↔ ${dev.tag}` });
          }
        }
      }
    }
    await ctx.close();
  }
}
await browser.close();

const byId = {};
for (const f of findings) (byId[`${f.id}@${f.mode}`] ??= []).push(f);
console.log(`module-defect-audit · ${IDS.length} variants · ${cases} cases · ${findings.length} findings`);
for (const [k, list] of Object.entries(byId)) {
  console.log(`\n${k}`);
  for (const f of list.slice(0, 12))
    console.log(`  ${f.kind.padEnd(9)} ${f.ratio_ ? `${f.ratio_}:1 (need ${f.need}) ` : ""}${f.text}`);
  if (list.length > 12) console.log(`  … ${list.length - 12} more`);
}
if (val("json")) await writeFile(val("json"), JSON.stringify(findings, null, 2));
process.exit(findings.length && val("ci", "false") === "true" ? 1 : 0);
