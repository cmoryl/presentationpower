import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORBIT_FACE_DARK,
  DEFAULT_ORBIT_FACE_LIGHT,
  isDefaultOrbitFace,
  MAX_RING_WIDTH,
  normalizeOrbitColor,
  orbitDotColor,
  orbitRingColor,
  patchOrbitStyle,
  resetOrbitFace,
  resolveOrbitFace,
  resolveOrbitStyle,
} from "../orbit-style";

describe("orbit style", () => {
  it("defaults both faces when nothing is authored", () => {
    const style = resolveOrbitStyle(undefined);
    expect(style.light).toEqual(DEFAULT_ORBIT_FACE_LIGHT);
    expect(style.dark).toEqual(DEFAULT_ORBIT_FACE_DARK);
    expect(isDefaultOrbitFace(style.light, "light")).toBe(true);
    expect(isDefaultOrbitFace(style.dark, "dark")).toBe(true);
  });

  it("clamps thickness, opacity and dot size and validates colours", () => {
    const style = resolveOrbitStyle({
      light: { ringWidth: 99, ringOpacity: -10, dotSize: 500, ringColor: "nope" },
      dark: { ringColor: "#a1fbf9", dotColor: "#FFF", dotStyle: "square" },
    });
    expect(style.light.ringWidth).toBe(MAX_RING_WIDTH);
    expect(style.light.ringOpacity).toBe(15);
    expect(style.light.dotSize).toBe(22);
    expect(style.light.ringColor).toBeNull();
    expect(style.dark.ringColor).toBe("#A1FBF9");
    expect(style.dark.dotColor).toBe("#FFF");
    expect(style.dark.dotStyle).toBe("square");
    expect(normalizeOrbitColor("#003FC7")).toBe("#003FC7");
    expect(normalizeOrbitColor(12)).toBeNull();
  });

  it("patches one face without touching the other, and resets per face", () => {
    const patched = patchOrbitStyle(undefined, "dark", { ringWidth: 4, dotStyle: "hollow" });
    expect(patched.dark.ringWidth).toBe(4);
    expect(patched.dark.dotStyle).toBe("hollow");
    expect(patched.light).toEqual(DEFAULT_ORBIT_FACE_LIGHT);

    const reset = resetOrbitFace(patched, "dark");
    expect(reset.dark).toEqual(DEFAULT_ORBIT_FACE_DARK);

    expect(resolveOrbitFace(patched, "dark").ringWidth).toBe(4);
    expect(resolveOrbitFace(patched, "light").ringWidth).toBe(1);
  });

  it("falls back to the accent for ring and to the ring for dots", () => {
    const face = resolveOrbitFace({ light: { ringColor: "#EC388A" } }, "light");
    expect(orbitRingColor(face, "#003FC7")).toBe("#EC388A");
    expect(orbitDotColor(face, "#003FC7")).toBe("#EC388A");
    const plain = resolveOrbitFace(undefined, "light");
    expect(orbitRingColor(plain, "#003FC7")).toBe("#003FC7");
    expect(orbitDotColor(plain, "#003FC7")).toBe("#003FC7");
  });
});
