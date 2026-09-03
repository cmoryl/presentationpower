// TransPerfect NEXT 2026 — London (QEII Centre) VENDOR BOOTH KIOSKS.
//
// Current issue from the London team (supersedes the earlier three-artboard
// kiosk templates): one Illustrator front-wall master per booth, trimming at
// 1830 × 2440 mm with 100 mm bleed per edge (artboard 5754.33 × 7483.46 pt).
//
// Booths whose artwork has been supplied carry the vendor's own live file as
// the print master (`aiUrl`) plus a CDN proof of the artboard (`previewUrl`),
// which is what the panel preview, thumbnails and live editor paint as the
// ground so the app matches the real file. Booths still waiting on artwork
// carry `previewUrl: null` and fall back to a spec-built brand ground.

import glLiveAi from "@/assets/london-booths/gl-live-tradebooth-a.ai.asset.json";
import glLiveP1 from "@/assets/london-booths/gl-live-tradebooth-a.jpg.asset.json";
import gdxAi from "@/assets/london-booths/global-digital-experience-live-tradebooth-a.ai.asset.json";
import gdxP1 from "@/assets/london-booths/global-digital-experience-live-tradebooth-a.jpg.asset.json";
import learningAi from "@/assets/london-booths/learning-tradebooth-a.ai.asset.json";
import learningP1 from "@/assets/london-booths/learning-tradebooth-a.jpg.asset.json";
import legalAi from "@/assets/london-booths/legal-support-tradebooth-b.ai.asset.json";
import legalP1 from "@/assets/london-booths/legal-support-tradebooth-b.jpg.asset.json";
import legal2Ai from "@/assets/london-booths/legal-support2-tradebooth-b.ai.asset.json";
import legal2P1 from "@/assets/london-booths/legal-support2-tradebooth-b.jpg.asset.json";
import liveCustomerAi from "@/assets/london-booths/live-customer-tradebooth-a.ai.asset.json";
import liveCustomerP1 from "@/assets/london-booths/live-customer-tradebooth-a.jpg.asset.json";
import mediaAi from "@/assets/london-booths/media-tradebooth-a.ai.asset.json";
import mediaP1 from "@/assets/london-booths/media-tradebooth-a.jpg.asset.json";
import sterlingAi from "@/assets/london-booths/sterling-tradebooth-a.ai.asset.json";
import sterlingP1 from "@/assets/london-booths/sterling-tradebooth-a.jpg.asset.json";
import sterling2Ai from "@/assets/london-booths/sterling2-tradebooth-a.ai.asset.json";
import sterling2P1 from "@/assets/london-booths/sterling2-tradebooth-a.jpg.asset.json";
import tiAi from "@/assets/london-booths/ti-tradebooth-a.ai.asset.json";
import tiP1 from "@/assets/london-booths/ti-tradebooth-a.jpg.asset.json";
import veevaAi from "@/assets/london-booths/veeva-tradebooth-a.ai.asset.json";
import veevaP1 from "@/assets/london-booths/veeva-tradebooth-a.jpg.asset.json";

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
    aiUrl: tiAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(tiP1.url),
  },
  {
    id: "gl-live-tradebooth-a",
    vendor: "GlobalLink Live",
    sourceFile: "GL_LiveTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: glLiveAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(glLiveP1.url),
  },
  {
    id: "global-digital-experience-tradebooth-a",
    vendor: "Global Digital Experience",
    sourceFile:
      "GlobalDigitalExperience_LiveTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: gdxAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(gdxP1.url),
  },
  {
    id: "learning-tradebooth-a",
    vendor: "Learning Solutions",
    sourceFile: "LearningTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: learningAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(learningP1.url),
  },
  {
    id: "live-customer-tradebooth-a",
    vendor: "Live Customer Experience",
    sourceFile: "LiveCustomerTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: liveCustomerAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(liveCustomerP1.url),
  },
  {
    id: "media-tradebooth-a",
    vendor: "Media Solutions",
    sourceFile: "MediaTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: mediaAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(mediaP1.url),
  },
  {
    id: "legal-support-tradebooth-b",
    vendor: "Legal Support · Booth B",
    sourceFile: "LegalSupportTradeBoothB_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: legalAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(legalP1.url),
  },
  {
    id: "legal-support-2-tradebooth-b",
    vendor: "Legal Support 2 · Booth B",
    sourceFile: "LegalSupport2TradeBoothB_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: legal2Ai.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(legal2P1.url),
  },
  {
    id: "sterling-tradebooth-a",
    vendor: "Sterling",
    sourceFile: "SterlingTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: sterlingAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(sterlingP1.url),
  },
  {
    id: "sterling-2-tradebooth-a",
    vendor: "Sterling 2",
    sourceFile: "Sterling2TradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: sterling2Ai.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(sterling2P1.url),
  },
  {
    id: "veeva-tradebooth-a",
    vendor: "Veeva",
    sourceFile: "VeevaTradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: veevaAi.url,
    style: "01-beam-violet-aqua",
    artboards: frontWall(veevaP1.url),
  },
  {
    id: "contact-center",
    vendor: "Contact Center | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "04-horizon",
    artboards: frontWall(null),
  },
  {
    id: "coa",
    vendor: "COA | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "01-beam-violet-aqua",
    artboards: frontWall(null),
  },
  {
    id: "medical-writing",
    vendor: "Medical Writing | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "09-dawn",
    artboards: frontWall(null),
  },
  {
    id: "live-conference-events",
    vendor: "Live Conference/Events | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "03-wash-diagonal",
    artboards: frontWall(null),
  },
  {
    id: "veeva-tms",
    vendor: "Veeva TMS | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "07-prism-sweep",
    artboards: frontWall(null),
  },
  {
    id: "commercial-life-sciences",
    vendor: "Commercial for Life Sciences | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "08-chevron-sweep",
    artboards: frontWall(null),
  },
];

/** True when the booth still needs artwork from the vendor. */
export function boothArtworkPending(booth: LondonBoothSpec): boolean {
  return !booth.aiUrl;
}
