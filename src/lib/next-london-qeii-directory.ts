// -----------------------------------------------------------------------------
// "Find your way" — the front page of the London QEII map set.
//
// The copy is the issued Canva sheet (design DAHV2tkeXlk, page 1) word for word:
// every floor, the rooms on it and what each room holds. Nothing is added and no
// room is renamed here; where the sheet gives a room a plain description rather
// than a NEXT track, that description is printed exactly as issued.
//
// It is rebuilt in the house look rather than copied: the ground is an approved
// token, the type is Geist, and each division's approved lockup is placed where
// the sheet names a NEXT track. A track with no published lockup prints as the
// issued wording instead of a substituted mark.
// -----------------------------------------------------------------------------

import { NEXT_EVENT } from "@/lib/next-event";
import { LONDON_VENUE } from "@/lib/next-london-signage";
import { spaceUseMarkFor, type SpaceUseMark } from "@/lib/next-london-space-use";
import {
  qeiiGroundInk,
  qeiiPlanGround,
  qeiiLuminance,
  type QeiiPlanFace,
} from "@/lib/next-london-qeii-style";
import { qeiiMarkUrl, type QeiiMarkVariant } from "@/lib/next-london-qeii-plan";
import {
  LONDON_PACK_GROUNDS,
  londonPackGroundHexes,
} from "@/lib/next-london-pack-grounds";

/**
 * Backgrounds this page can sit on: the flat template ground of the chosen look,
 * or one of the measured event gradient grounds from the supplied signage pack —
 * the same ink ramps the printed signs carry, drawn as a live gradient. No new
 * ramp is invented here.
 */
export const QEII_DIRECTORY_GROUNDS: { id: string; label: string; note: string }[] = [
  {
    id: "token",
    label: "Template ground",
    note: "Flat approved token ground of the selected look.",
  },
  ...LONDON_PACK_GROUNDS.map((g) => ({ id: g.id, label: g.label, note: g.note })),
];

export function qeiiDirectoryGroundHexes(groundId: string): string[] {
  return groundId === "token" ? [] : londonPackGroundHexes(groundId);
}



export type QeiiDirectoryRow = {
  /** Room name exactly as the sheet prints it. */
  room: string;
  /** What the room holds, exactly as the sheet prints it. */
  holds: string;
  /** Division whose approved lockup stands in for the track wording. */
  divisionId?: string;
};

export type QeiiDirectoryFloor = {
  /** Floor heading as printed. */
  floor: string;
  rows: QeiiDirectoryRow[];
};

/** The issued directory, top floor first, exactly as the sheet sets it out. */
export const QEII_DIRECTORY: QeiiDirectoryFloor[] = [
  {
    floor: "6th Floor",
    rows: [{ room: "MOUNTBATTEN", holds: "LifeSciNEXT", divisionId: "life-sci" }],
  },
  {
    floor: "5th Floor",
    rows: [
      { room: "WINDSOR", holds: "OpTImize" },
      { room: "CAMBRIDGE", holds: "LifeSciNEXT & OpTImize Mealspace & Exhibition Hall" },
    ],
  },
  {
    floor: "4th Floor",
    rows: [
      { room: "ST. JAMES", holds: "LearnNEXT", divisionId: "learn" },
      { room: "WESTMINSTER", holds: "GamesNEXT", divisionId: "games" },
      { room: "WORDSWORTH", holds: "DataForceNEXT", divisionId: "dataforce" },
    ],
  },
  {
    floor: "3rd Floor",
    rows: [
      { room: "FLEMING", holds: "GlobalLinkNEXT", divisionId: "globallink" },
      { room: "WHITTLE", holds: "LegalNEXT", divisionId: "legal" },
      { room: "BRITTEN", holds: "Mealspace & Exhibition Hall" },
    ],
  },
  {
    floor: "2nd Floor",
    rows: [
      { room: "OLIVIER & BURTON", holds: "MediaNEXT", divisionId: "media" },
      { room: "GIELGUD", holds: "DigitalNEXT", divisionId: "digital" },
      { room: "ALBERT", holds: "ExperienceNEXT", divisionId: "experience" },
      { room: "VICTORIA", holds: "FinanceNEXT", divisionId: "finance" },
    ],
  },
  {
    floor: "Ground Floor",
    rows: [
      { room: "BRUNEL", holds: "Registration" },
      { room: "CHURCHILL", holds: "GlobalLink Innovation Lounge & NEXTMart" },
      { room: "LOBBY CAFE", holds: "NEXTBrew" },
    ],
  },
];

/** Where this page comes from, printed on the sheet so it can be checked. */
export const QEII_DIRECTORY_SOURCE =
  "Copy as issued — Canva design DAHV2tkeXlk, page 1 (venue map).";

export const QEII_DIRECTORY_PAGE = { w: 794, h: 1123 } as const;

/** The approved lockup for a row, or undefined when none is published. */
export function qeiiDirectoryMark(row: QeiiDirectoryRow): SpaceUseMark | undefined {
  return row.divisionId ? spaceUseMarkFor(row.divisionId) : undefined;
}

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export type QeiiDirectoryOptions = {
  face?: QeiiPlanFace;
  /** Which approved lockup file the division marks use. */
  markVariant?: QeiiMarkVariant;
  /** Print the approved lockups; false prints the issued track wording instead. */
  showMarks?: boolean;
  /** "token" (flat look ground) or a measured event gradient ground id. */
  groundId?: string;
};

