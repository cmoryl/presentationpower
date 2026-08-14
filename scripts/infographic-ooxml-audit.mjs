#!/usr/bin/env node
/**
 * INFOGRAPHIC OOXML AUDIT — shapes · z-order · text wrapping · connectors
 * =======================================================================
 *
 * Static, offline audit of generated .pptx packages that answers the question
 * chart-validity-audit.mjs does NOT cover: our infographic modules (bentos,
 * process rows, orbits, tiles, iceberg, stat blocks) are emitted as native
 * DrawingML shapes, connectors and text bodies rather than chart parts. Those
 * paths have their own class of Office-fatal defects, and the ones that are
 * merely *wrong* (occluded shapes, autofit fighting our baked line layout,
 * dangling connector endpoints) never trip the repair dialog — they just make
 * the slide render differently in real PowerPoint than in the build.
 *
 * This audit reads every ppt/slides/slideN.xml with JSZip, walks the shape tree
 * in document (= z) order, and asserts the rules below. It is intentionally
 * dependency-free and regex/scan based, exactly like the chart audit, so it can
 * run over hundreds of sweep cells in seconds.
 *
 * SHAPES
 *   sp-geometry       every <p:sp> declares <a:prstGeom> or <a:custGeom>
 *   prst-known        prstGeom@prst is a real ST_ShapeType token
 *   custgeom-path     custGeom carries a non-empty <a:pathLst>
 *   xfrm-present      every non-placeholder shape has <a:off> and <a:ext>
 *   ext-positive      ext cx/cy are positive integers (0 renders nothing)
 *   emu-range         off/ext are integers inside ±ST_Coordinate bounds
 *   id-valid          <p:cNvPr> id is a positive integer, unique per slide
 *   name-present      <p:cNvPr> carries a name (PowerPoint's selection pane)
 *   adj-numeric       <a:gd fmla="val …"> adjust values are numeric
 *   blip-rel          every <a:blip r:embed> resolves in the slide's .rels
 *   off-slide         shape bbox lies fully outside the slide canvas
 *
 * Z-ORDER
 *   sptree-header     <p:spTree> opens with nvGrpSpPr then grpSpPr
 *   backdrop-first    a full-bleed opaque picture must be the FIRST child;
 *                     later ones bury every shape beneath them
 *   z-occlusion       an opaque, no-alpha, full-cover shape/pic painted after a
 *                     text shape hides that text in PowerPoint
 *   plate-behind-text raster plate (glass blur crop) emitted after the text it
 *                     is supposed to sit behind
 *
 * TEXT WRAPPING
 *   bodypr-present    every <p:txBody> has <a:bodyPr>
 *   autofit-conflict  <a:normAutofit fontScale>/<a:spAutoFit> combined with our
 *                     baked per-line runs — PowerPoint re-flows and drifts
 *   wrap-contract     baked multi-line text bodies must pin wrap="none"
 *   empty-run         <a:r> whose <a:t> is empty (ghost run, stray bullet)
 *   font-unset        run without <a:latin typeface> → Calibri substitution
 *   inset-explicit    bodyPr without lIns/tIns/rIns/bIns on a baked body
 *   text-overflow     measured baked line block is taller than the shape ext
 *
 * CONNECTORS
 *   cxn-geometry      <p:cxnSp> declares a line/connector prstGeom
 *   cxn-visible       connector has <a:ln> with a stroke (else invisible)
 *   cxn-zero-length   ext cx and cy both 0
 *   cxn-endpoint      st/endCxn@id resolves to a shape id on the same slide
 *   cxn-self          start and end bound to the same shape
 *
 * USAGE
 *   node scripts/infographic-ooxml-audit.mjs deck.pptx [more.pptx…]
 *        [--json out.json] [--md out.md] [--ci] [--quiet]
 *        [--glob '/tmp/work/ ** /cell.pptx']   (without the spaces)
 *
 * EXIT CODES
 *   0 clean (or non-CI)   1 violations with --ci   2 usage/read error
 */
import { readFile, writeFile } from "node:fs/promises";
import { globSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};

const CI = flag("ci");
const QUIET = flag("quiet");
const STRICT = flag("strict");

const jsonOut = value("json");
const mdOut = value("md");

