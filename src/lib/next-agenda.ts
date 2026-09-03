// -----------------------------------------------------------------------------
// TransPerfect NEXT — division agenda asset.
//
// One approved agenda master, available for every NEXT division area. The
// artwork is built on the same live gradient grounds, division lockups and
// Geist typesetting as the pillar and badge masters — only the division lockup
// and the programme copy change, never the palette or the geometry.
//
// Every field is editable per division: eyebrow, day title, date / venue line,
// the session rows (time · title · detail · track tag), a footer line and an
// optional real scannable QR code. Layout metrics live here so the live preview
// and the layered press PDF resolve from exactly the same numbers.
// -----------------------------------------------------------------------------

import { LONDON_STYLES } from "@/lib/next-london-signage";
import { NEXT_DIVISIONS } from "@/lib/next-event";
import {
  CITY_BADGE_DIVISIONS,
  cityBadgeDivision,
  type CityBadgeDivision,
} from "@/lib/next-city-badge";

export const AGENDA_DIVISIONS: CityBadgeDivision[] = CITY_BADGE_DIVISIONS;
export const agendaDivision = cityBadgeDivision;

export const AGENDA_SPEC = {
  bleedEdge: 5,
  rasterPpi: 150,
  colorMode: "CMYK (offset + digital)",
  exportPreset: "PDF/X-4",
} as const;

/** Printed agenda formats. Boards hang in the concourse; handouts print in-house.
 *  Screen formats resolve the same artwork at exact pixel dimensions for holding
 *  screens, room panels, lobby verticals and social frames. */
export type AgendaSizeId =
  | "a4"
  | "a3"
  | "a2"
  | "a1"
  | "screen-16x9"
  | "screen-9x16"
  | "screen-1x1"
  | "screen-4x5"
  | "screen-ultrawide"
  | "custom";

/** Screen presets are authored in px and converted at 96 ppi CSS reference. */
export const PX_TO_MM = 25.4 / 96;

const screen = (id: AgendaSizeId, name: string, note: string, pxW: number, pxH: number) => ({
  id,
  name,
  note,
  medium: "screen" as const,
  pxW,
  pxH,
  trimW: Math.round(pxW * PX_TO_MM),
  trimH: Math.round(pxH * PX_TO_MM),
});

export const AGENDA_SIZES: {
  id: AgendaSizeId;
  name: string;
  note: string;
  trimW: number;
  trimH: number;
  medium?: "print" | "screen";
  pxW?: number;
  pxH?: number;
}[] = [
  {
    id: "a4",
    name: "A4 handout",
    note: "Desk / delegate-bag programme, digital print.",
    trimW: 210,
    trimH: 297,
    medium: "print",
  },
  {
    id: "a3",
    name: "A3 room card",
    note: "Breakout-room door and stage-wing card.",
    trimW: 297,
    trimH: 420,
    medium: "print",
  },
  {
    id: "a2",
    name: "A2 board",
    note: "Registration and concourse agenda board.",
    trimW: 420,
    trimH: 594,
    medium: "print",
  },
  {
    id: "a1",
    name: "A1 board",
    note: "Main entrance agenda board, reads at distance.",
    trimW: 594,
    trimH: 841,
    medium: "print",
  },
  screen(
    "screen-16x9",
    "Screen · 16:9 HD",
    "Holding screens, stage LED and room displays.",
    1920,
    1080,
  ),
  screen(
    "screen-9x16",
    "Screen · 9:16 vertical",
    "Lobby verticals, totems and story frames.",
    1080,
    1920,
  ),
  screen(
    "screen-1x1",
    "Screen · 1:1 square",
    "Social agenda tile and lift-lobby panels.",
    1080,
    1080,
  ),
  screen("screen-4x5", "Screen · 4:5 portrait", "In-feed social programme post.", 1080, 1350),
  screen(
    "screen-ultrawide",
    "Screen · 21:9 ultrawide",
    "Concourse ribbon and wide LED band.",
    2560,
    1080,
  ),
  {
    id: "custom",
    name: "Custom size",
    note: "Type the measured trim of the board.",
    trimW: 500,
    trimH: 700,
    medium: "print",
  },
];

export const AGENDA_CUSTOM_SIZE = {
  w: { min: 120, max: 1600, step: 5 },
  h: { min: 180, max: 2400, step: 5 },
};

