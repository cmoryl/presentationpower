#!/usr/bin/env node
/**
 * MERGE RESTYLE COVERAGE LEDGERS
 * ==============================
 *
 * Each sharded sweep writes its own tests/snapshots/export-verify.coverage.json.
 * This merges every shard's ledger (plus the committed one) into a single union
 * and refreshes the manifest's coverage record, so the gate sees the combined
 * progress of all shards rather than the last one to finish.
 *
 *   node scripts/merge-restyle-coverage.mjs shards/   # dir of downloaded artifacts
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const LEDGER = path.resolve("tests/snapshots/export-verify.coverage.json");
const MANIFEST = path.resolve("tests/snapshots/export-verify.manifest.json");
const root = process.argv[2] ?? "shards";

function findLedgers(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...findLedgers(p));
    else if (name === "export-verify.coverage.json") out.push(p);
  }
  return out;
}

const files = [...(existsSync(LEDGER) ? [LEDGER] : []), ...findLedgers(root)];
if (files.length === 0) {
  console.error("no coverage ledgers found");
  process.exit(1);
}

const ledgers = [];
for (const f of files) {
  try {
    ledgers.push(JSON.parse(await readFile(f, "utf8")));
  } catch {
    console.warn(`skipping unreadable ledger ${f}`);
  }
}

// Only ledgers for the same matrix can be unioned; keep the newest fingerprint.
const newest = ledgers.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
const same = ledgers.filter((l) => l.fingerprint === newest.fingerprint);
const cells = {};
for (const l of same) {
  for (const [key, ids] of Object.entries(l.cells ?? {})) {
    cells[key] = [...new Set([...(cells[key] ?? []), ...ids])].sort();
  }
}
const merged = {
  fingerprint: newest.fingerprint,
  updatedAt: new Date().toISOString(),
  cells,
};
await writeFile(LEDGER, `${JSON.stringify(merged, null, 2)}\n`);

const verifiedCells = Object.values(cells).reduce((n, ids) => n + ids.length, 0);
if (existsSync(MANIFEST)) {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const complete = verifiedCells >= manifest.jobs;
  await writeFile(
    MANIFEST,
    `${JSON.stringify(
      {
        ...manifest,
        verifiedAt: new Date().toISOString(),
        coverage: complete ? "full" : "sampled",
        verifiedCells,
      },
      null,
      2,
    )}\n`,
  );
}
console.log(
  `merged ${same.length}/${ledgers.length} ledgers · ${verifiedCells} restyle cells verified`,
);
