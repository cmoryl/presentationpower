#!/usr/bin/env node
/**
 * MODULE CATALOG PPTX
 * ===================
 *
 * Drives /dev/module-catalog in a headless browser and writes the full module
 * library out as indexed, narrated, layered PowerPoint decks — one per mode.
 *
 *   node scripts/module-catalog-pptx.mjs                  # light + dark, all modules
 *   node scripts/module-catalog-pptx.mjs --sample 8       # smoke run
 *   node scripts/module-catalog-pptx.mjs --mode dark
 *   node scripts/module-catalog-pptx.mjs --out /mnt/documents
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const OUT_DIR = path.resolve(value("out", "/mnt/documents/module-library"));
const SAMPLE = Number(value("sample", 0));
const MODES = argv.includes("--mode") ? [value("mode", "light")] : ["light", "dark"];

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

async function openHarness(ctx) {
  const page = await ctx.newPage();
  page.on("console", (m) => {
    const t = m.text();
    if (/error|failed|missing/i.test(t)) console.log(`   [page] ${t.slice(0, 200)}`);
  });
  await page.goto(`${BASE_URL}/dev/module-catalog`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpModuleCatalog", null, { timeout: 180_000 });
  return page;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const results = [];

  try {
    for (const mode of MODES) {
      // A fresh page per mode: 190 plated slides is a lot of retained canvas.
      const page = await openHarness(ctx);
      const all = await page.evaluate(() => window.__tpModuleCatalog.variants);
      let ids = null;
      if (SAMPLE > 0 && SAMPLE < all.length) {
        const step = all.length / SAMPLE;
        ids = [...new Set(Array.from({ length: SAMPLE }, (_, i) => all[Math.floor(i * step)]))];
      }
      console.log(`catalog: ${mode} · ${(ids ?? all).length} module(s)`);
      const started = Date.now();
      const res = await page.evaluate(
        ([m, list]) => window.__tpModuleCatalog.build(m, list),
        [mode, ids],
      );
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      if (res.error || !res.pptx) {
        console.log(`  FAILED (${mode}): ${res.error ?? "no bytes"}`);
        results.push({ ...res, pptx: null });
        await page.close();
        continue;
      }
      const file = path.join(
        OUT_DIR,
        `TransPerfect-Module-Library-${mode === "dark" ? "Dark" : "Light"}.pptx`,
      );
      await writeFile(file, Buffer.from(res.pptx, "base64"));
      console.log(
        `  wrote ${file} · ${res.slides} slides · ${res.moduleCount} modules · ` +
          `${(res.bytes / 1e6).toFixed(1)} MB · ${secs}s` +
          (res.failedSlides.length ? ` · FAILED SLIDES: ${res.failedSlides.join(",")}` : "") +
          (res.warnings.length ? ` · ${res.warnings.length} warning(s)` : ""),
      );
      if (res.warnings.length) for (const w of res.warnings.slice(0, 10)) console.log(`    ! ${w}`);
      results.push({ ...res, pptx: null, file });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const bad = results.filter((r) => r.error || r.failedSlides?.length);
  console.log(`\ndone · ${results.length - bad.length}/${results.length} clean`);
  if (bad.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