const files = argv.filter((a) => !a.startsWith("--") && a.endsWith(".pptx"));
for (const g of argv.filter((a, i) => argv[i - 1] === "--glob")) {
  try {
    files.push(...globSync(g));
  } catch {
    /* node < 22 has no globSync; the caller can shell-expand instead */
  }
}

/* ------------------------------------------------------------------ EMU math */
const EMU_PER_IN = 914400;
const EMU_MAX = 27273042316900; // ST_Coordinate upper bound
const SLIDE_W = Math.round(13.333 * EMU_PER_IN);
const SLIDE_H = 7.5 * EMU_PER_IN;

/** Preset geometries we actually emit, plus the rest of the common ST_ShapeType
 *  surface. Unknown tokens make PowerPoint drop the shape silently. */
const PRST = new Set([
  "rect", "roundRect", "round1Rect", "round2SameRect", "round2DiagRect",
  "snip1Rect", "snip2SameRect", "snipRoundRect", "ellipse", "circle",
  "triangle", "rtTriangle", "diamond", "pentagon", "hexagon", "heptagon",
  "octagon", "decagon", "dodecagon", "star4", "star5", "star6", "star8",
  "star10", "star12", "star16", "star24", "star32", "parallelogram",
  "trapezoid", "nonIsoscelesTrapezoid", "chevron", "homePlate", "arc", "pie",
  "pieWedge", "chord", "teardrop", "plaque", "can", "cube", "bevel", "donut",
  "noSmoking", "blockArc", "foldedCorner", "smileyFace", "heart", "lightningBolt",
  "sun", "moon", "cloud", "arrow", "leftArrow", "rightArrow", "upArrow",
  "downArrow", "leftRightArrow", "upDownArrow", "quadArrow", "bentArrow",
  "uturnArrow", "circularArrow", "notchedRightArrow", "stripedRightArrow",
  "flowChartProcess", "flowChartDecision", "flowChartTerminator",
  "flowChartConnector", "flowChartPredefinedProcess", "flowChartDocument",
  "line", "straightConnector1", "bentConnector2", "bentConnector3",
  "bentConnector4", "bentConnector5", "curvedConnector2", "curvedConnector3",
  "curvedConnector4", "curvedConnector5", "wedgeRectCallout",
  "wedgeRoundRectCallout", "wedgeEllipseCallout", "cloudCallout", "frame",
  "halfFrame", "corner", "diagStripe", "chartX", "chartStar", "chartPlus",
  "leftBracket", "rightBracket", "leftBrace", "rightBrace", "bracketPair",
  "bracePair", "gear6", "gear9", "funnel", "pyramid", "flowChartMagneticTape",
]);
const CONNECTOR_PRST = new Set(
  [...PRST].filter((p) => p === "line" || /Connector\d$/.test(p)),
);

/* ---------------------------------------------------------------- tiny scans */
const attr = (xml, name) => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(xml);
  return m ? m[1] : null;
};
const num = (v) => (v === null || v === "" || !/^-?\d+$/.test(v) ? null : Number(v));

/**
 * Transform of a shape body. <p:sp>/<p:pic>/<p:cxnSp> carry <a:xfrm> inside
 * spPr; <p:graphicFrame> carries <p:xfrm> instead — treating that as "missing
 * transform" reports every chart frame as broken, so accept both.
 */
function xfrmOf(body) {
  const x =
    /<a:xfrm[^>]*>([\s\S]*?)<\/a:xfrm>/.exec(body) ??
    /<p:xfrm[^>]*>([\s\S]*?)<\/p:xfrm>/.exec(body);

  if (!x) return null;
  const off = /<a:off\b[^>]*\/>/.exec(x[1])?.[0] ?? "";
  const ext = /<a:ext\b[^>]*\/>/.exec(x[1])?.[0] ?? "";
  return {
    x: num(attr(off, "x")),
    y: num(attr(off, "y")),
    cx: num(attr(ext, "cx")),
    cy: num(attr(ext, "cy")),
    rot: num(attr(x[0], "rot")),
    hasOff: !!off,
    hasExt: !!ext,
  };
}

/**
 * Split <p:spTree> into its direct children in document order, which is exactly
 * PowerPoint's paint (z) order: first child = backmost.
 *
 * Implemented as a real tag walker rather than nested regexes: shape trees nest
 * the same element names inside <p:grpSp>, and a regex "balanced scan" silently
 * mis-slices those, which then mislabels every downstream geometry finding.
 */
