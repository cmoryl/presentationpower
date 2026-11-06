import { useEffect } from "react";

/**
 * Enterprise Spectrum rule "numbers are the hero": every large figure on the
 * slide is set in a gradient, in spectrum order (aqua, blue, violet) by
 * reading position. Many modules draw numerals by hand, so the slide marks
 * them once with `data-spectrum-fig` and the scoped stylesheet paints them.
 * Attributes only — React-owned styles are never touched.
 */
const FIGURE = /^[\s$€£¥+\-–~≈<>]*\d[\d.,:/]*\s*[%+×xKkMmBb]?[+]?\s*$/;
const MIN_PX = 34;

function mark(root: HTMLElement) {
  const found: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent ?? "";
    if (!FIGURE.test(text) || !text.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest("[data-media-tile],[aria-hidden='true'],[data-spectrum-skip]")) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < MIN_PX) continue;
    found.push(el);
  }
  found.forEach((el, i) => {
    const v = String(i % 3);
    if (el.getAttribute("data-spectrum-fig") !== v) el.setAttribute("data-spectrum-fig", v);
  });
  // Mark undersized hand-authored labels as well as shared primitives. The
  // stylesheet enforces the guide floor without mutating React-owned styles.
  const text = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = text.nextNode(); n; n = text.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.textContent?.trim() || el.closest("svg,[aria-hidden='true']")) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 24) el.setAttribute("data-spectrum-small", "");
  }
}

export function useSpectrumNumerals(root: HTMLElement | null, enabled: boolean) {
  useEffect(() => {
    if (!root || !enabled || typeof MutationObserver === "undefined") return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => mark(root));
    };
    run();
    const mo = new MutationObserver(run);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, [root, enabled]);
}
