// -----------------------------------------------------------------------------
// Event venue spec intake.
//
// A venue / location production team sends a spec sheet ("please supply artwork
// for the following signage") as an email table, a PDF extract, or a pasted
// list. This module turns that free text into a typed list of print specs the
// rendering pipeline can drive: real trim sizes in inches, bleed, safe area,
// quantity, substrate and notes.
//
// Everything here is deterministic and unit-tested-by-construction: no network,
// no AI. Named venue items ("retractable banner", "step & repeat") resolve from
// VENUE_PRESETS when the sheet omits dimensions, which is common.
// -----------------------------------------------------------------------------

export type SpecUnit = "in" | "mm" | "cm" | "m" | "ft" | "px" | "pt";

export type EventPrintSpec = {
  id: string;
  /** Human label as it appears on the venue sheet. */
  label: string;
  /** Trim width in inches. */
  widthIn: number;
  /** Trim height in inches. */
  heightIn: number;
  /** Bleed per edge in inches (0 when the venue asks for none). */
  bleedIn: number;
  /** Safe-area inset per edge in inches — copy stays inside this. */
  safeIn: number;
  quantity: number;
  /** Substrate / finishing note, e.g. "13oz vinyl", "3mm foamex". */
  substrate?: string;
  /** Anything else the sheet said about this item. */
  notes?: string;
  /** The raw source line, kept for auditability. */
  source: string;
  /** How the size was resolved. */
  origin: "parsed" | "preset" | "manual";
};

export type SpecParseIssue = {
  line: string;
  reason: string;
};

export type SpecParseResult = {
  specs: EventPrintSpec[];
  issues: SpecParseIssue[];
};

const UNIT_TO_IN: Record<SpecUnit, number> = {
  in: 1,
  mm: 1 / 25.4,
  cm: 1 / 2.54,
  m: 1000 / 25.4,
  ft: 12,
  px: 1 / 96,
  pt: 1 / 72,
};

/** Venue items that arrive by name only. Sizes are the industry standards. */
export const VENUE_PRESETS: Array<{
  match: RegExp;
  label: string;
  widthIn: number;
  heightIn: number;
  bleedIn: number;
  substrate?: string;
}> = [
  {
    match: /retractable|roll[- ]?up|pull[- ]?up banner/i,
    label: "Retractable banner",
    widthIn: 33.5,
    heightIn: 78.7,
    bleedIn: 0,
    substrate: "Polyester banner, cassette base",
  },
  {
    match: /step\s*(&|and)?\s*repeat|media wall|backdrop/i,
    label: "Step & repeat backdrop",
    widthIn: 96,
    heightIn: 96,
    bleedIn: 1,
    substrate: "Tension fabric on frame",
  },
  {
    match: /meter ?board|meterboard/i,
    label: "Meter board",
    widthIn: 39.4,
    heightIn: 78.7,
    bleedIn: 0.25,
    substrate: "3mm foamex",
  },
  {
    match: /foam ?(core|board|ex)|easel sign/i,
    label: "Foam board sign",
    widthIn: 24,
    heightIn: 36,
    bleedIn: 0.125,
    substrate: "5mm foam board",
  },
  {
    match: /a[- ]?frame|sidewalk sign/i,
    label: "A-frame insert",
    widthIn: 24,
    heightIn: 36,
    bleedIn: 0.125,
  },
  {
    match: /table ?(runner|throw|cloth)/i,
    label: "Table runner",
    widthIn: 30,
    heightIn: 72,
    bleedIn: 0.5,
    substrate: "Dye-sub fabric",
  },
  {
    match: /floor (decal|graphic|sticker)/i,
    label: "Floor decal",
    widthIn: 36,
    heightIn: 36,
    bleedIn: 0.25,
    substrate: "Anti-slip laminate vinyl",
  },
  {
    match: /window (cling|decal|graphic)/i,
    label: "Window graphic",
    widthIn: 48,
    heightIn: 24,
    bleedIn: 0.25,
  },
  {
    match: /badge/i,
    label: "Event badge",
    widthIn: 4.13,
    heightIn: 5.83,
    bleedIn: 0.125,
    substrate: "350gsm uncoated",
  },
  {
    match: /lanyard/i,
    label: "Lanyard card",
    widthIn: 3.375,
    heightIn: 2.125,
    bleedIn: 0.125,
  },
  {
    match: /(hanging )?banner|fascia/i,
    label: "Hanging banner",
    widthIn: 120,
    heightIn: 48,
    bleedIn: 1,
    substrate: "13oz matte vinyl, hem + grommets",
  },
  {
    match: /(directional|way ?finding) sign/i,
    label: "Wayfinding sign",
    widthIn: 18,
    heightIn: 24,
    bleedIn: 0.125,
  },
  {
    match: /(agenda|program) board/i,
    label: "Agenda board",
    widthIn: 36,
    heightIn: 48,
    bleedIn: 0.25,
  },
  {
    match: /led wall|video wall|digital screen|screen loop/i,
    label: "Digital screen",
    widthIn: 1920 / 96,
    heightIn: 1080 / 96,
    bleedIn: 0,
    substrate: "Screen — RGB, no bleed",
  },
];

