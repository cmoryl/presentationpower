/**
 * Font mapping + fallback rules for PPTX export.
 *
 * PowerPoint resolves exactly one typeface name per run — it has no CSS-style
 * font stack. Every place the exporter emits text therefore has to collapse a
 * web font stack down to one *canonical* typeface, and the deck has to tell
 * PowerPoint what to do when that typeface is missing on the opening machine.
 *
 * Three layers work together:
 *  1. `mapFontFamily()` — collapses any CSS stack (or an imported deck's
 *     typeface name) to a canonical family from `CANONICAL_FONTS`.
 *  2. Font embedding (see `pptx-font-embed.ts`) — ships the brand faces inside
 *     the file, so the mapped family resolves on machines without Geist.
 *  3. `fallbackFor()` + the theme font scheme — when embedding is unavailable
 *     (PowerPoint on the web, Keynote, Google Slides), the substitute is a
 *     metric-similar face chosen by us instead of whatever the viewer picks,
 *     so line breaks stay put.
 */

/** Canonical families the exporter is allowed to emit. */
export const CANONICAL_FONTS = {
  sans: "Geist",
  mono: "Geist Mono",
  serif: "Georgia",
} as const;

export type CanonicalFont = (typeof CANONICAL_FONTS)[keyof typeof CANONICAL_FONTS];

/**
 * Ordered substitution chain per canonical family, widest availability last.
 * Arial/Helvetica are the safest grotesques on Windows/macOS respectively and
 * are close enough in metrics to Geist that measured line boxes still hold.
 */
export const FONT_FALLBACKS: Record<CanonicalFont, string[]> = {
  Geist: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
  "Geist Mono": ["Consolas", "Courier New", "monospace"],
  Georgia: ["Cambria", "Times New Roman", "serif"],
};

/** Panose + pitch metadata PowerPoint uses when it has to pick a substitute. */
export const FONT_PANOSE: Record<CanonicalFont, { panose: string; pitchFamily: number }> = {
  Geist: { panose: "020B0604020202020204", pitchFamily: 34 },
  "Geist Mono": { panose: "020B0609030504020204", pitchFamily: 49 },
  Georgia: { panose: "02040502050405020303", pitchFamily: 18 },
};

/**
 * Source-font aliases. Keys are lower-cased family names as they appear in CSS
 * or in an imported PPTX; values are the canonical family we map them onto.
 * Anything not listed falls through to the generic-category heuristics below,
 * so a source deck's "Calibri" becomes brand sans rather than surviving as an
 * unmapped face that PowerPoint would then substitute on its own.
 */
export const FONT_ALIASES: Record<string, CanonicalFont> = {
  // Brand + web stacks
  geist: "Geist",
  "geist sans": "Geist",
  "geist variable": "Geist",
  "geist mono": "Geist Mono",
  // Grotesques that map onto the brand sans
  inter: "Geist",
  arial: "Geist",
  helvetica: "Geist",
  "helvetica neue": "Geist",
  calibri: "Geist",
  "segoe ui": "Geist",
  roboto: "Geist",
  "open sans": "Geist",
  lato: "Geist",
  poppins: "Geist",
  montserrat: "Geist",
  "noto sans": "Geist",
  verdana: "Geist",
  tahoma: "Geist",
  "trebuchet ms": "Geist",
  "sf pro display": "Geist",
  "sf pro text": "Geist",
  // Monospace
  consolas: "Geist Mono",
  menlo: "Geist Mono",
  monaco: "Geist Mono",
  "courier new": "Geist Mono",
  courier: "Geist Mono",
  "jetbrains mono": "Geist Mono",
  "sf mono": "Geist Mono",
  "ibm plex mono": "Geist Mono",
  // Serifs keep a serif voice
  georgia: "Georgia",
  cambria: "Georgia",
  "times new roman": "Georgia",
  times: "Georgia",
  garamond: "Georgia",
  "eb garamond": "Georgia",
  palatino: "Georgia",
  "playfair display": "Georgia",
  merriweather: "Georgia",
};

const GENERIC_SANS = /^(sans-serif|system-ui|ui-sans-serif|-apple-system|blinkmacsystemfont)$/i;
const GENERIC_MONO = /^(monospace|ui-monospace)$/i;
const GENERIC_SERIF = /^(serif|ui-serif)$/i;

function cleanName(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s*(Variable|VF)$/i, "")
    .trim();
}

