// ---------------------------------------------------------------------------
// Auto-refit region — the DOM side of the multilingual text fit.
//
// Attach `useAutoRefit(ref)` to a slide frame or a social card frame. After
// layout it walks the text-bearing leaves inside, measures each against the box
// that clips it, and sizes the copy down through `refitPlan` until it fits —
// within the approved floors for size, leading and tracking.
//
// Everything it changes is recorded on the element so a later pass (new copy, a
// new language, a resize) starts again from the authored design. It only ever
// touches type: no background, colour or layout property is written.
// ---------------------------------------------------------------------------
import * as React from "react";
import { refitPlan, overflowRatio, REFIT_FLOOR_PX, REFIT_MIN_SCALE } from "@/lib/text-refit";

const SKIP_SELECTOR =
  "[data-refit-ignore],[data-decorative],[data-export-ignore='true'],svg,canvas,img,video,input,textarea,select";

const MAX_PASSES = 4;

export type RefitSummary = {
  /** Slots measured. */
  measured: number;
  /** Slots whose type was sized down to fit. */
  refitted: number;
  /** Slots still longer than their box at the floor — honest overflow. */
  clipped: number;
};

const EMPTY: RefitSummary = { measured: 0, refitted: 0, clipped: 0 };

function isTextLeaf(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest(SKIP_SELECTOR)) return false;
  const text = (el.textContent ?? "").trim();
  if (text.length < 2) return false;
  // Leaf = no child element that itself carries text (so we size the innermost
  // slot, not a whole column).
  for (const child of Array.from(el.children)) {
    if ((child.textContent ?? "").trim().length > 0) return false;
  }
  return true;
}

/** Nearest ancestor inside `root` that clips its overflow. */
function clippingBox(el: HTMLElement, root: HTMLElement): HTMLElement {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== root.parentElement) {
    const cs = getComputedStyle(node);
    if (cs.overflowY !== "visible" || cs.overflowX !== "visible") return node;
    node = node.parentElement;
  }
  return root;
}

function restore(el: HTMLElement) {
  if (el.dataset.refitApplied !== "1") return;
  el.style.fontSize = el.dataset.refitFontSize ?? "";
  el.style.lineHeight = el.dataset.refitLineHeight ?? "";
  el.style.letterSpacing = el.dataset.refitTracking ?? "";
  delete el.dataset.refitApplied;
  delete el.dataset.refitFontSize;
  delete el.dataset.refitLineHeight;
  delete el.dataset.refitTracking;
  delete el.dataset.refitClipped;
}

/**
 * One refit pass over a region. Exported so the export pipeline and tests can
 * run it against a detached node without mounting the hook.
 */
export function runAutoRefit(
  root: HTMLElement,
  opts: { floorPx?: number; minScale?: number } = {},
): RefitSummary {
  const leaves = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(isTextLeaf);
  let measured = 0;
  let refitted = 0;
  let clipped = 0;

  for (const el of leaves) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const authoredPx = el.dataset.refitApplied === "1"
      ? parseFloat(el.dataset.refitBasePx ?? cs.fontSize)
      : parseFloat(cs.fontSize);
    if (!Number.isFinite(authoredPx) || authoredPx <= 0) continue;
    measured += 1;

    const box = clippingBox(el, root);
    const boxRect = box.getBoundingClientRect();
    const boxCs = getComputedStyle(box);
    const padX = parseFloat(boxCs.paddingLeft) + parseFloat(boxCs.paddingRight);
    const padY = parseFloat(boxCs.paddingTop) + parseFloat(boxCs.paddingBottom);

    const own = {
      contentW: el.scrollWidth,
      contentH: el.scrollHeight,
      boxW: Math.max(el.clientWidth, 1),
      boxH: Math.max(el.clientHeight, 1),
      wraps: cs.whiteSpace !== "nowrap",
    };
    const rect = el.getBoundingClientRect();
    const inBox = {
      contentW: rect.width,
      contentH: rect.height,
      boxW: Math.max(1, boxRect.width - padX),
      boxH: Math.max(1, boxRect.height - padY),
      wraps: cs.whiteSpace !== "nowrap",
    };
    // The worst of the two: the slot's own clipped box, and the box that clips it.
    const ratio = Math.max(overflowRatio(own), box === root ? 1 : overflowRatio(inBox));
    if (ratio <= 1.005) {
      // It fits. If that is because an earlier pass sized it down, leave the fit
      // in place — measuring the fitted copy and then restoring the authored
      // size would put the overflow straight back. A fresh signature, a resize
      // or a copy edit restores the authored design before measuring again.
      continue;
    }


    const lineHeightPx = parseFloat(cs.lineHeight);
    const plan = refitPlan({
      fontPx: authoredPx,
      lineHeight: Number.isFinite(lineHeightPx) ? lineHeightPx / authoredPx : undefined,
      overflowRatio: ratio,
      floorPx: opts.floorPx ?? REFIT_FLOOR_PX,
      minScale: opts.minScale ?? REFIT_MIN_SCALE,
    });
    if (plan.scale >= 0.999) continue;

    if (el.dataset.refitApplied !== "1") {
      el.dataset.refitApplied = "1";
      el.dataset.refitBasePx = String(authoredPx);
      el.dataset.refitFontSize = el.style.fontSize;
      el.dataset.refitLineHeight = el.style.lineHeight;
      el.dataset.refitTracking = el.style.letterSpacing;
    }
    el.style.fontSize = `${plan.fontPx}px`;
    if (plan.lineHeight != null) el.style.lineHeight = String(plan.lineHeight);
    if (plan.letterSpacingEm !== 0) el.style.letterSpacing = `${plan.letterSpacingEm}em`;
    refitted += 1;
    if (plan.clipped) {
      el.dataset.refitClipped = "1";
      clipped += 1;
    } else {
      delete el.dataset.refitClipped;
    }
  }

  return { measured, refitted, clipped };
}

