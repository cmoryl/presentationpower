// TransPerfect NEXT 2026 — London signage PLACED ARTWORK (designer uploads).
//
// A location designer can drop a vector file (.svg, or an Illustrator .eps)
// onto any panel — a partner mark, a sponsor lockup, a wayfinding glyph — and
// it becomes a REAL LAYER in that panel's live file: live paths in the `.svg`
// master and live PDF path objects in the `.ai` master, never a placed raster.
//
// Because signage masters must stay press-honest, the importer refuses anything
// it cannot carry as vector:
//   - live <text> (must be outlined before upload; substituted fonts are why)
//   - placed rasters (<image>) and <use>/<script>/<foreignObject>
//   - EPS files whose paths are locked inside Illustrator private data
// Every refusal is reported to the designer — nothing is silently dropped.
//
// Geometry is stored in the file's own user space plus a per-path matrix; the
// placement (size, position, rotation, opacity) is stored as fractions of the
// TRIM box, so re-issuing a panel at another signboard size re-lays the art.

import { useSyncExternalStore } from "react";
import {
  clearLondonOverrideCleared,
  markLondonOverrideCleared,
} from "@/lib/next-london-override-clears";

export type PlacedArtMatrix = [number, number, number, number, number, number];

export type PlacedArtPath = {
  /** Path data in the file's own user space (y down). */
  d: string;
  fill: string;
  fillRule?: "evenodd";
  /** Transform from the path's space into the artwork box. */
  m: PlacedArtMatrix;
  /** Per-path opacity from the source file (1 = opaque). */
  alpha?: number;
};

export type LondonPlacedArt = {
  /** Source file name, shown in the editor and written into the master. */
  name: string;
  format: "svg" | "eps";
  paths: PlacedArtPath[];
  /** Artwork box in its own user space. */
  w: number;
  h: number;
  /** Layer on/off. */
  on: boolean;
  /** Printed width as a fraction of the trim width. */
  size: number;
  /** Centre offset from the trim centre, as fractions of the trim box. */
  dx: number;
  dy: number;
  /** Rotation in degrees, clockwise, about the artwork centre. */
  rotate: number;
  /** Layer opacity. */
  opacity: number;
  /** Above the generated lockup, or under it. */
  onTop: boolean;
  /**
   * Ink swaps: source fill (upper-case hex) → replacement hex. Recolouring is a
   * paint change only; the uploaded geometry is untouched, so the master stays
   * the file that was supplied.
   */
  recolour?: Record<string, string>;
};

export const PLACED_ART_SIZE = { min: 0.02, max: 1.2, step: 0.005 } as const;
export const PLACED_ART_NUDGE = { min: -0.6, max: 0.6, step: 0.002 } as const;
export const PLACED_ART_ROTATE = { min: -180, max: 180, step: 0.5 } as const;

export type LondonPlacedArtMap = Record<string, LondonPlacedArt>;

const STORAGE_KEY = "tp-next-london-placed-art-v1";
const CHANNEL = "tp-next-london-placed-art";

const EMPTY: LondonPlacedArtMap = {};

let store: LondonPlacedArtMap = {};
let hydrated = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitiseFill(value: unknown): string {
  return parsePaint(value).hex;
}

/**
 * Read a paint value. `alpha` carries the transparency the file itself declared
 * (`rgba()` / `#rrggbbaa`), and `painted` is false for `none` / `transparent`,
 * so a shape the designer made see-through is never turned into solid ink.
 */
