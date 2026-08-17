#!/usr/bin/env node
/**
 * POWERPOINT FEATURE COMPATIBILITY CHECK
 * ======================================
 *
 *   node scripts/verify-feature-compat.mjs [--url http://localhost:8080] [--variants 6] [--modes light,dark]
 *
 * Exports real decks through the /dev/export-verify harness, then inventories
 * every OOXML feature the exporter actually emits and scores each one against
 * the PowerPoint generations users open the file in. No PowerPoint install is
 * needed: each rule is a package-level invariant of the consumer.
 *
 * TARGETS
 *   win-2007      PowerPoint 2007 (12.0)      strictest schema; no p14/p15 extensions
 *   win-2010-2016 PowerPoint 2010/2013/2016   p14 transitions ok; SmartArt/chart ok
 *   win-2019-365  PowerPoint 2019 / M365      superset; tolerates unknown ext
 *   mac-2016-365  PowerPoint for Mac          no embedded fonts; no ActiveX/VML
 *   web-365       PowerPoint for the web      no embedded fonts, no media autoplay,
 *                                             no macros; edits geometry fine
 *
 * VERDICTS
 *   PASS  feature is natively supported and editable on that target
 *   WARN  feature degrades gracefully (renders, may not be re-editable / animated)
 *   FAIL  feature triggers a repair prompt or silently drops content
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
const COUNT = Number(value("variants", 6));
const MODES = String(value("modes", "light,dark")).split(",").filter(Boolean);
const FIDELITIES = String(value("fidelity", "editable")).split(",").filter(Boolean);
const OUT_DIR = path.resolve(value("out", "/tmp/feature-compat"));

const TARGETS = ["win-2007", "win-2010-2016", "win-2019-365", "mac-2016-365", "web-365"];

/**
 * Feature registry. `detect(pkg)` returns a count (0 = not emitted).
 * `support` maps target -> "PASS" | "WARN" | "FAIL", optionally a function of
 * the package so a feature can be conditionally safe (e.g. schema ordering).
 * `note` explains the user-visible consequence.
 */
