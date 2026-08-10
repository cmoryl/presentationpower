import { enterpriseGroundFor } from "@/lib/enterprise-grounds";
import type { BrandMode } from "@/lib/taxonomy";

/**
 * Slide skins — a deck-wide "look and feel" switch that sits ON TOP of the
 * brand mode. The brand mode decides *whose* deck this is (Corporate, Legal,
 * Media, Gaming…); the skin decides *how* it is dressed.
 *
 *  • "flagship"         — the existing 2026 aurora/glass system (dark-leaning,
 *                         photographic backdrops, curated gradient stills).
 *  • "enterprise-white" — the master enterprise white template distilled from
 *                         the approved Demo v4 PowerPoint: near-white page,
 *                         soft pastel corner washes, navy ink, light-weight
 *                         editorial headline, thin accent rule, quiet white
 *                         cards with a hairline aqua top edge, hairline footer
 *                         with module label + page number.
 *
 * The skin is stored on the deck (`deck.context.skin`) and can be overridden
 * per slide (`slide.skin`). Every rendering surface (editor, present, share,
 * print, export, library preview) resolves it through SlideSkinContext so a
 * deck always looks identical everywhere.
 */
export type SlideSkin = "flagship" | "enterprise-white";

export const DEFAULT_SLIDE_SKIN: SlideSkin = "flagship";

export const SLIDE_SKIN_OPTIONS: Array<{
  id: SlideSkin;
  label: string;
  description: string;
}> = [
  {
    id: "flagship",
    label: "Flagship 2026",
    description: "Aurora + glass system with photographic and gradient backdrops.",
  },
  {
    id: "enterprise-white",
    label: "Enterprise White",
    description: "Master enterprise template — white page, navy ink, soft pastel wash.",
  },
];

/** Canonical palette for the Enterprise White master template. */
export const ENTERPRISE_WHITE = {
  /** Page field. */
  surface: "#FFFFFF",
  /** Primary reading ink (deck navy from the master theme). */
  ink: "#0B163F",
  /** Secondary ink for eyebrows, meta and supporting copy. */
  inkMuted: "#4C5A80",
  /** Tertiary ink for footers/captions. */
  inkFaint: "#8593B5",
  /** Action blue. */
  primary: "#0150EF",
  /** Signature accent — aqua hairlines and card top edges. */
  accent: "#5CE1E6",
  /** Secondary accent used in the pastel wash. */
  accentAlt: "#C2A3FF",
  /** Hairline rules. */
  hairline: "rgba(11, 22, 63, 0.12)",
  /** Card fill. */
  card: "rgba(255, 255, 255, 0.86)",
} as const;

export function isEnterpriseWhite(skin: SlideSkin | undefined | null): boolean {
  return skin === "enterprise-white";
}

/**
 * Re-tokens a brand for the Enterprise White skin. The division's own accent
 * is preserved (so Legal gold / Media magenta still signs the page) but the
 * page field, ink and primary snap to the master enterprise values so every
 * variant reads as one template.
 */
export function enterpriseWhiteBrand(brand: BrandMode): BrandMode {
  return {
    ...brand,
    tokens: {
      ...brand.tokens,
      primary: ENTERPRISE_WHITE.primary,
      accent: brand.tokens.accent || ENTERPRISE_WHITE.accent,
      surface: ENTERPRISE_WHITE.surface,
      ink: ENTERPRISE_WHITE.ink,
    },
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The Enterprise White ground.
 *
 * Superseded by the saved ground SET in `@/lib/enterprise-grounds`, which picks
 * a composition-aware recipe per module layout (rule-of-thirds clear zones,
 * media halos for imagery slides). This entry point is kept so any caller that
 * only knows a seed still gets the right ground; it simply delegates.
 */
export function enterpriseWhiteGround(seed: string, accentHex?: string): string {
  return enterpriseGroundFor(seed, accentHex);
}


