// San Juan Bowl attendee badges + marketing T-shirts — COMP directions only.
// Every fact printed on a comp comes from SJB_EVENT; names on badges are
// labelled samples. Comps are proposals to choose finals from, not print masters.
import { SJB_COLORS } from "@/lib/san-juan-bowl";
import { BADGE_SPEC } from "@/lib/next-city-badge";

const c = (id: string) => SJB_COLORS.find((x) => x.id === id)!.hex;
export const SJB_INK = { navy: c("navy"), sky: c("sky"), gold: c("gold"), white: c("white") } as const;

/** Same plastic badge stock used for NEXT (4.33 × 6.3 in, dual slot). */
export const SJB_BADGE_SIZE = { trimW: BADGE_SPEC.trimW, trimH: BADGE_SPEC.trimH, bleed: BADGE_SPEC.bleed, slot: BADGE_SPEC.slot } as const;

export const SJB_SITE = "SANJUANBOWL.COM";
export const SJB_SITE_URL = "https://sanjuanbowl.com";

export type SjbAttendeeType = { id: "guest" | "vip" | "media" | "staff"; label: string; band: keyof typeof SJB_INK; ink: keyof typeof SJB_INK };
export const SJB_ATTENDEE_TYPES: SjbAttendeeType[] = [
  { id: "guest", label: "GUEST", band: "sky", ink: "navy" },
  { id: "vip", label: "VIP", band: "gold", ink: "navy" },
  { id: "media", label: "MEDIA", band: "white", ink: "navy" },
  { id: "staff", label: "STAFF", band: "navy", ink: "white" },
];

export type SjbBadgeComp = { id: "a" | "b" | "c"; name: string; idea: string };
export const SJB_BADGE_COMPS: SjbBadgeComp[] = [
  { id: "a", name: "Comp A · Night game", idea: "Navy ground, white-outline shield up top, attendee type on a full-width colour band." },
  { id: "b", name: "Comp B · Caribbean sky", idea: "Light ground with full-colour shield; type colour wraps the bottom third like a ticket stub." },
  { id: "c", name: "Comp C · Banner stripe", idea: "Navy top half, white bottom; a diagonal type-colour stripe echoes the logo banner." },
];

export type SjbShirtComp = {
  id: string;
  name: string;
  audience: string;
  shirt: keyof typeof SJB_INK;
  front: "chest-shield" | "big-shield" | "lettering" | "matchup" | "type-word";
  back: "site" | "big-shield" | "crew" | "date-stack" | "lettering";
  word?: string;
  idea: string;
};
export const SJB_SHIRT_COMPS: SjbShirtComp[] = [
  { id: "staff", name: "Staff crew tee", audience: "Staff", shirt: "navy", front: "chest-shield", back: "crew", word: "STAFF", idea: "Easy to spot in a crowd: small shield on the chest, big STAFF across the back." },
  { id: "volunteer", name: "Volunteer tee", audience: "Volunteers", shirt: "sky", front: "chest-shield", back: "crew", word: "VOLUNTEER", idea: "Bright sky colour so fans can find help fast." },
  { id: "fan", name: "Fan giveaway tee", audience: "Fans", shirt: "white", front: "big-shield", back: "site", idea: "Full-colour shield as the hero; website across the shoulders." },
  { id: "matchup", name: "Matchup tee", audience: "Fans", shirt: "navy", front: "matchup", back: "date-stack", idea: "ACC vs. Sun Belt on the front, game date and venue stacked on the back." },
  { id: "lettering", name: "San Juan lettering tee", audience: "Fans / retail", shirt: "gold", front: "lettering", back: "site", idea: "The custom San Juan lettering as a bold chest print on gold." },
  { id: "vip", name: "VIP premium tee", audience: "VIP guests", shirt: "navy", front: "chest-shield", back: "big-shield", idea: "Quiet front, oversized white-outline shield on the back." },
  { id: "media", name: "Media tee", audience: "Media", shirt: "white", front: "type-word", back: "site", word: "MEDIA", idea: "Clear role word on the chest for sideline access." },
  { id: "isla", name: "Island night tee", audience: "Fans / retail", shirt: "navy", front: "lettering", back: "big-shield", idea: "White lettering front, shield back — a souvenir that works after the game." },
];
