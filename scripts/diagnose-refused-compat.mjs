#!/usr/bin/env bun
/**
 * Second half of the refused-package investigation: re-parse the .pptx files
 * captured by scripts/diagnose-refused-packages.mjs and run the shipping
 * compatibility diagnosis over them (pptx-compat-diagnose). Node-side, because
 * the importer wants Buffer.
 *
 * Usage: bun scripts/diagnose-refused-compat.mjs [--dir artifacts/refused-diagnose]
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsePptxBuffer } from "../src/lib/pptx-import.ts";
import { diagnoseImportedDeck, safeFixes, reviewQueue } from "../src/lib/pptx-compat-diagnose.ts";

const argv = process.argv.slice(2);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const DIR = path.resolve(value("dir", "artifacts/refused-diagnose"));

const files = (await readdir(DIR)).filter((f) => f.endsWith(".pptx")).sort();
const rows = [];
for (const f of files) {
  const buf = await readFile(path.join(DIR, f));
  let row = { file: f, bytes: buf.length };
  try {
    const parsed = await parsePptxBuffer(buf, f, { validateDiagrams: false });
    const report = diagnoseImportedDeck(parsed);
    row = {
      ...row,
      slides: parsed.deck?.slides?.length ?? parsed.slides?.length ?? null,
      blockers: (report.issues ?? []).filter((i) => i.severity === "blocker").length,
      warnings: (report.issues ?? []).filter((i) => i.severity === "warning").length,
      autoFixes: safeFixes(report).length,
      review: reviewQueue(report).length,
      codes: [...new Set((report.issues ?? []).map((i) => `${i.severity}:${i.code}`))],
    };
  } catch (err) {
    row.error = String(err?.message ?? err).slice(0, 240);
  }
  rows.push(row);
  console.log(
    `${row.file.padEnd(34)} ${(row.bytes / 1048576).toFixed(2)} MiB · ` +
      (row.error
        ? `PARSE FAIL: ${row.error}`
        : `slides ${row.slides} · blockers ${row.blockers} · warnings ${row.warnings} · ` +
          `${row.codes.join(", ") || "clean"}`),
  );
}
await writeFile(path.join(DIR, "compat.json"), `${JSON.stringify(rows, null, 2)}\n`);
console.log(`\nwrote ${path.join(DIR, "compat.json")}`);
