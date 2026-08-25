// -----------------------------------------------------------------------------
// Headless export audit.
//
// Loads /admin/export-audit in a real browser, runs every live export check
// (the actual exporters, against real rendered fixtures), and gates on the
// byte-level verdicts. Also asserts that every check id the export registry
// depends on is actually implemented by the harness.
//
//   node scripts/export-audit.mjs [--url http://localhost:8080] [--json out.json]
// -----------------------------------------------------------------------------

import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { ensureChromiumLaunchOptions } from "./lib/ensure-chromium.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = flag("url", "http://localhost:8080").replace(/\/$/, "");
const JSON_OUT = flag("json", null);

let launchOptions;
try {
  launchOptions = await ensureChromiumLaunchOptions();
} catch (err) {
  console.error(`\n✗ cannot start the headless export gate.\n\n${err?.message ?? err}\n`);
  process.exit(1);
}

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

let exitCode = 0;
try {
  await page.goto(`${BASE}/admin/export-audit`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__tpExportAudit), null, { timeout: 60_000 });
  await page.evaluate(() => document.fonts?.ready);

  const meta = await page.evaluate(() => ({
    checkIds: window.__tpExportAudit.checkIds,
    requiredCheckIds: window.__tpExportAudit.requiredCheckIds,
    registrySize: window.__tpExportAudit.registrySize,
  }));

  const missing = meta.requiredCheckIds.filter((id) => !meta.checkIds.includes(id));
  if (missing.length > 0) {
    console.error(
      `✗ registry references checks the harness does not implement: ${missing.join(", ")}`,
    );
    exitCode = 1;
  }

  console.log(
    `Running ${meta.checkIds.length} export checks against ${meta.registrySize} registry rows…\n`,
  );
  const results = await page.evaluate(() => window.__tpExportAudit.run(), null, {
    timeout: 600_000,
  });

  let pass = 0;
  for (const r of results) {
    const kb = r.bytes ? `${(r.bytes / 1024).toFixed(0)} KB` : "0 KB";
    if (r.status === "pass") {
      pass++;
      console.log(`  ✓ ${r.id.padEnd(20)} ${kb.padStart(9)}  ${r.detail}  (${r.ms} ms)`);
    } else {
      console.error(`  ✗ ${r.id.padEnd(20)} ${kb.padStart(9)}  ${r.problems.join("; ")}`);
      exitCode = 1;
    }
  }

  console.log(`\n${pass}/${results.length} export checks passed.`);
  if (consoleErrors.length > 0) {
    console.log(`\nBrowser console errors (${consoleErrors.length}):`);
    for (const e of consoleErrors.slice(0, 10)) console.log(`  · ${e}`);
  }
  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ meta, results, consoleErrors }, null, 2));
    console.log(`\nReport written to ${JSON_OUT}`);
  }
} catch (err) {
  console.error(`✗ export audit crashed: ${err?.message ?? err}`);
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);
