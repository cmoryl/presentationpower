// Shared slide-mutation core.
//
// Both the in-app Copilot (src/lib/ai-copilot.functions.ts, which edits an
// in-memory working copy) and the MCP tools (src/lib/mcp/tools/*, which edit
// deck_slides rows) run their edits through these pure helpers so the two
// surfaces can never drift apart: same deep-merge semantics, same numeric
// guardrail, same variant/layout validation.

import { MODULE_VARIANTS, byId, variantsForSection } from "@/lib/taxonomy";

export type SlideContent = Record<string, unknown>;

export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function deepMerge(base: SlideContent, patch: SlideContent): SlideContent {
  const out: SlideContent = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const cur = out[k];
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      cur &&
      typeof cur === "object" &&
      !Array.isArray(cur)
    ) {
      out[k] = deepMerge(cur as SlideContent, v as SlideContent);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Flatten number-ish leaf values so numeric edits can be detected. */
export function collectNumericLeaves(obj: unknown, out: string[] = []): string[] {
  if (obj == null) return out;
  if (typeof obj === "number") {
    out.push(String(obj));
    return out;
  }
  if (typeof obj === "string") {
    if (/^[-+]?\d[\d,]*(\.\d+)?%?$/.test(obj.trim())) out.push(obj.trim());
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v) => collectNumericLeaves(v, out));
    return out;
  }
  if (typeof obj === "object") {
    Object.values(obj).forEach((v) => collectNumericLeaves(v, out));
  }
  return out;
}

const NUMERIC_INTENT_RE =
  /\b(number|numeric|stat|metric|figure|percent|%|update.*(number|stat|percent)|change.*(number|stat|percent))\b/i;

export function userMentionsNumbers(userMessage: string): boolean {
  return NUMERIC_INTENT_RE.test(userMessage) || /\d/.test(userMessage);
}

function numericFingerprint(value: unknown): string {
  return collectNumericLeaves(value).sort().join("|");
}

/** Multiset of numeric leaves, so we can tell an addition from a rewrite. */
function numericCounts(value: unknown): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of collectNumericLeaves(value)) m.set(n, (m.get(n) ?? 0) + 1);
  return m;
}

/**
 * Numerics that existed before but no longer survive the merge. Adding brand new
 * figures into empty or placeholder slots is not a "numeric edit" — only losing
 * or rewriting a figure that was already on the slide is.
 */
function droppedNumerics(before: Map<string, number>, after: Map<string, number>): string[] {
  const lost: string[] = [];
  for (const [n, count] of before) {
    if ((after.get(n) ?? 0) < count) lost.push(n);
  }
  return lost;
}

export const NUMERIC_GUARDRAIL_MESSAGE =
  "Rejected: this patch would overwrite numeric stats/dates already on the slide but the request did not ask for numeric edits. Re-send with allow_numeric_edits: true only if the user supplied or approved those figures. Adding figures to empty fields does not need the flag.";

export type OpResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Deep-merge `patch` into `content`. When `allowNumericEdits` is false the
 * merge is rejected if it would alter any numeric leaf (stats, dates, currency).
 */
export function applyContentPatch(
  content: SlideContent,
  patch: SlideContent,
  opts: { allowNumericEdits: boolean; baselineNumerics?: string[] },
): OpResult<SlideContent> {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { ok: false, error: "patch must be an object" };
  }
  const next = deepMerge(content, patch);
  if (!opts.allowNumericEdits) {
    const beforeList = opts.baselineNumerics ?? collectNumericLeaves(content);
    const before = new Map<string, number>();
    for (const n of beforeList) before.set(n, (before.get(n) ?? 0) + 1);
    const lost = droppedNumerics(before, numericCounts(next));
    if (lost.length) {
      return {
        ok: false,
        error: `${NUMERIC_GUARDRAIL_MESSAGE} Figures affected: ${lost.slice(0, 6).join(", ")}.`,
      };
    }
  }
  return { ok: true, value: next };
}

/** Set `content.icon`, or `content.items[itemIndex].icon` when itemIndex is given. */
export function applyIcon(
  content: SlideContent,
  iconRef: string,
  itemIndex?: number,
): OpResult<SlideContent> {
  const ref = String(iconRef ?? "").trim();
  if (!ref) return { ok: false, error: "iconRef required" };
  if (typeof itemIndex === "number") {
    const items = Array.isArray(content.items)
      ? [...(content.items as Array<Record<string, unknown>>)]
      : [];
    if (itemIndex < 0 || itemIndex >= items.length) {
      return { ok: false, error: "itemIndex out of range" };
    }
    items[itemIndex] = { ...items[itemIndex], icon: ref };
    return { ok: true, value: { ...content, items } };
  }
  return { ok: true, value: { ...content, icon: ref } };
}

