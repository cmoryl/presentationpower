/**
 * TRACKED-TEXT FIT AUDIT (export side)
 * ====================================
 *
 * The clipping defect we chased on MV-QUOTE-PORTRAIT ("IN THEIR WORDS" landing
 * as "IN THEIR W") had two independently sufficient causes in the emitted
 * OOXML:
 *
 *   1. a translucent run colour (`<a:alpha>` inside the run's `solidFill`),
 *      which makes several renderers lay a letter-spaced string out at its
 *      UNTRACKED width and then clip the tail; and
 *   2. a text box whose usable width is narrower than the tracked string, so
 *      even a correct renderer has to wrap or clip it.
 *
 * Both are detectable straight from `ppt/slides/slideN.xml` — no rasterizing,
 * no LibreOffice, no Office round-trip. This module parses the text objects out
 * of a slide part and reports offenders, so a headless sweep can cover every
 * module in the library instead of the handful anyone can eyeball.
 *
 * Text measurement is injected (`measure`) because the only accurate measurer
 * is the browser's own text engine; the harness passes a canvas-backed one.
 */

const EMU_PER_IN = 914400;
const PT_PER_IN = 72;
const DEFAULT_INSET_EMU = 91440; // 0.1in, the OOXML default for lIns/rIns

/** Measure one string's advance width, in points, at `sizePt` for this face. */
export type MeasureText = (
  text: string,
  sizePt: number,
  bold: boolean,
  family: string,
) => number;

export interface TextRunAudit {
  text: string;
  /** Font size in points. */
  sizePt: number;
  /** Letter spacing in points (OOXML `spc`, hundredths of a point). */
  trackingPt: number;
  bold: boolean;
  family: string;
  /** Run colour carried an alpha (transparency) modifier. */
  translucent: boolean;
  /** Usable inner width of the containing box, in points. */
  availablePt: number;
  /** Measured width of the run including tracking, in points. */
  requiredPt: number;
  /** Box allows wrapping (`wrap="square"`, the default). */
  wraps: boolean;
  /** Box is set to auto-fit / shrink text. */
  autofit: boolean;
  /** Single-word (unwrappable) string. */
  singleWord: boolean;
}

export interface TextFitProblem {
  kind: "translucent-run" | "tracked-overflow";
  detail: string;
  run: TextRunAudit;
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function num(tag: string, name: string): number | null {
  const v = attr(tag, name);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Decode the small set of XML entities the exporter emits in `<a:t>`. */
function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** Split a slide part into its shape elements (`<p:sp>…</p:sp>`). */
function shapes(xml: string): string[] {
  const out: string[] = [];
  const open = /<p:sp>/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    let depth = 1;
    let i = open.lastIndex;
    while (depth > 0 && i < xml.length) {
      const nextOpen = xml.indexOf("<p:sp>", i);
      const nextClose = xml.indexOf("</p:sp>", i);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 6;
      } else {
        depth -= 1;
        i = nextClose + 7;
      }
    }
    out.push(xml.slice(m.index, i));
    open.lastIndex = i;
  }
  return out;
}

/**
 * Audit every text run on one slide part. `defaultFamily` is used when a run
 * does not name a `<a:latin>` typeface.
 */
