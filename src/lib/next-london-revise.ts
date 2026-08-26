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
  panelSlug,
  rasterSizeFor,
  recommendedPpi,
  type LondonPanel,
} from "@/lib/next-london-signage";

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
  return { x1: 0.5, y1: 0, x2: 0.5, y2: 1 };
}

function stopsFor(panel: LondonPanel): string[] {
  return LONDON_STYLES[panel.style]?.stops ?? ["#7C4EF4", "#7FE3E8"];
}

/**
 * Rebuild a panel's SVG from its own specification: full-bleed artboard in mm,
 * live linear gradient, trim box marked as metadata only (never a drawn line).
 */
export function buildLondonPanelSvg(panel: LondonPanel): string {
  const stops = stopsFor(panel);
  const axis = styleAxis(panel.style);
  const id = `g-${panel.id}`;
  const isHalo = panel.style.includes("halo");
  const ramp = stops
    .map(
      (hex, i) =>
        `<stop offset="${((i / (stops.length - 1)) * 100).toFixed(2)}%" stop-color="${hex}"/>`,
    )
    .join("");

  const paint = isHalo
    ? `<radialGradient id="${id}" cx="50%" cy="45%" r="72%">${ramp}</radialGradient>`
    : `<linearGradient id="${id}" x1="${axis.x1 * 100}%" y1="${axis.y1 * 100}%" x2="${axis.x2 * 100}%" y2="${axis.y2 * 100}%">${ramp}</linearGradient>`;

  const marginX = ((panel.bleedW - panel.trimW) / 2).toFixed(2);
  const marginY = ((panel.bleedH - panel.trimH) / 2).toFixed(2);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${panel.bleedW}mm" height="${panel.bleedH}mm"`,
    ` viewBox="0 0 ${panel.bleedW} ${panel.bleedH}" data-panel="${panel.id}"`,
    ` data-trim="${panel.trimW}x${panel.trimH}mm" data-bleed="${panel.bleedEdge}mm"`,
    ` data-trim-origin="${marginX},${marginY}" data-style="${panel.style}">`,
    `<title>${escapeXml(panel.name)}</title>`,
    `<desc>TransPerfect NEXT 2026 London · ${escapeXml(panel.room)} · trim ${panel.trimW}×${panel.trimH}mm, bleed ${panel.bleedEdge}mm/edge, ${panel.style}</desc>`,
    `<defs>${paint}</defs>`,
    `<rect x="0" y="0" width="${panel.bleedW}" height="${panel.bleedH}" fill="url(#${id})"/>`,
    `</svg>`,
  ].join("");
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;",
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function gradientRgb(stops: string[], t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(Math.floor(scaled), stops.length - 2);
  const mix = scaled - index;
  const a = hexToRgb(stops[index]!);
  const b = hexToRgb(stops[index + 1]!);
  return a.map((channel, i) => channel + (b[i]! - channel) * mix) as [number, number, number];
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const k = 0.5522847498;
  return [
    `${f3(cx + rx)} ${f3(cy)} m`,
    `${f3(cx + rx)} ${f3(cy + k * ry)} ${f3(cx + k * rx)} ${f3(cy + ry)} ${f3(cx)} ${f3(cy + ry)} c`,
    `${f3(cx - k * rx)} ${f3(cy + ry)} ${f3(cx - rx)} ${f3(cy + k * ry)} ${f3(cx - rx)} ${f3(cy)} c`,
    `${f3(cx - rx)} ${f3(cy - k * ry)} ${f3(cx - k * rx)} ${f3(cy - ry)} ${f3(cx)} ${f3(cy - ry)} c`,
    `${f3(cx + k * rx)} ${f3(cy - ry)} ${f3(cx + rx)} ${f3(cy - k * ry)} ${f3(cx + rx)} ${f3(cy)} c h`,
  ].join(" ");
}

/**
 * Rebuild a panel's `.ai` from its specification. Illustrator's native format
 * is PDF-compatible. The gradient is a single Gouraud mesh (PDF Shading
 * Type 4): Illustrator opens it as one editable gradient-mesh object instead
 * of hundreds of tessellated sliver paths, and no raster is embedded.
 */
export function buildLondonPanelAi(panel: LondonPanel): Uint8Array {
  const w = panel.bleedW * MM_TO_PT;
  const h = panel.bleedH * MM_TO_PT;
  const trimX = ((panel.bleedW - panel.trimW) / 2) * MM_TO_PT;
  const trimY = ((panel.bleedH - panel.trimH) / 2) * MM_TO_PT;
  const stops = stopsFor(panel);
  const axis = styleAxis(panel.style);

  // Colour field for the ground, mirroring the live gradient geometry.
  const sampler = (x: number, y: number): [number, number, number] => {
    if (panel.style.includes("halo")) {
      const d = Math.hypot((x - 0.5 * w) / (0.72 * w), (y - (h - 0.45 * h)) / (0.72 * h));
      return gradientRgb(stops, Math.min(d, 1));
    }
    const x1 = axis.x1 * w;
    const y1 = h - axis.y1 * h;
    const dx = axis.x2 * w - x1;
    const dy = h - axis.y2 * h - y1;
    const length = Math.max(Math.hypot(dx, dy), 1);
    const originProjection = x1 * (dx / length) + y1 * (dy / length);
    return gradientRgb(stops, (x * (dx / length) + y * (dy / length) - originProjection) / length);
  };
  const mesh = buildGouraudMesh(w, h, sampler);
  let meshText = "";
  for (let i = 0; i < mesh.length; i += 8192) {
    meshText += String.fromCharCode(...mesh.subarray(i, i + 8192));
  }

  const content = `q 0 0 ${f3(w)} ${f3(h)} re W n /Sh0 sh Q\n`;

  const objects: string[] = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f3(w)} ${f3(h)}] /BleedBox [0 0 ${f3(w)} ${f3(h)}] ` +
      `/TrimBox [${f3(trimX)} ${f3(trimY)} ${f3(trimX + panel.trimW * MM_TO_PT)} ${f3(trimY + panel.trimH * MM_TO_PT)}] ` +
      `/TPGradientKind /VectorMesh /Resources << /Shading << /Sh0 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    `<< /Title (${pdfText(panel.name)}) /Creator (TransPerfect Element) ` +
      `/Subject (NEXT 2026 London signage · ${pdfText(panel.room)} · ${pdfText(panel.style)}) >>`,
    `<< ${meshShadingEntries(w, h)} /Length ${mesh.length} >>\nstream\n${meshText}\nendstream`,
  ];

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
export function londonPanelFileBase(panel: LondonPanel, rev: number): string {
  return `r${String(rev).padStart(3, "0")}-${panelSlug(panel)}`;
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
    restoredFrom: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

/** The panel set in force: latest revision, or the issued pack. */
export function effectiveLondonPanels(revisions: LondonRevision[]): LondonPanel[] {
  const latest = [...revisions].sort((a, b) => b.rev - a.rev)[0];
  return latest?.panels?.length ? latest.panels : LONDON_PANELS;
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
