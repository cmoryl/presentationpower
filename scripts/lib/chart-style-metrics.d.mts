// Types for the plain-JS chart style metrics helper so the vitest contract in
// src/lib/__tests__/chart-style-metrics.test.ts typechecks without duplicating
// the implementation.

export interface Raster {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StyleDescriptor {
  histogram: Float64Array;
  stroke: number | null;
  edge: number | null;
  gradient: number | null;
  hue: number | null;
  track: number | null;
}

export interface StyleComparison {
  fillScore: number;
  strokeDelta: number | null;
  edgeDelta: number | null;
  gradientDelta: number | null;
  trackDelta: number | null;
  hueShift: number | null;
  referenceStroke: number | null;
  exportStroke: number | null;
  referenceEdge: number | null;
  exportEdge: number | null;
  referenceGradient: number | null;
  exportGradient: number | null;
  referenceTrack: number | null;
  exportTrack: number | null;
}

export interface StyleLimits {
  minFill: number;
  maxStroke: number;
  maxGradient: number;
  maxTrack: number;
  maxHueShift: number;
}

export function luminance(r: number, g: number, b: number): number;
export function hsl(r: number, g: number, b: number): { h: number; s: number; l: number };
export function maskCount(png: Raster, mask?: Uint8Array | null): number;
export function colorHistogram(png: Raster, mask?: Uint8Array | null): Float64Array;
export function histogramSimilarity(a: Float64Array, b: Float64Array): number;
export function edgeFraction(png: Raster, mask?: Uint8Array | null): number | null;
export function strokeFraction(png: Raster, mask?: Uint8Array | null): number | null;
export function gradientFraction(png: Raster, mask?: Uint8Array | null): number | null;
export function dominantHue(png: Raster, mask?: Uint8Array | null): number | null;
export function trackFraction(
  png: Raster,
  mask: Uint8Array | null | undefined,
  referenceHue: number | null,
): number | null;
export function styleDescriptor(
  png: Raster,
  mask?: Uint8Array | null,
  trackHue?: number | null,
): StyleDescriptor;
export function compareStyle(reference: StyleDescriptor, exported: StyleDescriptor): StyleComparison;
export function chroma(r: number, g: number, b: number): number;
export function chartMask(
  width: number,
  height: number,
  graphicRects?: Rect[],
  textRects?: Rect[],
  graphicPad?: number,
  textPad?: number,
): { mask: Uint8Array; count: number };
export function flagStyle(metrics: StyleComparison, limits: StyleLimits): string[];
