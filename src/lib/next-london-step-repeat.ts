// TransPerfect NEXT 2026 — STEP & REPEAT WALL builder.
//
// A step-and-repeat (press / photo wall) is NOT a single signage panel with a
// gradient: it is a repeating tile grid of brand marks, sized and spaced so a
// mark reads whole in every phone crop, and staggered row-to-row (a "half drop")
// so a subject standing anywhere never blocks a whole column of logos.
//
// Trade practice this model follows:
//   • Mark width ~200–300 mm (8–12 in) on a wall shot at 2–3 m — big enough to
//     read in a press crop, small enough that a full mark survives a tight
//     portrait crop.
//   • Horizontal / vertical gaps roughly 40–60% of the mark width, so marks
//     never fuse into a texture and never island.
//   • Rows offset by half a pitch (drop 0.5) — the classic brick / half-drop
//     stagger. A subject's head occludes at most one mark per row.
//   • The pattern runs FULL BLEED. Nothing is centred, nothing is unique: any
//     crop of the wall is on-brand.
//   • The bottom band (~0–600 mm above floor) is behind people in every photo,
//     so it is never used for a "hero" element — the tile simply continues.
//
// Tiles can be a lockup, live Geist Bold text, a real scannable QR, or an
// alternating mix. Geometry is produced in mm in the panel's BLEED coordinate
// space, so the on-screen stage, the .svg master and the .ai master all draw
// the same wall.

import { useSyncExternalStore } from "react";

import { buildPillarQr } from "@/lib/pillar-qr";
import {
  nextLogoColourways,
  pickNextLogo,
  type NextLogoArt,
  type NextLogoColourway,
} from "@/lib/next-logo-vectors";
import {
  LONDON_PANELS,
  londonVenueItemMeta,
  type LondonPanel,
} from "@/lib/next-london-signage";

import { londonSafeMm } from "@/lib/next-london-print-geometry";
import {
  clearLondonOverrideCleared,
  markLondonOverrideCleared,
} from "@/lib/next-london-override-clears";

/** What each repeated tile carries. */
export const STEP_REPEAT_KINDS = ["logo", "text", "logo-text", "logo-qr", "qr"] as const;
export type StepRepeatKind = (typeof STEP_REPEAT_KINDS)[number];

export const STEP_REPEAT_KIND_LABELS: Record<StepRepeatKind, string> = {
  logo: "Lockup only",
  text: "Wordmark text only",
  "logo-text": "Lockup + text",
  "logo-qr": "Lockup + QR",
  qr: "QR only",
};

/**
 * How a mixed recipe distributes its second element (text or QR) through the
 * lockup field. Row banding used to be hardcoded at "two logo rows, one QR row",
 * which reads as a stripe rather than a pattern.
 */
export const STEP_REPEAT_MIXES = ["checker", "rows", "columns", "accent"] as const;
export type StepRepeatMix = (typeof STEP_REPEAT_MIXES)[number];
export const STEP_REPEAT_MIX_LABELS: Record<StepRepeatMix, string> = {
  checker: "Checkerboard",
  rows: "Alternating rows",
  columns: "Alternating columns",
  accent: "Sparse accent",
};
export const STEP_REPEAT_MIX_NOTES: Record<StepRepeatMix, string> = {
  checker: "Every other mark swaps — the most even mix in any crop.",
  rows: "One lockup row, one second row, all the way down.",
  columns: "Vertical banding — lockup column, second column.",
  accent: "Mostly lockups with an occasional second mark.",
};

/** Lockup pool: one family, or the full division set rotated through the grid. */
export const STEP_REPEAT_LOGO_SETS = ["single", "divisions"] as const;
export type StepRepeatLogoSet = (typeof STEP_REPEAT_LOGO_SETS)[number];
export const STEP_REPEAT_LOGO_SET_LABELS: Record<StepRepeatLogoSet, string> = {
  single: "One lockup",
  divisions: "All division lockups",
};

/** Division lockups used by the "all divisions" wall, in approved order. */
export const STEP_REPEAT_DIVISION_FAMILIES = [
  "transperfect",
  "globallink",
  "dataforce",
  "digital",
  "experience",
  "finance",
  "games",
  "learn",
  "legal",
  "lifesci",
  "media",
] as const;