const UNIT_WORDS: Record<string, SpecUnit> = {
  '"': "in",
  "”": "in",
  in: "in",
  ins: "in",
  inch: "in",
  inches: "in",
  mm: "mm",
  millimeter: "mm",
  millimetre: "mm",
  cm: "cm",
  centimeter: "cm",
  centimetre: "cm",
  m: "m",
  meter: "m",
  metre: "m",
  meters: "m",
  metres: "m",
  ft: "ft",
  foot: "ft",
  feet: "ft",
  "'": "ft",
  px: "px",
  pixel: "px",
  pixels: "px",
  pt: "pt",
};

function normalizeUnit(raw: string | undefined, fallback: SpecUnit): SpecUnit {
  if (!raw) return fallback;
  return UNIT_WORDS[raw.trim().toLowerCase()] ?? fallback;
}

/** `48 x 96 in`, `1189x841mm`, `3m × 2.25 m`, `8.5" x 11"`, `1920 x 1080 px`. */
const DIM_RE =
  /(\d+(?:[.,]\d+)?)\s*(mm|cm|m|in|ins|inch|inches|ft|feet|foot|px|pt|["”'])?\s*(?:x|×|by)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|in|ins|inch|inches|ft|feet|foot|px|pt|["”'])?/i;

const NUM = (s: string) => Number(s.replace(",", "."));

/** Any explicit measurement, used for bleed / safe-area phrases. */
function measurement(text: string, keyword: RegExp, fallbackUnit: SpecUnit): number | null {
  const re = new RegExp(
    `${keyword.source}[^\\d]{0,12}(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m|in|inch|inches|ft|px|pt|["”'])?`,
    "i",
  );
  const m = re.exec(text);
  if (!m) return null;
  const value = NUM(m[1]!);
  return value * UNIT_TO_IN[normalizeUnit(m[2], fallbackUnit)];
}

function quantityOf(text: string): number {
  const explicit =
    /(?:qty|quantity|qnty)\s*[:=]?\s*(\d{1,4})/i.exec(text) ??
    /\((\d{1,4})\s*(?:off|pcs|pieces|ea)\)/i.exec(text);
  if (explicit) return clampQty(Number(explicit[1]));

  // Bare "x6" shorthand. Skip the "1000 x 2000" case by requiring the match to
  // not be preceded by a number (that's a dimension pair, not a count).
  const shorthand = [...text.matchAll(/(\d+\s*)?[x×]\s?(\d{1,4})\b/gi)]
    .filter((m) => !m[1])
    .map((m) => Number(m[2]));
  const last = shorthand.at(-1);
  return last ? clampQty(last) : 1;
}

function clampQty(n: number): number {
  return Number.isFinite(n) && n > 0 && n <= 999 ? Math.round(n) : 1;
}

const SUBSTRATE_RE =
  /(\d+\s?oz[^,;|]*|vinyl[^,;|]*|foam ?(?:core|board|ex)[^,;|]*|fabric[^,;|]*|acrylic[^,;|]*|dibond[^,;|]*|correx[^,;|]*|mesh[^,;|]*|\d{2,4}\s?gsm[^,;|]*|tension fabric[^,;|]*|laminat\w+[^,;|]*)/i;

function labelOf(line: string): string {
  // Everything before the first dimension / separator is the item name.
  const cut = line.split(DIM_RE)[0] ?? line;
  const cleaned = cut
    .replace(/^[\s\-–—•*\d.)\]]+/, "")
    .replace(/[|:,;\-–—]\s*$/, "")
    .trim();
  return cleaned || "Signage item";
}


