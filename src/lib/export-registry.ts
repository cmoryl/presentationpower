// -----------------------------------------------------------------------------
// Export registry — the single inventory of every output the app can produce.
//
// One row per (asset area × user-facing control). It records which file formats
// that control ships, where the user finds it, and which live verification
// checks in /admin/export-audit prove the bytes. Adding an exporter without
// adding a row here shows up as an uncovered area in the audit.
// -----------------------------------------------------------------------------

import type { ExportKind } from "./export-verify-bytes";

export type ExportAreaId = "deck" | "print" | "social" | "events" | "canvas" | "brand";

export type ExportArea = {
  id: ExportAreaId;
  label: string;
  blurb: string;
};

export const EXPORT_AREAS: ExportArea[] = [
  {
    id: "deck",
    label: "Presentation",
    blurb: "Decks, single slides and module samples — layered PowerPoint, PDF and images.",
  },
  {
    id: "print",
    label: "Print",
    blurb: "Brochures, case studies and solution proposals — press PDF, PDF/X-4, PPTX, HTML.",
  },
  {
    id: "social",
    label: "Social",
    blurb: "Per-platform posts, banners and kits at native pixel sizes.",
  },
  {
    id: "events",
    label: "Events",
    blurb: "Booth, badge and event collateral artwork exported as images or a print PDF.",
  },
  { id: "canvas", label: "Canvas studio", blurb: "Free-canvas compositions exported as decks." },
  { id: "brand", label: "Brand assets", blurb: "Icon sets, logo lockups and campaign kits." },
];

export type ExportEntry = {
  id: string;
  area: ExportAreaId;
  /** What the user is exporting. */
  asset: string;
  /** The control they click. */
  surface: string;
  /** Where that control lives. */
  route: string;
  formats: ExportKind[];
  /** Live check ids in the audit harness that exercise this row. */
  checks: string[];
  notes?: string;
};

