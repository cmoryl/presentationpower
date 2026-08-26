// Client-safe contracts for the AI data-visualisation pass. Imported by both
// the server functions and the Viz Lab UI, so it must stay free of server-only
// imports.

import { z } from "zod";
import type { VizAudit, VizSurface } from "@/lib/infographics/audit";
import type { InfographicSpec } from "@/lib/infographics/spec";

export const VIZ_SURFACE_VALUES = ["presentation", "print", "social"] as const;

export const interpretVizInput = z.object({
  /** Pasted numbers, CSV, a table, or a sentence describing the data. */
  data: z.string().min(3).max(20000),
  /** What claim the chart has to prove. Optional but sharpens the choice. */
  intent: z.string().max(600).optional(),
  surface: z.enum(VIZ_SURFACE_VALUES).default("presentation"),
  mode: z.enum(["light", "dark"]).default("light"),
  /** Brand mode id (bm-enterprise by default — the approved system). */
  brandModeId: z.string().max(60).optional(),
  /** Force a chart kind instead of letting the model choose. */
  forceKind: z.string().max(40).optional(),
});
export type InterpretVizInput = z.infer<typeof interpretVizInput>;

export const critiqueVizInput = z.object({
  spec: z.unknown(),
  surface: z.enum(VIZ_SURFACE_VALUES).default("presentation"),
  /** Optional context: what the slide/page around the chart is saying. */
  context: z.string().max(1200).optional(),
});
export type CritiqueVizInput = z.infer<typeof critiqueVizInput>;

export type VizAlternate = { kind: string; why: string };

export type InterpretVizResult = {
  ok: boolean;
  /** Present when ok. Already themed, alt-texted and auto-repaired. */
  spec?: InfographicSpec;
  audit?: VizAudit;
  /** Deterministic repairs applied after the model answered. */
  repairs?: string[];
  /** The takeaway sentence the chart proves. */
  insight?: string;
  /** Honest caveats: rounding, exclusions, small samples. */
  caveats?: string[];
  /** Other chart kinds worth trying, with the reason. */
  alternates?: VizAlternate[];
  /** Recommended presentation module ids for the chosen kind. */
  modules?: string[];
  surface?: VizSurface;
  error?: string;
};

export type VizCritique = {
  ok: boolean;
  audit?: VizAudit;
  /** Model verdict on whether the chart proves its claim. */
  verdict?: string;
  /** Prioritised, concrete edits. */
  actions?: Array<{ severity: "blocker" | "warning" | "polish"; action: string }>;
  /** Improved copy the user can accept in one click. */
  suggested?: { title?: string; subtitle?: string; headline?: string; shortAlt?: string };
  error?: string;
};
