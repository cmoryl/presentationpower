#!/usr/bin/env node
/**
 * PLACEMENT VERIFICATION (export ↔ design baselines)
 * =================================================
 *
 * Proves that nothing shifts between the design and what lands in an exported
 * PPTX plate or print raster — in particular after animation changes.
 *
 * For each job the /dev/placement-verify harness fingerprints the real export
 * stage (every plane, heading, stat, icon, media plate) in design space, plays
 * the full intro cascade over that same tree, waits for it to settle, and
 * re-fingerprints before and after cleanup. Placement must match at ZERO
 * tolerance and the before/after rasters must be byte-identical.
 *
 * This script then diffs each fingerprint digest against the committed baseline
 * (tests/snapshots/export-placement.baseline.json) so an intentional layout
 * change has to be reviewed and re-baselined.
 *
 *   node scripts/verify-placement.mjs                  # sampled sweep (CI default)
 *   node scripts/verify-placement.mjs --full           # every module, both modes
 *   node scripts/verify-placement.mjs --sample 14
 *   node scripts/verify-placement.mjs --update         # re-baseline (review the diff!)
 *   node scripts/verify-placement.mjs --no-raster      # placement only (faster)
 *   node scripts/verify-placement.mjs --url http://localhost:8080
 */
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, fallback) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const FULL = flag("full");
const SAMPLE = Number(value("sample", 10));
const UPDATE = flag("update");
const RASTER = !flag("no-raster");
const BASELINE = path.resolve(
  value("baseline", "tests/snapshots/export-placement.baseline.json"),
);
const BATCH = Number(value("batch", 4));

async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!root || !existsSync(root)) throw err;
    for (const dir of readdirSync(root).filter((d) => d.startsWith("chromium"))) {
      for (const rel of [
        "chrome-linux/chrome",
        "chrome-linux/headless_shell",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      ]) {
        const exe = path.join(root, dir, rel);
        if (existsSync(exe)) return await chromium.launch({ headless: true, executablePath: exe });
      }
    }
    throw err;
  }
}

async function loadBaseline() {
  if (!existsSync(BASELINE)) return { version: 1, entries: {}, allowedDrift: {} };
  try {
    return JSON.parse(await readFile(BASELINE, "utf8"));
  } catch {
    return { version: 1, entries: {}, allowedDrift: {} };
  }
}

function jobKey(job) {
  const [kind, target, packId, mode] = job;
  return `${kind}:${target}@${packId ?? "base"}@${mode}`;
}

async function main() {
  const browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`  [console] ${m.text().slice(0, 200)}`);
  });

  await page.goto(`${BASE_URL}/dev/placement-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__tpPlacementVerify, null, { timeout: 90_000 });

  const variants = await page.evaluate(() => window.__tpPlacementVerify.variants);
  const printKinds = await page.evaluate(() => window.__tpPlacementVerify.printKinds);

  const picked = FULL ? variants : variants.filter((_, i) => i % Math.max(1, Math.ceil(variants.length / SAMPLE)) === 0);
  const modes = FULL ? ["light", "dark"] : ["dark"];

  /** @type {any[]} */
  const jobs = [];
  for (const mode of modes) {
    for (const v of picked) jobs.push(["slide", v, null, mode]);
    for (const k of printKinds) jobs.push(["print", k, null, mode]);
  }

  console.log(
    `Placement verification · ${jobs.length} jobs (${picked.length} modules × ${modes.length} mode(s) + ${printKinds.length} print layouts)`,
  );

  const baseline = await loadBaseline();
  /** @type {any[]} */
  const reports = [];
  for (let i = 0; i < jobs.length; i += BATCH) {
    const slice = jobs.slice(i, i + BATCH);
    const out = await page.evaluate(
      ([batch, raster]) => window.__tpPlacementVerify.run(batch, { raster }),
      [slice, RASTER],
    );
    reports.push(...out);
    for (const r of out) {
      const key = jobKey([r.kind, r.target, r.packId, r.mode]);
      const mark = r.ok ? "ok" : "FAIL";
      console.log(`  ${mark.padEnd(4)} ${key} · ${r.entries} elements · ${r.digest ?? "-"}`);
      for (const p of r.problems) console.log(`       ! ${p}`);
      for (const d of r.drift) console.log(`       · ${d}`);
    }
  }

  await browser.close();

  // ── Baseline comparison ──────────────────────────────────────────────────
  const failures = [];
  const nextEntries = { ...(UPDATE ? {} : baseline.entries) };
  for (const r of reports) {
    const key = jobKey([r.kind, r.target, r.packId, r.mode]);
    if (!r.ok) {
      failures.push(`${key}: ${r.problems.join("; ")}${r.error ? ` (${r.error})` : ""}`);
      continue;
    }
    const known = baseline.entries?.[key];
    if (!UPDATE && known && known.digest !== r.digest) {
      if (baseline.allowedDrift?.[key]) {
        console.log(`  note ${key} drifted but is allowed: ${baseline.allowedDrift[key]}`);
      } else {
        failures.push(
          `${key}: placement digest drifted from baseline (${known.digest} → ${r.digest}, ${known.entries} → ${r.entries} elements). Re-run with --update if intentional.`,
        );
      }
    }
    nextEntries[key] = { digest: r.digest, entries: r.entries };
  }

  if (UPDATE || (!failures.length && !existsSync(BASELINE))) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        {
          version: 1,
          generatedAt: new Date().toISOString(),
          note:
            "Placement fingerprints for exported slides / print pages. Regenerate with `npm run verify:placement:update` and review the digest diff — a change here means content moved in every export.",
          allowedDrift: baseline.allowedDrift ?? {},
          entries: Object.fromEntries(Object.entries(nextEntries).sort(([a], [b]) => a.localeCompare(b))),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`\nBaseline written: ${path.relative(process.cwd(), BASELINE)}`);
  }

  if (failures.length) {
    console.error(`\n${failures.length} placement failure(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\nAll ${reports.length} jobs hold their placement (0px drift).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
