// TransPerfect NEXT 2026 — London signage SPEC REVISION ENGINE.
//
// The venue team re-issues panel measurements during build-up: a column grows a
// bleed, a fascia is re-cut, a room swaps its gradient. This module is the
// deterministic core of that workflow:
//
//   1. edits            — field-level changes against a base panel set
//   2. derive           — recompute everything downstream (bleed box, raster
//                         pixel size, ppi tier, dither band width, file weight)
//   3. diff             — a field-level change list, human readable
//   4. regeneration plan — which panels need new VECTOR (.ai/.svg), which need
//                         only a new RASTER, which are metadata-only
//   5. regenerate       — rebuild the vector artwork from the spec itself, so a
//                         revision is reproducible from its snapshot alone
//
// Version history is preserved because a revision stores the FULL panel
// snapshot: any past revision can rebuild byte-identical artwork, and restoring
// an old revision publishes it forward as a new revision rather than rewriting
// the past.

import {
  LONDON_PANELS,
  LONDON_STYLES,
  isBoothPanel,
  londonBoothArtworkUrl,
  panelSlug,
  rasterSizeFor,
  recommendedPpi,
  type LondonPanel,
} from "@/lib/next-london-signage";
import {
  axialShadingDict,
  parseColor,
  radialShadingDict,
  stopsFromColors,
} from "@/lib/pdf-gradient-shading";
import {
  LONDON_SIGNAGE_FONT,
  londonBrandingPlan,
  londonPanelFamily,
} from "@/lib/next-london-branding";
import {
  isLondonDoorItem,
  LONDON_DOOR_ACCENT_WEIGHT,
  londonDivisionStops,
} from "@/lib/next-london-division";
import { loadLondonGroundImage, type LondonGroundImage } from "@/lib/next-london-artwork";

import {
  cmykAxialShadingDict,
  cmykCss,
  cmykFillOp,
  cmykRadialShadingDict,
  cmykStopsFromColors,
  cmykToHex,
  londonCmykBuild,
} from "@/lib/next-london-cmyk";
import { svgPathToPdfOps } from "@/lib/vector-path-pdf";
import {
  brewGsName,
  brewMotifAlphas,
  brewMotifPdfOps,
  brewMotifPlan,
  brewMotifSteamPdfOps,
  brewMotifSvgLayer,
  isBrewPanel,
} from "@/lib/next-london-brew";

import {
  isStepRepeatPanel,
  stepRepeatConfig,
  stepRepeatPlan,
  stepRepeatSvgLayer,
  type StepRepeatConfig,
  type StepRepeatPlan,
} from "@/lib/next-london-step-repeat";

/** Fields the location team is allowed to re-issue. */
export const LONDON_EDITABLE_FIELDS = [
  "room",
  "name",
  "ground",
  "style",
  "trimW",
  "trimH",
  "bleedEdge",
  "bleedW",
  "bleedH",
  "rasterPpi",
] as const;

export type LondonEditableField = (typeof LONDON_EDITABLE_FIELDS)[number];

export type LondonPanelEdit = Partial<Pick<LondonPanel, LondonEditableField>>;

export type LondonEditMap = Record<string, LondonPanelEdit>;

/**
 * Spec for a panel the venue team adds mid-build (a late column, an extra
 * fascia). Everything downstream — bleed box, raster size, ppi tier, band and
 * weight — is derived, and the artwork is built from the spec, so an added
 * panel behaves exactly like an issued one.
 */
export type LondonPanelAdd = {
  floor: LondonPanel["floor"];
  room: string;
  name: string;
  ground: string;
  style: string;
  trimW: number;
  trimH: number;
  bleedEdge: number;
  rasterPpi?: number;
};

/** True for panels that were added in Element rather than issued by the venue. */
export function isAddedPanel(panel: LondonPanel): boolean {
  return panel.id.startsWith("ldn-add-");
}

/** Build a fully derived panel from an addition spec. */
export function newLondonPanel(add: LondonPanelAdd, existing: LondonPanel[]): LondonPanel {
  const taken = new Set(existing.map((p) => p.id));
  let n = existing.filter(isAddedPanel).length + 1;
  while (taken.has(`ldn-add-${n}`)) n += 1;

  const trimW = Math.max(1, round(add.trimW, 1));
  const trimH = Math.max(1, round(add.trimH, 1));
  const bleedEdge = Math.max(0, round(add.bleedEdge, 1));
  const style = LONDON_STYLES[add.style] ? add.style : "01-beam-violet-aqua";
  const name = add.name.trim() || `ADDED PANEL ${n} - ${trimW}x${trimH}mm`;

  const seed: LondonPanel = {
    id: `ldn-add-${n}`,
    floor: add.floor,
    room: add.room.trim().toUpperCase() || "ADDITIONAL",
    proof: "Element addition (no venue proof)",
    page: 1,
    name,
    ground: add.ground.trim() || "Banner wash",
    style,
    trimW,
    trimH,
    bleedW: trimW + bleedEdge * 2,
    bleedH: trimH + bleedEdge * 2,
    bleedEdge,
    rasterPx: "0x0",
    rasterPpi: 0,
    bandMm: 0,
    rasterMb: 0,
  };

  const ppi = add.rasterPpi ? clampPpi(add.rasterPpi) : recommendedPpi(seed);
  const size = rasterSizeFor(seed, ppi);
  return {
    ...seed,
    rasterPpi: ppi,
    rasterPx: `${size.w}x${size.h}`,
    rasterMb: round(estimateRasterMb(size.w, size.h), 1),
    bandMm: round(bandWidthMm(ppi), 2),
  };
}

/** Changing any of these invalidates the vector artwork itself. */
const VECTOR_FIELDS = new Set<LondonEditableField>([
  "style",
  "trimW",
  "trimH",
  "bleedEdge",
  "bleedW",
  "bleedH",
]);

/** Changing this only re-renders the PNG. */
const RASTER_FIELDS = new Set<LondonEditableField>(["rasterPpi"]);

export const LONDON_FIELD_LABELS: Record<LondonEditableField, string> = {
  room: "Room",
  name: "Panel name",
  ground: "Ground",
  style: "Gradient style",
  trimW: "Trim width (mm)",
  trimH: "Trim height (mm)",
  bleedEdge: "Bleed per edge (mm)",
  bleedW: "Bleed width (mm)",
  bleedH: "Bleed height (mm)",
  rasterPpi: "Raster ppi",
};

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/** Estimated lossless-PNG weight, in MB, for a gradient plate of w×h px. */
function estimateRasterMb(w: number, h: number): number {
  // Smooth gradients + triangular dither compress to roughly 0.28 B/px in the
  // packaged masters (measured across the 54 issued plates).
  return Math.max(0.1, (w * h * 0.28) / (1024 * 1024));
}

