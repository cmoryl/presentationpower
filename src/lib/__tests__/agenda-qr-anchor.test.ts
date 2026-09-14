import { describe, expect, it } from "vitest";
import { agendaBlocks, agendaDefault, agendaQrAnchor } from "../next-agenda";

const base = () => ({
  ...agendaDefault(),
  qrData: "https://next.transpointer.com/agenda",
  qrCaption: "FULL AGENDA",
});

describe("agenda QR anchor", () => {
  it("defaults to the issued foot-right position", () => {
    const cfg = base();
    expect(agendaQrAnchor(cfg)).toBe("foot-right");
    const b = agendaBlocks(cfg);
    expect(b.qr).not.toBeNull();
    expect(b.qr!.y).toBeGreaterThan(b.rowsTop);
    expect(b.headW).toBeCloseTo(b.contentW, 5);
  });

  it("top-right seats the code in the header band and narrows the title block", () => {
    const cfg = { ...base(), qrAnchor: "top-right" as const };
    const b = agendaBlocks(cfg);
    const flow = agendaBlocks(base());
    expect(b.qr!.y).toBeLessThan(flow.rowsTop);
    expect(b.qr!.x + b.qr!.edge).toBeCloseTo(b.geo.trimW - b.geo.safeInset, 5);
    expect(b.headW).toBeLessThan(b.contentW);
    // The programme still fits: rows sit clear of the code, never under it.
    expect(b.rowsTop).toBeGreaterThanOrEqual(flow.rowsTop);
    expect(b.rowH).toBeGreaterThan(0);
    for (const row of b.rows) expect(row.y).toBeGreaterThanOrEqual(b.qr!.y + b.qr!.edge - 0.001);
  });

  it("a dragged position still wins over the anchor", () => {
    const cfg = { ...base(), qrAnchor: "top-right" as const, qrOffsetX: 30, qrOffsetY: 400 };
    const b = agendaBlocks(cfg);
    expect(b.qr!.placed).toBe(true);
    expect(b.qr!.y).toBeCloseTo(400, 5);
  });
});
