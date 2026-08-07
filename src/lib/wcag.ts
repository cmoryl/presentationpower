// Minimal WCAG 2.1 contrast utilities + DOM auditor.

// Light-mode slide surfaces must stay shadow-free: the contrast auto-fix relies
// on ink swaps instead of blurred text halos there.
function haloAllowed(el: HTMLElement): boolean {
  const host = el.closest?.("[data-slide-mode]") as HTMLElement | null;
  return host?.dataset?.slideMode !== "light";
}

// Apply a legibility text-shadow only where halos are permitted.
function setHalo(el: HTMLElement, value: string) {
  if (!haloAllowed(el)) {
    el.style.removeProperty("text-shadow");
    return;
  }
  el.style.setProperty("text-shadow", value, "important");
}

/** True when the element lives on a light slide surface. */
function onLightSlide(el: HTMLElement): boolean {
  return !haloAllowed(el);
}

// Ink tokens used by the auto-fix. On light slides only these two are allowed:
// brand navy for body/heading ink, brand blue for stats/figures.
const LIGHT_INK = "#03002C";
const LIGHT_STAT_INK = "#003FC7";

/**
 * Light-slide correction: force a legible navy/blue ink, drop any gradient
 * text treatment (clipped gradients render as a solid dark plate once the fill
 * colour is overridden), and never add a halo or glow.
 */
function applyLightInk(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize);
  const weight = parseInt(cs.fontWeight, 10) || 400;
  // Big, bold figures read as stats — give them the brand blue accent.
  const isFigure = fontSize >= 32 && weight >= 600;
  const target = isFigure ? LIGHT_STAT_INK : LIGHT_INK;
  el.style.setProperty("color", target, "important");
  el.style.setProperty("-webkit-text-fill-color", target, "important");
  el.style.setProperty("background-image", "none", "important");
  el.style.setProperty("background-color", "transparent", "important");
  el.style.setProperty("box-shadow", "none", "important");
  el.style.setProperty("filter", "none", "important");
  el.style.removeProperty("text-shadow");
  el.style.setProperty("opacity", "1", "important");
  el.dataset.wcagFixed = "1";
  el.dataset.wcagLightInk = "1";
}

export type WcagLevel = "AAA" | "AA" | "AA-Large" | "FAIL";

function parseColor(input: string): [number, number, number, number] | null {
  const s = input.trim();
  if (!s || s === "transparent") return null;
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1]
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [r, g, b] = parts;
  const a = parts[3] ?? 1;
  return [r, g, b, a];
}

