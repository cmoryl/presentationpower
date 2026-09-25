// -----------------------------------------------------------------------------
// Cross-format layout adapter.
//
// One piece of approved content — a deck slide, a social card, a print
// collateral page — carries the same editorial payload: an eyebrow, a headline,
// body copy, supporting points, a figure, and (sometimes) a photograph. This
// module normalises any of those sources into that neutral payload, then
// re-shapes it for a target medium with the medium's own typographic hierarchy
// and capacity.
//
// Rules that are NOT negotiable here:
//  · Nothing is silently dropped or clipped. Every shortened line, every point
//    that did not fit, and every asset that cannot travel is reported back in
//    `notes` so the operator sees it before exporting.
//  · Backgrounds only travel as approved photography, a solid brand token, or a
//    curated image asset. A vector/generated background is refused, not
//    converted.
// -----------------------------------------------------------------------------

import type { CampaignCopy } from "@/lib/campaigns";
import { getFormat, type SocialFormat } from "@/lib/social-formats";

// ── Neutral payload ────────────────────────────────────────────────────────

export type AdaptMedia =
  /** An approved photograph or curated image asset (URL or data URL). */
  | { kind: "photo"; url: string; alt?: string }
  /** A solid brand token fill, referenced by token name/hex from the guide. */
  | { kind: "token"; token: string }
  /** Anything else — refused by the adapter and reported. */
  | { kind: "unsupported"; reason: string };

export type AdaptContent = {
  eyebrow?: string;
  headline: string;
  body?: string;
  points?: string[];
  stat?: { value: string; label: string };
  cta?: string;
  footnote?: string;
  media?: AdaptMedia;
  /** How the module arranges its points — rebuilt natively on print pages. */
  shape?: AdaptShape;
  /** Every other field the module carries (owner, timeframe, cadence…). */
  details?: { label: string; value: string }[];
};

export type AdaptShape =
  | { kind: "list" }
  | { kind: "steps" }
  | { kind: "pairs" }
  | { kind: "stats" }
  | { kind: "quadrants"; axisX?: string; axisY?: string }
  | { kind: "table"; columns: string[] };

export type AdaptTargetId =
  | "social-card"
  | "social-portrait"
  | "social-story"
  | "print-brief"
  | "case-study"
  | "print-letter"
  | "flyer-a5"
  | "rack-card-dl"
  | "postcard-a6"
  | "sell-sheet-landscape"
  | "poster-a3"
  | "poster-a2"
  | "tent-card"
  | "rollup-banner";

/** How a print page arranges its blocks. */
export type PrintLayout = "sheet" | "landscape" | "poster" | "banner";

export type AdaptTypography = {
  /** Point/pixel steps for the medium, largest first. */
  eyebrowPx: number;
  headlinePx: number;
  bodyPx: number;
  pointPx: number;
  statPx: number;
  /** Body leading multiplier. */
  bodyLeading: number;
  /** Headline leading multiplier. */
  headlineLeading: number;
};

export type AdaptTarget = {
  id: AdaptTargetId;
  label: string;
  medium: "social" | "print";
  /** Social targets resolve to a registry format; print targets carry a trim. */
  formatId?: string;
  /** Print trim in inches (width × height). */
  trimIn?: { width: number; height: number };
  /** Capacity of the layout structure. */
  caps: { headline: number; body: number; points: number; pointChars: number };
  type: AdaptTypography;
  /** What the layout structure actually shows, in reading order. */
  structure: string[];
  /** Print page arrangement (defaults to "sheet"). */
  layout?: PrintLayout;
};

