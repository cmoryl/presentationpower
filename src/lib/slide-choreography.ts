/**
 * Slide choreography — one source for (a) the slide-to-slide transition each
 * module family gets when a deck opts into `context.choreography = "auto"`, and
 * (b) the native PowerPoint `<p:timing>` entrance build that mirrors the
 * on-screen SlideIntro recipe (bars wipe up, rings wheel in, cards cascade).
 *
 * The PowerPoint build is a single automatic sequence that starts as the slide
 * arrives ("With Previous" + staggered delays), so the presenter never has to
 * click through builds and nothing stays hidden if a click is missed.
 */
import type { SlideTransition } from "./deck-store";
import { introBeatDelay, introRecipeFor, orderIntroItems, type IntroRecipe } from "./slide-intro";

/** Transition per module family for choreographed decks. */
export function choreographedTransition(variantId: string): SlideTransition {
  const v = variantId;
  if (v.startsWith("MV-OP-COVER")) return { type: "fade", durationMs: 620 };
  if (v.startsWith("MV-OP-DIVIDER")) return { type: "push-left", durationMs: 520 };
  // A run of process steps reads as one continuous move forward.
  if (v.startsWith("MV-PROC-STEP")) return { type: "push-left", durationMs: 480 };
  if (v.startsWith("MV-PROC")) return { type: "zoom", durationMs: 520 };
  // Region maps crossfade so the world appears to refocus, not jump.
  if (v.startsWith("MV-LOC")) return { type: "fade", durationMs: 560 };
  if (/HUB|COMPARE|ORBITS|INS/.test(v)) return { type: "zoom", durationMs: 500 };
  if (v.startsWith("MV-SOL") || v.startsWith("MV-PROOF-LOGOS"))
    return { type: "push-left", durationMs: 460 };
  return { type: "fade", durationMs: 450 };
}

// ---------------------------------------------------------------------------
// PowerPoint entrance timing
// ---------------------------------------------------------------------------

const SLIDE_W_EMU = 12192000;
const SLIDE_H_EMU = 6858000;
const MAX_ANIMATED = 24;

type Child = { id: number; x: number; y: number; w: number; h: number };

/** Top-level objects of the slide's shape tree, in z-order. */
export function topLevelObjects(xml: string): Child[] {
  const open = xml.indexOf("<p:spTree>");
  const close = xml.lastIndexOf("</p:spTree>");
  if (open < 0 || close < 0) return [];
  const body = xml.slice(open + "<p:spTree>".length, close);
  const re = /<(\/?)p:(sp|pic|grpSp|graphicFrame|cxnSp)\b[^>]*?(\/?)>/g;
  const out: Child[] = [];
  let depth = 0;
  let start = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const closing = m[1] === "/";
    const selfClose = m[3] === "/";
    if (!closing && !selfClose) {
      if (depth === 0) start = m.index;
      depth += 1;
    } else if (closing) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const chunk = body.slice(start, re.lastIndex);
        const id = Number(/<p:cNvPr\b[^>]*\bid="(\d+)"/.exec(chunk)?.[1]);
        const off = /<a:off x="(-?\d+)" y="(-?\d+)"/.exec(chunk);
        const ext = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(chunk);
        if (Number.isFinite(id) && off && ext) {
          out.push({ id, x: +off[1], y: +off[2], w: +ext[1], h: +ext[2] });
        }
        start = -1;
      }
    }
  }
  return out;
}

function filterFor(recipe: IntroRecipe): { preset: number; sub: number; filter: string } {
  switch (recipe.keyframe) {
    case "tp-in-grow":
      return { preset: 22, sub: 4, filter: "wipe(up)" };
    case "tp-in-grow-x":
    case "tp-in-left":
    case "tp-in-clip":
      return { preset: 22, sub: 8, filter: "wipe(right)" };
    case "tp-in-right":
      return { preset: 22, sub: 2, filter: "wipe(left)" };
    case "tp-in-spin":
    case "tp-in-orbit":
      return { preset: 21, sub: 1, filter: "wheel(1)" };
    default:
      return { preset: 10, sub: 0, filter: "fade" };
  }
}

type Unit = { ids: number[]; x: number; y: number; w: number; h: number };

