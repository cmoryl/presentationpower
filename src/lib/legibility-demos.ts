// Visual demos for brand-guide "Colour and legibility" notes.
// Every note gets a visual demonstration, not just text: do-notes show the
// correct pairing, don't-notes show the failing treatment. Colours are
// parsed from the note's own hex codes where present, so each guide's
// visuals use its own palette. Rendered by
// src/components/brand/LegibilityNoteVisual.tsx.

export type LegibilityDemo =
  | "text-on-ground" // do: ink text on light, white on blue
  | "accent-fill-not-text" // don't: accent colour as text; do: accent as fill
  | "white-on-blue-aa" // do: white on Blue 500 (AA) / Blue 800 (AAA)
  | "min-grey" // do: lightest permitted grey for small text
  | "not-colour-only" // don't: colour as the only signal
  | "contrast-ratio" // do: hold a stated contrast ratio
  | "print-100k"; // do: print body text in 100K black

const MATCHERS: [RegExp, LegibilityDemo][] = [
  [/100K|four-colou?r build/i, "print-100k"],
  [/lightest gre|dark gray #666/i, "min-grey"],
  [/clears? AAA?/i, "white-on-blue-aa"],
  [/never the only signal|carries a word|red\/green alone|add the word/i, "not-colour-only"],
  [
    /fail WCAG|never label text|fill only|fills, rules, bars|fill bars, cells|never sets text/i,
    "accent-fill-not-text",
  ],
  [/\d+(\.\d+)?:1 contrast|holds at least \d/i, "contrast-ratio"],
  [/blue 800|body and heading text|node labels|numerals and axis|consent copy/i, "text-on-ground"],
];

/** Map a note's text to a visual demo. Returns null when nothing matches —
 *  the card then renders text only. */
export function inferLegibilityDemo(note: string): LegibilityDemo | null {
  for (const [re, demo] of MATCHERS) if (re.test(note)) return demo;
  return null;
}

/** Pull every hex code out of a note, in order of appearance. */
export function extractHexes(note: string): string[] {
  const out: string[] = [];
  for (const m of note.matchAll(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g)) {
    let h = m[1].toUpperCase();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    out.push(`#${h}`);
  }
  return out;
}

/** Pull the first stated contrast ratio (e.g. "3:1", "4.5:1") from a note. */
export function extractRatio(note: string): string | null {
  const m = note.match(/(\d+(?:\.\d+)?):1/);
  return m ? `${m[1]}:1` : null;
}