export const AGENDA_QR_SIZE = { min: 20, max: 160, step: 2 };

export type AgendaFaceId = "dark" | "light";

export const AGENDA_FACES: { id: AgendaFaceId; name: string; note: string }[] = [
  {
    id: "dark",
    name: "Dark face",
    note: "The issued gradient ground at full saturation with white copy. Default for entrances and evening programmes.",
  },
  {
    id: "light",
    name: "Light face",
    note: "The same gradient tinted back toward blue-white with Blue 800 copy. For daylight concourses and print economy.",
  },
];

export function agendaFace(id: string | undefined) {
  return AGENDA_FACES.find((f) => f.id === id) ?? AGENDA_FACES[0]!;
}

export const AGENDA_STYLE_IDS = Object.keys(LONDON_STYLES);

export function agendaStyleLabel(styleId: string): string {
  return LONDON_STYLES[styleId]?.label ?? styleId;
}

const LIGHT_TINT = 0.72;
const LIGHT_BASE = [247, 249, 252] as const;

function tint(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `#${rgb
    .map((c, i) =>
      Math.round(c + (LIGHT_BASE[i]! - c) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

/** Approved division accent for the NEXT event programme, or null when the
 *  division has none (City Series keeps the standard gradient). */
export function agendaDivisionAccent(divisionId: string | undefined): string | null {
  return NEXT_DIVISIONS.find((d) => d.id === divisionId)?.accent ?? null;
}

/**
 * Gradient stops for an agenda ground. When the division carries an approved
 * accent, it replaces the terminal stop so the gradient resolves into the
 * division colour — every division agenda reads off the same master but lands
 * on its own accent. Light face tints the merged ramp toward blue-white.
 */
export function agendaStops(
  styleId: string,
  face: AgendaFaceId = "dark",
  divisionId?: string,
): string[] {
  const stops = LONDON_STYLES[styleId]?.stops ?? LONDON_STYLES["01-beam-violet-aqua"]!.stops;
  const accent = agendaDivisionAccent(divisionId);
  const merged = accent ? [...stops.slice(0, -1), accent] : [...stops];
  return face === "light" ? merged.map((s) => tint(s, LIGHT_TINT)) : merged;
}

/** Copy ink for a face. */
export function agendaInk(face: AgendaFaceId): string {
  return face === "light" ? "#03002C" : "#FFFFFF";
}

/** Approved ink options for the agenda headline. */
export const AGENDA_TEXT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "white", label: "White", hex: "#FFFFFF" },
  { id: "blue-800", label: "Blue 800", hex: "#03002C" },
  { id: "blue-white", label: "Blue White", hex: "#E0E8F5" },
  { id: "aqua", label: "Aqua", hex: "#A1FBF9" },
  { id: "lavender", label: "Lavender", hex: "#C2A3FF" },
  { id: "yellow", label: "Yellow", hex: "#FFEB66" },
];

// ── content ──────────────────────────────────────────────────────────────────

export type AgendaSession = {
  time: string;
  title: string;
  detail: string;
  /** Short track chip, e.g. MAIN STAGE. Empty = no chip. */
  track: string;
  /** Break / transition rows print in a quieter weight. */
  muted: boolean;
};

/** One programme day. Multi-day agendas hold an ordered list of these. */
export type AgendaDay = {
  /** Day title printed as the headline, e.g. "DAY ONE". */
  label: string;
  /** Date · venue line for that day. */
  meta: string;
  sessions: AgendaSession[];
};

export type AgendaConfig = {
  divisionId: string;
  face: AgendaFaceId;
  styleId: string;
  sizeId: AgendaSizeId;
  trimW: number;
  trimH: number;
  showLockup: boolean;
  /** Division lockup scale, 1 = the approved default width. */
  lockupScale: number;
  eyebrow: string;
  title: string;
  /** Date · venue line under the title. */
  meta: string;
  /** Headline ink. Empty = the face default. */
  titleColor: string;
  sessions: AgendaSession[];
  /** Footer line printed at the foot of the board. */
  footnote: string;
  /** Printed QR payload. Empty = no QR. */
  qrData: string;
  qrSize: number;
  qrCaption: string;
  /** Event this live agenda file belongs to (free-text label). */
  eventLabel: string;
  /**
   * Multi-day programme. When present it is authoritative; day one is mirrored
   * into `title` / `meta` / `sessions` so single-page consumers keep working.
   */
  days?: AgendaDay[];
  /** Rows per printed page. 0 / undefined = fill each page automatically. */
  rowsPerPage?: number;
  /** Derived page stamp, e.g. "DAY ONE · PAGE 2 OF 3". Set by `agendaPages`. */
  pageLabel?: string;
};

/**
 * Division-specific default programmes. Every NEXT area opens on its own
 * agenda copy, so an operator starts from a real programme for that track
 * rather than a blank grid.
 */
const DIVISION_PROGRAMMES: Record<
  string,
  { title: string; meta: string; sessions: AgendaSession[] }
> = {
  "city-series": {
    title: "DAY ONE",
    meta: "City Series · 2026 season",
    sessions: [
      {
        time: "08:30",
        title: "Registration & welcome coffee",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Opening keynote — the local-language decade",
        detail: "Sofia Alvarez, Chief Executive",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "City panel: content velocity in market",
        detail: "Regional leads roundtable",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "11:30",
        title: "Break & expo floor",
        detail: "Partner stands open",
        track: "",
        muted: true,
      },
      {
        time: "12:00",
        title: "Workshops — AI-assisted localization",
        detail: "Rooms 1–4, choose your track",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Client stories from the City Series",
        detail: "Three markets, three programmes",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing remarks & drinks reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  globallink: {
    title: "DAY ONE",
    meta: "GlobalLink NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & platform lab open",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — one platform, every channel",
        detail: "GlobalLink product leadership",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Connector clinic: CMS, PIM & commerce",
        detail: "Live integrations, bring a stack",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Automation blueprints for global teams",
        detail: "Workflow patterns that scale",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & partner expo", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Roadmap deep dive",
        detail: "What ships next, and why",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Ask the engineers",
        detail: "Open floor Q&A",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  finance: {
    title: "DAY ONE",
    meta: "Finance NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & breakfast briefing",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — regulated content at speed",
        detail: "Global banking & markets panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Disclosure, KID & prospectus workflows",
        detail: "Compliance-first localization",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Model governance & audit trails",
        detail: "Where AI is allowed, and where it is not",
        track: "LAB",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Client story: 27 markets, one review cycle",
        detail: "Tier-1 asset manager",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  games: {
    title: "DAY ONE",
    meta: "Games NEXT · agenda",
    sessions: [
      {
        time: "09:00",
        title: "Doors & arcade open",
        detail: "Play the localized builds",
        track: "",
        muted: true,
      },
      {
        time: "10:00",
        title: "Keynote — shipping worldwide day one",
        detail: "Studio leadership panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "11:00",
        title: "Voice, VO & lip-sync pipelines",
        detail: "From script lock to gold master",
        track: "STUDIO",
        muted: false,
      },
      { time: "12:00", title: "Break & arcade", detail: "", track: "", muted: true },
      {
        time: "12:30",
        title: "LQA at scale",
        detail: "Test plans, device farms, live ops",
        track: "LAB",
        muted: false,
      },
      { time: "13:30", title: "Lunch", detail: "Atrium", track: "", muted: true },
      {
        time: "14:30",
        title: "Live-ops content sprints",
        detail: "Weekly drops in 14 languages",
        track: "WORKSHOP",
        muted: false,
      },
      {
        time: "17:00",
        title: "Player-community showcase & drinks",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  legal: {
    title: "DAY ONE",
    meta: "Legal NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & CLE check-in",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — eDiscovery without borders",
        detail: "Litigation technology panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Multilingual review workflows",
        detail: "Trial Interactive walkthrough",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Privilege, redaction & data residency",
        detail: "Cross-border practicalities",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: arbitration in three languages",
        detail: "Counsel and project leads",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  "life-sci": {
    title: "DAY ONE",
    meta: "Life Sci NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & coffee",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — trials that read in every market",
        detail: "Clinical operations leadership",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "eCOA, ICF & patient-facing content",
        detail: "Linguistic validation in practice",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Regulatory submissions at pace",
        detail: "EMA, FDA and beyond",
        track: "LAB",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: 42-country study start-up",
        detail: "Sponsor and CRO view",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  experience: {
    title: "DAY ONE",
    meta: "Experience NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & experience walk-through",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — one brand, every market",
        detail: "Global CX leadership",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Journey localization clinic",
        detail: "Web, app and support in-market",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Personalisation without fragmentation",
        detail: "Governance for CX teams",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Client story: retail rollout in 19 markets",
        detail: "CX and content leads",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  learn: {
    title: "DAY ONE",
    meta: "Learn NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & course lab open",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — training the global workforce",
        detail: "Learning leadership panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "eLearning localization clinic",
        detail: "SCORM, video and assessment",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Voice, captions & accessibility",
        detail: "WCAG in every language",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: onboarding in 23 languages",
        detail: "Global enablement team",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  media: {
    title: "DAY ONE",
    meta: "Media NEXT · agenda",
    sessions: [
      {
        time: "09:00",
        title: "Doors & screening room open",
        detail: "Localized reels on rotation",
        track: "",
        muted: true,
      },
      {
        time: "10:00",
        title: "Keynote — global release, one calendar",
        detail: "Studio distribution panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "11:00",
        title: "Dubbing, subtitling & audio description",
        detail: "Pipelines end to end",
        track: "STUDIO",
        muted: false,
      },
      { time: "12:00", title: "Break & screening", detail: "", track: "", muted: true },
      {
        time: "12:30",
        title: "Synthetic voice, human oversight",
        detail: "Where the line sits",
        track: "LAB",
        muted: false,
      },
      { time: "13:30", title: "Lunch", detail: "Atrium", track: "", muted: true },
      {
        time: "14:30",
        title: "Metadata & discoverability",
        detail: "Getting found in every store",
        track: "WORKSHOP",
        muted: false,
      },
      {
        time: "17:00",
        title: "Premiere showcase & drinks",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  digital: {
    title: "DAY ONE",
    meta: "Digital NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & coffee",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — search, social and AI answers",
        detail: "Digital marketing leadership",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Multilingual SEO & LLM visibility clinic",
        detail: "Bring a domain, leave with a plan",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Paid media in 30 markets",
        detail: "Creative, copy and compliance",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: organic growth across EMEA",
        detail: "Brand and agency leads",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  dataforce: {
    title: "DAY ONE",
    meta: "Dataforce NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & data lab open",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — training data people can trust",
        detail: "AI data leadership panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Collection design for 100+ locales",
        detail: "Speech, text and image",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Annotation quality & human review",
        detail: "Guidelines that hold up",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: evaluation at model scale",
        detail: "Frontier-lab programme",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
};

const GENERIC_PROGRAMME = DIVISION_PROGRAMMES["city-series"]!;

export function agendaProgramme(divisionId: string | undefined) {
  const div = agendaDivision(divisionId);
  return DIVISION_PROGRAMMES[div.id] ?? GENERIC_PROGRAMME;
}

export function agendaDefault(divisionId = "city-series"): AgendaConfig {
  const div = agendaDivision(divisionId);
  const programme = agendaProgramme(div.id);
  return {
    divisionId: div.id,
    face: "dark",
    styleId: "01-beam-violet-aqua",
    sizeId: "a2",
    trimW: 420,
    trimH: 594,
    showLockup: true,
    lockupScale: 1,
    eyebrow: "AGENDA",
    title: programme.title,
    meta: programme.meta,
    titleColor: "",
    sessions: programme.sessions.map((s) => ({ ...s })),
    footnote: "Programme subject to change · full agenda and speaker bios online",
    qrData: "",
    qrSize: 48,
    qrCaption: "FULL AGENDA",
    eventLabel: "",
  };
}

/** Swap the division without losing copy the operator has already edited. */
export function withAgendaDivision(config: AgendaConfig, divisionId: string): AgendaConfig {
  const div = agendaDivision(divisionId);
  const fresh = agendaDefault(div.id);
  const untouched =
    JSON.stringify(config.sessions) === JSON.stringify(agendaProgramme(config.divisionId).sessions);
  const metaUntouched = config.meta === agendaProgramme(config.divisionId).meta;
  return {
    ...config,
    divisionId: div.id,
    sessions: untouched ? fresh.sessions : config.sessions,
    meta: metaUntouched ? fresh.meta : config.meta,
  };
}

export function agendaSizePreset(id: string | undefined) {
  return AGENDA_SIZES.find((s) => s.id === id) ?? AGENDA_SIZES[2]!;
}

/** Resolved sheet geometry in mm. Screen formats carry exact pixel dimensions
 *  and no bleed — nothing is trimmed on a display. */
export function agendaGeometry(config: { sizeId?: string; trimW?: number; trimH?: number }) {
  const preset = agendaSizePreset(config.sizeId);
  const custom = preset.id === "custom";
  const isScreen = preset.medium === "screen";
  const clampTo = (v: number | undefined, fb: number, r: { min: number; max: number }) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(r.max, Math.max(r.min, n)) : fb;
  };
  const trimW = custom ? clampTo(config.trimW, preset.trimW, AGENDA_CUSTOM_SIZE.w) : preset.trimW;
  const trimH = custom ? clampTo(config.trimH, preset.trimH, AGENDA_CUSTOM_SIZE.h) : preset.trimH;
  const bleedEdge = isScreen ? 0 : AGENDA_SPEC.bleedEdge;
  const safeInset = Math.max(10, Math.min(isScreen ? 34 : 30, trimW * (isScreen ? 0.05 : 0.07)));
  return {
    trimW,
    trimH,
    bleedEdge,
    bleedW: trimW + bleedEdge * 2,
    bleedH: trimH + bleedEdge * 2,
    safeInset,
    sizeName: preset.name,
    medium: (preset.medium ?? "print") as "print" | "screen",
    isScreen,
    pxW: preset.pxW ?? Math.round(trimW / PX_TO_MM),
    pxH: preset.pxH ?? Math.round(trimH / PX_TO_MM),
    colorMode: isScreen ? "sRGB (screen)" : AGENDA_SPEC.colorMode,
    exportPreset: isScreen ? "PNG (sRGB) + vector PDF" : AGENDA_SPEC.exportPreset,
  };
}

export function agendaQrSize(config: AgendaConfig): number {
  const raw = Number(config.qrSize);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 48;
  return Math.min(AGENDA_QR_SIZE.max, Math.max(AGENDA_QR_SIZE.min, value));
}

export const AGENDA_LOCKUP_SCALE = { min: 0.5, max: 1.6, step: 0.05 };

export function agendaLockupScale(config: AgendaConfig): number {
  const raw = Number(config.lockupScale);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return Math.min(AGENDA_LOCKUP_SCALE.max, Math.max(AGENDA_LOCKUP_SCALE.min, value));
}

export function agendaTitleInk(config: AgendaConfig): string {
  const hex = (config.titleColor || "").trim();
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : agendaInk(config.face ?? "dark");
}

/**
 * Type and row metrics in mm, derived from the sheet so an A4 handout and an A1
 * board hold the same proportions. Both the live sheet and the vector PDF read
 * these numbers, so the export always matches the preview.
 */
export function agendaLayout(config: AgendaConfig) {
  const geo = agendaGeometry(config);
  // A2 board is the reference sheet. Landscape and screen formats have far less
  // height per unit of width, so the scale reads off whichever edge is tighter —
  // that keeps a 16:9 holding screen legible instead of crushing the row list.
  const k = Math.min(geo.trimW / 420, geo.trimH / 594) * (geo.trimH < geo.trimW ? 1.35 : 1);
  const rows = config.sessions.length || 1;
  const contentW = geo.trimW - geo.safeInset * 2;
  const ratio = agendaDivision(config.divisionId).ratio || 1.7;
  // Cap the lockup against the sheet height so wide formats keep room for the
  // programme; portrait boards stay on the established 44% content width.
  const lockupW = Math.min(contentW * 0.44, geo.trimH * 0.2 * ratio) * agendaLockupScale(config);
  const lockupH = lockupW / ratio;

  const eyebrowSize = 5.4 * k;
  const titleSize = 22 * k;
  const metaSize = 6.4 * k;
  const footSize = 4.4 * k;
  const qrEdge = Math.min(agendaQrSize(config), contentW * 0.35);
  const headBlock =
    (config.showLockup ? lockupH + 9 * k : 0) +
    eyebrowSize * 2.4 +
    titleSize * 1.16 +
    metaSize * 2.1;
  const footBlock = (config.qrData.trim() ? qrEdge + footSize * 2.6 : 0) + footSize * 2.4;
  const listTop = geo.safeInset + headBlock;
  const listBottom = geo.trimH - geo.safeInset - footBlock;
  const listH = Math.max(20, listBottom - listTop);
  const rowH = listH / rows;
  const timeSize = Math.min(rowH * 0.3, 7.6 * k);
  const titleRowSize = Math.min(rowH * 0.34, 8.4 * k);
  const detailSize = Math.min(rowH * 0.24, 5.6 * k);
  const trackSize = Math.max(2.6, Math.min(rowH * 0.18, 4.2 * k));
  return {
    geo,
    k,
    contentW,
    lockupW,
    lockupH,
    eyebrowSize,
    titleSize,
    metaSize,
    footSize,
    qrEdge,
    listTop,
    listBottom,
    listH,
    rowH,
    timeSize,
    titleRowSize,
    detailSize,
    trackSize,
    /** Time column width, measured from the left safe edge. */
    timeColW: contentW * 0.17,
    /** Track chip column width on the right. */
    trackColW: contentW * 0.2,
  };
}

// ── naming + persistence ─────────────────────────────────────────────────────

export function agendaName(config: AgendaConfig): string {
  return `${agendaDivision(config.divisionId).name} — ${config.title || "Agenda"}`;
}

export function agendaSlug(config: AgendaConfig): string {
  return (
    `${agendaDivision(config.divisionId).id}-agenda-${config.title || "day"}-${config.sizeId}-${config.face}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "next-agenda"
  );
}

