// AUTO-FIT MASTHEAD TYPE
// ---------------------------------------------------------------------------
// Hero titles are authored copy: a two-word product name and a 14-word
// case-study headline both have to sit inside the SAME page margin and the same
// masthead band. Fixed cq sizes can only satisfy one of them, so this component
// measures the real rendered box and steps the type down (and re-wraps it)
// until the copy fits the space the page actually gives it.
//
// How it fits, in order of preference:
//   1. balanced wrapping (`text-wrap: balance`) so lines break evenly first;
//   2. proportional shrink of font-size / tracking down to `minRatio`;
//   3. `overflow-wrap: anywhere` as the last resort, so a single long word
//      (URLs, German compounds, product SKUs) breaks instead of bleeding past
//      the margin.
//
// Measurement is layout-only (scrollHeight/scrollWidth vs client box), runs
// through a ResizeObserver so page-format and margin-preset switches re-fit,
// and starts at scale 1 so SSR/print output matches the authored size whenever
// the copy already fits.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType } from "react";
import { cq } from "../shared";

/** Steps of the shrink ladder — coarse first, fine near the floor. */
const STEP = 0.04;
/** How far the fitter may go before it starts breaking words instead. */
const DEFAULT_MIN_RATIO = 0.66;
/** Sub-pixel slack; browsers round line boxes and we must not oscillate. */
const SLACK = 1.5;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// ---------------------------------------------------------------------------
// DEBUG INSTRUMENTATION (opt-in, zero cost when off)
// Enable with `?debugAutofit=1`, `localStorage.debugAutofit = "1"`, or
// `window.__ELEMENT_DEBUG_AUTOFIT = true`. Logs one line per measurement pass
// with the authored size, the measured natural box, the allowance and the
// resulting shrink factor — plus a warning when the same node re-fits many
// times in a short window, which is the signature of a feedback loop.
// ---------------------------------------------------------------------------

type AutoFitDebugWindow = Window & { __ELEMENT_DEBUG_AUTOFIT?: boolean };

let debugFlag: boolean | null = null;
function autofitDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as AutoFitDebugWindow;
  if (w.__ELEMENT_DEBUG_AUTOFIT) return true;
  if (debugFlag !== null) return debugFlag;
  let on = false;
  try {
    on =
      new URLSearchParams(window.location.search).get("debugAutofit") === "1" ||
      window.localStorage.getItem("debugAutofit") === "1";
  } catch {
    on = false;
  }
  debugFlag = on;
  return on;
}

/** Rolling pass counter per node, used to spot re-fit storms. */
const passLog = new WeakMap<Element, { count: number; since: number; last: number }>();
/** More than this many passes within the window means something is oscillating. */
const LOOP_PASS_LIMIT = 12;
const LOOP_WINDOW_MS = 1000;

type FitTrace = {
  label: string;
  authoredPx: number;
  measuredPx: number;
  allowedPx: number;
  measuredWidth: number;
  availableWidth: number;
  maxLines: number;
  steps: number;
  ratio: number;
  prevRatio: number;
  breakWords: boolean;
};

function logFitPass(node: Element, t: FitTrace) {
  if (!autofitDebugEnabled()) return;
  const now = performance.now();
  const rec = passLog.get(node) ?? { count: 0, since: now, last: now };
  if (now - rec.since > LOOP_WINDOW_MS) {
    rec.count = 0;
    rec.since = now;
  }
  rec.count += 1;
  rec.last = now;
  passLog.set(node, rec);

  const changed = Math.abs(t.ratio - t.prevRatio) > 0.0005;
  const tag = `[autofit] ${t.label}`;
  const detail = {
    authoredPx: t.authoredPx,
    appliedPx: Number((t.authoredPx * t.ratio).toFixed(2)),
    shrink: Number(t.ratio.toFixed(3)),
    prevShrink: Number(t.prevRatio.toFixed(3)),
    measuredH: Math.round(t.measuredPx),
    allowedH: Math.round(t.allowedPx),
    measuredW: Math.round(t.measuredWidth),
    availableW: Math.round(t.availableWidth),
    maxLines: t.maxLines,
    ladderSteps: t.steps,
    breakWords: t.breakWords,
    pass: rec.count,
    changed,
  };

  if (rec.count > LOOP_PASS_LIMIT) {
    console.warn(
      `${tag} possible feedback loop: ${rec.count} measurement passes in ${Math.round(now - rec.since)}ms`,
      detail,
    );
    return;
  }
  console.debug(tag, detail);
}

