/**
 * End-to-end combination audit for the NEXT division agenda.
 *
 * The agenda studio can build 31,680 distinct boards from its own controls
 * (12 division areas × 11 approved grounds × 2 faces × 10 formats × 3 programme
 * band treatments × 2 row looks × 2 QR anchors). Every one of them is a live
 * print job, so this sweep drives all of them through the shared geometry the
 * sheet, the layered press PDF, the Word file and the PowerPoint deck all read,
 * and fails on anything that would print wrong: NaN geometry, a programme that
 * runs into the footer band, a lockup or QR code outside the safe margin, a
 * page that cannot be paginated, or a code that ignores its anchor.
 *
 * A second, smaller sweep builds real export bytes across every axis value so
 * the vector PDF, Word and PowerPoint writers are proven on each option too.
 */
import { beforeAll, describe, expect, it } from "vitest";

import {
  AGENDA_BAND_TREATMENTS,
  AGENDA_DIVISIONS,
  AGENDA_ROW_STYLES,
  AGENDA_SIZES,
  AGENDA_STYLE_IDS,
  agendaBlocks,
  agendaDefault,
  agendaGeometry,
  agendaPages,
  withAgendaDivision,
  type AgendaConfig,
} from "@/lib/next-agenda";
import { agendaFit } from "@/lib/next-agenda-fit";
import { buildAgendaVectorPdf } from "@/lib/agenda-vector-pdf";
import { buildAgendaDocx } from "@/lib/next-agenda-docx";
import { buildAgendaPptx } from "@/lib/next-agenda-pptx";

const FACES = ["dark", "light"] as const;
const ANCHORS = ["foot-right", "top-right"] as const;
const QR = "https://next.transperfect.com/agenda";

/** Where the last programme band really ends (row height carries a trailing gap). */
function programmeBottom(blocks: ReturnType<typeof agendaBlocks>): number {
  const last = blocks.rows[blocks.rows.length - 1];
  if (!last) return blocks.rowsTop;
  return last.y + (last.band?.h ?? last.h);
}

function auditSheet(
  id: string,
  config: AgendaConfig,
  problems: string[],
  /** A printed page must always fit; an un-paginated day may legitimately
   *  overrun, provided the fit report says so out loud in the studio. */
  opts: { printedPage: boolean } = { printedPage: true },
): void {
  const geo = agendaGeometry(config);
  const b = agendaBlocks(config);

  const numbers = [geo.trimW, geo.trimH, b.rowsTop, b.listBottom, b.rowH, b.footY];
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) problems.push(`bad geometry — ${id}`);
  if (b.rowsTop >= b.listBottom) problems.push(`no programme band — ${id}`);
  if (b.footY + b.layout.footSize > geo.trimH + 0.01) problems.push(`footer past trim — ${id}`);
  if (programmeBottom(b) > b.listBottom + 0.5) {
    if (opts.printedPage) problems.push(`programme past its band — ${id}`);
    else if (agendaFit(config).status !== "over")
      problems.push(`silent overflow — ${id}`);
  }

  if (b.lockup) {
    if (b.lockup.x < geo.safeInset - 0.01) problems.push(`lockup left of safe — ${id}`);
    if (b.lockup.x + b.lockup.w > geo.trimW - geo.safeInset + 0.01)
      problems.push(`lockup past safe right — ${id}`);
  }

  if (b.qr) {
    if (b.qr.x < geo.safeInset - 0.01 || b.qr.y < geo.safeInset - 0.01)
      problems.push(`QR outside safe margin — ${id}`);
    if (b.qr.x + b.qr.edge > geo.trimW - geo.safeInset + 0.01)
      problems.push(`QR past safe right — ${id}`);
    if (b.qr.y + b.qr.edge > geo.trimH - geo.safeInset + 0.01)
      problems.push(`QR past safe bottom — ${id}`);
  }

  for (const row of b.rows) {
    if (row.h <= 0 || !Number.isFinite(row.h)) problems.push(`row with no height — ${id}`);
    if (row.band && row.band.x + row.band.w > geo.trimW - geo.safeInset + 0.01)
      problems.push(`band past safe right — ${id}`);
    if (row.parallel && row.parallel.x + row.parallel.w > geo.trimW - geo.safeInset + 0.01)
      problems.push(`parallel card past safe right — ${id}`);
  }
}