export function normalizeAgendaConfig(input: unknown): AgendaConfig {
  const raw = (input ?? {}) as Partial<AgendaConfig>;
  const base = agendaDefault(typeof raw.divisionId === "string" ? raw.divisionId : undefined);
  const str = (v: unknown, fb: string) => (typeof v === "string" ? v : fb);
  const num = (v: unknown, fb: number) => (Number.isFinite(Number(v)) ? Number(v) : fb);
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.slice(0, 60).map((s) => ({
        time: str((s as AgendaSession)?.time, ""),
        title: str((s as AgendaSession)?.title, ""),
        detail: str((s as AgendaSession)?.detail, ""),
        track: str((s as AgendaSession)?.track, ""),
        muted: Boolean((s as AgendaSession)?.muted),
      }))
    : base.sessions;
  return {
    ...base,
    divisionId: base.divisionId,
    face: raw.face === "light" ? "light" : "dark",
    styleId: AGENDA_STYLE_IDS.includes(String(raw.styleId)) ? String(raw.styleId) : base.styleId,
    sizeId: AGENDA_SIZES.some((s) => s.id === raw.sizeId)
      ? (raw.sizeId as AgendaSizeId)
      : base.sizeId,
    trimW: num(raw.trimW, base.trimW),
    trimH: num(raw.trimH, base.trimH),
    showLockup: raw.showLockup !== false,
    lockupScale: num(raw.lockupScale, 1),
    eyebrow: str(raw.eyebrow, base.eyebrow),
    title: str(raw.title, base.title),
    meta: str(raw.meta, base.meta),
    titleColor: str(raw.titleColor, ""),
    sessions: sessions.length ? sessions : base.sessions,
    footnote: str(raw.footnote, base.footnote),
    qrData: str(raw.qrData, ""),
    qrSize: num(raw.qrSize, base.qrSize),
    qrCaption: str(raw.qrCaption, base.qrCaption),
    eventLabel: str(raw.eventLabel, ""),
    days:
      Array.isArray(raw.days) && raw.days.length
        ? raw.days.slice(0, 14).map((d, i) => {
            const day = (d ?? {}) as Partial<AgendaDay>;
            const rows = Array.isArray(day.sessions)
              ? day.sessions.slice(0, 60).map((s) => ({
                  time: str((s as AgendaSession)?.time, ""),
                  title: str((s as AgendaSession)?.title, ""),
                  detail: str((s as AgendaSession)?.detail, ""),
                  track: str((s as AgendaSession)?.track, ""),
                  muted: Boolean((s as AgendaSession)?.muted),
                }))
              : [];
            return {
              label: str(day.label, `DAY ${i + 1}`),
              meta: str(day.meta, ""),
              sessions: rows,
            };
          })
        : undefined,
    rowsPerPage: Math.max(0, Math.min(40, Math.round(num(raw.rowsPerPage, 0)))),
  };
}

