#!/usr/bin/env node
/**
 * Automated visual regression for the module library, per template/layout.
 *
 * Loads http://localhost:8080/library at each responsive breakpoint
 * (mobile / tablet / desktop), captures a PNG per module-variant card
 * bucketed by family — `tests/snapshots/library/<breakpoint>/<family>/<variantId>.png` —
 * and runs two overlap checks against every template:
 *
 *   1. Stat vs sibling-grid-track overlap  ([data-stat-figure] neighbors)
 *   2. Stage overflow                      (text escaping the 1920×1080 stage)
 *
 * Any finding not whitelisted in `library.baseline.json` fails the run
 * (exit 1) so template-specific regressions cannot slip in.
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
  // Force all preview cards to mount eagerly so no snapshot captures a skeleton.
  await page.addInitScript(() => { (window).__EAGER_PREVIEWS__ = true; });

  const eagerUrl = URL.includes("?") ? `${URL}&eager=1` : `${URL}?eager=1`;
  console.log(`\n→ [${bp}] ${viewport.width}×${viewport.height} · loading ${eagerUrl}`);
  await page.goto(eagerUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  if (MODE === "ab") {
    const ab = page.getByRole("button", { name: /A\/B/i }).first();
    if (await ab.count()) await ab.click().catch(() => {});
  } else {
    const btn = page.getByRole("button", { name: new RegExp(`^${MODE}$`, "i") }).first();
    if (await btn.count()) await btn.click().catch(() => {});
  }

  await page.waitForSelector("[data-variant-card]", { timeout: 30_000 });
  await page.waitForTimeout(1500);

  const cards = await page.$$eval("[data-variant-card]", (els) =>
    els.map((el, i) => ({
      variantId: el.getAttribute("data-variant-id") ?? `card-${i}`,
      family: el.getAttribute("data-variant-family") ?? "unknown",
      layout: el.getAttribute("data-variant-layout") ?? "",
    })),
  );
  console.log(`  ${cards.length} cards · mode=${MODE}`);

  const overlaps = [];
  const captured = [];
  const familyStats = new Map(); // family -> { total, overlapping, overflowing }

  for (const { variantId, family, layout } of cards) {
    const selector = `[data-variant-card][data-variant-id="${variantId.replace(/"/g, '\\"')}"]`;
    const card = await page.$(selector);
    if (!card) continue;

    await card.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(80);

    const findings = await card.evaluate((root, tol) => {
      const out = { statOverlaps: [], stageOverflows: [] };

      // 1) Stat vs sibling-grid-track overlaps
      const stats = Array.from(root.querySelectorAll("[data-stat-figure]"));
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
            out.statOverlaps.push({
              statSize: s.getAttribute("data-stat-figure"),
              statText: (s.textContent || "").trim().slice(0, 80),
              siblingText: (sib.textContent || "").trim().slice(0, 80),
              overlapPx: { x: Math.round(overlapX), y: Math.round(overlapY) },
            });
          }
        }
      }

      // 2) Per-template stage overflow: any text-bearing descendant whose
      // bounding box escapes the 1920×1080 stage. Runs in the same untransformed
      // coordinate space as the stage itself so it's stable across breakpoints.
      const stages = Array.from(root.querySelectorAll('[data-slide-stage=""], [data-slide-stage]'));
      for (const stage of stages) {
        const stageRect = stage.getBoundingClientRect();
        if (stageRect.width === 0 || stageRect.height === 0) continue;
        const nodes = stage.querySelectorAll("h1,h2,h3,h4,p,li,span,[data-stat-figure]");
        for (const n of nodes) {
          const t = (n.textContent || "").trim();
          if (!t) continue;
          // Skip the stage's own transform-preserving wrappers.
          const nr = n.getBoundingClientRect();
          if (nr.width === 0 || nr.height === 0) continue;
          const overX = Math.max(0, nr.right - stageRect.right, stageRect.left - nr.left);
          const overY = Math.max(0, nr.bottom - stageRect.bottom, stageRect.top - nr.top);
          if (overX > tol || overY > tol) {
            out.stageOverflows.push({
              text: t.slice(0, 80),
              overflowPx: { x: Math.round(overX), y: Math.round(overY) },
            });
            if (out.stageOverflows.length >= 6) break;
          }
        }
      }
      return out;
    }, TOLERANCE_PX);

    // Group snapshots by family so per-template regressions are easy to eyeball.
    const familyDir = path.join(bpOut, family.replace(/[^a-z0-9._-]/gi, "_") || "unknown");
    await mkdir(familyDir, { recursive: true });
    const shotPath = path.join(familyDir, `${variantId}.png`);
    await card.screenshot({ path: shotPath }).catch(() => {});

    const hasStat = findings.statOverlaps.length > 0;
    const hasOverflow = findings.stageOverflows.length > 0;
    captured.push({
      variantId,
      family,
      layout,
      shot: path.relative(process.cwd(), shotPath),
      statOverlapCount: findings.statOverlaps.length,
      stageOverflowCount: findings.stageOverflows.length,
    });
    if (hasStat || hasOverflow) overlaps.push({ variantId, family, layout, findings });

    const fs = familyStats.get(family) ?? { family, total: 0, overlapping: 0, overflowing: 0 };
    fs.total += 1;
    if (hasStat) fs.overlapping += 1;
    if (hasOverflow) fs.overflowing += 1;
    familyStats.set(family, fs);
  }

  await context.close();

  const unexpected = overlaps.filter((o) => !isAllowed(o.variantId, bp));
  totalUnexpected += unexpected.length;

  perBreakpoint.push({
    breakpoint: bp,
    viewport,
    totalCards: cards.length,
    overlappingCards: overlaps.length,
    unexpectedCount: unexpected.length,
    byFamily: Array.from(familyStats.values()).sort((a, b) => a.family.localeCompare(b.family)),
    overlaps,
    captured,
  });

  console.log(`  overlaps: ${overlaps.length} (unexpected: ${unexpected.length})`);
  if (unexpected.length) {
    for (const o of unexpected) {
      console.error(`   ✖ [${bp}] ${o.variantId} · ${o.family}`);
      for (const f of o.findings.statOverlaps.slice(0, 2)) {
        console.error(`       stat "${f.statText}" ↔ "${f.siblingText}" (${f.overlapPx.x}×${f.overlapPx.y}px)`);
      }
      for (const f of o.findings.stageOverflows.slice(0, 2)) {
        console.error(`       stage overflow "${f.text}" (+${f.overflowPx.x}×${f.overflowPx.y}px)`);
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
