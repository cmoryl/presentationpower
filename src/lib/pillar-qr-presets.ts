// Reusable QR placement presets for the pillar editors. A preset stores the
// dragged QR block position (and its size) against a pillar footprint + sign
// template, so switching layouts restores the placement instead of re-dragging.

import {
  PILLAR_SIZES,
  pillarCaptionAlign,
  pillarCaptionFont,
  pillarCaptionPad,
  pillarKind,
  type PillarCaptionAlign,
  type PillarCaptionFontId,
  type PillarConfig,
} from "@/lib/next-pillar-masters";

const STORAGE_KEY = "element.pillar.qr-presets.v1";

export type PillarQrPreset = {
  id: string;
  name: string;
  /** Scope: pillar footprint + sign template this placement was tuned for. */
  sizeId: string;
  kind: string;
  /** Custom footprint the preset was authored on (mm), for the "custom" size. */
  trimW: number;
  trimH: number;
  qrSize: number;
  /** Caption formatting saved with the placement. */
  qrCaptionFont: PillarCaptionFontId;
  /** Authored caption cap height in mm; 0 = follow the sub-line size. */
  qrCaptionSize: number;
  qrCaptionAlign: PillarCaptionAlign;
  qrCaptionPad: number;
  qrOffsetX: number | null;
  qrOffsetY: number | null;
  /** Fractions of the trim sheet, so the preset survives a footprint change. */
  fracX: number | null;
  fracY: number | null;
  updatedAt: string;
};

/** Stable scope key for a config: footprint preset + sign template. */
export function pillarQrScopeKey(config: PillarConfig): string {
  return `${config.sizeId}|${pillarKind(config.kind).id}`;
}

export function pillarQrScopeLabel(config: PillarConfig): string {
  const size = PILLAR_SIZES.find((s) => s.id === config.sizeId);
  return `${size?.name ?? "Custom footprint"} · ${pillarKind(config.kind).name}`;
}

function trimSize(config: PillarConfig): { w: number; h: number } {
  const size = PILLAR_SIZES.find((s) => s.id === config.sizeId);
  const w = size && size.id !== "custom" ? size.trimW : Number(config.trimW);
  const h = size && size.id !== "custom" ? size.trimH : Number(config.trimH);
  return { w: Number.isFinite(w) && w > 0 ? w : 1, h: Number.isFinite(h) && h > 0 ? h : 1 };
}

export function readPillarQrPresets(): PillarQrPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PillarQrPreset[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePresets(rows: PillarQrPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* storage unavailable — presets are a convenience layer only */
  }
}

/** Save (or overwrite by name within the same scope) a placement preset. */
export function savePillarQrPreset(name: string, config: PillarConfig): PillarQrPreset[] {
  const trim = trimSize(config);
  const x = config.qrOffsetX;
  const y = config.qrOffsetY;
  const preset: PillarQrPreset = {
    id: `${pillarQrScopeKey(config)}|${name.toLowerCase()}`,
    name: name.trim() || "Placement",
    sizeId: config.sizeId,
    kind: pillarKind(config.kind).id,
    trimW: trim.w,
    trimH: trim.h,
    qrSize: Number(config.qrSize),
    qrCaptionFont: pillarCaptionFont(config).id,
    qrCaptionSize: Number(config.qrCaptionSize) > 0 ? Number(config.qrCaptionSize) : 0,
    qrCaptionAlign: pillarCaptionAlign(config),
    qrCaptionPad: pillarCaptionPad(config),
    qrOffsetX: x,
    qrOffsetY: y,
    fracX: typeof x === "number" ? x / trim.w : null,
    fracY: typeof y === "number" ? y / trim.h : null,
    updatedAt: new Date().toISOString(),
  };
  const rows = readPillarQrPresets().filter((p) => p.id !== preset.id);
  const next = [preset, ...rows].slice(0, 60);
  writePresets(next);
  return next;
}

export function deletePillarQrPreset(id: string): PillarQrPreset[] {
  const next = readPillarQrPresets().filter((p) => p.id !== id);
  writePresets(next);
  return next;
}

/** Presets available for a config: exact scope first, then same-template ones. */
export function pillarQrPresetsFor(config: PillarConfig) {
  const kind = pillarKind(config.kind).id;
  const rows = readPillarQrPresets().filter((p) => p.kind === kind);
  return {
    exact: rows.filter((p) => p.sizeId === config.sizeId),
    other: rows.filter((p) => p.sizeId !== config.sizeId),
  };
}

/** Apply a preset to a config, rescaling the placement to the live footprint. */
export function applyPillarQrPreset(config: PillarConfig, preset: PillarQrPreset): PillarConfig {
  const trim = trimSize(config);
  const sameSheet = Math.abs(trim.w - preset.trimW) < 0.5 && Math.abs(trim.h - preset.trimH) < 0.5;
  const x =
    preset.qrOffsetX === null
      ? null
      : sameSheet
        ? preset.qrOffsetX
        : Math.round((preset.fracX ?? 0) * trim.w);
  const y =
    preset.qrOffsetY === null
      ? null
      : sameSheet
        ? preset.qrOffsetY
        : Math.round((preset.fracY ?? 0) * trim.h);
  const qrSize = Number.isFinite(preset.qrSize) && preset.qrSize > 0 ? preset.qrSize : config.qrSize;
  // Older presets predate caption formatting — fall back to the live config.
  return {
    ...config,
    qrSize,
    qrCaptionFont: preset.qrCaptionFont ?? config.qrCaptionFont,
    qrCaptionSize: Number.isFinite(preset.qrCaptionSize)
      ? Number(preset.qrCaptionSize)
      : config.qrCaptionSize,
    qrCaptionAlign: preset.qrCaptionAlign ?? config.qrCaptionAlign,
    qrCaptionPad: Number.isFinite(preset.qrCaptionPad)
      ? Number(preset.qrCaptionPad)
      : config.qrCaptionPad,
    qrOffsetX: x,
    qrOffsetY: y,
  };
}