type Props = {
  /** Rendering element — `h2` for titles, `p` for summaries. */
  as?: ElementType;
  /** Authored size in template px (before fitting). */
  basePx: number;
  /** Max lines the block may occupy; also the clamp used as the fit target. */
  maxLines: number;
  /** Floor for the shrink ladder, as a ratio of `basePx`. */
  minRatio?: number;
  /** Everything except font-size, which this component owns. */
  style?: CSSProperties;
  children: React.ReactNode;
  className?: string;
};

export function AutoFitText({
  as,
  basePx,
  maxLines,
  minRatio = DEFAULT_MIN_RATIO,
  style,
  children,
  className,
}: Props) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [ratio, setRatio] = useState(1);
  const ratioRef = useRef(1);
  const [breakWords, setBreakWords] = useState(false);

  // Re-fit from scratch whenever the copy or the authored size changes,
  // otherwise a shorter headline would inherit the previous shrink.
  const contentKey = `${basePx}|${maxLines}|${String(children)}`;
  useIsoLayoutEffect(() => {
    ratioRef.current = 1;
    setRatio(1);
    setBreakWords(false);
  }, [contentKey]);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const node = ref.current;
        if (!node) return;
        // Measure UNCLAMPED: with `-webkit-box` line clamping, scrollHeight is
        // always a couple of px over clientHeight from line-box rounding, which
        // would make every headline look like it overflows. So drop the clamp,
        // read the copy's natural height, and compare it with the height the
        // allowed number of lines actually buys us.
        const probe = {
          fontSize: node.style.fontSize,
          overflowWrap: node.style.overflowWrap,
          display: node.style.display,
          overflow: node.style.overflow,
          clamp: node.style.webkitLineClamp,
        };
        node.style.display = "block";
        node.style.overflow = "visible";
        node.style.webkitLineClamp = "unset";
        // Always measure from the AUTHORED size, never from the currently
        // applied (already shrunk) size. Measuring the shrunk state reports
        // "fits", which resets the ratio to 1, which overflows again — the
        // element then oscillates between sizes and the card visibly jumps.
        node.style.fontSize = cq(basePx);

        const lineBox = () => {
          const cs = window.getComputedStyle(node);
          const lh = parseFloat(cs.lineHeight);
          return Number.isFinite(lh) ? lh : parseFloat(cs.fontSize) * 1.2;
        };
        const overflows = () =>
          node.scrollHeight > maxLines * lineBox() + SLACK ||
          node.scrollWidth > node.clientWidth + SLACK;

        let next = 1;
        let wrap = false;
        let steps = 0;
        while (next > minRatio && overflows()) {
          next = Math.max(minRatio, Number((next - STEP).toFixed(3)));
          node.style.fontSize = cq(basePx * next);
          steps += 1;
        }
        if (overflows()) {
          node.style.overflowWrap = "anywhere";
          wrap = overflows();
        }

        logFitPass(node, {
          label: String(children).slice(0, 40) || "(empty)",
          authoredPx: basePx,
          measuredPx: node.scrollHeight,
          allowedPx: maxLines * lineBox() + SLACK,
          measuredWidth: node.scrollWidth,
          availableWidth: node.clientWidth,
          maxLines,
          steps,
          ratio: next,
          prevRatio: ratioRef.current,
          breakWords: wrap,
        });


        node.style.fontSize = probe.fontSize;
        node.style.overflowWrap = probe.overflowWrap;
        node.style.display = probe.display;
        node.style.overflow = probe.overflow;
        node.style.webkitLineClamp = probe.clamp;
        ratioRef.current = next;
        setRatio((prev) => (Math.abs(prev - next) < 0.0005 ? prev : next));
        setBreakWords((prev) => (prev === wrap ? prev : wrap));
      });
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    // Web fonts land after first paint and change every line box.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready?.then(fit).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [contentKey, minRatio, maxLines, basePx]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={className}
      data-autofit-base={basePx}
      data-autofit={ratio < 1 ? ratio.toFixed(2) : undefined}
      style={{
        fontSize: cq(basePx * ratio),
        textWrap: "balance",
        overflowWrap: breakWords ? "anywhere" : "break-word",
        hyphens: breakWords ? "auto" : undefined,
        display: "-webkit-box",
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
