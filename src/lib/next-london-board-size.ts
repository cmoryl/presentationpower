// TransPerfect NEXT 2026 — London signage BOARD SIZE overrides.
//
// The kit ships the sizes transcribed from the venue print pack, but the boards
// that actually get built get measured on site. This store lets the location
// team type the real signboard width/height (and bleed per edge) for any panel;
// the print preview, the safe-area rules, the `.svg`/`.ai` masters and the pack
// manifest all read the resolved panel, so a corrected size prints correctly.
//
// Placement overrides are stored as fractions of the trim box, which is exactly
// why a resize keeps the lockup where the designer put it.

import { useSyncExternalStore } from "react";

import { rasterSizeFor, recommendedPpi, type LondonPanel } from "@/lib/next-london-signage";

export type LondonBoardSize = {
  /** Finished signboard width, in mm. */
  trimW: number;
  /** Finished signboard height, in mm. */
  trimH: number;
  /** Bleed per edge, in mm. */
  bleedEdge: number;
};

/** Accepted signboard bounds, shared with the editor UI. */
export const LONDON_BOARD_LIMITS = {
  trim: { min: 50, max: 12000 },
  bleed: { min: 0, max: 100 },
} as const;

export type LondonBoardSizeMap = Record<string, LondonBoardSize>;

const EMPTY_SIZES: LondonBoardSizeMap = {};
const STORAGE_KEY = "tp-next-london-board-size-v1";
const CHANNEL = "tp-next-london-board-size";

let sizes: LondonBoardSizeMap = {};
let hydrated = false;
const listeners = new Set<() => void>();

function clampSize(value: Partial<LondonBoardSize>, fallback: LondonBoardSize): LondonBoardSize {
  const num = (n: unknown, lo: number, hi: number, alt: number) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.round(Math.max(lo, Math.min(hi, n)) * 10) / 10
      : alt;
  return {
    trimW: num(value.trimW, LONDON_BOARD_LIMITS.trim.min, LONDON_BOARD_LIMITS.trim.max, fallback.trimW),
    trimH: num(value.trimH, LONDON_BOARD_LIMITS.trim.min, LONDON_BOARD_LIMITS.trim.max, fallback.trimH),
    bleedEdge: num(
      value.bleedEdge,
      LONDON_BOARD_LIMITS.bleed.min,
      LONDON_BOARD_LIMITS.bleed.max,
      fallback.bleedEdge,
    ),
  };
}

/** The kit's shipped size for a panel — the reset target. */
export function londonStockSize(panel: LondonPanel): LondonBoardSize {
  return { trimW: panel.trimW, trimH: panel.trimH, bleedEdge: panel.bleedEdge };
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as LondonBoardSizeMap;
    if (parsed && typeof parsed === "object") sizes = parsed;
  } catch {
    sizes = {};
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch {
    /* storage blocked — in-memory size still applies */
  }
  try {
    new BroadcastChannel(CHANNEL).postMessage({ sizes });
  } catch {
    /* no BroadcastChannel — same-tab listeners still fire */
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function londonBoardSizes(): LondonBoardSizeMap {
  hydrate();
  return sizes;
}

/** Set (or correct) the real board size for one panel. Partial patches merge. */
export function setLondonBoardSize(
  panel: LondonPanel,
  patch: Partial<LondonBoardSize>,
): LondonBoardSize {
  const stock = londonStockSize(panel);
  const next = clampSize({ ...(londonBoardSizes()[panel.id] ?? stock), ...patch }, stock);
  sizes = { ...londonBoardSizes(), [panel.id]: next };
  persist();
  emit();
  return next;
}

/** Drop the measured size so the panel returns to the shipped spec. */
export function resetLondonBoardSize(panelId: string): void {
  const current = londonBoardSizes();
  if (!(panelId in current)) return;
  const next = { ...current };
  delete next[panelId];
  sizes = next;
  persist();
  emit();
}

/**
 * Resolve a panel against its measured board size. Bleed box, raster tier and
 * packaged pixel size are all recomputed, so every downstream consumer (print
 * geometry, branding plan, SVG/AI masters, manifest) sees one truth.
 */
export function applyLondonBoardSize(
  panel: LondonPanel,
  map: LondonBoardSizeMap = londonBoardSizes(),
): LondonPanel {
  const override = map[panel.id];
  if (!override) return panel;
  const size = clampSize(override, londonStockSize(panel));
  if (
    size.trimW === panel.trimW &&
    size.trimH === panel.trimH &&
    size.bleedEdge === panel.bleedEdge
  ) {
    return panel;
  }
  const next: LondonPanel = {
    ...panel,
    trimW: size.trimW,
    trimH: size.trimH,
    bleedEdge: size.bleedEdge,
    bleedW: Math.round((size.trimW + size.bleedEdge * 2) * 10) / 10,
    bleedH: Math.round((size.trimH + size.bleedEdge * 2) * 10) / 10,
  };
  const ppi = recommendedPpi(next);
  const raster = rasterSizeFor(next, ppi);
  return {
    ...next,
    rasterPpi: ppi,
    rasterPx: `${raster.w}x${raster.h}`,
    rasterMb: Math.round(((raster.w * raster.h * 3) / 1024 / 1024) * 10) / 10,
  };
}

/** Resolve a whole list of panels. */
export function applyLondonBoardSizes(
  panels: LondonPanel[],
  map: LondonBoardSizeMap = londonBoardSizes(),
): LondonPanel[] {
  return panels.map((p) => applyLondonBoardSize(p, map));
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      const incoming = (event.data as { sizes?: LondonBoardSizeMap } | null)?.sizes;
      if (!incoming) return;
      sizes = incoming;
      emit();
    };
  } catch {
    channel = null;
  }
  return () => {
    listeners.delete(listener);
    channel?.close();
  };
}

/** React binding: re-renders whenever any measured board size changes. */
export function useLondonBoardSizes(): LondonBoardSizeMap {
  return useSyncExternalStore(subscribe, () => londonBoardSizes(), () => EMPTY_SIZES);
}
