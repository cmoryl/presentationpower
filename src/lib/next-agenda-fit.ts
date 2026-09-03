// Live page-fit model for the NEXT agenda board.
//
// The agenda studio edits content at real print size, so the operator needs the
// same feedback the other print areas give: how much of the sheet the programme
// actually uses, whether a row has fallen below the legible floor for that
// format, and whether any single line will run past the safe area. Everything
// here is measured in millimetres off the shared `agendaBlocks` geometry, so the
// numbers match the live sheet and the layered PDF export exactly.

import { agendaBlocks, agendaGeometry, AGENDA_SIZES, type AgendaConfig } from "@/lib/next-agenda";

/** Smallest cap height we will sign off for print / screen reading distance. */
const MIN_ROW_TITLE_MM = 3.4;
const MIN_DETAIL_MM = 2.4;

/** Approximate Geist advance width per character, as a fraction of font size. */
const ADVANCE = 0.52;
const ADVANCE_TIGHT = 0.48;

export type AgendaFitLine = {
  index: number;
  /** Which field on the row overruns its column. */
  field: "title" | "detail" | "time" | "track";
  label: string;
  /** How far past the column the text runs, in mm. */
  overMm: number;
  /** Characters that need to come out to bring it inside the column. */
  trimChars: number;
};

export type AgendaFitReport = {
  /** Fraction of the available programme band the rows consume (1 = full). */
  usedFraction: number;
  /** mm of unused programme band; negative means the rows overrun it. */
  slackMm: number;
  /** Rows overrun the band between the header block and the footer / QR. */
  overflows: boolean;
  rowH: number;
  rowCount: number;
  /** Rows have been squeezed below the legible floor for this format. */
  tooTight: boolean;
  /** Largest number of rows that still hold the legible floor. */
  maxRows: number;
  /** Copy lines that run past their column. */
  lines: AgendaFitLine[];
  /** Plain-language state for the studio badge. */
  status: "ok" | "loose" | "tight" | "over";
  summary: string;
  /** Next smaller / larger approved format, when a size change would help. */
  suggestSizeId: string | null;
  suggestSizeName: string | null;
};

function textWidth(chars: number, size: number, tight = false): number {
  return chars * size * (tight ? ADVANCE_TIGHT : ADVANCE);
}

/** Ordered list of approved formats by trim area, used for size suggestions. */
function sizeLadder() {
  return AGENDA_SIZES.filter((s) => s.id !== "custom")
    .map((s) => ({ id: s.id, name: s.name, area: s.trimW * s.trimH }))
    .sort((a, b) => a.area - b.area);
}

export function agendaFit(config: AgendaConfig): AgendaFitReport {
  const blocks = agendaBlocks(config);
  const L = blocks.layout;
  const rowCount = Math.max(1, config.sessions.length);
  const bandH = Math.max(1, blocks.listBottom - blocks.rowsTop);
  const usedH = blocks.rowH * rowCount;
  const usedFraction = usedH / bandH;
  const slackMm = bandH - usedH;

  // A row is legible when its title and detail type clear the floor. The row
  // heights come straight off the shared layout, so this floor tracks format.
  const tooTight = L.titleRowSize < MIN_ROW_TITLE_MM || L.detailSize < MIN_DETAIL_MM;
  const perRowFloor = Math.max(MIN_ROW_TITLE_MM / 0.34, MIN_DETAIL_MM / 0.24);
  const maxRows = Math.max(1, Math.floor(bandH / perRowFloor));

  const titleColW = L.contentW - L.timeColW - L.trackColW - 6;
  const lines: AgendaFitLine[] = [];
  config.sessions.forEach((session, index) => {
    const checks: { field: AgendaFitLine["field"]; text: string; col: number; size: number }[] = [
      { field: "time", text: session.time ?? "", col: L.timeColW - 2, size: L.timeSize },
      { field: "title", text: session.title ?? "", col: titleColW, size: L.titleRowSize },
      { field: "detail", text: session.detail ?? "", col: titleColW, size: L.detailSize },
      { field: "track", text: session.track ?? "", col: L.trackColW - 2, size: L.trackSize },
    ];
    for (const check of checks) {
      const chars = check.text.trim().length;
      if (!chars) continue;
      const w = textWidth(chars, check.size, check.field === "track");
      if (w <= check.col) continue;
      const perChar = w / chars;
      lines.push({
        index,
        field: check.field,
        label: check.text.trim(),
        overMm: Math.round((w - check.col) * 10) / 10,
        trimChars: Math.max(1, Math.ceil((w - check.col) / perChar)),
      });
    }
  });

  const overflows = slackMm < -0.5 || rowCount > maxRows;

  let status: AgendaFitReport["status"] = "ok";
  if (overflows || tooTight) status = "over";
  else if (usedFraction > 0.97) status = "tight";
  else if (usedFraction < 0.55) status = "loose";

  const ladder = sizeLadder();
  const currentGeo = agendaGeometry(config);
  const currentArea = currentGeo.trimW * currentGeo.trimH;
  let suggest: { id: string; name: string } | null = null;
  if (status === "over") {
    suggest = ladder.find((s) => s.area > currentArea * 1.05) ?? null;
  } else if (status === "loose") {
    const smaller = ladder.filter((s) => s.area < currentArea * 0.95);
    suggest = smaller[smaller.length - 1] ?? null;
  }

  const summary =
    status === "over"
      ? tooTight
        ? `${rowCount} rows squeeze the programme below the legible floor for ${currentGeo.sizeName}. Keep ${maxRows} rows or move up a format.`
        : `The programme runs past the safe area on ${currentGeo.sizeName}. Remove ${Math.max(1, rowCount - maxRows)} row${rowCount - maxRows === 1 ? "" : "s"} or move up a format.`
      : status === "tight"
        ? `Programme fills ${Math.round(usedFraction * 100)}% of the band — right at the safe edge.`
        : status === "loose"
          ? `Programme uses only ${Math.round(usedFraction * 100)}% of the band; a smaller format would read tighter.`
          : `Programme fits ${currentGeo.sizeName} with ${Math.round(slackMm)} mm to spare.`;

  return {
    usedFraction,
    slackMm,
    overflows,
    rowH: blocks.rowH,
    rowCount,
    tooTight,
    maxRows,
    lines,
    status,
    summary,
    suggestSizeId: suggest?.id ?? null,
    suggestSizeName: suggest?.name ?? null,
  };
}