const CHILD_KINDS = new Set([
  "p:sp",
  "p:pic",
  "p:cxnSp",
  "p:graphicFrame",
  "p:grpSp",
  "p:contentPart",
]);

function spTreeChildren(slideXml) {
  const open = slideXml.indexOf("<p:spTree>");
  if (open === -1) return { children: [], header: "" };
  const src = slideXml.slice(open + "<p:spTree>".length);
  const out = [];
  let depth = 0; // nesting depth relative to spTree
  let current = null; // { kind, start }
  let headerEnd = src.length;
  const tag = /<(\/?)([A-Za-z0-9:]+)((?:"[^"]*"|[^>"])*?)(\/?)>/g;
  let m;
  while ((m = tag.exec(src))) {
    const [raw, closing, name, , selfClose] = m;
    if (name === "p:spTree" && closing) break;
    const isSelf = selfClose === "/";
    if (!closing && !isSelf) {
      if (depth === 0 && CHILD_KINDS.has(name)) {
        current = { kind: name, start: m.index };
        if (out.length === 0) headerEnd = m.index;
      }
      depth += 1;
    } else if (closing) {
      depth -= 1;
      if (depth === 0 && current && name === current.kind) {
        out.push({
          kind: current.kind,
          xml: src.slice(current.start, m.index + raw.length),
          at: current.start,
        });
        current = null;
      }
    }
    if (depth < 0) break;
  }
  return { children: out, header: src.slice(0, headerEnd) };
}


const isFullCover = (b) =>
  b &&
  b.cx !== null &&
  b.cy !== null &&
  (b.x ?? 0) <= SLIDE_W * 0.02 &&
  (b.y ?? 0) <= SLIDE_H * 0.02 &&
  b.cx >= SLIDE_W * 0.96 &&
  b.cy >= SLIDE_H * 0.96;

/** Opaque = a solid/gradient/blip fill with no alpha modulation anywhere. */
function isOpaque(xml) {
  if (/<a:noFill\s*\/>/.test(xml)) return false;
  if (/<a:alpha\b/.test(xml) || /<a:alphaModFix\b/.test(xml)) return false;
  return /<a:solidFill>|<a:gradFill|<a:blip\b/.test(xml);
}

const textRuns = (xml) =>
  [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => m[1]);
const hasText = (xml) => textRuns(xml).some((t) => t.trim().length > 0);

