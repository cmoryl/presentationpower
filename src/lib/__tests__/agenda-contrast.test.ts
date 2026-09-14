/**
 * Legibility gate for agenda boards. A printed board cannot be zoomed, so any
 * band of copy that drops below its contrast floor is a reprint.
 */
import { describe, expect, it } from "vitest";
import { AGENDA_STYLE_IDS, agendaBlocks, agendaDefault, type AgendaConfig } from "@/lib/next-agenda";
import {
  AGENDA_COPY_MIN_CONTRAST,
  AGENDA_GUARD_GAPS,
  agendaCopyInk,
  agendaCopyReadouts,
  agendaGroundSampler,
  agendaInkAudit,
  agendaTitleInkOptions,
} from "@/lib/next-agenda-contrast";
import { NEXT_DIVISIONS } from "@/lib/next-event";

const faces = ["dark", "light"] as const;

describe("agenda copy legibility", () => {
  it("every ground the editor can build reads at its floor once the guard runs", () => {
    const base = agendaDefault();
    const unreadable: string[] = [];
    for (const styleId of AGENDA_STYLE_IDS) {
      for (const face of faces) {
        for (const division of ["", ...NEXT_DIVISIONS.map((d) => d.id)]) {
          const config: AgendaConfig = {
            ...base,
            styleId,
            face,
            divisionId: division || base.divisionId,
            titleColor: "",
          };
          const guard = agendaCopyInk(config);
          if (!guard.ok) unreadable.push(`${styleId}/${face}`);
        }
      }
    }
    // Grounds with no readable ink must be a known, named list — never a silent
    // pass and never a surprise at print.
    expect([...new Set(unreadable)].sort()).toEqual([...AGENDA_GUARD_GAPS].sort());
  });

  it("keeps the approved face ink whenever it still reads", () => {
    const config = { ...agendaDefault(), face: "light" as const, titleColor: "" };
    const guard = agendaCopyInk(config);
    expect(guard.auto).toBe(false);
    expect(guard.hex).toBe("#03002C");
    expect(guard.ratio).toBeGreaterThanOrEqual(AGENDA_COPY_MIN_CONTRAST);
  });

  it("samples the ground where copy prints, not across the whole sheet", () => {
    const config = { ...agendaDefault(), titleColor: "" };
    const blocks = agendaBlocks(config);
    const sample = agendaGroundSampler(config);
    const head = sample("#FFFFFF", blocks.eyebrowY, blocks.metaY).ratio;
    const foot = sample("#FFFFFF", blocks.footY, blocks.footY + blocks.layout.footSize).ratio;
    expect(head).not.toBe(foot);
  });

  it("reports a floor and a reading for every printed band", () => {
    const readouts = agendaCopyReadouts({ ...agendaDefault(), titleColor: "" });
    expect(readouts).toHaveLength(8);
    for (const r of readouts) {
      expect(r.ratio).toBeGreaterThan(0);
      expect([3, 4.5]).toContain(r.floor);
      expect(r.ok).toBe(r.ratio >= r.floor);
    }
  });

  it("scores each approved headline ink so an unreadable pick is visible", () => {
    const options = agendaTitleInkOptions({ ...agendaDefault(), titleColor: "" });
    expect(options.length).toBeGreaterThan(5);
    expect(options.some((o) => !o.ok)).toBe(true);
    expect(options.some((o) => o.ok)).toBe(true);
  });

  it("audits every style, face, division and ink pairing", () => {
    const audit = agendaInkAudit();
    expect(audit.rows.length).toBeGreaterThan(1000);
    expect(audit.failing.length).toBeLessThan(audit.rows.length);
    for (const row of audit.rows) expect(row.ratio).toBeGreaterThan(0);
  });
});
