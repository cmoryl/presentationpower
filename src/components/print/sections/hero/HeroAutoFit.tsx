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
  const [breakWords, setBreakWords] = useState(false);

  // Re-fit from scratch whenever the copy or the authored size changes,
  // otherwise a shorter headline would inherit the previous shrink.
  const contentKey = `${basePx}|${maxLines}|${String(children)}`;
  useIsoLayoutEffect(() => {
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
        while (next > minRatio && overflows()) {
          next = Math.max(minRatio, Number((next - STEP).toFixed(3)));
          node.style.fontSize = cq(basePx * next);
        }
        if (overflows()) {
          node.style.overflowWrap = "anywhere";
          wrap = overflows();
        }

        node.style.fontSize = probe.fontSize;
        node.style.overflowWrap = probe.overflowWrap;
        node.style.display = probe.display;
        node.style.overflow = probe.overflow;
        node.style.webkitLineClamp = probe.clamp;
        setRatio(next);
        setBreakWords(wrap);
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
