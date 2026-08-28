// -----------------------------------------------------------------------------
// MODULE SPACING TOKENS — per-module section separation
//
// Section separation used to be a *global* decision: the skin's margin device
// picked one plate (e.g. a full-width `ruleTop` hairline) and every module in
// the look inherited it, which is how DataForce ended up with a stray green
// hairline across unrelated sheets. Spacing now resolves in three layers:
//
//   1. a stack default (safe for any look),
//   2. a per-look default (keyed by the look code, e.g. `R03`),
//   3. a per-module override (keyed by the module variant id, e.g.
//      `MV-OP-COVER-MEDIA`),
//
// each layer merging over the previous one. A module therefore owns its own top
// rule, padding and gutters without any global override reaching across the
// catalogue.
// -----------------------------------------------------------------------------

import { lookCodeFromPackId } from "./look-brand";
import type { StylePack } from "./style-packs";

export interface ModuleSpacing {
  /** Thickness (stage px) of the section rule above the content. 0 = no rule. */
  ruleTop: number;
  /** How far the rule runs, as a fraction of the reading column. */
  ruleSpan: number;
  /** Side padding of the content plane (stage px). */
  padX: number;
  /** Top padding of the content plane (stage px). */
  padTop: number;
  /** Bottom padding of the content plane (stage px). */
  padBottom: number;
  /** Gap between cards / columns inside the module (stage px). */
  gutter: number;
  /** Vertical rhythm multiplier for gaps between module rows. */
  rhythm: number;
  /** Extra room reserved below the last text line so descenders never clip. */
  descender: number;
  /** Optical multiplier on the module's display headline (1 = library size). */
  displayScale: number;
}

/** Stack default — matches the historical SlideChrome reserves. */
export const DEFAULT_MODULE_SPACING: ModuleSpacing = {
  ruleTop: 0,
  ruleSpan: 1,
  padX: 96,
  padTop: 128,
  padBottom: 96,
  gutter: 32,
  rhythm: 1,
  descender: 0.16,
  displayScale: 1,
};

/** Per-look defaults, keyed by look code. */
const LOOK_SPACING: Record<string, Partial<ModuleSpacing>> = {
  // DataForce is art-directed: no full-width rule anywhere, tighter gutters,
  // and mass centred rather than dropped onto a plinth.
  R03: { ruleTop: 0, gutter: 28, padTop: 120, padBottom: 104, rhythm: 0.96 },
};

/**
 * Per-module overrides, keyed `LOOK:MODULE_ID`.
 *
 * Modules that want a section separator opt in here with a short accent rule
 * instead of inheriting a sheet-wide hairline.
 */
const MODULE_SPACING: Record<string, Partial<ModuleSpacing>> = {
  // Hero chrome: no rule (the stat rail is the separator), and extra descender
  // room so a big title's `g`/`y` tails are never clipped by the media plate.
  "R03:MV-OP-COVER-MEDIA": { ruleTop: 0, padBottom: 128, descender: 0.22 },
  "R03:MV-OP-COVER-CLASSIC": { ruleTop: 0, padBottom: 120, descender: 0.2 },
  "R03:MV-OP-COVER-MINIMAL": { ruleTop: 0, descender: 0.2 },
  // Divider / section marks own a short accent rule.
  "R03:MV-OP-SECTION": { ruleTop: 3, ruleSpan: 0.18 },
  "R03:MV-OP-DIVIDER": { ruleTop: 3, ruleSpan: 0.18 },
  // Data modules: no rule, wider gutters so bars/columns breathe.
  "R03:MV-CH-BAR-COMPARE": { ruleTop: 0, gutter: 40, padTop: 112 },
  "R03:MV-CH-BAR": { ruleTop: 0, gutter: 40, padTop: 112 },
  "R03:MV-DATA-KPI": { ruleTop: 0, gutter: 36 },
  // Text-led closers stay quiet and sit centred.
  "R03:MV-OP-QUESTIONS": { ruleTop: 0, padTop: 112, padBottom: 112 },
  "R03:MV-OP-CONTACT": { ruleTop: 0, padTop: 112, padBottom: 112 },
  // Q&A is a symmetric, page-centred mark: equal top/bottom reserve so the
  // block sits on the optical centre of the sheet (the compose override below
  // zeroes the horizontal swing so it centres left-to-right too).
  "R03:MV-CLOSE-QNA": { ruleTop: 0, padTop: 112, padBottom: 112 },
  // Statement close carries a very long headline; ease the hero size back so it
  // never crowds the plate.
  "R03:MV-CLOSE-STATEMENT": { ruleTop: 0, displayScale: 0.84 },
};

/** Resolve the spacing tokens for one module under one style pack. */
export function moduleSpacing(
  pack: StylePack | null | undefined,
  moduleId?: string | null,
): ModuleSpacing {
  if (!pack) return DEFAULT_MODULE_SPACING;
  const code = lookCodeFromPackId(pack.id);
  const base = code.replace(/-V\d+$/i, "");
  const look = LOOK_SPACING[code] ?? LOOK_SPACING[base] ?? {};
  const id = (moduleId ?? "").trim().toUpperCase();
  const mod = id ? (MODULE_SPACING[`${code}:${id}`] ?? MODULE_SPACING[`${base}:${id}`] ?? {}) : {};
  return { ...DEFAULT_MODULE_SPACING, ...look, ...mod };
}

/** CSS custom properties so module renderers can read the same tokens. */
export function spacingVars(s: ModuleSpacing): Record<string, string> {
  return {
    "--mod-rule-top": `${s.ruleTop}px`,
    "--mod-rule-span": `${Math.round(s.ruleSpan * 100)}%`,
    "--mod-pad-x": `${s.padX}px`,
    "--mod-pad-top": `${s.padTop}px`,
    "--mod-pad-bottom": `${s.padBottom}px`,
    "--mod-gutter": `${s.gutter}px`,
    "--mod-rhythm": String(s.rhythm),
    "--mod-descender": `${s.descender}em`,
    "--mod-display-scale": String(s.displayScale),
  };
}

/** Module id carried on the scene seed (`mod:<id> …`) published by VariantRenderer. */
export function moduleIdFromSeed(seed: string | null | undefined): string | null {
  const m = /(?:^|\s)mod:([A-Za-z0-9._-]+)/.exec(seed ?? "");
  return m ? m[1]! : null;
}