export const ADAPT_TARGETS: AdaptTarget[] = [
  {
    id: "social-card",
    label: "Social card · square",
    medium: "social",
    formatId: "square-1080",
    caps: { headline: 90, body: 180, points: 3, pointChars: 60 },
    type: {
      eyebrowPx: 26,
      headlinePx: 86,
      bodyPx: 34,
      pointPx: 30,
      statPx: 120,
      bodyLeading: 1.35,
      headlineLeading: 1.05,
    },
    structure: ["eyebrow", "headline", "body", "stat", "cta", "lockup"],
  },
  {
    id: "social-portrait",
    label: "Social card · portrait",
    medium: "social",
    formatId: "portrait-1080x1350",
    caps: { headline: 110, body: 240, points: 4, pointChars: 60 },
    type: {
      eyebrowPx: 26,
      headlinePx: 82,
      bodyPx: 34,
      pointPx: 30,
      statPx: 116,
      bodyLeading: 1.35,
      headlineLeading: 1.05,
    },
    structure: ["eyebrow", "headline", "body", "points", "cta", "lockup"],
  },
  {
    id: "social-story",
    label: "Social card · story",
    medium: "social",
    formatId: "story-1080x1920",
    caps: { headline: 80, body: 140, points: 3, pointChars: 48 },
    type: {
      eyebrowPx: 28,
      headlinePx: 94,
      bodyPx: 36,
      pointPx: 32,
      statPx: 130,
      bodyLeading: 1.32,
      headlineLeading: 1.04,
    },
    structure: ["headline", "body", "cta", "lockup"],
  },
  {
    id: "print-brief",
    label: "1-page print brief",
    medium: "print",
    trimIn: { width: 8.268, height: 11.693 }, // A4
    caps: { headline: 120, body: 900, points: 6, pointChars: 120 },
    type: {
      eyebrowPx: 11,
      headlinePx: 40,
      bodyPx: 11,
      pointPx: 11,
      statPx: 44,
      bodyLeading: 1.45,
      headlineLeading: 1.08,
    },
    structure: ["eyebrow", "headline", "standfirst", "body", "points", "stat", "footnote"],
  },
  {
    id: "case-study",
    label: "1-page case study",
    medium: "print",
    trimIn: { width: 8.268, height: 11.693 },
    caps: { headline: 110, body: 1400, points: 5, pointChars: 140 },
    type: {
      eyebrowPx: 11,
      headlinePx: 34,
      bodyPx: 10.5,
      pointPx: 10.5,
      statPx: 40,
      bodyLeading: 1.5,
      headlineLeading: 1.1,
    },
    structure: [
      "eyebrow",
      "headline",
      "photo",
      "challenge",
      "approach",
      "result",
      "stat",
      "footnote",
    ],
  },
  ...EXTRA_PRINT_TARGETS(),
];

/**
 * More print sizes. Type steps scale from the A4 brief by page width so the
 * hierarchy holds at every trim; caps shrink with the page area.
 */
function EXTRA_PRINT_TARGETS(): AdaptTarget[] {
  const mm = (w: number, h: number) => ({ width: w / 25.4, height: h / 25.4 });
  const make = (
    id: AdaptTargetId,
    label: string,
    trimIn: { width: number; height: number },
    layout: PrintLayout,
    caps: AdaptTarget["caps"],
    structure: string[],
    headlineBoost = 1,
  ): AdaptTarget => {
    const k = Math.min(trimIn.width, trimIn.height) / 8.268;
    const r = (n: number) => Math.round(n * k * 10) / 10;
    return {
      id,
      label,
      medium: "print",
      trimIn,
      layout,
      caps,
      type: {
        eyebrowPx: r(11),
        headlinePx: r(40 * headlineBoost),
        bodyPx: r(11),
        pointPx: r(11),
        statPx: r(48 * headlineBoost),
        bodyLeading: 1.45,
        headlineLeading: 1.06,
      },
      structure,
    };
  };
  const full = ["eyebrow", "headline", "standfirst", "body", "points", "stat", "footnote"];
  return [
    make("print-letter", "1-page brief · US Letter", { width: 8.5, height: 11 }, "sheet",
      { headline: 120, body: 900, points: 6, pointChars: 120 }, full),
    make("flyer-a5", "Flyer · A5", mm(148, 210), "sheet",
      { headline: 90, body: 420, points: 4, pointChars: 90 }, full),
    make("rack-card-dl", "Rack card · DL", mm(99, 210), "sheet",
      { headline: 70, body: 260, points: 3, pointChars: 70 }, ["eyebrow", "headline", "body", "points", "stat"]),
    make("postcard-a6", "Postcard · A6 landscape", mm(148, 105), "landscape",
      { headline: 70, body: 200, points: 3, pointChars: 60 }, ["eyebrow", "headline", "body", "points", "stat"]),
    make("sell-sheet-landscape", "Sell sheet · A4 landscape", mm(297, 210), "landscape",
      { headline: 110, body: 700, points: 6, pointChars: 110 }, full),
    make("poster-a3", "Poster · A3", mm(297, 420), "poster",
      { headline: 80, body: 260, points: 3, pointChars: 80 }, ["eyebrow", "headline", "body", "points", "stat"], 1.5),
    make("poster-a2", "Poster · A2", mm(420, 594), "poster",
      { headline: 80, body: 220, points: 3, pointChars: 70 }, ["eyebrow", "headline", "body", "points", "stat"], 1.6),
    make("tent-card", "Table tent · A6 portrait", mm(105, 148), "poster",
      { headline: 60, body: 140, points: 2, pointChars: 50 }, ["eyebrow", "headline", "body", "points", "stat"], 1.2),
    make("rollup-banner", "Roll-up banner · 850 × 2000 mm", mm(850, 2000), "banner",
      { headline: 80, body: 280, points: 5, pointChars: 90 }, ["eyebrow", "headline", "body", "points", "stat", "footnote"], 1.8),
  ];
}

