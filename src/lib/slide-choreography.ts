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

/** Build the `<p:timing>` block for a slide, or null when nothing animates. */
export function entranceTimingXml(xml: string, variantId: string): string | null {
  const recipe = introRecipeFor(variantId);
  const area = SLIDE_W_EMU * SLIDE_H_EMU;
  const items = topLevelObjects(xml)
    // Backgrounds and ambient full-bleed plates never animate.
    .filter((c) => (c.w * c.h) / area < 0.45)
    .map((c) => ({
      ...c,
      // orderIntroItems works in 1920x1080 slide space.
      x: (c.x / SLIDE_W_EMU) * 1920,
      y: (c.y / SLIDE_H_EMU) * 1080,
      w: (c.w / SLIDE_W_EMU) * 1920,
    }));
  if (!items.length) return null;
  const ordered = orderIntroItems(items, recipe.order).slice(0, MAX_ANIMATED);
  const fx = filterFor(recipe);
  let n = 4;
  const effects = ordered
    .map((it, beat) => {
      const delay = Math.round(recipe.leadMs + introBeatDelay(recipe, beat, ordered.length));
      const dur = Math.max(200, Math.round(recipe.durationMs));
      const a = (n += 1);
      const b = (n += 1);
      const c = (n += 1);
      const tgt = `<p:tgtEl><p:spTgt spid="${it.id}"/></p:tgtEl>`;
      return (
        `<p:par><p:cTn id="${a}" presetID="${fx.preset}" presetClass="entr" presetSubtype="${fx.sub}" fill="hold" nodeType="withEffect">` +
        `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>` +
        `<p:set><p:cBhvr><p:cTn id="${b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>${tgt}` +
        `<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>` +
        `<p:animEffect transition="in" filter="${fx.filter}"><p:cBhvr><p:cTn id="${c}" dur="${dur}"/>${tgt}</p:cBhvr></p:animEffect>` +
        `</p:childTnLst></p:cTn></p:par>`
      );
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
