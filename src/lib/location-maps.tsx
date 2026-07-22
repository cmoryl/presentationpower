/**
 * Location Maps — stylized SVG world/region maps + division-specific
 * office/hub location data for the `MV-LOC-*` slide module family.
 *
 * Everything renders as pure SVG (no external tiles, no runtime API calls),
 * mirrors the app's aurora/liquid-glass aesthetic, is dark/light mode aware,
 * and is brand-tinted per division. The same primitives are consumed by
 * VariantRenderer.tsx for the web preview and by pptx-export.ts for the
 * embedded PPTX rasterization.
 *
 * Coordinate system for the world map is equirectangular so that pins can
 * be plotted directly from (lat, lon). Continent outlines are hand-drafted
 * abstract blobs — instantly recognizable but intentionally stylized so
 * they read as "corporate infographic" rather than "geographic reference."
 */
import * as React from "react";
import type { SlideMode } from "@/components/slide/SlideChrome";

// ── Projection ────────────────────────────────────────────────────────────
// Equirectangular: full-world viewBox is 1000 × 500.
export const WORLD_VIEWBOX = { w: 1000, h: 500 };

export function projectLatLon(lat: number, lon: number, box = WORLD_VIEWBOX) {
  const x = ((lon + 180) / 360) * box.w;
  const y = ((90 - lat) / 180) * box.h;
  return { x, y };
}

// ── Location data model ───────────────────────────────────────────────────
export type LocationPin = {
  id: string;
  city: string;
  country?: string;
  region: "AMER" | "EMEA" | "APAC" | "LATAM" | "MEA";
  lat: number;
  lon: number;
  role?: "HQ" | "hub" | "office" | "delivery" | "partner";
  label?: string; // optional short label shown next to pin
  /** Per-pin metric values keyed by LocationMetric.id (see world-stats variant). */
  values?: Record<string, number>;
};

/**
 * Metric definition for the MV-LOC-WORLD-STATS variant. A deck can define
 * multiple metrics (e.g. Revenue $M, Employees, Projects delivered) and pick
 * one as active — the world-stats renderer aggregates the active metric
 * across pins by region and headlines the global total.
 */
export type LocationMetric = {
  id: string;
  label: string;
  unit?: string; // e.g. "$M", "%", "hrs"
  format?: "number" | "currency" | "percent";
  precision?: number;
};

export type DivisionLocationSet = {
  brandId: string;
  headline: string;
  subhead?: string;
  pins: LocationPin[];
};

/** Formats a metric value for display in the world-stats variant. */
export function formatMetricValue(
  value: number | undefined,
  metric: LocationMetric | undefined,
): string {
  if (!Number.isFinite(value as number)) return "—";
  const v = value as number;
  const precision = metric?.precision ?? 0;
  const abs = Math.abs(v);
  let numStr: string;
  if (abs >= 1_000_000_000) numStr = `${(v / 1_000_000_000).toFixed(1)}B`;
  else if (abs >= 1_000_000) numStr = `${(v / 1_000_000).toFixed(1)}M`;
  else if (abs >= 10_000) numStr = `${(v / 1_000).toFixed(1)}K`;
  else numStr = v.toFixed(precision);
  const unit = metric?.unit;
  if (!unit) return numStr;
  const isCurrency = metric?.format === "currency" || /^[$€£¥]/.test(unit);
  if (isCurrency) return `${unit}${numStr}`;
  return `${numStr}${unit.startsWith(" ") ? unit : ` ${unit}`}`;
}