/* --------------------------------------------------------------- slide audit */
function auditSlide(part, xml, relTargets) {
  const issues = [];
  const add = (rule, detail, shape) =>
    issues.push({ part, rule, detail, shape: shape ?? null });

  const { children, header } = spTreeChildren(xml);
  if (!children.length) return { issues, shapes: 0, connectors: 0, texts: 0 };

  if (!/<p:nvGrpSpPr>[\s\S]*<p:grpSpPr/.test(header)) {
    add("sptree-header", "spTree missing nvGrpSpPr/grpSpPr preamble");
  }

  const ids = new Map();
  let shapeCount = 0;
  let cxnCount = 0;
  let textCount = 0;
  const shapeIds = new Set();
  // First pass: collect ids so connector endpoint checks can cross-reference.
  for (const c of children) {
    for (const m of c.xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)) shapeIds.add(m[1]);
  }

  // Track text-bearing shapes we have already painted, for occlusion checks.
  const paintedText = [];

  children.forEach((child, z) => {
    const { kind, xml: sx } = child;
    const cNvPr = /<p:cNvPr\b[^>]*>/.exec(sx)?.[0] ?? "";
    const name = attr(cNvPr, "name");
    const idRaw = attr(cNvPr, "id");
    const label = `#${z} ${kind}${name ? ` "${name}"` : ""}`;

    const id = num(idRaw);
    if (id === null || id <= 0) add("id-valid", `${label}: invalid cNvPr id ${idRaw}`, label);
    else if (ids.has(id)) add("id-valid", `${label}: duplicate cNvPr id ${id}`, label);
    else ids.set(id, label);
    if (!name) add("name-present", `${label}: cNvPr has no name`, label);

    const box = xfrmOf(sx);
    const placeholder = /<p:ph\b/.test(sx);

    if (kind === "p:sp" || kind === "p:pic" || kind === "p:cxnSp" || kind === "p:graphicFrame") {
      if (!box && !placeholder) add("xfrm-present", `${label}: no transform (a:xfrm / p:xfrm)`, label);
      if (box) {
        if (!box.hasOff && !placeholder) add("xfrm-present", `${label}: xfrm without a:off`, label);
        if (!box.hasExt && !placeholder) add("xfrm-present", `${label}: xfrm without a:ext`, label);
        for (const [k, v] of Object.entries({ x: box.x, y: box.y, cx: box.cx, cy: box.cy })) {
          if (v === null) continue;
          if (Math.abs(v) > EMU_MAX) add("emu-range", `${label}: ${k}=${v} out of ST_Coordinate`, label);
        }
        // Rules, dividers and hairlines legitimately collapse one axis; a
        // filled/2-D geometry with a zero axis is invisible instead.
        const prstNow = /<a:prstGeom\b[^>]*prst="([^"]+)"/.exec(sx)?.[1] ?? null;
        const lineLike = prstNow !== null && CONNECTOR_PRST.has(prstNow);
        if (kind !== "p:cxnSp" && !lineLike && (box.cx === 0 || box.cy === 0)) {
          add("ext-positive", `${label}: ext ${box.cx}×${box.cy} renders nothing`, label);
        }
        const fullyOff =
          box.x !== null &&
          box.cx !== null &&
          (box.x + box.cx <= 0 || box.y + box.cy <= 0 || box.x >= SLIDE_W || box.y >= SLIDE_H);
        if (fullyOff && !box.rot) add("off-slide", `${label}: bbox entirely off-canvas`, label);
      }
    }

    /* ------------------------------------------------------------- geometry */
    if (kind === "p:sp" || kind === "p:cxnSp") {
      const prst = /<a:prstGeom\b[^>]*prst="([^"]+)"/.exec(sx)?.[1] ?? null;
      const custom = /<a:custGeom\b/.test(sx);
      if (!prst && !custom && !placeholder) {
        add("sp-geometry", `${label}: no prstGeom or custGeom`, label);
      }
      if (prst && !PRST.has(prst)) add("prst-known", `${label}: unknown prst "${prst}"`, label);
      if (custom) {
        const pathLst = /<a:pathLst>([\s\S]*?)<\/a:pathLst>/.exec(sx)?.[1] ?? "";
        if (!/<a:path\b/.test(pathLst)) add("custgeom-path", `${label}: custGeom with empty pathLst`, label);
      }
      for (const m of sx.matchAll(/<a:gd\b[^>]*fmla="val ([^"]*)"/g)) {
        if (!/^-?\d+$/.test(m[1].trim())) add("adj-numeric", `${label}: adjust "${m[1]}"`, label);
      }
    }

    /* ------------------------------------------------------------- pictures */
    for (const m of sx.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g)) {
      if (!relTargets.has(m[1])) add("blip-rel", `${label}: r:embed ${m[1]} not in slide rels`, label);
    }

    /* ----------------------------------------------------------- connectors */
    if (kind === "p:cxnSp") {
      cxnCount += 1;
      const prst = /<a:prstGeom\b[^>]*prst="([^"]+)"/.exec(sx)?.[1] ?? null;
      if (prst && !CONNECTOR_PRST.has(prst)) {
        add("cxn-geometry", `${label}: prst "${prst}" is not a connector geometry`, label);
      }
      const ln = /<a:ln\b[\s\S]*?(\/>|<\/a:ln>)/.exec(sx)?.[0] ?? "";
      if (!ln || /<a:noFill\s*\/>/.test(ln) || !/<a:solidFill>|<a:gradFill/.test(ln)) {
        add("cxn-visible", `${label}: no stroked a:ln — invisible in PowerPoint`, label);
      }
      if (box && box.cx === 0 && box.cy === 0) {
        add("cxn-zero-length", `${label}: zero-length connector`, label);
      }
      const st = attr(/<a:stCxn\b[^>]*\/>/.exec(sx)?.[0] ?? "", "id");
      const en = attr(/<a:endCxn\b[^>]*\/>/.exec(sx)?.[0] ?? "", "id");
      for (const [which, ref] of [["stCxn", st], ["endCxn", en]]) {
        if (ref && !shapeIds.has(ref)) {
          add("cxn-endpoint", `${label}: ${which} id=${ref} has no shape on this slide`, label);
        }
      }
      if (st && en && st === en) add("cxn-self", `${label}: both ends bound to shape ${st}`, label);
    }
    if (kind === "p:sp") shapeCount += 1;

    /* --------------------------------------------------------------- text */
    const bodies = [...sx.matchAll(/<p:txBody>([\s\S]*?)<\/p:txBody>/g)].map((m) => m[1]);
    for (const body of bodies) {
      const bodyPr = /<a:bodyPr\b[^>]*(\/>|>)/.exec(body)?.[0] ?? "";
      if (!bodyPr) {
        add("bodypr-present", `${label}: txBody without bodyPr`, label);
        continue;
      }
      const paras = [...body.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)].map((m) => m[1]);
      const runs = [...body.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)].map((m) => m[1]);
      const filled = runs.filter((r) => (/<a:t>([\s\S]*?)<\/a:t>/.exec(r)?.[1] ?? "").trim());
      textCount += filled.length;
      // "Baked" = our exporter emitted the pre-measured line layout, i.e. more
      // than one paragraph or explicit breaks; PowerPoint must not re-flow it.
      const baked = paras.length > 1 || /<a:br\b/.test(body);

      if (baked) {
        const wrap = attr(bodyPr, "wrap");
        if (wrap !== "none") {
          add("wrap-contract", `${label}: baked ${paras.length}-line body wrap="${wrap ?? "square"}"`, label);
        }
        if (/<a:normAutofit\b[^>]*fontScale=/.test(body) || /<a:spAutoFit\s*\/>/.test(body)) {
          add("autofit-conflict", `${label}: autofit on a baked line layout`, label);
        }
        for (const ins of ["lIns", "tIns", "rIns", "bIns"]) {
          if (!new RegExp(`${ins}="`).test(bodyPr)) {
            add("inset-explicit", `${label}: bodyPr missing ${ins} on baked body`, label);
            break;
          }
        }
        // Vertical fit. Measure per paragraph (a small caption line under one
        // big display line must not be charged the display size), honour an
        // explicit <a:lnSpc> pitch when the exporter baked one, and allow a
        // 6% slack so ordinary rounding does not read as an overflow.
        const lnSpcPts = num(/<a:lnSpc><a:spcPts val="(\d+)"\/><\/a:lnSpc>/.exec(body)?.[1] ?? null);
        const lnSpcPct = num(/<a:lnSpc><a:spcPct val="(\d+)"\/><\/a:lnSpc>/.exec(body)?.[1] ?? null);
        let needed = 0;
        for (const p of paras) {
          const sizes = [...p.matchAll(/\bsz="(\d+)"/g)].map((m) => Number(m[1]) / 100);
          const sz = sizes.length ? Math.max(...sizes) : 18;
          const linesInPara = 1 + (p.match(/<a:br\b/g)?.length ?? 0);
          const pitch = lnSpcPts
            ? lnSpcPts / 100
            : sz * (lnSpcPct ? lnSpcPct / 100000 : 1.2);
          needed += linesInPara * pitch;
        }
        if (needed && box?.cy) {
          const neededEmu = needed * (EMU_PER_IN / 72);
          const tIns = num(attr(bodyPr, "tIns")) ?? 45720;
          const bIns = num(attr(bodyPr, "bIns")) ?? 45720;
          const avail = box.cy - tIns - bIns;
          if (neededEmu > avail * 1.06) {
            add(
              "text-overflow",
              `${label}: ${paras.length} para(s) ≈ ${(neededEmu / EMU_PER_IN).toFixed(2)}" in ${(avail / EMU_PER_IN).toFixed(2)}" of box`,
              label,
            );
          }
        }

      }
      for (const r of runs) {
        const t = /<a:t>([\s\S]*?)<\/a:t>/.exec(r)?.[1] ?? "";
        if (!t.length) add("empty-run", `${label}: run with empty a:t`, label);
        if (!/<a:latin\b[^>]*typeface="/.test(r)) {
          add("font-unset", `${label}: run without a:latin typeface`, label);
        }
      }
      if (filled.length && box) paintedText.push({ z, label, box });
    }

    /* ------------------------------------------------------------- z-order */
    const opaque = isOpaque(sx);
    const cover = isFullCover(box);
    if (cover && opaque && (kind === "p:pic" || kind === "p:sp")) {
      // Full-bleed hero photography legitimately paints over the backdrop
      // plate, so only complain when the buried children are real content:
      // anything carrying text, or any shape that is not itself a full-cover
      // plate. That distinction is what separates MV-IMG-FULL-BLEED (fine)
      // from a backdrop emitted after the module (everything disappears).
      const buried = children
        .slice(0, z)
        .filter((c) => hasText(c.xml) || !isFullCover(xfrmOf(c.xml)));
      if (buried.length) {
        add(
          kind === "p:pic" ? "backdrop-first" : "z-occlusion",
          `${label}: opaque full-bleed painted at z=${z}, burying ${buried.length} content child(ren)`,
          label,
        );
      }
    } else if (opaque && box && !hasText(sx) && paintedText.length) {

      // A later opaque shape that fully covers an earlier text box hides it.
      for (const t of paintedText) {
        if (
          t.box.x !== null &&
          box.x !== null &&
          box.x <= t.box.x &&
          box.y <= t.box.y &&
          box.x + box.cx >= t.box.x + t.box.cx &&
          box.y + box.cy >= t.box.y + t.box.cy
        ) {
          add(
            kind === "p:pic" ? "plate-behind-text" : "z-occlusion",
            `${label}: covers text ${t.label} painted earlier at z=${t.z}`,
            label,
          );
          break;
        }
      }
    }
  });

  return { issues, shapes: shapeCount, connectors: cxnCount, texts: textCount, children: children.length };
}

