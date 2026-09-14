/**
 * Agenda copy legibility.
 *
 * Until now only the QR code was contrast-gated; the printed copy inks were a
 * free choice, so a picked ink could land unreadable on the light end of a
 * gradient ground. This module checks every printed text role against the
 * ground it actually sits on, worst stop first — a printed board has no hover
 * state and no zoom, so the worst stop is the one that decides the reprint.
 *
 * Floors follow WCAG's two bands: large display copy clears 3:1, everything
 * body-sized clears 4.5:1. Sizes are printed millimetres of cap height, and
 * ~7 mm cap is comfortably past the large-text threshold at reading distance.
 */
import {
  AGENDA_TEXT_COLORS,
  agendaGeometry,
  AGENDA_STYLE_IDS,
  agendaBlocks,
  agendaContrastRatio,
  agendaDefault,
  agendaInk,
  agendaStops,
  agendaTitleInk,
  type AgendaConfig,
  type AgendaFaceId,
} from "./next-agenda";
import { NEXT_DIVISIONS } from "./next-event";

/** Body-sized copy floor. */
export const AGENDA_COPY_MIN_CONTRAST = 4.5;
/** Display copy floor (headline, eyebrow, big time column). */
export const AGENDA_DISPLAY_MIN_CONTRAST = 3;
/** Printed cap height at or above which copy counts as display size. */
export const AGENDA_DISPLAY_MM = 7;

export type AgendaCopyRole =
  | "eyebrow"
  | "title"
  | "meta"
  | "rowTime"
  | "rowTitle"
  | "rowDetail"
  | "track"
  | "footnote";

export type AgendaCopyReadout = {
  role: AgendaCopyRole;
  label: string;
  /** Printed ink. */
  ink: string;
  /** Printed cap height in mm. */
  sizeMm: number;
  /** The gradient stop that gives the worst reading. */
  worstStop: string;
  ratio: number;
  floor: number;
  ok: boolean;
};

const LABELS: Record<AgendaCopyRole, string> = {
  eyebrow: "Eyebrow",
  title: "Headline",
  meta: "Date · venue line",
  rowTime: "Session time",
  rowTitle: "Session title",
  rowDetail: "Session detail",
  track: "Track chip",
  footnote: "Footer",
};

/** Worst contrast an ink reaches across the ground's stops. */
export function agendaWorstOnGround(
  ink: string,
  stops: string[],
): { ratio: number; stop: string } {
  let stop = stops[0] ?? "#003FC7";
  let ratio = Number.POSITIVE_INFINITY;
  for (const s of stops) {
    const r = agendaContrastRatio(ink, s);
    if (r >= ratio) continue;
    ratio = r;
    stop = s;
  }
  return { ratio: Number.isFinite(ratio) ? ratio : 1, stop };
}