export function parsePaint(value: unknown): { hex: string; alpha: number; painted: boolean } {
  const s = typeof value === "string" ? value.trim() : "";
  const key = s.toLowerCase();
  if (key === "none" || key === "transparent") return { hex: "#000000", alpha: 0, painted: false };
  if (/^#[0-9a-f]{3,4}$/i.test(s)) {
    const hex = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toUpperCase();
    const a = s.length === 5 ? parseInt(`${s[4]}${s[4]}`, 16) / 255 : 1;
    return { hex, alpha: a, painted: true };
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) return { hex: s.toUpperCase(), alpha: 1, painted: true };
  if (/^#[0-9a-f]{8}$/i.test(s)) {
    return {
      hex: s.slice(0, 7).toUpperCase(),
      alpha: parseInt(s.slice(7), 16) / 255,
      painted: true,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (rgb) {
    const parts = rgb[1]!
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map((p) => Number(p.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      const hex = `#${parts
        .slice(0, 3)
        .map((n) =>
          Math.max(0, Math.min(255, Math.round(n)))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`.toUpperCase();
      const a = parts.length >= 4 && Number.isFinite(parts[3]!) ? parts[3]! : 1;
      return { hex, alpha: Math.max(0, Math.min(1, a)), painted: true };
    }
  }
  const named = NAMED_INK[key];
  if (named) return { hex: named, alpha: 1, painted: true };
  return { hex: "#03002C", alpha: 1, painted: true };
}

const NAMED_INK: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  grey: "#808080",
  gray: "#808080",
  red: "#FF0000",
  blue: "#0000FF",
  green: "#008000",
};

/** Normalise an artwork record read from storage or an import. */
export function normalisePlacedArt(input: unknown): LondonPlacedArt | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Partial<LondonPlacedArt>;
  const paths = Array.isArray(a.paths)
    ? a.paths
        .filter((p): p is PlacedArtPath => !!p && typeof p.d === "string" && p.d.trim().length > 0)
        .slice(0, 4000)
        .map((p) => ({
          d: p.d,
          fill: sanitiseFill(p.fill),
          ...(p.fillRule === "evenodd" ? { fillRule: "evenodd" as const } : {}),
          m: (Array.isArray(p.m) && p.m.length === 6 && p.m.every((n) => Number.isFinite(n))
            ? (p.m as PlacedArtMatrix)
            : [1, 0, 0, 1, 0, 0]) as PlacedArtMatrix,
          ...(typeof p.alpha === "number" && p.alpha > 0 && p.alpha < 1 ? { alpha: p.alpha } : {}),
        }))
    : [];
  if (paths.length === 0) return null;
  const w = clamp(a.w, 0.0001, 1e7, 100);
  const h = clamp(a.h, 0.0001, 1e7, 100);
  return {
    name: typeof a.name === "string" ? a.name.slice(0, 120) : "artwork",
    format: a.format === "eps" ? "eps" : "svg",
    paths,
    w,
    h,
    on: a.on !== false,
    size: clamp(a.size, PLACED_ART_SIZE.min, PLACED_ART_SIZE.max, 0.3),
    dx: clamp(a.dx, PLACED_ART_NUDGE.min, PLACED_ART_NUDGE.max, 0),
    dy: clamp(a.dy, PLACED_ART_NUDGE.min, PLACED_ART_NUDGE.max, 0),
    rotate: clamp(a.rotate, PLACED_ART_ROTATE.min, PLACED_ART_ROTATE.max, 0),
    opacity: clamp(a.opacity, 0.05, 1, 1),
    onTop: a.onTop !== false,
    ...(() => {
      const map = normaliseRecolour(a.recolour);
      return map ? { recolour: map } : {};
    })(),
  };
}

/** Clean an ink-swap map: hex keys → hex values, capped. */
export function normaliseRecolour(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>).slice(0, 64)) {
    if (!/^#[0-9A-F]{6}$/i.test(key.trim())) continue;
    const from = key.trim().toUpperCase();
    const to = sanitiseFill(value);
    if (to === from) continue;
    out[from] = to;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Every distinct ink in the uploaded artwork, most-used first. */
export function placedArtInks(art: LondonPlacedArt): { from: string; to: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of art.paths) counts.set(p.fill, (counts.get(p.fill) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([from, count]) => ({ from, to: art.recolour?.[from] ?? from, count }));
}

/** The ink a path actually prints in, after any swap. */
export function placedArtFill(art: LondonPlacedArt, fill: string): string {
  return art.recolour?.[fill] ?? fill;
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const next: LondonPlacedArtMap = {};
      for (const [id, value] of Object.entries(parsed)) {
        const art = normalisePlacedArt(value);
        if (art) next[id] = art;
      }
      store = next;
    }
  } catch {
    store = {};
  }
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      const data = event.data as { id?: string; art?: unknown } | null;
      if (!data || typeof data.id !== "string") return;
      const art = normalisePlacedArt(data.art);
      store = { ...store };
      if (art) store[data.id] = art;
      else delete store[data.id];
      listeners.forEach((l) => l());
    };
  } catch {
    channel = null;
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota — the session copy still drives the preview */
  }
}

/** Artwork placed on one panel, or `null`. */
export function londonPlacedArt(panelId: string): LondonPlacedArt | null {
  hydrate();
  return store[panelId] ?? null;
}

export function londonPlacedArtMap(): LondonPlacedArtMap {
  hydrate();
  return store;
}

