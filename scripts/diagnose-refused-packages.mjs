#!/usr/bin/env node
/**
 * Diagnose the packages real PowerPoint refused (HTTP 406 from Office's PDF
 * converter) during the full parity sweep.
 *
 * The sweep deletes its .work cache, so this re-captures each flagged cell with
 * the same in-page exporter, then runs the shipping validators against the
 * bytes:
 *
 *   - sniffPresentationPackage / validatePackageEntries (pptx-package-validate)
 *   - diagnoseImportedDeck (pptx-compat-diagnose) on the re-parsed deck
 *   - a media-part census: every /ppt/media part with its byte size, pixel
 *     dimensions and format, so an oversized plate image is visible directly
 *
 * Usage:
 *   node scripts/diagnose-refused-packages.mjs [--url http://localhost:8080]
 *                                              [--out artifacts/refused-diagnose]
 *                                              [--cell MV-FLYWHEEL@light ...]
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const argv = process.argv.slice(2);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const values = (n) =>
  argv.reduce((a, v, i) => (v === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const OUT_DIR = path.resolve(value("out", "artifacts/refused-diagnose"));
const FIDELITY = value("fidelity", "editable");

/** The 15 cells PowerPoint refused in artifacts/parity-full/report.md. */
const DEFAULT_CELLS = [
  "MV-PROC-TIMELINE@light",
  "MV-FLYWHEEL@light",
  "MV-MATRIX-2X2@light",
  "MV-LOC-WORLD-PINS@light",
  "MV-LOC-HUB-SPOKE@light",
  "MV-OP-COVER@dark",
  "MV-OP-COVER-MEDIA@dark",
  "MV-INS-BIG-IDEA@dark",
  "MV-INS-QUOTE@dark",
  "MV-PROC-TIMELINE@dark",
  "MV-FLYWHEEL@dark",
  "MV-MATRIX-2X2@dark",
  "MV-COMPARE-SLIDER@dark",
  "MV-LOC-WORLD-PINS@dark",
  "MV-LOC-HUB-SPOKE@dark",
];

/** A control group that PowerPoint accepted, for size/shape comparison. */
const CONTROL_CELLS = ["MV-DASH-GAUGE-ROW@light", "MV-BENTO-5@light", "MV-INS-QUOTE@light"];

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

