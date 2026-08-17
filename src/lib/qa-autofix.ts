// ============================================================================
// QA auto-fix engine — resolves blocking issues and warnings WITHOUT losing
// authored or imported content.
//
// Hard rules (these are the whole point of the module):
//  1. Nothing is ever truncated or deleted. Overflow becomes a real
//     continuation slide that renders in preview / present / share / export —
//     never a value parked in a content field only the editor can see.
//  2. Empty required fields are filled from donors that already exist on the
//     slide (sibling fields, imported source text, speaker notes). We never
//     invent copy and never write lorem placeholders.
//  3. Long copy is handled by shrinking the slide's type scale (a real,
//     rendered treatment) instead of cutting words.
//  4. Anything that cannot be fixed without inventing or destroying content is
//     returned as `unresolved` so the gate still reports it honestly.
// ============================================================================

import { nanoid } from "nanoid";
import type { DeckSlide, SlideContent } from "./deck-store";
import { MODULE_VARIANTS, byId, type ModuleVariant } from "./taxonomy";
import { BRAND_PROFILES, resolveBrandMode } from "./brand-profiles";
import { hexContrast, resolveSlideAccent, slideBackgroundForMode } from "./slide-accent";
import {
  clampTemplateType,
  mergeTemplateOverride,
  resolveSlideTemplate,
} from "./section-templates";
import { runQa, expandPath, readPath, type QaIssue } from "./qa";

export type QaFixKind =
  | "split-overflow"
  | "swap-capacity-variant"
  | "fill-from-donor"
  | "shrink-type"
  | "poster-from-media"
  | "source-from-donor"
  | "accent-legible"
  | "swap-brand-variant";

export interface QaFix {
  code: string;
  kind: QaFixKind;
  slideId: string;
  /** Human sentence for the report — always says where content went. */
  detail: string;
  /** New slide id when content was carried onto a continuation slide. */
  carriedToSlideId?: string;
}

export interface QaFixReport {
  slides: DeckSlide[];
  fixes: QaFix[];
  unresolved: QaIssue[];
  changed: boolean;
}

export interface QaFixOptions {
  brandModeId?: string;
  /** Industry recipe id (deck.context.designRecipeId) for type-scale maths. */
  industryId?: string | null;
  /** Fix warnings too (default true). Blocking issues are always attempted. */
  includeWarnings?: boolean;
  /** Deterministic ids for tests. */
  newId?: () => string;
}

/* ------------------------------------------------------------------ helpers */

const TITLE_DONORS = ["title", "headline", "heading", "kicker", "eyebrow", "subhead", "label", "name"];
const BODY_DONORS = ["body", "description", "summary", "copy", "text", "detail", "blurb", "subhead"];
const SOURCE_DONORS = ["source", "sourceUrl", "citation", "footnote", "provenance", "attribution"];
const RAW_DONORS = ["importedText", "sourceText", "rawText", "originalText"];

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function isFilled(v: unknown): v is string | number {
  if (typeof v === "string") return v.trim() !== "";
  return typeof v === "number" && Number.isFinite(v);
}

function pathParts(path: string): Array<string | number> {
  return path.split(".").flatMap((p) => {
    const m = /^([^[]+)(\[(\d+)\])?$/.exec(p);
    if (!m) return [p];
    return m[3] !== undefined ? [m[1]!, Number(m[3])] : [m[1]!];
  });
}

function writePath(root: Record<string, unknown>, path: string, value: unknown) {
  const parts = pathParts(path);
  let cur: any = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const k = parts[i]!;
    if (cur[k] == null) cur[k] = typeof parts[i + 1] === "number" ? [] : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]!] = value;
}

/** Drop the "content." prefix QA paths carry so we can read slide.content. */
function contentRelative(path: string): string {
  return path.startsWith("content.") ? path.slice("content.".length) : path;
}