/** A card (box + its words) builds as one unit: small boxes absorb what sits inside them. */
function buildUnits(items: Child[]): Unit[] {
  const area = SLIDE_W_EMU * SLIDE_H_EMU;
  const units: Unit[] = items.map((c) => ({ ids: [c.id], x: c.x, y: c.y, w: c.w, h: c.h }));
  const inside = (a: Unit, b: Unit) => {
    const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return a.w * a.h > 0 && (ix * iy) / (a.w * a.h) > 0.7;
  };
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < units.length; i++) {
      const host = units[i];
      // Only card-sized hosts absorb children; a map or wide panel stays its own beat.
      if ((host.w * host.h) / area > 0.08) continue;
      for (let j = 0; j < units.length; j++) {
        if (i === j) continue;
        const g = units[j];
        if (g.w * g.h <= host.w * host.h && inside(g, host)) {
          const x = Math.min(host.x, g.x);
          const y = Math.min(host.y, g.y);
          host.w = Math.max(host.x + host.w, g.x + g.w) - x;
          host.h = Math.max(host.y + host.h, g.y + g.h) - y;
          host.x = x;
          host.y = y;
          host.ids.push(...g.ids);
          units.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return units;
}

/** Rows found by vertical gaps, not fixed bands, so aligned items always share a row. */
function readingRows(units: Unit[]): Unit[][] {
  const sorted = [...units].sort((a, b) => a.y - b.y);
  const rows: Unit[][] = [];
  for (const u of sorted) {
    const row = rows[rows.length - 1];
    if (row) {
      const top = Math.min(...row.map((r) => r.y));
      const minH = Math.min(...row.map((r) => r.h), u.h);
      if (u.y - top < Math.max(minH * 0.5, SLIDE_H_EMU * 0.02)) {
        row.push(u);
        continue;
      }
    }
    rows.push([u]);
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

/** Build the `<p:timing>` block for a slide, or null when nothing animates. */
export function entranceTimingXml(xml: string, variantId: string): string | null {
  const recipe = introRecipeFor(variantId);
  const area = SLIDE_W_EMU * SLIDE_H_EMU;
  const objects = topLevelObjects(xml)
    // Backgrounds and ambient full-bleed plates never animate.
    .filter((c) => (c.w * c.h) / area < 0.45)
    // Header/footer chrome (logo strip, page number) is part of the page, not the story.
    .filter((c) => c.y + c.h > SLIDE_H_EMU * 0.1 && c.y < SLIDE_H_EMU * 0.92);
  if (!objects.length) return null;
  const units = buildUnits(objects);
  // Groups of units that enter together. Reading-order slides build one row at a
  // time, so a list or grid descends as an even wave and a row is never split.
  let groups: Unit[][];
  if (recipe.order === "top-down" || recipe.order === "grid") {
    groups = readingRows(units);
  } else {
    const keyed = units.map((u) => ({
      u,
      x: (u.x / SLIDE_W_EMU) * 1920,
      y: (u.y / SLIDE_H_EMU) * 1080,
      w: (u.w / SLIDE_W_EMU) * 1920,
    }));
    groups = orderIntroItems(keyed, recipe.order).map((k) => [k.u]);
  }
  // Every object animates: long sequences are split into even consecutive beats
  // instead of animating the first few and leaving the rest already showing.
  const beatCount = Math.min(MAX_ANIMATED, groups.length);
  const beats: number[][] = Array.from({ length: beatCount }, () => []);
  groups.forEach((g, i) =>
    beats[Math.floor((i * beatCount) / groups.length)].push(...g.flatMap((u) => u.ids)),
  );
  const fx = filterFor(recipe);
  const dur = Math.max(200, Math.round(recipe.durationMs));
  let n = 4;
  const effects = beats
    .flatMap((ids, beat) => {
      const delay = introBeatDelay(recipe, beat, beatCount);
      return ids.map((id) => {
        const a = (n += 1);
        const b = (n += 1);
        const c = (n += 1);
        const tgt = `<p:tgtEl><p:spTgt spid="${id}"/></p:tgtEl>`;
        return (
          `<p:par><p:cTn id="${a}" presetID="${fx.preset}" presetClass="entr" presetSubtype="${fx.sub}" fill="hold" nodeType="withEffect">` +
          `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>` +
          `<p:set><p:cBhvr><p:cTn id="${b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>${tgt}` +
          `<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>` +
          `<p:animEffect transition="in" filter="${fx.filter}"><p:cBhvr><p:cTn id="${c}" dur="${dur}"/>${tgt}</p:cBhvr></p:animEffect>` +
          `</p:childTnLst></p:cTn></p:par>`
        );
      });
    })
    .join("");
  return (
    `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>` +
    `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>` +
    `<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>` +
    `<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
    effects +
    `</p:childTnLst></p:cTn></p:par>` +
    `</p:childTnLst></p:cTn></p:par>` +
    `</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
    `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>` +
    `</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`
  );
}

/** Insert the entrance build. Slides that already carry timing (video) are left alone. */
export function withEntranceTiming(xml: string, variantId: string | null | undefined): string {
  if (!variantId || xml.includes("<p:timing")) return xml;
  const block = entranceTimingXml(xml, variantId);
  if (!block) return xml;
  // Schema order: cSld, clrMapOvr, transition, timing, extLst.
  const cSldEnd = xml.lastIndexOf("</p:cSld>");
  const ext = xml.indexOf("<p:extLst", cSldEnd);
  const at = ext >= 0 ? ext : xml.lastIndexOf("</p:sld>");
  if (at < 0) return xml;
  return xml.slice(0, at) + block + xml.slice(at);
}