export function adaptTarget(id: AdaptTargetId): AdaptTarget {
  const t = ADAPT_TARGETS.find((x) => x.id === id);
  if (!t) throw new Error(`adaptTarget: unknown target "${id}"`);
  return t;
}

export function adaptTargetFormat(target: AdaptTarget): SocialFormat | null {
  return target.formatId ? (getFormat(target.formatId) ?? null) : null;
}

// ── Reading a source ───────────────────────────────────────────────────────

const HEADLINE_KEYS = [
  "headline", "title", "heading", "statement", "question", "quote", "name",
  // Saved modules that carry their lead line under a module-specific field.
  "insight", "idea", "message", "ask", "recommendation", "clientName", "client",
];
const EYEBROW_KEYS = ["eyebrow", "kicker", "label", "sectionLabel", "overline", "industry", "clientName", "client"];
const BODY_KEYS = [
  "body", "summary", "subtitle", "copy", "subhead", "standfirst", "intro", "description",
  "narrative", "story", "message", "insight", "result", "solution", "challenge", "caption", "soWhat",
  "rationale", "promise", "prompt", "statement", "definition", "nextSteps", "hub", "bodyLeft", "signoff", "usage",
];
const POINT_KEYS = [
  "points", "bullets", "cardPoints", "items", "list", "highlights", "cardHighlights",
  // Module-specific list fields (process stages, capability cards, pillars, charts…).
  "stages", "steps", "phases", "milestones", "cards", "above", "below", "segments", "pillars", "tiles", "rows", "options",
  "benefits", "features", "outcomes", "quotes", "logos", "series", "bars",
];
const CTA_KEYS = ["cta", "ctaLabel", "action", "nextSteps", "followUp", "nowWhat"];
const FOOTNOTE_KEYS = ["footnote", "source", "sourceNote", "disclaimer", "attribution", "reference"];
const PHOTO_KEYS = ["imageUrl", "image", "photoUrl", "mediaUrl", "heroImage", "backgroundImage"];

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
}

/**
 * Saved modules sometimes hold their list fields as a string — JSON, or a
 * Python-style repr ("[{'title': 'A', 'body': 'B'}]") written by an older
 * generator. Read either back into an array so points and figures carry.
 */
export function asList(v: unknown): unknown[] | undefined {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t.startsWith("[")) return undefined;
  try {
    const j = JSON.parse(t);
    return Array.isArray(j) ? j : undefined;
  } catch {
    /* fall through to the repr reader */
  }
  try {
    const jsonish = t
      .replace(/\bNone\b/g, "null")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      // 'text' → "text", keeping apostrophes inside double-quoted strings.
      .replace(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g, (_m, dq, sq) =>
        dq !== undefined ? `"${dq}"` : JSON.stringify(String(sq).replace(/\\'/g, "'")),
      );
    const j = JSON.parse(jsonish);
    return Array.isArray(j) ? j : undefined;
  } catch {
    return undefined;
  }
}

function pick(content: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const s = str(content[k]);
    if (s) return s;
  }
  return undefined;
}

