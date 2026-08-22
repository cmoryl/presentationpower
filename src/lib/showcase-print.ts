// ---------------------------------------------------------------------------
// Homepage print demos.
//
// Each entry points at a real curated item in the print library catalog, so the
// /demo/print/$demoId page can create a genuine editable print asset for the
// signed-in user (same code path as "Use this template" in the library) instead
// of deep-linking to a filtered browser.
// ---------------------------------------------------------------------------

import { PRINT_LIBRARY_ITEMS, type PrintLibraryItem } from "@/lib/print-library/catalog";

export type PrintDemoDef = {
  id: string;
  /** Catalog item this demo opens as an editable copy. */
  libraryItemId: string;
  name: string;
  eyebrow: string;
  blurb: string;
  accent: string;
  divisionLabel: string;
  pills: string[];
  highlights: string[];
};

export const PRINT_DEMOS: PrintDemoDef[] = [
  {
    id: "pd-legal-genai",
    libraryItemId: "legal-ebro-generative-ai-powered-ediscovery",
    name: "Generative AI eDiscovery e-brochure",
    eyebrow: "Legal",
    blurb:
      "Production e-brochure: hero spread, capability grid, two-line statistics and export-safe icons — print and digital ready.",
    accent: "#3BBEB6",
    divisionLabel: "TransPerfect Legal",
    pills: ["Offset + POD", "CMYK preflight", "Editable"],
    highlights: [
      "Authored body copy, headings and statistics on every page",
      "Numbers on one line, units on the next — print rule enforced",
      "Hero auto-fit keeps the cover image focal point locked",
      "Exports to press-ready PDF and layered PPTX",
    ],
  },
  {
    id: "pd-lifesci-veeva",
    libraryItemId: "lifesci-ebro-globallink-veeva-vault-rim-integration",
    name: "Veeva Vault RIM integration brief",
    eyebrow: "Life Sciences",
    blurb:
      "Regulated-content brief with locked source callouts, integration diagram and a compliance-safe stat band.",
    accent: "#EC388A",
    divisionLabel: "TransPerfect Life Sciences",
    pills: ["PDF/X-4", "100K body text", "Editable"],
    highlights: [
      "Written for regulatory and quality reviewers",
      "Integration diagram rebuilt as editable print modules",
      "Body text held at 100K black for offset and POD",
      "Every claim traceable to the source document",
    ],
  },
  {
    id: "pd-media-genai",
    libraryItemId: "media-tv5monde-genai-subtitling",
    name: "GenAI subtitling case study",
    eyebrow: "Media",
    blurb:
      "Two-page broadcast case study: challenge, approach, measured outcome and a client quote — ready to leave behind.",
    accent: "#EC388A",
    divisionLabel: "TransPerfect Media",
    pills: ["Leave-behind", "Client-logo slot", "Editable"],
    highlights: [
      "Client mark comes from the logo pool, never a division logo",
      "Outcome statistics split across two lines automatically",
      "Swap the client and the story survives intact",
      "Prints at A4 and US Letter without reflow",
    ],
  },
  {
    id: "pd-legal-proposal",
    libraryItemId: "proposal-multi-legal-solutions-proposal-multipage",
    name: "Legal solutions proposal — multi-page master",
    eyebrow: "Proposal",
    blurb:
      "Full multi-page proposal: cover, why-us, scope, locations map, cost summary with live math, and signature page.",
    accent: "#003FC7",
    divisionLabel: "TransPerfect Legal",
    pills: ["Multi-page", "Live cost math", "PDF + PPTX"],
    highlights: [
      "Cost summary recalculates as you edit quantities and rates",
      "Interactive vector locations map — add or remove pins",
      "Division branding resolved from the division seeds",
      "Exports as a layered, editable PowerPoint",
    ],
  },
];

export function getPrintDemo(id: string): PrintDemoDef | undefined {
  return PRINT_DEMOS.find((d) => d.id === id);
}

export function printDemoItem(demo: PrintDemoDef): PrintLibraryItem | undefined {
  return PRINT_LIBRARY_ITEMS.find((i) => i.id === demo.libraryItemId);
}
