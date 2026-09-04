import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOGO_WALL,
  MAX_WALL_COLUMNS,
  MAX_WALL_GAP,
  MAX_WALL_SCALE,
  MIN_WALL_COLUMNS,
  patchLogoWall,
  resolveLogoWall,
  wallLogoMaxHeight,
  wallLogoMaxWidth,
} from "@/lib/logo-wall";

describe("growth-proof logo wall settings", () => {
  it("falls back to the module default", () => {
    expect(resolveLogoWall(undefined)).toEqual(DEFAULT_LOGO_WALL);
    expect(resolveLogoWall({})).toEqual(DEFAULT_LOGO_WALL);
  });

  it("clamps columns, size and spacing to safe bounds", () => {
    expect(resolveLogoWall({ columns: 99, scale: 9, gap: 900 })).toEqual({
      columns: MAX_WALL_COLUMNS,
      scale: MAX_WALL_SCALE,
      gap: MAX_WALL_GAP,
    });
    expect(resolveLogoWall({ columns: 0, scale: 0.1, gap: -20 }).columns).toBe(MIN_WALL_COLUMNS);
    expect(resolveLogoWall({ columns: 3.6 }).columns).toBe(4);
  });

  it("keeps untouched values when patching one control", () => {
    const patched = patchLogoWall({ columns: 3, scale: 1.2, gap: 20 }, { gap: 6 });
    expect(patched).toEqual({ columns: 3, scale: 1.2, gap: 6 });
  });

  it("maps the size multiplier to CSS caps inside the tile", () => {
    expect(wallLogoMaxHeight(1)).toBe("68%");
    expect(wallLogoMaxWidth(1)).toBe("86%");
    expect(wallLogoMaxWidth(1.6)).toBe("100%");
    expect(wallLogoMaxHeight(0.6)).toBe("41%");
  });
});
