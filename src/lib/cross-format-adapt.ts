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
};

export type AdaptTargetId = "social-card" | "social-portrait" | "social-story" | "print-brief" | "case-study";

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
];

export function adaptTarget(id: AdaptTargetId): AdaptTarget {
  const t = ADAPT_TARGETS.find((x) => x.id === id);
  if (!t) throw new Error(`adaptTarget: unknown target "${id}"`);
  return t;
}

export function adaptTargetFormat(target: AdaptTarget): SocialFormat | null {
  return target.formatId ? (getFormat(target.formatId) ?? null) : null;
}

// ── Reading a source ───────────────────────────────────────────────────────

const HEADLINE_KEYS = ["headline", "title", "heading", "statement", "question", "quote", "name"];
const EYEBROW_KEYS = ["eyebrow", "kicker", "label", "sectionLabel", "overline", "industry"];
const BODY_KEYS = [
  "body", "summary", "subtitle", "copy", "subhead", "standfirst", "intro", "description",
  "narrative", "story", "message", "insight", "result", "solution", "challenge", "caption",
];
const POINT_KEYS = ["points", "bullets", "cardPoints", "items", "list", "highlights", "cardHighlights"];
const CTA_KEYS = ["cta", "ctaLabel", "action", "nextSteps", "followUp"];
const FOOTNOTE_KEYS = ["footnote", "source", "sourceNote", "disclaimer", "attribution", "reference"];
const PHOTO_KEYS = ["imageUrl", "image", "photoUrl", "mediaUrl", "heroImage", "backgroundImage"];

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
}

function pick(content: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const s = str(content[k]);
    if (s) return s;
  }
  return undefined;
}

function pickPoints(content: Record<string, unknown>): string[] | undefined {
  for (const k of POINT_KEYS) {
    const v = content[k];
    if (!Array.isArray(v)) continue;
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
          const head = str(rec.title) ?? str(rec.label) ?? str(rec.heading) ?? str(rec.name);
          const tail = str(rec.body) ?? str(rec.text) ?? str(rec.copy) ?? str(rec.role) ?? str(rec.description);
          const lead = value ? [value + (str(rec.unit) ?? ""), head].filter(Boolean).join(" ") : head;
          return [lead, tail].filter(Boolean).join(" — ") || undefined;
        }
        return undefined;
      })
      .filter((x): x is string => Boolean(x));
    if (out.length > 0) return out;
  }
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
  const stats = content.stats;
  if (Array.isArray(stats)) {
    for (const s of stats) {
      if (s && typeof s === "object") {
        const rec = s as Record<string, unknown>;
        const value = str(rec.value) ?? str(rec.stat) ?? str(rec.number);
        if (value) return { value, label: str(rec.label) ?? str(rec.caption) ?? "" };
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
  for (const k of PHOTO_KEYS) {
    const url = str(content[k]);
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

/** Read a deck slide's loose content record into the neutral payload. */
export function contentFromSlide(slide: {
  content?: Record<string, unknown> | null;
  notes?: string | null;
}): AdaptContent {
  const c = (slide.content ?? {}) as Record<string, unknown>;
  return {
    eyebrow: pick(c, EYEBROW_KEYS),
    headline: pick(c, HEADLINE_KEYS) ?? "Untitled slide",
    body: pick(c, BODY_KEYS),
    points: pickPoints(c),
    stat: pickStat(c),
    cta: pick(c, CTA_KEYS),
    footnote: pick(c, FOOTNOTE_KEYS),
    media: adaptMediaFrom(c),
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
