#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Image re-encode performance benchmark runner.
//
// Drives the /dev/image-bench harness in a real browser (the pipeline is
// canvas-based, so there is no meaningful headless-Node equivalent) and prints a
// table of encode time and output size per format / transparency / export option.
//
//   node scripts/bench-image-reencode.mjs [--runs 5] [--json out.json] [--base http://localhost:8080]
//
// Exit code is non-zero only on harness failure — this is a measurement tool,
// not a gate. Pass --max-ms-per-mp N to also fail when any case is slower than
// N ms per megapixel, which is how you wire it into CI once a baseline exists.
// -----------------------------------------------------------------------------

import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const runs = Number(flag("runs", "5"));
const base = flag("base", "http://localhost:8080").replace(/\/$/, "");
const jsonOut = flag("json", "");
const maxMsPerMp = flag("max-ms-per-mp", "") ? Number(flag("max-ms-per-mp", "")) : null;

const fmtBytes = (n) =>
  n >= 1_000_000 ? `${(n / 1_048_576).toFixed(2)}MB` : n >= 1_000 ? `${(n / 1024).toFixed(1)}KB` : `${n}B`;

const pad = (s, w) => String(s).padEnd(w);
const padL = (s, w) => String(s).padStart(w);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") console.error(`[browser] ${m.text()}`);
  });
  await page.goto(`${base}/dev/image-bench`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__tpImageBench, undefined, { timeout: 120_000 });

  const report = await page.evaluate((n) => window.__tpImageBench.run(n), runs);

  console.log(`\nImage re-encode benchmark — ${report.runs} runs/case`);
  console.log(`${report.userAgent}`);
  console.log(`total ${(report.durationMs / 1000).toFixed(1)}s\n`);

  const head =
    pad("option", 12) +
    pad("sample", 18) +
    pad("out", 6) +
    pad("mode", 13) +
    padL("in", 9) +
    padL("out", 9) +
    padL("ratio", 8) +
    padL("median", 10) +
    padL("p95", 10) +
    padL("ms/MP", 9);
  console.log(head);
  console.log("-".repeat(head.length));

  let slowest = null;
  for (const r of report.rows) {
    if (!slowest || r.msPerMegapixel > slowest.msPerMegapixel) slowest = r;
    console.log(
      pad(r.option, 12) +
        pad(r.sample, 18) +
        pad(r.outputFormat, 6) +
        pad(r.reencoded ? "re-encoded" : "pass-through", 13) +
        padL(fmtBytes(r.inputBytes), 9) +
        padL(fmtBytes(r.outputBytes), 9) +
        padL(`${r.sizeRatio.toFixed(2)}x`, 8) +
        padL(`${r.medianMs.toFixed(1)}ms`, 10) +
        padL(`${r.p95Ms.toFixed(1)}ms`, 10) +
        padL(r.msPerMegapixel.toFixed(1), 9),
    );
  }

  // Per-option roll-up: the practical cost of switching an export toggle on.
  console.log("");
  const byOption = new Map();
  for (const r of report.rows) {
    const acc = byOption.get(r.option) ?? { ms: 0, out: 0, inp: 0, n: 0, reencoded: 0 };
    acc.ms += r.medianMs;
    acc.out += r.outputBytes;
    acc.inp += r.inputBytes;
    acc.n += 1;
    acc.reencoded += r.reencoded ? 1 : 0;
    byOption.set(r.option, acc);
  }
  for (const [option, a] of byOption) {
    console.log(
      `${pad(option, 12)} ${padL(`${a.ms.toFixed(0)}ms`, 8)} total encode · ` +
        `${a.reencoded}/${a.n} re-encoded · payload ${fmtBytes(a.inp)} → ${fmtBytes(a.out)} ` +
        `(${(a.out / Math.max(1, a.inp)).toFixed(2)}x)`,
    );
  }
  console.log(`\nslowest case: ${slowest.option}/${slowest.sample} @ ${slowest.msPerMegapixel.toFixed(1)} ms/MP`);

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(report, null, 2));
    console.log(`wrote ${jsonOut}`);
  }

  if (maxMsPerMp !== null) {
    const over = report.rows.filter((r) => r.msPerMegapixel > maxMsPerMp);
    if (over.length) {
      console.error(
        `\nFAIL ${over.length} case(s) over ${maxMsPerMp} ms/MP:\n` +
          over.map((r) => `  ${r.option}/${r.sample} ${r.msPerMegapixel.toFixed(1)}`).join("\n"),
      );
      process.exitCode = 1;
    } else {
      console.log(`\nPASS all cases under ${maxMsPerMp} ms/MP`);
    }
  }
} finally {
  await browser.close();
}
