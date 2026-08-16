#!/usr/bin/env node
/**
 * EMBEDDED-FONT COMPATIBILITY CHECK (PowerPoint version matrix)
 * =============================================================
 *
 *   node scripts/verify-font-compat.mjs [--url http://localhost:8080] [--variants 3]
 *
 * Exports real decks through the /dev/export-verify harness with font embedding
 * ON and OFF, then audits each package against the rules each PowerPoint
 * generation actually enforces when it opens a file. No PowerPoint install is
 * needed: every rule below is a package-level invariant, and the LibreOffice
 * render pass is used as an independent "does a real consumer pick the font up"
 * signal.
 *
 * TARGET MATRIX
 *   win-2007      PowerPoint 2007 (12.0)      strict CT_Presentation ordering, x-fontdata
 *   win-2010-2016 PowerPoint 2010/2013/2016   as above + panose/pitchFamily metadata
 *   win-2019-365  PowerPoint 2019 / M365      as above; ignores unknown content types
 *   mac-2016-365  PowerPoint for Mac          CANNOT use embedded fonts -> must degrade
 *   web-365       PowerPoint for the web      ignores embedded fonts -> must degrade
 *
 * "Degrade" = the deck still NAMES the brand typeface (theme font scheme + a:latin
 * runs), so a viewer without Geist substitutes predictably instead of inheriting
 * Calibri from a stale theme.
 */
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const argv = process.argv.slice(2);
const value = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const COUNT = Number(value("variants", 3));
const OUT_DIR = path.resolve(value("out", "/tmp/font-compat"));

const EMBED_KEY = "tp:export-embed-fonts:v1";

// --- schema order of CT_Presentation children (ECMA-376 Part 1, 19.2.1.26) ----
const PRES_ORDER = [
  "sldMasterIdLst",
  "notesMasterIdLst",
  "handoutMasterIdLst",
  "sldIdLst",
  "sldSz",
  "notesSz",
  "smartTags",
  "embeddedFontLst",
  "custShowLst",
  "photoAlbum",
  "custDataLst",
  "kinsoku",
  "defaultTextStyle",
  "modifyVerifier",
  "extLst",
];

// Content types PowerPoint itself writes for embedded font parts. The
// obfuscatedFont type is the WORD convention (keyed with w:fontKey) and is not
// understood by PowerPoint's font loader.
const PPT_FONT_CT = "application/x-fontdata";
const WORD_FONT_CT = "application/vnd.openxmlformats-officedocument.obfuscatedFont";

function sniffFont(bytes) {
  if (!bytes || bytes.length < 4) return "empty";
  const tag = String.fromCharCode(...bytes.slice(0, 4));
  const num = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  if (num === 0x00010000) return "ttf";
  if (tag === "true" || tag === "ttcf") return "ttf";
  if (tag === "OTTO") return "otf";
  return "unrecognized";
}

async function launchChromium() {
  // Explicit binary wins: shared CI images often ship a system chromium while the
  // bundled playwright build is missing its shared libraries.
  const envExe = process.env.PW_CHROME || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (envExe && existsSync(envExe)) {
    return await chromium.launch({ headless: true, executablePath: envExe });
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!root || !existsSync(root)) throw err;
    for (const dir of readdirSync(root).filter((d) => d.startsWith("chromium"))) {
      for (const rel of ["chrome-linux/chrome", "chrome-linux/headless_shell"]) {
        const exe = path.join(root, dir, rel);
        if (existsSync(exe)) return await chromium.launch({ headless: true, executablePath: exe });
      }
    }
    throw err;
  }
}

