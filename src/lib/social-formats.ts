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
  | "tiktok"
  | "threads"
  | "bluesky"
  | "snapchat"
  | "whatsapp"
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
  /** Per-format layout tuning. The renderer starts from the aspect-class
   *  preset and merges this on top, so a TikTok frame and an IG Reel frame can
   *  share a class but still size type and imagery for their own chrome. */
  tune?: FormatTune;
};

/** Overrides merged over the aspect-class preset by the renderers. All values
 *  except imageLayout/titleLines/copyScaleMul are % of the frame's short edge. */
export type FormatTune = {
  padPct?: number;
  eyebrowPct?: number;
  titlePct?: number;
  summaryPct?: number;
  ctaPct?: number;
  align?: "start" | "end";
  showSummary?: boolean;
  lockupSize?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
  /** Max headline lines before clamping. */
  titleLines?: number;
  /** Extra multiplier on the whole copy stack (1 = unchanged). */
  copyScaleMul?: number;
  /** Preferred imagery composition when the caller doesn't force one. */
  imageLayout?: "bleed" | "panel";
  /** Vertical crop focus for full-bleed photography, 0..100. */
  focalYPct?: number;

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

  // ── Instagram ─────────────────────────────────────────────────────────────
  fmt({
    id: "instagram-reel-1080x1920",
    label: "Instagram Reel",
    platform: "instagram",
    category: "social",
    width: 1080,
    height: 1920,
    safeArea: { top: 0.13, bottom: 0.24, right: 0.14 },
    intent: "Reel cover — right rail and bottom caption band reserved.",
    tune: { titlePct: 7, summaryPct: 3, titleLines: 3, lockupSize: "sm", focalYPct: 28 },
  }),
  fmt({
    id: "instagram-carousel-1080x1350",
    label: "Instagram carousel card",
    platform: "instagram",
    category: "social",
    width: 1080,
    height: 1350,
    safeArea: { bottom: 0.05 },
    intent: "One card in a swipe set — single idea, generous type.",
    tune: { titlePct: 8.6, titleLines: 4, imageLayout: "panel" },
  }),

  // ── TikTok ────────────────────────────────────────────────────────────────
  fmt({
    id: "tiktok-1080x1920",
    label: "TikTok post",
    platform: "tiktok",
    category: "social",
    width: 1080,
    height: 1920,
    // TikTok chrome is heavier: caption stack bottom-left, action rail right.
    safeArea: { top: 0.1, bottom: 0.27, right: 0.16 },
    intent: "Vertical video frame — keep type clear of the action rail.",
    tune: { padPct: 7.5, titlePct: 7.2, summaryPct: 3, titleLines: 3, focalYPct: 26 },
  }),
  fmt({
    id: "tiktok-cover-1080x1440",
    label: "TikTok profile cover",
    platform: "tiktok",
    category: "social",
    width: 1080,
    height: 1440,
    safeArea: { bottom: 0.16 },
    intent: "Grid thumbnail — centre-weighted, one short clause.",
    tune: { titlePct: 8.4, showSummary: false, titleLines: 3 },
  }),

  // ── YouTube ───────────────────────────────────────────────────────────────
  fmt({
    id: "youtube-short-1080x1920",
    label: "YouTube Short",
    platform: "youtube",
    category: "social",
    width: 1080,
    height: 1920,
    safeArea: { top: 0.09, bottom: 0.22, right: 0.13 },
    intent: "Shorts frame — headline high, subject low.",
    tune: { titlePct: 7.2, titleLines: 3, focalYPct: 30 },
  }),
  fmt({
    id: "youtube-banner-2560x1440",
    label: "YouTube channel art",
    platform: "youtube",
    category: "social",
    width: 2560,
    height: 1440,
    // Only the central 1546×423 is guaranteed visible on every device.
    safeArea: { top: 0.353, bottom: 0.353, left: 0.198, right: 0.198 },
    intent: "Channel banner — everything inside the TV-safe centre band.",
    tune: { titlePct: 5.4, summaryPct: 2.2, showSummary: false, lockupSize: "sm", titleLines: 2 },
  }),

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  fmt({
    id: "linkedin-portrait-1080x1350",
    label: "LinkedIn portrait post",
    platform: "linkedin",
    category: "social",
    width: 1080,
    height: 1350,
    intent: "Document-style portrait post — proof point per frame.",
    tune: { titlePct: 8.2, imageLayout: "panel" },
  }),
  fmt({
    id: "linkedin-banner-1584x396",
    label: "LinkedIn profile banner",
    platform: "linkedin",
    category: "social",
    width: 1584,
    height: 396,
    safeArea: { left: 0.14, bottom: 0.08 },
    intent: "Ultra-wide banner — avatar overlaps lower left.",
    tune: {
      padPct: 4.5,
      titlePct: 11,
      showSummary: false,
      titleLines: 2,
      lockupSize: "xs",
      copyScaleMul: 0.92,
    },
  }),
  fmt({
    id: "linkedin-company-1128x191",
    label: "LinkedIn company cover",
    platform: "linkedin",
    category: "social",
    width: 1128,
    height: 191,
    safeArea: { left: 0.06, right: 0.06 },
    intent: "Very short strip — lockup plus one clause only.",
    tune: {
      padPct: 4,
      titlePct: 13,
      showSummary: false,
      titleLines: 1,
      lockupSize: "2xs",
      copyScaleMul: 0.88,
    },
  }),

  // ── Facebook ──────────────────────────────────────────────────────────────
  fmt({
    id: "facebook-post-1200x1500",
    label: "Facebook feed post",
    platform: "facebook",
    category: "social",
    width: 1200,
    height: 1500,
    intent: "Portrait feed post — headline + supporting line.",
    tune: { titlePct: 8.2 },
  }),
  fmt({
    id: "facebook-story-1080x1920",
    label: "Facebook story",
    platform: "facebook",
    category: "social",
    width: 1080,
    height: 1920,
    safeArea: { top: 0.14, bottom: 0.2 },
    intent: "Vertical story — same chrome budget as IG stories.",
    tune: { titlePct: 7.4, titleLines: 3, focalYPct: 27 },
  }),
  fmt({
    id: "facebook-cover-1640x624",
    label: "Facebook page cover",
    platform: "facebook",
    category: "social",
    width: 1640,
    height: 624,
    safeArea: { bottom: 0.12, left: 0.08, right: 0.08 },
    intent: "Wide cover — crops hard on mobile, so centre the message.",
    tune: { titlePct: 9.4, showSummary: false, titleLines: 2, lockupSize: "sm" },
  }),

  // ── X / Twitter ───────────────────────────────────────────────────────────
  fmt({
    id: "x-post-1080x1350",
    label: "X portrait post",
    platform: "x",
    category: "social",
    width: 1080,
    height: 1350,
    intent: "Tall in-timeline post — reads before the crop.",
    tune: { titlePct: 8.2, imageLayout: "panel" },
  }),
  fmt({
    id: "x-header-1500x500",
    label: "X profile header",
    platform: "x",
    category: "social",
    width: 1500,
    height: 500,
    safeArea: { left: 0.12, bottom: 0.14 },
    intent: "Header strip — avatar overlaps lower left.",
    tune: { padPct: 4.5, titlePct: 10.5, showSummary: false, titleLines: 2, lockupSize: "xs" },
  }),

  // ── Threads / Bluesky / Pinterest / Snapchat / WhatsApp ───────────────────
  fmt({
    id: "threads-1080x1350",
    label: "Threads post",
    platform: "threads",
    category: "social",
    width: 1080,
    height: 1350,
    intent: "Conversational portrait post — light, typographic.",
    tune: { titlePct: 8.4 },
  }),
  fmt({
    id: "bluesky-1200x675",
    label: "Bluesky card",
    platform: "bluesky",
    category: "social",
    width: 1200,
    height: 675,
    intent: "16:9 link card — headline dominant.",
    tune: { titlePct: 9.2, titleLines: 2 },
  }),
  fmt({
    id: "pinterest-square-1000x1000",
    label: "Pinterest square pin",
    platform: "pinterest",
    category: "social",
    width: 1000,
    height: 1000,
    intent: "Square pin — recipe-card clarity.",
    tune: { titlePct: 8.6, imageLayout: "panel" },
  }),
  fmt({
    id: "snapchat-1080x1920",
    label: "Snapchat / vertical ad",
    platform: "snapchat",
    category: "social",
    width: 1080,
    height: 1920,
    safeArea: { top: 0.16, bottom: 0.22 },
    intent: "Vertical ad — heavy top/bottom chrome, one message.",
    tune: { titlePct: 7.2, showSummary: false, titleLines: 3, focalYPct: 30 },
  }),
  fmt({
    id: "whatsapp-status-1080x1920",
    label: "WhatsApp status",
    platform: "whatsapp",
    category: "social",
    width: 1080,
    height: 1920,
    safeArea: { top: 0.12, bottom: 0.18 },
    intent: "Status card — short clause, high contrast.",
    tune: { titlePct: 7.6, showSummary: false, titleLines: 3 },
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

// ────────────────────────────────────────────────────────────────────────────
// Kit profiles — named bundles of formats so users don't tick 20 checkboxes.
// Each profile is a starting set; the builder lets users add/remove after.
// ────────────────────────────────────────────────────────────────────────────
export type KitProfile = {
  id: string;
  label: string;
  description: string;
  formatIds: string[];
};

export const KIT_PROFILES: KitProfile[] = [
  {
    id: "social-essentials",
    label: "Social essentials",
    description: "Feed-ready core: square, portrait, story, LinkedIn link.",
    formatIds: ["square-1080", "portrait-1080x1350", "story-1080x1920", "linkedin-link-1200x627"],
  },
  {
    id: "full-launch",
    label: "Full social launch",
    description: "Every social geometry, both feed and story surfaces.",
    formatIds: [
      "square-1080",
      "portrait-1080x1350",
      "story-1080x1920",
      "linkedin-link-1200x627",
      "linkedin-post-1200x1200",
      "x-1600x900",
      "youtube-1280x720",
      "pinterest-1000x1500",
    ],
  },
  {
    id: "email-set",
    label: "Email set",
    description: "Wide banner + link previews for email + landing pages.",
    formatIds: ["email-header-1200x400", "linkedin-link-1200x627", "callout-1200x628"],
  },
  {
    id: "event-kit",
    label: "Event kit",
    description: "Kit-numbered callouts + LinkedIn + story for an event push.",
    formatIds: ["callout-1200x628", "linkedin-post-1200x1200", "story-1080x1920", "square-1080"],
  },
  {
    id: "vertical-video",
    label: "Vertical video set",
    description: "Every 9:16 surface: Reels, TikTok, Shorts, stories, status.",
    formatIds: [
      "instagram-reel-1080x1920",
      "tiktok-1080x1920",
      "youtube-short-1080x1920",
      "facebook-story-1080x1920",
      "snapchat-1080x1920",
      "whatsapp-status-1080x1920",
    ],
  },
  {
    id: "profile-banners",
    label: "Profile banners",
    description: "Channel and profile headers with their safe-centre bands.",
    formatIds: [
      "linkedin-banner-1584x396",
      "linkedin-company-1128x191",
      "x-header-1500x500",
      "facebook-cover-1640x624",
      "youtube-banner-2560x1440",
    ],
  },
  {
    id: "every-platform",
    label: "Every platform",
    description: "One asset per supported platform, correctly sized.",
    formatIds: [
      "square-1080",
      "instagram-carousel-1080x1350",
      "instagram-reel-1080x1920",
      "tiktok-1080x1920",
      "youtube-short-1080x1920",
      "youtube-1280x720",
      "linkedin-portrait-1080x1350",
      "linkedin-link-1200x627",
      "facebook-post-1200x1500",
      "x-post-1080x1350",
      "threads-1080x1350",
      "bluesky-1200x675",
      "pinterest-1000x1500",
      "snapchat-1080x1920",
    ],
  },
];

export const KIT_PROFILES_BY_ID: Record<string, KitProfile> = Object.fromEntries(
  KIT_PROFILES.map((k) => [k.id, k]),
);

export const PLATFORM_LABELS: Record<FormatPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  x: "X",
  threads: "Threads",
  bluesky: "Bluesky",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  whatsapp: "WhatsApp",
  email: "Email",
  signage: "Signage",
  generic: "Generic",
};

export function formatsForPlatform(platform: FormatPlatform): SocialFormat[] {
  return SOCIAL_FORMATS.filter((f) => f.platform === platform);
}

