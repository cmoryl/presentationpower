#!/usr/bin/env node
/**
 * Per-module space-utilisation audit.
 *
 * For every module card rendered on /library it measures the 1920×1080 stage
 * and reports how much of it the content actually occupies:
 *
 *   bandPct  — the largest contiguous horizontal strip with no content in it
 *              (a "dead band": the void that shows up when copy is pinned to
 *              one edge of a fixed-height block)
 *   rightPct — unused width on the right of the stage (reading-column clamp)
 *   fillPct  — share of stage rows that contain content
 *
 * Usage: node scripts/space-audit.mjs [--mode light|dark] [--limit N] [--json out.json]
 */
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"]);
    return acc;
  }, []),
);

const URL = args.url ?? "http://localhost:8080/library";
const LIMIT = args.limit ? Number(args.limit) : Infinity;

// Bands under this are ordinary rhythm, not a void.
const BAND_ALERT = 0.14;
const RIGHT_ALERT = 0.1;

const browser = await chromium.launch(headless: true === undefined ? {} : { headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-variant-card]", { timeout: 60_000 });
await page.waitForTimeout(4000);

const rows = await page.evaluate(
  ({ limit }) => {
    const out = [];
    const cards = Array.from(document.querySelectorAll("[data-variant-card]")).slice(0, limit);
    for (const card of cards) {
      const stage = card.querySelector("[data-slide-stage]");
      if (!stage) continue;
      const sr = stage.getBoundingClientRect();
      if (sr.width < 40 || sr.height < 20) continue;
      const leaves = Array.from(stage.querySelectorAll("*")).filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.06) return false;
        if (el.getAttribute("aria-hidden") === "true") return false;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        // Only count things that put ink down: text leaves, media, borders, fills.
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
        const painted =
          hasText ||
          el.tagName === "IMG" ||
          el.tagName === "SVG" ||
          el.tagName === "CANVAS" ||
          (cs.backgroundImage !== "none" && !cs.backgroundImage.includes("gradient(")) ||
          (cs.borderTopWidth !== "0px" && cs.borderTopStyle !== "none");
        return painted;
      });
      const H = 200;
      const rowsHit = new Array(H).fill(false);
      let minX = sr.right;
      let maxX = sr.left;
      for (const el of leaves) {
        const r = el.getBoundingClientRect();
        const a = Math.max(0, Math.floor(((r.top - sr.top) / sr.height) * H));
        const b = Math.min(H - 1, Math.ceil(((r.bottom - sr.top) / sr.height) * H));
        for (let i = a; i <= b; i++) rowsHit[i] = true;
        minX = Math.min(minX, r.left);
        maxX = Math.max(maxX, r.right);
      }
      let band = 0;
      let run = 0;
      for (let i = 0; i < H; i++) {
        if (!rowsHit[i]) {
          run++;
          band = Math.max(band, run);
        } else run = 0;
      }
      const fill = rowsHit.filter(Boolean).length / H;
      out.push({
        id: card.getAttribute("data-variant-id") ?? "?",
        family: card.getAttribute("data-variant-family") ?? "",
        bandPct: +(band / H).toFixed(3),
        rightPct: +Math.max(0, (sr.right - maxX) / sr.width).toFixed(3),
        leftPct: +Math.max(0, (minX - sr.left) / sr.width).toFixed(3),
        fillPct: +fill.toFixed(3),
        leaves: leaves.length,
      });
    }
    return out;
  },
  { limit: LIMIT === Infinity ? 100000 : LIMIT },
);

await browser.close();

const flagged = rows
  .filter((r) => r.bandPct >= BAND_ALERT || r.rightPct >= RIGHT_ALERT)
  .sort((a, b) => b.bandPct + b.rightPct - (a.bandPct + a.rightPct));

console.log(`measured ${rows.length} modules · ${flagged.length} with unused space`);
for (const r of flagged) {
  console.log(
    `${r.bandPct >= BAND_ALERT ? "BAND" : "    "} ${String(Math.round(r.bandPct * 100)).padStart(3)}%  right ${String(
      Math.round(r.rightPct * 100),
    ).padStart(3)}%  fill ${String(Math.round(r.fillPct * 100)).padStart(3)}%  ${r.id}`,
  );
}
if (args.json) await writeFile(args.json, JSON.stringify({ rows, flagged }, null, 2));
process.exit(0);
