// -----------------------------------------------------------------------------
// Native OOXML post-processing (Pass 3 of the transition system + accessibility)
// -----------------------------------------------------------------------------
// pptxgenjs has no API for slide transitions and no way to set alt text on
// every object it emits, so both are applied to the finished bytes here — the
// same "patch the zip after it is written" approach already used by
// pptx-font-embed.ts.
//
// Two mutations, per ppt/slides/slideN.xml:
//
//   1. <p:transition> — the deck's SlideTransition for that slide, written the
//      way PowerPoint itself writes it: an mc:AlternateContent pair so modern
//      PowerPoint gets a millisecond duration (p14:dur) while older readers
//      fall back to the coarse spd="slow|med|fast" form. Without this the deck
//      plays with "None" between every slide even though the app animates it.
//
//   2. descr="…" on <p:cNvPr> — alt text for every shape/picture that has none,
//      derived from the object's own text (preferred, because that is what the
//      object actually communicates) or from its author-given objectName. This
//      is what PowerPoint's Accessibility Checker and screen readers read.
//
// Both passes are non-fatal by construction: any failure returns the original
// blob untouched, because a missing transition must never break an export.
// -----------------------------------------------------------------------------

import type { SlideTransition, TransitionType } from "./deck-store";
import {
  GRADIENT_TAG_RE,
  AMBIENT_TAG_RE,
  gradFillXml,
  outerShdwXml,
  parseAmbientTag,
  parseGradientTag,
  stripSurfaceTags,
} from "./export-surface";
import { withGroups } from "./pptx-group-xml";
import { withRoundedPictures } from "./pptx-shape-normalize";

// -----------------------------------------------------------------------------
// Surface passes
//
// pptxgenjs emits `shadow` natively on shapes (verified: `createShadowElement`
// is called from the shape/image writers), so the drop shadow is set through
// the public API in pptx-shape-normalize. What it CANNOT express is:
//
//   · a gradient fill of any kind  → `withGradientFills`
//   · a SECOND shadow in the same effectLst, which is how the backdrop-blur
//     wash is approximated  → `withShapeShadows`
//
// Both read their spec off the object name (`[gf:…]` / `[sh:…]`), patch the
// shape's `<p:spPr>`, then strip the tag so the user never sees it. Both are
// no-ops when nothing is tagged.
// -----------------------------------------------------------------------------

/** Replace a tagged shape's solid fill with real, editable gradient stops. */
export function withGradientFills(xml: string): string {
  if (!GRADIENT_TAG_RE.test(xml)) return xml;
  return xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => {
    const nameMatch = /name="([^"]*)"/.exec(sp);
    if (!nameMatch) return sp;
    const grad = parseGradientTag(nameMatch[1]);
    if (!grad) return sp;
    const frag = gradFillXml(grad);

    let out = sp.replace(/<p:spPr>[\s\S]*?<\/p:spPr>/, (spPr) => {
      if (/<a:solidFill>/.test(spPr)) {
        return spPr.replace(/<a:solidFill>[\s\S]*?<\/a:solidFill>/, frag);
      }
      if (/<a:noFill\s*\/>/.test(spPr)) return spPr.replace(/<a:noFill\s*\/>/, frag);
      // No fill element at all: drop the gradient in right after the geometry.
      return spPr.replace(/(<\/a:prstGeom>|<a:prstGeom[^>]*\/>)/, `$1${frag}`);
    });
    if (out === sp) return sp;
    out = out.replace(
      /name="([^"]*)"/,
      (_all, name: string) => `name="${stripSurfaceTags(name) || "TP Surface"}"`,
    );
    return out;
  });
}

/**
 * Add the ambient backdrop-blur stand-in as a second `a:outerShdw` alongside
 * the native drop shadow, so the whole glass treatment travels with the shape
 * instead of being stranded on a raster plate.
 */