/** First non-empty field that is not a repeat of `except` (the headline). */
function pickOther(content: Record<string, unknown>, keys: string[], except: string): string | undefined {
  for (const k of keys) {
    const s = str(content[k]);
    if (s && s !== except) return s;
  }
  return undefined;
}

function pickPoints(content: Record<string, unknown>): string[] | undefined {
  for (const k of POINT_KEYS) {
    const v = asList(content[k]);
    if (!v) continue;
    const out = v
      .map((item) => {
        if (typeof item === "string") return str(item);
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          // Before/after rows read as "before → after".
          const before = str(rec.before);
          const after = str(rec.after);
          if (before || after) return [before, after].filter(Boolean).join(" → ");
          // Stat rows: "40% — label".
          const value = str(rec.value) ?? str(rec.stat) ?? str(rec.number) ?? str(rec.metric);
          const head =
            str(rec.title) ?? str(rec.label) ?? str(rec.heading) ?? str(rec.name) ??
            str(rec.criterion) ?? str(rec.risk) ?? str(rec.forum) ?? str(rec.client) ??
            str(rec.lead) ?? str(rec.phase) ?? str(rec.quote) ?? str(rec.term) ?? str(rec.caption);
          const listTail = Array.isArray(rec.values)
            ? rec.values.map((x) => (typeof x === "number" ? String(x) : str(x))).filter(Boolean).join(" · ")
            : Array.isArray(rec.bullets)
              ? rec.bullets.map((x) => str(x)).filter(Boolean).slice(0, 3).join("; ")
              : Array.isArray(rec.items)
                ? (rec.items as unknown[])
                    .map((x) => (typeof x === "string" ? str(x) : x && typeof x === "object" ? str((x as Record<string, unknown>).label) ?? str((x as Record<string, unknown>).title) : undefined))
                    .filter(Boolean).slice(0, 3).join("; ")
                : undefined;
          const tail =
            str(rec.body) ?? str(rec.text) ?? str(rec.copy) ?? str(rec.description) ??
            str(rec.mitigation) ?? str(rec.purpose) ?? str(rec.touchpoint) ?? str(rec.result) ?? str(rec.leadNote) ??
            str(rec.definition) ?? str(rec.attribution) ?? str(rec.role) ?? (listTail || undefined);
          const unit = str(rec.unit) ?? "";
          const figure = value ? (unit && !/^[%+x×]/.test(unit) ? `${value} ${unit}` : value + unit) : undefined;
          const lead = figure ? [figure, head].filter(Boolean).join(" ") : head;
          return [lead, tail].filter(Boolean).join(" — ") || undefined;
        }
        return undefined;
      })
      .filter((x): x is string => Boolean(x));
    if (out.length > 0) return out;
  }
  // Paired objects (before / after) and quadrant matrices.
  const side = (k: string) => {
    const v = content[k];
    if (typeof v === "string") return str(v);
    if (v && typeof v === "object") {
      const r = v as Record<string, unknown>;
      return [str(r.title) ?? str(r.label), str(r.body) ?? str(r.text)].filter(Boolean).join(" — ") || undefined;
    }
    return undefined;
  };
  const pair = [["Before", side("before")], ["After", side("after")]].filter(([, v]) => v);
  if (pair.length) return pair.map(([k, v]) => `${k}: ${v}`);
  const quads = ["q1", "q2", "q3", "q4"].map((k) => str(content[k])).filter((x): x is string => !!x);
  if (quads.length) return quads;
  return undefined;
}

