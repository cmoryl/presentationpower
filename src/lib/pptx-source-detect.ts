/**
 * Source-application fingerprinting for imported PowerPoint files.
 *
 * Every generator leaves traces: `docProps/app.xml` Application strings, creator
 * fields, part layout, namespace usage, master/layout structure and telltale
 * export shapes. We score weighted signals instead of trusting one field, and we
 * always report the confidence — because diagnosis may lean on the guess, but
 * *repairs must never be destructive on the strength of a guess alone*.
 */

import type { ParsedDeck } from "./pptx-import";

export type PptxSourceId =
  | "microsoft-powerpoint-windows"
  | "microsoft-powerpoint-mac"
  | "microsoft-powerpoint-web"
  | "google-slides"
  | "apple-keynote"
  | "canva"
  | "gamma"
  | "beautiful-ai"
  | "pitch"
  | "libreoffice"
  | "openoffice"
  | "wps-office"
  | "onlyoffice"
  | "zoho-show"
  | "figma"
  | "illustrator"
  | "indesign"
  | "sketch"
  | "pdf-converter"
  | "image-converter"
  | "programmatic"
  | "unknown";

export type SourceSignal = {
  /** Which evidence stream produced this signal. */
  channel:
    | "app-metadata"
    | "creator"
    | "company"
    | "part-layout"
    | "namespace"
    | "relationship"
    | "theme"
    | "master-structure"
    | "export-shape";
  /** Human-readable evidence, shown verbatim in the audit UI. */
  detail: string;
  /** Contribution toward the winning source, 0-1. */
  weight: number;
};

export type SourceFingerprint = {
  sourceId: PptxSourceId;
  /** Display label, e.g. "Google Slides". */
  label: string;
  /** Best-effort version string when the package declares one. */
  version?: string;
  /** 0-1. Below 0.5 the UI must present the result as a guess. */
  confidence: number;
  signals: SourceSignal[];
  /** Every source that scored, best first — surfaced as "possible sources". */
  runnersUp: Array<{ sourceId: PptxSourceId; label: string; score: number }>;
};

export const SOURCE_LABELS: Record<PptxSourceId, string> = {
  "microsoft-powerpoint-windows": "Microsoft PowerPoint (Windows)",
  "microsoft-powerpoint-mac": "Microsoft PowerPoint (Mac)",
  "microsoft-powerpoint-web": "Microsoft PowerPoint (Web)",
  "google-slides": "Google Slides",
  "apple-keynote": "Apple Keynote",
  canva: "Canva",
  gamma: "Gamma",
  "beautiful-ai": "Beautiful.ai",
  pitch: "Pitch",
  libreoffice: "LibreOffice Impress",
  openoffice: "Apache OpenOffice Impress",
  "wps-office": "WPS Office",
  onlyoffice: "ONLYOFFICE",
  "zoho-show": "Zoho Show",
  figma: "Figma export",
  illustrator: "Adobe Illustrator export",
  indesign: "Adobe InDesign export",
  sketch: "Sketch export",
  "pdf-converter": "PDF-to-PowerPoint converter",
  "image-converter": "Image-to-PowerPoint converter",
  programmatic: "Programmatically generated",
  unknown: "Unknown source",
};

