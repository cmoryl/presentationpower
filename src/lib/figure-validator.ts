// Server-side figure validator for generated copy (C1).
// A figure must appear in the grounding it was given (knowledge snippets or
// the brief's client facts). Anything else becomes "[figure needed]" — the
// generator may never invent a statistic.
// By default only strings the AI changed are checked. Deck generation passes
// `checkTemplate: true` so layout sample copy (sample stats, sample source
// lines) can't ride through into a client deck either.

const FIGURE = /(?<![\w.])(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(?:%|×|x\b|\+|-fold\b)/gi;
// Plain counts next to a countable noun ("28 markets", "1,200 documents").
const COUNT =
  /(?<![\w.$£€])(?:\d{1,3}(?:,\d{3})+|\d{2,}(?:\.\d+)?)(?=\s+(?:[a-z-]+\s+)?(?:markets?|countries|languages|locales|documents?|pages?|words?|clients?|customers?|users?|sites?|studies|trials?|projects?|teams?|offices?|employees|linguists|experts|hours|days|weeks|months|files|assets|titles|submissions)\b)/gi;
const SOURCE_KEY = /^(source|sources|citation|attribution|sourceLabel|sourceNote|footnote)$/i;
export const FIGURE_NEEDED = "[figure needed]";

const norm = (s: string) => s.toLowerCase().replace(/[\s,]/g, "").replace(/×/g, "x");

export interface FigureOptions {
  checkTemplate?: boolean;
}

export function validateFigures(
  next: unknown,
  before: unknown,
  sources: string,
  removed: string[] = [],
  opts: FigureOptions = {},
): unknown {
  const src = norm(sources);
  if (typeof next === "string") {
    if (next === before && !opts.checkTemplate) return next;
    const swap = (m: string) => {
      if (src.includes(norm(m))) return m;
      removed.push(m.trim());
      return FIGURE_NEEDED;
    };
    return next.replace(FIGURE, swap).replace(COUNT, swap);
  }
  if (Array.isArray(next)) {
    const b = Array.isArray(before) ? before : [];
    return next.map((v, i) => validateFigures(v, b[i], sources, removed, opts));
  }
  if (next && typeof next === "object") {
    const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(next as Record<string, unknown>).map(([k, v]) => {
        if (k.startsWith("__") || /(^id$|Id$|url|Url|src|color|colour|hex)/.test(k)) return [k, v];
        // Sample source lines from the layout ("Client rollout, 2024") are
        // cleared unless the grounding actually contains them.
        if (opts.checkTemplate && SOURCE_KEY.test(k) && typeof v === "string" && v.trim()) {
          if (v === b[k] && !src.includes(norm(v))) {
            removed.push(`source: ${v.trim()}`);
            return [k, ""];
          }
        }
        return [k, validateFigures(v, b[k], sources, removed, opts)];
      }),
    );
  }
  return next;
}
