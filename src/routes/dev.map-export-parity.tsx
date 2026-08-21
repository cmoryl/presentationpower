/**
 * Export-parity harness for the Solution Proposal "Global locations" map.
 *
 * Renders ONE deterministic locations page (fixed probe pin set) plus the real
 * "Export proposal" control, so the regression spec can compare the on-screen
 * map against the PDF and PPTX captures produced by the shipping pipelines.
 *
 * Dev-only surface: no navigation links point here, and the page carries no
 * app chrome so the capture matches the print geometry exactly.
 */

import { createFileRoute } from "@tanstack/react-router";
import { MultiProposalLayout } from "@/components/print/MultiProposalLayout";
import { ExportProposalButton } from "@/components/print/ExportProposalButton";
import { MULTI_SOLUTION_PROPOSALS } from "@/lib/print-library/solution-proposals-multi";
import type { SolutionProposalContent } from "@/lib/print-assets.types";
import { WORLD_MAP_VIEW, type WorldMapPin } from "@/lib/print-library/world-map-vector";

export const Route = createFileRoute("/dev/map-export-parity")({
  component: MapExportParityHarness,
  head: () => ({
    meta: [
      { title: "Map export parity harness — ELEMENT" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/**
 * Deterministic probe pins on a grid well inside the export-safe zone, sized a
 * little larger than production dots so raster blob detection is unambiguous.
 */
export function probePins(): WorldMapPin[] {
  const V = WORLD_MAP_VIEW;
  const cols = [0.14, 0.32, 0.5, 0.68, 0.86];
  const rows = [0.22, 0.45, 0.68];
  const out: WorldMapPin[] = [];
  rows.forEach((ry, r) =>
    cols.forEach((rx, c) => {
      out.push({
        id: `probe-${r}-${c}`,
        x: Math.round((V.x + V.w * rx) * 10) / 10,
        y: Math.round((V.y + V.h * ry) * 10) / 10,
        r: 3.4,
        kind: (r + c) % 2 === 0 ? "prod" : "service",
        name: `Probe ${r}-${c}`,
      });
    }),
  );
  return out;
}

function MapExportParityHarness() {
  const base = MULTI_SOLUTION_PROPOSALS[0]!.content as SolutionProposalContent;
  const locations = (base.pages ?? []).find((p) => p.kind === "locations");
  if (!locations) return <div>Missing locations page in the proposal master.</div>;

  const content: SolutionProposalContent = {
    ...base,
    pages: [{ ...locations, mapPins: probePins() }],
  };
  const document = (
    <MultiProposalLayout content={content} brand="transperfect" mode="dark" />
  );

  return (
    <div style={{ width: 1100, padding: 0 }}>
      <div data-testid="parity-toolbar" style={{ padding: 8 }}>
        <ExportProposalButton
          title="map-export-parity"
          mode="dark"
          pageSize="Letter"
          document={document}
          label="Export proposal"
        />
      </div>
      <div data-testid="parity-screen">{document}</div>
    </div>
  );
}
