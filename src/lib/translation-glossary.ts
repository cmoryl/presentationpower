// Isomorphic helpers for glossary-aware string protection and content walking.
// Server code and client-side previews both use these.

export type GlossaryTerm = {
  term: string;
  do_not_translate: boolean;
  translations?: Record<string, string>;
};

// Keys inside slide.content whose string values should NEVER be translated:
// ids, URLs, style tokens, layout keys, colors, class names.
const NON_TRANSLATABLE_KEYS = new Set<string>([
  "id",
  "layoutId",
  "variantId",
  "sectionId",
  "iconId",
  "brandModeId",
  "archetypeId",
  "clientLogoId",
  "mediaId",
  "presetId",
  "kitId",
  "url",
  "href",
  "src",
  "mediaUrl",
  "backgroundUrl",
  "imageUrl",
  "primaryUrl",
  "color",
  "bg",
  "background",
  "backgroundColor",
  "textColor",
  "accentColor",
  "hex",
  "palette",
  "swatch",
  "className",
  "class",
  "style",
  "font",
  "align",
  "alignment",
  "layout",
  "position",
  "size",
  "sizePreset",
  "dir",
  "locale",
  "lang",
  "language",
]);

function looksLikeUrl(s: string): boolean {
  return /^(https?:|data:|blob:|\/[a-z]|\/\/)/i.test(s.trim());
}
function looksLikeHexOrToken(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return true;
  if (/^[a-z0-9_-]{1,32}$/i.test(t) && !/\s/.test(t) && !/[a-z]{5,}/i.test(t)) return true;
  return false;
}
function hasLetters(s: string): boolean {
  return /\p{L}/u.test(s);
}

/** Returns true if this string is user-visible copy that should be translated. */
export function isTranslatableString(value: string, key?: string): boolean {
  if (key && NON_TRANSLATABLE_KEYS.has(key)) return false;
  if (key && key.startsWith("__")) return false;
  if (!value || value.length > 4000) return false;
  const t = value.trim();
  if (!t) return false;
  if (looksLikeUrl(t)) return false;
  if (looksLikeHexOrToken(t)) return false;
  if (!hasLetters(t)) return false; // pure numbers, punctuation, symbols
  return true;
}

/**
 * Walk any JSON structure and collect every translatable string with its
 * location path. Returns { strings, replace } where `replace(newValues)`
 * returns a new object with the strings swapped in place.
 */
export function extractStrings(input: unknown): {
  strings: string[];
  replace: (translated: string[]) => unknown;
} {
  const paths: Array<(string | number)[]> = [];
  const originals: string[] = [];

  function walk(node: unknown, path: (string | number)[], parentKey?: string) {
    if (typeof node === "string") {
      if (isTranslatableString(node, parentKey)) {
        paths.push([...path]);
        originals.push(node);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, [...path, i], parentKey));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (k.startsWith("__")) continue;
        walk(v, [...path, k], k);
      }
    }
  }
  walk(input, []);

  const replace = (translated: string[]): unknown => {
    const clone = JSON.parse(JSON.stringify(input));
    paths.forEach((p, idx) => {
      const translation = translated[idx];
      if (typeof translation !== "string") return;
      let cursor: any = clone;
      for (let i = 0; i < p.length - 1; i++) cursor = cursor[p[i]];
      cursor[p[p.length - 1]] = translation;
    });
    return clone;
  };

  return { strings: originals, replace };
}

/**
 * Wrap glossary hits in the source strings so the engine leaves them alone.
 * Uses <span translate="no">…</span> sentinels — supported by all major MT
 * engines and easy to strip on the way back.
 */
const OPEN = '<span translate="no">';
const CLOSE = "</span>";

export function protectStrings(sources: string[], glossary: GlossaryTerm[]): string[] {
  const dnt = glossary
    .filter((g) => g.do_not_translate && g.term.trim().length > 1)
    .map((g) => g.term.trim())
    .sort((a, b) => b.length - a.length); // longest first
  if (dnt.length === 0) return sources;

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b(${dnt.map(escape).join("|")})\\b`, "gi");

  return sources.map((s) => s.replace(pattern, (match) => `${OPEN}${match}${CLOSE}`));
}

/** Strip the protection sentinels after the engine returns. */
export function unprotectStrings(results: string[]): string[] {
  const pattern = new RegExp(`${OPEN}(.*?)${CLOSE}`, "gs");
  return results.map((s) => s.replace(pattern, "$1"));
}

/** Apply per-language glossary overrides after MT (e.g. term X should become Y in French). */
export function applyGlossaryOverrides(
  results: string[],
  glossary: GlossaryTerm[],
  targetLang: string,
): string[] {
  const overrides = glossary
    .map((g) => {
      const t = g.translations?.[targetLang];
      return t && g.term ? { from: g.term, to: t } : null;
    })
    .filter((x): x is { from: string; to: string } => !!x)
    .sort((a, b) => b.from.length - a.from.length);
  if (overrides.length === 0) return results;

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return results.map((s) => {
    let out = s;
    for (const { from, to } of overrides) {
      out = out.replace(new RegExp(`\\b${escape(from)}\\b`, "gi"), to);
    }
    return out;
  });
}

/** Simple stable hash of the source content for change detection. */
export function contentHash(input: unknown): string {
  const s = JSON.stringify(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