/**
 * Keep the copy inside `ref` fitting its boxes. `signature` should change
 * whenever the copy or language changes so the region starts again from the
 * authored design.
 */
export function useAutoRefit(
  ref: React.RefObject<HTMLElement | null>,
  signature: string,
  opts: { enabled?: boolean; floorPx?: number; minScale?: number } = {},
): RefitSummary {
  const { enabled = true, floorPx, minScale } = opts;
  const [summary, setSummary] = React.useState<RefitSummary>(EMPTY);

  React.useEffect(() => {
    const root = ref.current;
    if (!root || !enabled || typeof window === "undefined") return;

    let frame = 0;
    let passes = 0;
    let stop = false;
    // True while this hook is writing type sizes, so the observers do not read
    // our own work as a new change and start over endlessly.
    let applying = false;

    const restoreAll = () => {
      const node = ref.current;
      if (!node) return;
      applying = true;
      for (const el of Array.from(node.querySelectorAll<HTMLElement>("[data-refit-applied='1']"))) {
        restore(el);
      }
    };

    // A fresh signature means new words: drop what the last pass applied so the
    // authored sizes are measured, not last language's shrunken ones.
    restoreAll();

    const pass = () => {
      if (stop || !ref.current) return;
      applying = true;
      const result = runAutoRefit(ref.current, { floorPx, minScale });
      setSummary(result);
      passes += 1;
      if (result.refitted > 0 && passes < MAX_PASSES) {
        frame = requestAnimationFrame(pass);
      } else {
        frame = requestAnimationFrame(() => {
          applying = false;
        });
      }
    };
    frame = requestAnimationFrame(pass);

    // A resize or a copy edit changes what will fit, so start again from the
    // authored design rather than measuring the last fit.
    const again = () => {
      if (applying) return;
      passes = 0;
      cancelAnimationFrame(frame);
      restoreAll();
      frame = requestAnimationFrame(pass);
    };


    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(again) : null;
    obs?.observe(root);


    // Copy edits and translations replace the words in place, which no resize
    // reports — watch the text itself so a longer language refits immediately.
    const mut =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver((records) => {
            const textChanged = records.some(
              (r) =>
                r.type === "characterData" ||
                (r.type === "childList" && (r.addedNodes.length > 0 || r.removedNodes.length > 0)),
            );
            if (textChanged) again();
          })
        : null;
    mut?.observe(root, { subtree: true, childList: true, characterData: true });

    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      obs?.disconnect();
      mut?.disconnect();
    };
  }, [ref, signature, enabled, floorPx, minScale]);

  return summary;
}

/** Wrapper for surfaces that would rather compose than take a ref. */
export function AutoRefitRegion({
  signature,
  children,
  className,
  style,
  enabled,
}: {
  signature: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  enabled?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  useAutoRefit(ref, signature, { enabled });
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
