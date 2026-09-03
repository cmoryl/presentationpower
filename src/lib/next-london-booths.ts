// TransPerfect NEXT 2026 — London (QEII Centre) VENDOR BOOTH KIOSKS.
//
// Third issue from the London team: the per-vendor booth kiosk templates. Every
// booth is one Illustrator template with three artboards — the main wall
// (1830 × 2440 mm) and the two return panels (660 × 2440 mm each) — measured
// off the supplied artboards (5187.4 × 6916.54 pt and 1870.87 × 6916.54 pt).
//
// Booths whose artwork has been supplied carry the vendor's own live file as
// the print master (`aiUrl`) plus a CDN proof of each artboard (`previewUrl`),
// which is what the panel preview, thumbnails and live editor paint as the
// ground so the app matches the real file. Booths still waiting on artwork
// carry `previewUrl: null` and fall back to a spec-built brand ground.

import tiKiosktemplateAi from "@/assets/london-booths/ti-kiosktemplate.ai.asset.json";
import tiKiosktemplateP1 from "@/assets/london-booths/ti-kiosktemplate-p1.jpg.asset.json";
import tiKiosktemplateP2 from "@/assets/london-booths/ti-kiosktemplate-p2.jpg.asset.json";
import tiKiosktemplateP3 from "@/assets/london-booths/ti-kiosktemplate-p3.jpg.asset.json";
import aiTvkiosktemplateV2Ai from "@/assets/london-booths/ai-tvkiosktemplate-v2.ai.asset.json";
import aiTvkiosktemplateV2P1 from "@/assets/london-booths/ai-tvkiosktemplate-v2-p1.jpg.asset.json";
import aiTvkiosktemplateV2P2 from "@/assets/london-booths/ai-tvkiosktemplate-v2-p2.jpg.asset.json";
import aiTvkiosktemplateV2P3 from "@/assets/london-booths/ai-tvkiosktemplate-v2-p3.jpg.asset.json";
import digitalTvkiosktemplateV2Ai from "@/assets/london-booths/digital-tvkiosktemplate-v2.ai.asset.json";
import digitalTvkiosktemplateV2P1 from "@/assets/london-booths/digital-tvkiosktemplate-v2-p1.jpg.asset.json";
import digitalTvkiosktemplateV2P2 from "@/assets/london-booths/digital-tvkiosktemplate-v2-p2.jpg.asset.json";
import digitalTvkiosktemplateV2P3 from "@/assets/london-booths/digital-tvkiosktemplate-v2-p3.jpg.asset.json";
import mediaTvkiosktemplateV2Ai from "@/assets/london-booths/media-tvkiosktemplate-v2.ai.asset.json";
import mediaTvkiosktemplateV2P1 from "@/assets/london-booths/media-tvkiosktemplate-v2-p1.jpg.asset.json";
import mediaTvkiosktemplateV2P2 from "@/assets/london-booths/media-tvkiosktemplate-v2-p2.jpg.asset.json";
import mediaTvkiosktemplateV2P3 from "@/assets/london-booths/media-tvkiosktemplate-v2-p3.jpg.asset.json";
import glCreativeTvkiosktemplateV2Ai from "@/assets/london-booths/gl-creative-tvkiosktemplate-v2.ai.asset.json";
import glCreativeTvkiosktemplateV2P1 from "@/assets/london-booths/gl-creative-tvkiosktemplate-v2-p1.jpg.asset.json";
import glCreativeTvkiosktemplateV2P2 from "@/assets/london-booths/gl-creative-tvkiosktemplate-v2-p2.jpg.asset.json";
import glCreativeTvkiosktemplateV2P3 from "@/assets/london-booths/gl-creative-tvkiosktemplate-v2-p3.jpg.asset.json";
import glLiveTvkiosktemplatev2Ai from "@/assets/london-booths/gl-live-tvkiosktemplatev-2.ai.asset.json";
import glLiveTvkiosktemplatev2P1 from "@/assets/london-booths/gl-live-tvkiosktemplatev-2-p1.jpg.asset.json";
import glLiveTvkiosktemplatev2P2 from "@/assets/london-booths/gl-live-tvkiosktemplatev-2-p2.jpg.asset.json";
import glLiveTvkiosktemplatev2P3 from "@/assets/london-booths/gl-live-tvkiosktemplatev-2-p3.jpg.asset.json";
import glWebTvkiosktemplateV2Ai from "@/assets/london-booths/gl-web-tvkiosktemplate-v2.ai.asset.json";
import glWebTvkiosktemplateV2P1 from "@/assets/london-booths/gl-web-tvkiosktemplate-v2-p1.jpg.asset.json";
import glWebTvkiosktemplateV2P2 from "@/assets/london-booths/gl-web-tvkiosktemplate-v2-p2.jpg.asset.json";
import glWebTvkiosktemplateV2P3 from "@/assets/london-booths/gl-web-tvkiosktemplate-v2-p3.jpg.asset.json";
import glStringskiosktemplateAi from "@/assets/london-booths/gl-stringskiosktemplate.ai.asset.json";
import glStringskiosktemplateP1 from "@/assets/london-booths/gl-stringskiosktemplate-p1.jpg.asset.json";
import glStringskiosktemplateP2 from "@/assets/london-booths/gl-stringskiosktemplate-p2.jpg.asset.json";
import glStringskiosktemplateP3 from "@/assets/london-booths/gl-stringskiosktemplate-p3.jpg.asset.json";
import reefKiosktemplateAi from "@/assets/london-booths/reef-kiosktemplate.ai.asset.json";
import reefKiosktemplateP1 from "@/assets/london-booths/reef-kiosktemplate-p1.jpg.asset.json";
import reefKiosktemplateP2 from "@/assets/london-booths/reef-kiosktemplate-p2.jpg.asset.json";
import reefKiosktemplateP3 from "@/assets/london-booths/reef-kiosktemplate-p3.jpg.asset.json";
import sterlingkiosktemplateAi from "@/assets/london-booths/sterlingkiosktemplate.ai.asset.json";
import sterlingkiosktemplateP1 from "@/assets/london-booths/sterlingkiosktemplate-p1.jpg.asset.json";
import sterlingkiosktemplateP2 from "@/assets/london-booths/sterlingkiosktemplate-p2.jpg.asset.json";
import sterlingkiosktemplateP3 from "@/assets/london-booths/sterlingkiosktemplate-p3.jpg.asset.json";