/**
 * Worst-case flat-tone run for a dithered 8-bit gradient at a given ppi: about
 * three device pixels before the quantisation boundary is crossed.
 */
function bandWidthMm(ppi: number): number {
  return (25.4 / Math.max(1, ppi)) * 3;
}

/**
 * Apply one panel's edits and recompute every derived value. Bleed boxes follow
 * `bleedEdge` unless the team overrides a box explicitly in the same edit.
 */
export function derivePanel(base: LondonPanel, edit: LondonPanelEdit = {}): LondonPanel {
  // Untouched panels keep their issued values verbatim: the estimators below are
  // only ever allowed to move a panel that was actually re-issued.
  if (Object.keys(edit).length === 0) return base;

  const trimW = num(edit.trimW, base.trimW);
  const trimH = num(edit.trimH, base.trimH);
  const bleedEdge = num(edit.bleedEdge, base.bleedEdge);
  const bleedW = edit.bleedW !== undefined ? num(edit.bleedW, base.bleedW) : trimW + bleedEdge * 2;
  const bleedH = edit.bleedH !== undefined ? num(edit.bleedH, base.bleedH) : trimH + bleedEdge * 2;

  const style = edit.style && LONDON_STYLES[edit.style] ? edit.style : base.style;
  const geometryMoved =
    trimW !== base.trimW ||
    trimH !== base.trimH ||
    bleedW !== base.bleedW ||
    bleedH !== base.bleedH;

  const draft: LondonPanel = {
    ...base,
    room: (edit.room ?? base.room).trim() || base.room,
    name: (edit.name ?? base.name).trim() || base.name,
    ground: (edit.ground ?? base.ground).trim() || base.ground,
    style,
    trimW,
    trimH,
    bleedEdge,
    bleedW,
    bleedH,
  };

  // ppi: honour an explicit override, otherwise re-tier from the new size.
  const ppi =
    edit.rasterPpi !== undefined
      ? clampPpi(num(edit.rasterPpi, base.rasterPpi))
      : geometryMoved
        ? recommendedPpi(draft)
        : base.rasterPpi;

  const rasterMoved = geometryMoved || ppi !== base.rasterPpi;
  if (!rasterMoved) return { ...draft, rasterPpi: ppi };

  const size = rasterSizeFor(draft, ppi);
  return {
    ...draft,
    rasterPpi: ppi,
    rasterPx: `${size.w}x${size.h}`,
    rasterMb: round(estimateRasterMb(size.w, size.h), 1),
    bandMm: round(bandWidthMm(ppi), 2),
  };
}

/**
 * Apply an edit map over a base set (defaults to the issued London pack),
 * appending any panels added in this draft. Added panels are edited through the
 * same map, so the table treats them identically to issued panels.
 */
export function applyLondonEdits(
  edits: LondonEditMap,
  base: LondonPanel[] = LONDON_PANELS,
  added: LondonPanel[] = [],
): LondonPanel[] {
  return [...base, ...added].map((p) => derivePanel(p, edits[p.id] ?? {}));
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) && (n as number) > 0 ? round(n as number, 1) : fallback;
}

function clampPpi(ppi: number): number {
  return Math.min(300, Math.max(18, Math.round(ppi)));
}

function round(n: number, dp: number): number {
  const k = 10 ** dp;
  return Math.round(n * k) / k;
}

// ---------------------------------------------------------------------------
// Diff + regeneration plan
// ---------------------------------------------------------------------------

export type LondonChange = {
  panelId: string;
  panelName: string;
  field: LondonEditableField | "rasterPx" | "rasterMb" | "bandMm" | "panel";
  label: string;
  from: string | number;
  to: string | number;
  /** Derived values move as a consequence of an edit; they are not edits. */
  derived: boolean;
};

const DERIVED_FIELDS: { key: "rasterPx" | "rasterMb" | "bandMm"; label: string }[] = [
  { key: "rasterPx", label: "Raster size (px)" },
  { key: "rasterMb", label: "File weight (MB)" },
  { key: "bandMm", label: "Measured band (mm)" },
];

export function diffLondonPanels(prev: LondonPanel[], next: LondonPanel[]): LondonChange[] {
  const byId = new Map(prev.map((p) => [p.id, p]));
  const nextIds = new Set(next.map((p) => p.id));
  const out: LondonChange[] = [];
  for (const panel of next) {
    const before = byId.get(panel.id);
    if (!before) {
      out.push({
        panelId: panel.id,
        panelName: panel.name,
        field: "panel",
        label: "Panel added",
        from: "—",
        to: `${panel.floor} · ${panel.room} · ${panel.trimW}×${panel.trimH}mm`,
        derived: false,
      });
      continue;
    }
    for (const field of LONDON_EDITABLE_FIELDS) {
      if (before[field] !== panel[field]) {
        out.push({
          panelId: panel.id,
          panelName: panel.name,
          field,
          label: LONDON_FIELD_LABELS[field],
          from: before[field],
          to: panel[field],
          derived: false,
        });
      }
    }
    for (const d of DERIVED_FIELDS) {
      if (before[d.key] !== panel[d.key]) {
        out.push({
          panelId: panel.id,
          panelName: panel.name,
          field: d.key,
          label: d.label,
          from: before[d.key],
          to: panel[d.key],
          derived: true,
        });
      }
    }
  }
  for (const panel of prev) {
    if (nextIds.has(panel.id)) continue;
    out.push({
      panelId: panel.id,
      panelName: panel.name,
      field: "panel",
      label: "Panel removed",
      from: `${panel.floor} · ${panel.room} · ${panel.trimW}×${panel.trimH}mm`,
      to: "—",
      derived: false,
    });
  }
  return out;
}

export type LondonRegenPlan = {
  /** Needs new .ai + .svg (and therefore a new PNG too). */
  vector: string[];
  /** Vector still valid — only the PNG must be re-rendered. */
  raster: string[];
  /** Schedule/metadata only; no artwork changes. */
  metadata: string[];
  /** Every panel touched, in issue order. */
  touched: string[];
};