const FEATURES = [
  {
    id: "slide-size-16x9",
    detect: (p) => (/<p:sldSz[^>]*cx="12192000"/.test(p.pres) ? 1 : 0),
    support: () => ok(),
    note: "13.333x7.5in widescreen stage — universal.",
  },
  {
    id: "presentation-child-order",
    detect: () => 1,
    support: (p) => (p.presOrdered ? ok() : { "win-2007": "FAIL", "win-2010-2016": "FAIL", "win-2019-365": "WARN", "mac-2016-365": "WARN", "web-365": "WARN" }),
    note: "CT_Presentation child sequence; out-of-order children make 2007/2010 offer to repair the file.",
  },
  {
    id: "theme-font-scheme",
    detect: (p) => p.themes.filter((t) => /<a:fontScheme/.test(t)).length,
    support: () => ok(),
    note: "Brand typeface is named in the theme, so substitution is predictable everywhere.",
  },
  {
    id: "embedded-fonts",
    detect: (p) => p.names.filter((n) => /^ppt\/fonts\/.+\.fntdata$/.test(n)).length,
    support: () => ({ "win-2007": "PASS", "win-2010-2016": "PASS", "win-2019-365": "PASS", "mac-2016-365": "WARN", "web-365": "WARN" }),
    note: "Mac and Web ignore embedded font parts and substitute; text may rewrap but never drops.",
  },
  {
    id: "gradient-fill",
    detect: (p) => p.count(/<a:gradFill/g),
    support: () => ok(),
    note: "Native gradient fills stay editable in the Format Shape pane.",
  },
  {
    id: "alpha-transparency",
    detect: (p) => p.count(/<a:alpha val=/g),
    support: () => ok(),
    note: "Per-stop alpha drives the glass surfaces; supported since 2007.",
  },
  {
    id: "outer-shadow",
    detect: (p) => p.count(/<a:outerShdw/g),
    support: () => ok(),
    note: "Elevation renders natively; multiple effects per shape are fine.",
  },
  {
    id: "rounded-rect-geometry",
    detect: (p) => p.count(/prst="roundRect"/g),
    support: () => ok(),
    note: "Corner radius is a preset geometry adjustment, editable via the yellow handle.",
  },
  {
    id: "custom-geometry",
    detect: (p) => p.count(/<a:custGeom/g),
    support: () => ok(),
    note: "Arcs/rings emitted as path geometry; editable as freeform shapes.",
  },
  {
    id: "picture-crop-geometry",
    detect: (p) => p.count(/<p:pic>[\s\S]*?prstGeom prst="roundRect"/g),
    support: () => ok(),
    note: "Photos cropped to rounded rect via shape geometry, not a baked bitmap mask.",
  },
  {
    id: "shape-groups",
    detect: (p) => p.count(/<p:grpSp>/g),
    support: () => ok(),
    note: "Modules group so users can move a whole block; ungroup restores parts.",
  },
  {
    id: "alt-text",
    detect: (p) => p.count(/descr="[^"]+"/g),
    support: () => ok(),
    note: "Accessibility checker reads descr on pics and shapes.",
  },
  {
    id: "hyperlinks",
    detect: (p) => p.count(/<a:hlinkClick/g),
    support: () => ok(),
    note: "Click-through links work in every version including Web.",
  },
  {
    id: "speaker-notes",
    detect: (p) => p.names.filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)).length,
    support: () => ok(),
    note: "Presenter view notes; require a notesMaster part, which is present.",
  },
  {
    id: "slide-transitions",
    detect: (p) => p.count(/<p:transition/g),
    support: (p) => (p.count(/<p14:/g) ? { "win-2007": "WARN", "win-2010-2016": "PASS", "win-2019-365": "PASS", "mac-2016-365": "PASS", "web-365": "WARN" } : ok()),
    note: "Classic transitions are 2007-safe; p14 (Morph-era) ones degrade to a cut on 2007 and Web.",
  },
  {
    id: "charts",
    detect: (p) => p.names.filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n)).length,
    support: () => ({ "win-2007": "PASS", "win-2010-2016": "PASS", "win-2019-365": "PASS", "mac-2016-365": "PASS", "web-365": "WARN" }),
    note: "Chart parts stay data-editable on desktop; Web renders but limits chart data editing.",
  },
  {
    id: "smartart-diagrams",
    detect: (p) => p.names.filter((n) => /^ppt\/diagrams\//.test(n)).length,
    support: () => ({ "win-2007": "PASS", "win-2010-2016": "PASS", "win-2019-365": "PASS", "mac-2016-365": "WARN", "web-365": "WARN" }),
    note: "SmartArt needs a drawing fallback for Mac/Web; check the dsp/drawing part exists.",
  },
  {
    id: "smartart-drawing-fallback",
    detect: (p) => p.names.filter((n) => /^ppt\/diagrams\/drawing\d*\.xml$/.test(n)).length,
    support: () => ok(),
    note: "The rendered fallback keeps SmartArt visible where the layout engine is absent.",
  },
  {
    id: "tables",
    detect: (p) => p.count(/<a:tbl>/g),
    support: () => ok(),
    note: "Native tables are editable on every target.",
  },
  {
    id: "text-autofit",
    detect: (p) => p.count(/<a:normAutofit/g),
    support: () => ({ "win-2007": "PASS", "win-2010-2016": "PASS", "win-2019-365": "PASS", "mac-2016-365": "WARN", "web-365": "WARN" }),
    note: "Autofit recomputes per platform metrics; Mac/Web may shrink text differently. Measured placement is preferred.",
  },
  {
    // Byte-sniffed, not extension-trusted: a WebP written as `image2.png` still
    // shows a broken picture on pre-2019 builds, and that is exactly how
    // dark-mode backdrops slipped past the extension-only check.
    id: "raster-images",
    detect: (p) => p.media.filter((m) => m.raster).length,
    support: (p) =>
      p.media.some((m) => !DECODABLE_EVERYWHERE.has(m.format) && m.raster)
        ? formatSupport(p)
        : ok(),
    note: "PNG/JPEG/GIF/BMP are universal; WebP is only decoded by 2019+/365 and AVIF/HEIC by none.",
  },
  {
    // Dedicated backdrop/crop audit. Backdrops and photo crops are the largest
    // media in the package and the ones a viewer cannot ignore: if they fail to
    // decode the slide reads as a broken placeholder over a flat fallback fill.
    id: "backdrop-crop-formats",
    detect: (p) => p.backdrops.length,
    support: (p) => {
      const bad = p.backdrops.filter((m) => !DECODABLE_EVERYWHERE.has(m.format));
      return bad.length ? formatSupport({ media: bad }) : ok();
    },
    note: "Full-bleed backdrops and photo crops must be PNG/JPEG so every PowerPoint build can decode them.",
  },

  {
    id: "vector-svg-images",
    detect: (p) => p.names.filter((n) => /^ppt\/media\/.+\.svg$/i.test(n)).length,
    // A vector picture is only a problem when it ships WITHOUT the paired raster
    // fallback: with svgBlip + r:embed PNG, pre-2019 draws the PNG and 2019+/365
    // draws the vector, so the deck is correct everywhere.
    support: (p) =>
      p.count(/<asvg:svgBlip/g) > 0 && p.count(/<a:blip r:embed/g) > 0
        ? { "win-2007": "WARN", "win-2010-2016": "WARN", "win-2019-365": "PASS", "mac-2016-365": "PASS", "web-365": "PASS" }
        : { "win-2007": "FAIL", "win-2010-2016": "FAIL", "win-2019-365": "PASS", "mac-2016-365": "PASS", "web-365": "PASS" },
    note: "SVG needs the svgBlip extension plus a raster fallback blip; with the fallback pre-2019 renders the PNG instead of the vector.",
  },
  {
    id: "svg-raster-fallback",
    detect: (p) => p.count(/<asvg:svgBlip/g),
    support: (p) => (p.count(/<asvg:svgBlip/g) === 0 || p.count(/<a:blip r:embed/g) > 0 ? ok() : { "win-2007": "FAIL", "win-2010-2016": "FAIL", "win-2019-365": "PASS", "mac-2016-365": "PASS", "web-365": "PASS" }),
    note: "Every svgBlip must sit beside an r:embed raster blip so older builds have something to draw.",
  },
  {
    id: "video-audio-media",
    detect: (p) => p.names.filter((n) => /^ppt\/media\/.+\.(mp4|mov|m4a|mp3|wav)$/i.test(n)).length,
    support: () => ({ "win-2007": "WARN", "win-2010-2016": "PASS", "win-2019-365": "PASS", "mac-2016-365": "WARN", "web-365": "FAIL" }),
    note: "Web refuses to play embedded media and Mac codec support is partial — avoid for shipped decks.",
  },
  {
    id: "macros-vba",
    detect: (p) => p.names.filter((n) => /vbaProject/i.test(n)).length,
    support: () => ({ "win-2007": "WARN", "win-2010-2016": "WARN", "win-2019-365": "WARN", "mac-2016-365": "FAIL", "web-365": "FAIL" }),
    note: "Any macro part blocks Web entirely and trips enterprise trust policies. Must stay at zero.",
  },
  {
    id: "activex-ole",
    detect: (p) => p.count(/<p:control\b/g) + p.names.filter((n) => /activeX/i.test(n)).length,
    support: () => ({ "win-2007": "WARN", "win-2010-2016": "WARN", "win-2019-365": "WARN", "mac-2016-365": "FAIL", "web-365": "FAIL" }),
    note: "ActiveX/OLE controls do not exist off Windows. Must stay at zero.",
  },
  {
    id: "3d-scene-effects",
    detect: (p) => p.count(/<a:scene3d/g) + p.count(/<a:sp3d/g),
    support: () => ({ "win-2007": "WARN", "win-2010-2016": "PASS", "win-2019-365": "PASS", "mac-2016-365": "WARN", "web-365": "WARN" }),
    note: "3D bevels flatten on Web/Mac; avoid load-bearing use.",
  },
  {
    id: "p15-p14-extensions",
    detect: (p) => p.count(/<p14:|<p15:/g),
    support: () => ({ "win-2007": "WARN", "win-2010-2016": "PASS", "win-2019-365": "PASS", "mac-2016-365": "PASS", "web-365": "WARN" }),
    note: "Namespaced extension blocks are ignored (not fatal) by consumers that do not know them.",
  },
  {
    id: "slide-masters-layouts",
    detect: (p) => p.names.filter((n) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n)).length,
    support: (p) => (p.names.some((n) => /^ppt\/slideMasters\//.test(n)) ? ok() : { "win-2007": "FAIL", "win-2010-2016": "FAIL", "win-2019-365": "FAIL", "mac-2016-365": "FAIL", "web-365": "FAIL" }),
    note: "Every slide must resolve a layout -> master chain or the file is invalid.",
  },
];

function ok() {
  return Object.fromEntries(TARGETS.map((t) => [t, "PASS"]));
}

// ---------------------------------------------------------------------------
// Image embed audit
//
// Formats every shipping PowerPoint decodes natively. Anything outside this set
// must never reach ppt/media — the export pipeline transcodes WebP to JPEG/PNG
// in src/lib/pptx-image-compat.ts, used by both the main embed path
// (pptx-export.ts) and the backdrop path (pptx-background.ts).
// ---------------------------------------------------------------------------
const DECODABLE_EVERYWHERE = new Set(["png", "jpeg", "gif", "bmp", "tiff", "emf", "wmf", "svg"]);

/** Per-target verdict for the offending formats present in `media`. */
function formatSupport({ media }) {
  const formats = new Set(media.map((m) => m.format));
  // WebP: 2019+/365 (Win/Mac/Web) decode it, everything older does not.
  // AVIF/HEIC/unknown: no PowerPoint build decodes them anywhere.
  const onlyWebp = [...formats].every((f) => f === "webp");
  return onlyWebp
    ? { "win-2007": "FAIL", "win-2010-2016": "FAIL", "win-2019-365": "PASS", "mac-2016-365": "PASS", "web-365": "PASS" }
    : Object.fromEntries(TARGETS.map((t) => [t, "FAIL"]));
}

/** Magic-byte sniff — filenames in ppt/media are not trustworthy. */
function sniffImageFormat(u8, name) {
  const b = u8;
  const ascii = (i, s) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b[0] === 0x89 && ascii(1, "PNG")) return "png";
  if (b[0] === 0xff && b[1] === 0xd8) return "jpeg";
  if (ascii(0, "GIF8")) return "gif";
  if (ascii(0, "BM")) return "bmp";
  if ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d)) return "tiff";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (ascii(4, "ftypavif")) return "avif";
  if (ascii(4, "ftypheic") || ascii(4, "ftyphevc")) return "heic";
  if (ascii(0, "<svg") || ascii(0, "<?xml")) return "svg";
  if (b[0] === 0x01 && b[1] === 0x00 && b[2] === 0x00 && b[3] === 0x00) return "emf";
  if (b[0] === 0xd7 && b[1] === 0xcd) return "wmf";
  if (/\.(mp4|mov|m4a|mp3|wav)$/i.test(name)) return "media";
  return "unknown";
}