function leafKey(path: string): string {
  const parts = pathParts(path);
  const last = parts[parts.length - 1];
  if (typeof last === "number") {
    const prev = parts[parts.length - 2];
    return typeof prev === "string" ? prev : "";
  }
  return String(last ?? "");
}

/** Container path of a leaf (e.g. `items[2].label` → `items[2]`). */
function parentPath(path: string): string | null {
  const idx = Math.max(path.lastIndexOf("."), path.lastIndexOf("["));
  if (idx <= 0) return null;
  if (path[idx] === "[") return path.slice(0, idx);
  return path.slice(0, idx);
}

function firstSentence(text: string, maxWords: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  const stop = t.search(/[.!?](\s|$)/);
  const head = stop > 8 ? t.slice(0, stop + 1) : t;
  const words = head.split(" ");
  return words.length <= maxWords ? head : `${words.slice(0, maxWords).join(" ")}…`;
}

/** Donor keys to try for a leaf field, most-specific first. */
function donorKeysFor(key: string): string[] {
  const k = key.toLowerCase();
  if (SOURCE_DONORS.includes(k)) return SOURCE_DONORS;
  if (TITLE_DONORS.includes(k)) return TITLE_DONORS;
  if (BODY_DONORS.includes(k)) return BODY_DONORS;
  return [key, ...TITLE_DONORS, ...BODY_DONORS];
}

/**
 * Find a value for an empty field from content that already exists on the
 * slide. Order: sibling keys in the same object → same-named key elsewhere in
 * content → imported raw text → speaker notes. Never fabricates.
 */
function findDonor(slide: DeckSlide, relPath: string): { value: string; from: string } | null {
  const content = slide.content as Record<string, unknown>;
  const key = leafKey(relPath);
  const parent = parentPath(relPath);
  const donors = donorKeysFor(key);

  // 1. Sibling keys inside the same object (item-level fields).
  if (parent) {
    const obj = readPath(content, parent);
    if (obj && typeof obj === "object") {
      for (const d of donors) {
        if (d === key) continue;
        const v = (obj as Record<string, unknown>)[d];
        if (isFilled(v)) return { value: String(v), from: `${parent}.${d}` };
      }
    }
  }

  // 2. Top-level content donors.
  for (const d of donors) {
    if (parent === null && d === key) continue;
    const v = content[d];
    if (isFilled(v)) {
      const words = key.toLowerCase().includes("title") || TITLE_DONORS.includes(key.toLowerCase()) ? 12 : 40;
      return { value: firstSentence(String(v), words), from: `content.${d}` };
    }
  }

  // 3. Imported raw text kept on the slide by the PPTX importer.
  for (const d of RAW_DONORS) {
    const v = content[d];
    if (isFilled(v)) {
      return { value: firstSentence(String(v), TITLE_DONORS.includes(key.toLowerCase()) ? 12 : 40), from: `content.${d}` };
    }
  }

  // 4. Speaker notes (imported decks nearly always carry them).
  if (isFilled(slide.notes)) {
    return {
      value: firstSentence(String(slide.notes), TITLE_DONORS.includes(key.toLowerCase()) ? 12 : 40),
      from: "notes",
    };
  }
  return null;
}

/* ---------------------------------------------------------------- accent fix */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb: [number, number, number]) =>
  `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")}`;

/** Push an accent toward black (light bg) or white (dark bg) until it passes. */
function legibleAccent(accent: string, bg: string, target = 4.5): string | null {
  const rgb = hexToRgb(accent);
  if (!rgb) return null;
  const dark = (hexToRgb(bg) ?? [255, 255, 255]).reduce((a, b) => a + b, 0) / 3 < 128;
  const anchor: [number, number, number] = dark ? [255, 255, 255] : [0, 0, 0];
  for (let step = 1; step <= 20; step += 1) {
    const t = step / 20;
    const next = toHex([
      rgb[0] + (anchor[0] - rgb[0]) * t,
      rgb[1] + (anchor[1] - rgb[1]) * t,
      rgb[2] + (anchor[2] - rgb[2]) * t,
    ]);
    if (hexContrast(next, bg) >= target) return next;
  }
  return null;
}

