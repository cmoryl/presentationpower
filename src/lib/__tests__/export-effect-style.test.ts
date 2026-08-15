import { describe, expect, it } from "vitest";

import {
  classifyEffectStyle,
  effectPadPx,
  effectSvg,
  parseDropShadows,
  parseFeather,
  parseFilterBlur,
  type EffectCandidate,
} from "../export-effect-style";

const resolve = (css: string) => {
  const s = (css || "").trim();
  if (!s || s === "transparent" || s === "none") return null;
  const m = /rgba?\(([^)]+)\)/i.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    const hx = (n: number) => Math.round(n).toString(16).padStart(2, "0").toUpperCase();
    return { hex: `${hx(p[0])}${hx(p[1])}${hx(p[2])}`, alpha: p.length > 3 ? p[3] : 1 };
  }
  const hexm = /^#([0-9a-f]{6})$/i.exec(s);
  return hexm ? { hex: hexm[1].toUpperCase(), alpha: 1 } : null;
};

const base: EffectCandidate = {
  filter: "none",
  maskImage: "none",
  mixBlendMode: "normal",
  clipPath: "none",
  opacity: 1,
  hasText: false,
  fill: { hex: "003FC7", alpha: 0.6 },
  gradient: null,
  radiusPx: 24,
  ellipse: false,
};

describe("effect-style parsing", () => {
  it("reads blur radius and drop-shadow layers", () => {
    expect(parseFilterBlur("blur(18px) drop-shadow(0 4px 12px rgba(0,0,0,0.4))")).toBe(18);
    const sh = parseDropShadows("drop-shadow(2px 6px 10px rgba(0,63,199,0.5))", resolve);
    expect(sh).toHaveLength(1);
    expect(sh[0]).toMatchObject({ dx: 2, dy: 6, blurPx: 10 });
    expect(sh[0].color).toEqual({ hex: "003FC7", alpha: 0.5 });
  });

  it("reads a feather ramp from a mask gradient", () => {
    const f = parseFeather(
      "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, transparent 100%)",
      resolve,
    );
    expect(f?.kind).toBe("linear");
    expect(f?.stops.map((s) => s.opacity)).toEqual([1, 1, 0]);
    expect(parseFeather("radial-gradient(circle, #000000 0%, transparent 100%)", resolve)?.kind).toBe(
      "radial",
    );
    expect(parseFeather("none", resolve)).toBeNull();
  });
});

describe("classifyEffectStyle", () => {
  it("accepts a blurred halo with its own paint", () => {
    const style = classifyEffectStyle({ ...base, filter: "blur(24px)" }, resolve);
    expect(style?.blurPx).toBe(24);
  });

  it("rejects text hosts, blend modes and backdrop-sampling filters", () => {
    expect(classifyEffectStyle({ ...base, filter: "blur(12px)", hasText: true }, resolve)).toBeNull();
    expect(
      classifyEffectStyle({ ...base, filter: "blur(12px)", mixBlendMode: "screen" }, resolve),
    ).toBeNull();
    expect(
      classifyEffectStyle({ ...base, filter: "blur(12px) saturate(160%)" }, resolve),
    ).toBeNull();
    expect(
      classifyEffectStyle({ ...base, filter: "blur(12px)", clipPath: "circle(40%)" }, resolve),
    ).toBeNull();
  });

  it("rejects elements with an effect but no paint of their own", () => {
    expect(
      classifyEffectStyle({ ...base, filter: "blur(12px)", fill: null, gradient: null }, resolve),
    ).toBeNull();
  });

  it("rejects elements with no effect at all", () => {
    expect(classifyEffectStyle(base, resolve)).toBeNull();
  });
});

describe("effectSvg", () => {
  const style = classifyEffectStyle(
    {
      ...base,
      filter: "blur(20px) drop-shadow(0 8px 24px rgba(0,0,0,0.4))",
      maskImage: "linear-gradient(180deg, rgba(0,0,0,1) 0%, transparent 100%)",
      ellipse: true,
    },
    resolve,
  )!;

  it("pads the frame so the bloom is not clipped", () => {
    const pad = effectPadPx(style);
    expect(pad).toBeGreaterThan(20);
    const out = effectSvg(style, 200, 100);
    expect(out.padPx).toBe(pad);
    expect(out.frameW).toBe(200 + pad * 2);
    expect(out.frameH).toBe(100 + pad * 2);
  });

  it("emits real blur, shadow and mask primitives with no CSS variables", () => {
    const { svg } = effectSvg(style, 200, 100);
    expect(svg).toContain("<feGaussianBlur");
    expect(svg).toContain("stdDeviation=\"10\"");
    expect(svg).toContain("<feDropShadow");
    expect(svg).toContain("mask=\"url(#m)\"");
    expect(svg).toContain("<ellipse");
    expect(svg).not.toMatch(/var\(|currentColor/);
    expect(svg).toContain("color-interpolation-filters=\"sRGB\"");
  });

  it("is mode-agnostic: identical geometry, measured paint", () => {
    const light = effectSvg(style, 200, 100);
    const darkStyle = classifyEffectStyle(
      {
        ...base,
        fill: { hex: "A1FBF9", alpha: 0.35 },
        filter: "blur(20px) drop-shadow(0 8px 24px rgba(0,0,0,0.4))",
        maskImage: "linear-gradient(180deg, rgba(0,0,0,1) 0%, transparent 100%)",
        ellipse: true,
      },
      resolve,
    )!;
    const dark = effectSvg(darkStyle, 200, 100);
    expect(dark.frameW).toBe(light.frameW);
    expect(dark.frameH).toBe(light.frameH);
    expect(dark.svg).toContain("rgba(161,251,249,0.35)");
    expect(light.svg).toContain("rgba(0,63,199,0.6)");
  });
});
