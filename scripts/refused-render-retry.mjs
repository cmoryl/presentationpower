#!/usr/bin/env node
/**
 * Re-render the packages PowerPoint refused during the parity sweep, one at a
 * time with a pause between uploads. The sweep ran 5 conversions concurrently;
 * this isolates "the package is bad" from "the online converter throttled us".
 *
 * Usage: node scripts/refused-render-retry.mjs [--dir artifacts/refused-diagnose]
 *                                              [--gap 4000] [--tries 2]
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderPptxWithPowerPoint, deleteDriveItem } from "./render-via-powerpoint.mjs";

const argv = process.argv.slice(2);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const DIR = path.resolve(value("dir", "artifacts/refused-diagnose"));
const GAP = Number(value("gap", 4000));
const TRIES = Number(value("tries", 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const files = (await readdir(DIR)).filter((f) => f.endsWith(".pptx")).sort();
const rows = [];
for (const f of files) {
  const bytes = await readFile(path.join(DIR, f));
  let ok = false;
  let attempts = 0;
  let error = null;
  let pdfBytes = 0;
  for (let t = 0; t < TRIES && !ok; t += 1) {
    attempts += 1;
    try {
      const res = await renderPptxWithPowerPoint(bytes, `retry-${Date.now()}-${f}`);
      pdfBytes = res.pdf?.length ?? 0;
      await writeFile(path.join(DIR, `${f}.pdf`), res.pdf);
      if (res.itemId) await deleteDriveItem(res.itemId).catch(() => {});
      ok = true;
    } catch (err) {
      error = String(err?.message ?? err).slice(0, 180);
      await sleep(GAP);
    }
  }
  rows.push({ file: f, mib: Number((bytes.length / 1048576).toFixed(2)), ok, attempts, pdfBytes, error });
  console.log(
    `${f.padEnd(34)} ${(bytes.length / 1048576).toFixed(2)} MiB · ` +
      (ok ? `OPENED on attempt ${attempts} (pdf ${(pdfBytes / 1024).toFixed(0)} KiB)` : `REFUSED: ${error}`),
  );
  await sleep(GAP);
}
await writeFile(path.join(DIR, "retry.json"), `${JSON.stringify(rows, null, 2)}\n`);
const opened = rows.filter((r) => r.ok).length;
console.log(`\nopened ${opened}/${rows.length} on serial retry`);
