/**
 * PRINT SECTION LAYOUTS — five section layouts per module family
 * ---------------------------------------------------------------------------
 * Every print module family (stats, quote, logo grid, expertise, features,
 * narrative, table, contact, device, hero) exposes FIVE section layouts.
 * A layout never rewrites content or the module's variant — it re-states the
 * *frame* the module renders inside: column count, rhythm, padding, alignment,
 * surface grammar, header treatment and type scale.
 *
 * Layouts are token bundles so admins can customise them: the resolver merges
 * the shipped tokens with per-workspace overrides (persisted locally under
 * `element.print.sectionLayouts.v1`), and the frame publishes the result as CSS
 * variables + data attributes that `print-section-layouts.css` acts on. Every
 * value survives raster capture (PDF/PPTX) because nothing here relies on
 * masks or filters.
 */

import type { PrintSection } from "@/lib/print-assets.types";

export type PrintSectionKind = PrintSection["kind"];

export type PrintSectionLayoutId =
  | "layout-standard"
  | "layout-wide"
  | "layout-stacked"
  | "layout-centered"
  | "layout-editorial";

export type PrintSectionSurface = "card" | "open" | "hairline" | "plain" | "band";
export type PrintSectionHeader = "stack" | "inline" | "rule" | "quiet" | "hidden";

export type PrintSectionLayoutTokens = {
  /** Item columns forced onto the module's own item grid. */
  cols: number;
  /** Grid gap in template px (816pt page). */
  gap: number;
  /** Inner frame padding in template px. */
  pad: number;
  /** Copy alignment. */
  align: "left" | "center";
  /** Frame surface grammar. */
  surface: PrintSectionSurface;
  /** Eyebrow + title treatment. */
  header: PrintSectionHeader;
  /** Type/geometry scale, 0.8 – 1.3. */
  scale: number;
  /** Flip the module's primary/secondary column order. */
  reverse: boolean;
};

export type PrintSectionLayout = {
  id: PrintSectionLayoutId;
  label: string;
  desc: string;
  tokens: PrintSectionLayoutTokens;
};

export const PRINT_SECTION_LAYOUT_IDS: PrintSectionLayoutId[] = [
  "layout-standard",
  "layout-wide",
  "layout-stacked",
  "layout-centered",
  "layout-editorial",
];

export const PRINT_SECTION_SURFACES: PrintSectionSurface[] = [
  "card",
  "open",
  "hairline",
  "plain",
  "band",
];

export const PRINT_SECTION_HEADERS: PrintSectionHeader[] = [
  "stack",
  "inline",
  "rule",
  "quiet",
  "hidden",
];

/** Base archetypes. Per-kind catalogs below only differ where the family needs
 *  a different column story (a quote can't run 4-up, a logo wall can). */
function archetypes(cols: [number, number, number, number, number]): PrintSectionLayout[] {
  return [
    {
      id: "layout-standard",
      label: "Standard",
      desc: "System default rhythm — open card grammar, left-aligned header.",
      tokens: {
        cols: cols[0],
        gap: 14,
        pad: 0,
        align: "left",
        surface: "open",
        header: "stack",
        scale: 1,
        reverse: false,
      },
    },
    {
      id: "layout-wide",
      label: "Wide grid",
      desc: "More columns, tighter rhythm — fits denser rosters on one page.",
      tokens: {
        cols: cols[1],
        gap: 10,
        pad: 0,
        align: "left",
        surface: "plain",
        header: "quiet",
        scale: 0.94,
        reverse: false,
      },
    },
    {
      id: "layout-stacked",
      label: "Stacked list",
      desc: "Single-file stack with hairline separation — long-form reading.",
      tokens: {
        cols: cols[2],
        gap: 12,
        pad: 0,
        align: "left",
        surface: "hairline",
        header: "rule",
        scale: 1,
        reverse: false,
      },
    },
    {
      id: "layout-centered",
      label: "Centered panel",
      desc: "Centered copy inside a padded card — statement moments.",
      tokens: {
        cols: cols[3],
        gap: 16,
        pad: 18,
        align: "center",
        surface: "card",
        header: "stack",
        scale: 1.06,
        reverse: false,
      },
    },
    {
      id: "layout-editorial",
      label: "Editorial band",
      desc: "Accent band with reversed order and generous air.",
      tokens: {
        cols: cols[4],
        gap: 18,
        pad: 20,
        align: "left",
        surface: "band",
        header: "inline",
        scale: 1.02,
        reverse: true,
      },
    },
  ];
}

