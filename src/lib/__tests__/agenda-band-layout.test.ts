import { describe, expect, it } from "vitest";

import {
  AGENDA_BAND_LAYOUTS,
  AGENDA_BAND_TREATMENTS,
  AGENDA_FOOTER_FILLS,
  AGENDA_FOOTER_HEIGHTS,
  AGENDA_FOOTER_STYLES,
  agendaBandLayout,
  agendaBandPalette,
  agendaBandRadius,
  agendaBlocks,
  agendaDefault,
  agendaFooter,
  agendaGroundHexAt,
  normalizeAgendaConfig,
} from "../next-agenda";

const base = () =>
  normalizeAgendaConfig({
    ...agendaDefault(),
    rowStyle: "card",
    sessions: Array.from({ length: 6 }, (_, i) => ({
      time: `0${9 + i}:00`,
      track: "TRACK",
      title: `Session ${i + 1}`,
      detail: "A short note about the session.",
      muted: false,
    })),
  });

describe("agenda band box layouts", () => {
  it("keeps every band inside the content column and on the same left edge", () => {
    for (const layout of AGENDA_BAND_LAYOUTS) {
      const b = agendaBlocks({ ...base(), bandLayout: layout.id });
      const box = agendaBandLayout({ bandLayout: layout.id });
      expect(box.id).toBe(layout.id);
      const bands = b.rows.map((r) => r.band).filter((band) => band !== null);
      expect(bands.length).toBeGreaterThan(0);
      for (const band of bands) {
        expect(band!.x).toBeGreaterThanOrEqual(b.x - 1e-6);
        expect(band!.x + band!.w).toBeLessThanOrEqual(b.x + b.contentW + 1e-6);
        // Inset layouts pull the box in on both sides; a bar runs full width.
        expect(band!.w).toBeCloseTo(b.contentW - b.contentW * box.inset * 2, 6);
      }
      const lefts = new Set(bands.map((band) => Math.round(band!.x * 1000)));
      expect(lefts.size).toBe(1);
    }
  });

  it("never curves a band by more than half its own box", () => {
    for (const layout of AGENDA_BAND_LAYOUTS) {
      const r = agendaBandRadius(layout.radius * 4, 40, 6);
      expect(r).toBeLessThanOrEqual(3);
    }
  });
});

describe("agenda veil treatments", () => {
  it("fades from its own alpha to clear so the ground runs through", () => {
    for (const t of AGENDA_BAND_TREATMENTS) {
      const p = agendaBandPalette({ bandTreatment: t.id });
      if (!t.id.startsWith("veil")) {
        expect(p.fade).toBeNull();
        continue;
      }
      expect(p.fade).not.toBeNull();
      expect(p.fade!.top).toBeGreaterThan(p.fade!.bottom);
      expect(p.fade!.bottom).toBe(0);
      expect(p.fade!.top).toBeCloseTo(p.fillAlpha, 6);
    }
  });

  it("samples the ground colour down the board", () => {
    const cfg = base();
    const top = agendaGroundHexAt(cfg, 0);
    const foot = agendaGroundHexAt(cfg, 1);
    expect(top).toMatch(/^#[0-9A-F]{6}$/);
    expect(foot).toMatch(/^#[0-9A-F]{6}$/);
    expect(top).not.toBe(foot);
  });
});

describe("agenda footer options", () => {
  it("reserves room for every style and carries three lines", () => {
    for (const style of AGENDA_FOOTER_STYLES) {
      for (const height of AGENDA_FOOTER_HEIGHTS) {
        const cfg = normalizeAgendaConfig({
          ...base(),
          footerStyle: style.id,
          footerHeight: height.id,
          footerLeft: "www.transperfectnext.com",
          footerCentre: "QEII Centre",
          footerRight: "24 & 25 September",
        });
        const b = agendaBlocks(cfg);
        const foot = agendaFooter(cfg);
        expect(b.footer.style).toBe(style.id);
        expect(b.footerBand).not.toBeNull();
        expect(b.footerBand!.h).toBeGreaterThan(0);
        expect(foot.left).toBe("WWW.TRANSPERFECTNEXT.COM");
        expect(foot.centre).toBe("QEII CENTRE");
        expect(foot.onGround).toBe(style.id !== "band");
        // No row may run into the foot of the board.
        const last = b.rows[b.rows.length - 1];
        if (last?.band) {
          expect(last.band.y + last.band.h).toBeLessThanOrEqual(b.footerBand!.y + 1e-6);
        }
      }
    }
  });

  it("keeps footer copy readable on every fill", () => {
    for (const fill of AGENDA_FOOTER_FILLS) {
      const foot = agendaFooter({ footerFill: fill.id });
      expect(foot.fill).toBe(fill.fill);
      expect(foot.ink).toBe(fill.ink);
    }
  });

  it("leaves the lines as typed when caps are off", () => {
    const foot = agendaFooter({ footerCaps: false, footerLeft: "www.next.com" });
    expect(foot.left).toBe("www.next.com");
  });
});
