// -----------------------------------------------------------------------------
// Module editability audit.
//
// Exports every approved module through the REAL exporter (via the dev harness
// at /dev/export-verify) and grades each exported slide's object tree: is the
// module editable in PowerPoint, or did part of it bake into a picture?
//
//   node scripts/editability-audit.mjs [--url http://localhost:8080]
//                                     [--mode light|dark|both]
//                                     [--limit N] [--json out.json]
//
// Exit code 1 when any module grades `thin` or `flat`, i.e. a user cannot edit
// the module's graphic in PowerPoint.
// -----------------------------------------------------------------------------

import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { ensureChromiumLaunchOptions } from "./lib/ensure-chromium.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const BASE = flag("url", "http://localhost:8080").replace(/\/$/, "");
const MODES = flag("mode", "light") === "both" ? ["light", "dark"] : [flag("mode", "light")];
const LIMIT = Number(flag("limit", "0")) || 0;
const OFFSET = Number(flag("offset", "0")) || 0;
const JSON_OUT = flag("json", null);
const BATCH = 6;

const AREA = (r) => Math.max(0, r.w) * Math.max(0, r.h);

/** Same grading as src/lib/export-editability.ts, over one LayerReport. */
function grade(report) {
  const plates = report.objects.filter((o) => o.type === "plate");
  const content = report.objects.filter((o) => o.type !== "plate");
  const graphic = content.filter((o) => o.type !== "text");
  const plateArea = Math.min(
    1,
    plates.reduce((n, p) => n + AREA(p.rect), 0),
  );
  const issues = [];
  let g;
  if (content.length === 0) {
    g = "flat";
    issues.push("one flattened picture — nothing editable");
  } else if (plates.length === 0) {
    g = "native";
  } else if (graphic.length === 0) {
    g = "thin";
    issues.push("only copy is editable — module graphic baked into the plate");
  } else {
    g = "layered";
  }
  if (plates.length > 1) issues.push(`${plates.length} plates stacked`);
  for (const o of content.filter((o) => !o.editable)) {
    issues.push(`${o.type} "${o.name || o.id}" not editable`);
  }
  const editableShare = report.objects.length ? report.editableCount / report.objects.length : 0;
  return {
    grade: g,
    objects: report.objects.length,
    content: content.length,
    graphic: graphic.length,
    plates: plates.length,
    plateArea: Number(plateArea.toFixed(3)),
    text: report.counts.text,
    icons: report.counts.icon,
    images: report.counts.image,
    charts: report.counts.chart,
    score: Number((editableShare * (1 - 0.45 * plateArea)).toFixed(3)),
    issues,
  };
}

const launchOptions = await ensureChromiumLaunchOptions();
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
const page = await context.newPage();
page.setDefaultTimeout(600_000);

let exitCode = 0;
try {
  await page.goto(`${BASE}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__tpExportVerify));
  await page.evaluate(() => document.fonts?.ready);

  let variants = await page.evaluate(() => window.__tpExportVerify.variants);
  if (OFFSET > 0) variants = variants.slice(OFFSET);
  if (LIMIT > 0) variants = variants.slice(0, LIMIT);
  const jobs = [];
  for (const v of variants) for (const m of MODES) jobs.push([v, null, m]);
  console.log(`Grading ${jobs.length} exports (${variants.length} modules × ${MODES.length})…\n`);

  const rows = [];
  const ready = async () => {
    await page.goto(`${BASE}/dev/export-verify`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__tpExportVerify));
    await page.evaluate(() => document.fonts?.ready);
  };
  for (let i = 0; i < jobs.length; i += BATCH) {
    const slice = jobs.slice(i, i + BATCH);
    // The harness accumulates offscreen stages; reload periodically so a long
    // run cannot lose its execution context half way through.
    if (i > 0 && i % (BATCH * 8) === 0) await ready();
    let audits;
    try {
      audits = await page.evaluate((s) => window.__tpExportVerify.run(s), slice);
    } catch (err) {
      console.error(`  ! batch ${i} failed (${err?.message ?? err}) — reloading and retrying`);
      await ready();
      audits = await page.evaluate((s) => window.__tpExportVerify.run(s), slice);
    }
    for (const a of audits) {
      if (a.error || !a.layers?.length) {
        rows.push({ variantId: a.variantId, mode: a.mode, grade: "error", issues: [a.error ?? "no layer report"] });
        continue;
      }
      rows.push({ variantId: a.variantId, mode: a.mode, ...grade(a.layers[0]) });
    }
    process.stdout.write(`  …${Math.min(i + BATCH, jobs.length)}/${jobs.length}\n`);
  }

  const order = { error: 0, flat: 1, thin: 2, layered: 3, native: 4 };
  rows.sort((a, b) => order[a.grade] - order[b.grade] || a.score - b.score);

  const tally = rows.reduce((m, r) => ((m[r.grade] = (m[r.grade] ?? 0) + 1), m), {});
  console.log(`\nGrades: ${JSON.stringify(tally)}\n`);
  for (const r of rows) {
    const line = `${r.grade.padEnd(8)} ${String(r.score ?? "").padStart(5)}  ${r.variantId.padEnd(30)} ${r.mode}  obj:${r.objects ?? "-"} gfx:${r.graphic ?? "-"} plate:${r.plateArea ?? "-"}`;
    if (r.grade === "native" || r.grade === "layered") console.log(`  ✓ ${line}`);
    else {
      console.error(`  ✗ ${line}  ${r.issues.join("; ")}`);
      exitCode = 1;
    }
  }

  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ tally, rows }, null, 2));
} catch (err) {
  console.error(err);
  exitCode = 1;
} finally {
  await browser.close();
}
process.exit(exitCode);
