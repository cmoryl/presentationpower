// TransPerfect NEXT 2026 — London (QEII Centre) VENDOR BOOTH KIOSKS.
//
// Final issue from the London team (supersedes the earlier rounds): one
// Illustrator front-wall master per booth, trimming at 1830 × 2440 mm with
// 100 mm bleed per edge (artboard 5754.33 × 7483.46 pt). Every booth in the
// programme has now delivered artwork, so each spec carries the vendor's own
// live file as the print master (`aiUrl`) plus a rasterised proof of the
// artboard (`previewUrl`), which is what the panel preview, thumbnails and live
// editor paint as the ground so the app matches the real file.
//
// The masters are also reusable at other NEXT locations: the artwork is a
// single full-bleed composition, so a different venue's stand size is handled
// by scaling the same master to that trim (see LONDON_BOOTH_TRIM_PRESETS and
// resizeBoothArtboard below) rather than re-originating the file.

import coaAi from "@/assets/london-booths/coa-live-tradebooth-a.ai?url";
import coaP1 from "@/assets/london-booths/coa-live-tradebooth-a.jpg";
import commercialAi from "@/assets/london-booths/commercial-live-tradebooth-a.ai?url";
import commercialP1 from "@/assets/london-booths/commercial-live-tradebooth-a.jpg";
import contactCenterAi from "@/assets/london-booths/contact-center-tradebooth-a.ai?url";
import contactCenterP1 from "@/assets/london-booths/contact-center-tradebooth-a.jpg";
import gcdAi from "@/assets/london-booths/global-content-delivery-tradebooth-a.ai?url";
import gcdP1 from "@/assets/london-booths/global-content-delivery-tradebooth-a.jpg";
import gdxAi from "@/assets/london-booths/global-digital-experience-live-tradebooth-a.ai?url";
import gdxP1 from "@/assets/london-booths/global-digital-experience-live-tradebooth-a.jpg";
import glLifeSciAi from "@/assets/london-booths/gl-live-lifesci-tradebooth-a.pdf?url";
import glLifeSciP1 from "@/assets/london-booths/gl-live-lifesci-tradebooth-a.jpg";
import glLiveAi from "@/assets/london-booths/gl-live-tradebooth-a.ai?url";
import glLiveP1 from "@/assets/london-booths/gl-live-tradebooth-a.jpg";
import learningAi from "@/assets/london-booths/learning-tradebooth-a.ai?url";
import learningP1 from "@/assets/london-booths/learning-tradebooth-a.jpg";
import legal2Ai from "@/assets/london-booths/legal-support2-tradebooth-b.ai?url";
import legal2P1 from "@/assets/london-booths/legal-support2-tradebooth-b.jpg";
import liveCustomerAi from "@/assets/london-booths/live-customer-tradebooth-a.ai?url";
import liveCustomerP1 from "@/assets/london-booths/live-customer-tradebooth-a.jpg";
import mediaAi from "@/assets/london-booths/media-tradebooth-a.ai?url";
import mediaP1 from "@/assets/london-booths/media-tradebooth-a.jpg";
import medWriteAi from "@/assets/london-booths/medical-writing-tradebooth-a.ai?url";
import medWriteP1 from "@/assets/london-booths/medical-writing-tradebooth-a.jpg";
import sterling2Ai from "@/assets/london-booths/sterling2-tradebooth-a.ai?url";
import sterling2P1 from "@/assets/london-booths/sterling2-tradebooth-a.jpg";
import tiAi from "@/assets/london-booths/ti-tradebooth-a.ai?url";
import tiP1 from "@/assets/london-booths/ti-tradebooth-a.jpg";
import veevaAi from "@/assets/london-booths/veeva-tradebooth-a.ai?url";
import veevaP1 from "@/assets/london-booths/veeva-tradebooth-a.jpg";

export type LondonBoothArtboardKind = "main" | "return-l" | "return-r";

export type LondonBoothArtboard = {
  kind: LondonBoothArtboardKind;
  label: string;
  /** Artboard (page) inside the supplied Illustrator template. */
  page: number;
  trimW: number;
  trimH: number;
  /** Bleed per edge in mm; falls back to LONDON_BOOTH_BLEED_MM. */
  bleedMm?: number;
  /** CDN proof of the supplied artwork, or null while artwork is pending. */
  previewUrl: string | null;
};

export type LondonBoothSpec = {
  id: string;
  vendor: string;
  /** Supplied Illustrator template filename, when we have one. */
  sourceFile: string | null;
  /** CDN copy of the supplied Illustrator master — the print deliverable. */
  aiUrl: string | null;
  /** Ground treatment used when artwork is still pending. */
  style: string;
  artboards: LondonBoothArtboard[];
};