export type StepRepeatConfig = {
  kind: StepRepeatKind;
  /** How a mixed recipe spreads its second element through the field. */
  mix: StepRepeatMix;
  /** One lockup, or the whole division set rotated through the grid. */
  logoSet: StepRepeatLogoSet;
  /** Lockup family (from the official EPS set). */
  familyId: string;
  colourway: NextLogoColourway;
  /**
   * Optional SECOND lockup colourway. When set (and different to `colourway`),
   * the field alternates between the two colour versions of the same marks —
   * a richer wall without changing the lockup itself. `none` = one colourway.
   */
  colourwayB: NextLogoColourway | "none";
  /** How the two colourways spread through the field. */
  colourMix: StepRepeatColourMix;
  /** Lockup orientation; `auto` follows the mark's own aspect. */
  orientation: "auto" | "stacked" | "side";
  /** Mark width, in mm — the size the trade spec is written in. */
  tileWidthMm: number;
  /** Horizontal gap between marks, as a fraction of the mark width. */
  gapX: number;
  /** Vertical gap between rows, as a fraction of the mark height. */
  gapY: number;
  /** Row-to-row stagger, as a fraction of the horizontal pitch (0.5 = half drop). */
  drop: number;
  /** Tile rotation, in degrees (−45…45). */
  rotationDeg: number;
  /** Tile opacity (0.15…1) — a knocked-back wall still reads on camera. */
  opacity: number;
  /** Live text used by the text rows. */
  text: string;
  /** QR payload used by the QR rows; empty disables the QR rows. */
  qrData: string;
  /** Dark-module colour of the repeated QR. */
  qrInkHex: string;
  /** Plate (quiet-zone) colour behind the code; `none` prints the code bare. */
  qrPlateHex: string;
  /** Module geometry: hard squares scan best, dots/rounded read softer. */
  qrModuleShape: StepRepeatQrModuleShape;
  /** Plate silhouette behind the code. */
  qrPlateShape: StepRepeatQrPlateShape;
};

export const STEP_REPEAT_COLOUR_MIXES = ["checker", "rows", "columns"] as const;
export type StepRepeatColourMix = (typeof STEP_REPEAT_COLOUR_MIXES)[number];
export const STEP_REPEAT_COLOUR_MIX_LABELS: Record<StepRepeatColourMix, string> = {
  checker: "Checkerboard",
  rows: "Alternating rows",
  columns: "Alternating columns",
};

export const STEP_REPEAT_QR_MODULE_SHAPES = ["square", "rounded", "dot"] as const;
export type StepRepeatQrModuleShape = (typeof STEP_REPEAT_QR_MODULE_SHAPES)[number];
export const STEP_REPEAT_QR_MODULE_LABELS: Record<StepRepeatQrModuleShape, string> = {
  square: "Square",
  rounded: "Rounded",
  dot: "Dot",
};

export const STEP_REPEAT_QR_PLATE_SHAPES = ["square", "rounded", "circle", "none"] as const;
export type StepRepeatQrPlateShape = (typeof STEP_REPEAT_QR_PLATE_SHAPES)[number];
export const STEP_REPEAT_QR_PLATE_LABELS: Record<StepRepeatQrPlateShape, string> = {
  square: "Square plate",
  rounded: "Rounded plate",
  circle: "Circle plate",
  none: "No plate",
};

