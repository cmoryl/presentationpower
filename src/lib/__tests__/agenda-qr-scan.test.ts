import jsQR from "jsqr";
import { describe, expect, it } from "vitest";

import {
  agendaBlocks,
  agendaDefault,
  agendaQrBlockers,
  agendaQrPrintQuality,
  type AgendaConfig,
} from "@/lib/next-agenda";
import { qrModulePxForPrint, qrPng, qrRaster, type QrModuleStyle } from "@/lib/qr-print";

/** Decode a rasterised code the way a phone camera would. */
function decode(payload: string, style: QrModuleStyle, modulePx = 8): string | null {
  const raster = qrRaster(payload, { style, modulePx });
  if (!raster) return null;
  const { width, ink } = raster;
  const rgba = new Uint8ClampedArray(width * width * 4);
  for (let i = 0; i < width * width; i += 1) {
    const dark = ink[i] === 1;
    const v = dark ? 0 : 255;
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return jsQR(rgba, width, width)?.data ?? null;
}

const PAYLOADS = [
  "https://presentationpower.lovable.app/events/next/london",
  "https://presentationpower.lovable.app/events/next/london?board=agenda&day=2&division=globallink",
  "www.transperfect.com",
];

const STYLES: QrModuleStyle[] = ["block", "rounded", "dot"];

describe("agenda QR codes decode from every export raster", () => {
  for (const payload of PAYLOADS) {
    for (const style of STYLES) {
      it(`decodes ${style} modules for ${payload.slice(0, 42)}`, () => {
        expect(decode(payload, style)).toBe(payload);
      });
    }
  }

  it("decodes at every density any export can emit", () => {
    const fails: string[] = [];
    for (const payload of PAYLOADS) {
      for (const style of STYLES) {
        for (const px of [4, 6, 8, 10, 12, 16, 20, 24]) {
          if (decode(payload, style, px) !== payload) fails.push(`${style}@${px} ${payload}`);
        }
      }
    }
    expect(fails).toEqual([]);
  });

  it("prints scanner anchors solid whatever the module style", () => {
    const block = qrRaster(PAYLOADS[0], { style: "block", modulePx: 10 })!;
    for (const style of ["dot", "rounded"] as QrModuleStyle[]) {
      const shaped = qrRaster(PAYLOADS[0], { style, modulePx: 10 })!;
      // Sample the top-left finder: identical ink to the plain square version.
      let diff = 0;
      for (let y = 40; y < 110; y += 1) {
        for (let x = 40; x < 110; x += 1) {
          if (block.ink[y * block.width + x] !== shaped.ink[y * shaped.width + x]) diff += 1;
        }
      }
      expect(diff).toBe(0);
    }
  });

  it("encodes a valid PNG the picture-only exports can carry", () => {
    const png = qrPng(PAYLOADS[0], { ink: "#03002C", ground: "#FFFFFF" });
    expect(png).not.toBeNull();
    expect([...png!.bytes.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png!.width).toBe(png!.raster.modules * png!.raster.modulePx);
  });

  it("keeps the picture exports at print density instead of a fixed pixel guess", () => {
    // A1 board code at 96mm still has to land at 300dpi or better.
    const px = qrModulePxForPrint(PAYLOADS[1], 96);
    const raster = qrRaster(PAYLOADS[1], { modulePx: px })!;
    const dpi = raster.width / (96 / 25.4);
    expect(dpi).toBeGreaterThanOrEqual(300);
  });
});

describe("agenda QR scan guards", () => {
  const withQr = (patch: Partial<AgendaConfig> = {}): AgendaConfig => ({
    ...agendaDefault(),
    qrData: PAYLOADS[1],
    ...patch,
  });

  it("passes a normal board", () => {
    expect(agendaQrBlockers(withQr())).toEqual([]);
  });

  it("keeps a real quiet zone around the code", () => {
    const q = agendaQrPrintQuality(withQr())!;
    expect(q.quietMm).toBeCloseTo(q.moduleMm * 4, 5);
    expect(q.moduleMm).toBeGreaterThan(0.6);
  });

  it("blocks modules printed too small to resolve", () => {
    const blockers = agendaQrBlockers(withQr({ qrSize: 12 }));
    expect(blockers.join(" ")).toMatch(/module/i);
  });

  it("blocks shaped modules that lose too much ink at small sizes", () => {
    const square = agendaQrBlockers(withQr({ qrSize: 26 }));
    const dots = agendaQrBlockers(withQr({ qrSize: 26, qrStyle: "dot" }));
    expect(dots.length).toBeGreaterThanOrEqual(square.length);
  });

  it("blocks ink that cannot be read off its plate", () => {
    const blockers = agendaQrBlockers(
      withQr({ qrForeground: "#333333", qrBackground: "#3A3A3A" }),
    );
    expect(blockers.join(" ")).toMatch(/contrast/i);
  });

  it("says nothing when the board carries no code", () => {
    expect(agendaQrBlockers(agendaDefault())).toEqual([]);
  });

  it("places the code inside the safe area on every anchor", () => {
    for (const qrAnchor of ["foot-right", "top-right"] as const) {
      const b = agendaBlocks(withQr({ qrAnchor }));
      expect(b.qr).not.toBeNull();
      expect(b.qr!.x).toBeGreaterThanOrEqual(b.qr!.minX);
      expect(b.qr!.x).toBeLessThanOrEqual(b.qr!.maxX);
      expect(b.qr!.y).toBeGreaterThanOrEqual(b.qr!.minY);
      expect(b.qr!.y).toBeLessThanOrEqual(b.qr!.maxY);
    }
  });
});
