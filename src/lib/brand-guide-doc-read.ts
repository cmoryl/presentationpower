// Reads a real brand document (brand book, palette sheet, style guide) and pulls
// out the facts a guide page needs: colour swatches, typeface names and glossary
// terms.
//
// Deliberately deterministic — every value returned must appear literally in the
// document text, so a guide never picks up an invented colour or term. Anything
// ambiguous is left out rather than guessed, and nothing is saved automatically:
// the editor shows what was found and a brand lead applies it.

import { isBrandHex } from "@/lib/brand-guide-edits";
import type { ColorSwatch } from "@/lib/brand-guides";

export type ColorGroupKey = "primaryColors" | "secondaryColors" | "tertiaryColors" | "neutrals";

export type ReadSwatch = ColorSwatch & { group: ColorGroupKey };

export type ReadTerm = {
  term: string;
  doNotTranslate: boolean;
  note?: string;
};

export type BrandDocRead = {
  swatches: ReadSwatch[];
  typefacePrimary?: string;
  typefaceWeb?: string;
  terms: ReadTerm[];
};

const HEX_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
const PANTONE_RE = /PANTONE\s+[0-9A-Za-z][0-9A-Za-z\s-]{0,18}?(?:\s?C|\s?U)?\b/i;
const CMYK_RE = /\bC\s?:?\s?\d{1,3}[\s,/]+M\s?:?\s?\d{1,3}[\s,/]+Y\s?:?\s?\d{1,3}[\s,/]+K\s?:?\s?\d{1,3}\b/i;
const RGB_RE = /\bR\s?:?\s?\d{1,3}[\s,/]+G\s?:?\s?\d{1,3}[\s,/]+B\s?:?\s?\d{1,3}\b/i;

