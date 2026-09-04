// Authored library copy for module variants.
//
// The taxonomy `description` is a build-time contract note ("Ascending SVG
// curve with 4 milestone dots…") — accurate, but it reads like a spec, not
// like guidance for someone choosing a slide. The library card and detail
// sheet used to lean on that string plus the live render, which meant the
// progression/curve family (maturity curve, journey map, roadmap, flywheel…)
// had no editorial text of its own.
//
// This module gives every variant two authored strings:
//   • caption     — one short line, sentence case, what the module says
//   • description — 1–2 sentences: when to reach for it and what it needs
// Authored entries win; anything not authored falls back to a deterministic
// sentence built from the variant's own family and capacity contract, so no
// card is ever blank.

import { MODULE_FAMILIES, byId, type ModuleVariant } from "@/lib/taxonomy";

export type ModuleCopy = { caption: string; description: string };

/**
 * Authored copy, variant id → caption + description.
 * Progression, curve and timeline modules first — those are the ones whose
 * meaning is hardest to read off a thumbnail.
 */
const AUTHORED: Record<string, ModuleCopy> = {
  "MV-MATURITY-CURVE": {
    caption: "Where they are today on the climb to target state",
    description:
      "An ascending S-curve with one stage per milestone and a 'you are here' marker. Use it to frame a change programme: name 3–5 stages from ad hoc to optimised, give each a short note, and flag the current stage so the gap to target does the arguing.",
  },
  "MV-JOURNEY-MAP": {
    caption: "The customer's path across markets, phase by phase",
    description:
      "Horizontal journey with a touchpoint per phase and a sentiment line running underneath. Use it when the story is about experience rather than delivery — the dips in the line are the opportunity.",
  },
  "MV-ROADMAP-QUARTERS": {
    caption: "What lands in which quarter, by workstream",
    description:
      "Quarterly columns with workstream bars spanning the quarters they cover. Use it for delivery commitments after the approach is agreed; keep it to 3–6 workstreams so the bars stay readable.",
  },
  "MV-FLYWHEEL": {
    caption: "A self-reinforcing loop, not a one-way process",
    description:
      "Four to six nodes on a circular track with a centre label and momentum arrows. Use it when each stage feeds the next and the point is compounding value — never for a process with a hard start and finish.",
  },
  "MV-HORIZON": {
    caption: "Now, next, later — commitment in three bands",
    description:
      "Three horizontal bands with progressively muted ink, so near-term certainty reads louder than long-term intent. Use it early in a plan when dates would over-promise.",
  },
  "MV-TIMELINE-VERTICAL": {
    caption: "Milestones down an accent spine, with dates",
    description:
      "Vertical timeline with tabular dates, dot nodes and a short body per entry. Use it when each milestone needs a sentence of explanation — a horizontal rail cannot carry that much copy.",
  },
  "MV-PROC-ARC-FLOW": {
    caption: "Two to six steps arcing across the slide",
    description:
      "Alternating arc segments with icon nodes and numbered copy. Use it for a light, visual process where each step is a phrase rather than a paragraph.",
  },
  "MV-PROC-TIMELINE-RAIL": {
    caption: "A dated rail with cards above and below the axis",
    description:
      "Horizontal axis, icon nodes and alternating cards, each carrying a date or duration. Use it for schedules with three to seven stops where timing is the point.",
  },
  "MV-PROC-JOURNEY-VERTICAL": {
    caption: "A journey that needs explaining, stage by stage",
    description:
      "Vertical rail with phase chips and a full paragraph per stage. Use it when the audience needs the reasoning behind each phase, not just its name.",
  },
  "MV-PROC-STAGE-ORBITS": {
    caption: "Numbered stages as photo medallions with task chains",
    description:
      "Two to six medallions in orbit rings, each with an icon task chain beneath. Use it when the process is worth dressing up — a kickoff or executive summary — and you have clean imagery.",
  },
  "MV-PROC-BEFORE-AFTER": {
    caption: "The workflow before, and after the change",
    description:
      "Two-state comparison of one workflow. Use it when the change is easier to see than to describe; keep both columns parallel so the differences stand out.",
  },
  "MV-PROC-LAYER-STACK": {
    caption: "Capability layers stacked foundation to surface",
    description:
      "Stacked lanes, each opening with an arrow-headed label and carrying three to four capability cells. Use it for architecture and platform stories where the layering itself is the argument.",
  },
  "MV-INFO-PYRAMID": {
    caption: "Tiers from broad foundation to a single peak",
    description:
      "Three to five stacked tiers narrowing upward. Use it for maturity, value or priority hierarchies where each tier depends on the one below.",
  },
  "MV-PROC-PLATFORM-LOOP": {
    caption: "The full capability pipeline, closed by one promise",
    description:
      "A serpentine pipeline wrapping across two rows into three pillar claims and a full-width promise band. Use it as the anchor slide for a platform story with many named capabilities.",
  },
};

/** Trim the taxonomy spec note into a clause that can sit inside a sentence. */
function clause(text: string): string {
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return first.replace(/\.$/, "").replace(/^[A-Z](?=[a-z])/, (m) => m.toLowerCase());
}

/** Deterministic fallback copy for any variant without an authored entry. */
function derivedCopy(v: ModuleVariant): ModuleCopy {
  const family = byId(MODULE_FAMILIES, v.familyId);
  const items = v.capacity.items;
  const shape = items
    ? `${items.min}–${items.max} items`
    : v.capacity.bodyChars
      ? `up to ~${v.capacity.bodyChars} characters of body copy`
      : "one focused statement";
  return {
    caption: clause(v.description),
    description: `${v.description.replace(/\.$/, "")}. Carries ${shape}${
      family ? ` in the ${family.name.toLowerCase()} family` : ""
    }.`,
  };
}

/** Authored library copy for a variant, with a derived fallback. */
export function moduleCopy(v: ModuleVariant): ModuleCopy {
  return AUTHORED[v.id] ?? derivedCopy(v);
}

/** True when the variant has hand-written library copy. */
export function hasAuthoredCopy(id: string): boolean {
  return Object.hasOwn(AUTHORED, id);
}

/** Ids with authored copy — used by tests and audits. */
export const AUTHORED_COPY_IDS = Object.keys(AUTHORED);