// Global TransPerfect network — a curated, real-office subset used as the
// default seed for the enterprise brand and as fallback for any division
// that hasn't declared its own network.
const CORE_TP_NETWORK: LocationPin[] = [
  { id: "nyc", city: "New York", country: "USA", region: "AMER", lat: 40.7128, lon: -74.006, role: "HQ", label: "Global HQ" },
  { id: "sf", city: "San Francisco", country: "USA", region: "AMER", lat: 37.7749, lon: -122.4194, role: "hub" },
  { id: "la", city: "Los Angeles", country: "USA", region: "AMER", lat: 34.0522, lon: -118.2437, role: "office" },
  { id: "chi", city: "Chicago", country: "USA", region: "AMER", lat: 41.8781, lon: -87.6298, role: "office" },
  { id: "bos", city: "Boston", country: "USA", region: "AMER", lat: 42.3601, lon: -71.0589, role: "office" },
  { id: "dc", city: "Washington DC", country: "USA", region: "AMER", lat: 38.9072, lon: -77.0369, role: "office" },
  { id: "mia", city: "Miami", country: "USA", region: "AMER", lat: 25.7617, lon: -80.1918, role: "office" },
  { id: "tor", city: "Toronto", country: "Canada", region: "AMER", lat: 43.6532, lon: -79.3832, role: "office" },
  { id: "mex", city: "Mexico City", country: "Mexico", region: "LATAM", lat: 19.4326, lon: -99.1332, role: "office" },
  { id: "sao", city: "São Paulo", country: "Brazil", region: "LATAM", lat: -23.5505, lon: -46.6333, role: "hub" },
  { id: "bue", city: "Buenos Aires", country: "Argentina", region: "LATAM", lat: -34.6037, lon: -58.3816, role: "office" },
  { id: "lon", city: "London", country: "UK", region: "EMEA", lat: 51.5074, lon: -0.1278, role: "hub", label: "EMEA HQ" },
  { id: "dub", city: "Dublin", country: "Ireland", region: "EMEA", lat: 53.3498, lon: -6.2603, role: "office" },
  { id: "par", city: "Paris", country: "France", region: "EMEA", lat: 48.8566, lon: 2.3522, role: "office" },
  { id: "ams", city: "Amsterdam", country: "Netherlands", region: "EMEA", lat: 52.3676, lon: 4.9041, role: "office" },
  { id: "brl", city: "Berlin", country: "Germany", region: "EMEA", lat: 52.52, lon: 13.405, role: "office" },
  { id: "fra", city: "Frankfurt", country: "Germany", region: "EMEA", lat: 50.1109, lon: 8.6821, role: "office" },
  { id: "zur", city: "Zürich", country: "Switzerland", region: "EMEA", lat: 47.3769, lon: 8.5417, role: "office" },
  { id: "mil", city: "Milan", country: "Italy", region: "EMEA", lat: 45.4642, lon: 9.19, role: "office" },
  { id: "mad", city: "Madrid", country: "Spain", region: "EMEA", lat: 40.4168, lon: -3.7038, role: "office" },
  { id: "bar", city: "Barcelona", country: "Spain", region: "EMEA", lat: 41.3874, lon: 2.1686, role: "office" },
  { id: "sto", city: "Stockholm", country: "Sweden", region: "EMEA", lat: 59.3293, lon: 18.0686, role: "office" },
  { id: "cop", city: "Copenhagen", country: "Denmark", region: "EMEA", lat: 55.6761, lon: 12.5683, role: "office" },
  { id: "war", city: "Warsaw", country: "Poland", region: "EMEA", lat: 52.2297, lon: 21.0122, role: "office" },
  { id: "ist", city: "Istanbul", country: "Türkiye", region: "MEA", lat: 41.0082, lon: 28.9784, role: "office" },
  { id: "dxb", city: "Dubai", country: "UAE", region: "MEA", lat: 25.2048, lon: 55.2708, role: "office" },
  { id: "mum", city: "Mumbai", country: "India", region: "APAC", lat: 19.076, lon: 72.8777, role: "office" },
  { id: "sgp", city: "Singapore", country: "Singapore", region: "APAC", lat: 1.3521, lon: 103.8198, role: "hub", label: "APAC HQ" },
  { id: "hkg", city: "Hong Kong", country: "HK SAR", region: "APAC", lat: 22.3193, lon: 114.1694, role: "office" },
  { id: "sha", city: "Shanghai", country: "China", region: "APAC", lat: 31.2304, lon: 121.4737, role: "office" },
  { id: "bjs", city: "Beijing", country: "China", region: "APAC", lat: 39.9042, lon: 116.4074, role: "office" },
  { id: "tyo", city: "Tokyo", country: "Japan", region: "APAC", lat: 35.6762, lon: 139.6503, role: "office" },
  { id: "sel", city: "Seoul", country: "S. Korea", region: "APAC", lat: 37.5665, lon: 126.978, role: "office" },
  { id: "syd", city: "Sydney", country: "Australia", region: "APAC", lat: -33.8688, lon: 151.2093, role: "office" },
];

