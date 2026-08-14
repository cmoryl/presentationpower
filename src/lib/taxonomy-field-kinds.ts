// ---------------------------------------------------------------------------
// Field kinds & character budgets.
//
// `editableFields` on a ModuleVariant is the list of paths a caller may write.
// This module says, for each of those paths, WHAT it holds and HOW MUCH fits —
// the mapping that used to be missing. Previously `capacity` spoke a generic
// vocabulary (`titleChars`, `bodyChars`, `items`) while `editableFields` spoke a
// semantic one (`recommendation`, `soWhat`, `attribution`…), so nothing
// connected a budget to a field: content written to `title`/`body` on
// MV-REC-NEXT passed every declared check and was then silently dropped by the
// deep merge.
//
// Classification is by the LEAF segment of the path, so `items[].label`,
// `lanes[].items[].label` and `label` all resolve the same way.
// ---------------------------------------------------------------------------

/** What a field holds. Only `text` carries a character budget. */
export type FieldKind = "text" | "number" | "image" | "logo" | "icon" | "list";

export type FieldSpec =
  | { kind: "text"; chars: number }
  | { kind: Exclude<FieldKind, "text"> };

/** Character budgets used when the variant declares no generic equivalent. */
const SHORT = 24;
const TITLE = 60;
const BODY = 200;

/** Asset references — a URL, storage path, variant name, or generator seed. */
const LOGO = /^(logoUrl|logoPath|logoPaths|logoVariant|logoVariants)$/;
const IMAGE = /^(mediaUrl|mediaSeed|seed|thumbnail|thumbnailUrl|featuredLogoUrl)$/;
const ICON = /^(icon|monogram)$/;

/** Numeric slots — a caller sends a number, not prose, so length is meaningless. */
const NUMBER = new Set([
  "value",
  "percent",
  "delta",
  "lat",
  "lon",
  "x",
  "y",
  "price",
  "amount",
  "done",
  "total",
  "size",
  "current",
  "bar",
  "line",
  "min",
  "max",
  "start",
  "end",
  "waterline",
  "centerValue",
  "pullValue",
  "chapterNumber",
  "stepNumber",
  "numeral",
]);

/** Collection slots — the caller sends an array, budgeted per member elsewhere. */
const LIST = new Set([
  "series",
  "points",
  "values",
  "features",
  "cells",
  "columns",
  "rows",
  "legend",
  "quarters",
  "quadrants",
  "lines",
  "hub",
  "items",
  "target",
]);

/** Compact text: a unit, a country, a stage name — never a sentence. */
const SHORT_TEXT = new Set([
  "unit",
  "role",
  "city",
  "country",
  "region",
  "year",
  "date",
  "day",
  "monthYear",
  "kind",
  "sentiment",
  "phase",
  "trend",
  "encoding",
  "direction",
  "partOfSpeech",
  "pronunciation",
  "folio",
  "credit",
  "timeframe",
  "decisionBy",
  "when",
  "cadence",
  "range",
  "benchmark",
  "sector",
  "email",
  "phone",
  "q1",
  "q2",
  "q3",
  "q4",
  "centerUnit",
  "pullUnit",
  "axisX",
  "axisY",
]);

/**
 * Headline-scale slots that read like sentences but are still the loud line on
 * the slide (`recommendation` on MV-REC-NEXT, `message` on MV-CLOSE-CTA), so
 * they take the title budget rather than the body budget.
 */
const LEAD_TEXT = new Set([
  "recommendation",
  "message",
  "statement",
  "promise",
  "ask",
  "question",
  "idea",
  "prompt",
  "standfirst",
  "ctaDetail",
]);

/** Prose: a paragraph-scale slot that should use the body budget. */
const BODY_TEXT = new Set([
  "body",
  "bodyLeft",
  "bodyRight",
  "note",
  "rationale",
  "narrative",
  "summary",
  "insight",
  "soWhat",
  "nowWhat",
  "nextSteps",
  "followUp",
  "definition",
  "usage",
  "purpose",
  "story",
  "challenge",
  "solution",
  "outcome",
  "result",
  "bio",
  "quote",
  "mitigation",
  "risk",
  "ctaBody",
  "featuredNote",
  "description",
  "detail",
  "lines",
]);

/** The last named segment of a field path (`lanes[].items[].label` → `label`). */
export function leafOf(path: string): string {
  const clean = path.replace(/\[\]$/, "");
  const parts = clean.split(/[.[]/).filter((p) => p && p !== "]");
  return parts[parts.length - 1] ?? clean;
}

/**
 * Resolve the spec for one editable field path. `generic` supplies the
 * variant's legacy title/body budgets so authored intent is preserved rather
 * than replaced by a default.
 */
export function fieldSpecFor(
  path: string,
  generic?: { titleChars?: number; bodyChars?: number },
): FieldSpec {
  const leaf = leafOf(path);
  if (LOGO.test(leaf)) return { kind: "logo" };
  if (IMAGE.test(leaf)) return { kind: "image" };
  if (ICON.test(leaf)) return { kind: "icon" };
  if (path.endsWith("[]") || LIST.has(leaf)) return { kind: "list" };
  if (NUMBER.has(leaf)) return { kind: "number" };
  if (SHORT_TEXT.has(leaf)) return { kind: "text", chars: SHORT };
  if (LEAD_TEXT.has(leaf)) return { kind: "text", chars: generic?.titleChars ?? TITLE };
  if (BODY_TEXT.has(leaf)) return { kind: "text", chars: generic?.bodyChars ?? BODY };
  // Everything else is a heading-scale slot: title, label, kicker, name,
  // headline, metric, attribution, owner, source, caption, lead, emphasis…
  return { kind: "text", chars: generic?.titleChars ?? TITLE };
}

/** Compact source form for the codemod. */
export function serializeFieldSpec(spec: FieldSpec): string {
  return spec.kind === "text"
    ? `{ kind: "text", chars: ${spec.chars} }`
    : `{ kind: ${JSON.stringify(spec.kind)} }`;
}
