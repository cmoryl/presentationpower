// -----------------------------------------------------------------------------
// PRINT PREFLIGHT
//
// Preflight is the PowerPoint of the print pipeline: Acrobat opening a PDF
// cleanly says nothing about whether a printer will accept it, exactly as
// LibreOffice rendering a deck said nothing about Office. So the checks below
// run against the document model BEFORE a PDF is written, and the resulting
// report is the gate — a clean report is a prerequisite for output, and a test
// print on the actual stock is still the only true validation.
//
// Target intents for this build: sheetfed OFFSET (spot available) and
// DIGITAL / POD (process only). Large-format is out of scope, so the DPI floors
// below are press floors, not viewing-distance floors.
// -----------------------------------------------------------------------------

import {
  TAC_LIMIT_COATED,
  TAC_LIMIT_UNCOATED,
  cmykString,
  printColorBuild,
  requiresFlatBlack,
  totalAreaCoverage,
  type Cmyk,
  type InkUse,
  type PrintIntent,
} from "@/lib/print-color-contract";

export type PreflightSeverity = "fail" | "warn" | "info";

export type PreflightFinding = {
  id: string;
  severity: PreflightSeverity;
  title: string;
  detail: string;
  /** What to do about it, in the operator's terms. */
  remedy?: string;
  /** Page index when the finding is page-scoped. */
  page?: number;
};