function slug(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "item"}-${index + 1}`;
}

/** Split a pasted sheet into candidate item lines (rows, bullets, semicolons). */
function toLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .flatMap((l) => (l.includes(";") && !DIM_RE.test(l.split(";")[0] ?? "") ? l.split(";") : [l]))
    .map((l) => l.replace(/\t/g, " | ").trim())
    .filter((l) => l.length > 2)
    .filter((l) => !/^(item|description|size|dimensions?|qty|quantity|notes?)\b/i.test(l));
}

export const DEFAULT_SAFE_FRACTION = 0.04;

/**
 * Parse a venue spec sheet. Lines with an explicit size win; otherwise a named
 * venue preset supplies the standard trim. Anything unrecognisable is reported
 * as an issue rather than silently dropped.
 */
export function parseEventSpecSheet(input: string): SpecParseResult {
  const specs: EventPrintSpec[] = [];
  const issues: SpecParseIssue[] = [];
  const lines = toLines(input ?? "");

  lines.forEach((line, i) => {
    const dim = DIM_RE.exec(line);
    const preset = VENUE_PRESETS.find((p) => p.match.test(line));

    let widthIn: number | null = null;
    let heightIn: number | null = null;
    let origin: EventPrintSpec["origin"] = "parsed";

    if (dim) {
      // A trailing unit applies to both numbers when the first omits it.
      const unit = normalizeUnit(dim[4] ?? dim[2], "in");
      const firstUnit = normalizeUnit(dim[2] ?? dim[4], unit);
      widthIn = NUM(dim[1]!) * UNIT_TO_IN[firstUnit];
      heightIn = NUM(dim[3]!) * UNIT_TO_IN[unit];
    } else if (preset) {
      widthIn = preset.widthIn;
      heightIn = preset.heightIn;
      origin = "preset";
    }

    if (!widthIn || !heightIn || widthIn <= 0 || heightIn <= 0) {
      issues.push({
        line,
        reason: dim ? "Dimensions could not be read" : "No size and no matching venue preset",
      });
      return;
    }
    // Sanity: nothing under a business card, nothing over a stadium wrap.
    if (Math.max(widthIn, heightIn) > 1200 || Math.min(widthIn, heightIn) < 0.75) {
      issues.push({ line, reason: "Size outside supported range (0.75in – 100ft)" });
      return;
    }

    const bleedIn =
      measurement(line, /bleed/, "in") ??
      (/no bleed|0 ?bleed|full ?bleed off/i.test(line) ? 0 : preset?.bleedIn ?? 0.125);
    const safeIn =
      measurement(line, /safe(?: ?area| ?zone| ?margin)?/, "in") ??
      Math.max(0.25, Math.min(widthIn, heightIn) * DEFAULT_SAFE_FRACTION);

    const substrate = SUBSTRATE_RE.exec(line)?.[1]?.trim() ?? preset?.substrate;
    const noteMatch = /(?:note[s]?|finishing)\s*[:=]\s*([^|]+)/i.exec(line)?.[1]?.trim();

    // Preset lines carry no dimensions, so the whole line survives labelOf —
    // drop the trailing count / substrate clause so the item reads cleanly.
    const label =
      origin === "preset"
        ? labelOf(
            line
              .replace(/[,;|]?\s*(?:qty|quantity|qnty)\s*[:=]?\s*\d{1,4}\b/i, "")
              .replace(/[,;|]?\s*[x×]\s?\d{1,4}\b\s*$/i, ""),
          ) || preset!.label
        : labelOf(line);

    specs.push({
      id: slug(label, i),
      label,
      widthIn: round2(widthIn),
      heightIn: round2(heightIn),
      bleedIn: round3(bleedIn),
      safeIn: round3(safeIn),
      quantity: quantityOf(line),
      ...(substrate ? { substrate } : {}),
      ...(noteMatch ? { notes: noteMatch } : {}),
      source: line,
      origin,
    });
  });

  return { specs, issues };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** A blank row for the manual editor. */
export function blankSpec(index: number): EventPrintSpec {
  return {
    id: `manual-${index + 1}`,
    label: "New signage item",
    widthIn: 24,
    heightIn: 36,
    bleedIn: 0.125,
    safeIn: 0.5,
    quantity: 1,
    source: "manual entry",
    origin: "manual",
  };
}

/** Pretty size string for UI + manifest, in both inches and mm. */
export function specSizeLabel(spec: EventPrintSpec): string {
  const mm = (v: number) => Math.round(v * 25.4);
  return `${spec.widthIn}" × ${spec.heightIn}" (${mm(spec.widthIn)} × ${mm(spec.heightIn)} mm)`;
}