/** Strips markdown/table decoration so a label reads like a name. */
function cleanLabel(raw: string): string {
  return raw
    .replace(HEX_RE, " ")
    .replace(PANTONE_RE, " ")
    .replace(CMYK_RE, " ")
    .replace(RGB_RE, " ")
    .replace(/[|*_#>`]/g, " ")
    .replace(/\((?:\s*)\)/g, " ")
    .replace(/[-–—:•·]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeName(value: string): boolean {
  if (value.length < 2 || value.length > 48) return false;
  if (!/\p{L}/u.test(value)) return false;
  // Reject leftovers like "hex", "colour", numbers-only fragments.
  return !/^(hex|hex code|colour|color|code|value|swatch)$/i.test(value);
}

function groupFromHeading(line: string, current: ColorGroupKey): ColorGroupKey {
  const l = line.toLowerCase();
  if (/\b(neutral|grey|gray|mono)\b/.test(l)) return "neutrals";
  if (/\b(tertiary|accent pop|pops?)\b/.test(l)) return "tertiaryColors";
  if (/\bsecondary\b/.test(l)) return "secondaryColors";
  if (/\b(primary|core|principal|master)\b/.test(l)) return "primaryColors";
  return current;
}

function firstMatch(line: string, re: RegExp): string | undefined {
  const m = line.match(re);
  return m ? m[0].replace(/\s{2,}/g, " ").trim() : undefined;
}

function typefaceFrom(line: string): { key: "primary" | "web"; value: string } | null {
  const m = line.match(
    /^[\s|*>-]*(primary (?:typeface|font)|headline (?:typeface|font)|typeface|typography|font family|web (?:typeface|font)|screen (?:typeface|font)|body (?:typeface|font))\b[\s:|–—-]*(.+)$/i,
  );
  if (!m) return null;
  const label = m[1]!.toLowerCase();
  const value = cleanLabel(m[2]!).replace(/\.$/, "").trim();
  if (!value || value.length > 80 || !/\p{L}/u.test(value)) return null;
  const key = /\b(web|screen|body)\b/.test(label) ? "web" : "primary";
  return { key, value };
}

const DNT_HEADING = /\b(never translate|do not translate|dnt|non[- ]translatable)\b/i;
const GLOSSARY_HEADING = /\b(glossary|terminology|approved terms|term list|naming)\b/i;

function bulletTerm(line: string): string | null {
  const m = line.match(/^[\s>]*(?:[-*•·–]|\d+[.)])\s+(.{2,80})$/);
  if (!m) return null;
  const raw = m[1]!;
  const [head, ...rest] = raw.split(/\s[–—-]\s|:\s/);
  const term = cleanLabel(head ?? "");
  if (!looksLikeName(term)) return null;
  const note = rest.join(" ").trim();
  return note ? `${term}\u0000${note}` : term;
}

/**
 * Parses extracted document text. `text` is the plain-text/markdown extraction
 * of the uploaded file (see `agent/doc-intake`).
 */
export function readBrandDocument(text: string): BrandDocRead {
  const lines = text.split(/\r?\n/);
  const swatches: ReadSwatch[] = [];
  const seenHex = new Set<string>();
  const terms: ReadTerm[] = [];
  const seenTerm = new Set<string>();
  let group: ColorGroupKey = "primaryColors";
  let typefacePrimary: string | undefined;
  let typefaceWeb: string | undefined;
  /** Terms are only collected while inside a glossary/never-translate section. */
  let termMode: "none" | "dnt" | "glossary" = "none";

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const hexes = trimmed.match(HEX_RE);

    // Section tracking. A heading-ish line with no colour on it changes context.
    if (!hexes) {
      const isHeading =
        /^[\s>]*#{1,6}\s/.test(line) ||
        /^[A-Z0-9 &/'()-]{3,60}$/.test(trimmed) ||
        /:\s*$/.test(trimmed) ||
        trimmed.length <= 60;
      if (isHeading) {
        group = groupFromHeading(trimmed, group);
        if (DNT_HEADING.test(trimmed)) termMode = "dnt";
        else if (GLOSSARY_HEADING.test(trimmed)) termMode = "glossary";
        else if (/^[\s>]*#{1,6}\s/.test(line)) termMode = "none";
      }

      const face = typefaceFrom(trimmed);
      if (face) {
        if (face.key === "primary" && !typefacePrimary) typefacePrimary = face.value;
        if (face.key === "web" && !typefaceWeb) typefaceWeb = face.value;
      }

      if (termMode !== "none") {
        const bullet = bulletTerm(line);
        if (bullet) {
          const [term, note] = bullet.split("\u0000");
          const keyed = term!.toLowerCase();
          if (!seenTerm.has(keyed)) {
            seenTerm.add(keyed);
            terms.push({
              term: term!,
              doNotTranslate: termMode === "dnt" || DNT_HEADING.test(note ?? ""),
              ...(note ? { note } : {}),
            });
          }
        }
      }
      return;
    }

    // A line carrying colours also carries its own group words often
    // ("Primary Blue 500 #003FC7"), so re-read the group from the line itself.
    const lineGroup = groupFromHeading(trimmed, group);

    for (const hex of hexes) {
      if (!isBrandHex(hex)) continue;
      const upper = hex.toUpperCase();
      if (seenHex.has(upper)) continue;
      seenHex.add(upper);

      const before = trimmed.slice(0, trimmed.indexOf(hex));
      let name = cleanLabel(before);
      if (!looksLikeName(name)) name = cleanLabel(trimmed.replace(hex, " "));
      if (!looksLikeName(name)) {
        // Fall back to the nearest preceding non-empty, colour-free line.
        for (let i = index - 1; i >= 0 && i > index - 4; i--) {
          const prev = lines[i]!.trim();
          if (!prev || HEX_RE.test(prev)) continue;
          const candidate = cleanLabel(prev);
          if (looksLikeName(candidate)) {
            name = candidate;
            break;
          }
        }
      }
      if (!looksLikeName(name)) continue; // unnamed colour is not a swatch

      const pantone = firstMatch(trimmed, PANTONE_RE);
      const cmyk = firstMatch(trimmed, CMYK_RE);
      const rgb = firstMatch(trimmed, RGB_RE);
      swatches.push({
        name,
        hex: upper,
        group: lineGroup,
        ...(pantone ? { pantone } : {}),
        ...(cmyk ? { cmyk } : {}),
        ...(rgb ? { rgb } : {}),
      });
    }
  });

  return {
    swatches,
    ...(typefacePrimary ? { typefacePrimary } : {}),
    ...(typefaceWeb ? { typefaceWeb } : {}),
    terms,
  };
}

export const COLOR_GROUP_LABEL: Record<ColorGroupKey, string> = {
  primaryColors: "Primary",
  secondaryColors: "Secondary",
  tertiaryColors: "Tertiary",
  neutrals: "Neutrals",
};

/** Plain-language summary of what the file produced. */
export function describeBrandDocRead(read: BrandDocRead): string {
  const bits: string[] = [];
  if (read.swatches.length)
    bits.push(`${read.swatches.length} colour${read.swatches.length > 1 ? "s" : ""}`);
  if (read.typefacePrimary || read.typefaceWeb) bits.push("typefaces");
  if (read.terms.length) bits.push(`${read.terms.length} term${read.terms.length > 1 ? "s" : ""}`);
  if (!bits.length) return "Nothing usable was found in this file.";
  return `Found ${bits.join(", ")} in this file.`;
}
