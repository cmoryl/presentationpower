/**
 * Starter module copy carries example figures and regulated-industry wording.
 * When that copy seeds a real brief, figures the brief never supplied are
 * replaced with a visible "add figure" placeholder (never invented numbers),
 * and regulated-market wording is neutralised for non-regulated industries.
 */
const REGULATED = /life ?sci|pharma|health|medical|legal|financ|bank|insur|government|public sector|clinical/i;
const FIGURE_KEYS = new Set(["value", "stat", "delta"]);
export const FIGURE_PLACEHOLDER = "—";

function neutralise(s: string): string {
  return s
    .replace(/\bin a regulated market\b/gi, "in every new market")
    .replace(/\bRegulated content volume\b/g, "Multilingual content volume")
    .replace(/\bRegulated markets\b/g, "New markets")
    .replace(/\bregulated markets\b/g, "new markets")
    .replace(/\bregulated segments\b/gi, "target segments")
    .replace(/\band audit exposure\b/gi, "and missed launch windows")
    .replace(/,? and in regulated markets, missed windows/gi, " and missed launch windows")
    .replace(/\bCompliance drag\b/g, "Review drag");
}

export function isRegulatedIndustry(industry?: string): boolean {
  return !!industry && REGULATED.test(industry);
}

export function sanitizeSeedForBrief<T>(content: T, industry?: string, briefText = ""): T {
  const regulated = isRegulatedIndustry(industry);
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === "string") {
      if (key && FIGURE_KEYS.has(key) && /\d/.test(v) && !briefText.includes(v)) {
        return key === "delta" ? "" : FIGURE_PLACEHOLDER;
      }
      return regulated ? v : neutralise(v);
    }
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x, k);
      if (typeof out.label === "string" && out.value === FIGURE_PLACEHOLDER) {
        out.label = `Add figure: ${out.label}`;
      }
      return out;
    }
    return v;
  };
  const res = walk(content) as Record<string, unknown>;
  if (res && typeof res === "object" && res.stat === FIGURE_PLACEHOLDER && typeof res.label === "string") {
    res.label = `Add figure: ${res.label}`;
  }
  return res as T;
}