export function auditSlideTextFit(
  slideXml: string,
  measure: MeasureText,
  defaultFamily = "Geist",
): TextFitProblem[] {
  const problems: TextFitProblem[] = [];

  for (const sp of shapes(slideXml)) {
    if (!/<p:txBody>/.test(sp)) continue;
    const ext = sp.match(/<a:ext\s[^>]*\/>/)?.[0] ?? "";
    const cx = num(ext, "cx");
    if (!cx) continue;
    const cy = num(ext, "cy") ?? 0;

    const bodyPr = sp.match(/<a:bodyPr\b[^>]*\/?>/)?.[0] ?? "";
    const lIns = num(bodyPr, "lIns") ?? DEFAULT_INSET_EMU;
    const rIns = num(bodyPr, "rIns") ?? DEFAULT_INSET_EMU;
    const wrapAttr = attr(bodyPr, "wrap");
    const wraps = wrapAttr !== "none";
    const autofit = /<a:normAutofit|<a:spAutoFit/.test(sp);
    // Rotated boxes (vertical rails, marquee spines) measure against their own
    // axis; the width attribute is not the layout width, so skip them.
    if (/<a:xfrm[^>]*rot="/.test(sp) || attr(bodyPr, "vert")) continue;

    const tIns = num(bodyPr, "tIns") ?? 45720; // 0.05in OOXML default
    const bIns = num(bodyPr, "bIns") ?? 45720;
    const availablePt = ((cx - lIns - rIns) / EMU_PER_IN) * PT_PER_IN;
    const availableHeightPt = ((cy - tIns - bIns) / EMU_PER_IN) * PT_PER_IN;
    // Explicit paragraph line spacing, when the exporter set one (`<a:lnSpc><a:spcPts val="..."/>`).
    const lineSpacingPt = (() => {
      const pts = sp.match(/<a:lnSpc>\s*<a:spcPts\s+val="(\d+)"/)?.[1];
      return pts ? Number(pts) / 100 : null;
    })();
    if (availablePt <= 0) continue;

    const runRe = /<a:r>([\s\S]*?)<\/a:r>/g;
    let r: RegExpExecArray | null;
    while ((r = runRe.exec(sp))) {
      const body = r[1];
      const text = decode(body.match(/<a:t>([\s\S]*?)<\/a:t>/)?.[1] ?? "");
      if (!text.trim()) continue;
      const rPr = body.match(/<a:rPr\b[^>]*>/)?.[0] ?? body.match(/<a:rPr\b[^>]*\/>/)?.[0] ?? "";
      const sizePt = (num(rPr, "sz") ?? 1800) / 100;
      const trackingPt = (num(rPr, "spc") ?? 0) / 100;
      const bold = attr(rPr, "b") === "1";
      const family = body.match(/<a:latin[^>]*typeface="([^"]*)"/)?.[1] ?? defaultFamily;
      const translucent = /<a:solidFill>[\s\S]*?<a:alpha\b/.test(body);

      const base = measure(text, sizePt, bold, family);
      const requiredPt = base + trackingPt * Math.max(0, text.length - 1);
      const audit: TextRunAudit = {
        text,
        sizePt,
        trackingPt,
        bold,
        family,
        translucent,
        availablePt,
        requiredPt,
        wraps,
        autofit,
        singleWord: !/\s/.test(text.trim()),
      };

      // (1) Transparency on a tracked run is the layout-collapsing case. On an
      // untracked run it is only a cosmetic choice, so it is not flagged.
      if (translucent && trackingPt > 0) {
        problems.push({
          kind: "translucent-run",
          detail: `tracked run (${trackingPt.toFixed(2)}pt) emitted with an alpha fill — renderers lay this out untracked and clip the tail`,
          run: audit,
        });
      }

      // (2) Geometric overflow. A wrapping box with multiple words can reflow,
      // so only unwrappable cases are defects: no-wrap boxes, single words, or
      // tracked strings that overflow by more than a rounding hair.
      const overflow = requiredPt - availablePt;
      const tolerance = Math.max(1, availablePt * 0.02);
      if (overflow > tolerance && !autofit) {
        const unwrappable = !wraps || audit.singleWord;
        // A wrapping multi-word box reflows in PowerPoint exactly as it does on
        // screen, so overflow is only a defect when the box cannot hold the
        // wrapped lines — i.e. the tallest case does not fit vertically, or a
        // single word is itself wider than the column. Tracking alone is not a
        // defect once the transparency bug is out of the picture.
        let reflowFits = false;
        if (!unwrappable) {
          const lines = Math.ceil(requiredPt / availablePt);
          const lineHeight = lineSpacingPt ?? sizePt * 1.2;
          const widestWord = Math.max(
            ...text
              .trim()
              .split(/\s+/)
              .map((w) => measure(w, sizePt, bold, family) + trackingPt * Math.max(0, w.length - 1)),
          );
          reflowFits =
            widestWord <= availablePt + tolerance &&
            (availableHeightPt <= 0 || lines * lineHeight <= availableHeightPt + lineHeight * 0.15);
        }
        if (!reflowFits && (unwrappable || trackingPt > 0)) {
          problems.push({
            kind: "tracked-overflow",
            detail: `needs ${requiredPt.toFixed(1)}pt in a ${availablePt.toFixed(1)}pt box (${overflow.toFixed(1)}pt over)${!wraps ? ", wrap disabled" : audit.singleWord ? ", single word cannot wrap" : ", tracked line"}`,
            run: audit,
          });
        }
      }
    }
  }

  return problems;
}
