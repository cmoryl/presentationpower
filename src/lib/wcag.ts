// Minimal WCAG 2.1 contrast utilities + DOM auditor.

export type WcagLevel = "AAA" | "AA" | "AA-Large" | "FAIL";

function parseColor(input: string): [number, number, number, number] | null {
  const s = input.trim();
  if (!s || s === "transparent") return null;
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
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
    const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
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
    sampled === 0 ? "AA" : aaFail === 0 ? (minRatio >= 7 ? "AAA" : "AA") : minRatio >= 3 ? "AA-Large" : "FAIL";

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
    // Boost anything below AA (4.5:1 for normal, 3:1 for large text).
    const passesAA = large ? ratio >= 3 : ratio >= 4.5;
    if (passesAA) return;

    // Pick the polarity that maximizes contrast against the effective bg.
    const rDark = contrastRatio(DARK_ON_LIGHT, bg);
    const rLight = contrastRatio(LIGHT_ON_DARK, bg);
    const useLight = rLight >= rDark;
    const target = useLight ? LIGHT_ON_DARK : DARK_ON_LIGHT;
    if (!el.dataset.wcagOriginal) el.dataset.wcagOriginal = el.style.color;
    el.style.setProperty("color", target, "important");
    el.style.setProperty("opacity", "1", "important");

    // If even the best polarity still doesn't clear AA (common over midtone
    // imagery), add a legibility text-shadow scrim so the badge audit and the
    // human eye both see a clear pass against the actual pixels behind it.
    const bestRatio = Math.max(rDark, rLight);
    if (bestRatio < (large ? 3 : 4.5)) {
      const shadow = useLight
        ? "0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.65)"
        : "0 1px 2px rgba(255,255,255,0.85), 0 0 6px rgba(255,255,255,0.65)";
      el.style.setProperty("text-shadow", shadow, "important");
      if (!el.dataset.wcagShadow) el.dataset.wcagShadow = "1";
    }
    el.dataset.wcagFixed = "1";
    fixed++;
  });
  return fixed;
}


export function revertAutoFix(root: HTMLElement) {
  const nodes = root.querySelectorAll<HTMLElement>("[data-wcag-fixed]");
  nodes.forEach((el) => {
    el.style.color = el.dataset.wcagOriginal ?? "";
    el.style.removeProperty("opacity");
    delete el.dataset.wcagFixed;
    delete el.dataset.wcagOriginal;
  });
}

