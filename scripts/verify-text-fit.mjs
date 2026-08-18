#!/usr/bin/env node
/**
 * FULL-LIBRARY TRACKED-TEXT FIT SWEEP
 * ===================================
 *
 * Exports EVERY approved module through the real exporter and audits the emitted
 * slide XML for the two causes of the clipped-label defect (translucent tracked
 * runs, and tracked strings wider than their box). No rasterizing, no
 * LibreOffice — so the whole 190-module library is coverable in minutes.
 *
 *   node scripts/verify-text-fit.mjs                       # every module, light + dark
 *   node scripts/verify-text-fit.mjs --modes light
 *   node scripts/verify-text-fit.mjs --sample 20
 *   node scripts/verify-text-fit.mjs --variant MV-QUOTE-PORTRAIT
 *   node scripts/verify-text-fit.mjs --fidelity layered
 *   node scripts/verify-text-fit.mjs --ci                   # exit 1 on any problem
 */
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const values = (n) =>
  argv.reduce((a, v, i) => (v === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const MODES = value("modes", "light,dark").split(",");
const FIDELITY = value("fidelity", "editable");
const SAMPLE = value("sample", null) == null ? null : Number(value("sample", 0));
const ONLY = values("variant");
const BATCH = Number(value("batch", 6));
const OUT = path.resolve(value("out", "artifacts/text-fit/report.json"));

async function launchChromium() {
  const envExe = process.env.PW_CHROME || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (envExe && existsSync(envExe)) return chromium.launch({ headless: true, executablePath: envExe });
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!root || !existsSync(root)) throw err;
    for (const dir of readdirSync(root).filter((d) => d.startsWith("chromium"))) {
      for (const rel of ["chrome-linux/chrome", "chrome-linux/headless_shell"]) {
        const exe = path.join(root, dir, rel);
        if (existsSync(exe)) return chromium.launch({ headless: true, executablePath: exe });
      }
    }
    throw err;
  }
}

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpExportVerify", null, { timeout: 120_000 });
  // The measurer must use the real shipped webfont, not a fallback face.
  await page.evaluate(() => document.fonts.ready);
  return page;
}

function sample(all, n) {
  if (!n || n >= all.length) return [...all];
  const step = all.length / n;
  return [...new Set(Array.from({ length: n }, (_, i) => all[Math.floor(i * step)]))];
}

async function main() {
  const browser = await launchChromium();
  let page = await boot(browser);
  const all = await page.evaluate(() => window.__tpExportVerify.variants);
  // `--from`/`--to` slice the module list so a big sweep can be run in halves
  // (each run is a fresh browser, which keeps the harness under its memory cap).
  const selected = ONLY.length ? ONLY : sample(all, SAMPLE);
  const FROM = Number(value("from", 0)) || 0;
  const TO = value("to", null) == null ? selected.length : Number(value("to", 0));
  const variants = selected.slice(FROM, TO);

  const jobs = [];
  for (const mode of MODES) for (const v of variants) jobs.push([v, null, mode, FIDELITY]);
  console.log(
    `text-fit: ${variants.length}/${all.length} modules × ${MODES.length} modes = ${jobs.length} exports (fidelity ${FIDELITY})`,
  );

  const rows = [];
  for (let i = 0; i < jobs.length; i += BATCH) {
    const batch = jobs.slice(i, i + BATCH);
    try {
      rows.push(...(await page.evaluate((j) => window.__tpExportVerify.textFit(j), batch)));
    } catch (err) {
      console.warn(`  harness restart at ${i}: ${String(err).slice(0, 120)}`);
      page = await boot(browser);
      for (const job of batch) {
        try {
          rows.push(...(await page.evaluate((j) => window.__tpExportVerify.textFit(j), [job])));
        } catch (err2) {
          rows.push({
            variantId: job[0],
            packId: null,
            mode: job[2],
            fidelity: FIDELITY,
            slides: 0,
            runs: 0,
            problems: [],
            error: String(err2).slice(0, 200),
          });
          page = await boot(browser);
        }
      }
    }
    const bad = rows.filter((r) => r.problems.length || r.error).length;
    process.stdout.write(`  ${Math.min(i + BATCH, jobs.length)}/${jobs.length} · flagged ${bad}\r`);
  }
  console.log("");
  await browser.close();

  const flagged = rows.filter((r) => r.problems.length || r.error);
  const byKind = {};
  for (const r of rows) for (const p of r.problems) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), fidelity: FIDELITY, modes: MODES, rows }, null, 2)}\n`,
  );

  const totalRuns = rows.reduce((n, r) => n + r.runs, 0);
  console.log(`Audited ${totalRuns} text runs across ${rows.length} exports.`);
  console.log(`Report → ${path.relative(process.cwd(), OUT)}`);
  if (!flagged.length) {
    console.log("No tracked-text clipping risks found.");
    return;
  }

  console.error(`\nTEXT-FIT PROBLEMS: ${flagged.length} of ${rows.length} exports.`);
  for (const [kind, n] of Object.entries(byKind)) console.error(`  ${kind}: ${n}`);
  for (const r of flagged.slice(0, 60)) {
    console.error(`\n  ✗ ${r.variantId} · ${r.mode}${r.error ? ` · ERROR ${r.error}` : ""}`);
    for (const p of r.problems.slice(0, 6)) {
      console.error(`      [${p.kind}] "${p.text}" — ${p.detail}`);
    }
    if (r.problems.length > 6) console.error(`      … ${r.problems.length - 6} more`);
  }
  if (flag("ci")) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
