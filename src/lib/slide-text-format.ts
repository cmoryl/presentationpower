// -----------------------------------------------------------------------------
// Per-slide typography overrides (Text formatting panel)
//
// The deck editor's "Text formatting (PPTX)" panel measures the real DOM on the
// export stage. These overrides are applied to that same DOM, so whatever the
// panel shows after an edit is exactly what the layered PPTX export writes —
// there is no second projection to keep in sync.
//
// Scope tiers are resolved from the RENDERED font size on the 1920×1080 stage:
// headings are the display sizes (>= 56px ≈ 28pt), body is everything smaller.
// -----------------------------------------------------------------------------

export type SlideTextScope = "all" | "headings" | "body";

/**
 * Font choices offered by the panel.
 *
 * Deliberately limited to the three families the exporter can emit verbatim
 * (see CANONICAL_FONTS in pptx-font-map.ts). Offering a display face that
 * `mapFontFamily()` would collapse onto Geist would make the editor and the
 * exported file disagree, which is the one thing this panel promises not to do.
 */
export type SlideFontKey = "sans" | "mono" | "serif";

export const SLIDE_FONT_OPTIONS: Array<{
  key: SlideFontKey;
  label: string;
  /** CSS stack written onto the slide DOM. */
  stack: string;
  /** Typeface name PowerPoint receives for these runs. */
  pptxFace: string;
}> = [
  {
    key: "sans",
    label: "Brand sans — Geist",
    stack: '"Geist Variable", Geist, ui-sans-serif, system-ui, sans-serif',
    pptxFace: "Geist",
  },
  {
    key: "mono",
    label: "Brand mono — Geist Mono",
    stack: '"Geist Mono Variable", "Geist Mono", ui-monospace, monospace',
    pptxFace: "Geist Mono",
  },
  {
    key: "serif",
    label: "Serif — Georgia",
    stack: 'Georgia, Cambria, "Times New Roman", serif',
    pptxFace: "Georgia",
  },
];

export function fontOption(key: SlideFontKey | undefined | null) {
  return SLIDE_FONT_OPTIONS.find((o) => o.key === key);
}

export type SlideTextFormat = {
  /** Multiplies the rendered font size. 1 = untouched. */
  sizeScale?: number;
  /** CSS font-weight. Undefined = keep the module's weight. */
  weight?: 300 | 400 | 500 | 600 | 700 | 800;
  /** Tracking in em (letter-spacing). */
  trackingEm?: number;
  /** Unitless line-height multiplier. */
  lineHeight?: number;
  align?: "left" | "center" | "right";
  /** Typeface family. Undefined = keep the module/style-pack font. */
  fontFamily?: SlideFontKey;
};

export type SlideTextFormats = Partial<Record<SlideTextScope, SlideTextFormat>>;

/** Stage px cut-off between the heading tier and the body tier (≈28pt). */
export const HEADING_TIER_PX = 56;

export const TEXT_SCOPE_LABELS: Record<SlideTextScope, string> = {
  all: "All text",
  headings: "Headings (≥ 28pt)",
  body: "Body & captions (< 28pt)",
};

export function isEmptyTextFormat(f: SlideTextFormat | undefined | null): boolean {
  if (!f) return true;
  return (
    f.sizeScale === undefined &&
    f.weight === undefined &&
    f.trackingEm === undefined &&
    f.lineHeight === undefined &&
    f.align === undefined &&
    f.fontFamily === undefined
  );
}

export function hasTextFormats(formats: SlideTextFormats | undefined | null): boolean {
  if (!formats) return false;
  return (Object.keys(formats) as SlideTextScope[]).some((k) => !isEmptyTextFormat(formats[k]));
}

/** Merge the "all" rule under a tier-specific rule (tier wins per field). */
export function resolveScopeFormat(
  formats: SlideTextFormats | undefined | null,
  tier: "headings" | "body",
): SlideTextFormat {
  const base = formats?.all ?? {};
  const tierRule = formats?.[tier] ?? {};
  return { ...base, ...tierRule };
}

const OVERRIDE_FLAG = "slideTextFormatApplied";

type LeafEl = HTMLElement & { dataset: DOMStringMap };

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS", "IMG", "VIDEO"]);

/** Elements whose own child nodes include visible text (the measured leaves). */
function collectTextLeaves(root: HTMLElement): LeafEl[] {
  const out: LeafEl[] = [];
  const walk = (el: Element) => {
    if (SKIP.has(el.tagName.toUpperCase())) return;
    let ownText = false;
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim()) ownText = true;
    }
    if (ownText) out.push(el as LeafEl);
    for (const child of Array.from(el.children)) walk(child);
  };
  walk(root);
  return out;
}

/** Remove every inline value a previous pass wrote. */
export function clearTextFormat(root: HTMLElement) {
  const touched = root.querySelectorAll<HTMLElement>(`[data-${"slide-text-format"}]`);
  touched.forEach((el) => {
    el.style.removeProperty("font-size");
    el.style.removeProperty("font-weight");
    el.style.removeProperty("letter-spacing");
    el.style.removeProperty("line-height");
    el.style.removeProperty("text-align");
    el.style.removeProperty("font-family");
    delete el.dataset[OVERRIDE_FLAG];
    el.removeAttribute("data-slide-text-format");
  });
}

/**
 * Apply the overrides to a live slide subtree. Idempotent: each call clears the
 * previous pass first, and base sizes are read from the untouched computed style.
 */
export function applyTextFormat(root: HTMLElement, formats: SlideTextFormats | undefined | null) {
  clearTextFormat(root);
  if (!hasTextFormats(formats)) return;

  for (const el of collectTextLeaves(root)) {
    const cs = getComputedStyle(el);
    const basePx = parseFloat(cs.fontSize);
    if (!Number.isFinite(basePx) || basePx <= 0) continue;
    const tier: "headings" | "body" = basePx >= HEADING_TIER_PX ? "headings" : "body";
    const rule = resolveScopeFormat(formats, tier);
    if (isEmptyTextFormat(rule)) continue;

    let dirty = false;
    if (rule.sizeScale !== undefined && rule.sizeScale !== 1) {
      el.style.setProperty("font-size", `${Math.max(4, basePx * rule.sizeScale)}px`);
      dirty = true;
    }
    if (rule.weight !== undefined) {
      el.style.setProperty("font-weight", String(rule.weight));
      dirty = true;
    }
    if (rule.trackingEm !== undefined) {
      el.style.setProperty("letter-spacing", `${rule.trackingEm}em`);
      dirty = true;
    }
    if (rule.lineHeight !== undefined) {
      el.style.setProperty("line-height", String(rule.lineHeight));
      dirty = true;
    }
    const font = fontOption(rule.fontFamily);
    if (font) {
      // setProperty with `important` so style-pack `!important` display rules
      // (see .pack-display in styles.css) cannot win over an explicit choice.
      el.style.setProperty("font-family", font.stack, "important");
      dirty = true;
    }
    if (rule.align !== undefined) {
      el.style.setProperty("text-align", rule.align);
      dirty = true;
    }
    if (dirty) {
      el.dataset[OVERRIDE_FLAG] = "1";
      el.setAttribute("data-slide-text-format", tier);
    }
  }
}
