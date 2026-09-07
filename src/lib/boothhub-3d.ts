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
  /** Where the asset stands, so the 3D build follows an edit on the plan. */
  placement?: BoothHub3dPlacement | null;
  /** Name of the saved BoothHUB build to show. Omitted = their default plan. */
  variant?: string | null;
  /**
   * A BoothHUB share token. When present the viewer loads the share link, which
   * needs no BoothHUB sign-in and no public-division switch.
   */
  shareToken?: string | null;
};



/**
 * The live state of one asset on a floor sheet: floor, position in plan metres,
 * which way it faces and its printed size. Passed to BoothHUB so the 3D build
 * matches the plan, and used as the viewer's cache key — every field that can
 * be edited on the plan is in here, so any edit re-loads the walkthrough.
 */
export type BoothHub3dPlacement = {
  floor?: string | null;
  /** Plan position in metres, origin top-left. */
  x?: number | null;
  y?: number | null;
  /** Which wall/direction the face points at. */
  face?: string | null;
  /** Trim size in mm. */
  widthMm?: number | null;
  heightMm?: number | null;
};

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Placement params, in a stable order so the same state yields the same URL. */
function placementParams(q: URLSearchParams, p?: BoothHub3dPlacement | null): void {
  if (!p) return;
  if (p.floor) q.set("floor", p.floor);
  if (Number.isFinite(p.x as number)) q.set("x", String(round2(p.x as number)));
  if (Number.isFinite(p.y as number)) q.set("y", String(round2(p.y as number)));
  if (p.face) q.set("face", p.face);
  if (Number.isFinite(p.widthMm as number)) q.set("w", String(Math.round(p.widthMm as number)));
  if (Number.isFinite(p.heightMm as number)) q.set("h", String(Math.round(p.heightMm as number)));
}

/**
 * BoothHUB shows a stand only when a saved build exists for that division and
 * plan name; otherwise it answers "Booth unavailable". Its own default plan
 * name is `default`, so we only send `variant` when a plan is named here.
 */
function baseParams(opts: BoothHub3dLinkOptions): URLSearchParams {
  const q = new URLSearchParams({ embed: "1", public: "1", presenter: "1" });
  if (opts.characters) q.set("characters", "1");
  if (opts.variant) q.set("variant", opts.variant);
  return q;
}

/**
 * A BoothHUB share link works with no sign-in at all: the token is validated by
 * a public function on their side, so an anonymous visitor (and our iframe) can
 * read the build even when the division has not been switched to public.
 * Accepts a pasted link or a bare token; returns null when neither is present.
 */
export function parseBoothHubShareToken(input?: string | null): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const fromUrl = raw.match(/booth-review\/([^/?#\s]+)/i);
  const token = fromUrl ? fromUrl[1] : raw;
  return /^[A-Za-z0-9._-]{8,}$/.test(token) ? token : null;
}

/** The share-link viewer URL — readable without a BoothHUB sign-in. */
export function boothHubShareEmbedUrl(token: string, opts?: { characters?: boolean }): string {
  const q = new URLSearchParams({ embed: "1", public: "1", presenter: "1", chromeless: "1" });
  if (opts?.characters) q.set("characters", "1");
  return `${BOOTHHUB_ORIGIN}/booth-review/${encodeURIComponent(token)}?${q.toString()}`;
}

/** Where a signed-in BoothHUB user creates that share link for a division. */
export function boothHubShareSetupUrl(division: BoothHubDivisionId): string {
  return `${BOOTHHUB_ORIGIN}/booths/${division}`;
}

/** The chromeless, sign-in-free 3D viewer URL for an iframe. */
export function boothHub3dEmbedUrl(opts: BoothHub3dLinkOptions): string {
  if (opts.shareToken) return boothHubShareEmbedUrl(opts.shareToken, opts);
  const q = baseParams(opts);
  q.set("chromeless", "1");
  if (opts.label) q.set("label", opts.label);
  if (opts.room) q.set("room", opts.room);
  placementParams(q, opts.placement);
  return `${BOOTHHUB_ORIGIN}/booths/${opts.division}/visit?${q.toString()}`;
}


/** The same build opened as a full BoothHUB page in a new tab. */
export function boothHub3dPageUrl(opts: BoothHub3dLinkOptions): string {
  const q = baseParams(opts);
  placementParams(q, opts.placement);
  return `${BOOTHHUB_ORIGIN}/booths/${opts.division}/visit?${q.toString()}`;
}

/** Where a signed-in BoothHUB user designs this division's stand build. */
export function boothHubBuilderUrl(division: BoothHubDivisionId): string {
  return `${BOOTHHUB_ORIGIN}/booths/${division}/builder`;
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