/** Set (or patch) the artwork on a panel. Broadcasts to every open editor. */
export function setLondonPlacedArt(panelId: string, patch: Partial<LondonPlacedArt> | null): void {
  hydrate();
  const next = { ...store };
  if (patch === null) {
    delete next[panelId];
    markLondonOverrideCleared("placedArt", panelId);
  } else {
    clearLondonOverrideCleared("placedArt", panelId);
    const merged = normalisePlacedArt({ ...(store[panelId] ?? {}), ...patch });
    if (!merged) return;
    next[panelId] = merged;
  }
  store = next;
  persist();
  listeners.forEach((l) => l());
  try {
    channel?.postMessage({ id: panelId, art: next[panelId] ?? null });
  } catch {
    /* channel closed */
  }
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React view of every panel's placed artwork. */
export function useLondonPlacedArt(): LondonPlacedArtMap {
  return useSyncExternalStore(
    subscribe,
    () => {
      hydrate();
      return store;
    },
    () => EMPTY,
  );
}

/**
 * Printed box of the placed artwork, in mm on the bleed sheet, plus the
 * rotation to apply about its centre.
 */
export function londonPlacedArtBox(
  panel: { trimW: number; trimH: number; bleedW: number; bleedH: number },
  art: LondonPlacedArt,
): { x: number; y: number; w: number; h: number; cx: number; cy: number; rotate: number } {
  const w = panel.trimW * art.size;
  const h = (w * art.h) / art.w;
  const cx = panel.bleedW / 2 + art.dx * panel.trimW;
  const cy = panel.bleedH / 2 + art.dy * panel.trimH;
  return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy, rotate: art.rotate };
}

// ---------------------------------------------------------------------------
// SVG import
// ---------------------------------------------------------------------------

export type PlacedArtImport = {
  art: LondonPlacedArt;
  /** Everything the importer had to leave behind, for the designer to see. */
  warnings: string[];
};

const BANNED_TAGS = ["script", "foreignobject", "use", "image", "text", "tspan", "textpath"];

function mul(a: PlacedArtMatrix, b: PlacedArtMatrix): PlacedArtMatrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function parseTransform(value: string | null): PlacedArtMatrix {
  let m: PlacedArtMatrix = [1, 0, 0, 1, 0, 0];
  if (!value) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let hit: RegExpExecArray | null;
  while ((hit = re.exec(value))) {
    const n = hit[2]!
      .split(/[\s,]+/)
      .map(Number)
      .filter((x) => Number.isFinite(x));
    const rad = (deg: number) => (deg * Math.PI) / 180;
    switch (hit[1]) {
      case "matrix":
        if (n.length === 6) m = mul(m, n as PlacedArtMatrix);
        break;
      case "translate":
        m = mul(m, [1, 0, 0, 1, n[0] ?? 0, n[1] ?? 0]);
        break;
      case "scale":
        m = mul(m, [n[0] ?? 1, 0, 0, n[1] ?? n[0] ?? 1, 0, 0]);
        break;
      case "rotate": {
        const a = rad(n[0] ?? 0);
        const cx = n[1] ?? 0;
        const cy = n[2] ?? 0;
        m = mul(m, [1, 0, 0, 1, cx, cy]);
        m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
        m = mul(m, [1, 0, 0, 1, -cx, -cy]);
        break;
      }
      case "skewX":
        m = mul(m, [1, 0, Math.tan(rad(n[0] ?? 0)), 1, 0, 0]);
        break;
      case "skewY":
        m = mul(m, [1, Math.tan(rad(n[0] ?? 0)), 0, 1, 0, 0]);
        break;
    }
  }
  return m;
}

function num(el: Element, name: string, fallback = 0): number {
  const v = Number(el.getAttribute(name));
  return Number.isFinite(v) ? v : fallback;
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const k = 0.5522847498;
  return (
    `M ${cx - rx} ${cy} ` +
    `C ${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry} ` +
    `C ${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy} ` +
    `C ${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry} ${cx} ${cy + ry} ` +
    `C ${cx - rx * k} ${cy + ry} ${cx - rx} ${cy + ry * k} ${cx - rx} ${cy} Z`
  );
}