/* ------------------------------------------------------------ variant search */

function variantFits(v: ModuleVariant, n: number): boolean {
  const cap = v.capacity.items;
  if (!cap) return n === 0;
  return n >= cap.min && n <= cap.max;
}

function bestVariantForCount(current: ModuleVariant, n: number, allow?: Set<string>): ModuleVariant | null {
  const pool = MODULE_VARIANTS.filter(
    (v) => v.id !== current.id && (!allow || allow.has(v.id)) && variantFits(v, n),
  );
  if (pool.length === 0) return null;
  // Prefer the same family, then the same section framework family prefix.
  const same = pool.filter((v) => v.familyId === current.familyId);
  return (same[0] ?? pool[0]) as ModuleVariant;
}

function swapKeepingContent(slide: DeckSlide, next: ModuleVariant): DeckSlide {
  return {
    ...slide,
    variantId: next.id,
    layoutId: next.permittedLayoutIds[0] ?? slide.layoutId,
    content: slide.content,
  };
}

/* ---------------------------------------------------------------- the engine */

export function autoFixQa(slides: DeckSlide[], opts: QaFixOptions = {}): QaFixReport {
  const includeWarnings = opts.includeWarnings !== false;
  const newId = opts.newId ?? (() => nanoid(10));
  const profile = opts.brandModeId ? BRAND_PROFILES[opts.brandModeId] : undefined;
  const brand = opts.brandModeId ? resolveBrandMode(opts.brandModeId) : undefined;
  const preferred = new Set(profile?.contentScope.preferredVariantIds ?? []);
  const restricted = new Set(profile?.contentScope.restrictedFamilyIds ?? []);

  let work = clone(slides);
  const fixes: QaFix[] = [];

  // Up to 4 passes: a split can surface a new (smaller) issue on the carried
  // slide, and a variant swap changes which fields are required.
  for (let pass = 0; pass < 4; pass += 1) {
    const issues = runQa(work, opts.brandModeId).filter(
      (i) => includeWarnings || i.severity === "block",
    );
    if (issues.length === 0) break;
    const before = fixes.length;

    for (const issue of issues) {
      const idx = work.findIndex((s) => s.id === issue.slideId);
      if (idx < 0) continue;
      const slide = work[idx]!;
      const variant = byId(MODULE_VARIANTS, slide.variantId);
      if (!variant) continue;

      switch (issue.code) {
        /* ---- over capacity: carry the overflow onto real continuation slides */
        case "over-capacity": {
          const cap = variant.capacity.items;
          const items = Array.isArray(slide.content.items)
            ? (slide.content.items as unknown[])
            : [];
          if (!cap || items.length <= cap.max) break;
          const chunks: unknown[][] = [];
          for (let i = 0; i < items.length; i += cap.max) chunks.push(items.slice(i, i + cap.max));
          const kept = chunks.shift()!;
          const baseTitle = String(
            (slide.content as Record<string, unknown>).title ??
              (slide.content as Record<string, unknown>).headline ??
              "",
          );
          const carried: DeckSlide[] = chunks.map((chunk, n) => {
            const content = clone(slide.content) as Record<string, unknown>;
            content.items = chunk;
            if (baseTitle) {
              const label = `${baseTitle} (cont. ${n + 2})`;
              if (isFilled(content.title)) content.title = label;
              else if (isFilled(content.headline)) content.headline = label;
              else content.title = label;
            }
            content.continuedFromSlideId = slide.id;
            return {
              ...clone(slide),
              id: newId(),
              content: content as SlideContent,
              changes: [],
              position: 0,
            };
          });
          const updated: DeckSlide = {
            ...slide,
            content: { ...(slide.content as Record<string, unknown>), items: kept } as SlideContent,
          };
          work = [...work.slice(0, idx), updated, ...carried, ...work.slice(idx + 1)].map((s, i) => ({
            ...s,
            position: i,
          }));
          for (const c of carried) {
            fixes.push({
              code: issue.code,
              kind: "split-overflow",
              slideId: slide.id,
              carriedToSlideId: c.id,
              detail: `Moved ${(c.content.items as unknown[]).length} overflow item(s) onto a new continuation slide — nothing was cut.`,
            });
          }
          break;
        }

        /* ---- under capacity: re-home the content in a layout that fits it */
        case "under-capacity": {
          const n = Array.isArray(slide.content.items)
            ? (slide.content.items as unknown[]).length
            : 0;
          const target = bestVariantForCount(variant, n, preferred.size > 0 ? undefined : undefined);
          if (!target) break;
          work = work.map((s, i) => (i === idx ? swapKeepingContent(slide, target) : s));
          fixes.push({
            code: issue.code,
            kind: "swap-capacity-variant",
            slideId: slide.id,
            detail: `Layout swapped to ${target.name}, which is built for ${n} item(s) — all content kept.`,
          });
          break;
        }

        /* ---- empty required field: fill from content that already exists */
        case "empty-field": {
          const filledAny: string[] = [];
          const content = clone(slide.content) as Record<string, unknown>;
          for (const pattern of variant.editableFields) {
            for (const cp of expandPath(pattern, slide.content)) {
              const rel = contentRelative(cp);
              if (isFilled(readPath(content, rel))) continue;
              const donor = findDonor(slide, rel);
              if (!donor) continue;
              writePath(content, rel, donor.value);
              filledAny.push(`${rel} ← ${donor.from}`);
            }
          }
          if (filledAny.length === 0) break;
          work = work.map((s, i) => (i === idx ? { ...s, content: content as SlideContent } : s));
          fixes.push({
            code: issue.code,
            kind: "fill-from-donor",
            slideId: slide.id,
            detail: `Filled ${filledAny.length} empty field(s) from existing slide content (${filledAny.slice(0, 3).join(", ")}${filledAny.length > 3 ? "…" : ""}).`,
          });
          break;
        }

        /* ---- restricted / non-preferred variant for the brand */
        case "brand-restricted-family":
        case "brand-nonpreferred-variant": {
          if (preferred.size === 0) break;
          const n = Array.isArray(slide.content.items)
            ? (slide.content.items as unknown[]).length
            : 0;
          const pool = MODULE_VARIANTS.filter(
            (v) =>
              preferred.has(v.id) &&
              !restricted.has(v.familyId) &&
              v.id !== variant.id &&
              variantFits(v, n),
          );
          const target =
            pool.find((v) => v.familyId === variant.familyId) ??
            (issue.code === "brand-restricted-family" ? pool[0] : undefined);
          if (!target) break;
          work = work.map((s, i) => (i === idx ? swapKeepingContent(slide, target) : s));
          fixes.push({
            code: issue.code,
            kind: "swap-brand-variant",
            slideId: slide.id,
            detail: `Swapped to the brand-approved ${target.name} layout — content carried across.`,
          });
          break;
        }

        /* ---- long copy: shrink the rendered type scale, never the words */
        case "title-too-long":
        case "body-too-long": {
          const resolved = resolveSlideTemplate({ slide, industryId: opts.industryId ?? null });
          const axis = issue.code === "title-too-long" ? "display" : "body";
          const current = resolved.typeScale[axis];
          const next = clampTemplateType(axis, Math.round(current * 0.86));
          if (next >= current) break;
          const patch = mergeTemplateOverride(slide.templateOverride, {
            typeScale: { [axis]: next } as Partial<typeof resolved.typeScale>,
            fillBias: Math.min(1.25, (slide.templateOverride?.fillBias ?? resolved.fill > 0 ? 1 : 1) * 1.06),
          });
          work = work.map((s, i) =>
            i === idx ? { ...s, templateOverride: patch ?? undefined } : s,
          );
          fixes.push({
            code: issue.code,
            kind: "shrink-type",
            slideId: slide.id,
            detail: `Reduced the ${axis === "display" ? "headline" : "body"} type scale to ${next}px so the full copy fits on the slide — no text removed.`,
          });
          break;
        }

        /* ---- stat missing its citation */
        case "missing-source": {
          const items = Array.isArray(slide.content.items)
            ? clone(slide.content.items as Array<Record<string, unknown>>)
            : [];
          let touched = 0;
          items.forEach((it) => {
            if (!("value" in it) || isFilled(it.source)) return;
            for (const d of SOURCE_DONORS) {
              if (d === "source") continue;
              if (isFilled(it[d])) {
                it.source = String(it[d]);
                touched += 1;
                return;
              }
            }
            const deckSource =
              (slide.content as Record<string, unknown>).source ??
              (slide.content as Record<string, unknown>).sourceNote;
            if (isFilled(deckSource)) {
              it.source = String(deckSource);
              touched += 1;
            }
          });
          if (touched === 0) break;
          work = work.map((s, i) =>
            i === idx
              ? { ...s, content: { ...(s.content as Record<string, unknown>), items } as SlideContent }
              : s,
          );
          fixes.push({
            code: issue.code,
            kind: "source-from-donor",
            slideId: slide.id,
            detail: `Cited ${touched} stat(s) from a source already present on the slide.`,
          });
          break;
        }

        /* ---- video with no poster frame */
        case "video-missing-poster": {
          const c = slide.content as Record<string, unknown>;
          const poster = [c.mediaUrl, c.imageUrl, c.heroUrl].find(
            (v) => typeof v === "string" && v.trim(),
          );
          if (!poster) break;
          work = work.map((s, i) =>
            i === idx
              ? {
                  ...s,
                  content: { ...(s.content as Record<string, unknown>), videoPosterUrl: poster } as SlideContent,
                }
              : s,
          );
          fixes.push({
            code: issue.code,
            kind: "poster-from-media",
            slideId: slide.id,
            detail: "Used the slide's own image as the video poster frame for static exports.",
          });
          break;
        }

        /* ---- illegible accent */
        case "accent-contrast-fail":
        case "accent-contrast-large-only": {
          if (!brand) break;
          const accent = resolveSlideAccent(slide, brand);
          const bg = slideBackgroundForMode(slide.mode);
          const next = legibleAccent(accent, bg);
          if (!next || next.toLowerCase() === accent.toLowerCase()) break;
          work = work.map((s, i) =>
            i === idx
              ? {
                  ...s,
                  content: { ...(s.content as Record<string, unknown>), accentOverride: next } as SlideContent,
                }
              : s,
          );
          fixes.push({
            code: issue.code,
            kind: "accent-legible",
            slideId: slide.id,
            detail: `Deepened the slide accent to ${next.toUpperCase()} so text clears WCAG AA (${hexContrast(next, bg).toFixed(2)}:1).`,
          });
          break;
        }

        default:
          break;
      }
    }

    if (fixes.length === before) break; // no progress — stop looping
  }

  const unresolved = runQa(work, opts.brandModeId).filter(
    (i) => includeWarnings || i.severity === "block",
  );
  return { slides: work, fixes, unresolved, changed: fixes.length > 0 };
}

/** Compact one-line summary for toasts and the import report. */
export function summarizeQaFixes(report: QaFixReport): string {
  if (!report.changed) return "Nothing to auto-fix";
  const carried = report.fixes.filter((f) => f.kind === "split-overflow").length;
  const parts = [`${report.fixes.length} issue${report.fixes.length === 1 ? "" : "s"} fixed`];
  if (carried) parts.push(`${carried} overflow item group(s) moved to continuation slides`);
  if (report.unresolved.length) parts.push(`${report.unresolved.length} left for review`);
  return parts.join(" · ");
}
