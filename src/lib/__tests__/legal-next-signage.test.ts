import { describe, expect, it } from "vitest";
import { LEGAL_NEXT_SIGNS, legalSignLayout } from "@/lib/legal-next-signage";
import { CALIFORNIA_KIOSKS } from "@/lib/next-california-kiosks";
import { kioskFaceH, kioskFaceW, kioskHasTv, kioskLiveFileBase } from "@/lib/next-california-kiosk-live";

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
