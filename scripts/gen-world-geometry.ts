/**
 * Generates src/lib/world-geometry.ts — accurate Natural Earth 1:110m land and
 * country geometry, projected into the app's 1000x500 equirectangular viewBox
 * so it lines up exactly with projectLatLon().
 *
 * Source data: world-atlas@2 (Natural Earth, public domain).
 * Run: bun scripts/gen-world-geometry.ts
 */
import { feature, mesh } from "topojson-client";
import { writeFileSync } from "node:fs";

const W = 1000;
const H = 500;

const project = (lon: number, lat: number): [number, number] => [
  ((lon + 180) / 360) * W,
  ((90 - lat) / 180) * H,
];

const round = (n: number) => Math.round(n * 10) / 10;

async function load(name: string) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/world-atlas@2/${name}`);
  if (!res.ok) throw new Error(`fetch ${name} failed ${res.status}`);
  return res.json();
}

/**
 * Splits a projected point run wherever it jumps the antimeridian, so a ring
 * spanning ±180 (Russia, Antarctica, Fiji) never draws a straight line right
 * across the map.
 */
function splitWrap(pts: [number, number][]): [number, number][][] {
  const out: [number, number][][] = [];
  let run: [number, number][] = [];
  for (const p of pts) {
    const prev = run[run.length - 1];
    if (prev && Math.abs(p[0] - prev[0]) > W / 2) {
      if (run.length > 1) out.push(run);
      run = [];
    }
    run.push(p);
  }
  if (run.length > 1) out.push(run);
  return out;
}

function projectRun(coords: [number, number][]): [number, number][] {
  return coords.map(([lon, lat]) => {
    const [x, y] = project(lon, lat);
    return [round(x), round(y)] as [number, number];
  });
}

function runToPath(run: [number, number][], close: boolean): string {
  const d = run.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  return close ? `${d}Z` : d;
}

function ringToPath(ring: [number, number][]): string {
  return splitWrap(projectRun(ring))
    .map((run) => runToPath(run, true))
    .join(" ");
}

function lineToPath(line: [number, number][]): string {
  return splitWrap(projectRun(line))
    .map((run) => runToPath(run, false))
    .join(" ");
}

const landTopo = await load("land-110m.json");
const countriesTopo = await load("countries-110m.json");

const land = feature(landTopo, landTopo.objects.land) as any;
const rings: [number, number][][] = [];
for (const f of land.features ?? [land]) {
  const g = f.geometry ?? f;
  if (g.type === "Polygon") rings.push(...g.coordinates);
  else if (g.type === "MultiPolygon") for (const poly of g.coordinates) rings.push(...poly);
}

const landPaths = rings.map(ringToPath);

const borderMesh = mesh(
  countriesTopo,
  countriesTopo.objects.countries,
  (a: unknown, b: unknown) => a !== b,
) as { coordinates: [number, number][][] };
const borderPaths = borderMesh.coordinates.map(lineToPath);

const coastMesh = mesh(landTopo, landTopo.objects.land) as {
  coordinates: [number, number][][];
};
const coastPaths = coastMesh.coordinates.map(lineToPath);

// Projected rings, flattened as x,y pairs, for point-in-polygon rasterisation.
const flatRings = rings.flatMap((ring) => splitWrap(projectRun(ring))).map((run) => run.flat());

const out = `/**
 * GENERATED FILE — do not edit by hand.
 * Run: bun scripts/gen-world-geometry.ts
 *
 * Accurate Natural Earth 1:110m world geometry (public domain, via
 * world-atlas@2), projected into the app's 1000x500 equirectangular viewBox.
 * Because the projection is identical to projectLatLon(), every pin lands on
 * its true coordinate — these maps are geographically exact, not stylised.
 */

/** Land polygons as SVG path data (fill-rule: nonzero). */
export const WORLD_LAND_PATHS: readonly string[] = ${JSON.stringify(landPaths)};

/** All land as one path string. */
export const WORLD_LAND_PATH = WORLD_LAND_PATHS.join(" ");

/** Coastline as open polylines (stroke only, no fill artefacts). */
export const WORLD_COAST_PATH = ${JSON.stringify(coastPaths.join(" "))};

/** Internal country borders as open polylines. */
export const WORLD_BORDER_PATH = ${JSON.stringify(borderPaths.join(" "))};

/** Land rings flattened to [x0,y0,x1,y1,...] for point-in-polygon tests. */
export const WORLD_LAND_RINGS: readonly (readonly number[])[] = ${JSON.stringify(flatRings)};
`;

writeFileSync("src/lib/world-geometry.ts", out);
console.log(
  `wrote src/lib/world-geometry.ts — ${landPaths.length} rings, ${(out.length / 1024).toFixed(0)}KB`,
);
