// Dev-only harness: renders only the "Global locations" proposal page with
// extra author-added pins, then exports it to PDF and PPTX so a headless
// browser can confirm pin parity between screen and both export targets.

import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { MultiProposalLayout } from "@/components/print/MultiProposalLayout";
import { MULTI_SOLUTION_PROPOSALS } from "@/lib/print-library/solution-proposals-multi";
import { defaultWorldMapPins } from "@/components/print/ProposalWorldMap";
import { exportPrintAssetAsPdf } from "@/lib/print-asset-export";
import { exportPrintPagesAsPptx } from "@/lib/print-pptx-export";
import { BRAND_MODES } from "@/lib/taxonomy";

export const Route = createFileRoute("/dev/map-export-verify")({
  component: MapExportVerify,
  head: () => ({
    meta: [
      { title: "Map export verify | TransPerfect Element" },
      {
        name: "description",
        content: "Internal harness verifying proposal map pins survive PDF and PPTX export.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

// Four unmistakable extra pins (large radius, spread across the map box).
const EXTRA = [
  { id: "verify-1", x: 120, y: 90, r: 6, kind: "prod" as const, name: "Verify A" },
  { id: "verify-2", x: 260, y: 140, r: 6, kind: "service" as const, name: "Verify B" },
  { id: "verify-3", x: 400, y: 110, r: 6, kind: "prod" as const, name: "Verify C" },
  { id: "verify-4", x: 500, y: 190, r: 6, kind: "service" as const, name: "Verify D" },
];

function MapExportVerify() {
  const seed = MULTI_SOLUTION_PROPOSALS[0];
  const ref = useRef<HTMLDivElement>(null);
  if (!seed) return <div>No multi-page proposal masters found.</div>;

  const pages = (seed.content.pages ?? []).filter((p) => p.kind === "locations");
  const content = {
    ...seed.content,
    pages: pages.map((p) => ({ ...p, mapPins: [...defaultWorldMapPins(), ...EXTRA] })),
  };

  const nodes = () => {
    const el = ref.current?.querySelector<HTMLElement>("[data-print-page]") ?? ref.current;
    return el ? [el] : [];
  };

  return (
    <main style={{ background: "#DADDE5", padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          data-testid="export-pdf"
          onClick={() =>
            exportPrintAssetAsPdf(nodes(), {
              pageSize: "Letter",
              format: "digital",
              filename: "map-verify.pdf",
              mode: "light",
            })
          }
        >
          Export PDF
        </button>
        <button
          type="button"
          data-testid="export-pptx"
          onClick={() =>
            exportPrintPagesAsPptx(nodes(), {
              pageSize: "Letter",
              filename: "map-verify.pptx",
              mode: "light",
            })
          }
        >
          Export PPTX
        </button>
      </div>
      <div ref={ref} style={{ width: 816, margin: "0 auto" }}>
        <MultiProposalLayout content={content} brand={BRAND_MODES[0]!} mode="light" pageSize="Letter" />
      </div>
    </main>
  );
}