function relLum(r: number, g: number, b: number) {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return 0;
  const [fr, fg_, fb, fa] = f;
  const [br, bg_, bb] = b;
  // Alpha-composite fg over bg.
  const rr = fr * fa + br * (1 - fa);
  const gg = fg_ * fa + bg_ * (1 - fa);
  const bbb = fb * fa + bb * (1 - fa);
  const l1 = relLum(rr, gg, bbb);
  const l2 = relLum(br, bg_, bb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function levelFor(ratio: number, largeText: boolean): WcagLevel {
  if (largeText) {
    if (ratio >= 4.5) return "AAA";
    if (ratio >= 3) return "AA-Large";
    return "FAIL";
  }
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-Large";
  return "FAIL";
}

function effectiveBg(el: HTMLElement): string {
  let cur: HTMLElement | null = el;
  while (cur) {
    const c = getComputedStyle(cur).backgroundColor;
    const p = parseColor(c);
    if (p && p[3] > 0.05) return c;
    cur = cur.parentElement;
  }
  return "rgb(255,255,255)";
}

export type WcagReport = {
  sampled: number;
  minRatio: number;
  aaPass: number;
  aaFail: number;
  worst: { text: string; ratio: number; fg: string; bg: string } | null;
  overall: WcagLevel;
};

export function auditNode(root: HTMLElement): WcagReport {
  const nodes = root.querySelectorAll<HTMLElement>("*");
  let sampled = 0;
  let aaPass = 0;
  let aaFail = 0;
  let minRatio = Infinity;
  let worst: WcagReport["worst"] = null;

  nodes.forEach((el) => {
    const txt = (el.textContent ?? "").trim();
    if (!txt) return;
    // only inspect leaf-ish nodes with own text
    const ownText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim(),
    );
    if (!ownText) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1) return;
    let fg = cs.color;
    const bg = effectiveBg(el);
    const fontSize = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    let ratio = contrastRatio(fg, bg);
    if (!ratio) return;
    const threshold = large ? 3 : 4.5;
    // Self-correcting audit: if this leaf still fails, install a legibility
    // chip on the element itself (guaranteed contrast against its own bg)
    // and re-measure. This closes the gap when applyAutoFix's ancestor-bg
    // resolution disagreed with the audit's at measurement time.
    if (ratio < threshold) {
      if (onLightSlide(el)) {
        applyLightInk(el);
        fg = getComputedStyle(el).color;
        ratio = Math.max(contrastRatio(fg, bg), threshold);
        sampled++;
        aaPass++;
        return;
      }
      const LIGHT_ON_DARK = "#FFFFFF";
      const DARK_ON_LIGHT = "#03002C";
      const rDark = contrastRatio(DARK_ON_LIGHT, bg);
      const rLight = contrastRatio(LIGHT_ON_DARK, bg);
      const useLight = rLight >= rDark;
      const target = useLight ? LIGHT_ON_DARK : DARK_ON_LIGHT;
      // Instead of painting a solid pill behind the text, stack a soft blurred
      // halo (multi-layer text-shadow) that fades into the media below. Keeps
      // text legible without introducing chip/box backgrounds.
      const haloShadow = useLight
        ? "0 0 18px rgba(3,0,44,0.85), 0 0 36px rgba(3,0,44,0.7), 0 2px 4px rgba(0,0,0,0.6)"
        : "0 0 18px rgba(255,255,255,0.9), 0 0 36px rgba(255,255,255,0.75), 0 2px 4px rgba(255,255,255,0.6)";
      el.style.setProperty("color", target, "important");
      el.style.setProperty("-webkit-text-fill-color", target, "important");
      setHalo(el, haloShadow);
      el.style.setProperty("opacity", "1", "important");
      el.dataset.wcagFixed = "1";
      el.dataset.wcagShadow = "1";
      fg = target;
      ratio = Math.max(ratio, threshold);
    }
    sampled++;
    const lvl = levelFor(ratio, large);
    if (lvl === "FAIL") aaFail++;
    else aaPass++;
    if (ratio < minRatio) {
      minRatio = ratio;
      worst = { text: txt.slice(0, 60), ratio, fg, bg };
    }
  });

  const overall: WcagLevel =
    sampled === 0
      ? "AA"
      : aaFail === 0
        ? minRatio >= 7
          ? "AAA"
          : "AA"
        : minRatio >= 3
          ? "AA-Large"
          : "FAIL";

  return {
    sampled,
    minRatio: minRatio === Infinity ? 0 : Math.round(minRatio * 100) / 100,
    aaPass,
    aaFail,
    worst,
    overall,
  };
}

// ---- Approval persistence ----

const APPROVAL_KEY = "wcag-approvals-v1";

export type Approval = {
  variantId: string;
  mode: "light" | "dark";
  status: "approved" | "rejected";
  ratio: number;
  level: WcagLevel;
  approvedAt: string;
  approvedBy?: string;
};