/** Bleed held per edge on a booth panel when the artboard does not state one. */
export const LONDON_BOOTH_BLEED_MM = 10;

/** Bleed per edge on the supplied trade-booth front walls, in mm. */
export const LONDON_TRADE_BOOTH_BLEED_MM = 100;

/** Every supplied front wall is the same size. */
function frontWall(previewUrl: string | null): LondonBoothArtboard[] {
  return [
    {
      kind: "main",
      label: "Front wall",
      page: 1,
      trimW: 1830,
      trimH: 2440,
      bleedMm: LONDON_TRADE_BOOTH_BLEED_MM,
      previewUrl,
    },
  ];
}

export const LONDON_BOOTHS: LondonBoothSpec[] = [
  {
    id: "ti-tradebooth-a",
    vendor: "Trial Interactive",
    sourceFile: "TITradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: tiAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(tiP1),
  },
  {
    id: "gl-live-tradebooth-a",
    vendor: "GlobalLink Live · Conference & Events",
    sourceFile: "GLv2_LiveTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: glLiveAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(glLiveP1),
  },
  {
    id: "global-digital-experience-tradebooth-a",
    vendor: "Global Digital Experience",
    sourceFile: "GlobalDigitalExperience_LiveTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: gdxAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(gdxP1),
  },
  {
    id: "learning-tradebooth-a",
    vendor: "Learning Solutions",
    sourceFile: "LearningTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: learningAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(learningP1),
  },
  {
    id: "live-customer-tradebooth-a",
    vendor: "Live Customer Connect University",
    sourceFile: "LiveCustomerConnetUniTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: liveCustomerAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(liveCustomerP1),
  },
  {
    id: "media-tradebooth-a",
    vendor: "Media Solutions",
    sourceFile: "MediaTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: mediaAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(mediaP1),
  },
  // Only the latest supplied file per vendor ships; earlier rounds
  // (LegalSupportTradeBoothB, SterlingTradeBoothA, GL_LiveTradeBoothA) are
  // superseded.
  {
    id: "legal-support-2-tradebooth-b",
    vendor: "Legal Support · Booth B",
    sourceFile: "LegalSupport2TradeBoothB_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: legal2Ai,
    style: "01-beam-violet-aqua",
    artboards: frontWall(legal2P1),
  },
  {
    id: "sterling-2-tradebooth-a",
    vendor: "Sterling",
    sourceFile: "Sterling2TradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: sterling2Ai,
    style: "01-beam-violet-aqua",
    artboards: frontWall(sterling2P1),
  },

  {
    id: "veeva-tradebooth-a",
    vendor: "Veeva",
    sourceFile: "VeevaTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: veevaAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(veevaP1),
  },
  {
    id: "contact-center",
    vendor: "Contact Center | LifeSciNEXT",
    sourceFile: "Contact CenterTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: contactCenterAi,
    style: "04-horizon",
    artboards: frontWall(contactCenterP1),
  },
  {
    id: "coa",
    vendor: "COA | LifeSciNEXT",
    sourceFile: "COA_LiveTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: coaAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(coaP1),
  },
  {
    id: "medical-writing",
    vendor: "Medical Writing | LifeSciNEXT",
    sourceFile: "LSMEDWRTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: medWriteAi,
    style: "09-dawn",
    artboards: frontWall(medWriteP1),
  },
  {
    id: "live-conference-events",
    vendor: "Live Conference/Events | LifeSciNEXT",
    sourceFile: "GL_Live_LifeSciNEXTTradeBoothA_Front_1830x2440mm_Plus100mmBleed.pdf",
    aiUrl: glLifeSciAi,
    style: "03-wash-diagonal",
    artboards: frontWall(glLifeSciP1),
  },
  {
    id: "commercial-life-sciences",
    vendor: "Commercial for Life Sciences | LifeSciNEXT",
    sourceFile: "Commercial_LiveTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: commercialAi,
    style: "08-chevron-sweep",
    artboards: frontWall(commercialP1),
  },
  {
    id: "global-content-delivery-tradebooth-a",
    vendor: "Global Content Delivery",
    sourceFile: "GlobalContentDeliveryTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: gcdAi,
    style: "01-beam-violet-aqua",
    artboards: frontWall(gcdP1),
  },
];

/** True when the booth still needs artwork from the vendor. */
export function boothArtworkPending(booth: LondonBoothSpec): boolean {
  return !booth.aiUrl;
}

// ---------------------------------------------------------------------------
// RE-SIZING FOR THE NEXT EVENT LOCATION
//
// The supplied masters are full-bleed portrait compositions, so another venue's
// stand size is served by scaling the same artwork to that trim. These presets
// cover the stand sizes NEXT has used; resizeBoothArtboard reports the scale to
// apply and how much of the artwork is cropped or padded so the London team can
// see, before ordering, whether a master survives the new size or needs a
// re-layout from the vendor.
// ---------------------------------------------------------------------------