function shapeToPath(el: Element): string | null {
  switch (el.tagName.toLowerCase()) {
    case "path":
      return el.getAttribute("d");
    case "rect": {
      const x = num(el, "x");
      const y = num(el, "y");
      const w = num(el, "width");
      const h = num(el, "height");
      if (!(w > 0) || !(h > 0)) return null;
      // Rounded corners are part of the artwork: dropping rx/ry printed a
      // sharp-cornered box where the designer drew a soft one.
      const rxAttr = el.getAttribute("rx");
      const ryAttr = el.getAttribute("ry");
      let rx = rxAttr !== null ? num(el, "rx") : ryAttr !== null ? num(el, "ry") : 0;
      let ry = ryAttr !== null ? num(el, "ry") : rx;
      rx = Math.min(Math.max(rx, 0), w / 2);
      ry = Math.min(Math.max(ry, 0), h / 2);
      if (!(rx > 0) || !(ry > 0)) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
      const k = 0.5522847498;
      const cx = rx * k;
      const cy = ry * k;
      return (
        `M ${x + rx} ${y} ` +
        `L ${x + w - rx} ${y} ` +
        `C ${x + w - rx + cx} ${y} ${x + w} ${y + ry - cy} ${x + w} ${y + ry} ` +
        `L ${x + w} ${y + h - ry} ` +
        `C ${x + w} ${y + h - ry + cy} ${x + w - rx + cx} ${y + h} ${x + w - rx} ${y + h} ` +
        `L ${x + rx} ${y + h} ` +
        `C ${x + rx - cx} ${y + h} ${x} ${y + h - ry + cy} ${x} ${y + h - ry} ` +
        `L ${x} ${y + ry} ` +
        `C ${x} ${y + ry - cy} ${x + rx - cx} ${y} ${x + rx} ${y} Z`
      );
    }
    case "circle": {
      const r = num(el, "r");
      return r > 0 ? ellipsePath(num(el, "cx"), num(el, "cy"), r, r) : null;
    }
    case "ellipse": {
      const rx = num(el, "rx");
      const ry = num(el, "ry");
      return rx > 0 && ry > 0 ? ellipsePath(num(el, "cx"), num(el, "cy"), rx, ry) : null;
    }
    case "polygon":
    case "polyline": {
      const pts = (el.getAttribute("points") ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => Number.isFinite(n));
      if (pts.length < 4) return null;
      let d = `M ${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += ` L ${pts[i]} ${pts[i + 1]}`;
      return el.tagName.toLowerCase() === "polygon" ? `${d} Z` : d;
    }
    case "line":
      return `M ${num(el, "x1")} ${num(el, "y1")} L ${num(el, "x2")} ${num(el, "y2")}`;
    default:
      return null;
  }
}

function inherited(el: Element, name: string): string | null {
  let node: Element | null = el;
  while (node) {
    const style = node.getAttribute("style");
    if (style) {
      const hit = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, "i").exec(style);
      if (hit) return hit[1]!.trim();
    }
    const attr = node.getAttribute(name);
    if (attr) return attr;
    node = node.parentElement;
  }
  return null;
}

/** Length in user units from an SVG width/height attribute (mm/pt/px/in accepted). */
function lengthPx(value: string | null): number | null {
  if (!value) return null;
  const hit = /^\s*(-?[\d.]+)\s*(px|pt|mm|cm|in|pc|%)?\s*$/i.exec(value);
  if (!hit) return null;
  const n = Number(hit[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (hit[2] ?? "px").toLowerCase();
  const perInch = 96;
  switch (unit) {
    case "mm":
      return (n / 25.4) * perInch;
    case "cm":
      return (n / 2.54) * perInch;
    case "in":
      return n * perInch;
    case "pt":
      return (n / 72) * perInch;
    case "pc":
      return (n / 6) * perInch;
    case "%":
      return null;
    default:
      return n;
  }
}

/**
 * Parse an uploaded `.svg` into placeable vector geometry. Runs in the browser
 * (it uses DOMParser) at upload time; the render path only ever sees paths.
 */

/**
 * The PDF path writer speaks the command set Illustrator writes (M/L/H/V/C/S/Z).
 * Quadratic curves become their exact cubic equivalent and elliptical arcs are
 * flattened to 90°-max cubic segments, so imported artwork keeps every shape it
 * was drawn with instead of losing arc-based geometry.
 */
/**
 * One elliptical arc as up to four cubic segments (max 90° each), the standard
 * SVG endpoint→centre parameterisation. Arcs used to be dropped, which quietly
 * deleted whole shapes — rounded corners, dials, pie wedges — from the master.
 */
function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  rotDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): number[][] {
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const phi = (rotDeg * Math.PI) / 180;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosP * dx + sinP * dy;
  const y1p = -sinP * dx + cosP * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const factor = Math.sqrt(Math.max(0, num / den)) * (largeArc === sweep ? -1 : 1);
  const cxp = (factor * rx * y1p) / ry;
  const cyp = (-factor * ry * x1p) / rx;
  const cx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
  const cy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    const a = Math.acos(Math.min(1, Math.max(-1, len === 0 ? 1 : dot / len)));
    return ux * vy - uy * vx < 0 ? -a : a;
  };
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  const theta1 = angle(1, 0, ux, uy);
  let delta = angle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  const step = delta / segments;
  const alpha = (4 / 3) * Math.tan(step / 4);
  const point = (t: number) => {
    const ct = Math.cos(t);
    const st = Math.sin(t);
    return {
      x: cx + rx * cosP * ct - ry * sinP * st,
      y: cy + rx * sinP * ct + ry * cosP * st,
      dx: -rx * cosP * st - ry * sinP * ct,
      dy: -rx * sinP * st + ry * cosP * ct,
    };
  };
  const out: number[][] = [];
  for (let s = 0; s < segments; s += 1) {
    const t0 = theta1 + s * step;
    const t1 = t0 + step;
    const p0 = point(t0);
    const p1 = point(t1);
    out.push([
      p0.x + alpha * p0.dx,
      p0.y + alpha * p0.dy,
      p1.x - alpha * p1.dx,
      p1.y - alpha * p1.dy,
      p1.x,
      p1.y,
    ]);
  }
  return out;
}

export function normalisePathData(d: string): { d: string; arcs: boolean } {
  if (!/[QqTtAa]/.test(d)) return { d, arcs: false };
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const out: string[] = [];
  let cmd = "";
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let qx: number | null = null;
  let qy: number | null = null;
  const num = (i: number) => Number(tokens[i]);
  const cubicFromQuad = (cx: number, cy: number, ex: number, ey: number) => {
    const c1x = x + (2 / 3) * (cx - x);
    const c1y = y + (2 / 3) * (cy - y);
    const c2x = ex + (2 / 3) * (cx - ex);
    const c2y = ey + (2 / 3) * (cy - ey);
    out.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`);
    qx = cx;
    qy = cy;
    x = ex;
    y = ey;
  };
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i += 1;
      if (cmd === "Z" || cmd === "z") {
        out.push("Z");
        x = sx;
        y = sy;
        qx = qy = null;
      }
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M": {
        const nx = rel ? x + num(i) : num(i);
        const ny = rel ? y + num(i + 1) : num(i + 1);
        out.push(`M ${nx} ${ny}`);
        x = sx = nx;
        y = sy = ny;
        qx = qy = null;
        i += 2;
        cmd = rel ? "l" : "L";
        break;
      }
      case "L": {
        const nx = rel ? x + num(i) : num(i);
        const ny = rel ? y + num(i + 1) : num(i + 1);
        out.push(`L ${nx} ${ny}`);
        x = nx;
        y = ny;
        qx = qy = null;
        i += 2;
        break;
      }
      case "H": {
        const nx = rel ? x + num(i) : num(i);
        out.push(`L ${nx} ${y}`);
        x = nx;
        qx = qy = null;
        i += 1;
        break;
      }
      case "V": {
        const ny = rel ? y + num(i) : num(i);
        out.push(`L ${x} ${ny}`);
        y = ny;
        qx = qy = null;
        i += 1;
        break;
      }
      case "C": {
        const v = [0, 1, 2, 3, 4, 5].map((k) =>
          rel ? (k % 2 === 0 ? x + num(i + k) : y + num(i + k)) : num(i + k),
        );
        out.push(`C ${v.join(" ")}`);
        x = v[4]!;
        y = v[5]!;
        qx = qy = null;
        i += 6;
        break;
      }
      case "S": {
        const v = [0, 1, 2, 3].map((k) =>
          rel ? (k % 2 === 0 ? x + num(i + k) : y + num(i + k)) : num(i + k),
        );
        out.push(`S ${v.join(" ")}`);
        x = v[2]!;
        y = v[3]!;
        qx = qy = null;
        i += 4;
        break;
      }
      case "Q": {
        const cx = rel ? x + num(i) : num(i);
        const cy = rel ? y + num(i + 1) : num(i + 1);
        const ex = rel ? x + num(i + 2) : num(i + 2);
        const ey = rel ? y + num(i + 3) : num(i + 3);
        cubicFromQuad(cx, cy, ex, ey);
        i += 4;
        break;
      }
      case "T": {
        const cx = qx === null ? x : 2 * x - qx;
        const cy = qy === null ? y : 2 * y - qy;
        const ex = rel ? x + num(i) : num(i);
        const ey = rel ? y + num(i + 1) : num(i + 1);
        cubicFromQuad(cx, cy, ex, ey);
        i += 2;
        break;
      }
      case "A": {
        const rx = num(i);
        const ry = num(i + 1);
        const rot = num(i + 2);
        const largeArc = num(i + 3) !== 0;
        const sweep = num(i + 4) !== 0;
        const ex = rel ? x + num(i + 5) : num(i + 5);
        const ey = rel ? y + num(i + 6) : num(i + 6);
        for (const c of arcToCubics(x, y, rx, ry, rot, largeArc, sweep, ex, ey)) {
          out.push(`C ${c.join(" ")}`);
        }
        x = ex;
        y = ey;
        qx = qy = null;
        i += 7;
        break;
      }
      default:
        i += 1;
    }
  }
  return { d: out.join(" "), arcs: false };
}