/* ------------------------------------------------------------------- package */
async function auditFile(file) {
  const zip = await JSZip.loadAsync(await readFile(file));
  const issues = [];
  let slides = 0;
  let shapes = 0;
  let connectors = 0;
  let texts = 0;

  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  names.sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  for (const name of names) {
    slides += 1;
    const xml = await zip.file(name).async("string");
    const relName = name.replace(/slides\/(slide\d+)\.xml$/, "slides/_rels/$1.xml.rels");
    const relTargets = new Set();
    const rels = zip.file(relName);
    if (rels) {
      const relXml = await rels.async("string");
      for (const m of relXml.matchAll(/Id="([^"]+)"/g)) relTargets.add(m[1]);
    }
    const r = auditSlide(name, xml, relTargets);
    issues.push(...r.issues);
    shapes += r.shapes;
    connectors += r.connectors;
    texts += r.texts;
  }
  return { file, slides, shapes, connectors, texts, issues };
}

/* ---------------------------------------------------------------- reporting */
// Severity tiers decide what the CI gate blocks on:
//   fatal    — PowerPoint refuses the package or shows the repair dialog
//   render   — the file opens but the slide is visibly wrong (buried/clipped)
//   advisory — a house-contract nit that PowerPoint renders acceptably
const SEVERITY = {
  // fatal: schema / package integrity
  "sptree-header": "fatal",
  "xfrm-present": "fatal",
  "sp-geometry": "fatal",
  "cxn-geometry": "fatal",
  "prst-known": "fatal",
  "custgeom-path": "fatal",
  "adj-numeric": "fatal",
  "emu-range": "fatal",
  "id-valid": "fatal",
  "blip-rel": "fatal",
  "cxn-endpoint": "fatal",
  "read-error": "fatal",
  // render: opens, looks wrong
  "backdrop-first": "render",
  "z-occlusion": "render",
  "plate-behind-text": "render",
  "text-overflow": "render",
  "off-slide": "render",
  "ext-positive": "render",
  "autofit-conflict": "render",
  "cxn-zero-length": "render",
  "cxn-self": "render",
  "empty-run": "render",
  // advisory: contract hygiene
  "wrap-contract": "advisory",
  "inset-explicit": "advisory",
  "bodypr-present": "advisory",
  "name-present": "advisory",
  "font-unset": "advisory",
  "cxn-visible": "advisory",
};
const sev = (rule) => SEVERITY[rule] ?? "render";
const BLOCKING = new Set(STRICT ? ["fatal", "render", "advisory"] : ["fatal", "render"]);
const label = (file) => {
  const base = path.basename(file);
  const dir = path.basename(path.dirname(file));
  return /^(cell|out|output|deck)\.pptx$/i.test(base) ? `${dir}/${base}` : base;
};

