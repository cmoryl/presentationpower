// -----------------------------------------------------------------------------
// Manifest-driven export verification
//
// The module manifest (`MODULE_VARIANTS` in taxonomy.ts) declares what a module
// is: which fields are editable and how many items it can carry. The layered
// PPTX exporter has to honour that manifest object-for-object — every editable
// field must arrive in PowerPoint as native, selectable text, and the module's
// media/icon layers must arrive as their own objects rather than getting baked
// into the rasterized plate.
//
// This module turns the manifest into a concrete expectation for one slide's
// content and checks a parsed `LayerReport` against it, so a renderer that
// silently drops a stage, a label or a medallion fails a test instead of
// shipping a degraded .pptx.
// -----------------------------------------------------------------------------

import { MODULE_VARIANTS, byId } from "./taxonomy";
import type { LayerObjectType, LayerReport } from "./layer-report";

export interface VariantExportExpectation {
  variantId: string;
  /** Copy that must be present as native editable text, in manifest order. */
  requiredText: string[];
  /** Minimum object count per layer type. */
  minObjects: Partial<Record<LayerObjectType, number>>;
  /** Item-collection sizes read off the content, keyed by field path. */
  collections: Record<string, number>;
  /** Capacity violations found in the content itself (authoring errors). */
  capacityProblems: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Resolve a manifest field path (`title`, `stages[].label`,
 * `stages[].items[].label`) against slide content. Returns every leaf value the
 * path reaches, flattened.
 */
export function resolveFieldPath(content: unknown, path: string): unknown[] {
  let level: unknown[] = [content];
  for (const rawSeg of path.split(".")) {
    const list = rawSeg.endsWith("[]");
    const key = list ? rawSeg.slice(0, -2) : rawSeg;
    const next: unknown[] = [];
    for (const node of level) {
      if (!isRecord(node)) continue;
      const v = node[key];
      if (v === undefined || v === null) continue;
      if (list) {
        if (Array.isArray(v)) next.push(...v);
      } else {
        next.push(v);
      }
    }
    level = next;
  }
  return level;
}

/** Collection field paths (`stages[]`, `stages[].items[]`) inside the manifest. */
function collectionPaths(fields: string[]): string[] {
  const out = new Set<string>();
  for (const f of fields) {
    const segs = f.split(".");
    const acc: string[] = [];
    for (const s of segs) {
      acc.push(s);
      if (s.endsWith("[]")) out.add(acc.join("."));
    }
  }
  return [...out];
}

/** Icon field paths so we can require one icon object per authored icon. */
const isIconField = (f: string) => /(^|\.)icon$/.test(f);
const isMediaKey = (k: string) => /^(mediaSeed|image|imageUrl|photo|media)$/.test(k);

/**
 * Build the expectation for a variant + the content a slide actually carries.
 * Text-bearing editable fields become required copy; icons and medallion media
 * become minimum object counts; capacity is checked against the manifest.
 */
export function expectationFor(variantId: string, content: unknown): VariantExportExpectation {
  const variant = byId(MODULE_VARIANTS, variantId);
  const fields = variant?.editableFields ?? [];
  const requiredText: string[] = [];
  let iconCount = 0;

  for (const field of fields) {
    const values = resolveFieldPath(content, field);
    if (isIconField(field)) {
      iconCount += values.filter((v) => typeof v === "string" && v.trim()).length;
      continue;
    }
    for (const v of values) {
      if (typeof v !== "string") continue;
      const t = v.trim();
      // Very short tokens (step numbers) collide with unrelated glyphs in the
      // XML, so they are covered by the collection counts instead.
      if (t.length >= 3) requiredText.push(t);
    }
  }

  const collections: Record<string, number> = {};
  for (const p of collectionPaths(fields)) {
    collections[p] = resolveFieldPath(content, p.replace(/\[\]$/, "[]")).length;
  }

  // Media layers: any collection entry carrying a media key expects a photo.
  let mediaCount = 0;
  for (const p of Object.keys(collections)) {
    for (const node of resolveFieldPath(content, p)) {
      if (isRecord(node) && Object.keys(node).some((k) => isMediaKey(k) && node[k])) mediaCount += 1;
    }
  }
  if (isRecord(content) && Object.keys(content).some((k) => isMediaKey(k) && content[k])) {
    mediaCount += 1;
  }

  const capacityProblems: string[] = [];
  const cap = variant?.capacity as
    | { items?: { min?: number; max?: number }; titleChars?: number; bodyChars?: number }
    | undefined;
  const itemCounts = Object.entries(collections);
  if (cap?.items && itemCounts.length) {
    // The outermost collection is the module's item set.
    const [path, n] = itemCounts.sort((a, b) => a[0].length - b[0].length)[0]!;
    if (cap.items.min !== undefined && n < cap.items.min)
      capacityProblems.push(`${path} has ${n} entries, manifest minimum is ${cap.items.min}`);
    if (cap.items.max !== undefined && n > cap.items.max)
      capacityProblems.push(`${path} has ${n} entries, manifest maximum is ${cap.items.max}`);
  }

  return {
    variantId,
    requiredText: [...new Set(requiredText)],
    minObjects: {
      text: Math.max(1, requiredText.length ? 1 : 0),
      ...(iconCount ? { icon: iconCount } : {}),
      ...(mediaCount ? { image: mediaCount } : {}),
    },
    collections,
    capacityProblems,
  };
}

export interface VariantExportVerdict {
  variantId: string;
  ok: boolean
  /** Human-readable mismatches; empty when the export matches the manifest. */
  problems: string[];
  /** Copy the manifest requires that never reached a native text object. */
  missingText: string[];
  /** Objects actually found, by type. */
  counts: Record<LayerObjectType, number>;
}

const norm = (s: string) => s.replace(/[\s\u00a0]+/g, " ").trim().toLowerCase();

/**
 * Compare one exported slide's layer report against a manifest expectation.
 * Media and icon shortfalls are reported as mismatches because they mean the
 * layer collapsed into the plate.
 */
export function verifyVariantExport(
  expectation: VariantExportExpectation,
  report: LayerReport,
): VariantExportVerdict {
  const problems = [...expectation.capacityProblems];

  const haystack = norm(
    report.objects
      .filter((o) => o.type === "text" && o.text)
      .map((o) => o.text!)
      .join(" \u0001 "),
  );
  const missingText = expectation.requiredText.filter((t) => !haystack.includes(norm(t)));
  for (const t of missingText) {
    problems.push(`copy not exported as native text: "${t}"`);
  }

  if (report.flattened) {
    problems.push("slide exported as a single flat picture (no layered objects)");
  }

  for (const [type, min] of Object.entries(expectation.minObjects) as Array<
    [LayerObjectType, number]
  >) {
    const got = report.counts[type] ?? 0;
    if (got < min) problems.push(`expected at least ${min} ${type} object(s), found ${got}`);
  }

  problems.push(...report.problems);

  return {
    variantId: expectation.variantId,
    ok: problems.length === 0,
    problems,
    missingText,
    counts: report.counts,
  };
}

/** One-line summary for test failure output / sweep logs. */
export function formatVerdict(v: VariantExportVerdict): string {
  if (v.ok) return `${v.variantId}: OK`;
  return `${v.variantId}:\n  - ${v.problems.join("\n  - ")}`;
}