const PRES_ORDER = [
  "sldMasterIdLst", "notesMasterIdLst", "handoutMasterIdLst", "sldIdLst", "sldSz",
  "notesSz", "smartTags", "custShowLst", "photoAlbum",
  "custDataLst", "kinsoku", "defaultTextStyle", "modifyVerifier", "extLst", "embeddedFontLst",
];

async function loadPackage(buf) {
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files);
  const read = async (n) => (zip.file(n) ? zip.file(n).async("string") : "");
  const pres = await read("ppt/presentation.xml");
  const ct = await read("[Content_Types].xml");
  const slidePaths = names.filter((n) => /^ppt\/(slides|slideLayouts|slideMasters|notesSlides|diagrams)\/[^/]+\.xml$/.test(n));
  const slideParts = await Promise.all(slidePaths.map(async (n) => [n, await read(n)]));
  const slideXml = slideParts.map(([, x]) => x).join("\n");
  const themes = await Promise.all(names.filter((n) => /^ppt\/theme\/theme\d+\.xml$/.test(n)).map(read));
  const all = [pres, ct, slideXml, themes.join("\n")].join("\n");

  const seq = PRES_ORDER.filter((n) => new RegExp(`<p:${n}[\\s/>]`).test(pres)).map((n) => ({
    n,
    i: pres.indexOf(`<p:${n}`),
  }));
  const presOrdered = seq.every((s, i) => i === 0 || seq[i - 1].i < s.i);

  // ── media inventory: byte-sniffed format for every embedded asset ─────────
  const media = await Promise.all(
    names
      .filter((n) => /^ppt\/media\//.test(n) && !zip.files[n].dir)
      .map(async (n) => {
        const u8 = await zip.file(n).async("uint8array");
        const format = sniffImageFormat(u8.subarray(0, 16), n);
        return {
          name: n,
          format,
          bytes: u8.length,
          raster: !["svg", "emf", "wmf", "media"].includes(format),
        };
      }),
  );
  const byName = new Map(media.map((m) => [m.name, m]));

  // ── classify backdrops/crops: pictures covering a large share of the slide,
  // plus anything referenced from a slideMaster/layout (background plates).
  const sldSz = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(pres);
  const slideArea = sldSz ? Number(sldSz[1]) * Number(sldSz[2]) : 12192000 * 6858000;
  const backdrops = new Set();
  for (const [part, xml] of slideParts) {
    const relsPath = part.replace(/([^/]+)$/, "_rels/$1.rels");
    const rels = await read(relsPath);
    const relMap = new Map();
    for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
      const target = m[2].replace(/^\.\.\//, "ppt/").replace(/^\//, "");
      relMap.set(m[1], target);
    }
    const isMasterish = /slideMasters|slideLayouts/.test(part);
    for (const pic of xml.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)) {
      const block = pic[0];
      const embed = /r:embed="([^"]+)"/.exec(block);
      const ext = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(block);
      if (!embed) continue;
      const target = relMap.get(embed[1]);
      const asset = target && byName.get(target);
      if (!asset) continue;
      const area = ext ? Number(ext[1]) * Number(ext[2]) : 0;
      if (isMasterish || area >= slideArea * 0.5) backdrops.add(asset);
    }
    // Background fills (<p:bg> blipFill) are always backdrops.
    for (const bg of xml.matchAll(/<p:bg>[\s\S]*?<\/p:bg>/g))
      for (const e of bg[0].matchAll(/r:embed="([^"]+)"/g)) {
        const asset = byName.get(relMap.get(e[1]));
        if (asset) backdrops.add(asset);
      }
  }

  return {
    names,
    pres,
    ct,
    themes,
    all,
    presOrdered,
    media,
    backdrops: [...backdrops],
    count: (re) => (all.match(re) ?? []).length,
  };

}