function pickStat(content: Record<string, unknown>): { value: string; label: string } | undefined {
  const direct = content.stat;
  // Flat stat modules: stat "40" + unit "%" (+ label/caption), or metric "38% ↓ time to market".
  if (typeof direct === "string" || typeof direct === "number") {
    const value = `${direct}${str(content.unit) ?? ""}`.trim();
    if (value) return { value, label: str(content.statLabel) ?? str(content.label) ?? str(content.caption) ?? "" };
  }
  const metric = str(content.metric);
  if (metric) {
    // "6 wks → 9 days" is one figure; "38% ↓ time to market" is figure + label.
    if (metric.includes("→")) return { value: metric, label: str(content.label) ?? str(content.caption) ?? "" };
    const [value, ...rest] = metric.split(/\s+/);
    return { value, label: rest.join(" ") };
  }
  if (direct && typeof direct === "object") {
    const rec = direct as Record<string, unknown>;
    const value = str(rec.value);
    if (value) return { value, label: str(rec.label) ?? "" };
  }
  for (const key of ["primary", "balance", "hero"]) {
    const rec = content[key];
    if (rec && typeof rec === "object" && !Array.isArray(rec)) {
      const r = rec as Record<string, unknown>;
      const value = typeof r.value === "number" ? String(r.value) : str(r.value);
      if (value) return { value: `${value}${str(r.unit) ?? ""}`, label: str(r.label) ?? "" };
    }
  }
  for (const key of ["stats", "items", "metrics", "kpis"]) {
    const stats = asList(content[key]);
    if (!stats) continue;
    for (const s of stats) {
      if (s && typeof s === "object") {
        const rec = s as Record<string, unknown>;
        const raw = rec.value ?? rec.stat ?? rec.number;
        const value = typeof raw === "number" ? String(raw) : str(raw);
        if (value) {
          const unit = str(rec.unit) ?? "";
          const joined = unit && !/^[%+x×]/.test(unit) ? `${value} ${unit}` : `${value}${unit}`;
          return { value: joined, label: str(rec.label) ?? str(rec.caption) ?? "" };
        }
      }
    }
  }
  return undefined;
}

/**
 * Background/media travel rule. A photograph or curated image asset travels as
 * itself; a solid brand token travels as a token. Anything generated as vector
 * artwork is refused — backgrounds stay on approved photography, solid tokens
 * and curated assets.
 */
export function adaptMediaFrom(content: Record<string, unknown>): AdaptMedia | undefined {
  const urlOf = (v: unknown): string | undefined => {
    if (typeof v === "string") return str(v);
    if (Array.isArray(v)) return urlOf(v[0]);
    if (v && typeof v === "object") {
      const r = v as Record<string, unknown>;
      return str(r.url) ?? str(r.src) ?? str(r.imageUrl) ?? str(r.signedUrl);
    }
    return undefined;
  };
  for (const k of [...PHOTO_KEYS, "photo", "media", "images", "photos"]) {
    const url = urlOf(content[k]);
    if (!url) continue;
    if (/\.svg($|\?)/i.test(url) || url.startsWith("data:image/svg")) {
      return { kind: "unsupported", reason: "vector background — not carried across formats" };
    }
    return { kind: "photo", url, alt: str(content.imageAlt) ?? str(content.alt) };
  }
  const bg = content.background;
  if (bg && typeof bg === "object") {
    const rec = bg as Record<string, unknown>;
    const url = str(rec.imageUrl) ?? str(rec.url);
    if (url) {
      if (/\.svg($|\?)/i.test(url) || url.startsWith("data:image/svg")) {
        return { kind: "unsupported", reason: "vector background — not carried across formats" };
      }
      return { kind: "photo", url };
    }
    const token = str(rec.token) ?? str(rec.fill) ?? str(rec.color);
    if (token) return { kind: "token", token };
    const kind = str(rec.kind) ?? str(rec.type);
    if (kind && /vector|shape|pattern|gradient|generated/i.test(kind)) {
      return { kind: "unsupported", reason: `${kind} background — not carried across formats` };
    }
  }
  const token = str(content.backgroundToken) ?? str(content.surfaceToken);
  if (token) return { kind: "token", token };
  return undefined;
}

