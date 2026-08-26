// AI chart specs → PPTX slides.
//
// A campaign's charts are authored once as InfographicSpecs (AI pass in the Viz
// Lab, or the deterministic builder used by print sheets and social frames).
// This module turns those exact specs into deck slides and hands them to the
// certified PPTX exporter, so the PowerPoint deck, the press sheet and the
// social frame are all drawn from one spec — no re-authoring, no drift.

import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import type { BrandMode } from "@/lib/taxonomy";
import type { Deck, DeckSlide } from "@/lib/deck-store";
import { auditVizSpec, type VizSurface } from "./audit";
import { repairVizSpec } from "./repair";
import { variantsForKind } from "./audit-sweep";
import { vizTheme } from "./viz-theme";
import type { InfographicSpec } from "./spec";

/** Variant id that renders this chart kind (falls back to the waterfall frame). */
export function variantForKind(spec: InfographicSpec): string {
  const [first] = variantsForKind(spec.kind);
  return first ?? "MV-VIZ-WATERFALL";
}

function layoutFor(variantId: string): string {
  const v = MODULE_VARIANTS.find((x) => x.id === variantId);
  return v?.permittedLayoutIds?.[0] ?? "LF-11";
}

export type SpecSlideInput = {
  spec: InfographicSpec;
  /** Optional takeaway line placed under the chart title. */
  insight?: string;
  /** Slide mode. Defaults to the spec theme mode. */
  mode?: "light" | "dark";
  notes?: string;
};

/**
 * Re-theme + repair a spec for a surface so the same numbers render correctly
 * on a slide, a press sheet and a social frame.
 */
export function specForSurface(
  spec: InfographicSpec,
  surface: VizSurface,
  mode: "light" | "dark" = spec.theme?.mode === "dark" ? "dark" : "light",
  brandModeId = "bm-enterprise",
): { spec: InfographicSpec; repairs: string[]; score: number; blockers: number } {
  const themed: InfographicSpec = {
    ...spec,
    theme: { ...spec.theme, ...vizTheme({ brand: brand(brandModeId), mode }) },
  };
  const repaired = repairVizSpec(themed, { surface });
  const audit = auditVizSpec(repaired.spec, { surface });
  return {
    spec: repaired.spec,
    repairs: (repaired.notes ?? []).map((n) => `${n.code}: ${n.detail}`),
    score: audit.score,
    blockers: audit.findings.filter((f) => f.severity === "blocker").length,
  };
}

/** Build a deck whose slides are the given specs, one chart per slide. */
export function specsToDeck(
  inputs: SpecSlideInput[],
  opts?: { title?: string; brandModeId?: string; mixModes?: boolean },
): Deck {
  const brandModeId = opts?.brandModeId ?? "bm-enterprise";
  const now = new Date().toISOString();
  const slides: DeckSlide[] = inputs.map((input, i) => {
    const mode =
      input.mode ?? (opts?.mixModes ? (i % 3 === 0 ? "dark" : "light") : undefined) ?? "light";
    const prepared = specForSurface(input.spec, "presentation", mode, brandModeId);
    const variantId = variantForKind(prepared.spec);
    return {
      id: `viz-${i + 1}-${prepared.spec.id || "chart"}`,
      position: i,
      sectionId: "SF-04",
      variantId,
      layoutId: layoutFor(variantId),
      mode,
      content: {
        title: prepared.spec.title || "Data view",
        subtitle: input.insight || prepared.spec.subtitle || "",
        rows: prepared.spec.data.rows,
        encoding: prepared.spec.encoding,
        columns: prepared.spec.data.columns,
        source: prepared.spec.data.source,
        spec: prepared.spec,
      } as DeckSlide["content"],
      changes: [],
      notes: input.notes,
    };
  });

  return {
    id: `viz-export-${Date.now()}`,
    createdAt: now,
    title: opts?.title?.trim() || "Campaign data views",
    briefId: "viz-lab",
    brandModeId: brandModeId as Deck["brandModeId"],
    archetypeId: "AR-01",
    slides,
  };
}

function brand(brandModeId: string): BrandMode {
  return (
    BRAND_MODES.find((b) => b.id === brandModeId) ??
    BRAND_MODES.find((b) => b.id === "bm-enterprise") ??
    BRAND_MODES[0]!
  );
}

/** Export the given AI chart specs as a .pptx (download by default). */
export async function exportSpecsToPptx(
  inputs: SpecSlideInput[],
  opts?: {
    title?: string;
    brandModeId?: string;
    mixModes?: boolean;
    output?: "download" | "blob";
  },
): Promise<unknown> {
  if (inputs.length === 0) throw new Error("No chart specs to export");
  const brandModeId = opts?.brandModeId ?? "bm-enterprise";
  const deck = specsToDeck(inputs, { ...opts, brandModeId });
  const { exportDeckToPptx } = await import("@/lib/pptx-export");
  return exportDeckToPptx(deck, brand(brandModeId), {
    output: opts?.output ?? "download",
  });
}