function scorePackage(pkg) {
  const rows = [];
  for (const f of FEATURES) {
    const uses = f.detect(pkg);
    if (!uses) {
      // Registry entries that are guardrails (must stay zero) pass when absent.
      rows.push({ id: f.id, uses: 0, status: "n/a", targets: null, note: f.note });
      continue;
    }
    const targets = f.support(pkg);
    const worst = TARGETS.some((t) => targets[t] === "FAIL")
      ? "FAIL"
      : TARGETS.some((t) => targets[t] === "WARN")
        ? "WARN"
        : "PASS";
    rows.push({ id: f.id, uses, status: worst, targets, note: f.note });
  }
  return rows;
}

/** Named list of every embed whose format is not universally decodable. */
function imageOffenders(pkg) {
  const backdrop = new Set(pkg.backdrops.map((m) => m.name));
  return pkg.media
    .filter((m) => m.raster && !DECODABLE_EVERYWHERE.has(m.format))
    .map((m) => ({
      name: m.name,
      format: m.format,
      kb: Math.round(m.bytes / 1024),
      role: backdrop.has(m.name) ? "backdrop/crop" : "image",
    }));
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpExportVerify", null, { timeout: 180_000 });
  const variants = await page.evaluate(() => window.__tpExportVerify.variants);
  const step = variants.length / COUNT;
  const picked = Array.from({ length: COUNT }, (_, i) => variants[Math.floor(i * step)]).filter(Boolean);

  const results = [];
  for (const variantId of picked) {
    for (const mode of MODES) {
      for (const fidelity of FIDELITIES) {
        let cap;
        try {
          cap = (
            await page.evaluate(
              ([v, m, f]) => window.__tpExportVerify.pixel([[v, null, m, f]]),
              [variantId, mode, fidelity],
            )
          )[0];
        } catch (e) {
          results.push({ variantId, mode, fidelity, error: String(e).slice(0, 200) });
          continue;
        }
        if (!cap?.pptx) {
          results.push({ variantId, mode, fidelity, error: cap?.error ?? "no pptx captured" });
          continue;
        }
        const buf = Buffer.from(cap.pptx.replace(/^data:[^,]+,/, ""), "base64");
        const pkg = await loadPackage(buf);
        const rows = scorePackage(pkg);
        const worst = rows.some((r) => r.status === "FAIL")
          ? "FAIL"
          : rows.some((r) => r.status === "WARN")
            ? "WARN"
            : "PASS";
        const offenders = imageOffenders(pkg);
        results.push({
          variantId,
          mode,
          fidelity,
          worst,
          rows,
          media: pkg.media.map((m) => ({ name: m.name, format: m.format, bytes: m.bytes })),
          backdrops: pkg.backdrops.map((m) => ({ name: m.name, format: m.format })),
          imageOffenders: offenders,
        });
        console.log(
          `${worst.padEnd(4)} ${variantId} ${mode}/${fidelity} features=${rows.filter((r) => r.uses).length} media=${pkg.media.length} backdrops=${pkg.backdrops.length} ${(buf.length / 1024).toFixed(0)}KB`,
        );
        for (const r of rows.filter((r) => r.status === "FAIL"))
          console.log(`     FAIL ${r.id} (x${r.uses}) ${r.note}`);
        for (const o of offenders)
          console.log(`     FAIL image-embed ${o.role} ${o.name} is ${o.format} (${o.kb}KB)`);

      }
    }
  }
  await browser.close();

  // ---- aggregate: feature x target matrix across the whole sweep ------------
  const agg = new Map();
  for (const res of results)
    for (const r of res.rows ?? []) {
      if (!r.uses) continue;
      const cur = agg.get(r.id) ?? { id: r.id, uses: 0, targets: {}, note: r.note };
      cur.uses += r.uses;
      for (const t of TARGETS) {
        const s = r.targets[t];
        const rank = { PASS: 0, WARN: 1, FAIL: 2 };
        if (rank[s] >= rank[cur.targets[t] ?? "PASS"]) cur.targets[t] = s;
      }
      agg.set(r.id, cur);
    }

  const table = [...agg.values()].sort((a, b) => a.id.localeCompare(b.id));
  console.log(`\nFEATURE x TARGET MATRIX (${results.length} exports)\n`);
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("feature", 28) + TARGETS.map((t) => pad(t, 15)).join("") + "uses");
  for (const row of table)
    console.log(
      pad(row.id, 28) + TARGETS.map((t) => pad(row.targets[t], 15)).join("") + row.uses,
    );

  const guardrails = FEATURES.filter((f) => /macros-vba|activex-ole/.test(f.id)).map((f) => f.id);
  const guardBreaches = table.filter((r) => guardrails.includes(r.id));
  if (guardBreaches.length)
    console.log(`\nGUARDRAIL BREACH: ${guardBreaches.map((g) => g.id).join(", ")}`);

  // ---- image embed audit: every backdrop/crop must decode on every target ---
  const fmtCount = new Map();
  for (const res of results)
    for (const m of res.media ?? []) fmtCount.set(m.format, (fmtCount.get(m.format) ?? 0) + 1);
  const allOffenders = results.flatMap((r) =>
    (r.imageOffenders ?? []).map((o) => ({ ...o, where: `${r.variantId} ${r.mode}/${r.fidelity}` })),
  );
  console.log(`\nIMAGE EMBED AUDIT`);
  console.log(
    `  formats: ${[...fmtCount.entries()].sort().map(([f, n]) => `${f}=${n}`).join(" ") || "none"}`,
  );
  console.log(
    `  backdrops/crops audited: ${results.reduce((n, r) => n + (r.backdrops?.length ?? 0), 0)}`,
  );
  if (allOffenders.length) {
    console.log(`  FAIL ${allOffenders.length} embed(s) not decodable on every target:`);
    for (const o of allOffenders)
      console.log(`    ${o.where} · ${o.role} · ${o.name} · ${o.format} · ${o.kb}KB`);
    console.log(
      `  Fix: route the embed through toPowerPointSafeDataUrl() in src/lib/pptx-image-compat.ts.`,
    );
  } else {
    console.log(`  PASS every embed is PNG/JPEG/GIF/BMP/TIFF/SVG+fallback — no WebP/AVIF/HEIC.`);
  }

  await writeFile(
    path.join(OUT_DIR, "report.json"),
    JSON.stringify(
      {
        targets: TARGETS,
        matrix: table,
        imageAudit: {
          formats: Object.fromEntries(fmtCount),
          offenders: allOffenders,
          pass: allOffenders.length === 0,
        },
        exports: results,
      },
      null,
      2,
    ),
  );
  console.log(`\nreport: ${path.join(OUT_DIR, "report.json")}`);
  const failed =
    results.some((r) => r.error) ||
    allOffenders.length > 0 ||
    table.some((r) => TARGETS.some((t) => r.targets[t] === "FAIL"));
  process.exit(failed ? 1 : 0);
}


main().catch((e) => {
  console.error(e);
  process.exit(1);
});
