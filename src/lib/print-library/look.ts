/**
 * Look & feel for a print library item — the presentation defaults a master
 * admin can pin on any curated or template entry. Applied to the library
 * preview card and stamped into the editable copy's context, so an editor
 * opens the piece exactly as the library shows it.
 */

import type { PrintDensity, PrintMode, PrintPageSize } from "@/lib/print-assets.types";
import type { PrintContentFitSettings } from "@/lib/print-content-fit";

export type PrintLibraryLook = {
  mode?: PrintMode;
  pageSize?: PrintPageSize;
  marginPreset?: "tight" | "standard" | "wide";
  density?: PrintDensity;
  icons?: boolean;
  /** Accent / primary colour overrides (hex). */
  accentOverride?: string;
  primaryOverride?: string;
  /** Iconography scale multiplier (1 = layout default). */
  iconScale?: number;
  /** Overflow auto-fit settings pinned on the master (same contract as assets). */
  contentFit?: Partial<PrintContentFitSettings>;
  /** Manual fit pins from the correction panel. */
  fitOverride?: { scale?: number; pad?: number };
};

const MODES: PrintMode[] = ["light", "dark"];
const SIZES: PrintPageSize[] = ["Letter", "A4", "Square", "HalfLetter", "A5"];
const MARGINS = ["tight", "standard", "wide"] as const;
const DENSITIES = ["compact", "standard", "airy"] as const;

const hex = (v: unknown): string | undefined =>
  typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v.trim()) ? v.trim() : undefined;

/** Validate an untrusted `look` payload (DB override row / JSON editor). */
export function parseLook(raw: unknown): PrintLibraryLook | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const look: PrintLibraryLook = {};
  if (MODES.includes(r["mode"] as PrintMode)) look.mode = r["mode"] as PrintMode;
  if (SIZES.includes(r["pageSize"] as PrintPageSize)) look.pageSize = r["pageSize"] as PrintPageSize;
  if ((MARGINS as readonly string[]).includes(String(r["marginPreset"])))
    look.marginPreset = r["marginPreset"] as PrintLibraryLook["marginPreset"];
  if ((DENSITIES as readonly string[]).includes(String(r["density"])))
    look.density = r["density"] as PrintDensity;
  if (typeof r["icons"] === "boolean") look.icons = r["icons"];
  const accent = hex(r["accentOverride"]);
  if (accent) look.accentOverride = accent;
  const primary = hex(r["primaryOverride"]);
  if (primary) look.primaryOverride = primary;
  const scale = Number(r["iconScale"]);
  if (Number.isFinite(scale) && scale >= 0.5 && scale <= 2) look.iconScale = scale;
  const fit = parseContentFit(r["contentFit"]);
  if (fit) look.contentFit = fit;
  const pins = parseFitOverride(r["fitOverride"]);
  if (pins) look.fitOverride = pins;
  return Object.keys(look).length ? look : undefined;
}

/** Fold a look into a print-asset context patch. */
export function lookToContext(look?: PrintLibraryLook): Record<string, unknown> {
  if (!look) return {};
  const ctx: Record<string, unknown> = {};
  if (look.mode) ctx["editorMode"] = look.mode;
  if (look.pageSize) ctx["pageSize"] = look.pageSize;
  if (look.marginPreset) ctx["marginPreset"] = look.marginPreset;
  if (look.density) ctx["density"] = look.density;
  if (typeof look.icons === "boolean") ctx["icons"] = look.icons;
  if (look.accentOverride) ctx["accentOverride"] = look.accentOverride;
  if (look.primaryOverride) ctx["primaryOverride"] = look.primaryOverride;
  if (look.iconScale) ctx["iconStyle"] = { scale: look.iconScale };
  if (look.contentFit) ctx["contentFit"] = look.contentFit;
  if (look.fitOverride) ctx["fitOverride"] = look.fitOverride;
  return ctx;
}

const num = (v: unknown, lo: number, hi: number): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
};

/** Validate an untrusted content-fit payload. */
function parseContentFit(raw: unknown): Partial<PrintContentFitSettings> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const out: Partial<PrintContentFitSettings> = {};
  if (typeof r["enabled"] === "boolean") out.enabled = r["enabled"];
  if (typeof r["marginRelief"] === "boolean") out.marginRelief = r["marginRelief"];
  const threshold = num(r["threshold"], 0.02, 0.6);
  if (threshold !== undefined) out.threshold = threshold;
  const minScale = num(r["minScale"], 0.6, 1);
  if (minScale !== undefined) out.minScale = minScale;
  const minPad = num(r["minPad"], 0.4, 1);
  if (minPad !== undefined) out.minPad = minPad;
  return Object.keys(out).length ? out : undefined;
}

/** Validate manual fit pins. */
function parseFitOverride(raw: unknown): { scale?: number; pad?: number } | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const out: { scale?: number; pad?: number } = {};
  const scale = num(r["scale"], 0.6, 1);
  if (scale !== undefined) out.scale = scale;
  const pad = num(r["pad"], 0.4, 1);
  if (pad !== undefined) out.pad = pad;
  return Object.keys(out).length ? out : undefined;
}