export function planLondonRegeneration(changes: LondonChange[]): LondonRegenPlan {
  const vector = new Set<string>();
  const raster = new Set<string>();
  const metadata = new Set<string>();

  for (const c of changes) {
    if (c.field === "panel") {
      if (c.to === "—") metadata.add(c.panelId);
      else vector.add(c.panelId);
    } else if (!c.derived && VECTOR_FIELDS.has(c.field as LondonEditableField))
      vector.add(c.panelId);
    else if (!c.derived && RASTER_FIELDS.has(c.field as LondonEditableField)) raster.add(c.panelId);
    else if (c.derived && c.field === "rasterPx") raster.add(c.panelId);
    else if (!c.derived) metadata.add(c.panelId);
  }
  for (const id of vector) raster.delete(id);
  for (const id of [...vector, ...raster]) metadata.delete(id);

  const issued = LONDON_PANELS.map((p) => p.id);
  const order = (ids: Set<string>) => [
    ...issued.filter((id) => ids.has(id)),
    ...[...ids].filter((id) => !issued.includes(id)),
  ];
  const touched = new Set<string>([...vector, ...raster, ...metadata]);
  return {
    vector: order(vector),
    raster: order(raster),
    metadata: order(metadata),
    touched: order(touched),
  };
}

export function regenerationSummary(plan: LondonRegenPlan): string {
  if (plan.touched.length === 0) return "No changes — nothing to regenerate.";
  const bits: string[] = [];
  if (plan.vector.length) bits.push(`${plan.vector.length} × new .ai/.svg + PNG`);
  if (plan.raster.length) bits.push(`${plan.raster.length} × PNG re-render`);
  if (plan.metadata.length) bits.push(`${plan.metadata.length} × schedule only`);
  return bits.join(" · ");
}

// ---------------------------------------------------------------------------
// Artwork regeneration — vector, straight from the spec
// ---------------------------------------------------------------------------

const MM_TO_PT = 72 / 25.4;

type Vec = { x1: number; y1: number; x2: number; y2: number };

/** Gradient axis per treatment, in unit space. */
function styleAxis(styleId: string): Vec {
  if (styleId.includes("diagonal")) return { x1: 0, y1: 0, x2: 1, y2: 1 };
  if (styleId.includes("horizon")) return { x1: 0, y1: 0, x2: 0, y2: 1 };
  if (styleId.includes("bloom")) return { x1: 0, y1: 0, x2: 0.85, y2: 0.85 };
  if (styleId.includes("prism")) return { x1: 0, y1: 1, x2: 1, y2: 0 };
  if (styleId.includes("veil")) return { x1: 0, y1: 0, x2: 0.25, y2: 1 };
  // Chevron sweep: a low-angle run from the bottom-left, echoing the NEXT
  // chevron rather than a centred sphere.
  if (styleId.includes("chevron")) return { x1: 0, y1: 1, x2: 1, y2: 0.18 };
  return { x1: 0.5, y1: 0, x2: 0.5, y2: 1 };
}

function stopsFor(panel: LondonPanel): string[] {
  return londonPanelStops(panel);
}

/**
 * The approved colour ramp for a panel, in ramp order. Exported so QA can
 * assert an exported `.ai` still carries these exact stops.
 */
export function londonPanelStops(panel: LondonPanel): string[] {
  const stops = LONDON_STYLES[panel.style]?.stops;
  const base = stops && stops.length > 0 ? stops : ["#7C4EF4", "#7FE3E8"];
  // Division items carry their NEXT 2026 accent as a slight tint at the light
  // end of the ramp; master-brand items are returned unchanged.
  // Doors take the stronger soft-focus accent weight; scenic panels keep the
  // restrained tint so the venue still reads as one pack.
  return londonDivisionStops(
    londonPanelFamily(panel),
    base,
    isLondonDoorItem(panel.room, panel.name) ? LONDON_DOOR_ACCENT_WEIGHT : undefined,
  );
}

/**
 * Output colour space for a regenerated master. `rgb` is the default and the
 * house rule (the RIP separates); `cmyk` is the explicit, operator-chosen print
 * master with vibrant correction and approved brand builds.
 */
export type LondonColorSpace = "rgb" | "cmyk";

export type LondonArtOptions = {
  colorSpace?: LondonColorSpace;
  /** Vibrance pre-compensation strength for converted colours (0–1.5). */
  vibrance?: number;
  /**
   * Step-and-repeat wall recipe. Only used on photo-wall panels; when omitted
   * the stored recipe for the panel (or the house default) is used.
   */
  stepRepeat?: StepRepeatConfig;
  /**
   * Supplied vendor artwork, already fetched, so the `.ai` master embeds the
   * real booth wall instead of rebuilding a house gradient under it.
   * Resolve it with `loadLondonGroundImage` (see next-london-artwork.ts).
   */
  groundImage?: LondonGroundImage | null;
};

/**
 * Placement box for a supplied-artwork ground, in mm on the bleed sheet. The
 * designer can zoom and pan the vendor wall; both masters and the on-screen
 * stage read this same geometry.
 */
export function londonGroundBox(
  panel: LondonPanel,
  placement: { groundScale: number; groundDx: number; groundDy: number },
): { x: number; y: number; w: number; h: number } {
  const w = panel.bleedW * placement.groundScale;
  const h = panel.bleedH * placement.groundScale;
  return {
    w,
    h,
    x: (panel.bleedW - w) / 2 + placement.groundDx * panel.trimW,
    y: (panel.bleedH - h) / 2 + placement.groundDy * panel.trimH,
  };
}

/**
 * Rebuild a panel's SVG from its own specification: full-bleed artboard in mm,
 * live linear gradient, trim box marked as metadata only (never a drawn line).
 */
