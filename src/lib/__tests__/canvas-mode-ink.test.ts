import { describe, expect, it } from "vitest";
import { isNeutralInk, retintItemsForMode } from "../canvas-mode-ink";
import type { CanvasItem } from "../canvas-studio";

const box = { x: 0, y: 0, w: 400, h: 100, z: 1 };

const text = (color?: string, id = "t1"): CanvasItem =>
  ({
    ...box,
    id,
    type: "text",
    text: "Hello",
    size: 48,
    weight: 600,
    align: "left",
    ...(color ? { color } : {}),
  }) as CanvasItem;

describe("isNeutralInk", () => {
  it("treats brand navy ink and greys as neutral", () => {
    for (const c of ["#03002C", "#000000", "#111111", "rgba(3,0,44,0.72)", "#FFFFFF", "#F2F2F2"])
      expect(isNeutralInk(c)).toBe(true);
  });
  it("leaves real hues alone", () => {
    for (const c of ["#E53D2E", "#003FC7", "#A1FBF9", "#FFEB66", "#EC388A"])
      expect(isNeutralInk(c)).toBe(false);
  });
});

describe("retintItemsForMode", () => {
  it("flips baked dark copy to light ink when switching to dark", () => {
    const { items, changed } = retintItemsForMode([text("#03002C")], "light", "dark");
    expect(changed).toBe(1);
    expect((items[0] as { color: string }).color).toBe("#FFFFFF");
  });

  it("flips baked light copy back to dark ink when switching to light", () => {
    const { items } = retintItemsForMode([text("#FFFFFF")], "dark", "light");
    expect((items[0] as { color: string }).color).toBe("#03002C");
  });

  it("preserves muted emphasis tiers instead of forcing full-strength ink", () => {
    const { items } = retintItemsForMode([text("rgba(3,0,44,0.6)")], "light", "dark");
    const color = (items[0] as { color: string }).color;
    expect(color.startsWith("rgba(255,255,255,")).toBe(true);
    expect(Number(color.match(/,([\d.]+)\)$/)![1])).toBeLessThan(1);
  });

  it("never touches accent hues or implicit ink", () => {
    const brandRed = text("#E53D2E", "a");
    const implicit = text(undefined, "b");
    const { items, changed } = retintItemsForMode([brandRed, implicit], "light", "dark");
    expect(changed).toBe(0);
    expect(items[0]).toEqual(brandRed);
    expect(items[1]).toEqual(implicit);
  });

  it("re-plates neutral surfaces and keeps their opacity", () => {
    const surface = {
      ...box,
      id: "s1",
      type: "surface",
      fill: "rgba(255,255,255,0.55)",
      radius: 24,
      opacity: 1,
      stroke: "#03002C",
    } as CanvasItem;
    const { items } = retintItemsForMode([surface], "light", "dark");
    const next = items[0] as { fill: string; stroke: string };
    expect(next.fill).toBe("rgba(10,8,48,0.55)");
    expect(next.stroke).toBe("#FFFFFF");
  });

  it("keeps modules that were following the slide mode in sync", () => {
    const mod = { ...box, id: "m1", type: "module", variantId: "MV-X", fit: "contain", mode: "light" } as CanvasItem;
    const pinned = { ...box, id: "m2", type: "module", variantId: "MV-Y", fit: "contain", mode: "dark" } as CanvasItem;
    const { items } = retintItemsForMode([mod, pinned], "light", "dark");
    expect((items[0] as { mode: string }).mode).toBe("dark");
    expect((items[1] as { mode: string }).mode).toBe("dark");
  });

  it("is a no-op when the mode does not change", () => {
    const { changed } = retintItemsForMode([text("#03002C")], "light", "light");
    expect(changed).toBe(0);
  });

  it("is idempotent across a double flip for already-correct ink", () => {
    const once = retintItemsForMode([text("#03002C")], "light", "dark");
    const twice = retintItemsForMode(once.items, "dark", "dark");
    expect(twice.changed).toBe(0);
  });
});
