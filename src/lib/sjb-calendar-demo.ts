// Demo multi-page sequences for the Bowl social calendar.
//
// Genuine multi-page Canva artwork (LinkedIn carousels, Instagram carousels,
// Story sequences) is still pending for every post, look and format. Rather
// than leave the calendar showing nothing, this draws a labelled DEMO sequence
// for each one out of copy and facts the calendar already carries: the post's
// own headline, the announced event facts in SJB_EVENT, and the supplied Bowl
// badge. Nothing here invents a team, score, offer, price or date.
//
// A demo is never presented as approved artwork: every page carries a DEMO
// badge, and the panel that shows it says in words that this is a placeholder.
import { SJB_COLORS, SJB_EVENT } from "@/lib/san-juan-bowl";
import { SJB_CALENDAR_FORMATS, sjbCalendarSequence, type SjbCalendarFormat, type SjbCalendarFormatSpec } from "@/lib/sjb-calendar-formats";
import { sjbCalendarDesign, type SjbCalendarMode, type SjbCalendarPost, type SjbCalendarSize } from "@/lib/sjb-social-calendar";

export const SJB_DEMO_BADGE = "DEMO LAYOUT";
export const SJB_DEMO_NOTE =
  "Demo sequence — a layout placeholder built from this post's approved headline and the announced event facts. It is not the final multi-page design.";
/** Website shown on every page; taken from the approved calendar captions. */
export const SJB_DEMO_SITE = "SANJUANBOWL.COM";

