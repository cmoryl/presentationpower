// Light, deterministic inference from a free-text brief sentence. Never guesses
// an industry the text doesn't mention — falls back to a neutral label.

const INDUSTRY_KEYWORDS: Array<[string, RegExp]> = [
  ["Retail & eCommerce", /\b(retail(er|ers)?|e-?commerce|shop(s|ping)?|store(s)?|consumer goods|cpg|fashion)\b/i],
  ["Life sciences", /\b(pharma\w*|biotech\w*|life sciences?|clinical|medical device|healthcare|hospital)\b/i],
  ["Legal", /\b(law firm|legal|litigation|ediscovery|e-discovery|attorneys?)\b/i],
  ["Financial services", /\b(bank(s|ing)?|financial|insurance|insurer|fintech|asset management)\b/i],
  ["Technology", /\b(software|saas|tech(nology)? company|cloud|platform)\b/i],
  ["Media & entertainment", /\b(media|studio|streaming|broadcast\w*|entertainment)\b/i],
  ["Gaming", /\b(gam(e|es|ing)|esports)\b/i],
  ["Travel & hospitality", /\b(travel|hotel(s)?|airline(s)?|hospitality|tourism)\b/i],
  ["Manufacturing", /\b(manufactur\w*|industrial|automotive)\b/i],
  ["Public sector", /\b(government|public sector|ministry|agency)\b/i],
  ["Energy", /\b(energy|oil|gas|utilit(y|ies)|renewable\w*)\b/i],
];

export const NEUTRAL_INDUSTRY = "Cross-industry";

export function inferIndustry(text: string, allowed: string[] = []): string | null {
  const t = text || "";
  for (const [label, re] of INDUSTRY_KEYWORDS) {
    if (!re.test(t)) continue;
    const match = allowed.find((a) => a.toLowerCase().split(/[\s&]+/)[0] === label.toLowerCase().split(/[\s&]+/)[0]);
    return match ?? label;
  }
  return null;
}

/**
 * Turns a conversational request ("Pitch for a mid-size retailer expanding into
 * 5 European markets, meeting their marketing director next week.") into a
 * headline-length objective ("Mid-size retailer expanding into 5 European markets").
 */
export function condenseObjective(raw: string, maxWords = 9): string {
  let s = (raw || "").split(/\s+—\s+/)[0].trim();
  s = s.replace(
    /^(please\s+)?((make|create|build|write|draft)\s+(me\s+)?)?(an?\s+)?(\w+[-\s])?(pitch|deck|presentation|proposal|story|overview|intro(duction)?)\s+(deck\s+)?(for|to|about|on)\s+/i,
    "",
  );
  s = s.replace(/^(an?|the)\s+/i, "");
  // Drop logistics clauses: meeting / call / next week / on Tuesday …
  s = s.split(/[,;]\s*|\s+(?=(meeting|call with|next (week|month)|on (mon|tue|wed|thu|fri)\w*day|tomorrow)\b)/i)[0] ?? s;
  s = s.replace(/[.!?\s]+$/, "").trim();
  const words = s.split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  s = words.slice(0, maxWords).join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Pitch for a mid-size retailer expanding…" → "Mid-size retailer". */
export function inferProspectLabel(raw: string): string {
  const m = raw.match(
    /\b(?:for|with|to)\s+(?:a|an|the)\s+([a-z][\w-]*(?:\s+[a-z][\w-]*){0,3}?)(?=\s+(?:expanding|that|who|which|looking|moving|entering|launching|in|into|with|to|about)\b|[,.;]|$)/i,
  );
  if (!m) return "";
  const s = m[1].trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
