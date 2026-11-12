import { describe, expect, it } from "vitest";
import { hasAiLabel, stripPngMetadata } from "./strip-image-metadata";
import { canvaSyncTargets } from "./canva-sync-targets";

function chunk(type: string, data: string) {
  const d = new TextEncoder().encode(data);
  const out = new Uint8Array(12 + d.length);
  new DataView(out.buffer).setUint32(0, d.length);
  out.set(new TextEncoder().encode(type), 4); out.set(d, 8);
  return out;
}
const join = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };

describe("PNG cleaning for Canva billboard sync", () => {
  it("removes hidden AI labels and keeps picture chunks", () => {
    const png = join(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", "hdr"), chunk("iTXt", "ContainsAiGeneratedContent"), chunk("IDAT", "pix"), chunk("IEND", ""));
    const out = stripPngMetadata(png);
    expect(hasAiLabel(png)).toBe(true);
    expect(hasAiLabel(out)).toBe(false);
    expect(out.length).toBe(png.length - 12 - 26);
  });
  it("billboards sync as PNG and carousel files sync every page", () => {
    const t = canvaSyncTargets();
    expect(t.filter((x) => x.group === "billboard").every((x) => x.format === "png")).toBe(true);
    expect(t.find((x) => x.id === "DAHap9Nqgk8")?.allPages).toBe(true);
    expect(t.filter((x) => x.group === "billboard")).toHaveLength(7);
  });
});