/** PNG/JPEG/GIF/WebP intrinsic size straight off the header bytes. */
function imageSize(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { format: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { format: "jpeg", h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return { format: "jpeg", w: null, h: null };
  }
  if (buf.length > 15 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { format: "webp", w: null, h: null };
  }
  if (buf.length > 32 && buf.toString("utf8", 0, 200).includes("<svg")) {
    return { format: "svg", w: null, h: null };
  }
  return { format: "unknown", w: null, h: null };
}

const mib = (n) => Number((n / 1024 / 1024).toFixed(2));

async function inspectPackage(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const entries = [];
  for (const file of Object.values(zip.files)) {
    if (file.dir) continue;
    const buf = await file.async("nodebuffer");
    entries.push({ path: file.name, bytes: buf.length, buf });
  }
  const media = entries
    .filter((e) => e.path.startsWith("ppt/media/"))
    .map((e) => ({ path: e.path, bytes: e.bytes, ...imageSize(e.buf) }))
    .sort((a, b) => b.bytes - a.bytes);
  const totalUncompressed = entries.reduce((a, e) => a + e.bytes, 0);
  const mediaBytes = media.reduce((a, e) => a + e.bytes, 0);
  return {
    zipBytes: bytes.length,
    entryCount: entries.length,
    totalUncompressed,
    mediaBytes,
    mediaCount: media.length,
    biggestPart: entries.slice().sort((a, b) => b.bytes - a.bytes)[0]?.path ?? null,
    biggestPartBytes: entries.slice().sort((a, b) => b.bytes - a.bytes)[0]?.bytes ?? 0,
    media,
    entries: entries.map(({ path: p, bytes: b }) => ({ path: p, bytes: b })),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const cellArgs = values("cell");
  const cells = (cellArgs.length ? cellArgs : [...DEFAULT_CELLS, ...CONTROL_CELLS]).map((label) => {
    const [variantId, mode = "light"] = label.split("@");
    return { label, variantId, mode, control: CONTROL_CELLS.includes(label) };
  });

  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.error("  [page error]", m.text().slice(0, 160));
  });
  await page.goto(`${BASE_URL}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpExportVerify", null, { timeout: 180_000 });

  const rows = [];
  for (const cell of cells) {
    let cap = null;
    let error = null;
    try {
      [cap] = await page.evaluate(
        (j) => window.__tpExportVerify.pixel([j]),
        [cell.variantId, null, cell.mode, FIDELITY],
      );
      if (!cap?.pptx) error = cap?.error ?? "no capture";
    } catch (err) {
      error = `capture threw: ${String(err).slice(0, 160)}`;
    }
    if (error) {
      rows.push({ ...cell, error });
      console.log(`  ${cell.label} · CAPTURE FAIL (${error})`);
      continue;
    }
    const bytes = Buffer.from(cap.pptx, "base64");
    const pkg = await inspectPackage(bytes);

    // Run the shipping validators inside the page (they're TS modules).
    const verdict = await page.evaluate(
      async ({ b64, entries }) => {
        const pv = await import("/src/lib/pptx-package-validate.ts");
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const parse = await import("/src/lib/pptx-import.ts").catch(() => null);
        const out = {
          sniff: pv.sniffPresentationPackage(bin, "cell.pptx"),
          entryRisks: pv.validatePackageEntries(entries),
          limits: {
            MAX_UPLOAD_BYTES: pv.MAX_UPLOAD_BYTES,
            MAX_ENTRY_BYTES: pv.MAX_ENTRY_BYTES,
            MAX_EXPANDED_BYTES: pv.MAX_EXPANDED_BYTES,
            MAX_ENTRIES: pv.MAX_ENTRIES,
          },
          compat: null,
        };
        try {
          const importer = parse && (parse.parsePptx ?? parse.importPptx ?? parse.parseDeckFromPptx);
          if (importer) {
            const deck = await importer(bin.slice());
            const cd = await import("/src/lib/pptx-compat-diagnose.ts");
            const report = cd.diagnoseImportedDeck(deck?.deck ?? deck);
            out.compat = {
              issues: (report.issues ?? []).map((i) => ({
                code: i.code,
                severity: i.severity,
                message: String(i.message ?? "").slice(0, 200),
              })),
            };
          }
        } catch (err) {
          out.compat = { error: String(err).slice(0, 200) };
        }
        return out;
      },
      { b64: cap.pptx, entries: pkg.entries },
    );

    const outFile = path.join(OUT_DIR, `${cell.label.replace(/[^a-z0-9@.-]/gi, "_")}.pptx`);
    await writeFile(outFile, bytes);
    rows.push({ ...cell, pkg: { ...pkg, media: pkg.media, entries: undefined }, verdict, file: outFile });
    console.log(
      `  ${cell.control ? "control " : ""}${cell.label} · zip ${mib(pkg.zipBytes)} MiB · ` +
        `parts ${pkg.entryCount} · media ${pkg.mediaCount} (${mib(pkg.mediaBytes)} MiB) · ` +
        `biggest ${pkg.biggestPart} ${mib(pkg.biggestPartBytes)} MiB · ` +
        `blockers ${(verdict.entryRisks.risks ?? []).filter((r) => r.severity === "blocker").length}`,
    );
    for (const m of pkg.media.slice(0, 4)) {
      console.log(`      ${m.path} ${m.format} ${m.w ?? "?"}x${m.h ?? "?"} ${mib(m.bytes)} MiB`);
    }
  }

  await browser.close();
  await writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(rows, null, 2)}\n`);

  const bad = rows.filter((r) => !r.control && !r.error);
  const controls = rows.filter((r) => r.control && !r.error);
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  console.log(
    `\nrefused-cell zip avg ${mib(avg(bad.map((r) => r.pkg.zipBytes)))} MiB vs ` +
      `control avg ${mib(avg(controls.map((r) => r.pkg.zipBytes)))} MiB\n` +
      `refused-cell media avg ${mib(avg(bad.map((r) => r.pkg.mediaBytes)))} MiB vs ` +
      `control ${mib(avg(controls.map((r) => r.pkg.mediaBytes)))} MiB`,
  );
  console.log(`\nwrote ${path.join(OUT_DIR, "report.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