// Sub-brand curated sets. Fall back to CORE_TP_NETWORK when a brand isn't
// listed. All coordinates are real; the network selection reflects each
// division's public delivery footprint (curated, not exhaustive).
export const DIVISION_LOCATIONS: Record<string, DivisionLocationSet> = {
  "bm-enterprise": {
    brandId: "bm-enterprise",
    headline: "TransPerfect worldwide",
    subhead: "140+ cities · 6 continents · one integrated network",
    pins: CORE_TP_NETWORK,
  },
  "bm-globallink": {
    brandId: "bm-globallink",
    headline: "GlobalLink production network",
    subhead: "Follow-the-sun localization across every major market",
    pins: CORE_TP_NETWORK.filter((p) =>
      ["nyc", "sf", "lon", "dub", "par", "brl", "ams", "war", "bar", "mil", "sgp", "hkg", "tyo", "sha", "sel", "mum", "syd", "sao"].includes(p.id)
    ),
  },
  "bm-tp-lifesci": {
    brandId: "bm-tp-lifesci",
    headline: "Life Sciences delivery footprint",
    subhead: "Regulatory-grade sites near every major sponsor and CRO hub",
    pins: [
      { id: "nyc", city: "New York", country: "USA", region: "AMER", lat: 40.7128, lon: -74.006, role: "HQ", label: "Life Sciences HQ" },
      { id: "bos", city: "Boston", country: "USA", region: "AMER", lat: 42.3601, lon: -71.0589, role: "hub", label: "Biotech corridor" },
      { id: "rtp", city: "Raleigh-Durham", country: "USA", region: "AMER", lat: 35.7796, lon: -78.6382, role: "hub", label: "Research Triangle" },
      { id: "sf", city: "San Francisco", country: "USA", region: "AMER", lat: 37.7749, lon: -122.4194, role: "office" },
      { id: "chi", city: "Chicago", country: "USA", region: "AMER", lat: 41.8781, lon: -87.6298, role: "office" },
      { id: "sao", city: "São Paulo", country: "Brazil", region: "LATAM", lat: -23.5505, lon: -46.6333, role: "office" },
      { id: "lon", city: "London", country: "UK", region: "EMEA", lat: 51.5074, lon: -0.1278, role: "hub" },
      { id: "dub", city: "Dublin", country: "Ireland", region: "EMEA", lat: 53.3498, lon: -6.2603, role: "office" },
      { id: "bas", city: "Basel", country: "Switzerland", region: "EMEA", lat: 47.5596, lon: 7.5886, role: "hub", label: "Pharma cluster" },
      { id: "fra", city: "Frankfurt", country: "Germany", region: "EMEA", lat: 50.1109, lon: 8.6821, role: "office" },
      { id: "par", city: "Paris", country: "France", region: "EMEA", lat: 48.8566, lon: 2.3522, role: "office" },
      { id: "bar", city: "Barcelona", country: "Spain", region: "EMEA", lat: 41.3874, lon: 2.1686, role: "office" },
      { id: "mum", city: "Mumbai", country: "India", region: "APAC", lat: 19.076, lon: 72.8777, role: "office" },
      { id: "sha", city: "Shanghai", country: "China", region: "APAC", lat: 31.2304, lon: 121.4737, role: "office" },
      { id: "tyo", city: "Tokyo", country: "Japan", region: "APAC", lat: 35.6762, lon: 139.6503, role: "office" },
      { id: "sgp", city: "Singapore", country: "Singapore", region: "APAC", lat: 1.3521, lon: 103.8198, role: "office" },
    ],
  },
  "bm-trial-interactive": {
    brandId: "bm-trial-interactive",
    headline: "Trial Interactive — global trial network",
    subhead: "Regulated eTMF and clinical operations sites",
    pins: [
      { id: "nyc", city: "New York", country: "USA", region: "AMER", lat: 40.7128, lon: -74.006, role: "HQ" },
      { id: "bos", city: "Boston", country: "USA", region: "AMER", lat: 42.3601, lon: -71.0589, role: "hub" },
      { id: "rtp", city: "Raleigh-Durham", country: "USA", region: "AMER", lat: 35.7796, lon: -78.6382, role: "office" },
      { id: "lon", city: "London", country: "UK", region: "EMEA", lat: 51.5074, lon: -0.1278, role: "hub" },
      { id: "bas", city: "Basel", country: "Switzerland", region: "EMEA", lat: 47.5596, lon: 7.5886, role: "office" },
      { id: "brl", city: "Berlin", country: "Germany", region: "EMEA", lat: 52.52, lon: 13.405, role: "office" },
      { id: "war", city: "Warsaw", country: "Poland", region: "EMEA", lat: 52.2297, lon: 21.0122, role: "office" },
      { id: "tyo", city: "Tokyo", country: "Japan", region: "APAC", lat: 35.6762, lon: 139.6503, role: "office" },
      { id: "sgp", city: "Singapore", country: "Singapore", region: "APAC", lat: 1.3521, lon: 103.8198, role: "office" },
      { id: "sha", city: "Shanghai", country: "China", region: "APAC", lat: 31.2304, lon: 121.4737, role: "office" },
    ],
  },
  "bm-tp-legal": {
    brandId: "bm-tp-legal",
    headline: "Legal Tech — global litigation support",
    subhead: "24/7 e-discovery and dispute delivery centers",
    pins: [
      { id: "nyc", city: "New York", country: "USA", region: "AMER", lat: 40.7128, lon: -74.006, role: "HQ" },
      { id: "dc", city: "Washington DC", country: "USA", region: "AMER", lat: 38.9072, lon: -77.0369, role: "hub" },
      { id: "chi", city: "Chicago", country: "USA", region: "AMER", lat: 41.8781, lon: -87.6298, role: "office" },
      { id: "la", city: "Los Angeles", country: "USA", region: "AMER", lat: 34.0522, lon: -118.2437, role: "office" },
      { id: "tor", city: "Toronto", country: "Canada", region: "AMER", lat: 43.6532, lon: -79.3832, role: "office" },
      { id: "lon", city: "London", country: "UK", region: "EMEA", lat: 51.5074, lon: -0.1278, role: "hub" },
      { id: "fra", city: "Frankfurt", country: "Germany", region: "EMEA", lat: 50.1109, lon: 8.6821, role: "office" },
      { id: "par", city: "Paris", country: "France", region: "EMEA", lat: 48.8566, lon: 2.3522, role: "office" },
      { id: "dub", city: "Dublin", country: "Ireland", region: "EMEA", lat: 53.3498, lon: -6.2603, role: "office" },
      { id: "hkg", city: "Hong Kong", country: "HK SAR", region: "APAC", lat: 22.3193, lon: 114.1694, role: "hub" },
      { id: "sgp", city: "Singapore", country: "Singapore", region: "APAC", lat: 1.3521, lon: 103.8198, role: "office" },
      { id: "syd", city: "Sydney", country: "Australia", region: "APAC", lat: -33.8688, lon: 151.2093, role: "office" },
    ],
  },
  "bm-tp-media": {
    brandId: "bm-tp-media",
    headline: "Media & Entertainment worldwide",
    subhead: "Dubbing, subtitling, and localization studios",
    pins: [
      { id: "la", city: "Los Angeles", country: "USA", region: "AMER", lat: 34.0522, lon: -118.2437, role: "HQ" },
      { id: "nyc", city: "New York", country: "USA", region: "AMER", lat: 40.7128, lon: -74.006, role: "hub" },
      { id: "mia", city: "Miami", country: "USA", region: "AMER", lat: 25.7617, lon: -80.1918, role: "office" },
      { id: "mex", city: "Mexico City", country: "Mexico", region: "LATAM", lat: 19.4326, lon: -99.1332, role: "office" },
      { id: "sao", city: "São Paulo", country: "Brazil", region: "LATAM", lat: -23.5505, lon: -46.6333, role: "office" },
      { id: "lon", city: "London", country: "UK", region: "EMEA", lat: 51.5074, lon: -0.1278, role: "hub" },
      { id: "par", city: "Paris", country: "France", region: "EMEA", lat: 48.8566, lon: 2.3522, role: "office" },
      { id: "brl", city: "Berlin", country: "Germany", region: "EMEA", lat: 52.52, lon: 13.405, role: "office" },
      { id: "mad", city: "Madrid", country: "Spain", region: "EMEA", lat: 40.4168, lon: -3.7038, role: "office" },
      { id: "mil", city: "Milan", country: "Italy", region: "EMEA", lat: 45.4642, lon: 9.19, role: "office" },
      { id: "sel", city: "Seoul", country: "S. Korea", region: "APAC", lat: 37.5665, lon: 126.978, role: "office" },
      { id: "tyo", city: "Tokyo", country: "Japan", region: "APAC", lat: 35.6762, lon: 139.6503, role: "office" },
      { id: "mum", city: "Mumbai", country: "India", region: "APAC", lat: 19.076, lon: 72.8777, role: "office" },
    ],
  },
  "bm-tp-games": {
    brandId: "bm-tp-games",
    headline: "Gaming Solutions — global studios",
    subhead: "Player-first localization + audio production",
    pins: [
      { id: "la", city: "Los Angeles", country: "USA", region: "AMER", lat: 34.0522, lon: -118.2437, role: "HQ" },
      { id: "mtl", city: "Montréal", country: "Canada", region: "AMER", lat: 45.5017, lon: -73.5673, role: "hub" },
      { id: "van", city: "Vancouver", country: "Canada", region: "AMER", lat: 49.2827, lon: -123.1207, role: "office" },
      { id: "lon", city: "London", country: "UK", region: "EMEA", lat: 51.5074, lon: -0.1278, role: "hub" },
      { id: "brl", city: "Berlin", country: "Germany", region: "EMEA", lat: 52.52, lon: 13.405, role: "office" },
      { id: "par", city: "Paris", country: "France", region: "EMEA", lat: 48.8566, lon: 2.3522, role: "office" },
      { id: "war", city: "Warsaw", country: "Poland", region: "EMEA", lat: 52.2297, lon: 21.0122, role: "office" },
      { id: "sto", city: "Stockholm", country: "Sweden", region: "EMEA", lat: 59.3293, lon: 18.0686, role: "office" },
      { id: "tyo", city: "Tokyo", country: "Japan", region: "APAC", lat: 35.6762, lon: 139.6503, role: "hub" },
      { id: "sel", city: "Seoul", country: "S. Korea", region: "APAC", lat: 37.5665, lon: 126.978, role: "office" },
      { id: "sha", city: "Shanghai", country: "China", region: "APAC", lat: 31.2304, lon: 121.4737, role: "office" },
      { id: "sgp", city: "Singapore", country: "Singapore", region: "APAC", lat: 1.3521, lon: 103.8198, role: "office" },
    ],
  },
  "bm-tp-digital": {
    brandId: "bm-tp-digital",
    headline: "Digital Solutions — worldwide delivery",
    subhead: "Search, commerce, and CX localization centers",
    pins: CORE_TP_NETWORK.filter((p) =>
      ["nyc", "sf", "chi", "la", "tor", "lon", "dub", "brl", "ams", "par", "mad", "bar", "war", "sgp", "hkg", "tyo", "sel", "sha", "mum", "syd", "sao"].includes(p.id)
    ),
  },
};

