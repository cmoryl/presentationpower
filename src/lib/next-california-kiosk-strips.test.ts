import { describe, expect, it } from "vitest";
import { KIOSK_LIVE_LAYOUTS, KIOSK_RETURN_W, KIOSK_H, KIOSK_BLEED, kioskFaceLayout, kioskEditKey, kioskEditKeyParts, layoutKiosk, buildKioskFrontSvg } from "@/lib/next-california-kiosk-live";

const natives = Object.values(KIOSK_LIVE_LAYOUTS).filter((L) => L.native);

describe("side strips edited like the front", () => {
  it("every native kiosk has both strips split into objects", () => {
    expect(natives.length).toBe(13);
    for (const L of natives) for (const f of ["left", "right"] as const) {
      const F = kioskFaceLayout(L, f)!;
      expect(F, `${L.id} ${f}`).toBeTruthy();
      expect(F.trimW).toBe(KIOSK_RETURN_W);
      for (const p of F.blocks.flatMap((b) => b.parts ?? [])) {
        expect(F.native!.parts[p.id], p.id).toBeTruthy();
        expect(p.x0).toBeGreaterThanOrEqual(-KIOSK_BLEED - 1);
        expect(p.x1).toBeLessThanOrEqual(KIOSK_RETURN_W + KIOSK_BLEED + 1);
        expect(p.y1).toBeLessThanOrEqual(KIOSK_H + KIOSK_BLEED + 1);
      }
    }
  });
  it("strip edits save under their own key and move objects", () => {
    const L = KIOSK_LIVE_LAYOUTS["medical-writing"]!;
    const F = kioskFaceLayout(L, "left")!;
    expect(kioskEditKey(F)).toBe("medical-writing--left");
    expect(kioskEditKeyParts("medical-writing--left")).toEqual({ id: "medical-writing", face: "left" });
    const id = F.blocks[0]!.parts![0]!.id;
    const q0 = layoutKiosk(F, {}).flatMap((p) => p.parts).find((q) => q.part.id === id)!;
    const q1 = layoutKiosk(F, { parts: { [id]: { dx: 20, hidden: false } } }).flatMap((p) => p.parts).find((q) => q.part.id === id)!;
    expect(q1.x - q0.x).toBeCloseTo(20);
    const svg = buildKioskFrontSvg(F, '<svg viewBox="0 0 306 6930"></svg>', {});
    expect(svg).toContain(`width="${KIOSK_RETURN_W + 2 * KIOSK_BLEED}pt"`);
    expect(svg).toContain("#art-left-bg");
  });
});