/** Application-string matchers, most specific first. */
const APP_RULES: Array<{ re: RegExp; id: PptxSourceId; weight: number }> = [
  { re: /microsoft.*powerpoint.*(for )?mac/i, id: "microsoft-powerpoint-mac", weight: 0.9 },
  { re: /powerpoint.*online|powerpoint.*web/i, id: "microsoft-powerpoint-web", weight: 0.9 },
  { re: /microsoft.*(office )?powerpoint/i, id: "microsoft-powerpoint-windows", weight: 0.85 },
  { re: /google.*(slides|docs)/i, id: "google-slides", weight: 0.95 },
  { re: /keynote/i, id: "apple-keynote", weight: 0.95 },
  { re: /canva/i, id: "canva", weight: 0.95 },
  { re: /\bgamma\b/i, id: "gamma", weight: 0.95 },
  { re: /beautiful\.?ai/i, id: "beautiful-ai", weight: 0.95 },
  { re: /\bpitch\b/i, id: "pitch", weight: 0.9 },
  { re: /libreoffice/i, id: "libreoffice", weight: 0.95 },
  { re: /openoffice/i, id: "openoffice", weight: 0.95 },
  { re: /wps|kingsoft/i, id: "wps-office", weight: 0.95 },
  { re: /onlyoffice|ascensio/i, id: "onlyoffice", weight: 0.95 },
  { re: /zoho/i, id: "zoho-show", weight: 0.95 },
  { re: /figma/i, id: "figma", weight: 0.9 },
  { re: /illustrator/i, id: "illustrator", weight: 0.9 },
  { re: /indesign/i, id: "indesign", weight: 0.9 },
  { re: /sketch/i, id: "sketch", weight: 0.9 },
  { re: /python-pptx|pptxgenjs|apache poi|aspose|officegen|node-pptx|docxtemplater|unoconv/i, id: "programmatic", weight: 0.95 },
  { re: /acrobat|nitro|smallpdf|ilovepdf|pdf2?ppt|able2extract|foxit/i, id: "pdf-converter", weight: 0.9 },
];

/** Mac PowerPoint writes a Mac-specific app version tail (e.g. "16.0000"). */
const MAC_VERSION_RE = /^16\.0{2,}$/;

type Score = { score: number; signals: SourceSignal[]; version?: string };

function add(map: Map<PptxSourceId, Score>, id: PptxSourceId, signal: SourceSignal, version?: string) {
  const cur = map.get(id) ?? { score: 0, signals: [] };
  cur.score += signal.weight;
  cur.signals.push(signal);
  if (version && !cur.version) cur.version = version;
  map.set(id, cur);
}

export type FingerprintInput = {
  metadata: ParsedDeck["metadata"];
  /** Every archive path in the package. */
  entryPaths?: string[];
  /** Distinct XML namespace URIs seen across parts. */
  namespaces?: string[];
  /** Relationship targets across the package. */
  relationshipTargets?: string[];
  theme?: ParsedDeck["theme"];
  templates?: ParsedDeck["templates"];
  slides?: Array<{
    /** Shape kinds recovered for the slide, in z-order. */
    kinds: string[];
    /** True when the slide has any real text run. */
    hasText: boolean;
    /** True when the slide is a single edge-to-edge image. */
    fullBleedImageOnly: boolean;
  }>;
  slideSize?: { w: number; h: number };
};

/**
 * Score every candidate source and return the winner plus its evidence.
 * Never throws: an unrecognizable package resolves to `unknown` at confidence 0.
 */