export type LondonBoothArtboardKind = "main" | "return-l" | "return-r";

export type LondonBoothArtboard = {
  kind: LondonBoothArtboardKind;
  label: string;
  /** Artboard (page) inside the supplied Illustrator template. */
  page: number;
  trimW: number;
  trimH: number;
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

/** Bleed held per edge on every booth panel, in mm. */
export const LONDON_BOOTH_BLEED_MM = 10;

export const LONDON_BOOTHS: LondonBoothSpec[] = [
  {
    id: "ti-kiosktemplate",
    vendor: "Trial Interactive",
    sourceFile: "TI_KioskTemplate.ai",
    aiUrl: tiKiosktemplateAi.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: tiKiosktemplateP1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: tiKiosktemplateP2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: tiKiosktemplateP3.url },
    ],
  },
  {
    id: "ai-tvkiosktemplate-v2",
    vendor: "AI Solutions",
    sourceFile: "AI_TVKioskTemplate_v2.ai",
    aiUrl: aiTvkiosktemplateV2Ai.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: aiTvkiosktemplateV2P1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: aiTvkiosktemplateV2P2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: aiTvkiosktemplateV2P3.url },
    ],
  },
  {
    id: "digital-tvkiosktemplate-v2",
    vendor: "Digital Solutions",
    sourceFile: "Digital_TVKioskTemplate_v2.ai",
    aiUrl: digitalTvkiosktemplateV2Ai.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: digitalTvkiosktemplateV2P1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: digitalTvkiosktemplateV2P2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: digitalTvkiosktemplateV2P3.url },
    ],
  },
  {
    id: "media-tvkiosktemplate-v2",
    vendor: "Media Solutions",
    sourceFile: "Media_TVKioskTemplate_v2.ai",
    aiUrl: mediaTvkiosktemplateV2Ai.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: mediaTvkiosktemplateV2P1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: mediaTvkiosktemplateV2P2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: mediaTvkiosktemplateV2P3.url },
    ],
  },
  {
    id: "gl-creative-tvkiosktemplate-v2",
    vendor: "GlobalLink Creative",
    sourceFile: "GL Creative_TVKioskTemplate_v2.ai",
    aiUrl: glCreativeTvkiosktemplateV2Ai.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: glCreativeTvkiosktemplateV2P1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: glCreativeTvkiosktemplateV2P2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: glCreativeTvkiosktemplateV2P3.url },
    ],
  },
  {
    id: "gl-live-tvkiosktemplatev-2",
    vendor: "GlobalLink Live",
    sourceFile: "GL_Live_TVKioskTemplatev_2.ai",
    aiUrl: glLiveTvkiosktemplatev2Ai.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: glLiveTvkiosktemplatev2P1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: glLiveTvkiosktemplatev2P2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: glLiveTvkiosktemplatev2P3.url },
    ],
  },
  {
    id: "gl-web-tvkiosktemplate-v2",
    vendor: "GlobalLink Web",
    sourceFile: "GL_Web_TVKioskTemplate_v2.ai",
    aiUrl: glWebTvkiosktemplateV2Ai.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: glWebTvkiosktemplateV2P1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: glWebTvkiosktemplateV2P2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: glWebTvkiosktemplateV2P3.url },
    ],
  },
  {
    id: "gl-stringskiosktemplate",
    vendor: "GlobalLink Strings",
    sourceFile: "GL_StringsKioskTemplate.ai",
    aiUrl: glStringskiosktemplateAi.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: glStringskiosktemplateP1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: glStringskiosktemplateP2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: glStringskiosktemplateP3.url },
    ],
  },
  {
    id: "reef-kiosktemplate",
    vendor: "Reef",
    sourceFile: "Reef_KioskTemplate.ai",
    aiUrl: reefKiosktemplateAi.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: reefKiosktemplateP1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: reefKiosktemplateP2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: reefKiosktemplateP3.url },
    ],
  },
  {
    id: "sterlingkiosktemplate",
    vendor: "Sterling",
    sourceFile: "SterlingKioskTemplate.ai",
    aiUrl: sterlingkiosktemplateAi.url,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: sterlingkiosktemplateP1.url },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: sterlingkiosktemplateP2.url },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: sterlingkiosktemplateP3.url },
    ],
  },
  {
    id: "contact-center",
    vendor: "Contact Center | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "04-horizon",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: null },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: null },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: null },
    ],
  },
  {
    id: "coa",
    vendor: "COA | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "01-beam-violet-aqua",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: null },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: null },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: null },
    ],
  },
  {
    id: "medical-writing",
    vendor: "Medical Writing | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "09-dawn",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: null },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: null },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: null },
    ],
  },
  {
    id: "live-conference-events",
    vendor: "Live Conference/Events | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "03-wash-diagonal",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: null },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: null },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: null },
    ],
  },
  {
    id: "veeva-tms",
    vendor: "Veeva TMS | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "07-prism-sweep",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: null },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: null },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: null },
    ],
  },
  {
    id: "commercial-life-sciences",
    vendor: "Commercial for Life Sciences | LifeSciNEXT",
    sourceFile: null,
    aiUrl: null,
    style: "08-chevron-sweep",
    artboards: [
      { kind: "main", label: "Main wall", page: 1, trimW: 1830, trimH: 2440, previewUrl: null },
      { kind: "return-l", label: "Return panel · left", page: 2, trimW: 660, trimH: 2440, previewUrl: null },
      { kind: "return-r", label: "Return panel · right", page: 3, trimW: 660, trimH: 2440, previewUrl: null },
    ],
  },
];

/** True when the booth still needs artwork from the vendor. */
export function boothArtworkPending(booth: LondonBoothSpec): boolean {
  return !booth.aiUrl;
}