export function withShapeShadows(xml: string): string {
  if (!AMBIENT_TAG_RE.test(xml)) return xml;
  return xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => {
    const nameMatch = /name="([^"]*)"/.exec(sp);
    if (!nameMatch) return sp;
    const amb = parseAmbientTag(nameMatch[1]);
    if (!amb) return sp;
    const frag = outerShdwXml(amb);

    let out = sp.replace(/<p:spPr>([\s\S]*?)<\/p:spPr>/, (spPr) => {
      if (/<a:effectLst>/.test(spPr)) {
        // The wash sits UNDER the drop shadow in paint order.
        return spPr.replace(/<a:effectLst>/, `<a:effectLst>${frag}`);
      }
      if (/<a:effectLst\s*\/>/.test(spPr)) {
        return spPr.replace(/<a:effectLst\s*\/>/, `<a:effectLst>${frag}</a:effectLst>`);
      }
      return spPr.replace(/<\/p:spPr>/, `<a:effectLst>${frag}</a:effectLst></p:spPr>`);
    });
    if (out === sp) return sp;
    out = out.replace(
      /name="([^"]*)"/,
      (_all, name: string) => `name="${stripSurfaceTags(name) || "TP Surface"}"`,
    );
    return out;
  });
}


const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const P14_NS = "http://schemas.microsoft.com/office/powerpoint/2010/main";

/** Objects whose auto-generated pptxgenjs name carries no meaning. */
const GENERIC_NAME = /^(object|shape|picture|image|text|textbox|chart|table)\s*\d*$/i;

/** Slide part order: cSld, clrMapOvr, transition, timing. */
const TIMING_OPEN = "<p:timing";
const SLD_CLOSE = "</p:sld>";

/** OOXML element for a transition type. `none` yields no element at all. */
function transitionElement(type: TransitionType): string | null {
  switch (type) {
    case "fade":
      return "<p:fade/>";
    case "push-left":
      return '<p:push dir="l"/>';
    case "push-right":
      return '<p:push dir="r"/>';
    case "zoom":
      return '<p:zoom dir="in"/>';
    case "cut":
      return "<p:cut/>";
    default:
      return null;
  }
}

/** Coarse legacy speed bucket for readers that ignore p14:dur. */
function speedFor(durationMs: number): "fast" | "med" | "slow" {
  if (durationMs <= 250) return "fast";
  if (durationMs <= 600) return "med";
  return "slow";
}

/**
 * The transition markup for one slide, or null when the slide should advance
 * instantly. `cut` is a real (instant) PowerPoint transition, so it is emitted;
 * only `none` is omitted entirely.
 */
export function transitionXml(t: SlideTransition | null | undefined): string | null {
  if (!t || t.type === "none") return null;
  const el = transitionElement(t.type);
  if (!el) return null;
  const dur = Math.max(0, Math.round(t.durationMs ?? 400));
  const spd = speedFor(dur);
  const modern = `<p:transition spd="${spd}" p14:dur="${dur}">${el}</p:transition>`;
  const legacy = `<p:transition spd="${spd}">${el}</p:transition>`;
  return (
    `<mc:AlternateContent xmlns:mc="${MC_NS}">` +
    `<mc:Choice xmlns:p14="${P14_NS}" Requires="p14">${modern}</mc:Choice>` +
    `<mc:Fallback>${legacy}</mc:Fallback>` +
    `</mc:AlternateContent>`
  );
}

/** Insert (or replace) the transition block in a slide part. */
export function withTransition(xml: string, block: string | null): string {
  // Never stack transitions: drop anything already present first.
  let out = xml
    .replace(/<mc:AlternateContent[^>]*>(?:(?!<\/mc:AlternateContent>)[\s\S])*?<p:transition[\s\S]*?<\/mc:AlternateContent>/g, "")
    .replace(/<p:transition\b[\s\S]*?<\/p:transition>/g, "")
    .replace(/<p:transition\b[^>]*\/>/g, "");
  if (!block) return out;
  const timing = out.indexOf(TIMING_OPEN);
  if (timing >= 0) return `${out.slice(0, timing)}${block}${out.slice(timing)}`;
  const close = out.lastIndexOf(SLD_CLOSE);
  if (close < 0) return out;
  return `${out.slice(0, close)}${block}${out.slice(close)}`;
}