function groupByRule(issues) {
  const m = new Map();
  for (const i of issues) m.set(i.rule, [...(m.get(i.rule) ?? []), i]);
  return [...m].sort(
    (a, b) =>
      ["fatal", "render", "advisory"].indexOf(sev(a[0])) -
        ["fatal", "render", "advisory"].indexOf(sev(b[0])) || b[1].length - a[1].length,
  );
}


async function main() {
  if (!files.length) {
    console.error(
      "usage: node scripts/infographic-ooxml-audit.mjs <deck.pptx…> [--json out] [--md out] [--ci] [--quiet]",
    );
    process.exit(2);
  }

  const results = [];
  for (const f of files) {
    try {
      results.push(await auditFile(f));
    } catch (err) {
      results.push({ file: f, slides: 0, shapes: 0, connectors: 0, texts: 0, issues: [{ part: "-", rule: "read-error", detail: String(err).slice(0, 200) }] });
    }
  }

  let total = 0;
  for (const r of results) {
    for (const i of r.issues) i.severity = sev(i.rule);
    total += r.issues.length;
    if (QUIET && !r.issues.length) continue;
    console.log(
      `\n${label(r.file)} — ${r.slides} slide(s) · ${r.shapes} sp · ${r.connectors} cxnSp · ${r.texts} run(s)`,
    );
    if (!r.issues.length) {
      console.log("  ✓ no violations");
      continue;
    }
    for (const [rule, list] of groupByRule(r.issues)) {
      const s = sev(rule);
      console.log(`  ${s === "advisory" ? "·" : "✗"} ${rule} [${s}] × ${list.length}`);
      for (const i of list.slice(0, 4)) console.log(`      ${i.part}: ${i.detail}`);
      if (list.length > 4) console.log(`      … ${list.length - 4} more`);
    }
  }

  const all = results.flatMap((r) => r.issues);
  const tier = (t) => all.filter((i) => sev(i.rule) === t).length;
  const blocking = all.filter((i) => BLOCKING.has(sev(i.rule))).length;
  console.log(
    `\n${files.length} package(s) · ${results.reduce((a, r) => a + r.slides, 0)} slide(s) · ` +
      `fatal ${tier("fatal")} · render ${tier("render")} · advisory ${tier("advisory")} · ` +
      `${blocking === 0 ? "✓ gate clean" : `✗ ${blocking} blocking`}`,
  );
  if (total) {
    console.log("  by rule:");
    for (const [rule, list] of groupByRule(all)) {
      console.log(`    ${rule.padEnd(18)} ${String(list.length).padStart(4)}  ${sev(rule)}`);
    }
  }

  if (jsonOut) {
    await writeFile(
      jsonOut,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          total,
          blocking,
          bySeverity: { fatal: tier("fatal"), render: tier("render"), advisory: tier("advisory") },
          results,
        },
        null,
        2,
      ),
    );

    console.log(`· json → ${jsonOut}`);
  }
  if (mdOut) {
    const lines = [
      "# Infographic OOXML audit",
      "",
      `Generated ${new Date().toISOString()} · ${files.length} package(s) · ${total} violation(s)`,
      "",
      "| rule | count |",
      "| --- | --- |",
      ...groupByRule(all).map(([rule, list]) => `| \`${rule}\` | ${list.length} |`),
      "",
      "## Packages",
      "",
      "| package | slides | sp | cxnSp | runs | violations |",
      "| --- | --- | --- | --- | --- | --- |",
      ...results.map(
        (r) =>
          `| ${path.basename(r.file)} | ${r.slides} | ${r.shapes} | ${r.connectors} | ${r.texts} | ${r.issues.length} |`,
      ),
    ];
    for (const r of results.filter((x) => x.issues.length)) {
      lines.push("", `### ${path.basename(r.file)}`, "");
      for (const [rule, list] of groupByRule(r.issues)) {
        lines.push(`- **${rule}** × ${list.length}`);
        for (const i of list.slice(0, 8)) lines.push(`  - \`${i.part}\` ${i.detail}`);
        if (list.length > 8) lines.push(`  - … ${list.length - 8} more`);
      }
    }
    await writeFile(mdOut, `${lines.join("\n")}\n`);
    console.log(`· markdown → ${mdOut}`);
  }

  if (total && CI) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
