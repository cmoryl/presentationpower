// -----------------------------------------------------------------------------
// Brand mode ids for MCP callers
//
// Every brand mode id in the taxonomy is `bm-*`. Tools used to default to the
// string 'transperfect', which matches no brand mode and no
// `owner_division_id`, so a division-scoped query filtered out its entire
// corpus without erroring. Ids now resolve through here, and an unknown id is
// an explicit error rather than a silent empty result.
// -----------------------------------------------------------------------------

import { BRAND_MODES } from "@/lib/taxonomy";

/** The master brand — the correct default when a caller does not choose one. */
export const DEFAULT_BRAND_MODE_ID = "bm-enterprise";

/** Legacy aliases external callers (and older briefs) still send. */
const ALIASES: Record<string, string> = {
  transperfect: DEFAULT_BRAND_MODE_ID,
  "transperfect-master": DEFAULT_BRAND_MODE_ID,
  master: DEFAULT_BRAND_MODE_ID,
  enterprise: DEFAULT_BRAND_MODE_ID,
};

/** Every valid brand mode id, for error messages and validation. */
export function brandModeIds(): string[] {
  return BRAND_MODES.map((m) => m.id);
}

/**
 * Resolve a caller-supplied brand mode id. Returns the canonical id, or null
 * when the value is not a real brand mode.
 */
export function resolveBrandModeId(input?: string | null): string | null {
  const raw = input?.trim();
  if (!raw) return DEFAULT_BRAND_MODE_ID;
  const mapped = ALIASES[raw.toLowerCase()] ?? raw;
  return brandModeIds().includes(mapped) ? mapped : null;
}
