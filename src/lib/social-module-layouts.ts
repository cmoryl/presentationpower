/**
 * SOCIAL MODULE LAYOUTS
 * ---------------------------------------------------------------------------
 * Bridges the print section module library (`PRINT_SECTION_MODULES` — heroes,
 * stats, quotes, logo grids, expertise, features, narrative, tables, contact)
 * into the social system so a social asset can be composed from any module we
 * already ship, instead of only the built-in SocialRenderer preset.
 *
 * Responsibilities:
 *  - expose the library as social-selectable layouts with aspect suitability,
 *  - stamp the kit's brand copy (title / summary / CTA / stat) into whichever
 *    fields the chosen module actually has,
 *  - apply the fit engine's relief rung by trimming repeated items and
 *    optional paragraphs, so nothing ever overlaps or clips.
 */

import type { PrintSection } from "@/lib/print-assets.types";
import type { CampaignCopy } from "@/lib/campaigns";
import type { AspectClass, SocialFormat } from "@/lib/social-formats";
import { aspectClass } from "@/lib/social-formats";
import {
  PRINT_SECTION_MODULES,
  PRINT_MODULE_FAMILY_ORDER,
  printModuleFamilyMeta,
  printModuleMatches,
  type PrintModuleFamily,
  type PrintSectionModule,
} from "@/lib/print-library/section-modules";

export type SocialModuleLayout = {
  id: string;
  label: string;
  description: string;
  family: PrintModuleFamily;
  variantId: string;
  density: "compact" | "standard" | "tall";
  tags: string[];
  /** Aspect classes this module reads well on (others still render, with relief). */
  suitedFor: AspectClass[];
  make: () => PrintSection;
};

/** Density → which social geometries the module comfortably lives on. */
function suitability(m: PrintSectionModule): AspectClass[] {
  if (m.density === "tall") return ["portrait", "portrait-tall", "square"];
  if (m.density === "compact")
    return ["square", "portrait", "portrait-tall", "landscape", "landscape-wide"];
  return ["square", "portrait", "portrait-tall", "landscape"];
}

export const SOCIAL_MODULE_LAYOUTS: SocialModuleLayout[] = PRINT_SECTION_MODULES.map((m) => ({
  id: m.id,
  label: m.label,
  description: m.description,
  family: m.family,
  variantId: m.variantId,
  density: m.density,
  tags: m.tags,
  suitedFor: suitability(m),
  make: m.make,
}));

export const SOCIAL_MODULE_FAMILIES = PRINT_MODULE_FAMILY_ORDER;
export { printModuleFamilyMeta };

export function findSocialModuleLayout(id: string): SocialModuleLayout | undefined {
  return SOCIAL_MODULE_LAYOUTS.find((l) => l.id === id);
}

export function socialModuleMatches(layout: SocialModuleLayout, query: string): boolean {
  return printModuleMatches(
    {
      id: layout.id,
      family: layout.family,
      variantId: layout.variantId,
      label: layout.label,
      description: layout.description,
      density: layout.density,
      bestFor: [],
      tags: layout.tags,
      make: layout.make,
    },
    query,
  );
}