/** Saved live agenda file row as the UI consumes it. */
export type AgendaVersion = {
  id: string;
  name: string;
  event_label: string;
  division_id: string;
  notes: string;
  config: AgendaConfig;
  created_at: string;
  updated_at: string;
};

/**
 * Resolved block positions in mm from the TRIM top-left corner. The live sheet
 * and the layered press PDF both read these, so the export is a pixel-for-point
 * match of what the operator approved on screen.
 */
export function agendaBlocks(config: AgendaConfig) {
  const L = agendaLayout(config);
  const geo = L.geo;
  const x = geo.safeInset;
  const rowCount = Math.max(1, config.sessions.length);

  let y = geo.safeInset;
  const lockup = config.showLockup ? { x, y, w: L.lockupW, h: L.lockupH } : null;
  if (lockup) y += L.lockupH + 9 * L.k;
  const eyebrowY = y;
  y += L.eyebrowSize * 2.1;
  const titleY = y;
  y += L.titleSize * 1.14;
  const metaY = y;
  y += L.metaSize * 2.2;
  const rowsTop = y;

  const bottom = geo.trimH - geo.safeInset;
  const footY = bottom - L.footSize * 1.2;
  let listBottom = footY - L.footSize * 1.8;
  let qr: { x: number; y: number; edge: number; capY: number } | null = null;
  if ((config.qrData ?? "").trim()) {
    const capH = (config.qrCaption ?? "").trim() ? L.footSize * 2 : 0;
    const qrTop = footY - L.footSize * 1.8 - capH - L.qrEdge;
    qr = {
      x: geo.trimW - geo.safeInset - L.qrEdge,
      y: qrTop,
      edge: L.qrEdge,
      capY: qrTop + L.qrEdge + L.footSize * 0.7,
    };
    listBottom = qrTop - L.footSize * 1.4;
  }

  const rowH = Math.max(5, (listBottom - rowsTop) / rowCount);
  const rows = config.sessions.map((session, i) => ({
    session,
    y: rowsTop + i * rowH,
    h: rowH,
  }));

  return {
    layout: L,
    geo,
    x,
    contentW: L.contentW,
    lockup,
    eyebrowY,
    titleY,
    metaY,
    rowsTop,
    rowH,
    rows,
    listBottom,
    footY,
    qr,
  };
}