const STEP_KEYS = ["stages", "steps", "phases", "milestones"];
function shapeFrom(c: Record<string, unknown>): AdaptShape {
  if (c.before || c.after) return { kind: "pairs" };
  if (c.q1 || c.q2 || c.q3 || c.q4) return { kind: "quadrants", axisX: str(c.axisX), axisY: str(c.axisY) };
  const cols = asList(c.columns);
  const items = asList(c.items) ?? [];
  const firstItem = items[0] as Record<string, unknown> | undefined;
  if (cols && firstItem && Array.isArray(firstItem.values) && cols.every((x) => x && typeof x === "object")) {
    return { kind: "table", columns: cols.map((x) => str((x as Record<string, unknown>).label) ?? "").filter(Boolean) };
  }
  if (STEP_KEYS.some((k) => asList(c[k])) || (firstItem && (firstItem.stepNumber || firstItem.phase))) return { kind: "steps" };
  for (const k of ["stats", "items", "metrics", "kpis"]) {
    const l = asList(c[k]);
    const r = l?.[0] as Record<string, unknown> | undefined;
    if (l && l.length > 1 && r && typeof r === "object" && (r.value ?? r.stat ?? r.number) != null) return { kind: "stats" };
  }
  return { kind: "list" };
}

const DETAIL_SKIP = new Set([
  "mediaSeed", "seed", "icon", "mode", "id", "variant", "variantId", "layoutId", "imageUrl", "image",
  "photoUrl", "mediaUrl", "heroImage", "backgroundImage", "background", "backgroundToken", "imageAlt", "alt",
  "axisX", "axisY", "q1", "q2", "q3", "q4", "unit", "stat", "value", "metric", "label",
]);
function humanize(k: string): string {
  const s = k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** Top-level text fields no other part of the payload used. */
function detailsFrom(c: Record<string, unknown>, used: (string | undefined)[]): { label: string; value: string }[] | undefined {
  const seen = new Set(used.filter(Boolean) as string[]);
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(c)) {
    if (DETAIL_SKIP.has(k)) continue;
    const s = typeof v === "number" ? String(v) : str(v);
    if (!s || s.startsWith("[") || seen.has(s) || [...seen].some((u) => u.includes(s))) continue;
    if (/^(https?:|data:)/.test(s)) continue;
    out.push({ label: humanize(k), value: s });
  }
  return out.length ? out : undefined;
}

/** Read a deck slide's loose content record into the neutral payload. */
export function contentFromSlide(
  slide: {
    content?: Record<string, unknown> | null;
    notes?: string | null;
  },
  /** Used only when the slide holds no headline-like copy at all (e.g. the module name). */
  fallbackHeadline = "Untitled slide",
): AdaptContent {
  const c = (slide.content ?? {}) as Record<string, unknown>;
  const stat = pickStat(c);
  const statLine = stat ? [stat.value, stat.label].filter(Boolean).join(" ") : undefined;
  const headline = pick(c, HEADLINE_KEYS) ?? statLine ?? fallbackHeadline;
  // Never repeat the headline as the eyebrow or body (a cover's client name
  // can be both the eyebrow source and the headline fallback).
  const notHeadline = (v: string | undefined) => (v && v !== headline ? v : undefined);
  // Cover modules: "Prepared by TransPerfect · 9/19/2026" is the standfirst.
  const coverLine =
    [str(c.prepared) ? `Prepared by ${str(c.prepared)}` : undefined, str(c.date)]
      .filter(Boolean)
      .join(" · ") || undefined;
  // Quote modules: the attribution line is the standfirst.
  const quoteLine = str(c.quote)
    ? [str(c.attribution), str(c.role), str(c.org)].filter(Boolean).join(", ") || undefined
    : undefined;
  const eyebrow = notHeadline(pick(c, EYEBROW_KEYS));
  const body = pickOther(c, BODY_KEYS, headline) ?? quoteLine ?? coverLine;
  const points = pickPoints(c);
  const cta = pick(c, CTA_KEYS);
  const footnote = pickOther(c, quoteLine ? FOOTNOTE_KEYS.filter((k) => k !== "attribution") : FOOTNOTE_KEYS, headline);
  return {
    eyebrow,
    headline,
    body,
    points,
    stat,
    cta,
    footnote,
    media: adaptMediaFrom(c),
    shape: points?.length ? shapeFrom(c) : undefined,
    details: detailsFrom(c, [eyebrow, headline, body, cta, footnote, str(c.prepared), str(c.date), str(c.attribution), str(c.role), str(c.org)]),
  };
}