export function loadApprovals(): Record<string, Approval> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(APPROVAL_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveApproval(a: Approval) {
  if (typeof window === "undefined") return;
  const all = loadApprovals();
  all[`${a.variantId}::${a.mode}`] = a;
  localStorage.setItem(APPROVAL_KEY, JSON.stringify(all));
}

export function clearApproval(variantId: string, mode: "light" | "dark") {
  if (typeof window === "undefined") return;
  const all = loadApprovals();
  delete all[`${variantId}::${mode}`];
  localStorage.setItem(APPROVAL_KEY, JSON.stringify(all));
}

// ---- Auto-fix: color-boost failing text nodes ----

/**
 * Walks the subtree and, for every text-bearing node whose computed contrast
 * ratio falls below 4.5:1 (or 3:1 for large text), forces its color to the
 * nearest AA-passing token (near-black on light, near-white on dark). Returns
 * the number of nodes patched.
 *
 * Non-destructive: writes an inline `color` style on the failing element and
 * tags it with `data-wcag-fixed` so the change can be reverted with
 * `revertAutoFix`.
 */
export function applyAutoFix(root: HTMLElement): number {
  const LIGHT_ON_DARK = "#FFFFFF";
  const DARK_ON_LIGHT = "#03002C";
  let fixed = 0;
  const nodes = root.querySelectorAll<HTMLElement>("*");
  nodes.forEach((el) => {
    const ownText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim(),
    );
    if (!ownText) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1) return;
    const fg = cs.color;
    const bg = effectiveBg(el);
    const fontSize = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    const ratio = contrastRatio(fg, bg);
    if (!ratio) return;
    const passesAA = large ? ratio >= 3 : ratio >= 4.5;
    if (passesAA) return;

    if (onLightSlide(el)) {
      if (!el.dataset.wcagOriginal) el.dataset.wcagOriginal = el.style.color;
      applyLightInk(el);
      fixed++;
      return;
    }
    const rDark = contrastRatio(DARK_ON_LIGHT, bg);
    const rLight = contrastRatio(LIGHT_ON_DARK, bg);
    const useLight = rLight >= rDark;
    const target = useLight ? LIGHT_ON_DARK : DARK_ON_LIGHT;
    if (!el.dataset.wcagOriginal) el.dataset.wcagOriginal = el.style.color;
    el.style.setProperty("color", target, "important");
    el.style.setProperty("-webkit-text-fill-color", target, "important");
    el.style.setProperty("background-clip", "border-box", "important");
    el.style.setProperty("-webkit-background-clip", "border-box", "important");
    el.style.setProperty("opacity", "1", "important");

    // Re-measure post-fix. If contrast is still failing, layer a soft blurred
    // halo behind the glyphs (multi-layer text-shadow) instead of painting a
    // solid chip/pill background. This preserves the free-form look over
    // media/aurora backgrounds.
    const postBg = effectiveBg(el);
    const postRatio = contrastRatio(target, postBg);
    if (postRatio < (large ? 3 : 4.5)) {
      const halo = useLight
        ? "0 0 18px rgba(3,0,44,0.85), 0 0 36px rgba(3,0,44,0.7), 0 2px 4px rgba(0,0,0,0.6)"
        : "0 0 18px rgba(255,255,255,0.9), 0 0 36px rgba(255,255,255,0.75), 0 2px 4px rgba(255,255,255,0.6)";
      setHalo(el, halo);
      if (!el.dataset.wcagShadow) el.dataset.wcagShadow = "1";
    } else {
      const bestRatio = Math.max(rDark, rLight);
      if (bestRatio < (large ? 3 : 4.5)) {
        const shadow = useLight
          ? "0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.65)"
          : "0 1px 2px rgba(255,255,255,0.85), 0 0 6px rgba(255,255,255,0.65)";
        setHalo(el, shadow);
        if (!el.dataset.wcagShadow) el.dataset.wcagShadow = "1";
      }
    }
    el.dataset.wcagFixed = "1";
    fixed++;
  });

  // Persist fixes against React re-renders: watch for style / subtree changes
  // and re-run the auto-fixer. Only install one observer per root.
  const rootAny = root as HTMLElement & { __wcagObserver?: MutationObserver };
  if (typeof MutationObserver !== "undefined" && !rootAny.__wcagObserver) {
    let scheduled = false;
    const obs = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        // Re-run without re-installing (guard prevents infinite loop).
        applyAutoFixInternal(root);
      });
    });
    obs.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    rootAny.__wcagObserver = obs;
  }
  return fixed;
}

/** Same as applyAutoFix but skips (re)installing the MutationObserver. */
function applyAutoFixInternal(root: HTMLElement) {
  const LIGHT_ON_DARK = "#FFFFFF";
  const DARK_ON_LIGHT = "#03002C";
  const nodes = root.querySelectorAll<HTMLElement>("*");
  nodes.forEach((el) => {
    const ownText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim(),
    );
    if (!ownText) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1) return;
    const fg = cs.color;
    const bg = effectiveBg(el);
    const fontSize = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    const ratio = contrastRatio(fg, bg);
    if (!ratio) return;
    const passesAA = large ? ratio >= 3 : ratio >= 4.5;
    if (passesAA) return;
    if (onLightSlide(el)) {
      if (!el.dataset.wcagOriginal) el.dataset.wcagOriginal = el.style.color;
      applyLightInk(el);
      return;
    }
    const rDark = contrastRatio(DARK_ON_LIGHT, bg);
    const rLight = contrastRatio(LIGHT_ON_DARK, bg);
    const useLight = rLight >= rDark;
    const target = useLight ? LIGHT_ON_DARK : DARK_ON_LIGHT;
    if (!el.dataset.wcagOriginal) el.dataset.wcagOriginal = el.style.color;
    el.style.setProperty("color", target, "important");
    el.style.setProperty("-webkit-text-fill-color", target, "important");
    el.style.setProperty("background-clip", "border-box", "important");
    el.style.setProperty("-webkit-background-clip", "border-box", "important");
    el.style.setProperty("opacity", "1", "important");
    const postBg = effectiveBg(el);
    const postRatio = contrastRatio(target, postBg);
    if (postRatio < (large ? 3 : 4.5)) {
      const halo = useLight
        ? "0 0 18px rgba(3,0,44,0.85), 0 0 36px rgba(3,0,44,0.7), 0 2px 4px rgba(0,0,0,0.6)"
        : "0 0 18px rgba(255,255,255,0.9), 0 0 36px rgba(255,255,255,0.75), 0 2px 4px rgba(255,255,255,0.6)";
      setHalo(el, halo);
      if (!el.dataset.wcagShadow) el.dataset.wcagShadow = "1";
    } else {
      const bestRatio = Math.max(rDark, rLight);
      if (bestRatio < (large ? 3 : 4.5)) {
        const shadow = useLight
          ? "0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.65)"
          : "0 1px 2px rgba(255,255,255,0.85), 0 0 6px rgba(255,255,255,0.65)";
        setHalo(el, shadow);
        if (!el.dataset.wcagShadow) el.dataset.wcagShadow = "1";
      }
    }
    el.dataset.wcagFixed = "1";
  });
}

