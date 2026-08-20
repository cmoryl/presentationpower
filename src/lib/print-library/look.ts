/**
 * Look & feel for a print library item — the presentation defaults a master
 * admin can pin on any curated or template entry. Applied to the library
 * preview card and stamped into the editable copy's context, so an editor
 * opens the piece exactly as the library shows it.
 */

import type { PrintDensity, PrintMode, PrintPageSize } from "@/lib/print-assets.types";

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
};

const MODES: PrintMode[] = ["light", "dark"];
const SIZES: PrintPageSize[] = ["Letter", "A4", "Square", "HalfLetter", "A5"] as PrintPageSize[];
const MARGINS = ["tight", "standard", "wide"] as const;
const DENSITIES = ["compact", "standard", "roomy"] as const;

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
  return ctx;
}
