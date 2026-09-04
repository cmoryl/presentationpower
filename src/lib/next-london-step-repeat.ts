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
import { londonVenueItemMeta, type LondonPanel } from "@/lib/next-london-signage";
import { londonSafeMm } from "@/lib/next-london-print-geometry";

/** What each repeated tile carries. */
export const STEP_REPEAT_KINDS = ["logo", "text", "logo-text", "logo-qr", "qr"] as const;
export type StepRepeatKind = (typeof STEP_REPEAT_KINDS)[number];

export const STEP_REPEAT_KIND_LABELS: Record<StepRepeatKind, string> = {
  logo: "Lockup only",
  text: "Wordmark text only",
  "logo-text": "Lockup + text rows",
  "logo-qr": "Lockup + QR rows",
  qr: "QR only",
};

export type StepRepeatConfig = {
  kind: StepRepeatKind;
  /** Lockup family (from the official EPS set). */
  familyId: string;
  colourway: NextLogoColourway;
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
  familyId: "transperfect",
  colourway: "white",
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
    familyId,
    colourway: available.includes(wanted) ? wanted : (available[0] ?? "white"),
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

/** Resolved wall recipe for a panel: stored override merged over the default. */
export function stepRepeatConfig(
  panelId: string,
  map: StepRepeatMap = stepRepeatConfigs(),
): StepRepeatConfig {
  const stored = map[panelId];
  return stored ? clampConfig(stored, DEFAULT_STEP_REPEAT) : DEFAULT_STEP_REPEAT;
}

export function setStepRepeatConfig(
  panelId: string,
  patch: Partial<StepRepeatConfig>,
): StepRepeatConfig {
  const next = clampConfig(patch, stepRepeatConfig(panelId));
  configs = { ...stepRepeatConfigs(), [panelId]: next };
  persist();
  emit();
  return next;
}

export function resetStepRepeatConfig(panelId: string): void {
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
  | { kind: "logo"; x: number; y: number; w: number; h: number; row: number; col: number }
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
  art: NextLogoArt;
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
  const art = picked.art;

  const logoW = config.tileWidthMm;
  const logoH = (art.h / Math.max(1, art.w)) * logoW;

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

  const tiles: StepRepeatTile[] = [];
  for (let row = 0; row < rows; row += 1) {
    const stagger = (row % 2 === 1 ? config.drop : 0) * pitchX;
    const cy = originY + row * pitchY;
    // Which content this row carries: mixed recipes alternate row by row so
    // no two identical rows ever sit adjacent.
    const rowKind: StepRepeatKind =
      config.kind === "logo-text"
        ? row % 2 === 1
          ? "text"
          : "logo"
        : config.kind === "logo-qr"
          ? row % 3 === 2 && code
            ? "qr"
            : "logo"
          : config.kind;
    for (let col = 0; col < cols; col += 1) {
      const cx = originX + col * pitchX + stagger;
      if (rowKind === "text") {
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
      } else if (rowKind === "qr" && code) {
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
        tiles.push({
          kind: "logo",
          x: cx + tileW / 2 - logoW / 2,
          y: cy + tileH / 2 - logoH / 2,
          w: logoW,
          h: logoH,
          row,
          col,
        });
      }
    }
  }

  const areaM2 = (panel.trimW / 1000) * (panel.trimH / 1000);
  return {
    config,
    art,
    orientation: picked.orientation,
    colourway: picked.colourway,
    qr: code ? { modules: code.size, path: code.path } : null,
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
  if (plan.config.drop < 0.2)
    out.push("Rows are nearly aligned — a subject can block a whole column. Use a 40–50% drop.");
  if (plan.pitchX > panel.trimW / 2.5)
    out.push("Fewer than ~3 marks across the wall: a tight crop may contain no whole mark.");
  if (plan.config.opacity < 0.4)
    out.push("Below 40% opacity the marks disappear under on-camera flash.");
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
  const logoScale = plan.config.tileWidthMm / Math.max(1, plan.art.w);

  const body = plan.tiles
    .map((tile) => {
      const spin = rot
        ? ` transform="rotate(${rot.toFixed(2)} ${(tile.x + tile.w / 2).toFixed(2)} ${(tile.y + tile.h / 2).toFixed(2)})"`
        : "";
      if (tile.kind === "logo") {
        const paths = plan.art.paths
          .map((p) => {
            const { paint, meta } = paintFor(p.fill);
            const rule = p.fillRule === "evenodd" ? ` fill-rule="evenodd"` : "";
            return `<path d="${p.d}" fill="${paint}"${rule}${meta}/>`;
          })
          .join("");
        return (
          `<g data-tile="logo" data-row="${tile.row}" data-col="${tile.col}"${spin}>` +
          `<g transform="translate(${tile.x.toFixed(2)} ${tile.y.toFixed(2)}) scale(${logoScale.toFixed(5)})">${paths}</g></g>`
        );
      }
      if (tile.kind === "text") {
        return (
          `<text data-tile="text" data-row="${tile.row}" data-col="${tile.col}"${spin}` +
          ` x="${(tile.x + tile.w / 2).toFixed(2)}" y="${(tile.y + tile.sizeMm).toFixed(2)}" text-anchor="middle"` +
          ` fill="${ink.paint}"${ink.meta} font-family="${options.fontStack}" font-weight="${options.fontWeight}"` +
          ` font-size="${tile.sizeMm.toFixed(2)}" letter-spacing="${(tile.sizeMm * options.tracking).toFixed(3)}">` +
          `${esc(plan.config.text)}</text>`
        );
      }
      if (!plan.qr) return "";
      const plate = paintFor("#FFFFFF");
      const dark = paintFor("#03002C");
      const scale = tile.w / plan.qr.modules;
      return (
        `<g data-tile="qr" data-row="${tile.row}" data-col="${tile.col}"${spin}>` +
        `<rect x="${tile.x.toFixed(2)}" y="${tile.y.toFixed(2)}" width="${tile.w.toFixed(2)}" height="${tile.h.toFixed(2)}"` +
        ` rx="${(tile.w * 0.04).toFixed(2)}" fill="${plate.paint}"${plate.meta}/>` +
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
    (plan.config.opacity < 1 ? ` opacity="${plan.config.opacity}"` : "") +
    `>${body}</g>`
  );
}