/** Package-level audit shared by every target in the matrix. */
async function auditPackage(buf) {
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files);
  const ct = await zip.file("[Content_Types].xml")?.async("string");
  const pres = await zip.file("ppt/presentation.xml")?.async("string");
  const rels = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string");

  const fontParts = names.filter((n) => /^ppt\/fonts\/.+\.fntdata$/.test(n));
  const ctMatch = ct?.match(/<Default Extension="fntdata" ContentType="([^"]+)"/);
  const declaredCt = ctMatch?.[1] ?? null;

  // relationship id -> target for font rels
  const fontRels = new Map();
  for (const m of (rels ?? "").matchAll(/<Relationship Id="([^"]+)"[^>]*Type="[^"]*\/font"[^>]*Target="([^"]+)"/g))
    fontRels.set(m[1], m[2]);

  const lst = pres?.match(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/)?.[0] ?? null;
  const entries = [];
  for (const block of (lst ?? "").matchAll(/<p:embeddedFont>([\s\S]*?)<\/p:embeddedFont>/g)) {
    const body = block[1];
    const f = body.match(/<p:font ([^>]*)\/>/)?.[1] ?? "";
    const attr = (k) => f.match(new RegExp(`${k}="([^"]*)"`))?.[1] ?? null;
    const ids = Array.from(body.matchAll(/<p:(regular|bold|italic|boldItalic) r:id="([^"]+)"\/>/g)).map(
      (m) => ({ style: m[1], rid: m[2] }),
    );
    entries.push({ typeface: attr("typeface"), panose: attr("panose"), pitchFamily: attr("pitchFamily"), charset: attr("charset"), ids });
  }

  // Element ordering inside <p:presentation>
  const seen = [];
  for (const m of (pres ?? "").matchAll(/<p:(\w+)[ />]/g)) {
    const tag = m[1];
    if (tag === "presentation") continue;
    if (PRES_ORDER.includes(tag) && !seen.includes(tag)) seen.push(tag);
  }
  const orderOk = seen.every(
    (t, i) => i === 0 || PRES_ORDER.indexOf(seen[i - 1]) < PRES_ORDER.indexOf(t),
  );

  // Data integrity of each part
  const parts = [];
  for (const name of fontParts) {
    const bytes = await zip.file(name).async("uint8array");
    parts.push({ name, size: bytes.length, kind: sniffFont(bytes) });
  }

  // Degradation signals: does the deck NAME the brand face?
  const theme = await zip.file("ppt/theme/theme1.xml")?.async("string");
  const schemeMajor = theme?.match(/<a:majorFont><a:latin typeface="([^"]*)"/)?.[1] ?? null;
  const schemeMinor = theme?.match(/<a:minorFont><a:latin typeface="([^"]*)"/)?.[1] ?? null;
  const slideNames = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const typefaces = new Set();
  for (const n of slideNames) {
    const xml = await zip.file(n).async("string");
    for (const m of xml.matchAll(/<a:(?:latin|cs|ea) typeface="([^"]+)"/g)) typefaces.add(m[1]);
  }

  return {
    bytes: buf.length,
    declaredCt,
    fontRelCount: fontRels.size,
    fontRels,
    hasEmbedLst: !!lst,
    entries,
    order: seen,
    orderOk,
    parts,
    schemeMajor,
    schemeMinor,
    slideTypefaces: [...typefaces],
  };
}

/** The version matrix: each target returns {status, notes[]} for one package. */
function evaluateMatrix(a, { embed }) {
  const winCore = () => {
    const fail = [];
    const warn = [];
    if (embed) {
      if (!a.hasEmbedLst) fail.push("no <p:embeddedFontLst> — nothing to load");
      if (!a.parts.length) fail.push("no ppt/fonts/*.fntdata parts");
      if (!a.orderOk)
        fail.push(`presentation.xml children out of schema order: ${a.order.join(" > ")}`);
      if (a.declaredCt === WORD_FONT_CT)
        fail.push(
          `fntdata declared as ${WORD_FONT_CT} (Word obfuscated-font convention); PowerPoint expects ${PPT_FONT_CT}`,
        );
      else if (a.declaredCt !== PPT_FONT_CT)
        fail.push(`fntdata content type is ${a.declaredCt ?? "missing"}, expected ${PPT_FONT_CT}`);
      for (const p of a.parts)
        if (p.kind !== "ttf" && p.kind !== "otf")
          fail.push(`${p.name} is not a readable font (${p.kind}) — font loader rejects the part`);
      for (const e of a.entries) {
        if (!e.typeface) fail.push("embeddedFont without typeface attribute");
        for (const { style, rid } of e.ids)
          if (!a.fontRels.has(rid))
            fail.push(`${e.typeface}/${style} points at ${rid} with no font relationship`);
        if (!e.panose || !e.pitchFamily) warn.push(`${e.typeface}: missing panose/pitchFamily metadata`);
        if (e.ids.length < 4)
          warn.push(`${e.typeface}: only ${e.ids.map((i) => i.style).join("+") || "no"} face(s) embedded`);
      }
      for (const rid of a.fontRels.keys())
        if (!a.entries.some((e) => e.ids.some((i) => i.rid === rid)))
          warn.push(`orphan font relationship ${rid}`);
    } else {
      if (a.hasEmbedLst || a.parts.length)
        fail.push("embedding is OFF but the package still carries font parts");
    }
    return { fail, warn };
  };

  const degrade = () => {
    const fail = [];
    const warn = [];
    // Mac + web ignore embedded data entirely: the deck must still ASK for Geist.
    if (a.schemeMinor !== "Geist" || a.schemeMajor !== "Geist")
      fail.push(`theme font scheme is ${a.schemeMajor}/${a.schemeMinor}, expected Geist/Geist`);
    const stray = a.slideTypefaces.filter(
      (t) => t && !t.startsWith("+") && !/^Geist( Mono)?$|^Georgia$/.test(t),
    );
    if (stray.length) fail.push(`unmapped typeface(s) reach the slide: ${stray.join(", ")}`);
    return { fail, warn };
  };

  const core = winCore();
  const deg = degrade();
  const join = (...rs) => ({
    fail: rs.flatMap((r) => r.fail),
    warn: rs.flatMap((r) => r.warn),
  });

  const rows = {
    "win-2007": join(core, deg),
    "win-2010-2016": join(core, deg),
    "win-2019-365": join(core, deg),
    // Mac and web never read the font data, so only degradation matters. A
    // present-but-broken font part is harmless there.
    "mac-2016-365": deg,
    "web-365": deg,
  };
  return Object.fromEntries(
    Object.entries(rows).map(([k, r]) => [
      k,
      { status: r.fail.length ? "FAIL" : r.warn.length ? "WARN" : "PASS", ...r },
    ]),
  );
}

