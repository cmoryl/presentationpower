// -----------------------------------------------------------------------------
// NEXT delegate guide — the look.
//
// One place for the ground, the accent colours, the chevron device and the
// photograph library the guide draws from, so the screen proof, the press PDF
// and the deck export all read from the same numbers instead of each inventing
// their own version of the master.
//
// The values are measured from the approved "TPNEXT your guide" master: a
// violet-to-blue diagonal ground with a soft chevron watermark, a yellow date
// disc, yellow display headings, and a deep navy section for the programme
// directory.
// -----------------------------------------------------------------------------

import facade from "@/assets/london-scenes/photo-facade-evening.jpg";
import churchill from "@/assets/london-scenes/photo-churchill-stage.jpg";
import lounge from "@/assets/london-scenes/photo-lounge-panel.jpg";
import foyer from "@/assets/london-scenes/photo-exhibition-foyer.jpg";
import stand from "@/assets/london-scenes/photo-exhibition-stand.jpg";
import plenary from "@/assets/london-scenes/photo-plenary-fascia.jpg";
import cafe from "@/assets/london-scenes/photo-cafe-tabletop.jpg";
import thirdFloor from "@/assets/london-scenes/photo-thirdfloor-wall.jpg";

export const GUIDE_INK = "#03002C";
export const GUIDE_PAPER = "#FFFFFF";

/** The ground ramp, corner to corner: violet edges through a blue heart. */
export const GUIDE_GRADIENT_STOPS = ["#CE78E8", "#9B6FE2", "#3F5BCE", "#2B54C9", "#9B6FE2", "#CE78E8"];

/** Deep navy used for the programme directory spread. */
export const GUIDE_NAVY = "#002442";

export type GuideAccentId = "yellow" | "green" | "lavender" | "white";

export const GUIDE_ACCENTS: Record<GuideAccentId, { label: string; hex: string }> = {
  yellow: { label: "Yellow", hex: "#FFDE59" },
  green: { label: "Green", hex: "#A6FA87" },
  lavender: { label: "Lavender", hex: "#D6A8F0" },
  white: { label: "White", hex: "#FFFFFF" },
};

export function guideAccent(id: GuideAccentId | undefined): string {
  return GUIDE_ACCENTS[id ?? "yellow"].hex;
}

export type GuideGroundId = "gradient" | "gradient-soft" | "navy" | "paper";

export const GUIDE_GROUNDS: Record<
  GuideGroundId,
  { label: string; stops: string[]; ink: string; chevronOpacity: number }
> = {
  gradient: {
    label: "Violet to blue",
    stops: GUIDE_GRADIENT_STOPS,
    ink: "#FFFFFF",
    chevronOpacity: 0.1,
  },
  "gradient-soft": {
    label: "Violet to blue, quiet",
    stops: ["#D7A0EE", "#A98AE6", "#5C74D6", "#A98AE6", "#D7A0EE"],
    ink: "#FFFFFF",
    chevronOpacity: 0.08,
  },
  navy: { label: "Deep navy", stops: [GUIDE_NAVY, "#001A31"], ink: "#FFFFFF", chevronOpacity: 0.06 },
  paper: { label: "White paper", stops: ["#FFFFFF", "#FFFFFF"], ink: GUIDE_INK, chevronOpacity: 0.05 },
};

export function guideGround(id: GuideGroundId | undefined) {
  return GUIDE_GROUNDS[id ?? "gradient"];
}

/** CSS for the on-screen proof — the same ramp on the same diagonal. */
export function guideGroundCss(id: GuideGroundId | undefined): string {
  const g = guideGround(id);
  if (g.stops.length < 3) return g.stops[0]!;
  return `linear-gradient(142deg, ${g.stops.join(", ")})`;
}

// ── chevron device ───────────────────────────────────────────────────────────

/** One NEXT chevron in a unit box, pointing right. */
export const GUIDE_CHEVRON_D = "M0 0 L0.42 0 L1 0.5 L0.42 1 L0 1 L0.58 0.5 Z";

export type GuideChevron = { x: number; y: number; w: number; h: number; opacity: number };

/**
 * The watermark run, in fractions of the page. `cover` lays a marching band of
 * chevrons behind the lockup; `page` sets three quiet giants on the diagonal;
 * `band` runs a single pair off the right edge.
 */
export function guideChevrons(variant: "cover" | "page" | "band"): GuideChevron[] {
  if (variant === "cover") {
    const out: GuideChevron[] = [];
    for (let i = 0; i < 7; i += 1) {
      out.push({ x: -0.08 + i * 0.16, y: -0.02, w: 0.2, h: 0.36, opacity: i % 2 === 0 ? 0.16 : 0.09 });
    }
    return out;
  }
  if (variant === "band") {
    return [
      { x: 0.66, y: 0.04, w: 0.3, h: 0.5, opacity: 0.14 },
      { x: 0.82, y: 0.04, w: 0.3, h: 0.5, opacity: 0.1 },
    ];
  }
  return [
    { x: 0.1, y: 0.18, w: 0.6, h: 0.5, opacity: 0.09 },
    { x: 0.42, y: 0.46, w: 0.66, h: 0.56, opacity: 0.07 },
    { x: -0.12, y: 0.66, w: 0.5, h: 0.4, opacity: 0.06 },
  ];
}

/** The chevron unit polygon, in fractions of its own box. */
const CHEVRON_PTS: [number, number][] = [
  [0, 0],
  [0.42, 0],
  [1, 0.5],
  [0.42, 1],
  [0, 1],
  [0.58, 0.5],
];

/**
 * One chevron as absolute SVG path data inside a page of `w` by `h`, with y
 * running down the page — the form both the screen proof and the press PDF draw.
 */
export function guideChevronPathAt(c: GuideChevron, w: number, h: number): string {
  const pts = CHEVRON_PTS.map(
    ([px, py]) => `${(c.x + px * c.w) * w} ${(c.y + py * c.h) * h}`,
  );
  return `M${pts[0]} L${pts.slice(1).join(" L")} Z`;
}

// ── photograph library ───────────────────────────────────────────────────────

export type GuideImage = { id: string; label: string; url: string; note: string };

export const GUIDE_IMAGES: GuideImage[] = [
  { id: "facade", label: "Venue at dusk", url: facade, note: "Cover band and section openers." },
  { id: "plenary", label: "Plenary stage", url: plenary, note: "Keynote pages." },
  { id: "churchill", label: "Innovation Lounge", url: churchill, note: "What's on." },
  { id: "lounge", label: "Lounge panel", url: lounge, note: "Product and demo pages." },
  { id: "foyer", label: "Exhibition foyer", url: foyer, note: "Exhibits and directory." },
  { id: "stand", label: "Exhibition stand", url: stand, note: "Exhibits." },
  { id: "cafe", label: "Cafe tabletop", url: cafe, note: "Practical information." },
  { id: "third-floor", label: "Third floor wall", url: thirdFloor, note: "Floor directory." },
];

export function guideImage(id: string | undefined): GuideImage | null {
  if (!id) return null;
  return GUIDE_IMAGES.find((i) => i.id === id) ?? null;
}

/** Provenance line the builders repeat. */
export const GUIDE_LOOK_NOTE =
  "Ground, chevrons, discs, panels and every word are live vector on the page; photographs are the only placed images.";