export function buildLondonPanelSvg(panel: LondonPanel, options: LondonArtOptions = {}): string {
  const cmyk = options.colorSpace === "cmyk";
  const vibrance = options.vibrance ?? 1;
  const stops = stopsFor(panel);
  const axis = styleAxis(panel.style);
  const id = `g-${panel.id}`;
  const isHalo = panel.style.includes("halo");
  // In a CMYK master every stop carries its press build: the paint is
  // device-cmyk(), with the screen proxy as the fallback so browsers and
  // Illustrator's preview still show the corrected colour.
  const paintFor = (hex: string): { paint: string; meta: string } => {
    if (!cmyk) return { paint: hex, meta: "" };
    const build = londonCmykBuild(hex, vibrance);
    return {
      paint: `${cmykToHex(build)}`,
      meta: ` data-cmyk="${cmykCss(build)}" data-cmyk-approved="${build.approved}" data-source-rgb="${hex}"`,
    };
  };
  const ramp = stops
    .map((hex, i) => {
      const { paint, meta } = paintFor(hex);
      return `<stop offset="${((i / (stops.length - 1)) * 100).toFixed(2)}%" stop-color="${paint}"${meta}/>`;
    })
    .join("");

  const paint = isHalo
    ? `<radialGradient id="${id}" cx="50%" cy="45%" r="72%">${ramp}</radialGradient>`
    : `<linearGradient id="${id}" x1="${axis.x1 * 100}%" y1="${axis.y1 * 100}%" x2="${axis.x2 * 100}%" y2="${axis.y2 * 100}%">${ramp}</linearGradient>`;

  const marginX = ((panel.bleedW - panel.trimW) / 2).toFixed(2);
  const marginY = ((panel.bleedH - panel.trimH) / 2).toFixed(2);

  // Supplied vendor booth artwork, when the vendor has delivered their file:
  // it becomes the ground so previews and masters match the real booth.
  const boothArt = londonBoothArtworkUrl(panel.id);

  // Step-and-repeat walls are a repeating tile field, not a single lockup: the
  // wall layer replaces the hero lockup and the headline entirely.
  const wall =
    !boothArt && isStepRepeatPanel(panel)
      ? stepRepeatPlan(panel, options.stepRepeat ?? stepRepeatConfig(panel.id))
      : null;

  const brand = londonBrandingPlan(panel);
  const logoScale = brand.logo.w / brand.art.w;
  // HERO LOCKUP is layer 1: it is written last in paint order, so it sits on
  // top of the ground and the copy, and Illustrator lists it first in Layers.
  const logoGroup = [
    `<g id="hero-lockup" data-layer="hero-lockup" data-layer-order="1"`,
    ` data-lockup="${brand.orientation}" data-family="${brand.familyId}"`,
    ` data-colourway="${brand.colourway}"`,
    ` data-source="${escapeXml(brand.art.source)}"`,
    ` transform="translate(${brand.logo.x.toFixed(2)} ${brand.logo.y.toFixed(2)}) scale(${logoScale.toFixed(5)})">`,
    brand.art.paths
      .map((p) => {
        const { paint: fill, meta } = paintFor(p.fill);
        const rule = p.fillRule === "evenodd" ? ` fill-rule="evenodd"` : "";
        return `<path d="${p.d}" fill="${fill}"${rule}${meta}/>`;
      })
      .join(""),
    `</g>`,
  ].join("");

  const inkOnLight = brand.colourway === "dblue";
  const copyHex = inkOnLight ? "#03002C" : "#FFFFFF";
  const copyPaint = paintFor(copyHex);
  // Vertical copy runs DOWN the panel — a 90° rotation about the anchor, so the
  // text object stays live and re-typeable in Illustrator.
  const copyRotate = brand.copyVertical
    ? ` transform="rotate(90 ${brand.copyCentreMm.toFixed(2)} ${brand.copyBaselineMm.toFixed(2)})"`
    : "";
  const copyLayer = brand.copy
    ? `<text data-layer="copy" data-layer-order="2" x="${brand.copyCentreMm.toFixed(2)}" y="${brand.copyBaselineMm.toFixed(2)}"` +
      `${copyRotate} data-direction="${brand.copyVertical ? "vertical" : "horizontal"}"` +
      ` text-anchor="middle" fill="${copyPaint.paint}"${copyPaint.meta} font-family="${LONDON_SIGNAGE_FONT.cssStack}"` +
      ` font-weight="${LONDON_SIGNAGE_FONT.weight}" font-size="${brand.copySizeMm.toFixed(2)}"` +
      ` letter-spacing="${(brand.copySizeMm * brand.copyTrackingEm).toFixed(3)}">${escapeXml(brand.copy)}</text>`
    : "";

  // QR: real encoded modules as vector geometry on a white plate, so the code
  // stays crisp at any signage size and scans off a scenic ground.
  const qrLayer = brand.qr
    ? (() => {
        const q = brand.qr;
        const pad = q.padMm;
        const plate = paintFor(q.plateInk);
        const ink = paintFor(q.moduleInk);
        const scale = q.size / q.modules;
        const caption = q.caption
          ? `<text x="${q.captionX.toFixed(2)}" y="${(q.y + q.size + pad + q.captionPadMm + q.captionSizeMm).toFixed(2)}"` +
            ` text-anchor="${q.captionAnchor}" fill="${copyPaint.paint}"${copyPaint.meta}` +
            ` font-family="${LONDON_SIGNAGE_FONT.cssStack}" font-weight="${q.captionWeight}"` +
            ` letter-spacing="${(q.captionSizeMm * q.captionTracking).toFixed(3)}"` +
            ` font-size="${q.captionSizeMm.toFixed(2)}">${escapeXml(q.caption)}</text>`
          : "";
        // A transparent code drops the plate so the modules print straight onto
        // the ground — only safe on flat, high-contrast art, and the designer's
        // call, exactly as in the pillar QR editors.
        const plateRect = q.plate
          ? `<rect x="${(q.x - pad).toFixed(2)}" y="${(q.y - pad).toFixed(2)}" width="${(q.size + pad * 2).toFixed(2)}"` +
            ` height="${(q.size + pad * 2).toFixed(2)}" rx="${q.radiusMm.toFixed(2)}" fill="${plate.paint}"${plate.meta}/>`
          : "";
        return (
          `<g id="qr" data-layer="qr" data-layer-order="2" data-qr="${escapeXml(q.data)}"` +
          ` data-qr-plate="${q.plate ? "on" : "off"}">${plateRect}` +
          `<g transform="translate(${q.x.toFixed(2)} ${q.y.toFixed(2)}) scale(${scale.toFixed(5)})">` +
          `<path d="${q.path}" fill="${ink.paint}"${ink.meta}/></g></g>${caption}`
        );
      })()
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${panel.bleedW}mm" height="${panel.bleedH}mm"`,
    ` viewBox="0 0 ${panel.bleedW} ${panel.bleedH}" data-panel="${panel.id}"`,
    ` data-trim="${panel.trimW}x${panel.trimH}mm" data-bleed="${panel.bleedEdge}mm"`,
    ` data-trim-origin="${marginX},${marginY}" data-style="${panel.style}"`,
    ` data-colorspace="${cmyk ? "cmyk" : "rgb"}"${cmyk ? ` data-vibrance="${vibrance}"` : ""}`,
    ` data-font="${LONDON_SIGNAGE_FONT.pdfBaseFont}">`,

    `<title>${escapeXml(panel.name)}</title>`,
    `<desc>TransPerfect NEXT 2026 London · ${escapeXml(panel.room)} · trim ${panel.trimW}×${panel.trimH}mm, bleed ${panel.bleedEdge}mm/edge, ${panel.style} · ${escapeXml(brand.art.source)}</desc>`,
    `<defs>${paint}<clipPath id="clip-${id}"><rect x="0" y="0" width="${panel.bleedW}" height="${panel.bleedH}"/></clipPath></defs>`,
    boothArt
      ? (() => {
          const box = londonGroundBox(panel, brand.placement);
          return (
            `<g id="ground" data-layer="ground" data-layer-order="3" data-supplied-artwork="${escapeXml(boothArt)}"` +
            ` data-ground-scale="${brand.placement.groundScale}" clip-path="url(#clip-${id})">` +
            `<image href="${escapeXml(boothArt)}" xlink:href="${escapeXml(boothArt)}"` +
            ` x="${box.x.toFixed(2)}" y="${box.y.toFixed(2)}" width="${box.w.toFixed(2)}"` +
            ` height="${box.h.toFixed(2)}" preserveAspectRatio="none"/></g>`
          );
        })()
      : `<g id="ground" data-layer="ground" data-layer-order="3"><rect x="0" y="0" width="${panel.bleedW}" height="${panel.bleedH}" fill="url(#${id})"/></g>`,
    // NEXTbrew café motif: live vector marks on top of the ground, never baked
    // into the gradient. Suppressed on supplied vendor artwork.
    !boothArt && isBrewPanel(panel) ? brewMotifSvgLayer(brewMotifPlan(panel), paintFor) : "",

    wall
      ? stepRepeatSvgLayer(panel, wall, {
          paintFor,
          fontStack: LONDON_SIGNAGE_FONT.cssStack,
          fontWeight: LONDON_SIGNAGE_FONT.weight,
          tracking: LONDON_SIGNAGE_FONT.tracking,
        })
      : "",
    wall ? "" : copyLayer,
    wall ? "" : qrLayer,
    // Booths that ship the vendor's own branded artwork start without a second,
    // generated lockup — the designer can switch it on per booth.
    wall || !brand.lockupOn ? "" : logoGroup,
    `</svg>`,
  ].join("");
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;",
  );
}

