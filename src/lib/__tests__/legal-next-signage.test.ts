import { describe, expect, it } from "vitest";
import { LEGAL_NEXT_SIGNS, legalSignLayout } from "@/lib/legal-next-signage";
import { CALIFORNIA_KIOSKS } from "@/lib/next-california-kiosks";
import { SIGN_LIVE_LAYOUTS, kioskFaceH, kioskFaceW, kioskHasTv, kioskLiveFileBase, layoutKiosk, resizedSignLayout, rotatedBox, sizedSignId, type KioskEdits, type LiveLayout, type PlacedText } from "@/lib/next-california-kiosk-live";

describe("Legal NEXT signage templates", () => {
  it("every face has a layout at its supplied trim size, no TV, draft name", () => {
    const want: Record<string, [number, number]> = { doors: [42, 84], columns: [41, 81], foyer: [173, 96], stairs: [33.2, 8.1], header: [25.6, 0.7] };
    for (const s of LEGAL_NEXT_SIGNS)
      for (const f of s.faces) {
        const L = legalSignLayout(f.id)!;
        expect(L, f.id).toBeTruthy();
        expect(kioskFaceW(L) / 72).toBeCloseTo(want[s.id]![0], 1);
        expect(kioskFaceH(L) / 72).toBeCloseTo(want[s.id]![1], 1);
        expect(kioskHasTv(f.id)).toBe(false);
        expect(kioskLiveFileBase(f.id).startsWith("rdraft-legalnext-")).toBe(true);
      }
  });
  it("signs never appear in the kiosk list", () => {
    expect(CALIFORNIA_KIOSKS.some((k) => k.id.startsWith("legalnext-"))).toBe(false);
  });
});

describe("SF screen surrounds", () => {
  it("match the supplied template trim sizes", async () => {
    const { SF_SCREEN_SURROUNDS } = await import("@/lib/legal-next-signage");
    const want: Record<string, [number, number]> = { "sf-surround-three": [18.9, 11.5], "sf-surround-all": [18.9, 12.7] };
    for (const s of SF_SCREEN_SURROUNDS) {
      const L = legalSignLayout(s.faces[0]!.id)!;
      expect(kioskFaceW(L) / 72).toBeCloseTo(want[s.id]![0], 1);
      expect(kioskFaceH(L) / 72).toBeCloseTo(want[s.id]![1], 1);
      expect(kioskLiveFileBase(s.faces[0]!.id).startsWith("rdraft-sfsurround-")).toBe(true);
    }
  });
});

describe("GlobalLink NEXT SF pillars (supplied Canva final)", () => {
  const SLUGS = ["welcome", "telegraph-hill", "grand-ballroom", "sutter", "union-square", "yerba-buena", "directional", "discovery-rooms", "next-mart", "g2-review"];
  // Type sizes as set in the Canva file (font size in px × 0.75 = pt).
  const SIZE_PT: Record<string, number> = { welcome: 616.74, "telegraph-hill": 382.5, "grand-ballroom": 336.75, sutter: 616.74, "union-square": 417.75, "yerba-buena": 446.25, "discovery-rooms": 324.75, "next-mart": 554.25, "g2-review": 571.5 };
  const turned = (L: LiveLayout, edits: KioskEdits = {}) => layoutKiosk(L, edits).flatMap((p) => p.texts).find((t) => t.rot);
  /** The box a line covers on the sign, as the editor and the print checks measure it. */
  const cover = (t: PlacedText) => rotatedBox({ x0: t.kx, x1: t.kx + t.kw, y0: t.ky - t.ksize * 0.8, y1: t.ky + t.ksize * 0.2 }, t.rot, t.ax, t.ky);

  it("ten live signs at 23.5 × 72 in, in page order", async () => {
    const { DIVISION_LIVE_SIGNS } = await import("@/lib/legal-next-signage");
    const signs = DIVISION_LIVE_SIGNS.filter((s) => s.id.startsWith("globallink-pillar-"));
    expect(signs.map((s) => s.id)).toEqual(SLUGS.map((s) => `globallink-pillar-${s}`));
    for (const s of signs) {
      const L = legalSignLayout(s.faces[0]!.id)!;
      expect(L, s.id).toBeTruthy();
      expect(kioskFaceW(L) / 72).toBeCloseTo(23.5, 3);
      expect(kioskFaceH(L) / 72).toBeCloseTo(72, 3);
    }
  });

  it("the headline reads upward, is anchored at its middle and keeps the designer's size", () => {
    for (const slug of SLUGS) {
      const L = legalSignLayout(`divsign-globallink-pillar-${slug}`)!;
      const t = turned(L);
      if (slug === "directional") { expect(t, slug).toBeUndefined(); continue; }
      expect(t!.rot, slug).toBe(-90);
      expect(t!.align, slug).toBe("center");
      expect(t!.ksize, slug).toBeCloseTo(SIZE_PT[slug]!, 2);
      const b = cover(t!);
      expect(b.x0, slug).toBeGreaterThan(72); expect(b.x1, slug).toBeLessThan(1692 - 72);
      expect(b.y0, slug).toBeGreaterThan(72); expect(b.y1, slug).toBeLessThan(5184 - 72);
      // A retyped name keeps the turn and the point it is centred on.
      const r = turned(L, { texts: { [t!.id]: { text: "MARKET STREET" } } })!;
      expect([r.rot, r.ax, r.ky], slug).toEqual([-90, t!.ax, t!.ky]);
    }
  });

  it("a new size keeps the turned headline in the same place on the sign", () => {
    for (const slug of SLUGS.filter((s) => s !== "directional")) {
      const base = `divsign-globallink-pillar-${slug}`;
      const b0 = cover(turned(legalSignLayout(base)!)!);
      for (const [w, h] of [[23.5, 84], [30, 96], [18, 72]] as const) {
        const L = legalSignLayout(sizedSignId(base, w, h))!;
        const W = kioskFaceW(L), H = kioskFaceH(L);
        const b = cover(turned(L)!);
        const where = `${slug} at ${w} × ${h} in`;
        expect(Math.abs((b.x0 + b.x1) / 2 / W - (b0.x0 + b0.x1) / 2 / 1692), where).toBeLessThan(0.02);
        expect(Math.abs((b.y0 + b.y1) / 2 / H - (b0.y0 + b0.y1) / 2 / 5184), where).toBeLessThan(0.005);
        expect(b.x0, where).toBeGreaterThan(0); expect(b.x1, where).toBeLessThan(W);
        expect(b.y0, where).toBeGreaterThan(0); expect(b.y1, where).toBeLessThan(H);
      }
    }
  });

  it("unturned lines on every other sign are re-placed exactly as before", () => {
    for (const [id, L] of Object.entries(SIGN_LIVE_LAYOUTS)) {
      const w0 = L.trimW / 72, h0 = L.trimH / 72;
      for (const [w, h] of [[w0 * 1.25, h0 * 1.25], [w0 * 0.75, h0], [w0, h0 * 0.6]] as const) {
        const R = resizedSignLayout(L, w, h);
        const sx = (w * 72) / L.trimW, sy = (h * 72) / L.trimH;
        L.texts.forEach((t, i) => {
          if (t.rot) return;
          const dx = (t.x + t.w / 2) * (sx - 1), dy = ((t.top + t.bottom) / 2) * (sy - 1);
          expect(R.texts[i], `${id} ${t.id}`).toEqual({ ...t, x: t.x + dx, y: t.y + dy, top: t.top + dy, bottom: t.bottom + dy });
        });
      }
    }
  });
});
