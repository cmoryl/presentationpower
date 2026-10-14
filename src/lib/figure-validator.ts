// Server-side figure validator for generated copy (C1).
// A figure the AI wrote must appear in the grounding it was given (knowledge
// snippets or the brief's client facts). Anything else becomes
// "[figure needed]" — the generator may never invent a statistic.
// Only strings the AI changed are checked; approved template text is left alone.

const FIGURE = /(?<![\w.])(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(?:%|×|x\b|\+|-fold\b)/gi;
export const FIGURE_NEEDED = "[figure needed]";

const norm = (s: string) => s.toLowerCase().replace(/[\s,]/g, "").replace(/×/g, "x");

export function validateFigures(
  next: unknown,
  before: unknown,
  sources: string,
  removed: string[] = [],
): unknown {
  const src = norm(sources);
  if (typeof next === "string") {
    if (next === before) return next;
    return next.replace(FIGURE, (m) => {
      if (src.includes(norm(m))) return m;
      removed.push(m.trim());
      return FIGURE_NEEDED;
    });
  }
  if (Array.isArray(next)) {
    const b = Array.isArray(before) ? before : [];
    return next.map((v, i) => validateFigures(v, b[i], sources, removed));
  }
  if (next && typeof next === "object") {
    const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(next as Record<string, unknown>).map(([k, v]) => [
        k,
        k.startsWith("__") || /(^id$|Id$|url|Url|src|color|colour|hex)/.test(k)
          ? v
          : validateFigures(v, b[k], sources, removed),
      ]),
    );
  }
  return next;
}
