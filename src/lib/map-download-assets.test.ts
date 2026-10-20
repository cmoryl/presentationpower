// @vitest-environment jsdom
import { expect, it, vi } from "vitest";

const embed = vi.hoisted(() => vi.fn(async () => { throw new Error("Logo unavailable"); }));
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/export-self-contained-svg", () => ({ selfContainedSvg: embed }));
vi.mock("@/lib/save-file", () => ({ saveFile: save }));
vi.mock("@/lib/next-london-floormap-svg", () => ({
  floorMapSvg: () => '<svg xmlns="http://www.w3.org/2000/svg"><image href="/missing.svg"/></svg>',
  floorMapSheetSize: () => ({ w: 800, h: 600 }),
  assetMapSvg: () => "<svg/>",
}));

import { downloadFloorMapSvg, mapPngBlob } from "./next-london-floormap-export";
import { exportQeiiFloorsPdf } from "./next-london-qeii-pdf";

it("blocks a floor SVG instead of downloading a missing logo", async () => {
  await expect(downloadFloorMapSvg("GF", { panels: [] })).rejects.toThrow("Logo unavailable");
  expect(save).not.toHaveBeenCalled();
});

it("blocks raster map inputs used for PDFs when artwork cannot be embedded", async () => {
  await expect(mapPngBlob("<svg/>", 800, 600)).rejects.toThrow("Logo unavailable");
});

it("blocks the all-floor PDF instead of dropping a failed logo or floor", async () => {
  await expect(exportQeiiFloorsPdf([{ title: "Level 4", svg: "<svg/>" }], "signage"))
    .rejects.toThrow("Level 4: PDF not downloaded — Logo unavailable");
});