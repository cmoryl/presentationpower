// Shared type for homepage showcase decks. Lives in its own module so both
// `showcase-decks.ts` and `showcase-decks-extra.ts` can use it without a
// circular import.

import type { TemplatePayload } from "./deck-store";

export type ShowcaseDeckDef = {
  id: string;
  /** Card + page title. */
  name: string;
  eyebrow: string;
  blurb: string;
  accent: string;
  divisionLabel: string;
  /** Stable deck title used to reuse an already-generated copy. */
  deckTitle: string;
  highlights: string[];
  build: () => TemplatePayload;
};