// ── multi-day + multi-page ───────────────────────────────────────────────────
//
// A live agenda file can hold several programme days, and each day can run over
// as many printed pages as it needs. `agendaPages` resolves the whole file into
// an ordered list of single-page boards — every one a plain `AgendaConfig`, so
// the live sheet, the layered press PDF and the Word export all read the same
// pages from the same geometry.

/** Smallest row band we will sign off for reading distance, in mm. */
export const AGENDA_MIN_ROW_MM = 10;

export const AGENDA_ROWS_PER_PAGE = { min: 3, max: 40 };

/** Every day in the file, always at least one. */
export function agendaDays(config: AgendaConfig): AgendaDay[] {
  const days = (config.days ?? []).filter(Boolean);
  if (days.length) return days;
  return [{ label: config.title ?? "", meta: config.meta ?? "", sessions: config.sessions ?? [] }];
}

/** Rows that hold the legible floor on one page of the chosen format. */
export function agendaCapacity(config: AgendaConfig): number {
  const probe = agendaBlocks({ ...config, sessions: config.sessions.slice(0, 1) });
  const band = Math.max(AGENDA_MIN_ROW_MM, probe.listBottom - probe.rowsTop);
  return Math.max(1, Math.floor(band / AGENDA_MIN_ROW_MM));
}