/** Single colour-notation parser shared with the PDF shading writer. */
const hexToRgb = parseColor;

function gradientRgb(stops: string[], t: number): [number, number, number] {
  if (stops.length === 0) return [0, 0, 0];
  if (stops.length === 1) return hexToRgb(stops[0]!);
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(Math.floor(scaled), stops.length - 2);
  const mix = scaled - index;
  const a = hexToRgb(stops[index]!);
  const b = hexToRgb(stops[index + 1]!);
  return a.map((channel, i) => channel + (b[i]! - channel) * mix) as [number, number, number];
}

/**
 * Rebuild a panel's `.ai` from its specification. Illustrator's native format
 * is PDF-compatible. The ground is a LIVE gradient — PDF Shading Type 2
 * (axial) or Type 3 (radial), the same construct Illustrator writes itself —
 * so it opens as one editable gradient object with the exact stop ramp, and no
 * raster is embedded. Gouraud meshes were rejected here: RIPs read them fine
 * but Illustrator re-interprets them and the colours come in wrong.
 */
export function buildLondonPanelAi(panel: LondonPanel, options: LondonArtOptions = {}): Uint8Array {
  const cmyk = options.colorSpace === "cmyk";
  const vibrance = options.vibrance ?? 1;
  const w = panel.bleedW * MM_TO_PT;
  const h = panel.bleedH * MM_TO_PT;
  const trimX = ((panel.bleedW - panel.trimW) / 2) * MM_TO_PT;
  const trimY = ((panel.bleedH - panel.trimH) / 2) * MM_TO_PT;
  const axis = styleAxis(panel.style);
  const isHalo = panel.style.includes("halo");
  /** Fill operator for one brand colour, in the chosen output space. */
  const fillOp = (hex: string): string =>
    cmyk
      ? cmykFillOp(londonCmykBuild(hex, vibrance))
      : (() => {
          const [r, g, b] = parseColor(hex);
          return `${f3(r)} ${f3(g)} ${f3(b)} rg`;
        })();

  // Unit-space axis/centre mirror the SVG master (y down); PDF space is y up.
  const from = { x: axis.x1 * w, y: h - axis.y1 * h };
  const to = { x: axis.x2 * w, y: h - axis.y2 * h };
  const centre = { x: 0.5 * w, y: h - 0.45 * h };
  const radius = 0.72 * Math.max(w, h);
  const shadingDict = cmyk
    ? (() => {
        const stops = cmykStopsFromColors(stopsFor(panel), vibrance);
        return isHalo
          ? cmykRadialShadingDict(centre, radius, stops)
          : cmykAxialShadingDict(from, to, stops);
      })()
    : (() => {
        const stops = stopsFromColors(stopsFor(panel));
        return isHalo
          ? radialShadingDict(centre, radius, stops)
          : axialShadingDict(from, to, stops);
      })();

  const wall = isStepRepeatPanel(panel)
    ? stepRepeatPlan(panel, options.stepRepeat ?? stepRepeatConfig(panel.id))
    : null;

  // Supplied vendor artwork: embedded as a real image XObject so the `.ai`
  // opens on the vendor's own wall (placed, movable, its own layer) instead of
  // a rebuilt house gradient. JPEG bytes ride through as /DCTDecode.
  const groundImage = options.groundImage ?? null;

  // Brand layer: EPS-derived lockup outlines as live PDF paths, headline copy
  // as live Geist Bold text — both editable when the .ai is opened.
  const brand = londonBrandingPlan(panel);
  const logoScale = (brand.logo.w * MM_TO_PT) / brand.art.w;
  const logoOps = brand.art.paths
    .map((p) => {
      const ops = svgPathToPdfOps(p.d, {
        scale: logoScale,
        x: brand.logo.x * MM_TO_PT,
        y: h - (brand.logo.y + brand.logo.h) * MM_TO_PT,
        artHeight: brand.art.h,
      });
      if (!ops) return "";
      // Compound outlines keep the master's fill rule, so glyph counters and
      // knockouts stay open exactly as the .eps draws them.
      return `q ${fillOp(p.fill)} ${ops} ${p.fillRule === "evenodd" ? "f*" : "f"} Q\n`;
    })
    .join("");

  const copyInk = cmyk
    ? cmykFillOp(
        brand.colourway === "dblue" ? { c: 0, m: 0, y: 0, k: 1 } : { c: 0, m: 0, y: 0, k: 0 },
      )
    : fillOp(brand.colourway === "dblue" ? "#03002C" : "#FFFFFF");

  const copyOps = brand.copy
    ? (() => {
        const size = brand.copySizeMm * MM_TO_PT;
        const tracking = size * brand.copyTrackingEm;
        const advance = brand.copy.length * (size * 0.62 + tracking);
        const ax = brand.copyCentreMm * MM_TO_PT;
        const ay = h - brand.copyBaselineMm * MM_TO_PT;
        // Copy on a CMYK master follows the print contract: dark copy is 100K,
        // knockout copy is 0/0/0/0 — never a four-colour build.
        // Vertical copy is a live text object rotated -90°, so it runs down the
        // pillar and still re-types in Illustrator.
        const tm = brand.copyVertical
          ? `0 -1 1 0 ${f3(ax)} ${f3(ay + advance / 2)} Tm`
          : `1 0 0 1 ${f3(ax - advance / 2)} ${f3(ay)} Tm`;
        return (
          `q ${copyInk} BT /F1 ${f3(size)} Tf ${f3(tracking)} Tc ` +
          `${tm} (${pdfText(brand.copy)}) Tj ET Q\n`
        );
      })()
    : "";

  // QR: vector modules on a white plate, plus its caption — all live objects.
  const qrOps = brand.qr
    ? (() => {
        const q = brand.qr;
        const pad = q.padMm;
        const size = q.size * MM_TO_PT;
        const padPt = pad * MM_TO_PT;
        const x = q.x * MM_TO_PT;
        const yTop = q.y * MM_TO_PT;
        const plate = q.plate
          ? `q ${fillOp(q.plateInk)} ${f3(x - padPt)} ${f3(h - yTop - size - padPt)} ${f3(size + padPt * 2)} ${f3(size + padPt * 2)} re f Q\n`
          : "";
        const modules = svgPathToPdfOps(q.path, {
          scale: size / q.modules,
          x,
          y: h - yTop - size,
          artHeight: q.modules,
        });
        const code = modules ? `q ${fillOp(q.moduleInk)} ${modules} f Q\n` : "";
        const caption = q.caption
          ? (() => {
              const cs = q.captionSizeMm * MM_TO_PT;
              const advance = q.caption.length * cs * 0.62;
              const anchorX = q.captionX * MM_TO_PT;
              const cx =
                q.captionAnchor === "start"
                  ? anchorX
                  : q.captionAnchor === "end"
                    ? anchorX - advance
                    : anchorX - advance / 2;
              const cy = h - (q.y + q.size + pad + q.captionPadMm + q.captionSizeMm) * MM_TO_PT;
              return (
                `q ${copyInk} BT /F1 ${f3(cs)} Tf 1 0 0 1 ${f3(cx)} ${f3(cy)} Tm ` +
                `(${pdfText(q.caption)}) Tj ET Q\n`
              );
            })()
          : "";
        return plate + code + caption;
      })()
    : "";

  // Three real Illustrator layers via optional content groups. Paint order is
  // ground → copy (with the QR block) → hero lockup, and /OCProperties /Order
  // lists the hero lockup FIRST, so it is the top layer when the .ai is opened.
  // A photo wall's top layer is the repeat field itself: every mark, text tile
  // and QR is a live PDF object, so the wall stays fully editable in Illustrator.
  const wallOps = wall ? stepRepeatPdfOps(wall, h, fillOp, copyInk) : "";

  // Ground: the vendor's placed artwork when supplied (zoom/pan honoured),
  // otherwise the live gradient shading.
  const groundOps = groundImage
    ? (() => {
        const box = londonGroundBox(panel, brand.placement);
        const bw = box.w * MM_TO_PT;
        const bh = box.h * MM_TO_PT;
        const bx = box.x * MM_TO_PT;
        const by = h - (box.y + box.h) * MM_TO_PT;
        return (
          `q 0 0 ${f3(w)} ${f3(h)} re W n ` +
          `${f3(bw)} 0 0 ${f3(bh)} ${f3(bx)} ${f3(by)} cm /ImGround Do Q\n`
        );
      })()
    : `q 0 0 ${f3(w)} ${f3(h)} re W n /Sh0 sh Q\n`;

  // NEXTbrew café motif: live stroked/filled paths sitting in the ground layer,
  // each with its own ExtGState alpha so nothing is flattened.
  const brewPlan = !groundImage && !wall && isBrewPanel(panel) ? brewMotifPlan(panel) : null;
  const strokeOpFor = (hex: string): string => {
    const op = fillOp(hex);
    return op.endsWith(" rg")
      ? `${op.slice(0, -3)} RG`
      : op.endsWith(" k")
        ? `${op.slice(0, -2)} K`
        : op;
  };
  const brewOps = brewPlan
    ? brewMotifPdfOps(brewPlan, h, fillOp, strokeOpFor) +
      brewMotifSteamPdfOps(brewPlan, h, strokeOpFor, (d) =>
        svgPathToPdfOps(d, { scale: MM_TO_PT, x: 0, y: 0, artHeight: panel.bleedH }),
      )
    : "";
  const brewGs = brewPlan
    ? brewMotifAlphas(brewPlan)
        .map((a) => `/${brewGsName(a)} << /Type /ExtGState /ca ${f3(a)} /CA ${f3(a)} >> `)
        .join("")
    : "";

  const content = wall
    ? `/OC /oc3 BDC\n${groundOps}EMC\n` + `/OC /oc1 BDC\n${wallOps}EMC\n`
    : `/OC /oc3 BDC\n${groundOps}${brewOps}EMC\n` +
      (copyOps || qrOps ? `/OC /oc2 BDC\n${copyOps}${qrOps}EMC\n` : "") +
      (brand.lockupOn && logoOps ? `/OC /oc1 BDC\n${logoOps}EMC\n` : "");

  const objects: string[] = [
    `<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [8 0 R 9 0 R 10 0 R] ` +
      `/D << /Order [8 0 R 9 0 R 10 0 R] /ON [8 0 R 9 0 R 10 0 R] >> >> >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f3(w)} ${f3(h)}] /BleedBox [0 0 ${f3(w)} ${f3(h)}] ` +
      `/TrimBox [${f3(trimX)} ${f3(trimY)} ${f3(trimX + panel.trimW * MM_TO_PT)} ${f3(trimY + panel.trimH * MM_TO_PT)}] ` +
      `/TPGradientKind /LiveShading /TPLockup (${pdfText(brand.art.source)}) ` +
      `/TPColorSpace (${cmyk ? `DeviceCMYK vibrant${vibrance}` : "DeviceRGB"}) ` +
      `/TPLockupColourway (${pdfText(brand.colourway)}) ` +
      `/Resources << /Shading << /Sh0 6 0 R >> /Font << /F1 7 0 R >> ` +
      `${groundImage ? "/XObject << /ImGround 11 0 R >> " : ""}` +
      `/ExtGState << /GsWall << /Type /ExtGState /ca ${f3(wall ? wall.config.opacity : 1)} >> ${brewGs}>> ` +
      `/Properties << /oc1 8 0 R /oc2 9 0 R /oc3 10 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    `<< /Title (${pdfText(panel.name)}) /Creator (TransPerfect Element) ` +
      `/Subject (NEXT 2026 London signage · ${pdfText(panel.room)} · ${pdfText(panel.style)} · ${pdfText(`${brand.orientation === "side" ? "side-by-side" : "stacked"} ${brand.colourway} lockup`)}) >>`,
    shadingDict,
    `<< /Type /Font /Subtype /TrueType /BaseFont /${LONDON_SIGNAGE_FONT.pdfBaseFont} ` +
      `/Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 255 >>`,
    `<< /Type /OCG /Name (${wall ? "Step & repeat" : "Hero lockup"}) >>`,
    `<< /Type /OCG /Name (Copy) >>`,
    `<< /Type /OCG /Name (Ground) >>`,
  ];

  // Object 11: the supplied artwork image. JPEG data is embedded verbatim, so
  // Illustrator opens the vendor's wall at full supplied resolution.
  if (groundImage) {
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width ${groundImage.width} /Height ${groundImage.height} ` +
        `/ColorSpace ${
          groundImage.components === 1
            ? "/DeviceGray"
            : groundImage.components === 4
              ? "/DeviceCMYK"
              : "/DeviceRGB"
        } /BitsPerComponent 8 /Filter /${groundImage.filter} ` +
        `/Length ${groundImage.bytes.length} >>\nstream\n${latin1(groundImage.bytes)}\nendstream`,
    );
  }

  let pdf = "%PDF-1.5\n%\u00e2\u00e3\u00cf\u00d3\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

