// TransPerfect text-fit engine, ported from templates/text-fit.js.
//
// Data model: data-fit="minPx,maxPx,baseChars,maxChars"
//   • at or under baseChars the slot renders at maxPx
//   • size scales LINEARLY down to minPx as length approaches maxChars
//   • past maxChars size stays at minPx and a console.warn flags the overflow
//
// Two ways to use:
//   1) useTextFit(ref, { min, max, base, cap, containerWidth? }) — imperative,
//      React-friendly, no DOM MutationObserver (React drives updates).
//   2) initTextFit(root) — matches the original template contract exactly.
//      Scans for `[data-fit]`, applies sizing, observes character mutations.
//      Used when raw HTML from a template is dropped into the DOM.
//
// Container-aware sizing:
//   Print layouts are container-scaled via [container-type: inline-size]. The
//   template's original pixel sizes were authored against a fixed 816px page
//   width. Callers can pass `containerWidth` (default 816) and the hook will
//   emit sizes in `cqw` so text scales with the container instead of the
//   viewport. Pass `containerWidth: 0` to fall back to raw px.

import { useLayoutEffect } from "react";

export type FitConfig = {
  min: number;
  max: number;
  base: number;
  cap: number;
  /** Reference width the min/max px values were authored against. Default 816
   *  (US Letter at 96 DPI, the template canvas). Pass 0 to emit raw px. */
  containerWidth?: number;
};

export function computeFitSize(len: number, { min, max, base, cap }: FitConfig): number {
  if (len <= base) return max;
  if (len >= cap) return min;
  return max - (max - min) * ((len - base) / (cap - base));
}

function toUnit(sizePx: number, containerWidth: number | undefined): string {
  if (!containerWidth || containerWidth <= 0) return `${sizePx.toFixed(2)}px`;
  return `${((sizePx * 100) / containerWidth).toFixed(3)}cqw`;
}

/** React hook: fits `ref.current`'s text against the config on every render. */
export function useTextFit(
  ref: React.RefObject<HTMLElement | null>,
  text: string | null | undefined,
  cfg: FitConfig,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const len = (text ?? el.textContent ?? "").trim().length;
    const size = computeFitSize(len, cfg);
    el.style.fontSize = toUnit(size, cfg.containerWidth ?? 816);
    if (len > cfg.cap) {
      el.title = `Over recommended maximum of ${cfg.cap} characters (${len})`;

      console.warn(
        `[text-fit] "${(text ?? el.textContent ?? "").slice(0, 40)}…" is ${len} chars; recommended max ${cfg.cap}`,
      );
    } else if (el.title) {
      el.removeAttribute("title");
    }
  }, [ref, text, cfg.min, cfg.max, cfg.base, cfg.cap, cfg.containerWidth]);
}

/** Faithful port of `initTextFit(root)` for cases where template HTML is
 *  injected into the DOM (not authored as React). */
export function initTextFit(root: ParentNode | null = null): () => void {
  const scope = root ?? (typeof document !== "undefined" ? document : null);
  if (!scope) return () => {};
  const els = scope.querySelectorAll<HTMLElement>("[data-fit]");
  const observers: MutationObserver[] = [];
  els.forEach((el) => {
    const fit = () => {
      const raw = el.getAttribute("data-fit");
      if (!raw) return;
      const [min, max, base, cap] = raw.split(",").map(Number);
      const cw = Number(el.dataset.fitWidth) || 816;
      const len = (el.textContent ?? "").trim().length;
      const size = computeFitSize(len, { min, max, base, cap });
      el.style.fontSize = toUnit(size, cw);
      if (len > cap) {
        el.title = `Over recommended maximum of ${cap} characters (${len})`;

        console.warn(
          `[text-fit] "${(el.textContent ?? "").slice(0, 40)}…" is ${len} chars; recommended max ${cap}`,
        );
      } else if (el.title) {
        el.removeAttribute("title");
      }
    };
    fit();
    const mo = new MutationObserver(fit);
    mo.observe(el, { characterData: true, childList: true, subtree: true });
    observers.push(mo);
  });
  return () => observers.forEach((o) => o.disconnect());
}
