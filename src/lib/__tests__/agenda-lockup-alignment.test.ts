import { describe, expect, it } from "vitest";

import { CITY_BADGE_DIVISIONS } from "@/lib/next-city-badge";
import { agendaBlocks, agendaDefault, agendaLockupUrl, type AgendaConfig } from "@/lib/next-agenda";
import { logoInkBox, logoInkPlacement, logoInkRatio } from "@/lib/next-logo-ink";

/**
 * The supplied lockup files carry clear space inside their own viewBox. Boards
 * must align the artwork, not that empty space, so the mark sits on the same
 * left edge as the copy underneath it.
 */
describe("agenda lockups align on the copy edge", () => {
  const boards = (patch: Partial<AgendaConfig> = {}): AgendaConfig[] =>
    CITY_BADGE_DIVISIONS.map((d) => ({
      ...agendaDefault(),
      divisionId: d.id,
      showLockup: true,
      ...patch,
    }));

  it("has a measured ink box for every division lockup, both faces", () => {
    const missing: string[] = [];
    for (const face of ["light", "dark"] as const) {
      for (const config of boards({ face })) {
        const url = agendaLockupUrl(config);
        if (!url) continue;
        if (!logoInkBox(url)) missing.push(`${config.divisionId} ${face}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("places the artwork flush on the safe-area left edge", () => {
    for (const face of ["light", "dark"] as const) {
      for (const config of boards({ face })) {
        const b = agendaBlocks(config);
        const url = agendaLockupUrl(config);
        expect(b.lockup).not.toBeNull();
        const drawn = logoInkPlacement(url, b.lockup!);
        const ink = logoInkBox(url)!;
        // The drawn file starts left of / above the block by exactly its own
        // clear space, so the ink itself starts on the block origin.
        expect(drawn.x + ink.left * drawn.w).toBeCloseTo(b.lockup!.x, 6);
        expect(drawn.y + ink.top * drawn.h).toBeCloseTo(b.lockup!.y, 6);
        expect(ink.width * drawn.w).toBeCloseTo(b.lockup!.w, 6);
        expect(ink.height * drawn.h).toBeCloseTo(b.lockup!.h, 6);
      }
    }
  });

  it("keeps the artwork undistorted", () => {
    for (const config of boards()) {
      const b = agendaBlocks(config);
      const url = agendaLockupUrl(config);
      const fileRatio = CITY_BADGE_DIVISIONS.find((d) => d.id === config.divisionId)!.ratio;
      expect(b.lockup!.w / b.lockup!.h).toBeCloseTo(logoInkRatio(url, fileRatio), 4);
    }
  });

  it("no lockup block overlaps the eyebrow below it", () => {
    for (const config of boards()) {
      const b = agendaBlocks(config);
      expect(b.lockup!.y + b.lockup!.h).toBeLessThanOrEqual(b.eyebrowY + 0.001);
    }
  });

  it("falls back to the untouched box when a file is not measured", () => {
    const box = { x: 10, y: 12, w: 40, h: 20 };
    expect(logoInkPlacement("/next-2026/logos/not-a-real-file.svg", box)).toEqual(box);
    expect(logoInkRatio("/next-2026/logos/not-a-real-file.svg", 1.7)).toBe(1.7);
  });
});