/**
 * Step-and-repeat wall as live PDF content: repeated lockup outlines, live text
 * objects and vector QR modules, each rotated about its own centre.
 */
function stepRepeatPdfOps(
  plan: StepRepeatPlan,
  h: number,
  fillOp: (hex: string) => string,
  copyInk: string,
): string {
  const rad = (plan.config.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const logoScale = (plan.config.tileWidthMm * MM_TO_PT) / Math.max(1, plan.art.w);
  const alpha = plan.config.opacity < 1 ? `/GsWall gs ` : "";

  const spin = (cxMm: number, cyMm: number): string => {
    if (!plan.config.rotationDeg) return "";
    const cx = cxMm * MM_TO_PT;
    const cy = h - cyMm * MM_TO_PT;
    // Rotate about the tile centre: translate → rotate → translate back.
    const tx = cx - (cos * cx - sin * cy);
    const ty = cy - (sin * cx + cos * cy);
    return `${f3(cos)} ${f3(sin)} ${f3(-sin)} ${f3(cos)} ${f3(tx)} ${f3(ty)} cm `;
  };

  return plan.tiles
    .map((tile) => {
      const matrix = spin(tile.x + tile.w / 2, tile.y + tile.h / 2);
      if (tile.kind === "logo") {
        const paths = plan.art.paths
          .map((p) => {
            const ops = svgPathToPdfOps(p.d, {
              scale: logoScale,
              x: tile.x * MM_TO_PT,
              y: h - (tile.y + tile.h) * MM_TO_PT,
              artHeight: plan.art.h,
            });
            if (!ops) return "";
            return `${fillOp(p.fill)} ${ops} ${p.fillRule === "evenodd" ? "f*" : "f"} `;
          })
          .join("");
        return paths ? `q ${alpha}${matrix}${paths}Q\n` : "";
      }
      if (tile.kind === "text") {
        const size = tile.sizeMm * MM_TO_PT;
        const tracking = size * LONDON_SIGNAGE_FONT.tracking;
        const advance = plan.config.text.length * (size * 0.62 + tracking);
        const x = (tile.x + tile.w / 2) * MM_TO_PT - advance / 2;
        const y = h - (tile.y + tile.sizeMm) * MM_TO_PT;
        return (
          `q ${alpha}${matrix}${copyInk} BT /F1 ${f3(size)} Tf ${f3(tracking)} Tc ` +
          `1 0 0 1 ${f3(x)} ${f3(y)} Tm (${pdfText(plan.config.text)}) Tj ET Q\n`
        );
      }
      if (!plan.qr) return "";
      const size = tile.w * MM_TO_PT;
      const x = tile.x * MM_TO_PT;
      const yBottom = h - (tile.y + tile.h) * MM_TO_PT;
      const plate = plan.qr.plateHex
        ? `${fillOp(plan.qr.plateHex)} ${f3(x)} ${f3(yBottom)} ${f3(size)} ${f3(size)} re f `
        : "";
      const modules = svgPathToPdfOps(plan.qr.path, {
        scale: size / plan.qr.modules,
        x,
        y: yBottom,
        artHeight: plan.qr.modules,
      });
      return `q ${alpha}${matrix}${plate}${modules ? `${fillOp(plan.qr.inkHex)} ${modules} f ` : ""}Q\n`;

    })
    .join("");
}

/** Raw bytes as a binary-safe latin-1 string, for PDF stream assembly. */
function latin1(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]!);
  return out;
}

