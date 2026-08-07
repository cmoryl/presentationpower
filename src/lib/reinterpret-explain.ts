// Human-readable explanation of a reinterpreted slide's design choice.
//
// The design pass (`reinterpret-design.ts`) picks a layout from content
// signals, and records a terse rationale on the slide. This module turns both
// into reviewer-facing language: which design module was selected, where the
// choice came from, and which signals in the source slide drove it.

import { readSignals, type SlideSignals } from "@/lib/reinterpret-design";
import { MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import type { MappedSlide } from "@/lib/pptx-mapping";

export type DesignExplanation = {
  /** Friendly module name, e.g. "KPI dashboard". */
  moduleName: string;
  variantId: string;
  /** Who chose it: the AI planner, our design pass, or the fidelity mapping. */
  origin: "ai" | "designed" | "mapped";
  /** Short signal phrases, strongest first. */
  signals: string[];
};

const KEYWORD_SIGNALS: Array<{ re: RegExp; label: string }> = [
  { re: /roadmap|timeline|phase|milestone|quarter/, label: "roadmap language" },
  { re: /architecture|platform|stack|system|integration/, label: "architecture language" },
  { re: /outcome|result|impact|roi|savings/, label: "outcome language" },
  { re: /challenge|problem|risk|pain|gap/, label: "problem framing" },
  { re: /process|workflow|approach|method/, label: "process framing" },
  { re: /client|customer|case study|partner/, label: "client proof language" },
  { re: /why|differentiat|advantage|unique/, label: "differentiation language" },
];

function keywordSignals(g: SlideSignals): string[] {
  const hay = `${g.lowTitle} ${g.bullets.join(" ").toLowerCase()}`;
  return KEYWORD_SIGNALS.filter((k) => k.re.test(hay)).map((k) => k.label);
}

/** Signal phrases for a source slide, strongest evidence first. */
export function describeSignals(m: MappedSlide): string[] {
  const g = readSignals(m);
  const out: string[] = [];
  if (g.stats.length >= 2)
    out.push(`${g.stats.length} numeric figures in the copy`);
  else if (g.stats.length === 1) out.push("one numeric figure");
  if (g.dated.length >= 2) out.push(`${g.dated.length} dated milestones`);
  if (g.stepped) out.push("numbered / stepped bullets");
  if (g.longform) out.push("long-form paragraph copy");
  if (g.images.length >= 2) out.push(`${g.images.length} source images`);
  else if (g.images.length === 1) out.push("one source image");
  if (g.bullets.length >= 6) out.push(`${g.bullets.length} bullets to distribute`);
  else if (g.bullets.length > 0 && g.bullets.length <= 3 && !g.longform)
    out.push(`${g.bullets.length} short bullet${g.bullets.length === 1 ? "" : "s"}`);
  if (!g.bullets.length && g.title) out.push("title-only slide");
  out.push(...keywordSignals(g));
  return out.slice(0, 5);
}

/** Full explanation for a designed slide, given its pre-design source slide. */
export function explainDesign(
  designed: MappedSlide,
  source: MappedSlide = designed,
): DesignExplanation {
  const rationale = designed.rationale ?? "";
  const origin: DesignExplanation["origin"] = rationale.startsWith("AI-designed")
    ? "ai"
    : rationale.startsWith("Re-designed")
      ? "designed"
      : "mapped";
  return {
    moduleName: byId(MODULE_VARIANTS, designed.variantId)?.name ?? designed.variantId,
    variantId: designed.variantId,
    origin,
    signals: describeSignals(source),
  };
}

export const ORIGIN_LABEL: Record<DesignExplanation["origin"], string> = {
  ai: "Chosen by the AI planner",
  designed: "Chosen by our design pass",
  mapped: "Kept from the faithful import mapping",
};
