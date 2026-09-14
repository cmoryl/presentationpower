// -----------------------------------------------------------------------------
// NEXT 2026 London — CMYK sign-off ledger.
//
// The house rule stands: brand RGB is never *silently* converted. A CMYK master
// is an explicit, operator-chosen output, and this module is the honesty layer
// that goes with it: for every colour the CMYK path would put on press it says
// whether the build is a signed-off brand build or a machine conversion that a
// print house still has to proof and approve.
//
// Nothing here converts anything. It reports, and it produces the sign-off
// sheet a printer signs against.
// -----------------------------------------------------------------------------

import { londonApprovedRamp } from "@/lib/london-signage-qa";
import { cmykShort, londonCmykBuild, type CmykBuild } from "@/lib/next-london-cmyk";
import { LONDON_PANELS, LONDON_VENUE_ITEM_PANELS, type LondonPanel } from "@/lib/next-london-signage";

export type CmykSignOffStop = {
  /** Source brand colour, lowercase hex. */
  hex: string;
  build: CmykBuild;
  /** How many panels put this colour on press. */
  panels: number;
  /** Example panels, for the printer's reference. */
  examples: string[];
};

export type CmykSignOffLedger = {
  stops: CmykSignOffStop[];
  approved: number;
  converted: number;
  panels: number;
  /** True only when every stop across every panel has a signed-off build. */
  fullyApproved: boolean;
};

/** Every panel whose artwork the CMYK path would generate. */
export function londonCmykPanels(): LondonPanel[] {
  const seen = new Set<string>();
  const out: LondonPanel[] = [];
  for (const p of [...LONDON_PANELS, ...LONDON_VENUE_ITEM_PANELS]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/** Per-panel status: how many of its ground stops carry an approved build. */
export function londonPanelCmykStatus(
  panel: LondonPanel,
  vibrance = 1,
): { total: number; approved: number; converted: number; stops: { hex: string; build: CmykBuild }[] } {
  const stops = londonApprovedRamp(panel).map((hex) => ({
    hex: hex.toLowerCase(),
    build: londonCmykBuild(hex, vibrance),
  }));
  const approved = stops.filter((s) => s.build.approved).length;
  return { total: stops.length, approved, converted: stops.length - approved, stops };
}

/** The whole-kit ledger, grouped by source colour. */
export function londonCmykSignOff(vibrance = 1): CmykSignOffLedger {
  const panels = londonCmykPanels();
  const byHex = new Map<string, CmykSignOffStop>();
  for (const panel of panels) {
    for (const { hex, build } of londonPanelCmykStatus(panel, vibrance).stops) {
      const row = byHex.get(hex);
      if (row) {
        row.panels += 1;
        if (row.examples.length < 3 && !row.examples.includes(panel.name))
          row.examples.push(panel.name);
      } else {
        byHex.set(hex, { hex, build, panels: 1, examples: [panel.name] });
      }
    }
  }
  const stops = [...byHex.values()].sort(
    (a, b) => Number(b.build.approved) - Number(a.build.approved) || b.panels - a.panels,
  );
  const approved = stops.filter((s) => s.build.approved).length;
  return {
    stops,
    approved,
    converted: stops.length - approved,
    panels: panels.length,
    fullyApproved: stops.length > 0 && stops.every((s) => s.build.approved),
  };
}

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The sheet the print house signs: one row per colour, approved or not. */
export function londonCmykSignOffCsv(vibrance = 1): string {
  const ledger = londonCmykSignOff(vibrance);
  const rows = ["source_rgb,cmyk_build,status,total_area_coverage,panels_using,example_panels,printer_approval"];
  for (const s of ledger.stops) {
    rows.push(
      [
        s.hex.toUpperCase(),
        cmykShort(s.build),
        s.build.approved ? "approved brand build" : "machine conversion — needs sign-off",
        `${Math.round(s.build.tac)}%`,
        String(s.panels),
        cell(s.examples.join("; ")),
        s.build.approved ? "n/a" : "",
      ].join(","),
    );
  }
  return rows.join("\n");
}

/** One-line summary for the UI and manifests. */
export function londonCmykSummary(vibrance = 1): string {
  const l = londonCmykSignOff(vibrance);
  return l.fullyApproved
    ? `All ${l.stops.length} print colours carry signed-off builds.`
    : `${l.approved} of ${l.stops.length} print colours carry signed-off builds — ${l.converted} are machine conversions awaiting printer sign-off.`;
}