/**
 * `.ai` master with any supplied vendor artwork resolved first — the builder a
 * download or pack should call, so booth masters ship the real wall.
 */
export async function buildLondonPanelAiAsync(
  panel: LondonPanel,
  options: LondonArtOptions = {},
): Promise<Uint8Array> {
  const art = londonBoothArtworkUrl(panel.id);
  const groundImage = options.groundImage ?? (art ? await loadLondonGroundImage(art) : null);
  return buildLondonPanelAi(panel, { ...options, groundImage });
}

function f3(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

/**
 * Byte-exact bytes for a panel `.ai`.
 *
 * The packaged venue masters travel through JSON as *binary-safe latin-1
 * strings* (one char = one byte). Handing such a string straight to `Blob`
 * re-encodes it as UTF-8, which inflates every byte above 0x7F into two —
 * corrupting the PDF's flate streams and xref offsets, so Illustrator opens a
 * blank artboard. Always widen the string back to raw bytes before download.
 */
export function londonAiBytes(ai: string | Uint8Array): Uint8Array<ArrayBuffer> {
  if (typeof ai !== "string") return new Uint8Array(ai);
  const bytes = new Uint8Array(ai.length);
  for (let i = 0; i < ai.length; i += 1) bytes[i] = ai.charCodeAt(i) & 0xff;
  return bytes;
}

function pdfText(s: string): string {
  return s.replace(/[\\()]/g, (c) => `\\${c}`);
}

/** Stable file base for a regenerated panel, versioned by revision number. */
export function londonPanelFileBase(
  panel: LondonPanel,
  rev: number | "draft",
  colorSpace: LondonColorSpace = "rgb",
): string {
  const space = colorSpace === "cmyk" ? "-cmyk" : "";
  // An unpublished draft must never stamp a revision number that does not exist
  // yet — it ships as `rdraft-` until the revision is published.
  const tag = rev === "draft" ? "draft" : String(rev).padStart(3, "0");
  return `r${tag}-${panelSlug(panel)}${space}`;
}

/**
 * Cheap content fingerprint (FNV-1a) recorded per regenerated file, so a
 * revision's manifest proves which bytes were shipped for it.
 */
export function fingerprint(input: string | Uint8Array): string {
  let hash = 0x811c9dc5;
  const len = typeof input === "string" ? input.length : input.byteLength;
  for (let i = 0; i < len; i += 1) {
    const code = typeof input === "string" ? input.charCodeAt(i) & 0xff : input[i]!;
    hash ^= code;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

export type LondonRevision = {
  id: string;
  rev: number;
  note: string | null;
  authorId: string | null;
  panels: LondonPanel[];
  changes: LondonChange[];
  regen: LondonRegenPlan | Record<string, never>;
  /** Catalogue ids deleted in this revision — they must stay deleted. */
  removedIds: string[];
  restoredFrom: number | null;
  createdAt: string;
};

/** Revision 0 is the issued venue pack — always the base of the history. */
export function baseRevision(): LondonRevision {
  return {
    id: "issued",
    rev: 0,
    note: "Issued venue pack (Job 2281, Bespoke proofs)",
    authorId: null,
    panels: LONDON_PANELS,
    changes: [],
    regen: {},
    removedIds: [],
    restoredFrom: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

/** The panel set in force: latest revision, or the issued pack. */
export function effectiveLondonPanels(revisions: LondonRevision[]): LondonPanel[] {
  const latest = [...revisions].sort((a, b) => b.rev - a.rev)[0];
  if (!latest?.panels?.length) return LONDON_PANELS;
  // Items issued to the catalog AFTER a revision was cut (vendor booth kiosks,
  // for example) are appended so a published revision can never hide them.
  const known = new Set(latest.panels.map((p) => p.id));
  // ...unless the revision explicitly removed them.
  const removed = new Set(latest.removedIds ?? []);
  return [
    ...latest.panels,
    ...LONDON_PANELS.filter((p) => !known.has(p.id) && !removed.has(p.id)),
  ];
}

/** Panels present in `to` but not in `from` — used when restoring a revision. */
export function addedBetween(from: LondonPanel[], to: LondonPanel[]): LondonPanel[] {
  const known = new Set(from.map((p) => p.id));
  return to.filter((p) => !known.has(p.id));
}

/**
 * The artwork that matches a panel's CURRENT spec. The packaged venue master is
 * used only while the panel still matches the issued geometry, style and bleed;
 * revised and added panels are rebuilt from the spec so downloads can never ship
 * stale artwork.
 */
export function matchesIssuedArtwork(
  panel: LondonPanel,
  pack: Record<string, { svg: string; ai: string }> | null | undefined,
): boolean {
  const issued = LONDON_PANELS.find((p) => p.id === panel.id);
  return (
    !!issued &&
    !!pack?.[panel.id] &&
    issued.style === panel.style &&
    issued.trimW === panel.trimW &&
    issued.trimH === panel.trimH &&
    issued.bleedW === panel.bleedW &&
    issued.bleedH === panel.bleedH &&
    issued.bleedEdge === panel.bleedEdge
  );
}

/** SVG only — cheap enough for thumbnails, never stale. */
export function londonPanelSvgFor(
  panel: LondonPanel,
  pack: Record<string, { svg: string; ai: string }> | null | undefined,
): string {
  return matchesIssuedArtwork(panel, pack) ? pack![panel.id]!.svg : buildLondonPanelSvg(panel);
}

/**
 * As `resolveLondonArtwork`, but the `.ai` side resolves supplied vendor booth
 * artwork first — the builder any download or pack must use. The SVG side still
 * comes from the packaged venue master when the panel matches the issued spec.
 */
export async function resolveLondonArtworkAsync(
  panel: LondonPanel,
  pack: Record<string, { svg: string; ai: string }> | null,
): Promise<{ svg: string; ai: string | Uint8Array; source: "issued" | "rebuilt" }> {
  const base = resolveLondonArtwork(panel, pack);
  return { ...base, ai: await buildLondonPanelAiAsync(panel) };
}

export function resolveLondonArtwork(
  panel: LondonPanel,
  pack: Record<string, { svg: string; ai: string }> | null,
): { svg: string; ai: string | Uint8Array; source: "issued" | "rebuilt" } {
  const issued = LONDON_PANELS.find((p) => p.id === panel.id);
  const entry = pack?.[panel.id];
  const matchesIssue =
    !!issued &&
    !!entry &&
    issued.style === panel.style &&
    issued.trimW === panel.trimW &&
    issued.trimH === panel.trimH &&
    issued.bleedW === panel.bleedW &&
    issued.bleedH === panel.bleedH &&
    issued.bleedEdge === panel.bleedEdge;
  if (matchesIssue) {
    // Always rebuild the AI side with Illustrator-safe vector fills. Some of
    // the issued PDF-compatible masters contain shading dictionaries that
    // Illustrator reinterprets with a warning even though PDF renderers accept
    // them. The issued SVG remains the authoritative preview/master geometry.
    return { svg: entry.svg, ai: buildLondonPanelAi(panel), source: "rebuilt" };
  }
  return {
    svg: buildLondonPanelSvg(panel),
    ai: buildLondonPanelAi(panel),
    source: "rebuilt",
  };
}

/** Edit map that turns `from` into `to` — used when restoring an old revision. */
export function editsBetween(from: LondonPanel[], to: LondonPanel[]): LondonEditMap {
  const byId = new Map(from.map((p) => [p.id, p]));
  const edits: LondonEditMap = {};
  for (const panel of to) {
    const before = byId.get(panel.id);
    if (!before) continue;
    const edit: LondonPanelEdit = {};
    for (const field of LONDON_EDITABLE_FIELDS) {
      if (before[field] !== panel[field]) {
        (edit as Record<string, unknown>)[field] = panel[field];
      }
    }
    if (Object.keys(edit).length > 0) edits[panel.id] = edit;
  }
  return edits;
}
