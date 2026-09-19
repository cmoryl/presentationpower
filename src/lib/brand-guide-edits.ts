// Live brand-guide edits.
//
// `brand-guides.ts` holds the authored baseline for every guide. A brand lead
// can edit a division's colours, typography, logo rules and intro copy; those
// edits live in `brand_guide_edits.patch` and are merged over the baseline at
// read time. The authored file is never rewritten, so a guide can always be
// reset back to the approved original.

import type { BrandGuide, ColorSwatch, LogoRule, TypeStyle } from "@/lib/brand-guides";
import { isTransPerfectBrandScope } from "@/lib/brand-profiles";

export type BrandGuidePatch = {
  intro?: string;
  tagline?: string;
  primaryColors?: ColorSwatch[];
  secondaryColors?: ColorSwatch[];
  tertiaryColors?: ColorSwatch[];
  neutrals?: ColorSwatch[];
  typefacePrimary?: string;
  typefaceWeb?: string;
  headingScale?: TypeStyle[];
  bodyScale?: TypeStyle[];
  logoNotes?: { headline: string; body: string };
  logoRules?: LogoRule[];
  /** Stamped when the edit is saved — shown as the guide's "updated" date. */
  editedAt?: string;
};

export type BrandGuideEditRow = {
  slug: string;
  divisionId: string;
  patch: BrandGuidePatch;
  updatedAt: string | null;
};

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isBrandHex(value: string): boolean {
  return HEX.test(value.trim());
}

function cleanSwatches(list: unknown): ColorSwatch[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out: ColorSwatch[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Partial<ColorSwatch>;
    const name = typeof s.name === "string" ? s.name.trim() : "";
    const hex = typeof s.hex === "string" ? s.hex.trim() : "";
    // A swatch with no name or an unreadable colour is dropped rather than
    // rendered as a broken chip on the guide page.
    if (!name || !isBrandHex(hex)) continue;
    out.push({
      name,
      hex: hex.toUpperCase(),
      ...(typeof s.role === "string" && s.role ? { role: s.role } : {}),
      ...(typeof s.pantone === "string" && s.pantone ? { pantone: s.pantone } : {}),
      ...(typeof s.rgb === "string" && s.rgb ? { rgb: s.rgb } : {}),
      ...(typeof s.cmyk === "string" && s.cmyk ? { cmyk: s.cmyk } : {}),
      ...(s.onDark ? { onDark: true } : {}),
    });
  }
  return out;
}

function cleanTypeStyles(list: unknown): TypeStyle[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out: TypeStyle[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as Partial<TypeStyle>;
    const label = typeof t.label === "string" ? t.label.trim() : "";
    if (!label) continue;
    const sizePx = Number(t.sizePx);
    out.push({
      label,
      sample: typeof t.sample === "string" ? t.sample : label,
      sizePx: Number.isFinite(sizePx) ? Math.min(400, Math.max(8, Math.round(sizePx))) : 16,
      weight:
        typeof t.weight === "number" || typeof t.weight === "string" ? (t.weight as number) : 400,
      ...(typeof t.tracking === "string" && t.tracking ? { tracking: t.tracking } : {}),
      ...(typeof t.leading === "string" && t.leading ? { leading: t.leading } : {}),
    });
  }
  return out;
}

function cleanRules(list: unknown): LogoRule[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out: LogoRule[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Partial<LogoRule>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title) continue;
    out.push({
      title,
      description: typeof r.description === "string" ? r.description : "",
      ...(typeof r.do === "boolean" ? { do: r.do } : {}),
    });
  }
  return out;
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t ? t.slice(0, max) : undefined;
}

/** Drops anything unusable so a bad save can never break a guide page. */
export function sanitizeBrandGuidePatch(raw: unknown): BrandGuidePatch {
  if (!raw || typeof raw !== "object") return {};
  const p = raw as Record<string, unknown>;
  const patch: BrandGuidePatch = {};

  const intro = cleanText(p["intro"], 4000);
  if (intro) patch.intro = intro;
  const tagline = cleanText(p["tagline"], 200);
  if (tagline) patch.tagline = tagline;
  const typefacePrimary = cleanText(p["typefacePrimary"], 200);
  if (typefacePrimary) patch.typefacePrimary = typefacePrimary;
  const typefaceWeb = cleanText(p["typefaceWeb"], 200);
  if (typefaceWeb) patch.typefaceWeb = typefaceWeb;
  const editedAt = cleanText(p["editedAt"], 40);
  if (editedAt) patch.editedAt = editedAt;

  for (const key of ["primaryColors", "secondaryColors", "tertiaryColors", "neutrals"] as const) {
    const swatches = cleanSwatches(p[key]);
    if (swatches && swatches.length) patch[key] = swatches;
  }
  for (const key of ["headingScale", "bodyScale"] as const) {
    const styles = cleanTypeStyles(p[key]);
    if (styles && styles.length) patch[key] = styles;
  }
  const rules = cleanRules(p["logoRules"]);
  if (rules && rules.length) patch.logoRules = rules;

  const notes = p["logoNotes"];
  if (notes && typeof notes === "object") {
    const n = notes as Record<string, unknown>;
    const headline = cleanText(n["headline"], 200);
    const body = cleanText(n["body"], 2000);
    if (headline || body) {
      patch.logoNotes = { headline: headline ?? "", body: body ?? "" };
    }
  }

  return patch;
}

/** Merges a saved edit over the authored guide. Unset fields keep the baseline. */
export function applyBrandGuidePatch(guide: BrandGuide, patch?: BrandGuidePatch | null): BrandGuide {
  if (!patch || Object.keys(patch).length === 0) return guide;
  const merged: BrandGuide = { ...guide };
  if (patch.intro) merged.intro = patch.intro;
  if (patch.tagline) merged.tagline = patch.tagline;
  if (patch.primaryColors) merged.primaryColors = patch.primaryColors;
  if (patch.secondaryColors) merged.secondaryColors = patch.secondaryColors;
  if (patch.tertiaryColors) merged.tertiaryColors = patch.tertiaryColors;
  if (patch.neutrals) merged.neutrals = patch.neutrals;
  if (patch.typefacePrimary) merged.typefacePrimary = patch.typefacePrimary;
  if (patch.typefaceWeb) merged.typefaceWeb = patch.typefaceWeb;
  if (patch.headingScale) merged.headingScale = patch.headingScale;
  if (patch.bodyScale) merged.bodyScale = patch.bodyScale;
  if (patch.logoNotes) merged.logoNotes = patch.logoNotes;
  if (patch.logoRules) merged.logoRules = patch.logoRules;
  if (patch.editedAt) merged.updatedAt = patch.editedAt;
  return merged;
}

/**
 * Whether a colour edit on this guide also re-themes decks and print.
 *
 * Every TransPerfect division renders in the approved enterprise palette
 * (retired division accents, Aug 2026), so a colour change there is
 * documentation only. `bm-element` and `bm-cobrand` keep their own palettes,
 * so their edits flow into the render tokens.
 */
export function colorEditsRetheme(divisionId: string): boolean {
  if (divisionId === "master") return false;
  return !isTransPerfectBrandScope(divisionId);
}
