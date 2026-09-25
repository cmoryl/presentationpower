import { describe, expect, it } from "vitest";

import {
  KIOSK_H,
  KIOSK_LIVE_LAYOUTS,
  KIOSK_TV,
  KIOSK_W,
  buildKioskFrontSvg,
  layoutKiosk,
} from "@/lib/next-california-kiosk-live";

const ART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5754 7483"><rect width="10" height="10"/></svg>';

describe("California kiosks rebuilt from live files", () => {
  const all = Object.values(KIOSK_LIVE_LAYOUTS);

  it("has a layout with live text for every supplied booth", () => {
    expect(all).toHaveLength(14);
    for (const L of all) {
      expect(L.blocks.length, L.id).toBeGreaterThan(0);
      if (L.id !== "sterling-2-tradebooth-a") expect(L.texts.length, L.id).toBeGreaterThan(3);
    }
  });

  it("keeps every piece inside the trim and out of the TV", () => {
    for (const L of all) {
      for (const p of layoutKiosk(L)) {
        const top = p.y, bot = p.y + (p.clipBottom - p.clipTop) * p.scale;
        expect(top, `${L.id} ${p.block.id}`).toBeGreaterThanOrEqual(-0.5);
        expect(bot, `${L.id} ${p.block.id}`).toBeLessThanOrEqual(KIOSK_H + 0.5);
        expect(p.x).toBeGreaterThanOrEqual(-0.5);
        expect(p.x + L.trimW * p.scale).toBeLessThanOrEqual(KIOSK_W + 0.5);
        const overlapsTv = top < KIOSK_TV.y + KIOSK_TV.h - 0.5 && bot > KIOSK_TV.y + 0.5;
        expect(overlapsTv, `${L.id} ${p.block.id} crosses the TV`).toBe(false);
      }
    }
  });

  it("never stretches: one scale for width and height", () => {
    for (const L of all) for (const p of layoutKiosk(L)) expect(p.scale).toBeLessThanOrEqual(KIOSK_W / L.trimW + 1e-9);
  });

  it("exports live text and named layers", () => {
    const L = KIOSK_LIVE_LAYOUTS["media-tradebooth-a"]!;
    const svg = buildKioskFrontSvg(L, ART, { texts: { t0: { text: "Edited headline" } } });
    for (const id of ["Background", "Graphics", "Text", "Cut"]) expect(svg).toContain(`<g id="${id}"`);
    expect(svg).toContain(">Edited headline</tspan></text>");
    expect(svg).not.toContain("TV keep-clear");
  });
});

import { layoutKiosk as _lk, buildKioskFrontSvg as _bf, KIOSK_LIVE_LAYOUTS as _L } from "@/lib/next-california-kiosk-live";
describe("separate objects", () => {
  it("every kiosk has movable objects and they move on their own", () => {
    for (const L of Object.values(_L)) {
      const placed = _lk(L);
      const parts = placed.flatMap((p) => p.parts);
      expect(parts.length).toBeGreaterThan(0);
      const q = parts[0]!;
      const moved = _lk(L, { parts: { [q.part.id]: { dx: 100, dy: 50 } } }).flatMap((p) => p.parts).find((x) => x.part.id === q.part.id)!;
      expect(moved.x - q.x).toBeCloseTo(100);
      expect(moved.y - q.y).toBeCloseTo(50);
      expect(_bf(L, '<svg viewBox="0 0 10 10"></svg>')).toContain(`id="object-${q.part.id}"`);
    }
  });
});

import { partGroup as _pg } from "@/lib/next-california-kiosk-live";
describe("object groups", () => {
  it("finds group members", () => {
    expect(_pg({ groups: [["a", "b"]] }, "b")).toEqual(["a", "b"]);
    expect(_pg({}, "c")).toEqual(["c"]);
  });
});

describe("kiosk everyday tools", () => {
  it("duplicates, fades and rotates into the layered SVG", async () => {
    const { KIOSK_LIVE_LAYOUTS, buildKioskFrontSvg, layoutKiosk } = await import("@/lib/next-california-kiosk-live");
    const L = Object.values(KIOSK_LIVE_LAYOUTS)[0]!;
    const t0 = L.texts[0]!.id;
    const edits = { copies: [{ id: `${t0}-c1`, of: t0, kind: "text" as const }], texts: { [`${t0}-c1`]: { dx: 72, opacity: 0.5, rot: 90 } } };
    const texts = layoutKiosk(L, edits).flatMap((p) => p.texts);
    expect(texts.filter((t) => t.text === L.texts[0]!.text).length).toBeGreaterThanOrEqual(2);
    const svg = buildKioskFrontSvg(L, '<svg viewBox="0 0 10 10"><rect/></svg>', edits);
    expect(svg).toContain(`id="${t0}-c1"`);
    expect(svg).toMatch(/opacity="0\.500" transform="rotate\(90\.00/);
  });
});