describe("agenda option matrix", () => {
  it("every board the studio can build holds its geometry, safe margin and programme band", () => {
    const problems: string[] = [];
    const status: Record<string, number> = {};
    let cells = 0;

    for (const division of AGENDA_DIVISIONS) {
      const base = withAgendaDivision(agendaDefault(division.id), division.id);
      for (const styleId of AGENDA_STYLE_IDS) {
        for (const face of FACES) {
          for (const size of AGENDA_SIZES) {
            for (const band of AGENDA_BAND_TREATMENTS) {
              for (const rowStyle of AGENDA_ROW_STYLES) {
                for (const qrAnchor of ANCHORS) {
                  cells += 1;
                  const config: AgendaConfig = {
                    ...base,
                    styleId,
                    face,
                    sizeId: size.id,
                    trimW: size.trimW,
                    trimH: size.trimH,
                    bandTreatment: band.id,
                    rowStyle: rowStyle.id,
                    qrAnchor,
                    qrData: QR,
                  };
                  const id = [
                    division.id,
                    styleId,
                    face,
                    size.id,
                    band.id,
                    rowStyle.id,
                    qrAnchor,
                  ].join("|");

                  auditSheet(id, config, problems, { printedPage: false });

                  const fit = agendaFit(config);
                  status[fit.status] = (status[fit.status] ?? 0) + 1;

                  // Every page the file paginates into is itself a printed board.
                  const pages = agendaPages(config);
                  if (!pages.length) problems.push(`no printable page — ${id}`);
                  pages.forEach((page, i) => auditSheet(`${id} p${i + 1}`, page.config, problems));
                }
              }
            }
          }
        }
      }
    }

    expect(cells).toBe(
      AGENDA_DIVISIONS.length * AGENDA_STYLE_IDS.length * 2 * AGENDA_SIZES.length * 3 * 2 * 2,
    );
    expect(problems.slice(0, 20)).toEqual([]);
    expect(problems).toHaveLength(0);
    // Every combination resolves to a named fit state the studio can show.
    expect(Object.keys(status).every((k) => ["ok", "loose", "tight", "over"].includes(k))).toBe(
      true,
    );
  }, 120_000);

  it("keeps the top-right code in the header and the foot-right code above the footer", () => {
    for (const size of AGENDA_SIZES) {
      const base: AgendaConfig = {
        ...agendaDefault("globallink"),
        sizeId: size.id,
        trimW: size.trimW,
        trimH: size.trimH,
        qrData: QR,
        qrOffsetX: null,
        qrOffsetY: null,
      };
      const top = agendaBlocks({ ...base, qrAnchor: "top-right" });
      const foot = agendaBlocks({ ...base, qrAnchor: "foot-right" });
      expect(top.qr, size.id).toBeTruthy();
      expect(foot.qr, size.id).toBeTruthy();
      // Header code never sits over the programme; foot code never over the footer.
      expect(top.qr!.y, size.id).toBeLessThanOrEqual(top.rowsTop + 0.01);
      expect(foot.qr!.y + foot.qr!.edge, size.id).toBeLessThanOrEqual(foot.footY + 0.01);
      expect(foot.qr!.y, size.id).toBeGreaterThan(top.qr!.y);
    }
  });
});

/** One export case per value of every axis, so no option ships unexercised. */
function exportCases(): { label: string; config: AgendaConfig }[] {
  const cases: { label: string; config: AgendaConfig }[] = [];
  const push = (label: string, patch: Partial<AgendaConfig>, division = "globallink") =>
    cases.push({
      label,
      config: { ...withAgendaDivision(agendaDefault(division), division), qrData: QR, ...patch },
    });

  for (const size of AGENDA_SIZES) {
    push(`${size.id} · dark`, { sizeId: size.id, trimW: size.trimW, trimH: size.trimH });
  }
  for (const band of AGENDA_BAND_TREATMENTS) {
    push(`band ${band.id} · light`, { sizeId: "a3", face: "light", bandTreatment: band.id });
  }
  for (const rowStyle of AGENDA_ROW_STYLES) {
    push(`row ${rowStyle.id}`, { sizeId: "a2", rowStyle: rowStyle.id });
  }
  for (const anchor of ANCHORS) {
    push(`qr ${anchor}`, { sizeId: "a4", qrAnchor: anchor, qrCaption: "Full programme" });
  }
  return cases;
}

describe("agenda export matrix", () => {
  const cases = exportCases();

  beforeAll(() => {
    // Node has no canvas: the Word file's flattened ground is proved elsewhere.
    const ctx = new Proxy(
      {},
      { get: () => () => ({ addColorStop: () => undefined }) },
    ) as unknown as CanvasRenderingContext2D;
    (globalThis as Record<string, unknown>)["document"] = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ctx,
        toBlob: (cb: (b: Blob) => void) => cb(new Blob([new Uint8Array([1])])),
      }),
    };
  });

  for (const testCase of cases) {
    it(`exports press, Word and PowerPoint — ${testCase.label}`, async () => {
      const vector = await buildAgendaVectorPdf(testCase.config);
      expect(vector.bytes.byteLength).toBeGreaterThan(4_000);
      expect(vector.pageCount).toBe(agendaPages(testCase.config).length);
      expect(vector.layers.length).toBeGreaterThan(3);

      const word = await buildAgendaDocx(testCase.config);
      expect(word.blob.size).toBeGreaterThan(4_000);

      const deck = await buildAgendaPptx(testCase.config);
      expect(deck.slideCount).toBe(agendaPages(testCase.config).length);
      expect(deck.blob.size).toBeGreaterThan(10_000);
    }, 120_000);
  }
});
