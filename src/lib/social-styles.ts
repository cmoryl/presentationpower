// Social template styles.
//
// A "style" is a presentation-only skin applied on top of the existing
// format/aspect presets in SocialRenderer. Formats decide geometry (what size
// the frame is and how big type gets); styles decide *look* — how the copy
// plate is treated, where the lockup sits, how the headline is set, and what
// the CTA looks like. Same copy + same format + different style = a visibly
// different template, with zero changes to the campaign pipeline.
//
// Adding a style costs one entry here; the renderer reads the tokens.

export type SocialStyleId =
  | "editorial-glass"
  | "bold-block"
  | "split-band"
  | "minimal-rule"
  | "poster-stack"
  | "photo-gradient"
  | "aura-soft";

export type SocialStyle = {
  id: SocialStyleId;
  label: string;
  tag: string;
  blurb: string;
  /** Where the copy stack anchors vertically. */
  copyAlign: "start" | "end";
  /** Treatment behind the copy when a photo is present. */
  plate: "glass" | "solid" | "band" | "none" | "aura";
  /** Plate corner radius as a fraction of the short edge (0 = full bleed band). */
  plateRadiusPct: number;
  /** Plate runs edge-to-edge horizontally. */
  plateFullBleed: boolean;
  /** Vertical accent rule to the left of the copy stack. */
  accentRule: boolean;
  /** Headline tuning, relative to the format preset. */
  titleScale: number;
  titleWeight: number;
  titleTracking: string;
  titleUppercase: boolean;
  /** Eyebrow treatment. */
  eyebrow: "caps-track" | "pill" | "hidden";
  /** CTA treatment. */
  cta: "pill" | "block" | "underline";
  /** Lockup corner. */
  lockup: "top-right" | "top-left" | "bottom-right";
  /** Photo focal bias — keeps the subject out of the copy zone. */
  photoFocus: "top" | "center" | "bottom";
  /** Scrim strength multiplier applied to the caller's imageScrimPct. */
  scrimMultiplier: number;
};

export const SOCIAL_STYLES: SocialStyle[] = [
  {
    id: "editorial-glass",
    label: "Editorial Glass",
    tag: "Default",
    blurb:
      "Almost-clear glass band across the base of the frame. Photography stays visible through the copy; blur and text shadow carry legibility.",
    copyAlign: "end",
    plate: "glass",
    plateRadiusPct: 0,
    plateFullBleed: true,
    accentRule: false,
    titleScale: 1,
    titleWeight: 700,
    titleTracking: "-0.03em",
    titleUppercase: false,
    eyebrow: "caps-track",
    cta: "pill",
    lockup: "top-right",
    photoFocus: "top",
    scrimMultiplier: 1,
  },
  {
    id: "bold-block",
    label: "Bold Block",
    tag: "High contrast",
    blurb:
      "Solid brand-ink block under the headline for maximum contrast in busy feeds. Tightest, heaviest headline setting.",
    copyAlign: "end",
    plate: "solid",
    plateRadiusPct: 2.5,
    plateFullBleed: false,
    accentRule: false,
    titleScale: 1.08,
    titleWeight: 800,
    titleTracking: "-0.045em",
    titleUppercase: false,
    eyebrow: "pill",
    cta: "block",
    lockup: "top-right",
    photoFocus: "top",
    scrimMultiplier: 0.7,
  },
  {
    id: "split-band",
    label: "Split Band",
    tag: "Announcement",
    blurb:
      "Copy anchored to the top on a full-bleed band, imagery running free below. Reads as a masthead — good for dates, launches, and save-the-dates.",
    copyAlign: "start",
    plate: "band",
    plateRadiusPct: 0,
    plateFullBleed: true,
    accentRule: true,
    titleScale: 0.94,
    titleWeight: 700,
    titleTracking: "-0.02em",
    titleUppercase: false,
    eyebrow: "caps-track",
    cta: "pill",
    lockup: "bottom-right",
    photoFocus: "bottom",
    scrimMultiplier: 1,
  },
  {
    id: "minimal-rule",
    label: "Minimal Rule",
    tag: "Quiet",
    blurb:
      "No plate at all — just a thin accent rule and a stronger scrim. The most photography-forward option; best on clean, low-detail imagery.",
    copyAlign: "end",
    plate: "none",
    plateRadiusPct: 0,
    plateFullBleed: false,
    accentRule: true,
    titleScale: 0.96,
    titleWeight: 600,
    titleTracking: "-0.02em",
    titleUppercase: false,
    eyebrow: "caps-track",
    cta: "underline",
    lockup: "top-right",
    photoFocus: "top",
    scrimMultiplier: 1.35,
  },
  {
    id: "poster-stack",
    label: "Poster Stack",
    tag: "Event",
    blurb:
      "Uppercase poster headline on a rounded glass card, lockup top-left. Built for event kits and stage-style hero moments.",
    copyAlign: "end",
    plate: "glass",
    plateRadiusPct: 3.5,
    plateFullBleed: false,
    accentRule: false,
    titleScale: 0.86,
    titleWeight: 800,
    titleTracking: "0.01em",
    titleUppercase: true,
    eyebrow: "pill",
    cta: "pill",
    lockup: "top-left",
    photoFocus: "top",
    scrimMultiplier: 1.1,
  },
  {
    id: "photo-gradient",
    label: "Photo Gradient",
    tag: "Full bleed",
    blurb:
      "No plate, no rule — the photo runs edge to edge and a deep brand gradient rising from the bottom does all the offsetting. Most photo-forward option.",
    copyAlign: "end",
    plate: "none",
    plateRadiusPct: 0,
    plateFullBleed: true,
    accentRule: false,
    titleScale: 1.02,
    titleWeight: 700,
    titleTracking: "-0.035em",
    titleUppercase: false,
    eyebrow: "caps-track",
    cta: "pill",
    lockup: "top-right",
    photoFocus: "top",
    scrimMultiplier: 1.6,
  },
  {
    id: "aura-soft",
    label: "Aura Soft Focus",
    tag: "Division accent",
    blurb:
      "Our aura treatment: a feathered soft-focus bloom behind the copy, tinted with the division's accent colour. No panel edges — the photo blurs away under the text and the accent glow keeps the type separated from the image.",
    copyAlign: "end",
    plate: "aura",
    plateRadiusPct: 0,
    plateFullBleed: true,
    accentRule: false,
    titleScale: 1.02,
    titleWeight: 700,
    titleTracking: "-0.032em",
    titleUppercase: false,
    eyebrow: "caps-track",
    cta: "pill",
    lockup: "top-right",
    photoFocus: "top",
    scrimMultiplier: 0.85,
  },
];

export const DEFAULT_SOCIAL_STYLE_ID: SocialStyleId = "editorial-glass";

export const SOCIAL_STYLES_BY_ID: Record<SocialStyleId, SocialStyle> = Object.fromEntries(
  SOCIAL_STYLES.map((s) => [s.id, s]),
) as Record<SocialStyleId, SocialStyle>;

export function resolveSocialStyle(id?: string): SocialStyle {
  return (
    (id ? SOCIAL_STYLES_BY_ID[id as SocialStyleId] : undefined) ??
    SOCIAL_STYLES_BY_ID[DEFAULT_SOCIAL_STYLE_ID]
  );
}
