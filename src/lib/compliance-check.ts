import { figureApproved, type FigureMatchOptions } from "./approved-figures";

// Brand compliance checks shared by the "Needs source" scan and export checks.
// Two rules for now: banned hype words, and figures that carry no source.
// Until every figure has a stored source, every %, x/×, "+" or multiplier
// figure is reported as "needs source" — the check never edits text.

export const GLOBAL_BANNED_WORDS = ["seamless", "seamlessly", "revolutionize", "revolutionary", "unlock", "leverage"] as const;

export type ComplianceViolation = {
  kind: "banned-word" | "needs-source";
  match: string;
  /** Path inside the stored content where the text was found. */
  path: string;
};

const FIGURE = /(?<![\w.])(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(?:%|×|x\b|\+|-fold\b)/gi;

function wordRe(words: readonly string[]): RegExp | null {
  const w = words.map((s) => s.trim().toLowerCase()).filter(Boolean).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return w.length ? new RegExp(`\\b(?:${w.join("|")})\\w*`, "gi") : null;
}

/** Check one string. */
export function lintText(
  text: string,
  path = "",
  extraBanned: readonly string[] = [],
  figures: FigureMatchOptions = {},
): ComplianceViolation[] {
  const out: ComplianceViolation[] = [];
  const re = wordRe([...GLOBAL_BANNED_WORDS, ...extraBanned]);
  if (re) for (const m of text.matchAll(re)) out.push({ kind: "banned-word", match: m[0], path });
  for (const m of text.matchAll(FIGURE)) {
    // Approved, sourced standard figures pass (same matcher as the generator).
    if (figureApproved(m[0].trim(), text, m.index ?? 0, figures)) continue;
    out.push({ kind: "needs-source", match: m[0].trim(), path });
  }
  return out;
}

/** Walk any stored JSON content and check every string in it. */
export function lintContent(
  value: unknown,
  extraBanned: readonly string[] = [],
  path = "",
  figures: FigureMatchOptions = {},
): ComplianceViolation[] {
  if (typeof value === "string") return lintText(value, path, extraBanned, figures);
  if (Array.isArray(value)) return value.flatMap((v, i) => lintContent(v, extraBanned, `${path}[${i}]`, figures));
  if (value && typeof value === "object") {
    // Sibling strings (a stat's label) give bare values like "90%" their noun.
    const context = Object.values(value as Record<string, unknown>).filter((v): v is string => typeof v === "string").join(" ");
    const inner = { ...figures, context };
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      // Skip private bookkeeping, ids, urls and colours — not reader-facing copy.
      k.startsWith("__") || /(^id$|Id$|url|Url|src|color|colour|hex)/.test(k) ? [] : lintContent(v, extraBanned, path ? `${path}.${k}` : k, typeof v === "string" ? inner : figures),
    );
  }
  return [];
}