export function parseSvgArtwork(source: string, name: string): PlacedArtImport {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") {
    throw new Error("That file is not an SVG we can read.");
  }
  const warnings: string[] = [];
  const banned = new Set<string>();
  for (const tag of BANNED_TAGS) {
    if (root.getElementsByTagName(tag).length > 0) banned.add(tag);
  }
  if (banned.has("text") || banned.has("tspan") || banned.has("textpath")) {
    throw new Error(
      "This SVG still has live text. Outline the copy in Illustrator (Type → Create Outlines) and upload again — signage masters cannot carry substitutable fonts.",
    );
  }
  if (banned.has("image")) {
    throw new Error(
      "This SVG places a photo or raster image. Signage artwork layers must be vector only — supply the outlined vector version.",
    );
  }
  if (banned.has("use")) {
    warnings.push("Cloned <use> shapes were skipped — expand them in Illustrator to include them.");
  }
  if (banned.has("script") || banned.has("foreignobject")) {
    warnings.push("Embedded script/HTML was ignored.");
  }

  const viewBox = (root.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const hasBox =
    viewBox.length === 4 && viewBox.every((n) => Number.isFinite(n)) && viewBox[2]! > 0;
  const w = hasBox ? viewBox[2]! : (lengthPx(root.getAttribute("width")) ?? 100);
  const h = hasBox ? viewBox[3]! : (lengthPx(root.getAttribute("height")) ?? 100);
  const base: PlacedArtMatrix = hasBox
    ? [1, 0, 0, 1, -viewBox[0]!, -viewBox[1]!]
    : [1, 0, 0, 1, 0, 0];

  const paths: PlacedArtPath[] = [];
  let strokeOnly = 0;
  let arcShapes = 0;
  let invisible = 0;
  /** An element's own opacity, ignoring ancestors (those are multiplied in). */
  const own = (el: Element, name: string): number | null => {
    const style = el.getAttribute("style");
    const hit = style ? new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, "i").exec(style) : null;
    const raw = hit ? hit[1]!.trim() : el.getAttribute(name);
    if (raw === null || raw === undefined || raw === "") return null;
    const pct = /%$/.test(raw.trim());
    const n = Number(raw.trim().replace(/%$/, ""));
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(1, pct ? n / 100 : n));
  };
  // `group` is the accumulated opacity of every ancestor, so nested <g> fades
  // in the uploaded file survive into the master exactly as drawn.
  const walk = (el: Element, m: PlacedArtMatrix, group: number) => {
    const tag = el.tagName.toLowerCase();
    if (BANNED_TAGS.includes(tag)) return;
    const here = mul(m, parseTransform(el.getAttribute("transform")));
    const alphaHere = group * (own(el, "opacity") ?? 1);
    const raw = shapeToPath(el);
    const normalised = raw && raw.trim() ? normalisePathData(raw.trim()) : null;
    if (normalised?.arcs) arcShapes += 1;
    const d = normalised && !normalised.arcs ? normalised.d : "";
    if (d && d.trim()) {
      const paint = parsePaint(inherited(el, "fill") ?? "#000000");
      const alpha = alphaHere * paint.alpha * (own(el, "fill-opacity") ?? 1);
      if (!paint.painted) {
        strokeOnly += 1;
      } else if (alpha <= 0.004) {
        // The file says this shape is invisible; keep it out of the master
        // rather than printing it as solid ink.
        invisible += 1;
      } else {
        paths.push({
          d: d.trim(),
          fill: paint.hex,
          ...(inherited(el, "fill-rule")?.trim() === "evenodd"
            ? { fillRule: "evenodd" as const }
            : {}),
          m: here,
          ...(alpha < 1 ? { alpha: Number(alpha.toFixed(4)) } : {}),
        });
      }
    }
    for (const child of Array.from(el.children)) walk(child, here, alphaHere);
  };
  for (const child of Array.from(root.children)) walk(child, base, 1);

  if (invisible > 0) {
    warnings.push(
      `${invisible} fully transparent shape${invisible === 1 ? " was" : "s were"} left out — the file had them at 0% opacity.`,
    );
  }

  if (strokeOnly > 0) {
    warnings.push(
      `${strokeOnly} unfilled (stroke-only) shape${strokeOnly === 1 ? "" : "s"} were skipped — expand strokes to outlines to print them.`,
    );
  }
  if (arcShapes > 0) {
    warnings.push(
      `${arcShapes} shape${arcShapes === 1 ? "" : "s"} drawn with elliptical arcs ${
        arcShapes === 1 ? "was" : "were"
      } skipped — expand them to bezier outlines in Illustrator to print them.`,
    );
  }
  if (paths.length === 0) {
    throw new Error("No filled vector shapes were found in that SVG.");
  }
  const art = normalisePlacedArt({
    name,
    format: "svg",
    paths,
    w,
    h,
    on: true,
    size: 0.3,
    dx: 0,
    dy: 0,
    rotate: 0,
    opacity: 1,
    onTop: true,
  });
  if (!art) throw new Error("That artwork could not be prepared for the signage master.");
  return { art, warnings };
}