export const EXPORT_REGISTRY: ExportEntry[] = [
  // --- Presentation ---------------------------------------------------------
  {
    id: "deck.pptx",
    area: "deck",
    asset: "Full deck",
    surface: "Export → PowerPoint (layered / exact)",
    route: "/decks/$deckId/export",
    formats: ["pptx"],
    checks: ["deck.pptx"],
    notes: "Layered native objects, background masters, alt text, notes.",
  },
  {
    id: "deck.pdf",
    area: "deck",
    asset: "Full deck",
    surface: "Export → PDF",
    route: "/decks/$deckId/export",
    formats: ["pdf"],
    checks: ["asset.pdf"],
    notes: "16:9 page per slide at print resolution.",
  },
  {
    id: "deck.share",
    area: "deck",
    asset: "Deck (share menu)",
    surface: "Share → PowerPoint / PDF / Present",
    route: "/decks/$deckId",
    formats: ["pptx", "pdf"],
    checks: ["deck.pptx"],
  },
  {
    id: "deck.slide",
    area: "deck",
    asset: "Single slide",
    surface: "Slide menu → PowerPoint / PNG",
    route: "/decks/$deckId",
    formats: ["pptx", "png"],
    checks: ["deck.pptx", "asset.png"],
  },
  {
    id: "deck.module",
    area: "deck",
    asset: "Module sample",
    surface: "Library → Export module",
    route: "/library",
    formats: ["pptx", "png"],
    checks: ["deck.pptx", "asset.png"],
  },

  // --- Print ----------------------------------------------------------------
  {
    id: "print.pdf.press",
    area: "print",
    asset: "Print asset / proposal",
    surface: "Export → Press PDF",
    route: "/admin/print-library/$itemId",
    formats: ["pdf"],
    checks: ["print.pdf.press"],
    notes: "300/600 DPI, bleed + crop marks, vector text overlay.",
  },
  {
    id: "print.pdf.digital",
    area: "print",
    asset: "Print asset / proposal",
    surface: "Export → Digital PDF",
    route: "/admin/print-library/$itemId",
    formats: ["pdf"],
    checks: ["print.pdf.digital"],
    notes: "150 DPI, no bleed, JPEG pages — email/web distribution.",
  },
  {
    id: "print.pdfx4",
    area: "print",
    asset: "Print asset / proposal",
    surface: "Export → PDF/X-4 (offset)",
    route: "/admin/print-color",
    formats: ["pdf"],
    checks: ["print.pdf.press"],
    notes: "ICC output intent, trim/bleed boxes, 100K body text.",
  },
  {
    id: "print.pptx",
    area: "print",
    asset: "Proposal pages",
    surface: "Export proposal → PowerPoint",
    route: "/admin/print-library/$itemId",
    formats: ["pptx"],
    checks: ["print.pptx"],
    notes: "Layered editable pages on a trim-sized layout.",
  },
  {
    id: "print.html",
    area: "print",
    asset: "Print asset",
    surface: "Export → Standalone HTML",
    route: "/admin/print-library/$itemId",
    formats: ["html"],
    checks: ["print.html"],
  },

  // --- Social ---------------------------------------------------------------
  {
    id: "social.asset",
    area: "social",
    asset: "Single social asset",
    surface: "Asset card → Export (PNG 1×/2×, JPG, WebP, PDF)",
    route: "/admin/campaigns/kit",
    formats: ["png", "jpg", "webp", "pdf"],
    checks: ["social.png", "asset.jpg", "asset.webp", "asset.pdf"],
    notes: "Captured at native platform pixels, never upscaled from the preview.",
  },
  {
    id: "social.kit",
    area: "social",
    asset: "Whole kit",
    surface: "Export kit → ZIP (+ manifest)",
    route: "/admin/campaigns/kit",
    formats: ["zip"],
    checks: ["social.zip"],
  },
  {
    id: "social.banner",
    area: "social",
    asset: "LinkedIn banner",
    surface: "Banner studio → download surfaces",
    route: "/social/banners",
    formats: ["png"],
    checks: ["asset.png"],
  },

  // --- Events ---------------------------------------------------------------
  {
    id: "events.collateral",
    area: "events",
    asset: "Event collateral artwork",
    surface: "Asset card → Export (PNG/JPG/PDF)",
    route: "/events/demo/$playbookId",
    formats: ["png", "jpg", "pdf"],
    checks: ["asset.png", "asset.jpg", "asset.pdf"],
  },
  {
    id: "events.kit",
    area: "events",
    asset: "Event asset kit",
    surface: "Export all → ZIP",
    route: "/events/demo/$playbookId",
    formats: ["zip"],
    checks: ["asset.zip"],
  },

  // --- Canvas ---------------------------------------------------------------
  {
    id: "canvas.pptx",
    area: "canvas",
    asset: "Canvas composition",
    surface: "Studio → Export PowerPoint",
    route: "/admin/canvas",
    formats: ["pptx"],
    checks: ["deck.pptx"],
  },

  // --- Brand assets ---------------------------------------------------------
  {
    id: "brand.icon",
    area: "brand",
    asset: "Brand icon",
    surface: "Icon library → SVG / PNG",
    route: "/knowledge/icon-library",
    formats: ["svg", "png"],
    checks: ["icon.svg", "icon.png"],
  },
  {
    id: "brand.iconset",
    area: "brand",
    asset: "Icon set / sub-area",
    surface: "Icon library → Download set",
    route: "/knowledge/icon-library",
    formats: ["zip"],
    checks: ["asset.zip"],
  },
];

export function entriesForArea(area: ExportAreaId): ExportEntry[] {
  return EXPORT_REGISTRY.filter((e) => e.area === area);
}

/** Every distinct check id the registry expects the harness to run. */
export function requiredCheckIds(): string[] {
  return Array.from(new Set(EXPORT_REGISTRY.flatMap((e) => e.checks))).sort();
}

/** Registry rows whose checks all passed, given a set of passing check ids. */
export function coverageFor(passing: Set<string>): {
  verified: ExportEntry[];
  failing: ExportEntry[];
  unrun: ExportEntry[];
} {
  const verified: ExportEntry[] = [];
  const failing: ExportEntry[] = [];
  const unrun: ExportEntry[] = [];
  for (const entry of EXPORT_REGISTRY) {
    if (entry.checks.length === 0) unrun.push(entry);
    else if (entry.checks.every((c) => passing.has(c))) verified.push(entry);
    else failing.push(entry);
  }
  return { verified, failing, unrun };
}