export type LondonBoothTrimPreset = {
  id: string;
  label: string;
  /** Trim size in mm. */
  trimW: number;
  trimH: number;
  /** Bleed per edge in mm. */
  bleedMm: number;
};

/** Stand sizes the booth masters can be re-issued at. */
export const LONDON_BOOTH_TRIM_PRESETS: LondonBoothTrimPreset[] = [
  {
    id: "london-front-1830x2440",
    label: "London front wall · 1830 × 2440 mm",
    trimW: 1830,
    trimH: 2440,
    bleedMm: LONDON_TRADE_BOOTH_BLEED_MM,
  },
  {
    id: "narrow-front-1220x2440",
    label: "Narrow front wall · 1220 × 2440 mm",
    trimW: 1220,
    trimH: 2440,
    bleedMm: LONDON_TRADE_BOOTH_BLEED_MM,
  },
  {
    id: "wide-front-2440x2440",
    label: "Wide front wall · 2440 × 2440 mm",
    trimW: 2440,
    trimH: 2440,
    bleedMm: LONDON_TRADE_BOOTH_BLEED_MM,
  },
  {
    id: "us-front-96x120in",
    label: "US front wall · 2438 × 3048 mm (96 × 120 in)",
    trimW: 2438,
    trimH: 3048,
    bleedMm: 25,
  },
  {
    id: "popup-3x2250",
    label: "Pop-up panel · 900 × 2250 mm",
    trimW: 900,
    trimH: 2250,
    bleedMm: 25,
  },
];

export type LondonBoothResize = {
  preset: LondonBoothTrimPreset;
  /** Target artboard including bleed, in mm. */
  bleedW: number;
  bleedH: number;
  /** Scale to apply to the master so it fills the target artboard. */
  scale: number;
  /** Fraction of the master's width / height lost off the target edges (0–1). */
  cropX: number;
  cropY: number;
  /** True when the aspect ratio matches closely enough to place as-is. */
  aspectMatch: boolean;
  /** Plain-language note for the print order. */
  note: string;
};

/**
 * Report how a supplied booth artboard re-issues at another stand size.
 * Fills the target artboard (never letterboxes a print master), so the reported
 * crop is what falls outside the new trim + bleed.
 */
export function resizeBoothArtboard(
  artboard: Pick<LondonBoothArtboard, "trimW" | "trimH" | "bleedMm">,
  preset: LondonBoothTrimPreset,
): LondonBoothResize {
  const srcEdge = artboard.bleedMm ?? LONDON_BOOTH_BLEED_MM;
  const srcW = artboard.trimW + srcEdge * 2;
  const srcH = artboard.trimH + srcEdge * 2;
  const bleedW = preset.trimW + preset.bleedMm * 2;
  const bleedH = preset.trimH + preset.bleedMm * 2;

  const scale = Math.max(bleedW / srcW, bleedH / srcH);
  const cropX = Math.max(0, 1 - bleedW / (srcW * scale));
  const cropY = Math.max(0, 1 - bleedH / (srcH * scale));
  const srcRatio = srcW / srcH;
  const dstRatio = bleedW / bleedH;
  const aspectMatch = Math.abs(srcRatio - dstRatio) / srcRatio <= 0.02;

  const worst = Math.max(cropX, cropY);
  const note = aspectMatch
    ? `Scales to ${preset.label} at ${Math.round(scale * 100)}% with no crop.`
    : worst <= 0.08
      ? `Scales to ${preset.label} at ${Math.round(scale * 100)}%; ${Math.round(worst * 100)}% trims off the ${cropX > cropY ? "sides" : "top and bottom"} — check the lockup and QR clear space.`
      : `${preset.label} loses ${Math.round(worst * 100)}% off the ${cropX > cropY ? "sides" : "top and bottom"} — ask the vendor to re-lay the master at this size.`;

  return { preset, bleedW, bleedH, scale, cropX, cropY, aspectMatch, note };
}

/** Every re-size option for a booth's main artboard, worst crop last. */
export function boothResizeOptions(booth: LondonBoothSpec): LondonBoothResize[] {
  const main = booth.artboards.find((a) => a.kind === "main") ?? booth.artboards[0];
  if (!main) return [];
  return LONDON_BOOTH_TRIM_PRESETS.map((preset) => resizeBoothArtboard(main, preset)).sort(
    (a, b) => Math.max(a.cropX, a.cropY) - Math.max(b.cropX, b.cropY),
  );
}