/**
 * PowerPoint "Hide Slide" — `<p:sld show="0">`. Hidden slides remain in the
 * file (and stay editable) but PowerPoint skips them during a slide show.
 */
export function withHiddenFlag(xml: string, hidden: boolean): string {
  const m = /<p:sld\b[^>]*>/.exec(xml);
  if (!m) return xml;
  const tag = m[0];
  const cleaned = tag.replace(/\s+show="[^"]*"/, "");
  const next = hidden ? cleaned.replace(/(\/?)>$/, ' show="0"$1>') : cleaned;
  if (next === tag) return xml;
  return xml.slice(0, m.index) + next + xml.slice(m.index + tag.length);
}

/**
 * Replace (or insert) the slideMaster's `<p:bg>` with a solid brand fill. The
 * block must be the FIRST child of `<p:cSld>` per the PresentationML schema,
 * otherwise PowerPoint reports the file as needing repair.
 */
export function withMasterBackground(xml: string, hex: string): string {
  const bg = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${hex}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;
  if (/<p:bg>[\s\S]*?<\/p:bg>/.test(xml)) {
    return xml.replace(/<p:bg>[\s\S]*?<\/p:bg>/, bg);
  }
  const m = /<p:cSld\b[^>]*>/.exec(xml);
  if (!m) return xml;
  const at = m.index + m[0].length;
  return xml.slice(0, at) + bg + xml.slice(at);
}

function attrEscape(value: string): string {
  return value
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

/** First ~140 chars of the visible text inside an object's markup window. */
function textOf(window: string): string {
  const runs = window.match(/<a:t>([\s\S]*?)<\/a:t>/g);
  if (!runs) return "";
  const joined = runs
    .map((r) => r.replace(/<\/?a:t>/g, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return joined.length > 140 ? `${joined.slice(0, 137)}…` : joined;
}

/**
 * Add `descr` (alt text) to every non-visual property element that lacks one.
 * Preference order: the object's own text → its objectName → skipped (a shape
 * with neither is decorative, and inventing alt text for it would only add
 * noise for screen-reader users).
 */
export function withAltText(xml: string): string {
  return xml.replace(
    /<p:cNvPr\b([^>]*?)(\/?)>/g,
    (match, attrs: string, selfClose: string, offset: number, whole: string) => {
      if (/\bdescr\s*=/.test(attrs)) return match;
      const next = whole.indexOf("<p:cNvPr", offset + 1);
      const window = whole.slice(offset, next < 0 ? undefined : next);
      const name = /\bname="([^"]*)"/.exec(attrs)?.[1] ?? "";
      const body = textOf(window);
      const alt = body || (GENERIC_NAME.test(name.trim()) ? "" : name);
      if (!alt.trim()) return match;
      return `<p:cNvPr${attrs} descr="${attrEscape(alt)}"${selfClose}>`;
    },
  );
}

function slideOrder(names: string[]): string[] {
  return names.sort(
    (a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]),
  );
}

export interface NativeFeatureOptions {
  /** One entry per slide, in deck order. `null`/`none` = no transition. */
  transitions?: Array<SlideTransition | null>;
  /**
   * Brand background (6-char hex, no `#`) painted onto the real slideMaster so
   * PowerPoint's Slide Master view — and any layout that resets to the master
   * — inherits the deck background instead of default white.
   */
  masterBackground?: string | null;
  /** One entry per slide, in deck order. `true` = PowerPoint "Hide Slide". */
  hidden?: boolean[];
  /** Fill in missing alt text on every object. Defaults to true. */
  altText?: boolean;
  /**
   * Wrap objects the exporter tagged with `[g:<id>|<label>]` in native
   * <p:grpSp> groups so composite cards move/resize as one unit. Defaults to
   * true; the pass also strips the tags from object names, so it should stay on
   * even when nothing is tagged (it is a no-op then).
   */
  groups?: boolean;
  /**
   * Apply the `[gf:…]` gradient fills and `[sh:…]` ambient washes the design
   * surface pass tagged. Defaults to true; no-op when nothing is tagged, and it
   * must stay on whenever anything is, or the tags leak into object names.
   */
  surfaces?: boolean;
  /**
   * Flatten embedded SVG media to PNG. Set when the reviewer's "prefer vector"
   * preference is OFF, so inline icon glyphs follow the same compatibility
   * choice logos and backdrops already do.
   */
  flattenVectors?: boolean;
  /**
   * Export DPI setting, used to size flattened SVG rasters to the box each
   * picture is actually drawn at (see pptx-vector-flatten).
   */
  quality?: string | null;
}