/** Rows placed on each page: the operator's setting, or an automatic fill. */
export function agendaRowsPerPage(config: AgendaConfig): number {
  const manual = Math.round(Number(config.rowsPerPage) || 0);
  if (manual >= AGENDA_ROWS_PER_PAGE.min) {
    return Math.min(AGENDA_ROWS_PER_PAGE.max, manual);
  }
  return agendaCapacity(config);
}

export type AgendaPage = {
  /** A single-page board, ready for the sheet or the export. */
  config: AgendaConfig;
  dayIndex: number;
  dayCount: number;
  dayLabel: string;
  /** Page number inside its day, 0-based. */
  pageInDay: number;
  pagesInDay: number;
  /** Page number across the whole file, 0-based. */
  index: number;
  total: number;
  label: string;
};

/** Resolve a live agenda file into its printed pages. */
export function agendaPages(config: AgendaConfig): AgendaPage[] {
  const days = agendaDays(config);
  const perPage = agendaRowsPerPage(config);
  const multiDay = days.length > 1;

  const chunks: {
    dayIndex: number;
    day: AgendaDay;
    rows: AgendaSession[];
    pageInDay: number;
    pagesInDay: number;
  }[] = [];
  days.forEach((day, dayIndex) => {
    const rows = day.sessions ?? [];
    const pagesInDay = Math.max(1, Math.ceil(rows.length / perPage));
    for (let p = 0; p < pagesInDay; p += 1) {
      chunks.push({
        dayIndex,
        day,
        rows: rows.slice(p * perPage, (p + 1) * perPage),
        pageInDay: p,
        pagesInDay,
      });
    }
  });

  const total = chunks.length;
  return chunks.map((chunk, index) => {
    const continued = chunk.pageInDay > 0;
    const dayLabel = chunk.day.label || `Day ${chunk.dayIndex + 1}`;
    const stamp =
      total === 1
        ? ""
        : [
            multiDay ? dayLabel.toUpperCase() : "",
            chunk.pagesInDay > 1 ? `PAGE ${chunk.pageInDay + 1} OF ${chunk.pagesInDay}` : "",
            !multiDay && chunk.pagesInDay === 1 ? `PAGE ${index + 1} OF ${total}` : "",
          ]
            .filter(Boolean)
            .join(" · ");
    return {
      config: {
        ...config,
        days: undefined,
        rowsPerPage: 0,
        title: continued ? `${dayLabel} (CONT.)` : dayLabel,
        meta: chunk.day.meta ?? "",
        sessions: chunk.rows,
        pageLabel: stamp,
      },
      dayIndex: chunk.dayIndex,
      dayCount: days.length,
      dayLabel,
      pageInDay: chunk.pageInDay,
      pagesInDay: chunk.pagesInDay,
      index,
      total,
      label: `${dayLabel}${chunk.pagesInDay > 1 ? ` · page ${chunk.pageInDay + 1}/${chunk.pagesInDay}` : ""}`,
    };
  });
}

