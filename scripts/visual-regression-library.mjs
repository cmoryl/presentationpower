#!/usr/bin/env node
/**
 * Automated visual regression + stat-overlap check for the module library
 * across responsive breakpoints (mobile, tablet, desktop).
 *
 * Loads http://localhost:8080/library at each configured viewport, iterates
 * every [data-variant-card], inspects each preview stage for
 * [data-stat-figure] elements that overlap a sibling grid track, and
 * captures per-breakpoint PNGs + a JSON report. Any overlap not
 * whitelisted in library.baseline.json fails the run (exit 1).
 *
 *   node scripts/visual-regression-library.mjs \
 *     [--mode light|dark|ab] [--out DIR] [--baseline PATH] \
 *     [--breakpoints mobile,tablet,desktop] [--tolerance 2]
 *
 * Baseline entries may be either a bare variantId (all breakpoints) or the
 * scoped form `variantId@breakpoint` for a single breakpoint.
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"]);
    return acc;
  }, []),
);

const MODE = args.mode ?? "ab";
const OUT = path.resolve(args.out ?? "tests/snapshots/library");
const BASELINE = path.resolve(args.baseline ?? "tests/snapshots/library.baseline.json");
const URL = args.url ?? "http://localhost:8080/library";
const TOLERANCE_PX = Number(args.tolerance ?? 2);

// Canonical responsive breakpoints. Widths chosen to match the app's own
// mobile (<768) / tablet (768–1279) / desktop (≥1280) tiers so we exercise
// each grid column count the library switches through.
const BREAKPOINT_PRESETS = {
  mobile:  { width: 390,  height: 1800, deviceScaleFactor: 1 },
  tablet:  { width: 834,  height: 1800, deviceScaleFactor: 1 },
  desktop: { width: 1440, height: 1800, deviceScaleFactor: 1 },
};
const BREAKPOINTS = (args.breakpoints ?? "mobile,tablet,desktop")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

for (const bp of BREAKPOINTS) {
  if (!BREAKPOINT_PRESETS[bp]) {
    console.error(`Unknown breakpoint '${bp}'. Choose from: ${Object.keys(BREAKPOINT_PRESETS).join(", ")}`);
    process.exit(2);
  }
}

await mkdir(OUT, { recursive: true });

const baseline = existsSync(BASELINE)
  ? JSON.parse(await readFile(BASELINE, "utf8"))
  : { allowedOverlaps: [] };
const allowed = new Set(baseline.allowedOverlaps ?? []);
const isAllowed = (variantId, bp) => allowed.has(variantId) || allowed.has(`${variantId}@${bp}`);

const launchOpts = { headless: true };
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
}
const browser = await chromium.launch(launchOpts);

const perBreakpoint = [];
let totalUnexpected = 0;

for (const bp of BREAKPOINTS) {
  const viewport = BREAKPOINT_PRESETS[bp];
  const bpOut = path.join(OUT, bp);
  await mkdir(bpOut, { recursive: true });

  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.deviceScaleFactor });
  const page = await context.newPage();

  console.log(`\n→ [${bp}] ${viewport.width}×${viewport.height} · loading ${URL}`);
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

  if (MODE === "ab") {
    const ab = page.getByRole("button", { name: /A\/B/i }).first();
    if (await ab.count()) await ab.click().catch(() => {});
  } else {
    const btn = page.getByRole("button", { name: new RegExp(`^${MODE}$`, "i") }).first();
    if (await btn.count()) await btn.click().catch(() => {});
  }

  await page.waitForSelector("[data-variant-card]", { timeout: 30_000 });
  await page.waitForTimeout(1500);

  const cardIds = await page.$$eval("[data-variant-card]", (els) =>
    els.map((el, i) => el.getAttribute("data-variant-id") ?? `card-${i}`),
  );
  console.log(`  ${cardIds.length} cards · mode=${MODE}`);

  const overlaps = [];
  const captured = [];

  for (const variantId of cardIds) {
    const selector = `[data-variant-card][data-variant-id="${variantId.replace(/"/g, '\\"')}"]`;
    const card = await page.$(selector);
    if (!card) continue;

    await card.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(80);

    const findings = await card.evaluate((root, tol) => {
      const stats = Array.from(root.querySelectorAll("[data-stat-figure]"));
      const out = [];
      for (const s of stats) {
        const sr = s.getBoundingClientRect();
        if (sr.width === 0 || sr.height === 0) continue;
        let parent = s.parentElement;
        let hops = 0;
        while (parent && hops < 6) {
          const cs = getComputedStyle(parent);
          if (cs.display === "grid" || cs.display === "flex") break;
          parent = parent.parentElement;
          hops++;
        }
        if (!parent) continue;
        const siblings = Array.from(parent.children).filter((c) => c !== s && !s.contains(c) && !c.contains(s));
        for (const sib of siblings) {
          const sbr = sib.getBoundingClientRect();
          if (sbr.width === 0 || sbr.height === 0) continue;
          const overlapX = Math.min(sr.right, sbr.right) - Math.max(sr.left, sbr.left);
          const overlapY = Math.min(sr.bottom, sbr.bottom) - Math.max(sr.top, sbr.top);
          if (overlapX > tol && overlapY > tol) {
            out.push({
              statSize: s.getAttribute("data-stat-figure"),
              statText: (s.textContent || "").trim().slice(0, 80),
              siblingText: (sib.textContent || "").trim().slice(0, 80),
              overlapPx: { x: Math.round(overlapX), y: Math.round(overlapY) },
            });
          }
        }
      }
      return out;
    }, TOLERANCE_PX);

    const shotPath = path.join(bpOut, `${variantId}.png`);
    await card.screenshot({ path: shotPath }).catch(() => {});
    captured.push({ variantId, shot: path.relative(process.cwd(), shotPath), overlapCount: findings.length });
    if (findings.length > 0) overlaps.push({ variantId, findings });
  }

  await context.close();

  const unexpected = overlaps.filter((o) => !isAllowed(o.variantId, bp));
  totalUnexpected += unexpected.length;

  perBreakpoint.push({
    breakpoint: bp,
    viewport,
    totalCards: cardIds.length,
    overlappingCards: overlaps.length,
    unexpectedCount: unexpected.length,
    overlaps,
    captured,
  });

  console.log(`  overlaps: ${overlaps.length} (unexpected: ${unexpected.length})`);
  if (unexpected.length) {
    for (const o of unexpected) {
      console.error(`   ✖ [${bp}] ${o.variantId}`);
      for (const f of o.findings.slice(0, 2)) {
        console.error(`       "${f.statText}" ↔ "${f.siblingText}" (${f.overlapPx.x}×${f.overlapPx.y}px)`);
      }
    }
  }
}

await browser.close();

const report = {
  url: URL,
  mode: MODE,
  tolerancePx: TOLERANCE_PX,
  ranAt: new Date().toISOString(),
  breakpoints: perBreakpoint,
};
const reportPath = path.join(OUT, "report.json");
await writeFile(reportPath, JSON.stringify(report, null, 2));

console.log(`\n▸ Snapshots → ${path.relative(process.cwd(), OUT)}/<breakpoint>/*.png`);
console.log(`▸ Report    → ${path.relative(process.cwd(), reportPath)}`);
console.log(`▸ Baseline allows: ${allowed.size} entries`);

if (totalUnexpected > 0) {
  console.error(`\n✖ ${totalUnexpected} unexpected overlap(s) across breakpoints.`);
  process.exit(1);
}

console.log("\n✓ No unexpected overlaps across all breakpoints.");
