import { describe, expect, it } from "vitest";

import { agendaBlocks, agendaDefault, agendaFooter, normalizeAgendaConfig } from "../next-agenda";

const board = (footerRight: string) =>
  normalizeAgendaConfig({
    ...agendaDefault(),
    rowStyle: "card",
    footerRight,
    pageLabel: "DAY 1 · PAGE 1 OF 2",
    sessions: Array.from({ length: 8 }, (_, i) => ({
      time: `0${9 + i}:00`,
      title: `Session ${i + 1}`,
      detail: "",
      track: "",
    })),
  } as never);

describe("multi-day page stamp", () => {
  it("lifts the stamp off the right-hand footer line so the two never overlap", () => {
    const cfg = board("24 & 25 SEPTEMBER, 2026");
    const blocks = agendaBlocks(cfg as never);
    expect(agendaFooter(cfg as never).right).toBeTruthy();
    expect(blocks.footerBand).toBeTruthy();
    expect(blocks.stampY).toBeLessThan(blocks.footY);
    // A full footer line height of clearance, so the tracked caps cannot touch it.
    expect(blocks.footY - blocks.stampY).toBeGreaterThan(2);
  });

  it("keeps the stamp on the footer line when that line is empty", () => {
    const blocks = agendaBlocks(board("") as never);
    expect(blocks.stampY).toBe(blocks.footY);
  });

  it("keeps the last row clear of the raised stamp", () => {
    const withDates = agendaBlocks(board("24 & 25 SEPTEMBER, 2026") as never);
    const without = agendaBlocks(board("") as never);
    expect(withDates.listBottom).toBeLessThan(without.listBottom);
    expect(withDates.listBottom).toBeLessThan(withDates.stampY);
  });
});