export const PRINT_SECTION_LAYOUTS: Record<PrintSectionKind, PrintSectionLayout[]> = {
  hero: archetypes([1, 2, 1, 1, 2]),
  stats: archetypes([3, 4, 1, 2, 3]),
  quote: archetypes([1, 2, 1, 1, 1]),
  "logo-grid": archetypes([3, 5, 2, 3, 4]),
  expertise: archetypes([4, 6, 1, 3, 4]),
  "feature-list": archetypes([3, 4, 1, 2, 2]),
  narrative: archetypes([3, 4, 1, 2, 2]),
  table: archetypes([2, 3, 1, 2, 2]),
  contact: archetypes([2, 3, 1, 1, 2]),
  device: archetypes([2, 2, 1, 1, 2]),
};

export function printSectionLayouts(kind: PrintSectionKind): PrintSectionLayout[] {
  return PRINT_SECTION_LAYOUTS[kind] ?? PRINT_SECTION_LAYOUTS.stats;
}

// ---------------------------------------------------------------------------
// Admin customisation
// ---------------------------------------------------------------------------

const STORE_KEY = "element.print.sectionLayouts.v1";

export type PrintSectionLayoutOverrides = Partial<
  Record<string, Partial<PrintSectionLayoutTokens>>
>;

const overrideKey = (kind: PrintSectionKind, id: PrintSectionLayoutId) => `${kind}:${id}`;

let cache: PrintSectionLayoutOverrides | null = null;
const listeners = new Set<() => void>();

export function loadPrintLayoutOverrides(): PrintSectionLayoutOverrides {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    cache = raw ? (JSON.parse(raw) as PrintSectionLayoutOverrides) : {};
  } catch {
    cache = {};
  }
  return cache ?? {};
}

function persist(next: PrintSectionLayoutOverrides) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* storage full / blocked — the in-memory cache still applies this session */
    }
  }
  listeners.forEach((fn) => fn());
}

export function savePrintLayoutOverride(
  kind: PrintSectionKind,
  id: PrintSectionLayoutId,
  patch: Partial<PrintSectionLayoutTokens>,
) {
  const store = { ...loadPrintLayoutOverrides() };
  const key = overrideKey(kind, id);
  store[key] = { ...(store[key] ?? {}), ...patch };
  persist(store);
}

export function resetPrintLayoutOverride(kind: PrintSectionKind, id: PrintSectionLayoutId) {
  const store = { ...loadPrintLayoutOverrides() };
  delete store[overrideKey(kind, id)];
  persist(store);
}

export function subscribePrintLayoutOverrides(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function printLayoutIsCustomised(kind: PrintSectionKind, id: PrintSectionLayoutId): boolean {
  const patch = loadPrintLayoutOverrides()[overrideKey(kind, id)];
  return !!patch && Object.keys(patch).length > 0;
}

/** Shipped tokens + admin overrides for one layout. */
export function resolvePrintSectionLayout(
  kind: PrintSectionKind,
  id: PrintSectionLayoutId | undefined,
): { layout: PrintSectionLayout; tokens: PrintSectionLayoutTokens } {
  const list = printSectionLayouts(kind);
  const layout = list.find((l) => l.id === id) ?? list[0]!;
  const patch = loadPrintLayoutOverrides()[overrideKey(kind, layout.id)] ?? {};
  return { layout, tokens: { ...layout.tokens, ...patch } };
}

/** Normalised layout id for a section, defaulting to the family's first. */
export function printSectionLayoutId(section: PrintSection): PrintSectionLayoutId {
  const raw = (section as { sectionLayoutId?: string }).sectionLayoutId;
  return PRINT_SECTION_LAYOUT_IDS.includes(raw as PrintSectionLayoutId)
    ? (raw as PrintSectionLayoutId)
    : "layout-standard";
}

const PAGE_W = 816;
const cqu = (px: number) =>
  `calc(${((px * 100) / PAGE_W).toFixed(3)}cqw * var(--print-fit-scale, 1))`;

/** CSS custom properties the frame publishes for the stylesheet to consume. */
export function printSectionLayoutVars(tokens: PrintSectionLayoutTokens): Record<string, string> {
  return {
    "--ps-cols": String(Math.max(1, Math.round(tokens.cols))),
    "--ps-gap": cqu(tokens.gap),
    "--ps-pad": cqu(tokens.pad),
    // Modular sections already scale every dimension through --print-fit-scale,
    // so re-basing it scales the whole module proportionally on paper.
    "--print-fit-scale": `calc(var(--print-fit-scale, 1) * ${tokens.scale.toFixed(3)})`,
  };
}
