// A published live file version must outrank the artwork built into the kit,
// for the cards, the editor ground and the vendor download alike.

import { afterEach, describe, expect, it } from "vitest";

import { setLondonLiveFiles, londonLiveFile } from "@/lib/next-london-live-files";
import {
  londonSuppliedGroundUrl,
  londonSuppliedMaster,
} from "@/lib/next-london-supplied-masters";

const BUNDLED = "ldn-v32"; // ships with a supplied master
const PLAIN = "ldn-01"; // generated ground, no supplied master

afterEach(() => setLondonLiveFiles([]));

function version(panelId: string, v: number) {
  return {
    id: `${panelId}-${v}`,
    panelId,
    version: v,
    filename: `r00${v}-${panelId}.ai`,
    note: null,
    issued: "2026-09-10",
    trimW: null,
    trimH: null,
    masterUrl: `https://files.example/${panelId}-v${v}.ai`,
    proofUrl: `https://files.example/${panelId}-v${v}.jpg`,
  };
}

describe("London live file versions", () => {
  it("falls back to the built-in artwork when nothing is published", () => {
    expect(londonLiveFile(BUNDLED)).toBeNull();
    expect(londonSuppliedMaster(BUNDLED)?.fromRevision).toBe(1);
    expect(londonSuppliedGroundUrl(PLAIN)).toBeNull();
  });

  it("serves a published version instead of the built-in file", () => {
    setLondonLiveFiles([version(BUNDLED, 1), version(BUNDLED, 2)]);
    const master = londonSuppliedMaster(BUNDLED);
    expect(master?.aiUrl).toBe(`https://files.example/${BUNDLED}-v2.ai`);
    expect(master?.fromRevision).toBe(2);
    expect(londonSuppliedGroundUrl(BUNDLED)).toBe(`https://files.example/${BUNDLED}-v2.jpg`);
  });

  it("gives a sign with no built-in master a live file too", () => {
    setLondonLiveFiles([version(PLAIN, 1)]);
    expect(londonSuppliedMaster(PLAIN)?.filename).toBe(`r001-${PLAIN}.ai`);
    expect(londonSuppliedGroundUrl(PLAIN)).toBe(`https://files.example/${PLAIN}-v1.jpg`);
  });
});
