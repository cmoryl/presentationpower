// -----------------------------------------------------------------------------
// PRINT COLOR CONTRACT
//
// There is no correct automatic CMYK for a saturated screen blue like
// #003FC7 — the build depends on stock and profile, and it shifts visibly on
// coated. So this module deliberately does NOT convert RGB to CMYK. It defines
// a SECOND definition per brand mode, in the same slot contract as the screen
// tokens (primary / accent / surface / ink), that a brand owner signs off on.
//
// Until a slot is signed off it stays `pending`. Preflight blocks press output
// on pending slots rather than silently guessing a build. Proposed values below
// are starting points for the sign-off conversation, never an approval.
//
// Two output intents, because the answers differ:
//   • offset  — spot colors available; the primary may be a Pantone match.
//   • digital — process CMYK only (toner/inkjet POD); no spots.
//
// Ink rule that is NOT negotiable: body text separates to 100K only. Navy
// #03002C as a four-color build fringes at small point sizes on any press with
// registration slip. Rich black is permitted for large fills and panels only.
// -----------------------------------------------------------------------------

import { BRAND_MODES, type BrandMode } from "@/lib/taxonomy";

export type PrintIntent = "offset" | "digital";

export type Cmyk = { c: number; m: number; y: number; k: number };

export type SpotColor = {
  /** Pantone (or other) name exactly as it must appear on the separation. */
  name: string;
  /** Process fallback for pages/jobs where the spot is unavailable. */
  fallback: Cmyk;
};

export type PrintSlotStatus = "approved" | "pending";

export type PrintColorSlot = {
  /** The screen token this print build corresponds to. */
  role: "primary" | "accent" | "surface" | "ink";
  /** The sRGB hex it is derived from — kept for traceability, not conversion. */
  sourceHex: string;
  status: PrintSlotStatus;
  /** Process build. `undefined` when nobody has authored one yet. */
  cmyk?: Cmyk;
  /** Offset only. Ignored for digital output. */
  spot?: SpotColor;
  /** Who signed it off, when. Empty while pending. */
  approvedBy?: string;
  approvedOn?: string;
  /** Free-text guidance from the brand owner (stock caveats, do-nots). */
  note?: string;
};