/**
 * Validate a variant swap for a slide's section and auto-correct the layout to
 * a permitted one. Returns the new variant + layout ids.
 */
export function resolveVariantSwap(
  sectionId: string | null | undefined,
  currentLayoutId: string,
  variantId: string,
): OpResult<{ variantId: string; layoutId: string; variantName?: string }> {
  const id = String(variantId ?? "").trim();
  if (!id) return { ok: false, error: "variantId required" };
  const permitted = sectionId ? variantsForSection(sectionId) : [];
  const next =
    permitted.find((v) => v.id === id) ?? (sectionId ? undefined : byId(MODULE_VARIANTS, id));
  if (!next) {
    return {
      ok: false,
      error: `Variant ${id} is not permitted for section ${sectionId ?? "(none)"}. List the section's variants first.`,
    };
  }
  const layoutId = next.permittedLayoutIds.includes(currentLayoutId)
    ? currentLayoutId
    : next.permittedLayoutIds[0];
  return { ok: true, value: { variantId: next.id, layoutId, variantName: next.name } };
}

// ---------------------------------------------------------------------------
// CAPACITY CLAMP — the stage area is a hard boundary, not a suggestion.
//
// Every module declares how many repeating rows its layout was designed for
// (`capacity.items.max`: 5 timeline stages, 3 stat cards, 6 bento tiles…).
// Nothing used to enforce that at write time, so an agent or a seeded build
// that wrote 8 stages into a 5-stage rail rendered the extra rows straight off
// the bottom of the slide — visible on screen and baked into the export.
//
// Clamping here, in the one helper every write path shares, means the overflow
// can never reach the canvas. The dropped rows are returned so the caller can
// tell the agent to continue them on a second slide instead of silently losing
// content.
// ---------------------------------------------------------------------------

export type CapacityClamp = {
  /** Repeating collection that overflowed, e.g. "items" or "steps". */
  path: string;
  max: number;
  written: number;
  /** Rows removed because the layout has nowhere to draw them. */
  dropped: unknown[];
};

function readCollection(content: SlideContent, path: string): unknown[] | null {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, content);
  return Array.isArray(value) ? value : null;
}

function writeCollection(content: SlideContent, path: string, rows: unknown[]): SlideContent {
  const keys = path.split(".");
  const out: SlideContent = { ...content };
  let cursor: Record<string, unknown> = out;
  for (const key of keys.slice(0, -1)) {
    const child = cursor[key];
    const next =
      child && typeof child === "object" && !Array.isArray(child)
        ? { ...(child as Record<string, unknown>) }
        : {};
    cursor[key] = next;
    cursor = next;
  }
  cursor[keys[keys.length - 1]!] = rows;
  return out;
}

/**
 * Trim a slide's repeating collection to the variant's declared maximum.
 * Returns the content unchanged (and `clamp: null`) when it already fits.
 */
export function clampContentToCapacity(
  variantId: string | null | undefined,
  content: SlideContent,
): { content: SlideContent; clamp: CapacityClamp | null } {
  const variant = variantId ? byId(MODULE_VARIANTS, variantId) : undefined;
  const cap = variant?.capacity.items;
  if (!cap) return { content, clamp: null };
  const path = cap.path ?? "items";
  const rows = readCollection(content, path);
  if (!rows || rows.length <= cap.max) return { content, clamp: null };
  return {
    content: writeCollection(content, path, rows.slice(0, cap.max)),
    clamp: { path, max: cap.max, written: rows.length, dropped: rows.slice(cap.max) },
  };
}

/** Agent-facing explanation of a clamp, so the extra rows aren't just lost. */
export function capacityClampNotice(clamp: CapacityClamp, variantId?: string | null): string {
  return `This module draws at most ${clamp.max} ${clamp.path} inside the slide's stage area; you sent ${clamp.written}, so the last ${clamp.dropped.length} were not written (they would have rendered off the bottom of the slide). Continue them on another slide${variantId ? ` with the same module (${variantId})` : ""}, or switch to a module sized for ${clamp.written} rows.`;
}
