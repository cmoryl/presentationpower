// BoothHUB — 3D viewer link-out for London scenic builds and signage pins.
//
// BoothHUB (another app in the workspace) renders TransPerfect stand builds in
// 3D. Two of its routes are deliberately embeddable without a sign-in, guarded
// by BOTH `embed=1` and `public=1`:
//
//   /booths/:divisionId/visit          — walk a division's stand build
//   /events/:eventId/viewer            — the full hall viewer (event-scoped)
//
// The hall viewer needs a BoothHUB event id we do not hold here, so the London
// plans link the division walkthrough, which is the read-only 3D build for the
// division that owns the asset. Extra params (`presenter`, `chromeless`) strip
// the app chrome and editor affordances so the iframe is viewer-only.

export const BOOTHHUB_ORIGIN = "https://boothhub.lovable.app";

/** Division ids as BoothHUB defines them (src/data/boothDivisions.ts there). */
export type BoothHubDivisionId =
  | "corporate"
  | "life-sciences"
  | "legal"
  | "ip"
  | "digital"
  | "media"
  | "games"
  | "live"
  | "health"
  | "dataforce"
  | "trial-interactive"
  | "g3";

/**
 * Match a London asset's own words to a BoothHUB division. Ordered: the first
 * pattern that hits wins, so narrower brands sit above broader ones.
 */
const DIVISION_RULES: { id: BoothHubDivisionId; test: RegExp }[] = [
  { id: "trial-interactive", test: /trial\s*interactive|\bti\b/i },
  { id: "dataforce", test: /dataforce|data\s*force/i },
  { id: "life-sciences", test: /life\s*sci|clinical|pharma|medical\s*writing|\bcoa\b|regulatory/i },
  { id: "legal", test: /legal|litigation|deposition|e-?discovery/i },
  { id: "ip", test: /\bip\b|patent|trademark/i },
  { id: "games", test: /games?|gaming|player/i },
  { id: "media", test: /media|dubbing|subtitl|localiz\w+\s*media|studio/i },
  { id: "live", test: /globallink\s*live|interpret|live\b|conference/i },
  { id: "health", test: /health|patient|payer/i },
  { id: "digital", test: /digital|website|\bseo\b|commerce|marketing|commercial/i },
  { id: "g3", test: /\bg3\b|translations?\.com/i },
];

/** Which BoothHUB division build best represents this London asset. */
export function boothHubDivisionFor(input: {
  name?: string | null;
  room?: string | null;
  ground?: string | null;
}): BoothHubDivisionId {
  const text = `${input.name ?? ""} ${input.room ?? ""} ${input.ground ?? ""}`;
  for (const rule of DIVISION_RULES) if (rule.test.test(text)) return rule.id;
  return "corporate";
}

export type BoothHub3dLinkOptions = {
  division: BoothHubDivisionId;
  /** Asset label carried through so the viewer can caption the build. */
  label?: string | null;
  /** Venue room the asset stands in. */
  room?: string | null;
  /** Load BoothHUB's photoreal figures for scale. Off by default (heavier). */
  characters?: boolean;
};

/** The chromeless, sign-in-free 3D viewer URL for an iframe. */
export function boothHub3dEmbedUrl(opts: BoothHub3dLinkOptions): string {
  const q = new URLSearchParams({
    embed: "1",
    public: "1",
    presenter: "1",
    chromeless: "1",
  });
  if (opts.characters) q.set("characters", "1");
  if (opts.label) q.set("label", opts.label);
  if (opts.room) q.set("room", opts.room);
  return `${BOOTHHUB_ORIGIN}/booths/${opts.division}/visit?${q.toString()}`;
}

/** The same build opened as a full BoothHUB page in a new tab. */
export function boothHub3dPageUrl(opts: BoothHub3dLinkOptions): string {
  const q = new URLSearchParams({ embed: "1", public: "1", presenter: "1" });
  if (opts.characters) q.set("characters", "1");
  return `${BOOTHHUB_ORIGIN}/booths/${opts.division}/visit?${q.toString()}`;
}

export const BOOTHHUB_DIVISION_LABEL: Record<BoothHubDivisionId, string> = {
  corporate: "TransPerfect corporate",
  "life-sciences": "Life Sciences",
  legal: "Legal",
  ip: "IP / Patents",
  digital: "Digital",
  media: "Media",
  games: "Games",
  live: "GlobalLink Live",
  health: "Health",
  dataforce: "DataForce",
  "trial-interactive": "Trial Interactive",
  g3: "G3 / Translations.com",
};