/** Mix two hex colours, 0 = a, 1 = b. */
function mix(a: string, b: string, t: number): string {
  const rgb = (h: string) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = [ar! + (br! - ar!) * t, ag! + (bg! - ag!) * t, ab! + (bb! - ab!) * t];
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Colour of the ground at position t (0 = ramp start, 1 = ramp end). */
function rampAt(ramp: string[], t: number): string {
  if (ramp.length === 1) return ramp[0]!;
  const clamped = Math.min(1, Math.max(0, t));
  const span = 1 / (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(clamped / span));
  return mix(ramp[i]!, ramp[i + 1]!, (clamped - i * span) / span);
}

/**
 * Samples the ground only where a band of copy actually prints, rather than
 * across the whole sheet: a headline near the top of a vertical ramp never
 * meets the far stop, so judging it against that stop condemns a board that
 * reads perfectly. Radial grounds have no single axis, so they stay
 * conservative and sample the whole ramp.
 */
export function agendaGroundSampler(config: AgendaConfig) {
  const face: AgendaFaceId = config.face === "light" ? "light" : "dark";
  const stops = agendaStops(config.styleId, face, config.divisionId);
  const isHalo = config.styleId.includes("halo");
  const ramp = isHalo ? [...stops].reverse() : stops;
  const geo = agendaGeometry(config);
  const diagonal =
    config.styleId.includes("diagonal") ||
    config.styleId.includes("prism") ||
    config.styleId.includes("bloom");

  return (ink: string, yTopMm: number, yBottomMm: number) => {
    let t0: number;
    let t1: number;
    if (isHalo) {
      t0 = 0;
      t1 = 1;
    } else {
      const a = Math.min(1, Math.max(0, yTopMm / Math.max(1, geo.trimH)));
      const b = Math.min(1, Math.max(0, yBottomMm / Math.max(1, geo.trimH)));
      // A diagonal ramp also travels across the sheet, so a full-width band
      // spans roughly half the ramp on top of its vertical share.
      const pad = diagonal ? 0.5 : 0;
      t0 = Math.max(0, Math.min(a, b) - pad);
      t1 = Math.min(1, Math.max(a, b) + pad);
    }
    let ratio = Number.POSITIVE_INFINITY;
    let stop = rampAt(ramp, t0);
    const steps = 12;
    for (let i = 0; i <= steps; i += 1) {
      const colour = rampAt(ramp, t0 + ((t1 - t0) * i) / steps);
      const r = agendaContrastRatio(ink, colour);
      if (r >= ratio) continue;
      ratio = r;
      stop = colour;
    }
    return { ratio: Number.isFinite(ratio) ? ratio : 1, stop };
  };
}

function floorFor(sizeMm: number): number {
  return sizeMm >= AGENDA_DISPLAY_MM ? AGENDA_DISPLAY_MIN_CONTRAST : AGENDA_COPY_MIN_CONTRAST;
}

/**
 * Every printed text role on the board with the contrast it will actually be
 * read at. Same measured layout the exports use, so the readout matches print.
 */
export function agendaCopyReadouts(config: AgendaConfig): AgendaCopyReadout[] {
  const face: AgendaFaceId = config.face === "light" ? "light" : "dark";
  const ink = agendaCopyInk(config).hex;
  const titleInk = (config.titleColor || "").trim() ? agendaTitleInk(config) : ink;
  const blocks = agendaBlocks(config);
  const L = blocks.layout;
  const sample = agendaGroundSampler(config);
  const rowsTop = blocks.rowsTop;
  const rowsBottom = blocks.listBottom;

  const rows: { role: AgendaCopyRole; ink: string; sizeMm: number; top: number; bottom: number }[] =
    [
      {
        role: "eyebrow",
        ink,
        sizeMm: L.eyebrowSize,
        top: blocks.eyebrowY,
        bottom: blocks.eyebrowY + L.eyebrowSize,
      },
      {
        role: "title",
        ink: titleInk,
        sizeMm: L.titleSize,
        top: blocks.titleY,
        bottom: blocks.metaY,
      },
      { role: "meta", ink, sizeMm: L.metaSize, top: blocks.metaY, bottom: blocks.metaY + L.metaSize },
      { role: "rowTime", ink, sizeMm: L.timeSize, top: rowsTop, bottom: rowsBottom },
      { role: "rowTitle", ink, sizeMm: L.titleRowSize, top: rowsTop, bottom: rowsBottom },
      { role: "rowDetail", ink, sizeMm: L.detailSize, top: rowsTop, bottom: rowsBottom },
      { role: "track", ink, sizeMm: L.trackSize, top: rowsTop, bottom: rowsBottom },
      {
        role: "footnote",
        ink,
        sizeMm: L.footSize,
        top: blocks.footY,
        bottom: blocks.footY + L.footSize,
      },
    ];

  return rows.map((r) => {
    const worst = sample(r.ink, r.top, r.bottom);
    const floor = floorFor(r.sizeMm);
    return {
      role: r.role,
      label: LABELS[r.role],
      ink: r.ink.toUpperCase(),
      sizeMm: Math.round(r.sizeMm * 10) / 10,
      worstStop: worst.stop.toUpperCase(),
      ratio: Math.round(worst.ratio * 10) / 10,
      floor,
      ok: worst.ratio >= floor,
    };
  });
}

/** Only the roles that fail their floor — empty means the board is safe. */
export function agendaCopyWarnings(config: AgendaConfig): AgendaCopyReadout[] {
  return agendaCopyReadouts(config).filter((r) => !r.ok);
}

/** Board-level verdict for the editor. */
export function agendaCopyVerdict(config: AgendaConfig): {
  ok: boolean;
  worst: AgendaCopyReadout;
  failing: AgendaCopyReadout[];
} {
  const readouts = agendaCopyReadouts(config);
  const worst = readouts.reduce((a, b) => (b.ratio / b.floor < a.ratio / a.floor ? b : a));
  return { ok: readouts.every((r) => r.ok), worst, failing: readouts.filter((r) => !r.ok) };
}

export type AgendaInkOptionCheck = {
  hex: string;
  label: string;
  ratio: number;
  floor: number;
  ok: boolean;
  worstStop: string;
};

/**
 * The approved headline inks scored against the board's own ground, so the
 * editor can mark a choice that will not read before it is picked.
 */
export function agendaTitleInkOptions(config: AgendaConfig): AgendaInkOptionCheck[] {
  const face: AgendaFaceId = config.face === "light" ? "light" : "dark";
  const blocks = agendaBlocks(config);
  const sample = agendaGroundSampler(config);
  const floor = floorFor(blocks.layout.titleSize);
  return [
    { hex: agendaInk(face), label: `Face default (${face})` },
    ...AGENDA_TEXT_COLORS.map((c) => ({ hex: c.hex, label: c.label })),
  ].map((c) => {
    const worst = sample(c.hex, blocks.titleY, blocks.metaY);
    return {
      hex: c.hex.toUpperCase(),
      label: c.label,
      ratio: Math.round(worst.ratio * 10) / 10,
      floor,
      ok: worst.ratio >= floor,
      worstStop: worst.stop.toUpperCase(),
    };
  });
}

export type AgendaInkAuditRow = {
  styleId: string;
  face: AgendaFaceId;
  divisionId: string;
  ink: string;
  inkLabel: string;
  ratio: number;
  floor: number;
  ok: boolean;
  worstStop: string;
};

/**
 * Sweep of every ground the agenda editor can produce — style × face ×
 * division — against the face inks and the approved headline inks. This is the
 * A/B record: which ink/ground pairs read and which never should be offered.
 */
export function agendaInkAudit(): {
  rows: AgendaInkAuditRow[];
  failing: AgendaInkAuditRow[];
  faceInkFailures: AgendaInkAuditRow[];
} {
  const rows: AgendaInkAuditRow[] = [];
  const divisions = ["", ...NEXT_DIVISIONS.map((d) => d.id)];
  const faces: AgendaFaceId[] = ["dark", "light"];
  const base = agendaDefault();
  for (const styleId of AGENDA_STYLE_IDS) {
    for (const face of faces) {
      for (const divisionId of divisions) {
        const config: AgendaConfig = {
          ...base,
          styleId,
          face,
          divisionId: divisionId || base.divisionId,
          titleColor: "",
        };
        // Face ink drives every body-sized band, so the audit reads the real
        // bands rather than guessing a single worst case.
        for (const r of agendaCopyReadouts(config)) {
          rows.push({
            styleId,
            face,
            divisionId,
            ink: r.ink,
            inkLabel: `Face ink · ${r.label}`,
            ratio: r.ratio,
            floor: r.floor,
            ok: r.ok,
            worstStop: r.worstStop,
          });
        }
        for (const opt of agendaTitleInkOptions(config)) {
          rows.push({
            styleId,
            face,
            divisionId,
            ink: opt.hex,
            inkLabel: `Headline ink · ${opt.label}`,
            ratio: opt.ratio,
            floor: opt.floor,
            ok: opt.ok,
            worstStop: opt.worstStop,
          });
        }
      }
    }
  }
  return {
    rows,
    failing: rows.filter((r) => !r.ok),
    faceInkFailures: rows.filter((r) => !r.ok && r.inkLabel.startsWith("Face ink")),
  };
}

/**
 * The ink the board should actually print in.
 *
 * The face ink is kept whenever it reads, so an approved board looks exactly as
 * signed off. Only when the face ink fails its floor somewhere in the copy
 * region does this fall back to the approved ink that reads best — a legibility
 * guard, not a restyle. When nothing clears the floor the ground itself is the
 * problem: `ok` comes back false and the editor says so rather than shipping a
 * board no one can read.
 */
export function agendaCopyInk(config: AgendaConfig): {
  hex: string;
  /** True when the guard replaced the face ink. */
  auto: boolean;
  ratio: number;
  floor: number;
  ok: boolean;
} {
  const face: AgendaFaceId = config.face === "light" ? "light" : "dark";
  const faceInk = agendaInk(face);
  const blocks = agendaBlocks(config);
  const sample = agendaGroundSampler(config);
  const top = blocks.eyebrowY;
  const bottom = blocks.footY + blocks.layout.footSize;
  const floor = AGENDA_COPY_MIN_CONTRAST;

  const facing = sample(faceInk, top, bottom);
  if (facing.ratio >= floor) {
    return { hex: faceInk, auto: false, ratio: Math.round(facing.ratio * 10) / 10, floor, ok: true };
  }

  const candidates = [agendaInk(face === "light" ? "dark" : "light"), ...AGENDA_TEXT_COLORS.map((c) => c.hex)];
  let best = { hex: faceInk, ratio: facing.ratio };
  for (const hex of candidates) {
    const r = sample(hex, top, bottom).ratio;
    if (r <= best.ratio) continue;
    best = { hex: hex.toUpperCase(), ratio: r };
  }
  return {
    hex: best.hex.toUpperCase(),
    auto: best.hex.toUpperCase() !== faceInk.toUpperCase(),
    ratio: Math.round(best.ratio * 10) / 10,
    floor,
    ok: best.ratio >= floor,
  };
}
