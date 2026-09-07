// TransPerfect NEXT 2026 — NATIVE BOOTH TEMPLATES.
//
// A vendor-supplied booth wall is finished artwork: we can re-issue and reframe
// it, but nothing inside it is editable. A NATIVE template is the opposite —
// the app owns the whole wall:
//
//   • a background PLATE built from the approved style ramp as a live gradient
//     (PDF Shading Type 2/3 in the `.ai`, `linearGradient` in the `.svg`), so
//     no raster is embedded at all;
//   • editable HEADLINE, SUBHEAD, BODY and LOGO slots, all positioned from the
//     trim box, so re-issuing the booth at another stand size re-lays the copy
//     instead of stranding it;
//   • every visible mark exported as live Illustrator vector — copy is outlined
//     paths (never substitutable live text), the lockup is EPS-derived outlines,
//     the plate is a real editable gradient object.
//
// This module holds nothing but data and lookups, and deliberately imports
// nothing from the signage graph, so `next-london-signage.ts` can consult it
// while building its own booth panels.

/** The editable copy a native booth template ships with. */
export type NativeBoothTemplate = {
  /** Booth slug — the id used by LONDON_BOOTHS and the booth_templates row. */
  slug: string;
  /** Approved style ramp painted as the background plate. */
  plateStyle: string;
  /** Default headline. Empty string = no headline. */
  headline: string;
  /** Default subhead under the headline. */
  sub: string;
  /** Default body paragraph, wrapped to the live area. */
  body: string;
  /** Short human note shown in the booth template editor. */
  note: string;
};

/**
 * Native booths, keyed by slug. One pilot for now: Global Content Delivery,
 * chosen because it carries the enterprise lockup (no sub-brand mark rules to
 * negotiate) and its wall is a copy-led layout rather than a photographic one.
 */
export const NATIVE_BOOTH_TEMPLATES: NativeBoothTemplate[] = [
  {
    slug: "global-content-delivery-tradebooth-a",
    plateStyle: "01-beam-violet-aqua",
    headline: "GLOBAL CONTENT DELIVERY",
    sub: "ONE PIPELINE, EVERY MARKET",
    body:
      "Translation, review and publication in a single governed workflow — " +
      "so every market launches from the same approved source, on the same day.",
    note: "Native template: plate plus editable headline, subhead, body and logo slots.",
  },
];

const BY_SLUG = new Map(NATIVE_BOOTH_TEMPLATES.map((t) => [t.slug, t]));

/** True when this booth is built by the app rather than supplied by a vendor. */
export function isNativeBoothSlug(slug: string | null | undefined): boolean {
  return !!slug && BY_SLUG.has(slug);
}

/** The native template for a booth slug, or null for a supplied wall. */
export function nativeBoothTemplate(slug: string | null | undefined): NativeBoothTemplate | null {
  return (slug && BY_SLUG.get(slug)) || null;
}

/** The style ramp a native booth's plate is painted from. */
export function nativeBoothPlateStyle(slug: string | null | undefined): string | null {
  return nativeBoothTemplate(slug)?.plateStyle ?? null;
}
