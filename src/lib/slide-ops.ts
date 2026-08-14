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

export const NUMERIC_GUARDRAIL_MESSAGE =
  "Rejected: this patch would change numeric stats/dates but the request did not ask for numeric edits.";

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
    const before = (opts.baselineNumerics ?? collectNumericLeaves(content)).slice().sort().join("|");
    if (before !== numericFingerprint(next)) {
      return { ok: false, error: NUMERIC_GUARDRAIL_MESSAGE };
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
  const next = permitted.find((v) => v.id === id) ?? (sectionId ? undefined : byId(MODULE_VARIANTS, id));
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