export function getDivisionLocationSet(brandId?: string | null): DivisionLocationSet {
  if (brandId && DIVISION_LOCATIONS[brandId]) return DIVISION_LOCATIONS[brandId];
  return DIVISION_LOCATIONS["bm-enterprise"];
}

// ── Continent polygons ────────────────────────────────────────────────────
// Hand-drafted abstract silhouettes in [lon,lat] pairs. Rendered as
// low-poly blobs for a corporate-infographic feel. Not geodetically
// precise — deliberately stylized.
type LonLat = [number, number];
const CONTINENTS: LonLat[][] = [
  // North America
  [
    [-165, 66], [-155, 71], [-140, 72], [-125, 70], [-110, 72], [-95, 74],
    [-82, 73], [-72, 63], [-58, 52], [-63, 45], [-73, 42], [-77, 35],
    [-82, 30], [-89, 29], [-98, 26], [-100, 20], [-107, 24], [-117, 32],
    [-124, 40], [-128, 48], [-135, 56], [-152, 60], [-165, 60],
  ],
  // Central America / Caribbean
  [
    [-92, 17], [-88, 19], [-84, 16], [-80, 10], [-76, 8], [-83, 8], [-88, 12], [-93, 15],
  ],
  // Greenland
  [
    [-52, 82], [-32, 82], [-20, 76], [-24, 68], [-40, 60], [-50, 62], [-55, 72], [-53, 78],
  ],
  // South America
  [
    [-78, 12], [-70, 11], [-60, 8], [-52, 4], [-45, -2], [-38, -8], [-35, -18],
    [-40, -28], [-52, -34], [-58, -40], [-66, -48], [-71, -54], [-73, -46],
    [-72, -36], [-76, -24], [-78, -16], [-80, -6], [-79, 0], [-78, 8],
  ],
  // Europe
  [
    [-10, 60], [-4, 58], [4, 60], [10, 63], [20, 68], [28, 65], [32, 60],
    [30, 52], [28, 46], [22, 42], [15, 39], [8, 43], [-2, 43], [-8, 40],
    [-10, 44], [-6, 50], [-8, 55],
  ],
  // Africa
  [
    [-16, 30], [-12, 22], [-8, 12], [-4, 8], [4, 6], [10, 4], [14, 2], [22, -2],
    [30, -6], [38, -12], [40, -22], [32, -32], [22, -35], [14, -30], [10, -22],
    [12, -12], [16, -4], [18, 8], [16, 18], [22, 22], [30, 24], [34, 30], [30, 34], [22, 32], [12, 34], [-2, 34], [-12, 34],
  ],
  // Middle East (extends off Africa)
  [
    [34, 34], [42, 36], [50, 30], [56, 24], [58, 18], [52, 14], [45, 12], [40, 18], [36, 24], [34, 30],
  ],
  // Asia (India + Central Asia + Russia + China + Korea)
  [
    [30, 66], [50, 70], [70, 74], [95, 76], [130, 72], [155, 68], [175, 64],
    [180, 60], [170, 52], [148, 46], [140, 40], [135, 34], [130, 32], [122, 30],
    [118, 24], [108, 20], [100, 12], [95, 8], [82, 8], [77, 10], [72, 18],
    [68, 26], [60, 30], [52, 36], [44, 42], [38, 46], [40, 54], [36, 62],
  ],
  // Southeast Asia / Indonesia archipelago (single blob)
  [
    [95, 8], [100, 4], [110, 0], [118, -4], [125, -8], [135, -6], [140, 0],
    [135, 4], [125, 6], [118, 8], [108, 8], [100, 10],
  ],
  // Philippines
  [
    [118, 18], [124, 18], [126, 10], [122, 6], [118, 10], [117, 14],
  ],
  // Japan
  [
    [131, 34], [136, 36], [140, 39], [142, 44], [145, 45], [141, 41], [138, 36], [134, 34],
  ],
  // Australia
  [
    [113, -22], [122, -18], [130, -13], [138, -12], [145, -15], [151, -22],
    [153, -28], [149, -37], [141, -38], [130, -32], [120, -32], [115, -30],
  ],
  // New Zealand
  [
    [172, -34], [175, -36], [178, -42], [174, -46], [170, -44], [168, -40],
  ],
  // UK/Ireland
  [
    [-10, 55], [-6, 58], [-2, 59], [1, 55], [1, 51], [-4, 50], [-8, 52],
  ],
  // Iceland
  [
    [-22, 65], [-16, 66], [-14, 63], [-20, 63],
  ],
  // Madagascar
  [
    [43, -12], [50, -16], [48, -22], [44, -25], [42, -20],
  ],
];

