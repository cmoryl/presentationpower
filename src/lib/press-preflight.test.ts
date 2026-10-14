import { describe, it, expect } from "vitest";
import { scorePrintPreflight } from "./press-preflight";

const base = { format: "press" as const, trimWidthIn: 8.5, trimHeightIn: 11, bleedIn: 0.125, images: [], missingFonts: [] };

describe("print preflight", () => {
  it("passes a clean press file with an RGB note", () => {
    const r = scorePrintPreflight(base);
    expect(r[0].id).toBe("ok");
    expect(r.some((i) => i.id === "rgb" && i.level === "warn")).toBe(true);
  });
  it("fails missing bleed", () => {
    expect(scorePrintPreflight({ ...base, bleedIn: 0 }).some((i) => i.id === "bleed" && i.level === "fail")).toBe(true);
  });
  it("fails a low-res image and passes a sharp one", () => {
    const img = { page: 0, src: "/a/photo.jpg", naturalH: 800, fracW: 1, fracH: 0.5 };
    expect(scorePrintPreflight({ ...base, images: [{ ...img, naturalW: 800 }] }).some((i) => i.id.startsWith("lowres"))).toBe(true);
    expect(scorePrintPreflight({ ...base, images: [{ ...img, naturalW: 2600, naturalH: 1700 }] }).some((i) => i.id.startsWith("lowres"))).toBe(false);
  });
  it("fails unloaded fonts, warns thin strokes, skips digital", () => {
    const r = scorePrintPreflight({ ...base, missingFonts: ["Poppins"], thinnestStrokePt: 0.1 });
    expect(r.some((i) => i.id === "font-Poppins" && i.level === "fail")).toBe(true);
    expect(r.some((i) => i.id === "thin-stroke" && i.level === "warn")).toBe(true);
    expect(scorePrintPreflight({ ...base, format: "digital", bleedIn: 0 })).toEqual([]);
  });
});