export type PreflightReport = {
  intent: PrintIntent;
  findings: PreflightFinding[];
  /** False when any `fail` is present — do not send to press. */
  pressReady: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolution policy
//
// Deck media was optimized for file size: anything over 2000 px on the long
// edge was resized to hit ~150 DPI across a 13.33in slide, and 26 PNGs were
// re-encoded as JPEG q88. The pre-optimization originals were NOT retained, so
// any asset sourced from the deck media pool is permanently capped. Preflight
// reports that as a hard limit rather than pretending it can be fixed on
// output.
// ─────────────────────────────────────────────────────────────────────────────

/** Press floor for continuous-tone imagery. */
export const MIN_IMAGE_DPI = 300;
/** Tolerated with a warning on digital/POD, never silently on offset. */
export const SOFT_IMAGE_DPI = 220;
/** Line art / logos rasterized rather than placed as vector. */
export const MIN_LINEART_DPI = 600;

/** The effective ceiling of deck-optimized media on a 13.33in slide. */
export const DECK_MEDIA_LONG_EDGE_PX = 2000;

export function effectiveDpi(pixelsLongEdge: number, placedInchesLongEdge: number): number {
  if (placedInchesLongEdge <= 0) return 0;
  return pixelsLongEdge / placedInchesLongEdge;
}

export type PreflightImage = {
  id: string;
  label?: string;
  /** Natural pixel dimensions of the bytes that will be embedded. */
  pixelWidth: number;
  pixelHeight: number;
  /** Placed size on the page, inches. */
  placedWidthIn: number;
  placedHeightIn: number;
  /** True when the source came through the deck media optimizer. */
  deckOptimized?: boolean;
  /** True when the source was re-encoded to JPEG (artifacts survive raster). */
  lossyReencoded?: boolean;
  isLineArt?: boolean;
  /** Full-bleed images must extend past trim, not stop at the edge. */
  fullBleed?: boolean;
  page?: number;
};

export type PreflightGeometry = {
  /** Trim (final cut) size in inches. */
  trimWidthIn: number;
  trimHeightIn: number;
  /** Bleed on each side, inches. 3 mm ≈ 0.118in; 0.125in is the US norm. */
  bleedIn: number;
  /** Safe area inset from trim, inches. */
  safeIn: number;
  cropMarks: boolean;
};

export type PreflightTextInk = {
  id: string;
  sizePt: number;
  use: InkUse;
  /** The CMYK the text will actually separate to. */
  cmyk: Cmyk;
  page?: number;
};

export type PreflightInput = {
  intent: PrintIntent;
  brandModeId: string;
  stock: "coated" | "uncoated";
  geometry: PreflightGeometry;
  images?: PreflightImage[];
  text?: PreflightTextInk[];
  /** Colors placed as spots. Digital output cannot honor these. */
  spotsUsed?: string[];
  /** Fonts to embed — Geist is OFL with fsType 0, so embedding is legal. */
  fontsEmbedded?: boolean;
};

const MM = 1 / 25.4;
/** 3 mm — the common European bleed; 0.125in is its US counterpart. */
export const BLEED_3MM_IN = 3 * MM;

// ─────────────────────────────────────────────────────────────────────────────
// Checks
// ─────────────────────────────────────────────────────────────────────────────

function checkGeometry(g: PreflightGeometry, intent: PrintIntent): PreflightFinding[] {
  const out: PreflightFinding[] = [];
  const minBleed = intent === "offset" ? BLEED_3MM_IN : 0.0625;
  if (g.bleedIn < minBleed - 0.0005) {
    out.push({
      id: "geo-bleed",
      severity: "fail",
      title: "Bleed below the minimum for this output",
      detail: `Document carries ${g.bleedIn.toFixed(3)}in of bleed; ${
        intent === "offset" ? "offset needs 3 mm (0.118in)" : "digital/POD needs at least 0.0625in"
      }.`,
      remedy: "Set bleed on the document and let full-bleed art extend past trim.",
    });
  }
  if (!g.cropMarks) {
    out.push({
      id: "geo-marks",
      severity: intent === "offset" ? "fail" : "warn",
      title: "No crop marks",
      detail: "The PDF carries no trim marks, so the cutter has no registration reference.",
      remedy: "Enable crop marks; they sit in the bleed margin, outside trim.",
    });
  }
  if (g.safeIn < 0.125) {
    out.push({
      id: "geo-safe",
      severity: "warn",
      title: "Safe area is tight",
      detail: `Safe inset is ${g.safeIn.toFixed(3)}in from trim. Cutting tolerance on a stacked lift is commonly ±0.0625in.`,
      remedy: "Hold live text and logos at least 0.125in inside trim.",
    });
  }
  return out;
}

function checkImages(images: PreflightImage[], intent: PrintIntent): PreflightFinding[] {
  const out: PreflightFinding[] = [];
  for (const img of images) {
    const longPx = Math.max(img.pixelWidth, img.pixelHeight);
    const longIn = Math.max(img.placedWidthIn, img.placedHeightIn);
    const dpi = effectiveDpi(longPx, longIn);
    const floor = img.isLineArt ? MIN_LINEART_DPI : MIN_IMAGE_DPI;
    const name = img.label || img.id;
    if (dpi < SOFT_IMAGE_DPI) {
      out.push({
        id: `img-dpi-${img.id}`,
        severity: "fail",
        page: img.page,
        title: `${name} is below press resolution`,
        detail: `${Math.round(dpi)} DPI at the placed size (${longIn.toFixed(2)}in from ${longPx} px). Floor is ${floor} DPI.`,
        remedy: img.deckOptimized
          ? "Source was downsampled by the deck media optimizer and the original was not retained — re-acquire the original file or reduce the placed size."
          : "Replace with a higher-resolution original or reduce the placed size.",
      });
    } else if (dpi < floor) {
      out.push({
        id: `img-dpi-soft-${img.id}`,
        severity: intent === "offset" ? "fail" : "warn",
        page: img.page,
        title: `${name} is soft for this output`,
        detail: `${Math.round(dpi)} DPI at the placed size; ${floor} DPI is the floor for ${
          img.isLineArt ? "line art" : "continuous tone"
        }.`,
        remedy: "Acceptable on digital/POD at a push; not on offset. Prefer a larger source.",
      });
    }
    if (img.lossyReencoded) {
      out.push({
        id: `img-lossy-${img.id}`,
        severity: "warn",
        page: img.page,
        title: `${name} was re-encoded as JPEG`,
        detail:
          "Block artifacts and halo around hard edges survive rasterization and become visible on press.",
        remedy: "Use the lossless original where one exists; avoid re-encoding for print output.",
      });
    }
    if (img.fullBleed) {
      // A full-bleed image must be at least trim + 2×bleed on the bleeding axis.
      out.push({
        id: `img-bleed-${img.id}`,
        severity: "info",
        page: img.page,
        title: `${name} is full-bleed`,
        detail: "Verify the art extends past trim on every bleeding edge rather than stopping at it.",
      });
    }
  }
  return out;
}

function checkText(
  text: PreflightTextInk[],
  stock: "coated" | "uncoated",
): PreflightFinding[] {
  const out: PreflightFinding[] = [];
  const tac = stock === "coated" ? TAC_LIMIT_COATED : TAC_LIMIT_UNCOATED;
  for (const t of text) {
    const plates = [t.cmyk.c, t.cmyk.m, t.cmyk.y].filter((v) => v > 0).length;
    if (requiresFlatBlack(t.use, t.sizePt) && plates > 0) {
      out.push({
        id: `ink-4cb-${t.id}`,
        severity: "fail",
        page: t.page,
        title: "Four-color black in small text",
        detail: `${t.sizePt}pt ${t.use} separates to ${cmykString(t.cmyk)}. Any registration slip shows as colored fringing at this size.`,
        remedy: "Force 100K for body copy and rules; keep the navy for large fills and panels.",
      });
    }
    if (totalAreaCoverage(t.cmyk) > tac) {
      out.push({
        id: `ink-tac-${t.id}`,
        severity: "warn",
        page: t.page,
        title: "Total area coverage over limit",
        detail: `${cmykString(t.cmyk)} is ${Math.round(totalAreaCoverage(t.cmyk))}% TAC; ${stock} limit is ${tac}%.`,
        remedy: "Reduce the build or let the output profile perform ink limiting.",
      });
    }
  }
  return out;
}

function checkColorContract(brandModeId: string, intent: PrintIntent): PreflightFinding[] {
  const build = printColorBuild(brandModeId, intent);
  if (!build) {
    return [
      {
        id: "color-missing",
        severity: "fail",
        title: "No print color build for this brand mode",
        detail: `${brandModeId} has no ${intent} definition in the print color contract.`,
        remedy: "Author the print build and route it for brand sign-off.",
      },
    ];
  }
  const pending = build.slots.filter((s) => s.status !== "approved");
  if (pending.length === 0) return [];
  return [
    {
      id: "color-pending",
      severity: "fail",
      title: "Print color build awaiting brand sign-off",
      detail: `${pending.map((s) => s.role).join(", ")} ${
        pending.length === 1 ? "has" : "have"
      } no approved ${intent} build. Screen values are not converted automatically — a saturated blue has no single correct CMYK.`,
      remedy: "Approve the build in the print color decision queue before output.",
    },
  ];
}

function checkSpots(spots: string[], intent: PrintIntent): PreflightFinding[] {
  if (spots.length === 0) return [];
  if (intent === "digital") {
    return [
      {
        id: "spot-on-digital",
        severity: "fail",
        title: "Spot colors on digital output",
        detail: `${spots.join(", ")} cannot be honored on toner/inkjet — the device prints process only.`,
        remedy: "Substitute the approved process fallback for the digital build.",
      },
    ];
  }
  return [
    {
      id: "spot-count",
      severity: "info",
      title: `${spots.length} spot separation${spots.length === 1 ? "" : "s"}`,
      detail: `${spots.join(", ")} will each add a plate and a press unit. Confirm the job is priced for it.`,
    },
  ];
}

export function runPrintPreflight(input: PreflightInput): PreflightReport {
  const findings: PreflightFinding[] = [
    ...checkColorContract(input.brandModeId, input.intent),
    ...checkGeometry(input.geometry, input.intent),
    ...checkImages(input.images ?? [], input.intent),
    ...checkText(input.text ?? [], input.stock),
    ...checkSpots(input.spotsUsed ?? [], input.intent),
  ];

  if (input.fontsEmbedded === false) {
    findings.push({
      id: "font-embed",
      severity: "fail",
      title: "Fonts not embedded",
      detail: "Geist is OFL with fsType 0, so embedding is permitted — an unembedded font is a build bug, not a licensing limit.",
      remedy: "Embed all fonts as subsets in the output PDF.",
    });
  }

  const order: Record<PreflightSeverity, number> = { fail: 0, warn: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    intent: input.intent,
    findings,
    pressReady: !findings.some((f) => f.severity === "fail"),
  };
}

/** Default profile per intent, pending a printer-supplied spec. */
export const PREFLIGHT_PROFILES: Record<
  PrintIntent,
  { label: string; standard: string; icc: string; note: string }
> = {
  offset: {
    label: "Sheetfed offset",
    standard: "PDF/X-4",
    icc: "GRACoL2013_CRPC6",
    note: "Defensible default until a printer supplies a spec. Spot separations permitted. Validate with a test print on the actual stock.",
  },
  digital: {
    label: "Digital / POD",
    standard: "PDF/X-4",
    icc: "GRACoL2013_CRPC6",
    note: "Process CMYK only — no spots. Device profiles vary; the output intent stays generic coated.",
  },
};