function polygonPath(points: LonLat[]): string {
  return (
    points
      .map(([lon, lat], i) => {
        const { x, y } = projectLatLon(lat, lon);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

const CONTINENT_PATHS = CONTINENTS.map(polygonPath).join(" ");

// ── Region viewports ──────────────────────────────────────────────────────
export type RegionKey = "world" | "AMER" | "EMEA" | "APAC" | "LATAM" | "MEA";

const REGION_BOUNDS: Record<Exclude<RegionKey, "world">, { latMin: number; latMax: number; lonMin: number; lonMax: number }> = {
  AMER: { latMin: 8, latMax: 75, lonMin: -170, lonMax: -50 },
  LATAM: { latMin: -56, latMax: 24, lonMin: -110, lonMax: -34 },
  EMEA: { latMin: 30, latMax: 72, lonMin: -12, lonMax: 42 },
  MEA: { latMin: -8, latMax: 42, lonMin: -18, lonMax: 62 },
  APAC: { latMin: -40, latMax: 55, lonMin: 60, lonMax: 180 },
};

function regionViewBox(region: RegionKey): string {
  if (region === "world") return `0 0 ${WORLD_VIEWBOX.w} ${WORLD_VIEWBOX.h}`;
  const b = REGION_BOUNDS[region];
  const tl = projectLatLon(b.latMax, b.lonMin);
  const br = projectLatLon(b.latMin, b.lonMax);
  const pad = 12;
  return `${tl.x - pad} ${tl.y - pad} ${br.x - tl.x + pad * 2} ${br.y - tl.y + pad * 2}`;
}

// ── React component ───────────────────────────────────────────────────────
export type WorldMapProps = {
  pins: LocationPin[];
  region?: RegionKey;
  mode: SlideMode;
  accent: string;
  primary?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Show text labels next to pins for HQ/hub tiers. */
  showLabels?: boolean;
  /** Draw curved arcs between HQs and satellite offices. */
  showSpokes?: boolean;
  /** Aria label for the whole map. */
  ariaLabel?: string;
  /** Optional metric to visualize — pins are scaled/colored by value and a legend is drawn. */
  metric?: LocationMetric;
  metricId?: string;
};

/**
 * WorldMap — the shared stylized SVG map. All `MV-LOC-*` variants render
 * through this one component so brand tint, dark/light, and pin styling
 * stay consistent.
 */
export function WorldMap({
  pins,
  region = "world",
  mode,
  accent,
  primary,
  className,
  style,
  showLabels = true,
  showSpokes = false,
  ariaLabel = "Global locations map",
  metric,
  metricId,
}: WorldMapProps) {

  const isDark = mode === "dark";
  const land = isDark ? "rgba(255,255,255,0.055)" : "rgba(3,0,44,0.055)";
  const landStroke = isDark ? "rgba(255,255,255,0.12)" : "rgba(3,0,44,0.16)";
  const graticule = isDark ? "rgba(255,255,255,0.05)" : "rgba(3,0,44,0.05)";
  const pinCore = accent;
  const pinRing = isDark ? "#ffffff" : "#03002C";
  const labelColor = isDark ? "rgba(255,255,255,0.86)" : "rgba(3,0,44,0.78)";
  const labelHalo = isDark ? "rgba(3,0,44,0.6)" : "rgba(255,255,255,0.85)";

  const vb = regionViewBox(region);

  // Longitude/latitude graticule lines (subtle)
  const meridians: number[] = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  const parallels: number[] = [-60, -30, 0, 30, 60];

  // Filter pins to region viewport if not world
  const visiblePins = React.useMemo(() => {
    if (region === "world") return pins;
    const b = REGION_BOUNDS[region];
    return pins.filter((p) => p.lat >= b.latMin && p.lat <= b.latMax && p.lon >= b.lonMin && p.lon <= b.lonMax);
  }, [pins, region]);

  // Optionally build spoke arcs from HQ pins to the rest
  const spokes = React.useMemo(() => {
    if (!showSpokes) return [] as { d: string; opacity: number }[];
    const hqs = visiblePins.filter((p) => p.role === "HQ");
    const primaryHq = hqs[0] ?? visiblePins.find((p) => p.role === "hub");
    if (!primaryHq) return [];
    const src = projectLatLon(primaryHq.lat, primaryHq.lon);
    return visiblePins
      .filter((p) => p.id !== primaryHq.id)
      .map((p) => {
        const dst = projectLatLon(p.lat, p.lon);
        const mx = (src.x + dst.x) / 2;
        const my = (src.y + dst.y) / 2 - Math.abs(dst.x - src.x) * 0.18 - 12;
        return {
          d: `M${src.x.toFixed(1)} ${src.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${dst.x.toFixed(1)} ${dst.y.toFixed(1)}`,
          opacity: p.role === "hub" ? 0.55 : 0.32,
        };
      });
  }, [visiblePins, showSpokes]);

  const glow = `url(#tp-pin-glow)`;

  // ── Metric scale ────────────────────────────────────────────────────────
  const activeMetricId = metricId ?? metric?.id;
  const metricStats = React.useMemo(() => {
    if (!activeMetricId) return null;
    const vals = visiblePins
      .map((p) => p.values?.[activeMetricId])
      .filter((v): v is number => Number.isFinite(v as number));
    if (vals.length === 0) return null;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { min, max, range: Math.max(1e-9, max - min) };
  }, [visiblePins, activeMetricId]);
  const scaleFor = React.useCallback(
    (v: number | undefined) => {
      if (!metricStats || !Number.isFinite(v as number)) return null;
      return Math.max(0, Math.min(1, ((v as number) - metricStats.min) / metricStats.range));
    },
    [metricStats],
  );


  return (
    <svg
      viewBox={vb}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    >
      <defs>
        <radialGradient id="tp-pin-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity={0.55} />
          <stop offset="60%" stopColor={accent} stopOpacity={0.14} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="tp-metric-scale" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
          <stop offset="100%" stopColor={accent} stopOpacity={1} />
        </linearGradient>
        <linearGradient id="tp-map-wash" x1="0" y1="0" x2="0" y2="1">

          <stop offset="0%" stopColor={accent} stopOpacity={isDark ? 0.08 : 0.05} />
          <stop offset="100%" stopColor={primary ?? accent} stopOpacity={isDark ? 0.02 : 0.02} />
        </linearGradient>
      </defs>

      {/* Subtle brand wash behind the map */}
      <rect x={0} y={0} width={WORLD_VIEWBOX.w} height={WORLD_VIEWBOX.h} fill="url(#tp-map-wash)" />

      {/* Graticule */}
      <g stroke={graticule} strokeWidth={0.6} fill="none">
        {meridians.map((lon) => {
          const { x } = projectLatLon(0, lon);
          return <line key={`m${lon}`} x1={x} x2={x} y1={0} y2={WORLD_VIEWBOX.h} />;
        })}
        {parallels.map((lat) => {
          const { y } = projectLatLon(lat, 0);
          return <line key={`p${lat}`} x1={0} x2={WORLD_VIEWBOX.w} y1={y} y2={y} />;
        })}
      </g>

      {/* Continents */}
      <path d={CONTINENT_PATHS} fill={land} stroke={landStroke} strokeWidth={0.75} strokeLinejoin="round" />

      {/* Spoke arcs (optional) */}
      {spokes.length > 0 && (
        <g fill="none" stroke={accent} strokeWidth={1.1} strokeLinecap="round">
          {spokes.map((s, i) => (
            <path key={i} d={s.d} opacity={s.opacity} strokeDasharray="2 3" />
          ))}
        </g>
      )}

      {/* Pin glows — scale radius by metric when active */}
      <g>
        {visiblePins.map((p) => {
          const { x, y } = projectLatLon(p.lat, p.lon);
          const baseR = p.role === "HQ" ? 26 : p.role === "hub" ? 20 : 14;
          const t = activeMetricId ? scaleFor(p.values?.[activeMetricId]) : null;
          const r = t == null ? baseR : 14 + t * 22;
          return <circle key={`g-${p.id}`} cx={x} cy={y} r={r} fill={glow} opacity={t == null ? 1 : 0.5 + t * 0.5} />;
        })}
      </g>

      {/* Pins */}
      <g>
        {visiblePins.map((p) => {
          const { x, y } = projectLatLon(p.lat, p.lon);
          const isHq = p.role === "HQ";
          const isHub = p.role === "hub";
          const t = activeMetricId ? scaleFor(p.values?.[activeMetricId]) : null;
          const baseCore = isHq ? 5.4 : isHub ? 4.4 : 3.2;
          const core = t == null ? baseCore : 3.2 + t * 5.8;
          const fill = t == null ? pinCore : accent;
          const fillOpacity = t == null ? 1 : 0.35 + t * 0.65;
          const val = activeMetricId ? p.values?.[activeMetricId] : undefined;
          const tip = activeMetricId && metric
            ? `${p.city}${p.country ? `, ${p.country}` : ""} — ${metric.label}: ${formatMetricValue(val, metric)}`
            : `${p.city}${p.country ? `, ${p.country}` : ""}${p.label ? ` — ${p.label}` : ""}`;
          return (
            <g key={`pin-${p.id}`} style={{ cursor: "default" }}>
              <title>{tip}</title>
              <circle cx={x} cy={y} r={core + 1.6} fill={pinRing} opacity={0.85} />
              <circle cx={x} cy={y} r={core} fill={fill} fillOpacity={fillOpacity} />
              {(isHq || (t != null && t > 0.75)) && (
                <circle cx={x} cy={y} r={core + 4.8} fill="none" stroke={accent} strokeWidth={0.8} opacity={0.7} />
              )}
              {/* Invisible larger hit target so browser tooltips fire reliably */}
              <circle cx={x} cy={y} r={Math.max(10, core + 6)} fill="transparent" pointerEvents="all" />
            </g>
          );
        })}
      </g>


      {/* Labels — HQ + hub tiers, or all when the pin count is small */}
      {showLabels && (
        <g fontFamily="Geist, system-ui, sans-serif" fontSize={9} style={{ paintOrder: "stroke" }}>
          {visiblePins
            .filter((p) => visiblePins.length <= 12 || p.role === "HQ" || p.role === "hub")
            .map((p) => {
              const { x, y } = projectLatLon(p.lat, p.lon);
              const dx = p.lon > 130 ? -8 : 8;
              const anchor: "start" | "end" = p.lon > 130 ? "end" : "start";
              return (
                <text
                  key={`t-${p.id}`}
                  x={x + dx}
                  y={y + 3}
                  fill={labelColor}
                  stroke={labelHalo}
                  strokeWidth={2}
                  fontWeight={p.role === "HQ" ? 600 : 500}
                  textAnchor={anchor}
                >
                  {p.label ? `${p.city} — ${p.label}` : p.city}
                </text>
              );
            })}
        </g>
      )}
    </svg>
  );
}

// ── Aggregate helpers ─────────────────────────────────────────────────────
export function regionCounts(pins: LocationPin[]): Record<LocationPin["region"], number> {
  const acc = { AMER: 0, EMEA: 0, APAC: 0, LATAM: 0, MEA: 0 } as Record<LocationPin["region"], number>;
  for (const p of pins) acc[p.region] = (acc[p.region] ?? 0) + 1;
  return acc;
}

export const REGION_LABELS: Record<LocationPin["region"], string> = {
  AMER: "Americas",
  EMEA: "Europe",
  APAC: "Asia-Pacific",
  LATAM: "Latin America",
  MEA: "Middle East & Africa",
};
