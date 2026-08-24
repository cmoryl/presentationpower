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
    base: "#03002C",
    accent: "#C2A3FF",
    accent2: "#003FC7",
    ink: "#003FC7",
    onHero: "#FFFFFF",
    bricks: ["#C2A3FF", "#A1FBF9", "#003FC7", "#FFEB66", "#E0E8F5"],
  },
  marketing: {
    kicker: "Campaign production",
    blurb: "Brief in, on-brand campaign out — decks, print and social from one look.",
    base: "#1A0B2E",
    accent: "#FF9B70",
    accent2: "#EC388A",
    ink: "#B3216B",
    onHero: "#FFFFFF",
    bricks: ["#FF9B70", "#EC388A", "#FFEB66", "#C2A3FF", "#F2F2F2"],
  },
  sales: {
    kicker: "Sales enablement",
    blurb: "Client-ready in minutes — pitch decks and leave-behinds that pass brand review.",
    base: "#00203A",
    accent: "#A1FBF9",
    accent2: "#A6FA87",
    ink: "#0F6B3C",
    onHero: "#FFFFFF",
    bricks: ["#A1FBF9", "#A6FA87", "#003FC7", "#FFEB66", "#E0E8F5"],
  },
};

export function personaTheme(id: PersonaId): PersonaTheme {
  return PERSONA_THEME[id] ?? PERSONA_THEME.sales;
}