/**
 * The directory as a standalone A4 portrait SVG: live type, approved lockups
 * linked by their own URL, and an approved token ground — the same artwork the
 * page shows and the exports carry.
 */
export function qeiiDirectorySvg(options: QeiiDirectoryOptions = {}): string {
  const face = options.face ?? "studio";
  const showMarks = options.showMarks ?? true;
  const { w, h } = QEII_DIRECTORY_PAGE;
  const groundId = options.groundId ?? "token";
  const ramp = qeiiDirectoryGroundHexes(groundId);
  const ground = qeiiPlanGround(face);
  // A gradient ground is judged on its darkest stop, so the type and lockups are
  // legible across the whole run rather than only at the pale end.
  const deepest = ramp.length
    ? ramp.reduce((a, b) => (qeiiLuminance(b) < qeiiLuminance(a) ? b : a))
    : ground;
  const dark = qeiiLuminance(ramp.length ? deepest : ground) <= 0.55;
  const ink = ramp.length ? (dark ? "#FFFFFF" : "#03002C") : qeiiGroundInk(face);
  // A reversed ground takes the all-white lockup; a light one takes the colour
  // file, so no lockup is ever printed into a ground it cannot be read on.
  const variant: QeiiMarkVariant = options.markVariant ?? (dark ? "white" : "colour");
  const rule = dark ? "#A1FBF9" : "#003FC7";
  const gradientId = "qeii-directory-ground";
  const groundPaint = ramp.length ? `url(#${gradientId})` : ground;
  const defs = ramp.length
    ? `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">${ramp
        .map(
          (hex, i) =>
            `<stop offset="${((i / (ramp.length - 1)) * 100).toFixed(2)}%" stop-color="${hex}"/>`,
        )
        .join("")}</linearGradient></defs>`
    : "";


  const marginX = 64;
  const colGap = 46;
  const nameRight = 300;
  const holdsLeft = nameRight + colGap;
  const font = "Geist, Geist Variable, sans-serif";
  const text = (
    x: number,
    y: number,
    body: string,
    size: number,
    weight = 600,
    anchor: "start" | "end" | "middle" = "start",
    fill = ink,
    opacity = 1,
  ) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-weight="${weight}" font-size="${size}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ""}>${esc(body)}</text>`;

  const head = [
    text(marginX, 108, "FIND YOUR WAY", 42, 700),
    text(marginX, 138, LONDON_VENUE.venue, 13, 600, "start", ink, 0.72),
    text(
      marginX,
      158,
      `${NEXT_EVENT.name} · ${NEXT_EVENT.datesLabel}`,
      11.5,
      600,
      "start",
      ink,
      0.55,
    ),
    `<rect x="${marginX}" y="176" width="${w - marginX * 2}" height="2" fill="${rule}"/>`,
  ].join("");

  let y = 224;
  const body: string[] = [];
  for (const floor of QEII_DIRECTORY) {
    body.push(text(nameRight, y, floor.floor.toUpperCase(), 13, 700, "end", rule));
    y += 26;
    for (const row of floor.rows) {
      body.push(text(nameRight, y, row.room, 14, 600, "end"));
      body.push(
        `<line x1="${nameRight + 10}" y1="${y - 4}" x2="${holdsLeft - 12}" y2="${y - 4}" stroke="${ink}" stroke-width="1" opacity="0.35"/>`,
      );
      const mark = showMarks ? qeiiDirectoryMark(row) : undefined;
      if (mark) {
        const markH = 26;
        const href = qeiiMarkUrl(mark, variant);
        body.push(
          `<image href="${esc(href)}" x="${holdsLeft}" y="${y - markH + 6}" width="${markH * mark.ratio}" height="${markH}" preserveAspectRatio="xMinYMid meet"><title>${esc(row.holds)}</title></image>`,
        );
      } else {
        // The sheet's own wording, wrapped rather than shortened.
        const words = row.holds.split(" ");
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (next.length > 34 && line) {
            lines.push(line);
            line = word;
          } else line = next;
        }
        if (line) lines.push(line);
        lines.forEach((l, i) => body.push(text(holdsLeft, y + i * 17, l, 13, 600)));
        y += (lines.length - 1) * 17;
      }
      y += 30;
    }
    y += 14;
  }

  const foot = [
    `<rect x="${marginX}" y="${h - 96}" width="${w - marginX * 2}" height="1" fill="${ink}" opacity="0.25"/>`,
    text(marginX, h - 72, LONDON_VENUE.address, 10.5, 600, "start", ink, 0.7),
    text(marginX, h - 56, QEII_DIRECTORY_SOURCE, 9.5, 600, "start", ink, 0.5),
    text(w - marginX, h - 72, "VENUE MAP", 11, 700, "end", rule),
  ].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<title>Queen Elizabeth II Centre — Find your way</title>`,
    defs,
    `<rect width="${w}" height="${h}" fill="${groundPaint}"/>`,
    head,
    body.join(""),
    foot,
    "</svg>",
  ].join("");
}

export const QEII_DIRECTORY_TITLE = "Find your way";

export function qeiiDirectoryFilename(face: QeiiPlanFace, groundId = "token"): string {
  const ground = groundId === "token" ? face : `${face}-${groundId}`;
  return `TP-NEXT-2026-London-QEII-find-your-way-${ground}.svg`;
}
