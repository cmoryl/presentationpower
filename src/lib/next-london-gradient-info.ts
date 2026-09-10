// Full, inspectable colour data for every London ground — house treatments and
// the division-tinted ramps built on top of them.
//
// The signage builders already know how to make a ramp; this module is the
// read-only view of what they produced, so a designer or printer can open a
// ground and see the exact stops, positions, gradient axis and (for a division
// ramp) which accent and tint recipe produced it. Nothing here renders artwork —
// it reports it, using the same functions the masters are built from.

import {
  LONDON_ACCENT_TINTS,
  LONDON_DIVISION_ACCENTS,
  londonDivisionAccent,
  londonEffectiveTint,
  londonTintedStops,
  type LondonAccentTint,
} from "@/lib/next-london-division";
import { londonPanelFamily } from "@/lib/next-london-branding";
import { londonStyleAxis } from "@/lib/next-london-revise";
import { LONDON_STYLES, type LondonPanel } from "@/lib/next-london-signage";

export type LondonGradientAxis = { x1: number; y1: number; x2: number; y2: number };

export type LondonColorReadout = {
  hex: string;
  /** Even ramp position, as the builders lay the stops down. */
  position: number;
  rgb: string;
  hsl: string;
  /** Relative luminance, 0–1 — why a stop can or cannot hold white copy. */
  luminance: number;
};

export type LondonGroundInfo = {
  key: string;
  kind: "house" | "division";
  /** Screen code: the style id, or `style · division`. */
  code: string;
  label: string;
  note: string;
  styleId: string;
  styleLabel: string;
  axis: LondonGradientAxis;
  /** CSS gradient angle in degrees (0 = up), matching the master's axis. */
  angle: number;
  colors: LondonColorReadout[];
  css: string;
  /** Division accent driving the tint, for a division ground. */
  accent: { label: string; hex: string } | null;
  /** Tint recipe in force, for a division ground. */
  tint: LondonAccentTint | null;
  panels: LondonPanel[];
};

const HEX = /^#?([\da-f]{6})$/i;

function rgbOf(hex: string): [number, number, number] {
  const m = HEX.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function londonLuminance(hex: string): number {
  const lin = rgbOf(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function hslOf(hex: string): string {
  const [r, g, b] = rgbOf(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

/** CSS angle (0 = up, clockwise) for a master gradient axis in SVG space. */
export function londonAxisAngle(axis: LondonGradientAxis): number {
  const dx = axis.x2 - axis.x1;
  const dy = axis.y2 - axis.y1;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return Math.round(((deg % 360) + 360) % 360);
}

function readout(stops: string[]): LondonColorReadout[] {
  const last = Math.max(1, stops.length - 1);
  return stops.map((hex, i) => {
    const upper = hex.toUpperCase();
    const [r, g, b] = rgbOf(hex);
    return {
      hex: upper,
      position: Math.round((i / last) * 1000) / 10,
      rgb: `rgb(${r} ${g} ${b})`,
      hsl: hslOf(hex),
      luminance: Math.round(londonLuminance(hex) * 1000) / 1000,
    };
  });
}

function cssFor(angle: number, colors: LondonColorReadout[]): string {
  return `linear-gradient(${angle}deg, ${colors
    .map((c) => `${c.hex} ${c.position}%`)
    .join(", ")})`;
}

function baseStops(styleId: string): string[] {
  const stops = LONDON_STYLES[styleId]?.stops;
  return stops && stops.length > 0 ? stops : ["#7C4EF4", "#7FE3E8"];
}

/** One ground readout from a style and an optional division family. */
export function londonGroundInfo(
  styleId: string,
  familyId: string | null,
  panels: LondonPanel[],
  opts: { door?: boolean; tintId?: string | null } = {},
): LondonGroundInfo {
  const style = LONDON_STYLES[styleId];
  const axis = londonStyleAxis(styleId);
  const angle = londonAxisAngle(axis);
  const accent = familyId ? londonDivisionAccent(familyId) : null;
  const tint = accent ? londonEffectiveTint({ tintId: opts.tintId, door: opts.door }) : null;
  const stops = accent
    ? londonTintedStops(familyId!, baseStops(styleId), {
        tintId: opts.tintId,
        door: opts.door,
      })
    : baseStops(styleId);
  const colors = readout(stops);
  return {
    key: accent ? `${styleId}::${familyId}` : styleId,
    kind: accent ? "division" : "house",
    code: accent ? `${styleId} · ${familyId}` : styleId,
    label: accent ? `${accent.label} · ${style?.label ?? styleId}` : (style?.label ?? styleId),
    note: accent
      ? `${accent.label} accent tinted into the light end of the ${style?.label ?? styleId} ramp. The dark head stays untouched, which is what holds the white lockup at full contrast.`
      : (style?.note ?? ""),
    styleId,
    styleLabel: style?.label ?? styleId,
    axis,
    angle,
    colors,
    css: cssFor(angle, colors),
    accent,
    tint,
    panels,
  };
}

/** Every house ground in use by a panel set, in style order. */
export function londonHouseGrounds(panels: LondonPanel[]): LondonGroundInfo[] {
  return Object.keys(LONDON_STYLES)
    .map((styleId) => ({
      styleId,
      members: panels.filter(
        (p) => p.style === styleId && londonPanelFamily(p) === "transperfect",
      ),
    }))
    .filter((s) => s.members.length > 0)
    .map((s) => londonGroundInfo(s.styleId, null, s.members));
}

/**
 * Every division-specific ground in use by a panel set: one entry per division
 * and treatment combination that actually prints, largest run first, so the
 * listing is the real inventory rather than a theoretical matrix.
 */
export function londonDivisionGrounds(
  panels: LondonPanel[],
  isDoor: (panel: LondonPanel) => boolean = () => false,
): LondonGroundInfo[] {
  const groups = new Map<string, LondonPanel[]>();
  for (const panel of panels) {
    const family = londonPanelFamily(panel);
    if (!LONDON_DIVISION_ACCENTS[family]) continue;
    const key = `${panel.style}::${family}`;
    const list = groups.get(key) ?? [];
    list.push(panel);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, members]) => {
      const [styleId, family] = key.split("::") as [string, string];
      return londonGroundInfo(styleId, family, members, {
        door: members.every((p) => isDoor(p)),
      });
    })
    .sort((a, b) => b.panels.length - a.panels.length || a.label.localeCompare(b.label));
}

/** Every approved tint preset applied to one division, for side-by-side reading. */
export function londonTintVariants(
  info: LondonGroundInfo,
): { tint: LondonAccentTint; colors: LondonColorReadout[]; css: string }[] {
  if (!info.accent) return [];
  const family = info.code.split(" · ")[1]!;
  return LONDON_ACCENT_TINTS.map((tint) => {
    const colors = readout(londonTintedStops(family, baseStops(info.styleId), { tintId: tint.id }));
    return { tint, colors, css: cssFor(info.angle, colors) };
  });
}
