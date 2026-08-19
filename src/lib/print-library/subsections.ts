// Print library sub-sections — a presentation-only shelf layer nested under a
// division. Divisions come from the brand-mode taxonomy; sub-sections are
// editorial groupings (industry practices under Division, the GlobalLink suite
// under Product) that filter the already-division-scoped items by keyword.

import type { PrintLibraryItem } from "./catalog";

export type PrintSubsection = {
  id: string;
  label: string;
  blurb: string;
  /** Keywords matched against title / blurb / collection / tags. */
  match: string[];
  /** Extra division ids whose (keyword-matching) items also belong in this section. */
  pull?: string[];

  children?: PrintSubsection[];
};

/** Divisions that should not appear as their own shelf. */
export const HIDDEN_DIVISION_IDS = new Set<string>(["bm-subcompany"]);

const GLOBALLINK_PRODUCTS: PrintSubsection[] = [
  { id: "gl-suite", label: "GlobalLink Suite", blurb: "Full-suite overview collateral", match: ["globallink suite", "suite", "globallink"] },
  { id: "gl-tms", label: "GlobalLink TMS", blurb: "Translation management system", match: ["tms", "translation management"] },
  { id: "gl-web", label: "GlobalLink Web", blurb: "Website proxy & web localization", match: ["web", "onelink", "proxy", "website"] },
  { id: "gl-live", label: "GlobalLink Live", blurb: "Live interpretation & meetings", match: ["live", "interpretation", "interpreting", "meeting"] },
  { id: "gl-stream", label: "GlobalLink Stream", blurb: "Media & streaming workflows", match: ["stream", "media", "subtitl", "dubbing"] },
  { id: "gl-now", label: "GlobalLink NOW", blurb: "Secure machine translation", match: ["now", "machine translation", "mt"] },
  { id: "gl-connect", label: "GlobalLink Connect", blurb: "Connectors & integrations", match: ["connect", "connector", "integration", "veeva", "vault", "rim"] },
  { id: "gl-dashboard", label: "GlobalLink Dashboard", blurb: "Program reporting & analytics", match: ["dashboard", "analytics", "report"] },
  { id: "gl-vasont", label: "GlobalLink Vasont", blurb: "Structured content management", match: ["vasont", "structured content", "cms"] },
  { id: "gl-ai", label: "GlobalLink AI", blurb: "AI-assisted language workflows", match: ["ai", "artificial intelligence", "genai"] },
];

export const DIVISION_SUBSECTIONS: Record<string, PrintSubsection[]> = {
  "bm-division": [
    { id: "div-finance", label: "Finance", blurb: "Financial services & banking", match: ["financ", "bank", "insur", "investment", "fintech"] },
    { id: "div-travel", label: "Travel", blurb: "Travel, hospitality & mobility", match: ["travel", "hospitality", "hotel", "airline", "tourism"] },
    { id: "div-hr", label: "Human Resources", blurb: "HR, talent & workforce programs", match: ["human resources", "hr", "talent", "workforce", "employee", "training"] },
  ],
  "bm-product": [
    {
      id: "prod-globallink",
      label: "GlobalLink",
      blurb: "The GlobalLink technology suite",
      match: ["globallink"],
      children: GLOBALLINK_PRODUCTS,
    },
    { id: "prod-dataforce", label: "DataForce", blurb: "AI training data & data services", match: ["dataforce", "training data", "annotation"] },
    {
      id: "prod-trial-interactive",
      label: "Trial Interactive",
      blurb: "eClinical platform collateral (eTMF, study start-up, investigator portals)",
      match: ["trial interactive", "etmf", "tmf", "eclinical", "geicam", "investigator"],
      // Trial Interactive collateral is authored on the Life Sciences shelves;
      // surface it here too, keyword-filtered.
      pull: ["bm-trial-interactive", "bm-tp-lifesci"],
    },

  ],
};

export function subsectionsFor(divisionId: string): PrintSubsection[] {
  return DIVISION_SUBSECTIONS[divisionId] ?? [];
}

export function findSubsection(
  divisionId: string,
  id: string | null,
): PrintSubsection | null {
  if (!id) return null;
  for (const s of subsectionsFor(divisionId)) {
    if (s.id === id) return s;
    const child = s.children?.find((c) => c.id === id);
    if (child) return child;
  }
  return null;
}

/** True when the item's copy matches any of the sub-section keywords. */
export function matchesSubsection(item: PrintLibraryItem, sub: PrintSubsection | null): boolean {
  if (!sub) return true;
  // Blank starting points stay visible in every sub-shelf.
  if (item.source === "template") return true;
  const hay = [item.title, item.blurb, item.collection ?? "", ...(item.tags ?? [])]
    .join(" ")
    .toLowerCase();
  const needles = sub.children
    ? [...sub.match, ...sub.children.flatMap((c) => c.match)]
    : sub.match;
  return needles.some((n) => hay.includes(n.toLowerCase()));
}