/** Read a social card's copy into the neutral payload. */
export function contentFromSocialCopy(copy: CampaignCopy, imageUrl?: string): AdaptContent {
  return {
    eyebrow: copy.eyebrow,
    headline: copy.title,
    body: copy.summary,
    stat: copy.stat,
    cta: copy.cta,
    media: imageUrl ? adaptMediaFrom({ imageUrl }) : undefined,
  };
}

/** Read a print asset's content record into the neutral payload. */
export function contentFromPrint(content: Record<string, unknown>): AdaptContent {
  const base = contentFromSlide({ content });
  const challenge = pick(content, ["challenge", "problem"]);
  const approach = pick(content, ["approach", "solution"]);
  const result = pick(content, ["result", "results", "outcome"]);
  const body = base.body ?? ([challenge, approach, result].filter(Boolean).join(" ") || undefined);
  return { ...base, body };
}

// ── Shaping for a target ───────────────────────────────────────────────────

export type AdaptNote = {
  severity: "shortened" | "dropped" | "refused";
  field: string;
  detail: string;
};

export type AdaptResult = {
  target: AdaptTarget;
  content: AdaptContent;
  type: AdaptTypography;
  notes: AdaptNote[];
};

/** Trim to `max` characters on a word boundary. Returns null when it already fits. */
export function trimToWords(text: string, max: number): string | null {
  if (text.length <= max) return null;
  const hard = text.slice(0, max);
  const cut = hard.lastIndexOf(" ");
  const kept = (cut > max * 0.5 ? hard.slice(0, cut) : hard).replace(/[\s,;:.–—-]+$/, "");
  return `${kept}…`;
}

export function adaptContent(content: AdaptContent, targetId: AdaptTargetId): AdaptResult {
  const target = adaptTarget(targetId);
  const notes: AdaptNote[] = [];
  const out: AdaptContent = { ...content };

  const headlineTrim = trimToWords(content.headline, target.caps.headline);
  if (headlineTrim) {
    out.headline = headlineTrim;
    notes.push({
      severity: "shortened",
      field: "headline",
      detail: `Headline shortened from ${content.headline.length} to ${headlineTrim.length} characters for ${target.label}.`,
    });
  }

  // No body copy and no list block on this target: the points become the body
  // so a list-only module still says something on a square card.
  if (!content.body && content.points?.length && !target.structure.includes("points") && target.structure.includes("body")) {
    content = { ...content, body: content.points.join(". ").replace(/\.\.+/g, ".") };
    out.body = content.body;
    notes.push({
      severity: "shortened",
      field: "points",
      detail: `${target.label} has no list block, so the supporting points run as body copy.`,
    });
  }

  if (content.body) {
    const bodyTrim = trimToWords(content.body, target.caps.body);
    if (bodyTrim) {
      out.body = bodyTrim;
      notes.push({
        severity: "shortened",
        field: "body",
        detail: `Body copy shortened from ${content.body.length} to ${bodyTrim.length} characters — the full text stays on the source.`,
      });
    }
  }

  if (content.points?.length) {
    const carriesPoints = target.structure.includes("points");
    if (!carriesPoints) {
      out.points = undefined;
      notes.push({
        severity: "dropped",
        field: "points",
        detail: `${content.points.length} supporting point(s) not shown — ${target.label} has no list block.`,
      });
    } else {
      const kept = content.points.slice(0, target.caps.points).map((p) => {
        const t = trimToWords(p, target.caps.pointChars);
        if (t) {
          notes.push({
            severity: "shortened",
            field: "points",
            detail: `Point shortened to ${target.caps.pointChars} characters.`,
          });
        }
        return t ?? p;
      });
      out.points = kept;
      if (content.points.length > kept.length) {
        notes.push({
          severity: "dropped",
          field: "points",
          detail: `${content.points.length - kept.length} point(s) did not fit — ${target.label} holds ${target.caps.points}.`,
        });
      }
    }
  }

  if (content.stat && !target.structure.includes("stat")) {
    out.stat = undefined;
    notes.push({
      severity: "dropped",
      field: "stat",
      detail: `Figure "${content.stat.value}" not shown — ${target.label} has no figure block.`,
    });
  }

  if (content.footnote && !target.structure.includes("footnote")) {
    out.footnote = undefined;
    notes.push({
      severity: "dropped",
      field: "footnote",
      detail: "Footnote not shown in this layout — keep it on the source document.",
    });
  }

  if (content.details?.length && !target.trimIn) {
    out.details = undefined;
    notes.push({
      severity: "dropped",
      field: "details",
      detail: `${content.details.length} extra detail(s) (${content.details.map((d) => d.label.toLowerCase()).join(", ")}) not shown — ${target.label} has no details row.`,
    });
  }

  if (content.media?.kind === "unsupported") {
    out.media = undefined;
    notes.push({
      severity: "refused",
      field: "media",
      detail: `Background refused: ${content.media.reason}. Use approved photography, a solid brand token, or a curated image asset.`,
    });
  }

  return { target, content: out, type: target.type, notes };
}