/**
 * Apply the native features pptxgenjs cannot emit. Returns the original blob
 * unchanged if anything goes wrong — an export must never fail because a
 * transition or an alt-text attribute could not be written.
 */
export async function applyNativePptxFeatures(
  blob: Blob,
  opts: NativeFeatureOptions = {},
): Promise<Blob> {
  const wantAlt = opts.altText !== false;
  const wantGroups = opts.groups !== false;
  const wantSurfaces = opts.surfaces !== false;
  const transitions = opts.transitions ?? [];
  const wantTransitions = transitions.some((t) => !!transitionXml(t));
  const wantFlatten = opts.flattenVectors === true;
  const hiddenFlags = opts.hidden ?? [];
  const wantHidden = hiddenFlags.some(Boolean);
  const masterBg = (opts.masterBackground ?? "").replace(/^#/, "").toUpperCase();
  const wantMasterBg = /^[0-9A-F]{6}$/.test(masterBg);
  if (
    !wantAlt &&
    !wantTransitions &&
    !wantGroups &&
    !wantSurfaces &&
    !wantFlatten &&
    !wantHidden &&
    !wantMasterBg
  )
    return blob;


  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const parts = slideOrder(
      Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)),
    );
    let touched = 0;

    for (let i = 0; i < parts.length; i += 1) {
      try {
        let xml = await zip.file(parts[i])!.async("string");
        const before = xml;
        if (wantTransitions) xml = withTransition(xml, transitionXml(transitions[i]));
        if (wantHidden) xml = withHiddenFlag(xml, hiddenFlags[i] === true);
        // Grouping runs before alt text so descr is derived from the cleaned,
        // tag-free object names.
        // Rounded photo crops and the surface passes run before grouping so the
        // `[r:…]` / `[gf:…]` / `[sh:…]` tags are gone by the time object names
        // are folded into group children.
        xml = withRoundedPictures(xml);
        if (wantSurfaces) {
          xml = withGradientFills(xml);
          xml = withShapeShadows(xml);
        }
        if (wantGroups) xml = withGroups(xml);
        if (wantAlt) xml = withAltText(xml);

        if (xml !== before) {
          zip.file(parts[i], xml);
          touched += 1;
        }
      } catch (err) {
        console.warn(`[pptx-native-xml] skipped ${parts[i]}`, err);
      }
    }

    if (wantMasterBg) {
      for (const name of Object.keys(zip.files).filter((n) =>
        /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(n),
      )) {
        try {
          const xml = await zip.file(name)!.async("string");
          const next = withMasterBackground(xml, masterBg);
          if (next !== xml) {
            zip.file(name, next);
            touched += 1;
          }
        } catch (err) {
          console.warn(`[pptx-native-xml] skipped ${name}`, err);
        }
      }
    }

    if (wantFlatten) {
      try {
        const { flattenVectorMedia } = await import("./pptx-vector-flatten");
        touched += await flattenVectorMedia(zip, {
          quality: (opts.quality ?? null) as never,
        });
      } catch (err) {
        console.warn("[pptx-native-xml] vector flattening skipped", err);
      }
    }

    if (touched === 0) return blob;
    return (await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })) as Blob;
  } catch (err) {
    console.warn("[pptx-native-xml] post-processing skipped", err);
    return blob;
  }
}
