// Post-processor for agent chat replies: strips internal deck taxonomy from
// user-facing text (module codes like "MV-4"/"BENTO-5", section labels like
// "Cover"/"Challenge", and framework jargon) without touching normal prose.

/** Internal section/label names → plain-language wording. */
const LABEL_MAP: Record<string, string> = {
  cover: "opening slide",
  challenge: "the problem",
  solution: "our approach",
  proof: "results",
  proofpoints: "results",
  ask: "the request",
  close: "closing slide",
  closing: "closing slide",
  divider: "section break",
  agenda: "agenda",
  bento: "layout",
  flywheel: "process diagram",
  "program cycle": "process diagram",
};

/** Jargon phrases → plain wording. */
const PHRASE_MAP: Array<[RegExp, string]> = [
  [/\bsection frameworks?\b/gi, "deck structure"],
  [/\bnarrative archetypes?\b/gi, "story arc"],
  [/\bmodule variants?\b/gi, "slide layout"],
  [/\bvariant ids?\b/gi, "layout"],
  [/\bmodule ids?\b/gi, "layout"],
  [/\btaxonomy\b/gi, "structure"],
  [/\bbrand mode\b/gi, "brand style"],
];

// Codes like MV-12, MV12, BENTO-5, HERO-3, MV… / MV...
const CODE_RE = /\b[A-Z]{2,10}[-_ ]?(?:\d{1,3}[a-z]?|…|\.{3})\b/g;
// Same code wrapped in brackets/parens/backticks/quotes, with leading space.
const WRAPPED_CODE_RE =
  /\s*[([`"'“‘]\s*[A-Z]{2,10}[-_ ]?(?:\d{1,3}[a-z]?|…|\.{3})\s*[)\]`"'”’]/g;

const QUOTED_LABEL_RE = /[`"'“‘]\s*([A-Za-z][A-Za-z \-]{2,24}?)\s*[`"'”’]/g;

function plainLabel(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return LABEL_MAP[key] ?? null;
}

function tidy(text: string): string {
  return text
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/\(\s*,\s*/g, "(")
    .replace(/,\s*\)/g, ")")
    .replace(/[ \t]+$/gm, "");
}

/**
 * Removes internal module/taxonomy terms from an agent reply.
 * Safe to run on partial (streaming) text.
 */
export function sanitizeAgentReply(text: string): string {
  if (!text) return text;

  // Preserve fenced code blocks verbatim.
  const blocks: string[] = [];
  let out = text.replace(/```[\s\S]*?```/g, (m) => {
    blocks.push(m);
    return `\u0000${blocks.length - 1}\u0000`;
  });

  out = out.replace(WRAPPED_CODE_RE, "");
  out = out.replace(CODE_RE, "");

  for (const [re, replacement] of PHRASE_MAP) out = out.replace(re, replacement);

  // Quoted internal labels → plain wording (unquoted prose is left alone).
  out = out.replace(QUOTED_LABEL_RE, (match, inner: string) => {
    const plain = plainLabel(inner);
    return plain ?? match;
  });

  // "Cover slide" / "Challenge section" style label usage.
  out = out.replace(
    /\b(Cover|Challenge|Solution|Proof|Ask|Close|Closing|Divider)\s+(slide|section|module|layout)\b/g,
    (_m, label: string, noun: string) => {
      const plain = plainLabel(label);
      return plain ? plain : `${label} ${noun}`;
    },
  );

  out = tidy(out);

  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => blocks[Number(i)] ?? "");
}
