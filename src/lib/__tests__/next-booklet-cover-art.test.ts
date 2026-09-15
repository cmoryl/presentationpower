import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import {
  BOOKLET_COVER_ART,
  BOOKLET_COVER_TREATMENTS,
  bookletCoverArt,
  bookletCoverArtFor,
  bookletCoverLayout,
  coverCrop,
} from "@/lib/next-booklet-cover-art";

describe("booklet cover art library", () => {
  it("ships every listed picture as a real file in /public", () => {
    for (const art of BOOKLET_COVER_ART) {
      expect(existsSync(`public${art.src}`), art.src).toBe(true);
    }
  });

  it("keeps ids unique and credits every generated scene as illustration", () => {
    const ids = BOOKLET_COVER_ART.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const art of BOOKLET_COVER_ART) {
      expect(art.credit).toMatch(/not photography/i);
    }
  });

  it("has a London starter set and resolves by id", () => {
    expect(bookletCoverArtFor("london").length).toBeGreaterThanOrEqual(6);
    expect(bookletCoverArt(BOOKLET_COVER_ART[0]!.id)?.id).toBe(BOOKLET_COVER_ART[0]!.id);
    expect(bookletCoverArt("")).toBeNull();
    expect(bookletCoverArt("nope")).toBeNull();
  });
});

describe("booklet cover geometry", () => {
  for (const t of BOOKLET_COVER_TREATMENTS) {
    it(`${t.id} stays inside the sheet in both copy modes`, () => {
      for (const copyAtTop of [false, true]) {
        const l = bookletCoverLayout(t.id, { copyAtTop });
        for (const r of [l.photo, l.copy]) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.y).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(1.0001);
          expect(r.y + r.h).toBeLessThanOrEqual(1.0001);
        }
        expect(l.scrim.strength).toBeGreaterThan(0);
        expect(l.scrim.strength).toBeLessThanOrEqual(1);
      }
    });
  }

  it("keeps the split and framed copy panels off the picture", () => {
    // Copy on a picture is only allowed where a veil covers it: the split and
    // framed treatments print their words on ink, so the boxes must not meet.
    for (const id of ["top-half", "framed"] as const) {
      const l = bookletCoverLayout(id);
      const copyEnd = l.copy.y + l.copy.h;
      const photoEnd = l.photo.y + l.photo.h;
      const clear = copyEnd <= l.photo.y + 0.0001 || l.copy.y >= photoEnd - 0.0001;
      expect(clear, id).toBe(true);
    }
  });

  it("cover-crops without ever distorting the picture", () => {
    const fit = coverCrop(1280, 1792, 600, 200);
    expect(fit.w / fit.h).toBeCloseTo(1280 / 1792, 5);
    expect(fit.w).toBeGreaterThanOrEqual(600 - 0.001);
    expect(fit.h).toBeGreaterThanOrEqual(200 - 0.001);
    expect(fit.dy).toBeLessThanOrEqual(0);
  });
});
