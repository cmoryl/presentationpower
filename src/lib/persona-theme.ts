import { BRAND } from "@/lib/brand-colors";
// Per-persona visual identity for the workspace dashboards.
//
// Each persona gets its own accent pair drawn from the TransPerfect brand
// palette (Blue 500 / Blue 800 primaries, secondary Aqua + Lavender, tertiary
// pops) so Admin, Marketing and Sales workspaces read as distinct rooms in the
// same building rather than one grey template with swapped copy.

import type { PersonaId } from "./workspace-persona";

export type PersonaTheme = {
  /** Small-caps kicker above the hero title. */
  kicker: string;
  /** One-line room description used under the hero title. */
  blurb: string;
  /** Deep base of the hero plate. */
  base: string;
  /** Primary accent — used for glows, rules and active bricks. */
  accent: string;
  /** Secondary accent — used for the far end of gradients. */
  accent2: string;
  /** Accessible accent for accent-colored text/icons on white surfaces. */
  ink: string;
  /** Text color that sits on top of the hero plate. */
  onHero: string;
  /** Five brick colors for the interactive Element motif. */
  bricks: readonly [string, string, string, string, string];
};

export const PERSONA_THEME: Record<PersonaId, PersonaTheme> = {
  admin: {
    kicker: "System ownership",
    blurb: "Templates, modules and guardrails — everything downstream inherits what you set here.",
    base: BRAND.ink,
    accent: BRAND.lavender,
    accent2: BRAND.blue,
    ink: BRAND.blue,
    onHero: "#FFFFFF",
    bricks: [BRAND.lavender, BRAND.aqua, BRAND.blue, BRAND.yellow, "#E0E8F5"],
  },
  marketing: {
    kicker: "Campaign production",
    blurb: "Brief in, on-brand campaign out — decks, print and social from one look.",
    base: "#1A0B2E",
    accent: BRAND.peach,
    accent2: BRAND.pink,
    ink: "#B3216B",
    onHero: "#FFFFFF",
    bricks: [BRAND.peach, BRAND.pink, BRAND.yellow, BRAND.lavender, "#F2F2F2"],
  },
  sales: {
    kicker: "Sales",
    blurb: "Client-ready in minutes — pitch decks and leave-behinds that pass brand review.",
    base: "#00203A",
    accent: BRAND.aqua,
    accent2: BRAND.green,
    ink: "#0F6B3C",
    onHero: "#FFFFFF",
    bricks: [BRAND.aqua, BRAND.green, BRAND.blue, BRAND.yellow, "#E0E8F5"],
  },
};

export function personaTheme(id: PersonaId): PersonaTheme {
  return PERSONA_THEME[id] ?? PERSONA_THEME.sales;
}
