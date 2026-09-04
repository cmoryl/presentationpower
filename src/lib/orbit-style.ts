// Ring styling for the growth-proof split module. The rings, their weight and
// the little orbit dots are authored separately for the light and the dark face
// so a deck can carry one look on white and another on the navy ground.

export type OrbitDotStyle = "dot" | "hollow" | "square" | "none";

export type OrbitFaceStyle = {
  /** null = follow the brand accent resolved for that face. */
  ringColor: string | null;
  /** Ring stroke weight in px at the module's authored scale. */
  ringWidth: number;
  /** Ring opacity 0–100. */
  ringOpacity: number;
  /** null = follow the ring colour. */
  dotColor: string | null;
  /** Dot diameter in px. */
  dotSize: number;
  dotStyle: OrbitDotStyle;
};

export type OrbitStyle = { light: OrbitFaceStyle; dark: OrbitFaceStyle };

export const MIN_RING_WIDTH = 1;
export const MAX_RING_WIDTH = 8;
export const MIN_RING_OPACITY = 15;
export const MAX_RING_OPACITY = 100;
export const MIN_DOT_SIZE = 0;
export const MAX_DOT_SIZE = 22;

export const ORBIT_DOT_STYLES: Array<{ id: OrbitDotStyle; label: string }> = [
  { id: "dot", label: "Solid" },
  { id: "hollow", label: "Hollow" },
  { id: "square", label: "Square" },
  { id: "none", label: "None" },
];

export const DEFAULT_ORBIT_FACE_LIGHT: OrbitFaceStyle = {
  ringColor: null,
  ringWidth: 1,
  ringOpacity: 55,
  dotColor: null,
  dotSize: 8,
  dotStyle: "dot",
};

export const DEFAULT_ORBIT_FACE_DARK: OrbitFaceStyle = {
  ringColor: null,
  ringWidth: 1,
  ringOpacity: 70,
  dotColor: null,
  dotSize: 8,
  dotStyle: "dot",
};

export const DEFAULT_ORBIT_STYLE: OrbitStyle = {
  light: { ...DEFAULT_ORBIT_FACE_LIGHT },
  dark: { ...DEFAULT_ORBIT_FACE_DARK },
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Accepts a 3/6 digit hex colour, otherwise falls back to "follow accent". */
export function normalizeOrbitColor(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return HEX.test(t) ? t.toUpperCase() : null;
}

function resolveFace(raw: unknown, defaults: OrbitFaceStyle): OrbitFaceStyle {
  const o = (raw ?? {}) as Record<string, unknown>;
  const style = o.dotStyle;
  return {
    ringColor: normalizeOrbitColor(o.ringColor),
    ringWidth: clamp(num(o.ringWidth, defaults.ringWidth), MIN_RING_WIDTH, MAX_RING_WIDTH),
    ringOpacity: Math.round(
      clamp(num(o.ringOpacity, defaults.ringOpacity), MIN_RING_OPACITY, MAX_RING_OPACITY),
    ),
    dotColor: normalizeOrbitColor(o.dotColor),
    dotSize: Math.round(clamp(num(o.dotSize, defaults.dotSize), MIN_DOT_SIZE, MAX_DOT_SIZE)),
    dotStyle: ORBIT_DOT_STYLES.some((s) => s.id === style)
      ? (style as OrbitDotStyle)
      : defaults.dotStyle,
  };
}

/** Full light+dark style, every field filled in and clamped. */
export function resolveOrbitStyle(raw: unknown): OrbitStyle {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    light: resolveFace(o.light, DEFAULT_ORBIT_FACE_LIGHT),
    dark: resolveFace(o.dark, DEFAULT_ORBIT_FACE_DARK),
  };
}

/** The face that applies for a given slide mode. */
export function resolveOrbitFace(raw: unknown, mode: "light" | "dark"): OrbitFaceStyle {
  const style = resolveOrbitStyle(raw);
  return mode === "dark" ? style.dark : style.light;
}

/** Patch one face without disturbing the other. */
export function patchOrbitStyle(
  raw: unknown,
  mode: "light" | "dark",
  patch: Partial<OrbitFaceStyle>,
): OrbitStyle {
  const style = resolveOrbitStyle(raw);
  const next = { ...style[mode], ...patch };
  return mode === "dark"
    ? { light: style.light, dark: resolveFace(next, DEFAULT_ORBIT_FACE_DARK) }
    : { light: resolveFace(next, DEFAULT_ORBIT_FACE_LIGHT), dark: style.dark };
}

/** Reset one face back to its default. */
export function resetOrbitFace(raw: unknown, mode: "light" | "dark"): OrbitStyle {
  const style = resolveOrbitStyle(raw);
  return mode === "dark"
    ? { light: style.light, dark: { ...DEFAULT_ORBIT_FACE_DARK } }
    : { light: { ...DEFAULT_ORBIT_FACE_LIGHT }, dark: style.dark };
}

export function isDefaultOrbitFace(face: OrbitFaceStyle, mode: "light" | "dark"): boolean {
  const d = mode === "dark" ? DEFAULT_ORBIT_FACE_DARK : DEFAULT_ORBIT_FACE_LIGHT;
  return (
    face.ringColor === d.ringColor &&
    face.ringWidth === d.ringWidth &&
    face.ringOpacity === d.ringOpacity &&
    face.dotColor === d.dotColor &&
    face.dotSize === d.dotSize &&
    face.dotStyle === d.dotStyle
  );
}

/** Effective ring colour for a face, given the resolved accent. */
export function orbitRingColor(face: OrbitFaceStyle, accent: string): string {
  return face.ringColor ?? accent;
}

/** Effective dot colour for a face (falls back to the ring colour). */
export function orbitDotColor(face: OrbitFaceStyle, accent: string): string {
  return face.dotColor ?? orbitRingColor(face, accent);
}