export function detectPptxSource(input: FingerprintInput): SourceFingerprint {
  const scores = new Map<PptxSourceId, Score>();
  const md = input.metadata ?? {};
  const app = (md.application ?? "").trim();
  const creator = (md.creator ?? "").trim();
  const lastBy = (md.lastModifiedBy ?? "").trim();
  const company = (md.company ?? "").trim();
  const paths = input.entryPaths ?? [];
  const namespaces = input.namespaces ?? [];
  const rels = input.relationshipTargets ?? [];

  for (const rule of APP_RULES) {
    if (app && rule.re.test(app)) {
      add(
        scores,
        rule.id,
        {
          channel: "app-metadata",
          detail: `docProps/app.xml Application = "${app}"`,
          weight: rule.weight,
        },
        md.appVersion,
      );
    }
    for (const [field, value] of [
      ["creator", creator],
      ["lastModifiedBy", lastBy],
      ["company", company],
    ] as const) {
      if (value && rule.re.test(value)) {
        add(scores, rule.id, {
          channel: field === "company" ? "company" : "creator",
          detail: `docProps ${field} = "${value}"`,
          weight: Math.min(0.5, rule.weight * 0.5),
        });
      }
    }
  }

  // Mac vs Windows PowerPoint: Mac builds omit docProps/thumbnail.jpeg and
  // report a padded 16.00xx AppVersion.
  if (scores.has("microsoft-powerpoint-windows")) {
    if (MAC_VERSION_RE.test((md.appVersion ?? "").trim())) {
      add(scores, "microsoft-powerpoint-mac", {
        channel: "app-metadata",
        detail: `AppVersion "${md.appVersion}" matches the Mac build pattern`,
        weight: 0.35,
      });
    }
  }

  // Part-layout signals.
  if (paths.length) {
    if (!paths.includes("docProps/app.xml")) {
      add(scores, "programmatic", {
        channel: "part-layout",
        detail: "No docProps/app.xml — real editors always write one",
        weight: 0.45,
      });
      add(scores, "google-slides", {
        channel: "part-layout",
        detail: "Missing docProps/app.xml, which Google Slides exports also omit",
        weight: 0.2,
      });
    }
    if (paths.some((p) => /^ppt\/notesSlides\//.test(p)) === false && paths.length < 25) {
      add(scores, "programmatic", {
        channel: "part-layout",
        detail: `Minimal package (${paths.length} parts, no notes slides)`,
        weight: 0.2,
      });
    }
    if (paths.some((p) => /customXml\/itemProps/.test(p))) {
      add(scores, "microsoft-powerpoint-windows", {
        channel: "part-layout",
        detail: "customXml item properties present (written by desktop PowerPoint)",
        weight: 0.2,
      });
    }
    if (paths.some((p) => /^ppt\/media\/image\d+\.svg$/i.test(p))) {
      add(scores, "canva", {
        channel: "part-layout",
        detail: "SVG media parts present, typical of browser-based design tools",
        weight: 0.15,
      });
      add(scores, "figma", {
        channel: "part-layout",
        detail: "SVG media parts present, typical of vector-tool exports",
        weight: 0.15,
      });
    }
    if (paths.some((p) => /vbaProject\.bin$/i.test(p))) {
      add(scores, "microsoft-powerpoint-windows", {
        channel: "part-layout",
        detail: "VBA project present — only desktop PowerPoint on Windows authors macros",
        weight: 0.3,
      });
    }
  }

  // Namespace signals.
  for (const ns of namespaces) {
    if (/schemas\.microsoft\.com\/office\/powerpoint\/2010\/main/.test(ns)) {
      add(scores, "microsoft-powerpoint-windows", {
        channel: "namespace",
        detail: "p14 (PowerPoint 2010+) extension namespace in use",
        weight: 0.2,
      });
    }
    if (/schemas\.openxmlformats\.org\/drawingml\/2006\/main/.test(ns) === false && /libreoffice|openoffice/i.test(ns)) {
      add(scores, "libreoffice", {
        channel: "namespace",
        detail: `Vendor namespace ${ns}`,
        weight: 0.4,
      });
    }
  }

  // Relationship signals.
  if (rels.some((t) => /docs\.google\.com/i.test(t))) {
    add(scores, "google-slides", {
      channel: "relationship",
      detail: "Relationship target points at docs.google.com",
      weight: 0.5,
    });
  }
  if (rels.some((t) => /canva\.com/i.test(t))) {
    add(scores, "canva", {
      channel: "relationship",
      detail: "Relationship target points at canva.com",
      weight: 0.5,
    });
  }

  // Master / layout structure. Converters and web tools emit exactly one master
  // and either one or zero real layouts.
  const masters = input.templates?.masters.length ?? 0;
  const layouts = input.templates?.layouts.length ?? 0;
  if (masters === 1 && layouts <= 1 && (input.slides?.length ?? 0) > 2) {
    add(scores, "programmatic", {
      channel: "master-structure",
      detail: `Single master with ${layouts} layout across ${input.slides?.length} slides`,
      weight: 0.3,
    });
    add(scores, "pdf-converter", {
      channel: "master-structure",
      detail: "Single blank master, which converters produce",
      weight: 0.2,
    });
  }
  if (masters > 1 && layouts >= 11) {
    add(scores, "microsoft-powerpoint-windows", {
      channel: "master-structure",
      detail: `${masters} masters and ${layouts} layouts — a full Office template set`,
      weight: 0.25,
    });
  }

  // Export-shape signals: flattened decks.
  const slides = input.slides ?? [];
  if (slides.length > 0) {
    const flattened = slides.filter((s) => s.fullBleedImageOnly && !s.hasText).length;
    const ratio = flattened / slides.length;
    if (ratio >= 0.8) {
      add(scores, "image-converter", {
        channel: "export-shape",
        detail: `${flattened} of ${slides.length} slides are a single full-bleed image with no text`,
        weight: 0.9,
      });
      add(scores, "pdf-converter", {
        channel: "export-shape",
        detail: "Every slide is one flattened raster — typical of PDF/image conversion",
        weight: 0.5,
      });
    } else if (ratio >= 0.4) {
      add(scores, "pdf-converter", {
        channel: "export-shape",
        detail: `${flattened} of ${slides.length} slides are flattened rasters`,
        weight: 0.4,
      });
    }
    const vectorHeavy = slides.filter(
      (s) => s.kinds.filter((k) => k === "text" || k === "image").length === 0 && s.kinds.length > 20,
    ).length;
    if (vectorHeavy >= Math.max(1, slides.length * 0.5)) {
      add(scores, "illustrator", {
        channel: "export-shape",
        detail: "Slides are dense vector paths with no text objects — a design-tool export",
        weight: 0.4,
      });
    }
  }

  // Theme signals: Google Slides writes a theme with empty font faces.
  if (input.theme && !input.theme.headingFont && !input.theme.bodyFont) {
    add(scores, "google-slides", {
      channel: "theme",
      detail: "Theme declares no heading or body typeface",
      weight: 0.25,
    });
    add(scores, "programmatic", {
      channel: "theme",
      detail: "Theme font scheme is empty",
      weight: 0.2,
    });
  }

  const ranked = [...scores.entries()]
    .map(([sourceId, s]) => ({ sourceId, score: s.score, signals: s.signals, version: s.version }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0 || ranked[0].score < 0.2) {
    return {
      sourceId: "unknown",
      label: SOURCE_LABELS.unknown,
      confidence: 0,
      signals: [],
      runnersUp: [],
    };
  }

  const winner = ranked[0];
  const total = ranked.reduce((n, r) => n + r.score, 0);
  // Confidence blends absolute evidence strength with how far clear of the field
  // the winner is, so two equally-scoring candidates never read as certain.
  const dominance = total > 0 ? winner.score / total : 0;
  const strength = Math.min(1, winner.score);
  const confidence = Math.round(Math.min(0.99, strength * 0.6 + dominance * 0.4) * 100) / 100;

  return {
    sourceId: winner.sourceId,
    label: SOURCE_LABELS[winner.sourceId],
    ...(winner.version ? { version: winner.version } : {}),
    confidence,
    signals: winner.signals.sort((a, b) => b.weight - a.weight),
    runnersUp: ranked.slice(1, 4).map((r) => ({
      sourceId: r.sourceId,
      label: SOURCE_LABELS[r.sourceId],
      score: Math.round(r.score * 100) / 100,
    })),
  };
}

/** Build fingerprint input straight from a ParsedDeck. */
export function fingerprintInputFromDeck(
  deck: ParsedDeck,
  extra: Pick<FingerprintInput, "entryPaths" | "namespaces" | "relationshipTargets"> = {},
): FingerprintInput {
  return {
    metadata: deck.metadata,
    theme: deck.theme,
    templates: deck.templates,
    slideSize: deck.slides[0]?.layout?.size,
    slides: deck.slides.map((s) => {
      const shapes = s.layout?.shapes ?? [];
      const size = s.layout?.size ?? { w: 13.333, h: 7.5 };
      const images = shapes.filter((sh) => sh.kind === "image");
      const hasText =
        shapes.some(
          (sh) => sh.kind === "text" && sh.text.paras.some((p) => p.runs.some((r) => r.text.trim())),
        ) || Boolean(s.title.trim()) || s.bullets.some((b) => b.trim());
      const fullBleed = images.some(
        (sh) => sh.frame.w >= size.w * 0.97 && sh.frame.h >= size.h * 0.97,
      );
      return {
        kinds: shapes.map((sh) => sh.kind),
        hasText,
        fullBleedImageOnly: fullBleed && shapes.length <= 2,
      };
    }),
    ...extra,
  };
}