/**
 * Write a patch into one day of the file, keeping day one mirrored onto the
 * top-level fields so single-day files and older consumers stay valid.
 */
export function writeAgendaDay(
  config: AgendaConfig,
  index: number,
  patch: Partial<AgendaDay>,
): AgendaConfig {
  const days = agendaDays(config).map((d, i) => (i === index ? { ...d, ...patch } : d));
  const first = days[0]!;
  return {
    ...config,
    days: days.length > 1 ? days : undefined,
    title: first.label,
    meta: first.meta,
    sessions: first.sessions,
  };
}

/** Add a programme day, seeded from the day it follows. */
export function addAgendaDay(config: AgendaConfig): AgendaConfig {
  const days = agendaDays(config);
  const last = days[days.length - 1]!;
  const next: AgendaDay = {
    label: `DAY ${["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"][days.length] ?? days.length + 1}`,
    meta: last.meta,
    sessions: [{ time: "09:00", title: "New session", detail: "", track: "", muted: false }],
  };
  const all = [...days, next];
  return {
    ...config,
    days: all,
    title: all[0]!.label,
    meta: all[0]!.meta,
    sessions: all[0]!.sessions,
  };
}

/** Remove a programme day. The file always keeps at least one. */
export function removeAgendaDay(config: AgendaConfig, index: number): AgendaConfig {
  const days = agendaDays(config).filter((_, i) => i !== index);
  if (!days.length) return config;
  const first = days[0]!;
  return {
    ...config,
    days: days.length > 1 ? days : undefined,
    title: first.label,
    meta: first.meta,
    sessions: first.sessions,
  };
}

/** Filename fragment for one page of a multi-page file. */
export function agendaPageSlug(page: AgendaPage): string {
  const base = agendaSlug(page.config);
  return page.total > 1 ? `${base}-p${String(page.index + 1).padStart(2, "0")}` : base;
}