export type PrintColorBuild = {
  brandModeId: string;
  intent: PrintIntent;
  slots: PrintColorSlot[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Ink rules
// ─────────────────────────────────────────────────────────────────────────────

/** Flat 100K — the only permitted separation for body copy. */
export const TEXT_BLACK: Cmyk = { c: 0, m: 0, y: 0, k: 100 };

/** Rich black for large fills and panels only. Never behind small type. */
export const RICH_BLACK: Cmyk = { c: 60, m: 40, y: 40, k: 100 };

/**
 * Point size at or below which a fill must resolve to 100K. Above it, a rich
 * or navy build is acceptable because registration slip is not legible.
 */
export const SMALL_TYPE_PT_CEILING = 24;

export type InkUse = "body-text" | "display-text" | "large-fill" | "panel" | "rule" | "image";

/** True when this use must separate to 100K regardless of the brand build. */
export function requiresFlatBlack(use: InkUse, sizePt?: number): boolean {
  if (use === "body-text" || use === "rule") return true;
  if (use === "display-text") return (sizePt ?? 0) <= SMALL_TYPE_PT_CEILING;
  return false;
}

export function cmykString(v: Cmyk): string {
  return `C${Math.round(v.c)} M${Math.round(v.m)} Y${Math.round(v.y)} K${Math.round(v.k)}`;
}

/** Total area coverage — printers cap this (typically 300–320% on coated). */
export function totalAreaCoverage(v: Cmyk): number {
  return v.c + v.m + v.y + v.k;
}

export const TAC_LIMIT_COATED = 320;
export const TAC_LIMIT_UNCOATED = 280;

// ─────────────────────────────────────────────────────────────────────────────
// Proposed builds (NOT approvals)
//
// Only the shared corporate inks have a proposed build, because those are the
// ones every brand mode reuses. Division accents are intentionally left blank:
// several are out-of-gamut on coated (#58ED21, #A1FBF9, #4ADE80) and need a
// human decision about whether they become a duller process build, a spot, or
// are simply not used in print.
// ─────────────────────────────────────────────────────────────────────────────

const PROPOSED: Record<string, { cmyk?: Cmyk; spot?: SpotColor; note?: string }> = {
  // TP Blue 500 — the identity blue. Out of process gamut; a spot is the only
  // way to hold it on coated offset.
  "#003FC7": {
    cmyk: { c: 100, m: 82, y: 0, k: 0 },
    spot: { name: "PANTONE 2728 C", fallback: { c: 100, m: 82, y: 0, k: 0 } },
    note: "Proposed only. Process build reads duller and slightly violet on coated. Spot recommended for offset covers.",
  },
  // TP Blue 800 — dark navy. Fine as a large fill; never as body text.
  "#03002C": {
    cmyk: { c: 95, m: 88, y: 40, k: 60 },
    note: "Proposed only. Large fills and panels only — body text separates to 100K.",
  },
  // Light neutral surfaces reproduce predictably; still needs sign-off because
  // a 4% tint can break up on uncoated stock.
  "#F2F2F2": { cmyk: { c: 0, m: 0, y: 0, k: 5 } },
};

function proposedFor(hex: string): { cmyk?: Cmyk; spot?: SpotColor; note?: string } | undefined {
  return PROPOSED[hex.toUpperCase()];
}

function slotFor(
  role: PrintColorSlot["role"],
  hex: string,
  intent: PrintIntent,
): PrintColorSlot {
  // Ink is the one slot with a settled answer: text is 100K, everywhere.
  if (role === "ink") {
    return {
      role,
      sourceHex: hex,
      status: "approved",
      cmyk: TEXT_BLACK,
      approvedBy: "Print standard",
      note: "Body copy separates to 100K on every stock and both intents. Navy is a fill color, not a text color.",
    };
  }
  const p = proposedFor(hex);
  return {
    role,
    sourceHex: hex,
    status: "pending",
    cmyk: p?.cmyk,
    spot: intent === "offset" ? p?.spot : undefined,
    note: p?.note ?? "No print build authored yet — brand owner sign-off required.",
  };
}

/** The full decision queue: every brand mode × both intents. */
export function printColorBuilds(brands: BrandMode[] = BRAND_MODES): PrintColorBuild[] {
  const out: PrintColorBuild[] = [];
  for (const b of brands) {
    for (const intent of ["offset", "digital"] as PrintIntent[]) {
      out.push({
        brandModeId: b.id,
        intent,
        slots: [
          slotFor("primary", b.tokens.primary, intent),
          slotFor("accent", b.tokens.accent, intent),
          slotFor("surface", b.tokens.surface, intent),
          slotFor("ink", b.tokens.ink, intent),
        ],
      });
    }
  }
  return out;
}

export function printColorBuild(
  brandModeId: string,
  intent: PrintIntent,
  brands: BrandMode[] = BRAND_MODES,
): PrintColorBuild | undefined {
  return printColorBuilds(brands).find(
    (b) => b.brandModeId === brandModeId && b.intent === intent,
  );
}

export type QueueSummary = {
  total: number;
  approved: number;
  pending: number;
  /** Slots with neither an approved build nor a proposed one to review. */
  unauthored: number;
};

export function queueSummary(builds: PrintColorBuild[]): QueueSummary {
  const slots = builds.flatMap((b) => b.slots);
  return {
    total: slots.length,
    approved: slots.filter((s) => s.status === "approved").length,
    pending: slots.filter((s) => s.status === "pending").length,
    unauthored: slots.filter((s) => s.status === "pending" && !s.cmyk).length,
  };
}

/**
 * Resolve the ink to print for a given role and use. Returns `undefined` when
 * the slot is unapproved — callers must surface that as a preflight failure
 * rather than substituting an RGB value.
 */
export function resolvePrintInk(
  brandModeId: string,
  role: PrintColorSlot["role"],
  use: InkUse,
  intent: PrintIntent,
  sizePt?: number,
): { cmyk: Cmyk; spot?: SpotColor } | { pending: true; reason: string } {
  if (requiresFlatBlack(use, sizePt) && (role === "ink" || role === "primary")) {
    return { cmyk: TEXT_BLACK };
  }
  const build = printColorBuild(brandModeId, intent);
  const slot = build?.slots.find((s) => s.role === role);
  if (!slot) return { pending: true, reason: `No print slot defined for ${role}.` };
  if (slot.status !== "approved" || !slot.cmyk) {
    return {
      pending: true,
      reason: `${role} print build for ${brandModeId} (${intent}) is awaiting brand sign-off.`,
    };
  }
  return { cmyk: slot.cmyk, spot: intent === "offset" ? slot.spot : undefined };
}