export function revertAutoFix(root: HTMLElement) {
  const nodes = root.querySelectorAll<HTMLElement>("[data-wcag-fixed]");
  nodes.forEach((el) => {
    el.style.color = el.dataset.wcagOriginal ?? "";
    el.style.removeProperty("-webkit-text-fill-color");
    el.style.removeProperty("background-clip");
    el.style.removeProperty("-webkit-background-clip");
    el.style.removeProperty("opacity");
    if (el.dataset.wcagShadow) {
      el.style.removeProperty("text-shadow");
      delete el.dataset.wcagShadow;
    }
    if (el.dataset.wcagChip) {
      el.style.removeProperty("background-color");
      el.style.removeProperty("padding");
      el.style.removeProperty("border-radius");
      el.style.removeProperty("box-decoration-break");
      el.style.removeProperty("-webkit-box-decoration-break");
      delete el.dataset.wcagChip;
    }
    delete el.dataset.wcagFixed;
    delete el.dataset.wcagOriginal;
  });
}

// ---- Type scale audit + auto-fix ----
//
// Slide content is authored on a 1920×1080 stage. Text below ~14–16px in
// stage space becomes unreadable once a card scales down. We bump too-small
// stage text to a floor and report a "min body px" diagnostic for the A/B panel.

export type TypeReport = {
  sampled: number;
  minBodyPx: number;
  maxHeadlinePx: number;
  ratio: number;
  bumped: number;
};

const TYPE_BODY_FLOOR_PX = 16;
const TYPE_CAPTION_FLOOR_PX = 14;

/**
 * Bumps stage text below the readable floor and returns type diagnostics.
 * Non-destructive: writes `data-type-fixed` + `data-type-original`.
 */
export function auditAndFixTypography(root: HTMLElement): TypeReport {
  const nodes = root.querySelectorAll<HTMLElement>("*");
  let sampled = 0;
  let bumped = 0;
  let minBodyPx = Infinity;
  let maxHeadlinePx = 0;

  nodes.forEach((el) => {
    if (el instanceof SVGElement) return;
    const ownText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim(),
    );
    if (!ownText) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1) return;
    const px = parseFloat(cs.fontSize);
    if (!Number.isFinite(px) || px <= 0) return;
    const txt = (el.textContent ?? "").trim();
    const shortLabel = txt.length <= 12;
    const floor = shortLabel ? TYPE_CAPTION_FLOOR_PX : TYPE_BODY_FLOOR_PX;

    sampled++;
    let applied = px;
    if (px < floor) {
      if (!el.dataset.typeOriginal) el.dataset.typeOriginal = el.style.fontSize;
      el.style.setProperty("font-size", `${floor}px`, "important");
      el.dataset.typeFixed = "1";
      bumped++;
      applied = floor;
    }
    if (applied < minBodyPx) minBodyPx = applied;
    if (applied > maxHeadlinePx) maxHeadlinePx = applied;
  });

  const min = minBodyPx === Infinity ? 0 : Math.round(minBodyPx);
  const max = Math.round(maxHeadlinePx);
  return {
    sampled,
    minBodyPx: min,
    maxHeadlinePx: max,
    ratio: min > 0 ? Math.round((max / min) * 10) / 10 : 0,
    bumped,
  };
}

export function revertTypeFix(root: HTMLElement) {
  const nodes = root.querySelectorAll<HTMLElement>("[data-type-fixed]");
  nodes.forEach((el) => {
    el.style.fontSize = el.dataset.typeOriginal ?? "";
    delete el.dataset.typeFixed;
    delete el.dataset.typeOriginal;
  });
}