/**
 * Collapse a CSS font stack (or a single source typeface name) to the canonical
 * family the export should emit. Walks the stack so `"Whatever", Geist, Arial`
 * still lands on a family we recognise rather than the unknown first entry.
 */
export function mapFontFamily(stack: string | null | undefined): CanonicalFont {
  const parts = (stack ?? "")
    .split(",")
    .map(cleanName)
    .filter(Boolean);
  if (parts.length === 0) return CANONICAL_FONTS.sans;

  // Pass 1 — explicit alias anywhere in the stack.
  for (const part of parts) {
    const hit = FONT_ALIASES[part.toLowerCase()];
    if (hit) return hit;
  }
  // Pass 2 — family-name heuristics (covers unseen "* Mono"/"* Serif" faces).
  for (const part of parts) {
    if (/\bmono(space)?\b/i.test(part)) return CANONICAL_FONTS.mono;
    if (/\b(serif|slab|georgia|times)\b/i.test(part) && !/sans/i.test(part))
      return CANONICAL_FONTS.serif;
  }
  // Pass 3 — generic CSS keywords.
  for (const part of parts) {
    if (GENERIC_MONO.test(part)) return CANONICAL_FONTS.mono;
    if (GENERIC_SERIF.test(part)) return CANONICAL_FONTS.serif;
    if (GENERIC_SANS.test(part)) return CANONICAL_FONTS.sans;
  }
  // Unknown display face — brand sans keeps the deck consistent.
  return CANONICAL_FONTS.sans;
}

/** Ordered substitutes for a canonical family, best match first. */
export function fallbackFor(font: string): string[] {
  const canonical = (Object.values(CANONICAL_FONTS) as string[]).includes(font)
    ? (font as CanonicalFont)
    : mapFontFamily(font);
  return FONT_FALLBACKS[canonical] ?? FONT_FALLBACKS.Geist;
}

/** `Geist, Inter, Arial, sans-serif` — for raster/HTML measurement contexts. */
export function cssStackFor(font: string): string {
  const canonical = mapFontFamily(font);
  return [canonical, ...FONT_FALLBACKS[canonical]]
    .map((f) => (/\s/.test(f) && !/^(sans-serif|serif|monospace)$/.test(f) ? `"${f}"` : f))
    .join(", ");
}

// ---------------------------------------------------------------------------
// OOXML patching (pure string transforms, unit-testable without a zip)
// ---------------------------------------------------------------------------

function fontTag(tag: "a:latin" | "a:ea" | "a:cs", font: CanonicalFont): string {
  const meta = FONT_PANOSE[font];
  return `<${tag} typeface="${font}" panose="${meta.panose}" pitchFamily="${meta.pitchFamily}" charset="0"/>`;
}

/**
 * Force the theme's major (headings) and minor (body) font scheme onto the
 * brand sans. Without this, PowerPoint's "Reset" and any placeholder-inherited
 * run falls back to the template default (Calibri) instead of the deck font.
 */
export function patchThemeFontScheme(themeXml: string): string {
  const scheme =
    `<a:fontScheme name="TransPerfect">` +
    `<a:majorFont>${fontTag("a:latin", CANONICAL_FONTS.sans)}<a:ea typeface=""/><a:cs typeface=""/></a:majorFont>` +
    `<a:minorFont>${fontTag("a:latin", CANONICAL_FONTS.sans)}<a:ea typeface=""/><a:cs typeface=""/></a:minorFont>` +
    `</a:fontScheme>`;
  if (/<a:fontScheme[\s\S]*?<\/a:fontScheme>/.test(themeXml)) {
    return themeXml.replace(/<a:fontScheme[\s\S]*?<\/a:fontScheme>/, scheme);
  }
  // No scheme present — insert at the head of the theme elements.
  return themeXml.replace(/<a:themeElements>/, `<a:themeElements>${scheme}`);
}

/**
 * Rewrite any `typeface="..."` in a slide/master part through the alias table
 * so no unmapped source face survives into the exported deck.
 */
export function normalizeTypefacesInXml(xml: string): string {
  return xml.replace(/typeface="([^"]*)"/g, (whole, name: string) => {
    if (!name) return whole; // `typeface=""` means "inherit from theme" — keep.
    if (/^\+m[jn]-/.test(name)) return whole; // theme references (+mj-lt/+mn-lt)
    const mapped = mapFontFamily(name);
    return `typeface="${mapped}"`;
  });
}
