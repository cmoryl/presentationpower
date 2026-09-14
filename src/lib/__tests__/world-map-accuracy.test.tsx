/**
 * Proves the slide maps are geographically exact (not stylised blobs) and that
 * every map style renders the same real geometry.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  WorldMap,
  MAP_STYLES,
  coerceMapStyle,
  landDots,
  projectLatLon,
  type LocationPin,
} from "@/lib/location-maps";
import { WORLD_LAND_PATH, WORLD_COAST_PATH, WORLD_BORDER_PATH } from "@/lib/world-geometry";

const pins: LocationPin[] = [
  { id: "lon", city: "London", region: "EMEA", lat: 51.5072, lon: -0.1276, role: "HQ" },
  { id: "nyc", city: "New York", region: "AMER", lat: 40.7128, lon: -74.006, role: "hub" },
];

/** Nearest halftone dot distance — a dot field on true land puts one close to any city. */
function nearestDot(lat: number, lon: number) {
  const { x, y } = projectLatLon(lat, lon);
  let best = Infinity;
  for (const d of landDots(7.5)) best = Math.min(best, Math.hypot(d.x - x, d.y - y));
  return best;
}

describe("world map geometry", () => {
  it("carries real coastline, border and land data", () => {
    expect(WORLD_LAND_PATH.length).toBeGreaterThan(50_000);
    expect(WORLD_COAST_PATH.length).toBeGreaterThan(10_000);
    expect(WORLD_BORDER_PATH.length).toBeGreaterThan(10_000);
  });

  it("puts land dots on real cities and none in open ocean", () => {
    // Cities: a dot within one lattice step.
    for (const [lat, lon] of [
      [51.5, -0.13], // London
      [35.68, 139.69], // Tokyo
      [-33.87, 151.21], // Sydney
      [-23.55, -46.63], // São Paulo
      [1.35, 103.82], // Singapore
    ] as [number, number][]) {
      expect(nearestDot(lat, lon)).toBeLessThan(9);
    }
    // Mid-ocean points: no dot nearby.
    for (const [lat, lon] of [
      [30, -40], // mid Atlantic
      [-20, -120], // south Pacific
      [-40, 80], // Indian Ocean
    ] as [number, number][]) {
      expect(nearestDot(lat, lon)).toBeGreaterThan(9);
    }
  });

  it("maps legacy texture values onto the style catalog", () => {
    expect(coerceMapStyle("dots")).toBe("halftone");
    expect(coerceMapStyle("solid")).toBe("silhouette");
    expect(coerceMapStyle("nonsense")).toBe("halftone");
    expect(coerceMapStyle("contour")).toBe("contour");
  });

  it("renders every style with the real geometry and the pins in place", () => {
    for (const style of MAP_STYLES) {
      const svg = renderToStaticMarkup(
        <WorldMap
          pins={pins}
          mode="light"
          accent="#003FC7"
          primary="#03002C"
          mapStyle={style.id}
          animate={false}
        />,
      );
      // Real geometry present in some form (fill path, coastline or dots).
      const hasGeometry =
        svg.includes(WORLD_LAND_PATH.slice(0, 40)) ||
        svg.includes(WORLD_COAST_PATH.slice(0, 40)) ||
        /<circle[^>]*r="1/.test(svg);
      expect(hasGeometry, `${style.id} drew no land`).toBe(true);
      expect(svg).toContain("London");
      expect(svg).toContain("New York");
    }
  });

  it("offers ten distinct styles", () => {
    expect(new Set(MAP_STYLES.map((s) => s.id)).size).toBe(10);
  });
});