const hex = (id: string) => SJB_COLORS.find((c) => c.id === id)!.hex;
const rgbOf = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255] as const;
};
/** Same token as `hex`, just with an alpha — never a new colour. */
const rgba = (id: string, a: number) => {
  const [r, g, b] = rgbOf(hex(id));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export interface SjbDemoLook {
  /** Flat ground colour, painted under everything so captures are opaque. */
  base: string;
  /** Light pools that separate the looks from each other. */
  glow: string;
  ink: string;
  accent: string;
  /** Badge lettering — navy holds AA contrast on both gold and sky. */
  badgeInk: string;
  /** Dark grounds carry the white-outline badge; light grounds the colour one. */
  dark: boolean;
}

export const SJB_DEMO_LOOKS: Record<SjbCalendarMode, SjbDemoLook> = {
  dark: {
    base: hex("navy"),
    glow: `radial-gradient(120% 90% at 82% 8%, ${rgba("gold", 0.22)} 0%, rgba(0, 0, 0, 0) 60%), radial-gradient(110% 80% at 10% 100%, ${rgba("sky", 0.14)} 0%, rgba(0, 0, 0, 0) 55%)`,
    ink: hex("white"),
    accent: hex("gold"),
    badgeInk: hex("navy"),
    dark: true,
  },
  light: {
    base: hex("white"),
    glow: `radial-gradient(120% 90% at 80% 6%, ${rgba("sky", 0.16)} 0%, rgba(0, 0, 0, 0) 58%), radial-gradient(110% 80% at 6% 100%, ${rgba("gold", 0.2)} 0%, rgba(0, 0, 0, 0) 55%)`,
    ink: hex("navy"),
    accent: hex("sky"),
    badgeInk: hex("navy"),
    dark: false,
  },
  set2: {
    base: hex("navy"),
    glow: `radial-gradient(130% 80% at 50% 100%, ${rgba("sky", 0.28)} 0%, rgba(0, 0, 0, 0) 62%), radial-gradient(90% 60% at 12% 6%, ${rgba("sky", 0.12)} 0%, rgba(0, 0, 0, 0) 50%)`,
    ink: hex("white"),
    accent: hex("gold"),
    badgeInk: hex("navy"),
    dark: true,
  },
  set3: {
    base: hex("navy"),
    glow: `radial-gradient(80% 60% at 50% 34%, ${rgba("gold", 0.26)} 0%, rgba(0, 0, 0, 0) 62%), radial-gradient(120% 70% at 90% 100%, ${rgba("sky", 0.12)} 0%, rgba(0, 0, 0, 0) 55%)`,
    ink: hex("white"),
    accent: hex("gold"),
    badgeInk: hex("navy"),
    dark: true,
  },
  set4: {
    base: hex("navy"),
    glow: `radial-gradient(140% 70% at 50% 106%, ${rgba("sky", 0.34)} 0%, rgba(0, 0, 0, 0) 60%), radial-gradient(70% 45% at 88% 10%, ${rgba("gold", 0.16)} 0%, rgba(0, 0, 0, 0) 52%)`,
    ink: hex("white"),
    accent: hex("gold"),
    badgeInk: hex("navy"),
    dark: true,
  },
};

/** Announced facts only — the same four the approved captions carry. */
export const SJB_DEMO_FACTS: { label: string; value: string }[] = [
  { label: "Date", value: SJB_EVENT.datesLabel },
  { label: "Venue", value: `${SJB_EVENT.venue}, ${SJB_EVENT.city}` },
  { label: "Kickoff", value: SJB_EVENT.kickoffLabel },
  { label: "Matchup", value: SJB_EVENT.matchupLabel },
];

export type SjbDemoRole = "cover" | "headline" | "details" | "tickets";

export interface SjbDemoPage {
  role: SjbDemoRole;
  label: string;
  /** Approved single-image artwork when one exists for this format's size. */
  photoUrl: string | null;
  photoKind: "approved" | "none";
}

export interface SjbCalendarDemo {
  spec: SjbCalendarFormatSpec;
  pages: SjbDemoPage[];
  facts: { label: string; value: string }[];
  /** True when the post's headline still holds bracketed placeholders. */
  placeholderCopy: boolean;
}

/** Which single-image size each format's cover borrows from. */
export const SJB_DEMO_SOURCE_SIZE: Record<SjbCalendarFormat, SjbCalendarSize> = {
  single: "1350",
  "linkedin-portrait": "1350",
  "linkedin-square": "1080",
  "instagram-carousel": "1350",
  "story-sequence": "1920",
};

/** Real sequence cover first, then the cleaned single artwork at the exact size. */
export function sjbCalendarCover(post: string, mode: SjbCalendarMode, format: SjbCalendarFormat) {
  const sequenceCover = sjbCalendarSequence(post, mode, format)?.pages[0];
  if (sequenceCover) return sequenceCover;
  const single = sjbCalendarDesign(post, mode, SJB_DEMO_SOURCE_SIZE[format]);
  if (!single?.previewUrl || !single.downloadUrl) return null;
  return { previewUrl: single.previewUrl, downloadUrl: single.downloadUrl, downloadName: single.downloadName };
}

export const SJB_DEMO_PAGE_ROLES: { role: SjbDemoRole; label: string }[] = [
  { role: "cover", label: "Cover" },
  { role: "headline", label: "Headline" },
  { role: "details", label: "The details" },
  { role: "tickets", label: "Tickets" },
];

/**
 * Demo sequence for one post in one look in one format, or null for the
 * single-image format (that one is real artwork or an honest "pending" note).
 */
export function sjbCalendarDemo(
  post: SjbCalendarPost,
  mode: SjbCalendarMode,
  format: SjbCalendarFormat,
): SjbCalendarDemo | null {
  const spec = SJB_CALENDAR_FORMATS.find((f) => f.id === format);
  if (!spec || format === "single") return null;
  const photoUrl = sjbCalendarCover(post.n, mode, format)?.previewUrl ?? null;
  return {
    spec,
    facts: SJB_DEMO_FACTS,
    placeholderCopy: post.headline.some((h) => h.includes("[")),
    pages: SJB_DEMO_PAGE_ROLES.map(({ role, label }) => ({
      role,
      label,
      photoUrl: role === "cover" ? photoUrl : null,
      photoKind: role === "cover" && photoUrl ? "approved" : "none",
    })),
  };
}
