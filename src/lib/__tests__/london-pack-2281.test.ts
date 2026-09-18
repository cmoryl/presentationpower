// The 18 September 2026 London print pack is the artwork in force.
//
// Two things must stay true or a vendor gets the wrong file:
//  * a dimensioned site survey or a cut template in the delivery is reference
//    only — it must never paint a sign ground or be served as a master;
//  * every finished artwork area resolves to the pack, not to anything bundled
//    earlier, unless a newer live file has been published from the kit.

import { beforeEach, describe, expect, it } from "vitest";

import { setLondonLiveFiles } from "@/lib/next-london-live-files";
import {
  LONDON_PACK_AREAS,
  LONDON_PACK_ISSUE,
  isLondonPackArea,
  londonPackArea,
  londonPackArtwork,
  londonPackReference,
  londonPackScale,
} from "@/lib/next-london-pack-2281";
import {
  LONDON_SUPPLIED_MASTERS,
  londonPanelArtworkUrl,
  londonSuppliedMaster,
} from "@/lib/next-london-supplied-masters";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const artwork = LONDON_PACK_AREAS.filter((a) => a.kind === "artwork");
const reference = LONDON_PACK_AREAS.filter((a) => a.kind !== "artwork");

describe("london print pack, 18 Sep 2026", () => {
  beforeEach(() => {
    setLondonLiveFiles([]);
  });

  it("covers every area exactly once, with a master and a proof page", () => {
    const ids = LONDON_PACK_AREAS.map((a) => a.panelId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const area of LONDON_PACK_AREAS) {
      expect(area.masterUrl).toMatch(/^\/__l5e\/assets-v1\//);
      expect(area.masterFilename.length).toBeGreaterThan(3);
      expect(area.pages.length).toBeGreaterThan(0);
      expect(area.proofUrls.length).toBe(area.pages.length);
    }
  });

  it("lands every area on a real panel", () => {
    const known = new Set(LONDON_PANELS.map((p) => p.id));
    for (const area of LONDON_PACK_AREAS) expect(known.has(area.panelId)).toBe(true);
  });

  it("keeps survey photographs and cut templates out of the artwork", () => {
    expect(reference.length).toBeGreaterThan(0);
    for (const area of reference) {
      expect(isLondonPackArea(area.panelId)).toBe(false);
      expect(londonPackArtwork(area.panelId)).toBeNull();
      expect(londonPackReference(area.panelId)).not.toBeNull();
      expect(londonSuppliedMaster(area.panelId)).toBeNull();
      expect(LONDON_SUPPLIED_MASTERS.some((m) => m.panelId === area.panelId)).toBe(false);
    }
  });

  it("serves the pack artwork as the panel artwork in force", () => {
    for (const area of artwork) {
      const master = londonSuppliedMaster(area.panelId);
      expect(master?.aiUrl).toBe(area.masterUrl);
      expect(master?.issued).toBe(LONDON_PACK_ISSUE.issued);
      expect(londonPanelArtworkUrl(area.panelId)).toBe(area.proofUrls[0]);
    }
  });

  it("still lets a newly published live file beat the pack", () => {
    const area = artwork[0]!;
    setLondonLiveFiles([
      {
        id: "lf-pack-1",
        panelId: area.panelId,
        version: 9,
        filename: "later.ai",
        note: null,
        issued: "2026-09-20",
        trimW: null,
        trimH: null,
        masterUrl: "https://example.test/later.ai",
        proofUrl: "https://example.test/later.jpg",
      },
    ]);
    expect(londonPanelArtworkUrl(area.panelId)).toBe("https://example.test/later.jpg");
    expect(londonSuppliedMaster(area.panelId)?.aiUrl).toBe("https://example.test/later.ai");
  });

  it("never lets a scaled master read as full size", () => {
    const byId = new Map(LONDON_PANELS.map((p) => [p.id, p] as const));
    for (const area of LONDON_PACK_AREAS) {
      const panel = byId.get(area.panelId)!;
      if (!panel.trimW || !panel.trimH) continue;
      const scale = londonPackScale(area.panelId, panel.trimW, panel.trimH);
      expect(scale).not.toBeNull();
      const longest = Math.max(area.pages[0]!.wMm, area.pages[0]!.hMm);
      const trim = Math.max(panel.trimW, panel.trimH);
      if (longest < trim * 0.9) expect(scale!.label).toContain("1:");
      else expect(scale!.label).toBe("Supplied full size");
    }
  });

  it("carries an honest caveat where the supplied artboard disagrees with the trim", () => {
    const warned = LONDON_PACK_AREAS.filter((a) => a.warning);
    expect(warned.length).toBeGreaterThan(0);
    for (const area of warned) {
      expect(londonPackArea(area.panelId)?.warning).toBe(area.warning);
      const master = londonSuppliedMaster(area.panelId);
      if (master) expect(master.note).toContain(area.warning!.slice(0, 24));
    }
  });
});
