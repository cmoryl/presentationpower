// Social & event format registry.
//
// A single typed table of output geometries so renderers, exporters, and UI
// pickers all agree. New formats can be added here without touching any
// renderer — the SocialRenderer adapts to whatever aspect the format
// declares. Kit-numbered items (03, 04, 29, etc.) map to the NEXT event kit
// referenced in the brief; generic social/link/story formats cover
// everything else.
//
// SAFE-AREA inset semantics: fraction of the frame (0..1) that renderers
// should treat as reserved for platform UI (feed chrome, captions, etc.).
// Renderers keep the primary headline and lockup inside the safe rect.

export type FormatCategory = "social" | "email" | "signage" | "screen" | "kit";
export type FormatPlatform =
  | "instagram"
  | "linkedin"
  | "facebook"
  | "x"
  | "youtube"
  | "pinterest"
  | "email"
  | "generic"
  | "signage";

export type SafeArea = {
  /** Fraction of width (0..1) reserved on the left. */
  left?: number;
  /** Fraction of width (0..1) reserved on the right. */
  right?: number;
  /** Fraction of height (0..1) reserved on the top. */
  top?: number;
  /** Fraction of height (0..1) reserved on the bottom. */
  bottom?: number;
};

export type SocialFormat = {
  id: string;
  label: string;
  platform: FormatPlatform;
  category: FormatCategory;
  width: number;
  height: number;
  /** Convenience — width / height. */
  aspect: number;
  /** Optional kit item number from the NEXT event asset kit (e.g. "03"). */
  kitId?: string;
  safeArea?: SafeArea;
  /** Short design intent so the renderer / picker can hint layout. */
  intent?: string;
};

function fmt(f: Omit<SocialFormat, "aspect">): SocialFormat {
  return { ...f, aspect: f.width / f.height };
}

// Ordered by visual grouping — square first, then portrait, then landscape.
// Additions welcome; keep ids stable, they're the storage key for
// CampaignAsset.formatId.
export const SOCIAL_FORMATS: SocialFormat[] = [
  fmt({
    id: "square-1080",
    label: "Square post",
    platform: "instagram",
    category: "social",
    width: 1080,
    height: 1080,
    kitId: "03",
    intent: "Feed-first square post, works on IG, LinkedIn, X.",
  }),
  fmt({
    id: "portrait-1080x1350",
    label: "Portrait post",
    platform: "instagram",
    category: "social",
    width: 1080,
    height: 1350,
    intent: "IG/LinkedIn portrait — max feed real estate.",
    safeArea: { top: 0.06, bottom: 0.06 },
  }),
  fmt({
    id: "story-1080x1920",
    label: "Story / Reel",
    platform: "instagram",
    category: "social",
    width: 1080,
    height: 1920,
    // Story chrome ~14% top, ~20% bottom on IG. Renderer respects this.
    safeArea: { top: 0.14, bottom: 0.2 },
    intent: "Vertical story — reserve top/bottom for platform chrome.",
  }),
  fmt({
    id: "linkedin-link-1200x627",
    label: "LinkedIn / FB link",
    platform: "linkedin",
    category: "social",
    width: 1200,
    height: 627,
    kitId: "04",
    intent: "Link preview card — headline dominant, minimal detail.",
  }),
  fmt({
    id: "linkedin-post-1200x1200",
    label: "LinkedIn square post",
    platform: "linkedin",
    category: "social",
    width: 1200,
    height: 1200,
    kitId: "05",
    intent: "Feed post — white/light variant reads well in-feed.",
  }),
  fmt({
    id: "callout-1200x628",
    label: "Callout (1200×628)",
    platform: "generic",
    category: "kit",
    width: 1200,
    height: 628,
    kitId: "29",
    intent: "Landscape callout — kit items 29/30.",
  }),
  fmt({
    id: "x-1600x900",
    label: "X / Twitter card",
    platform: "x",
    category: "social",
    width: 1600,
    height: 900,
    intent: "Extreme landscape — headline single-line preferred.",
  }),
  fmt({
    id: "youtube-1280x720",
    label: "YouTube thumbnail",
    platform: "youtube",
    category: "social",
    width: 1280,
    height: 720,
    intent: "Bold single-clause title, high-contrast face/subject on right.",
  }),
  fmt({
    id: "pinterest-1000x1500",
    label: "Pinterest pin",
    platform: "pinterest",
    category: "social",
    width: 1000,
    height: 1500,
    intent: "Tall portrait — stack of headline + supporting line.",
  }),
  fmt({
    id: "email-header-1200x400",
    label: "Email header",
    platform: "email",
    category: "email",
    width: 1200,
    height: 400,
    intent: "Wide, short banner — lockup left, date/venue right.",
  }),
];

export const SOCIAL_FORMATS_BY_ID: Record<string, SocialFormat> = Object.fromEntries(
  SOCIAL_FORMATS.map((f) => [f.id, f]),
);

export function getFormat(id: string): SocialFormat | undefined {
  return SOCIAL_FORMATS_BY_ID[id];
}

/** Rough shape class used by renderers to pick a layout preset. */
export type AspectClass = "landscape-wide" | "landscape" | "square" | "portrait" | "portrait-tall";

export function aspectClass(f: SocialFormat): AspectClass {
  const a = f.aspect;
  if (a >= 2.2) return "landscape-wide"; // 1200×400, 1600×900-adjacent
  if (a >= 1.3) return "landscape";
  if (a >= 0.9) return "square";
  if (a >= 0.65) return "portrait";
  return "portrait-tall"; // stories, 1080×1920
}