// ---------------------------------------------------------------------------
// EPS import
// ---------------------------------------------------------------------------

/**
 * Parse an Illustrator `.eps` into placeable geometry by interpreting the
 * PostScript path operators Illustrator writes (`m l c v y` + `f F b B s S n`)
 * with its colour operators (`g k Xa`). EPS space is y-up, so the geometry is
 * flipped into the y-down artwork box on the way in.
 */
export function parseEpsArtwork(source: string, name: string): PlacedArtImport {
  const warnings: string[] = [];
  const bboxLine =
    /%%HiResBoundingBox:\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/.exec(source) ??
    /%%BoundingBox:\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/.exec(source);
  if (!bboxLine) {
    throw new Error("That EPS has no bounding box — re-save it from Illustrator as EPS.");
  }
  const x0 = Number(bboxLine[1]);
  const y0 = Number(bboxLine[2]);
  const x1 = Number(bboxLine[3]);
  const y1 = Number(bboxLine[4]);
  const w = x1 - x0;
  const h = y1 - y0;
  if (!(w > 0) || !(h > 0)) throw new Error("That EPS reports an empty bounding box.");

  // Only the visible PostScript is interpreted; Illustrator's private data
  // (%AI9_PrivateDataBegin …) is not a drawing program and is skipped.
  const visible = source.split(/%AI\d*_PrivateDataBegin/)[0] ?? source;
  const tokens = visible.split(/[\s\r\n]+/);

  const paths: PlacedArtPath[] = [];
  let fill = "#000000";
  let current: string[] = [];
  let cursor: { x: number; y: number } | null = null;
  let strokeOnly = 0;
  const stack: number[] = [];
  const pop = (n: number): number[] => stack.splice(Math.max(0, stack.length - n), n);
  const pt = (x: number, y: number) => `${(x - x0).toFixed(3)} ${(y1 - y).toFixed(3)}`;
  const hex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
      .map((c) =>
        Math.max(0, Math.min(255, Math.round(c * 255)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`.toUpperCase();

  const flush = (paint: boolean, evenodd: boolean) => {
    if (paint && current.length > 0) {
      paths.push({
        d: current.join(" "),
        fill,
        ...(evenodd ? { fillRule: "evenodd" as const } : {}),
        m: [1, 0, 0, 1, 0, 0],
      });
    } else if (!paint && current.length > 0) {
      strokeOnly += 1;
    }
    current = [];
    cursor = null;
  };

  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;
    const n = Number(token);
    if (Number.isFinite(n) && /^[-.\d]/.test(token)) {
      stack.push(n);
      if (stack.length > 64) stack.shift();
      continue;
    }
    switch (token) {
      case "m":
      case "moveto": {
        const [x, y] = pop(2);
        if (x === undefined || y === undefined) break;
        current.push(`M ${pt(x, y)}`);
        cursor = { x, y };
        break;
      }
      case "rmoveto": {
        const [dx, dy] = pop(2);
        if (dx === undefined || dy === undefined || !cursor) break;
        const x: number = cursor.x + dx;
        const y: number = cursor.y + dy;
        current.push(`M ${pt(x, y)}`);
        cursor = { x, y };
        break;
      }
      case "l":
      case "L":
      case "lineto": {
        const [x, y] = pop(2);
        if (x === undefined || y === undefined) break;
        current.push(`L ${pt(x, y)}`);
        cursor = { x, y };
        break;
      }
      case "rlineto": {
        const [dx, dy] = pop(2);
        if (dx === undefined || dy === undefined || !cursor) break;
        const x: number = cursor.x + dx;
        const y: number = cursor.y + dy;
        current.push(`L ${pt(x, y)}`);
        cursor = { x, y };
        break;
      }
      case "c":
      case "C":
      case "curveto": {
        const [ax, ay, bx, by, x, y] = pop(6);
        if (x === undefined || y === undefined) break;
        current.push(`C ${pt(ax!, ay!)} ${pt(bx!, by!)} ${pt(x, y)}`);
        cursor = { x, y };
        break;
      }
      case "v":
      case "V": {
        const [bx, by, x, y] = pop(4);
        if (x === undefined || y === undefined || !cursor) break;
        current.push(`C ${pt(cursor.x, cursor.y)} ${pt(bx!, by!)} ${pt(x, y)}`);
        cursor = { x, y };
        break;
      }
      case "y":
      case "Y": {
        const [ax, ay, x, y] = pop(4);
        if (x === undefined || y === undefined) break;
        current.push(`C ${pt(ax!, ay!)} ${pt(x, y)} ${pt(x, y)}`);
        cursor = { x, y };
        break;
      }
      case "g": {
        const [grey] = pop(1);
        if (grey !== undefined) fill = hex(grey, grey, grey);
        break;
      }
      case "k": {
        const [c, mm, yy, kk] = pop(4);
        if (kk !== undefined) {
          fill = hex((1 - c!) * (1 - kk), (1 - mm!) * (1 - kk), (1 - yy!) * (1 - kk));
        }
        break;
      }
      case "Xa":
      case "XA":
      case "setrgbcolor": {
        const [r, g2, b] = pop(3);
        if (b !== undefined) fill = hex(r!, g2!, b);
        break;
      }
      case "setgray": {
        const [grey] = pop(1);
        if (grey !== undefined) fill = hex(grey, grey, grey);
        break;
      }
      case "setcmykcolor": {
        const [c, mm, yy, kk] = pop(4);
        if (kk !== undefined) {
          fill = hex((1 - c!) * (1 - kk), (1 - mm!) * (1 - kk), (1 - yy!) * (1 - kk));
        }
        break;
      }
      // A plain-PostScript closepath only shuts the subpath; the paint
      // operator that follows decides whether it is filled.
      case "closepath":
        if (current.length > 0) current.push("Z");
        break;
      case "f":
      case "F":
      case "b":
      case "B":
      case "fill":
        current.push("Z");
        flush(true, false);
        break;
      case "f*":
      case "F*":
      case "b*":
      case "B*":
      case "eofill":
        current.push("Z");
        flush(true, true);
        break;
      case "s":
      case "S":
      case "stroke":
        flush(false, false);
        break;
      case "n":
      case "N":
        flush(false, false);
        break;
      case "newpath":
        break;
      default:
        stack.length = 0;
        break;
    }
  }

  if (strokeOnly > 0) {
    warnings.push(
      `${strokeOnly} stroked path${strokeOnly === 1 ? "" : "s"} were skipped — expand strokes to outlines in Illustrator to print them.`,
    );
  }
  if (paths.length === 0) {
    throw new Error(
      "No drawable paths were found in that EPS — its artwork is held in Illustrator private data. Open it and save a copy as SVG (or an EPS without Illustrator-only data) and upload that.",
    );
  }
  const art = normalisePlacedArt({
    name,
    format: "eps",
    paths,
    w,
    h,
    on: true,
    size: 0.3,
    dx: 0,
    dy: 0,
    rotate: 0,
    opacity: 1,
    onTop: true,
  });
  if (!art) throw new Error("That artwork could not be prepared for the signage master.");
  return { art, warnings };
}

/** Route an uploaded file to the right importer by name/content. */
export function parseArtworkFile(source: string, name: string): PlacedArtImport {
  const lower = name.toLowerCase();
  if (lower.endsWith(".svg") || /<svg[\s>]/i.test(source.slice(0, 4000))) {
    return parseSvgArtwork(source, name);
  }
  if (lower.endsWith(".eps") || lower.endsWith(".ai") || source.startsWith("%!PS")) {
    return parseEpsArtwork(source, name);
  }
  throw new Error("Upload an .svg or .eps vector file.");
}