/** Approved brand inks a repeated code may print in. */
export const STEP_REPEAT_QR_SWATCHES: { hex: string; label: string }[] = [
  { hex: "#03002C", label: "Blue 800" },
  { hex: "#003FC7", label: "Blue 500" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#E0E8F5", label: "Blue white" },
  { hex: "#A1FBF9", label: "Aqua" },
  { hex: "#C2A3FF", label: "Lavender" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const normHex = (v: unknown, alt: string): string =>
  typeof v === "string" && HEX_RE.test(v.trim()) ? v.trim().toUpperCase() : alt;

export const STEP_REPEAT_LIMITS = {
  tileWidthMm: { min: 60, max: 900, step: 5 },
  gap: { min: 0.1, max: 1.5, step: 0.05 },
  drop: { min: 0, max: 0.9, step: 0.05 },
  rotationDeg: { min: -45, max: 45, step: 1 },
  opacity: { min: 0.15, max: 1, step: 0.05 },
  textMaxChars: 42,
  qrMaxChars: 300,
} as const;

export const DEFAULT_STEP_REPEAT: StepRepeatConfig = {
  kind: "logo-text",
  mix: "checker",
  logoSet: "single",
  familyId: "transperfect",
  colourway: "white",
  colourwayB: "none",
  colourMix: "checker",
  orientation: "auto",
  // 260 mm ≈ 10.2 in — the middle of the standard press-wall mark range.
  tileWidthMm: 260,
  gapX: 0.5,
  gapY: 0.55,
  drop: 0.5,
  rotationDeg: 0,
  opacity: 1,
  text: "TRANSPERFECT NEXT",
  qrData: "",
  qrInkHex: "#03002C",
  qrPlateHex: "#FFFFFF",
  qrModuleShape: "square",
  qrPlateShape: "rounded",
};


/** Is this panel a step-and-repeat / photo wall? */
export function isStepRepeatPanel(panel: LondonPanel): boolean {
  const note = londonVenueItemMeta(panel)?.note ?? "";
  return /step\s*&?\s*repeat|photo\s*wall|press\s*wall/i.test(
    `${panel.room} ${panel.name} ${note}`,
  );
}

// ── Store ────────────────────────────────────────────────────────────────────

export type StepRepeatMap = Record<string, StepRepeatConfig>;

const EMPTY: StepRepeatMap = {};
const STORAGE_KEY = "tp-next-london-step-repeat-v1";
const CHANNEL = "tp-next-london-step-repeat";

let configs: StepRepeatMap = {};
let hydrated = false;
const listeners = new Set<() => void>();

const clampNum = (n: unknown, lo: number, hi: number, alt: number): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : alt;

function clampConfig(patch: Partial<StepRepeatConfig>, base: StepRepeatConfig): StepRepeatConfig {
  const L = STEP_REPEAT_LIMITS;
  const kind = STEP_REPEAT_KINDS.includes(patch.kind as StepRepeatKind)
    ? (patch.kind as StepRepeatKind)
    : base.kind;
  const familyId = typeof patch.familyId === "string" ? patch.familyId : base.familyId;
  const available = nextLogoColourways(familyId);
  const wanted = patch.colourway ?? base.colourway;
  return {
    kind,
    mix: STEP_REPEAT_MIXES.includes(patch.mix as StepRepeatMix)
      ? (patch.mix as StepRepeatMix)
      : (base.mix ?? DEFAULT_STEP_REPEAT.mix),
    logoSet: STEP_REPEAT_LOGO_SETS.includes(patch.logoSet as StepRepeatLogoSet)
      ? (patch.logoSet as StepRepeatLogoSet)
      : (base.logoSet ?? DEFAULT_STEP_REPEAT.logoSet),
    familyId,
    colourway: available.includes(wanted) ? wanted : (available[0] ?? "white"),
    colourwayB: (() => {
      const wantedB = patch.colourwayB ?? base.colourwayB ?? "none";
      if (wantedB === "none") return "none";
      return available.includes(wantedB as NextLogoColourway)
        ? (wantedB as NextLogoColourway)
        : "none";
    })(),
    colourMix: STEP_REPEAT_COLOUR_MIXES.includes(patch.colourMix as StepRepeatColourMix)
      ? (patch.colourMix as StepRepeatColourMix)
      : (base.colourMix ?? DEFAULT_STEP_REPEAT.colourMix),
    orientation:
      patch.orientation === "stacked" ||
      patch.orientation === "side" ||
      patch.orientation === "auto"
        ? patch.orientation
        : base.orientation,
    tileWidthMm: clampNum(
      patch.tileWidthMm,
      L.tileWidthMm.min,
      L.tileWidthMm.max,
      base.tileWidthMm,
    ),
    gapX: clampNum(patch.gapX, L.gap.min, L.gap.max, base.gapX),
    gapY: clampNum(patch.gapY, L.gap.min, L.gap.max, base.gapY),
    drop: clampNum(patch.drop, L.drop.min, L.drop.max, base.drop),
    rotationDeg: clampNum(
      patch.rotationDeg,
      L.rotationDeg.min,
      L.rotationDeg.max,
      base.rotationDeg,
    ),
    opacity: clampNum(patch.opacity, L.opacity.min, L.opacity.max, base.opacity),
    text: (typeof patch.text === "string" ? patch.text : base.text)
      .slice(0, L.textMaxChars)
      .toUpperCase(),
    qrData: (typeof patch.qrData === "string" ? patch.qrData : base.qrData).slice(0, L.qrMaxChars),
    qrInkHex: normHex(patch.qrInkHex, base.qrInkHex ?? DEFAULT_STEP_REPEAT.qrInkHex),
    qrPlateHex:
      patch.qrPlateHex === "none"
        ? "none"
        : normHex(patch.qrPlateHex, base.qrPlateHex ?? DEFAULT_STEP_REPEAT.qrPlateHex),
    qrModuleShape: STEP_REPEAT_QR_MODULE_SHAPES.includes(
      patch.qrModuleShape as StepRepeatQrModuleShape,
    )
      ? (patch.qrModuleShape as StepRepeatQrModuleShape)
      : (base.qrModuleShape ?? DEFAULT_STEP_REPEAT.qrModuleShape),
    qrPlateShape: STEP_REPEAT_QR_PLATE_SHAPES.includes(patch.qrPlateShape as StepRepeatQrPlateShape)
      ? (patch.qrPlateShape as StepRepeatQrPlateShape)
      : (base.qrPlateShape ?? DEFAULT_STEP_REPEAT.qrPlateShape),

  };
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StepRepeatMap;
    if (parsed && typeof parsed === "object") configs = parsed;
  } catch {
    configs = {};
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    /* storage blocked — in-memory config still applies */
  }
  try {
    new BroadcastChannel(CHANNEL).postMessage({ configs });
  } catch {
    /* no BroadcastChannel — same-tab listeners still fire */
  }
}

const emit = () => {
  for (const l of listeners) l();
};

export function stepRepeatConfigs(): StepRepeatMap {
  hydrate();
  return configs;
}

/**
 * Shipped recipes for walls whose approved look is not the house default.
 * Matched on the sign name so a copy ("… VERSION B") inherits the same look.
 */
const PANEL_NAME_DEFAULTS: { test: RegExp; config: Partial<StepRepeatConfig> }[] = [
  {
    // Full-colour division lockup wall: every division NEXT mark, stacked,
    // rotated through a half-drop grid on the near-white ground.
    test: /COLOUR LOCKUPS/i,
    config: {
      kind: "logo",
      logoSet: "divisions",
      familyId: "transperfect",
      colourway: "color",
      orientation: "stacked",
      tileWidthMm: 230,
      gapX: 0.6,
      gapY: 0.65,
      drop: 0.5,
      opacity: 1,
    },
  },
];

/** The recipe a wall ships with, before any saved edit. */
export function stepRepeatPanelDefault(panelId: string): StepRepeatConfig {
  const panel = LONDON_PANELS.find((p) => p.id === panelId);
  const hit = panel ? PANEL_NAME_DEFAULTS.find((d) => d.test.test(panel.name)) : undefined;
  return hit ? clampConfig(hit.config, DEFAULT_STEP_REPEAT) : DEFAULT_STEP_REPEAT;
}

/** Resolved wall recipe for a panel: stored override merged over the default. */
export function stepRepeatConfig(
  panelId: string,
  map: StepRepeatMap = stepRepeatConfigs(),
): StepRepeatConfig {
  const base = stepRepeatPanelDefault(panelId);
  const stored = map[panelId];
  return stored ? clampConfig(stored, base) : base;
}


/**
 * A stored/snapshotted recipe made whole again: missing or out-of-range fields
 * fall back to the shipped default. A revision saved before a field existed must
 * never silently drop artwork (a QR wall exporting logo-only, for instance).
 */
export function clampStepRepeatConfig(config: Partial<StepRepeatConfig>): StepRepeatConfig {
  return clampConfig(config, DEFAULT_STEP_REPEAT);
}

export function setStepRepeatConfig(
  panelId: string,
  patch: Partial<StepRepeatConfig>,
): StepRepeatConfig {
  const next = clampConfig(patch, stepRepeatConfig(panelId));
  configs = { ...stepRepeatConfigs(), [panelId]: next };
  clearLondonOverrideCleared("stepRepeat", panelId);
  persist();
  emit();
  return next;
}

export function resetStepRepeatConfig(panelId: string): void {
  markLondonOverrideCleared("stepRepeat", panelId);
  const current = stepRepeatConfigs();
  if (!(panelId in current)) return;
  const next = { ...current };
  delete next[panelId];
  configs = next;
  persist();
  emit();
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      const incoming = (event.data as { configs?: StepRepeatMap } | null)?.configs;
      if (!incoming) return;
      configs = incoming;
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

/** React binding: re-renders whenever any wall recipe changes. */
export function useStepRepeatConfigs(): StepRepeatMap {
  return useSyncExternalStore(subscribe, stepRepeatConfigs, () => EMPTY);
}

// ── Geometry ─────────────────────────────────────────────────────────────────

export type StepRepeatTile =
  | {
      kind: "logo";
      x: number;
      y: number;
      w: number;
      h: number;
      row: number;
      col: number;
      /** Index into `plan.arts` — which lockup this tile carries. */
      artIndex: number;
    }
  | {
      kind: "text";
      x: number;
      y: number;
      w: number;
      h: number;
      row: number;
      col: number;
      sizeMm: number;
    }
  | {
      kind: "qr";
      x: number;
      y: number;
      w: number;
      h: number;
      row: number;
      col: number;
    };

export type StepRepeatPlan = {
  config: StepRepeatConfig;
  /** First lockup in the pool — the wall's primary mark. */
  art: NextLogoArt;
  /** Every lockup the wall rotates through (one entry for a single-mark wall). */
  arts: NextLogoArt[];
  /** Family id per entry of `arts`, for the spec readout. */
  artFamilies: string[];
  orientation: "stacked" | "side";
  colourway: NextLogoColourway;
  /** QR module geometry, when the recipe carries a code. */
  qr: {
    modules: number;
    path: string;
    inkHex: string;
    /** `null` when the recipe prints the code with no plate behind it. */
    plateHex: string | null;
    plateShape: StepRepeatQrPlateShape;
  } | null;

  /** Ink colour for text tiles. */
  inkHex: string;
  tiles: StepRepeatTile[];
  /** Pitch between tile origins, in mm. */
  pitchX: number;
  pitchY: number;
  /** Nominal tile box, in mm. */
  tileW: number;
  tileH: number;
  cols: number;
  rows: number;
  /** Marks per square metre of finished wall — the sponsor-visibility number. */
  marksPerM2: number;
  /** Safe inset used for the "mark never lands in a cut" check, in mm. */
  safeMm: number;
};

const MM_PER_IN = 25.4;

/** mm → inches. */
export const mmToIn = (mm: number): number => mm / MM_PER_IN;

/** `1200 mm (47.24 in)` — the shared dual-unit readout for every asset spec. */
export function dimText(mm: number, digits = 2): string {
  return `${round1(mm)} mm (${mmToIn(mm).toFixed(digits)} in)`;
}

/** `3000 × 2400 mm (118.11 × 94.49 in)`. */
export function sizeText(wMm: number, hMm: number, digits = 2): string {
  return (
    `${round1(wMm)} × ${round1(hMm)} mm ` +
    `(${mmToIn(wMm).toFixed(digits)} × ${mmToIn(hMm).toFixed(digits)} in)`
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const textRunMm = (text: string, sizeMm: number) => Math.max(1, text.length * sizeMm * 0.62);

/**
 * Dark-module geometry in module units, in the requested shape. Squares are the
 * scanner-safe default; rounded and dot styles shrink each module slightly, which
 * every reader tolerates because the sampling point is the module centre.
 */
export function stepRepeatQrPath(
  qr: { size: number; modules: boolean[]; path: string },
  shape: StepRepeatQrModuleShape,
): string {
  if (shape === "square") return qr.path;
  const parts: string[] = [];
  const r = shape === "dot" ? 0.46 : 0.22;
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (!qr.modules[y * qr.size + x]) continue;
      if (shape === "dot") {
        // Circle as two arcs, so the geometry survives the PDF path converter.
        const cx = x + 0.5;
        const cy = y + 0.5;
        parts.push(
          `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}A${r} ${r} 0 0 1 ${cx - r} ${cy}z`,
        );
      } else {
        parts.push(
          `M${x + r} ${y}h${1 - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${1 - 2 * r}` +
            `a${r} ${r} 0 0 1 ${-r} ${r}h${-(1 - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
            `v${-(1 - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`,
        );
      }
    }
  }
  return parts.join("");
}


/**
 * Does the tile at (row, col) carry the recipe's SECOND element? Mixed recipes
 * used to band rows 2:1, which printed as stripes; each mix below spreads the
 * second mark evenly so any photo crop holds both.
 */
export function stepRepeatTileIsSecondary(mix: StepRepeatMix, row: number, col: number): boolean {
  switch (mix) {
    case "rows":
      return row % 2 === 1;
    case "columns":
      return col % 2 === 1;
    case "accent":
      return row % 2 === 1 && (col + Math.floor(row / 2)) % 3 === 1;
    case "checker":
    default:
      return (row + col) % 2 === 1;
  }
}


/**
 * Lay the wall out. Tiles are generated with one row/column of overscan on every
 * side, so the pattern truly bleeds off all four edges instead of stopping at
 * the artboard.
 */
export function stepRepeatPlan(panel: LondonPanel, config: StepRepeatConfig): StepRepeatPlan {
  const wantSide =
    config.orientation === "side"
      ? 99
      : config.orientation === "stacked"
        ? 0
        : panel.trimW / Math.max(1, panel.trimH);
  const picked = pickNextLogo(config.familyId, wantSide, config.colourway);

  // Lockup pool. "All divisions" rotates every division mark through the field
  // so one wall carries the whole house; a single-mark wall has one entry.
  const families =
    config.logoSet === "divisions"
      ? Array.from(
          new Set([
            config.familyId,
            ...STEP_REPEAT_DIVISION_FAMILIES.filter((id) => id !== config.familyId),
          ]),
        )
      : [config.familyId];
  const pool = families.map((id) => {
    const p = pickNextLogo(id, wantSide, config.colourway);
    return { familyId: id, art: p.art };
  });
  const arts = pool.map((entry) => entry.art);
  const art = arts[0] ?? picked.art;

  const logoW = config.tileWidthMm;
  // Every mark shares one width, so the tallest lockup in the pool sets the row
  // box — otherwise a tall division mark would collide with the row above it.
  const logoHeights = arts.map((a) => (a.h / Math.max(1, a.w)) * logoW);
  const logoH = Math.max(...logoHeights);

  const usesText = config.kind === "text" || config.kind === "logo-text";
  const usesQr = (config.kind === "qr" || config.kind === "logo-qr") && !!config.qrData.trim();
  const code = usesQr ? buildPillarQr(config.qrData) : null;

  // Text and QR tiles are sized against the mark so every row shares one pitch.
  const textSize = Math.max(8, logoH * (picked.orientation === "side" ? 0.6 : 0.32));
  const qrSize = Math.min(logoW, logoH * 1.6);

  const tileW = Math.max(
    logoW,
    usesText ? Math.min(logoW * 1.6, textRunMm(config.text, textSize)) : 0,
  );
  const tileH = Math.max(logoH, usesText ? textSize * 1.25 : 0, code ? qrSize : 0);

  const pitchX = tileW * (1 + config.gapX);
  // Row pitch floor: a side-by-side lockup is short and wide, and pitching rows
  // off its height alone stacks them into a dense stripe that reads as texture
  // on camera. Rows never sit closer than 45% of the mark width.
  const pitchY = Math.max(tileH * (1 + config.gapY), tileW * 0.45);

  const cols = Math.ceil(panel.bleedW / pitchX) + 2;
  const rows = Math.ceil(panel.bleedH / pitchY) + 2;

  // Centre the field on the bleed box, then step outward — a symmetric wall
  // crops cleanly whichever half the photographer frames.
  const originX = panel.bleedW / 2 - ((cols - 1) * pitchX) / 2;
  const originY = panel.bleedH / 2 - ((rows - 1) * pitchY) / 2;

  const secondary: StepRepeatKind | null =
    config.kind === "logo-text" ? "text" : config.kind === "logo-qr" && code ? "qr" : null;

  const tiles: StepRepeatTile[] = [];
  for (let row = 0; row < rows; row += 1) {
    const stagger = (row % 2 === 1 ? config.drop : 0) * pitchX;
    const cy = originY + row * pitchY;
    for (let col = 0; col < cols; col += 1) {
      const cx = originX + col * pitchX + stagger;
      const tileKind: StepRepeatKind = secondary
        ? stepRepeatTileIsSecondary(config.mix, row, col)
          ? secondary
          : "logo"
        : config.kind;
      if (tileKind === "text") {
        const w = textRunMm(config.text, textSize);
        tiles.push({
          kind: "text",
          x: cx + tileW / 2 - w / 2,
          y: cy + tileH / 2 - textSize / 2,
          w,
          h: textSize * 1.2,
          row,
          col,
          sizeMm: textSize,
        });
      } else if (tileKind === "qr" && code) {
        tiles.push({
          kind: "qr",
          x: cx + tileW / 2 - qrSize / 2,
          y: cy + tileH / 2 - qrSize / 2,
          w: qrSize,
          h: qrSize,
          row,
          col,
        });
      } else {
        // Rotate the pool diagonally, so the same mark never sits side by side
        // or directly above itself.
        const artIndex = arts.length > 1 ? (col + row * 3) % arts.length : 0;
        const h = (arts[artIndex]!.h / Math.max(1, arts[artIndex]!.w)) * logoW;
        tiles.push({
          kind: "logo",
          x: cx + tileW / 2 - logoW / 2,
          y: cy + tileH / 2 - h / 2,
          w: logoW,
          h,
          row,
          col,
          artIndex,
        });
      }
    }
  }

  const areaM2 = (panel.trimW / 1000) * (panel.trimH / 1000);
  return {
    config,
    art,
    arts,
    artFamilies: pool.map((entry) => entry.familyId),
    orientation: picked.orientation,
    colourway: picked.colourway,
    qr: code
      ? {
          modules: code.size,
          path: stepRepeatQrPath(code, config.qrModuleShape),
          inkHex: config.qrInkHex,
          plateHex: config.qrPlateShape === "none" || config.qrPlateHex === "none"
            ? null
            : config.qrPlateHex,
          plateShape: config.qrPlateShape,
        }
      : null,

    inkHex: picked.colourway === "dblue" ? "#03002C" : "#FFFFFF",
    tiles,
    pitchX,
    pitchY,
    tileW,
    tileH,
    cols,
    rows,
    marksPerM2: areaM2 > 0 ? Math.round((tiles.length / areaM2) * 10) / 10 : 0,
    safeMm: londonSafeMm(panel),
  };
}

/** Human-readable spec line for the wall, in both units. */
export function stepRepeatSummary(panel: LondonPanel, plan: StepRepeatPlan): string {
  return [
    `${sizeText(panel.trimW, panel.trimH)} finished wall`,
    `mark ${dimText(plan.config.tileWidthMm)} wide`,
    `pitch ${dimText(plan.pitchX)} × ${dimText(plan.pitchY)}`,
    `${Math.round(plan.config.drop * 100)}% row drop`,
    `${plan.tiles.length} marks · ${plan.marksPerM2}/m²`,
  ].join(" · ");
}

/** Relative luminance of a hex colour, 0 (black) – 1 (white). */
function hexLuminance(hex: string): number {
  const v = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
}

/**
 * Reasons the QR tiles on this wall would not scan off the printed panel.
 *
 * Anything listed here means a dead code at the event, so it blocks the
 * download rather than shipping quietly: a wall printed with unscannable codes
 * is a wasted print run.
 */
export function stepRepeatQrScanBlockers(plan: StepRepeatPlan): string[] {
  const config = plan.config;
  const wantsQr = config.kind === "qr" || config.kind === "logo-qr";
  if (!wantsQr) return [];
  const out: string[] = [];
  if (!plan.qr) {
    out.push("This wall asks for QR tiles but no link is set, so no code would print.");
    return out;
  }
  const plate = plan.qr.plateHex;
  if (!plate) {
    // The wall ground is a live gradient, so a code sitting straight on it has
    // no quiet zone and no guaranteed light/dark split.
    out.push(
      "The code has no plate behind it — on a gradient wall a reader has no quiet zone and cannot lock on. Add a white plate.",
    );
  } else if (Math.abs(hexLuminance(plan.qr.inkHex) - hexLuminance(plate)) < 0.4) {
    out.push(
      "Code colour and plate colour are too close in value — a phone camera cannot separate the modules.",
    );
  }
  return out;
}

/** Trade-practice warnings for a wall recipe. */
export function stepRepeatWarnings(panel: LondonPanel, plan: StepRepeatPlan): string[] {
  const out: string[] = [];
  const inW = mmToIn(plan.config.tileWidthMm);
  if (inW < 6)
    out.push(`Mark is ${inW.toFixed(1)} in wide — under 6 in it stops reading in a press crop.`);
  if (inW > 16)
    out.push(`Mark is ${inW.toFixed(1)} in wide — over 16 in a portrait crop can cut it in half.`);
  if (plan.config.gapX < 0.25 || plan.config.gapY < 0.25)
    out.push("Gaps under 25% of the mark fuse the wall into a texture on camera.");
  for (const blocker of stepRepeatQrScanBlockers(plan)) out.push(`WILL NOT SCAN: ${blocker}`);
  if (plan.config.drop < 0.2)
    out.push("Rows are nearly aligned — a subject can block a whole column. Use a 40–50% drop.");
  if (plan.pitchX > panel.trimW / 2.5)
    out.push("Fewer than ~3 marks across the wall: a tight crop may contain no whole mark.");
  if (plan.config.opacity < 0.4)
    out.push("Below 40% opacity the marks disappear under on-camera flash.");
  if (plan.qr) {
    // A reader needs a clear light/dark split between modules and their ground.
    const lum = (hex: string) => {
      const v = hex.replace("#", "");
      const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    const ground = plan.qr.plateHex ?? (plan.inkHex === "#03002C" ? "#FFFFFF" : "#03002C");
    if (Math.abs(lum(plan.qr.inkHex) - lum(ground)) < 0.4)
      out.push("QR colour and its plate are too close in value — phones will fail to scan it.");
    if (plan.config.qrModuleShape === "dot" && mmToIn(plan.config.tileWidthMm) < 8)
      out.push("Dot modules on a mark under 8 in wide lose scan reliability — use square modules.");
  }

  return out;
}

// ── Vector output ────────────────────────────────────────────────────────────

const esc = (s: string) =>
  s.replace(/[<>&"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;",
  );

export type StepRepeatSvgOptions = {
  /** Paint mapper so CMYK masters can carry their press build. */
  paintFor?: (hex: string) => { paint: string; meta: string };
  fontStack: string;
  fontWeight: number;
  tracking: number;
  /**
   * Outliner for text tiles: returns SVG path data (mm, anchored centre) for a
   * run of copy. Text tiles ship as outlines so a vendor machine without Geist
   * cannot substitute a face and shift the wall.
   */
  outline?: (text: string, sizeMm: number, x: number, y: number) => { d: string };
  /** Name of the face the outlines came from, recorded as metadata. */
  faceName?: string;
  /**
   * Clip path id for the bleed box. The field is generated with a row and column
   * of overscan so the pattern bleeds off every edge; without this clip those
   * marks sit loose on the Illustrator canvas outside the artboard.
   */
  clipId?: string;
};

/**
 * The wall as ONE Illustrator layer of live objects: every mark is a real path
 * group, every text tile a re-typeable text object, every QR real vector
 * modules. Nothing is rasterised and nothing is flattened into the ground.
 */
export function stepRepeatSvgLayer(
  panel: LondonPanel,
  plan: StepRepeatPlan,
  options: StepRepeatSvgOptions,
): string {
  const paintFor = options.paintFor ?? ((hex: string) => ({ paint: hex, meta: "" }));
  const rot = plan.config.rotationDeg;
  const ink = paintFor(plan.inkHex);
  const body = plan.tiles
    .map((tile) => {
      const spin = rot
        ? ` transform="rotate(${rot.toFixed(2)} ${(tile.x + tile.w / 2).toFixed(2)} ${(tile.y + tile.h / 2).toFixed(2)})"`
        : "";
      if (tile.kind === "logo") {
        const tileArt = plan.arts[tile.artIndex] ?? plan.art;
        const logoScale = plan.config.tileWidthMm / Math.max(1, tileArt.w);
        const paths = tileArt.paths
          .map((p) => {
            const { paint, meta } = paintFor(p.fill);
            const rule = p.fillRule === "evenodd" ? ` fill-rule="evenodd"` : "";
            return `<path d="${p.d}" fill="${paint}"${rule}${meta}/>`;
          })
          .join("");
        return (
          `<g data-tile="logo" data-row="${tile.row}" data-col="${tile.col}"` +
          ` data-family="${esc(plan.artFamilies[tile.artIndex] ?? plan.config.familyId)}"${spin}>` +
          `<g transform="translate(${tile.x.toFixed(2)} ${tile.y.toFixed(2)}) scale(${logoScale.toFixed(5)})">${paths}</g></g>`
        );
      }
      if (tile.kind === "text") {
        if (!options.outline) return "";
        const run = options.outline(
          plan.config.text,
          tile.sizeMm,
          tile.x + tile.w / 2,
          tile.y + tile.sizeMm,
        );
        return (
          `<path data-tile="text" data-row="${tile.row}" data-col="${tile.col}"${spin}` +
          ` d="${run.d}" data-text="${esc(plan.config.text)}"` +
          ` data-font="${esc(options.faceName ?? options.fontStack)}"` +
          ` data-size-mm="${tile.sizeMm.toFixed(2)}"` +
          ` fill="${ink.paint}"${ink.meta}/>`
        );
      }
      if (!plan.qr) return "";
      const dark = paintFor(plan.qr.inkHex);
      const scale = tile.w / plan.qr.modules;
      let plateEl = "";
      if (plan.qr.plateHex) {
        const plate = paintFor(plan.qr.plateHex);
        if (plan.qr.plateShape === "circle") {
          // The circle must fully contain the code, so it takes the diagonal.
          plateEl =
            `<circle cx="${(tile.x + tile.w / 2).toFixed(2)}" cy="${(tile.y + tile.h / 2).toFixed(2)}"` +
            ` r="${((tile.w * Math.SQRT2) / 2).toFixed(2)}" fill="${plate.paint}"${plate.meta}/>`;
        } else {
          const rx = plan.qr.plateShape === "rounded" ? tile.w * 0.08 : 0;
          // A rounded plate cuts into the code's quiet zone at the corners, so
          // the plate is inflated by that bite — a scanner always sees four
          // clear light modules around the matrix.
          const pad = rx * 0.3;
          plateEl =
            `<rect x="${(tile.x - pad).toFixed(2)}" y="${(tile.y - pad).toFixed(2)}" width="${(tile.w + pad * 2).toFixed(2)}" height="${(tile.h + pad * 2).toFixed(2)}"` +
            (rx ? ` rx="${rx.toFixed(2)}"` : "") +
            ` fill="${plate.paint}"${plate.meta}/>`;
        }
      }
      return (
        `<g data-tile="qr" data-row="${tile.row}" data-col="${tile.col}"` +
        ` data-qr-ink="${plan.qr.inkHex}" data-qr-plate="${plan.qr.plateHex ?? "none"}"` +
        ` data-qr-module="${plan.config.qrModuleShape}"${spin}>` +
        plateEl +
        `<g transform="translate(${tile.x.toFixed(2)} ${tile.y.toFixed(2)}) scale(${scale.toFixed(5)})">` +
        `<path d="${plan.qr.path}" fill="${dark.paint}"${dark.meta}/></g></g>`
      );

    })
    .join("");

  return (
    `<g id="step-repeat" data-layer="step-repeat" data-layer-order="1"` +
    ` data-kind="${plan.config.kind}" data-family="${plan.config.familyId}"` +
    ` data-colourway="${plan.colourway}" data-mark-mm="${plan.config.tileWidthMm}"` +
    ` data-pitch-mm="${plan.pitchX.toFixed(2)}x${plan.pitchY.toFixed(2)}"` +
    ` data-drop="${plan.config.drop}" data-marks="${plan.tiles.length}"` +
    ` data-source="${esc(plan.art.source)}"` +
    (options.clipId ? ` clip-path="url(#${options.clipId})"` : "") +
    (plan.config.opacity < 1 ? ` opacity="${plan.config.opacity}"` : "") +
    `>${body}</g>`
  );
}
