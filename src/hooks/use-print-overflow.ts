/**
 * Real (measured) overflow detection for the single-page print templates.
 *
 * The capacity model in src/lib/print-capacity.ts is a *predictive* estimate.
 * It can be wrong — e.g. when the hero is dragged very tall, long copy or an
 * extra module silently falls off the bottom of the fixed-aspect page and the
 * `overflow: hidden` page root clips it with no visible error.
 *
 * This hook measures the DOM instead of guessing: it watches the tagged page
 * root (`[data-print-page]`) inside the editor canvas and reports how many
 * pixels of content are clipped, both at the page edge and inside any
 * descendant that is silently cutting content off.
 */
import { useEffect, useState, type RefObject } from "react";

export type PrintOverflowState = {
  /** Clipped pixels, in rendered canvas px (0 = nothing cut off). */
  overflowPx: number;
  /** Height of the page root in rendered px. */
  pageHeight: number;
  /** Clipped height as a fraction of the page (0..1). */
  overflowFrac: number;
  /** True when content is measurably cut off. */
  clipped: boolean;
};

const EMPTY: PrintOverflowState = { overflowPx: 0, pageHeight: 0, overflowFrac: 0, clipped: false };

/** Ignore intentional clamps (line-clamp / ellipsis) — those are by design. */
function isIntentionalClamp(el: Element): boolean {
  const cs = getComputedStyle(el);
  if (cs.webkitLineClamp && cs.webkitLineClamp !== "none") return true;
  if (cs.textOverflow === "ellipsis") return true;
  return false;
}

export function usePrintOverflow(
  canvasRef: RefObject<HTMLElement | null>,
  // Any value that should trigger a re-measure (content object, mode, size…).
  dep?: unknown,
): PrintOverflowState {
  const [state, setState] = useState<PrintOverflowState>(EMPTY);

  useEffect(() => {
    const host = canvasRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;

    let raf = 0;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const page = host.querySelector<HTMLElement>("[data-print-page]");
      if (!page) {
        setState((p) => (p.clipped || p.pageHeight ? EMPTY : p));
        return;
      }
      const pageHeight = page.clientHeight;
      // 1. Content past the bottom edge of the page itself.
      let worst = Math.max(0, page.scrollHeight - page.clientHeight);
      // 2. Content clipped inside any descendant that hides its overflow.
      const pageBottom = page.getBoundingClientRect().bottom;
      for (const el of Array.from(page.querySelectorAll<HTMLElement>("*"))) {
        const rect = el.getBoundingClientRect();
        if (rect.height === 0) continue;
        // Anything rendering below the page edge is cut off.
        const past = rect.bottom - pageBottom;
        if (past > 2) worst = Math.max(worst, past);
        const inner = el.scrollHeight - el.clientHeight;
        if (inner > 2 && !isIntentionalClamp(el)) {
          const cs = getComputedStyle(el);
          if (cs.overflowY === "hidden" || cs.overflow === "hidden") worst = Math.max(worst, inner);
        }
      }
      // Quantised to 4px buckets: sub-pixel reflow noise must not churn state.
      const overflowPx = Math.round(worst / 4) * 4;
      const overflowFrac = pageHeight > 0 ? overflowPx / pageHeight : 0;
      setState((prev) =>
        prev.overflowPx === overflowPx && prev.pageHeight === pageHeight
          ? prev
          : { overflowPx, pageHeight, overflowFrac, clipped: overflowPx > 6 },
      );
    };

    // Instrumentation attributes we write ourselves (content-fit knobs, audit
    // badges, selection chrome). Re-measuring on those creates a feedback loop:
    // measure -> state -> render -> attribute write -> measure … which is what
    // made the canvas flicker. They are filtered out here.
    const IGNORED_ATTRS = new Set([
      "style",
      "class",
      "data-print-fit",
      "data-fit-scale",
      "data-fit-pad",
      "data-audit-flag",
      "aria-selected",
      "data-selected",
    ]);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delay = 90) => {
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      timer = setTimeout(() => {
        raf = requestAnimationFrame(measure);
      }, delay);
    };

    schedule(0);
    const ro = new ResizeObserver(() => schedule());
    ro.observe(host);
    const page = host.querySelector<HTMLElement>("[data-print-page]");
    if (page) ro.observe(page);
    const mo = new MutationObserver((records) => {
      const meaningful = records.some((r) => {
        if (r.type !== "attributes") return true;
        return !IGNORED_ATTRS.has(r.attributeName ?? "");
      });
      if (meaningful) schedule();
    });
    mo.observe(host, { subtree: true, childList: true, characterData: true, attributes: true });
    // Fonts settling changes text height after first paint.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready?.then(() => schedule(0)).catch(() => {});

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [canvasRef, dep]);

  return state;
}