/** Independent consumer check: does a real renderer pick the embedded face up? */
async function libreOfficeFonts(file) {
  const { execFile } = await import("node:child_process");
  const run = (cmd, args) =>
    new Promise((res) => execFile(cmd, args, { timeout: 180_000 }, (e, so, se) => res({ e, so, se })));
  const dir = path.dirname(file);
  const r = await run("python3", ["/tmp/run_libreoffice.py", "--headless", "--convert-to", "pdf", "--outdir", dir, file]);
  const pdf = file.replace(/\.pptx$/, ".pdf");
  if (!existsSync(pdf)) return { ok: false, note: `conversion failed: ${(r.se || r.so || "").slice(-200)}` };
  const f = await run("pdffonts", [pdf]);
  const names = (f.so ?? "")
    .split("\n")
    .slice(2)
    .map((l) => l.trim().split(/\s+/)[0])
    .filter(Boolean);
  return { ok: true, fonts: names, geist: names.some((n) => /Geist/i.test(n)) };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpExportVerify", null, { timeout: 180_000 });
  const variants = await page.evaluate(() => window.__tpExportVerify.variants);
  const step = variants.length / COUNT;
  const picked = Array.from({ length: COUNT }, (_, i) => variants[Math.floor(i * step)]);

  const results = [];
  for (const embed of [true, false]) {
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k, v),
      [EMBED_KEY, embed ? "1" : "0"],
    );
    for (const variantId of picked) {
      const caps = await page.evaluate(
        (v) => window.__tpExportVerify.pixel([[v, null, "light", "editable"]]),
        variantId,
      );
      const cap = caps[0];
      if (!cap?.pptx) {
        results.push({ variantId, embed, error: cap?.error ?? "no pptx captured" });
        continue;
      }
      const buf = Buffer.from(cap.pptx.replace(/^data:[^,]+,/, ""), "base64");
      const file = path.join(OUT_DIR, `${variantId}-${embed ? "embed" : "noembed"}.pptx`);
      await writeFile(file, buf);
      const audit = await auditPackage(buf);
      const matrix = evaluateMatrix(audit, { embed });
      const lo = await libreOfficeFonts(file);
      results.push({ variantId, embed, file, audit, matrix, lo });
      const worst = Object.values(matrix).some((m) => m.status === "FAIL")
        ? "FAIL"
        : Object.values(matrix).some((m) => m.status === "WARN")
          ? "WARN"
          : "PASS";
      console.log(
        `${worst.padEnd(4)} ${variantId} embed=${embed} ct=${audit.declaredCt ?? "-"} parts=${audit.parts.map((p) => p.kind).join(",") || "-"} loGeist=${lo.geist ?? "?"} ${(buf.length / 1024).toFixed(0)}KB`,
      );
      for (const [target, m] of Object.entries(matrix))
        for (const f of m.fail) console.log(`     [${target}] ${f}`);
    }
  }
  await browser.close();
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(results, null, 2));
  const failed = results.some(
    (r) => r.error || Object.values(r.matrix ?? {}).some((m) => m.status === "FAIL"),
  );
  console.log(`\nreport: ${path.join(OUT_DIR, "report.json")}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