/** Modules ranked for a given format — suited ones first, then the rest. */
export function socialModulesForFormat(format: SocialFormat): SocialModuleLayout[] {
  const cls = aspectClass(format);
  return [...SOCIAL_MODULE_LAYOUTS].sort((a, b) => {
    const av = a.suitedFor.includes(cls) ? 0 : 1;
    const bv = b.suitedFor.includes(cls) ? 0 : 1;
    if (av !== bv) return av - bv;
    return 0;
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Copy stamping
// ───────────────────────────────────────────────────────────────────────────

type Loose = Record<string, unknown>;

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Write the kit copy into the module's own field names. Only fields the module
 * already has are touched, so a logo grid never grows a stat rail it cannot
 * render.
 */
export function applyCopyToSection(section: PrintSection, copy: CampaignCopy): PrintSection {
  const s = { ...(section as unknown as Loose) } as Loose;

  if (isNonEmpty(copy.eyebrow) && "eyebrow" in s) s.eyebrow = copy.eyebrow;
  if (isNonEmpty(copy.title)) {
    if ("title" in s) s.title = copy.title;
    else if ("text" in s) s.text = copy.title;
  }
  if (isNonEmpty(copy.summary)) {
    if ("summary" in s) s.summary = copy.summary;
    else if ("body" in s) s.body = copy.summary;
  }
  if (isNonEmpty(copy.cta)) {
    const cta = s.cta as Loose | undefined;
    if (cta && typeof cta === "object") s.cta = { ...cta, label: copy.cta };
    else if ("ctaLabel" in s) s.ctaLabel = copy.cta;
  }
  // Quote modules carry the headline as the quote text.
  if (isNonEmpty(copy.title) && "quote" in s) {
    const q = s.quote as Loose | undefined;
    if (q && typeof q === "object") s.quote = { ...q, text: copy.title };
  }
  // Stat modules: lead item becomes the kit's proof point.
  if (copy.stat && isNonEmpty(copy.stat.value) && Array.isArray(s.items)) {
    const items = [...(s.items as Loose[])];
    if (items.length > 0 && items[0] && typeof items[0] === "object" && "value" in items[0]) {
      items[0] = { ...items[0], value: copy.stat.value, label: copy.stat.label || items[0].label };
      s.items = items;
    }
  }
  return s as unknown as PrintSection;
}

/**
 * Apply a relief rung: cap repeated items, drop optional paragraphs and meta
 * rails. Purely subtractive — nothing is resized here, the frame handles that.
 */
export function applyReliefToSection(
  section: PrintSection,
  relief: { maxItems: number; dropSummary: boolean; dropMeta: boolean },
): PrintSection {
  const s = { ...(section as unknown as Loose) } as Loose;

  for (const key of ["items", "rows", "logos", "cards", "bullets", "pills", "steps"]) {
    const arr = s[key];
    if (Array.isArray(arr) && arr.length > relief.maxItems) {
      s[key] = arr.slice(0, relief.maxItems);
    }
  }
  if (relief.dropSummary) {
    if (isNonEmpty(s.summary)) s.summary = "";
    if (isNonEmpty(s.body)) s.body = "";
  }
  if (relief.dropMeta) {
    if (Array.isArray(s.meta)) s.meta = [];
    if (isNonEmpty(s.caption)) s.caption = "";
  }
  return s as unknown as PrintSection;
}

/** Ready-to-render section for a social frame at a given relief rung. */
export function buildSocialModuleSection(args: {
  layout: SocialModuleLayout;
  copy: CampaignCopy;
  relief: { maxItems: number; dropSummary: boolean; dropMeta: boolean };
  /** Optional pre-edited section (studio edits) to use instead of a fresh one. */
  base?: PrintSection;
  /** Skip copy stamping when the user has hand-edited the fields. */
  stampCopy?: boolean;
}): PrintSection {
  const base = args.base ?? args.layout.make();
  const withCopy = args.stampCopy === false ? base : applyCopyToSection(base, args.copy);
  return applyReliefToSection(withCopy, args.relief);
}

// ───────────────────────────────────────────────────────────────────────────
// Editable leaf paths (studio text editing)
// ───────────────────────────────────────────────────────────────────────────

const SKIP_KEYS = new Set(["id", "kind", "variantId", "flip", "heroMedia", "logoColor"]);

export function sectionTextPaths(section: PrintSection): string[] {
  const out: string[] = [];
  const walk = (value: unknown, prefix: string) => {
    if (typeof value === "string") {
      out.push(prefix);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${prefix}[${i}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value as Loose)) {
        if (SKIP_KEYS.has(k)) continue;
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
    }
  };
  walk(section, "");
  return out;
}

function parsePath(path: string): Array<string | number> {
  const parts: Array<string | number> = [];
  for (const seg of path.split(".")) {
    const m = seg.match(/^([^[]+)((\[\d+\])*)$/);
    if (!m) continue;
    parts.push(m[1]);
    const idx = seg.match(/\[(\d+)\]/g) ?? [];
    for (const i of idx) parts.push(Number(i.slice(1, -1)));
  }
  return parts;
}

export function readSectionText(section: PrintSection, path: string): string {
  let cur: unknown = section;
  for (const key of parsePath(path)) {
    if (cur == null) return "";
    cur = (cur as Loose)[key as string];
  }
  return typeof cur === "string" ? cur : "";
}

export function writeSectionText(section: PrintSection, path: string, value: string): PrintSection {
  const keys = parsePath(path);
  const clone = structuredClone(section) as unknown as Loose;
  let cur: Loose = clone;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i] as string;
    const next = cur[k];
    if (next == null || typeof next !== "object") return section;
    cur[k] = Array.isArray(next) ? [...(next as unknown[])] : { ...(next as Loose) };
    cur = cur[k] as Loose;
  }
  cur[keys[keys.length - 1] as string] = value;
  return clone as unknown as PrintSection;
}

/** Friendly label for a leaf path in the inspector. */
export function pathLabel(path: string): string {
  return path
    .replace(/\[(\d+)\]/g, (_m, n) => ` ${Number(n) + 1}`)
    .replace(/\./g, " · ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}
