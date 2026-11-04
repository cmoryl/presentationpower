// San Juan Bowl social templates — data for the live template studio at
// /events/san-juan-bowl/social. Template copy defaults come only from
// SJB_EVENT (announced facts); nothing here invents a date, team or figure.

import { SJB_COLORS, SJB_EVENT } from "@/lib/san-juan-bowl";

const hex = (id: string) => SJB_COLORS.find((c) => c.id === id)!.hex;

export const SJB_SOCIAL_COLORS = {
  navy: hex("navy"),
  sky: hex("sky"),
  gold: hex("gold"),
  white: hex("white"),
} as const;

/** Native export sizes — every download renders at exactly these pixels. */
export interface SjbSocialFormat {
  id: string;
  label: string;
  channel: string;
  width: number;
  height: number;
}

export const SJB_SOCIAL_FORMATS: readonly SjbSocialFormat[] = [
  { id: "square", label: "Square post", channel: "Instagram / Facebook", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait post", channel: "Instagram feed", width: 1080, height: 1350 },
  { id: "story", label: "Story", channel: "Instagram / Facebook / Reels cover", width: 1080, height: 1920 },
  { id: "wide", label: "Wide post", channel: "X / LinkedIn", width: 1600, height: 900 },
  { id: "link", label: "Link share", channel: "Facebook / LinkedIn link card", width: 1200, height: 628 },
] as const;

export const SJB_SOCIAL_FORMATS_BY_ID: Record<string, SjbSocialFormat> = Object.fromEntries(
  SJB_SOCIAL_FORMATS.map((f) => [f.id, f]),
);

/** Editable copy fields. `key` indexes the copy record on the studio page. */
export interface SjbCopyField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

export interface SjbSocialTemplate {
  id: string;
  name: string;
  blurb: string;
  fields: readonly SjbCopyField[];
  /** Default copy, drawn from announced event facts only. */
  defaults: Record<string, string>;
  /** Editable Canva version of this template (shared team account). */
  canvaUrl: string;
}

export const SJB_SOCIAL_TEMPLATES: readonly SjbSocialTemplate[] = [
  {
    id: "game-day",
    name: "Game day",
    blurb: "Badge up top, big headline, date and venue line under a gold rule.",
    fields: [
      { key: "headline", label: "Headline" },
      { key: "subline", label: "Subline" },
      { key: "detail", label: "Detail line" },
    ],
    defaults: {
      headline: "Game day in San Juan",
      subline: SJB_EVENT.matchupLabel,
      detail: `${SJB_EVENT.datesLabel} · ${SJB_EVENT.venue}`,
    },
    canvaUrl: "https://canva.link/oev1vx7l4j79t64",
  },
  {
    id: "matchup",
    name: "Matchup",
    blurb: "The conference matchup either side of the badge.",
    fields: [
      { key: "teamA", label: "Side A" },
      { key: "teamB", label: "Side B" },
      { key: "detail", label: "Detail line" },
    ],
    defaults: {
      teamA: "ACC",
      teamB: "Sun Belt",
      detail: `${SJB_EVENT.datesLabel} · ${SJB_EVENT.kickoffLabel}`,
    },
    canvaUrl: "https://canva.link/etpyb40pqj7blhw",
  },
  {
    id: "countdown",
    name: "Countdown",
    blurb: "A big number counting down to kickoff.",
    fields: [
      { key: "number", label: "Number", placeholder: "30" },
      { key: "label", label: "Label" },
      { key: "detail", label: "Detail line" },
    ],
    defaults: {
      number: "30",
      label: "days to kickoff",
      detail: `${SJB_EVENT.datesLabel} · ${SJB_EVENT.venue}`,
    },
    canvaUrl: "https://canva.link/lzft6d2f35rdh5d",
  },
  {
    id: "final-score",
    name: "Final score",
    blurb: "Two score blocks with the badge between them.",
    fields: [
      { key: "teamA", label: "Side A" },
      { key: "scoreA", label: "Score A", placeholder: "0" },
      { key: "teamB", label: "Side B" },
      { key: "scoreB", label: "Score B", placeholder: "0" },
      { key: "label", label: "Label" },
    ],
    defaults: { teamA: "ACC", scoreA: "0", teamB: "Sun Belt", scoreB: "0", label: "Final" },
    canvaUrl: "https://canva.link/x7kckrud42oie8u",
  },
  {
    id: "quote",
    name: "Quote",
    blurb: "A centred quote card on Bowl Navy with a gold mark.",
    fields: [
      { key: "quote", label: "Quote", multiline: true },
      { key: "attribution", label: "Attribution" },
    ],
    defaults: {
      quote: "College football arrives in San Juan.",
      attribution: SJB_EVENT.name,
    },
    canvaUrl: "https://canva.link/m2n91vbo496pep2",
  },
  {
    id: "save-the-date",
    name: "Save the date",
    blurb: "Badge, the date set big, and the venue line.",
    fields: [
      { key: "headline", label: "Headline" },
      { key: "date", label: "Date" },
      { key: "detail", label: "Detail line" },
    ],
    defaults: {
      headline: "Save the date",
      date: SJB_EVENT.datesLabel,
      detail: `${SJB_EVENT.venue} · ${SJB_EVENT.city}`,
    },
    canvaUrl: "https://canva.link/7zxgtyhn8i4wfmv",
  },
] as const;

export const SJB_SOCIAL_TEMPLATES_BY_ID: Record<string, SjbSocialTemplate> = Object.fromEntries(
  SJB_SOCIAL_TEMPLATES.map((t) => [t.id, t]),
);

/** Brand grounds offered alongside the scene photographs. */
export interface SjbGround {
  id: string;
  label: string;
  kind: "navy" | "waves" | "gold-band" | "light" | "photo";
  /** Scene photo URL when the ground is a photograph. */
  photo?: string;
  /** Which logo variant reads correctly on this ground. */
  logoVariant: "color" | "dark";
}

export const SJB_BRAND_GROUNDS: readonly SjbGround[] = [
  { id: "navy", label: "Bowl Navy", kind: "navy", logoVariant: "dark" },
  { id: "waves", label: "Navy · Sky waves", kind: "waves", logoVariant: "dark" },
  { id: "gold-band", label: "Navy · Gold band", kind: "gold-band", logoVariant: "dark" },
  { id: "light", label: "White", kind: "light", logoVariant: "color" },
] as const;

export function sjbSocialTemplate(id: string | null | undefined): SjbSocialTemplate {
  return SJB_SOCIAL_TEMPLATES_BY_ID[id ?? ""] ?? SJB_SOCIAL_TEMPLATES[0];
}

export function sjbSocialFormat(id: string | null | undefined): SjbSocialFormat {
  return SJB_SOCIAL_FORMATS_BY_ID[id ?? ""] ?? SJB_SOCIAL_FORMATS[0];
}