/** Adapted payload as social card copy for the social renderer. */
export function toSocialCopy(result: AdaptResult): CampaignCopy {
  const { content } = result;
  const summary = content.points?.length
    ? [content.body, ...content.points].filter(Boolean).join(" · ")
    : content.body;
  return {
    eyebrow: content.eyebrow,
    title: content.headline,
    summary,
    cta: content.cta,
    stat: content.stat,
  };
}

/** Adapted payload as a print content record (case study / brief fields). */
export function toPrintContent(result: AdaptResult): Record<string, unknown> {
  const { content } = result;
  return {
    eyebrow: content.eyebrow ?? null,
    title: content.headline,
    standfirst: content.body ?? null,
    points: content.points ?? [],
    stat: content.stat ?? null,
    footnote: content.footnote ?? null,
    imageUrl: content.media?.kind === "photo" ? content.media.url : null,
    backgroundToken: content.media?.kind === "token" ? content.media.token : null,
  };
}

// ── Info builder: pick and edit what carries across ────────────────────────

/** A field of the neutral payload the operator can include or leave out. */
export type AdaptFieldKey = "eyebrow" | "headline" | "body" | "points" | "stat" | "cta" | "footnote" | "media" | "details";

export type AdaptSelection = {
  /** Fields left out on purpose. The headline can never be left out. */
  exclude: AdaptFieldKey[];
  /** Point indexes left out (from the source's own list). */
  excludePoints: number[];
  /** Operator edits, applied over the source copy. */
  edits: Partial<Pick<AdaptContent, "eyebrow" | "headline" | "body" | "cta" | "footnote">> & {
    points?: Record<number, string>;
    stat?: Partial<{ value: string; label: string }>;
  };
};

export const EMPTY_SELECTION: AdaptSelection = { exclude: [], excludePoints: [], edits: {} };

/** Source content after the operator's picks and edits. Pure; source untouched. */
export function applySelection(source: AdaptContent, sel: AdaptSelection): AdaptContent {
  const off = new Set(sel.exclude.filter((k) => k !== "headline"));
  const e = sel.edits;
  const text = (k: "eyebrow" | "body" | "cta" | "footnote") => {
    if (off.has(k)) return undefined;
    const v = e[k] ?? source[k];
    return v && v.trim() ? v : undefined;
  };
  const points = off.has("points")
    ? undefined
    : (source.points ?? [])
        .map((p, i) => ({ p: e.points?.[i] ?? p, i }))
        .filter(({ p, i }) => !sel.excludePoints.includes(i) && p.trim())
        .map(({ p }) => p);
  const stat =
    off.has("stat") || !source.stat
      ? undefined
      : { value: e.stat?.value ?? source.stat.value, label: e.stat?.label ?? source.stat.label };
  return {
    eyebrow: text("eyebrow"),
    headline: (e.headline ?? source.headline).trim() || source.headline,
    body: text("body"),
    points: points && points.length ? points : undefined,
    stat,
    cta: text("cta"),
    footnote: text("footnote"),
    media: off.has("media") ? undefined : source.media,
    shape: points && points.length ? source.shape : undefined,
    details: off.has("details") ? undefined : source.details,
  };
}
