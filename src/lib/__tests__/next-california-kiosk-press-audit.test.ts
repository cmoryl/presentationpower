import { describe, expect, it } from "vitest";
import { KIOSK_LIVE_LAYOUTS, bulletSquarePath } from "@/lib/next-california-kiosk-live";

describe("SF kiosk press audit", () => {
  it("no letter-spaced line has lost its word gaps (every character separated by a space)", () => {
    for (const L of Object.values(KIOSK_LIVE_LAYOUTS))
      for (const t of L.texts) expect(/(\S ){5,}/.test(t.text), `${L.id}: ${t.text}`).toBe(false);
  });
  it("Times ▪ bullets are drawn as vector squares", () => {
    expect(bulletSquarePath({ text: "▪", kx: 0, ky: 100, ksize: 100 })).toMatch(/^M6\.24 54\.94H/);
    expect(bulletSquarePath({ text: "A", kx: 0, ky: 0, ksize: 10 })).toBeNull();
  });
  it("Sterling lion stays one piece (feet not split off)", () => {
    const ids = KIOSK_LIVE_LAYOUTS["sterling-2-tradebooth-a"]!.blocks.map((b) => b.id);
    expect(ids).not.toContain("b5");
  });
});
