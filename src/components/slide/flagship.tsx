// Flagship 2026 — mode-aware editorial primitives.
//
// This module raises the visual bar on the highest-impact slide moments
// (covers, dividers, quotes, big-idea, statement stats, chart annotations)
// with three ingredients:
//
//   1. Editorial typography — mixed serif/sans, oversized display, drop caps,
//      hanging punctuation, pull-quotes with real typographic pull.
//   2. Photographic hero treatments — duotone SVG filter mapped to brand
//      tokens, film grain overlay, cinematic scrim gradients, ken-burns
//      keyframe drift on hero imagery.
//   3. Data depth — annotation callouts with leader lines / dots for charts,
//      before/after diptychs and animated stat counters.
//
// All components are mode-aware (light/dark) via useSlideMode() and consume
// brand.tokens directly so a slide always feels art-directed for its brand.
//
// Design registers (chosen by the caller per slide):
//   • "corporate"  — Apple keynote: extreme whitespace, single idea,
//                    restrained accent, tight sans display.
//   • "product"    — Stripe/Linear: gradient meshes, precise grid rails,
//                    techy monospace kickers, gemstone accents.
//   • "editorial"  — Pentagram: mixed serif+sans, asymmetric type, drop caps,
//                    hanging quote glyphs, magazine-grade hierarchy.
//
// Registers are advisory — components accept an explicit `register` prop or
// fall back to a sensible default per component.

import type { CSSProperties, ReactNode } from "react";
import { useId, useMemo } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { useSlideMode, useSlideAccent, useSlideInk } from "./SlideChrome";
import { auroraOrbs, auroraLayerOpacity } from "@/lib/aurora-svg";

export type SlideRegister = "corporate" | "product" | "editorial";

// Editorial display stack — sans-only per brand direction (no serifs anywhere
// in the deck system). Kept as a named export so downstream callers upgrade
// automatically without touching every component.
export const EDITORIAL_SERIF =
  '"Geist Variable","Geist","Inter","SF Pro Display",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
export const EDITORIAL_MONO =
  '"JetBrains Mono","Geist Mono","IBM Plex Mono","SFMono-Regular",ui-monospace,monospace';

// ── Duotone SVG filter ────────────────────────────────────────────────────
// Renders a hidden <svg> that other components reference by id via CSS
// `filter: url(#tp-duotone-<id>)`. Two-color feColorMatrix maps luminance
// onto a highlight/shadow ramp keyed off the brand tokens.
export function DuotoneFilter({
  id,
  shadow,
  highlight,
}: {
  id: string;
  shadow: string;
  highlight: string;
}) {
  const s = hexToRgb01(shadow);
  const h = hexToRgb01(highlight);
  // luminance -> (h - s) * L + s per channel
  const r = `${(h.r - s.r).toFixed(4)} 0 0 0 ${s.r.toFixed(4)}`;
  const g = `${(h.g - s.g).toFixed(4)} 0 0 0 ${s.g.toFixed(4)}`;
  const b = `${(h.b - s.b).toFixed(4)} 0 0 0 ${s.b.toFixed(4)}`;
  const matrix = [
    // duplicate luminance across RGB before recoloring for a clean grayscale
    // basis (matches Photoshop "map to gradient")
    "0.2126 0.7152 0.0722 0 0",
    "0.2126 0.7152 0.0722 0 0",
    "0.2126 0.7152 0.0722 0 0",
    "0 0 0 1 0",
  ].join(" ");
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id={`tp-duotone-${id}`} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrix} />
          <feColorMatrix type="matrix" values={[r, g, b, "0 0 0 1 0"].join(" ")} />
        </filter>
      </defs>
    </svg>
  );
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const n =
    h.length === 3
      ? h.split("").map((c) => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return { r: (n[0] ?? 0) / 255, g: (n[1] ?? 0) / 255, b: (n[2] ?? 0) / 255 };
}

// ── DuotoneImage ──────────────────────────────────────────────────────────
// A background image passed through the brand's duotone filter with an
// optional ken-burns drift. Use for cover media, quote backgrounds and any
// hero moment where a photograph would otherwise feel generic.
export function DuotoneImage({
  src,
  brand,
  intensity = 1,
  kenBurns = true,
  focalX = 50,
  focalY = 50,
  className = "",
  style,
}: {
  src: string;
  brand: BrandMode;
  intensity?: number; // 0..1 — how strongly to bias the duotone; 1 = full
  kenBurns?: boolean;
  focalX?: number;
  focalY?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const mode = useSlideMode();
  // Deterministic id — must be identical across SSR and client renders,
  // otherwise the `filter: url(#tp-duotone-XXX)` attribute mismatches and
  // React throws a hydration error. `useId()` is guaranteed stable.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const shadow = mode === "dark" ? "#050418" : brand.tokens.primary;
  const highlight = brand.tokens.accent;
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={style} aria-hidden>
      <DuotoneFilter id={id} shadow={shadow} highlight={highlight} />
      <div
        className={kenBurns ? "tp-kenburns absolute inset-0" : "absolute inset-0"}
        style={{
          backgroundImage: `url("${src}")`,
          backgroundSize: "cover",
          backgroundPosition: `${focalX}% ${focalY}%`,
          filter: `url(#tp-duotone-${id})`,
          opacity: intensity,
          willChange: kenBurns ? "transform" : undefined,
        }}
      />
    </div>
  );
}

// ── GrainOverlay ──────────────────────────────────────────────────────────
// A subtle film-grain layer over hero imagery. Uses SVG noise so it renders
// crisply at any scale (thumbnails, projector, PPTX export snapshot).
export function GrainOverlay({
  opacity = 0.08,
  blendMode = "overlay",
  className = "",
}: {
  opacity?: number;
  blendMode?: CSSProperties["mixBlendMode"];
  className?: string;
}) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n)'/>
    </svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ backgroundImage: url, opacity, mixBlendMode: blendMode }}
    />
  );
}

// ── CinematicScrim ────────────────────────────────────────────────────────
// A layered vignette + directional scrim for hero images so the overlaid
// title always meets AA contrast without dulling the whole photo.
export function CinematicScrim({
  anchor = "bottom",
  strength = 0.86,
  tint = "#050418",
  vignette = 0.25,
}: {
  anchor?: "bottom" | "top" | "left" | "right" | "center";
  strength?: number;
  tint?: string;
  vignette?: number;
}) {
  const direction: Record<typeof anchor, string> = {
    bottom: "to top",
    top: "to bottom",
    left: "to right",
    right: "to left",
    center: "circle at center",
  };
  const isRadial = anchor === "center";
  const scrim = isRadial
    ? `radial-gradient(${direction[anchor]}, transparent 30%, ${tint} 130%)`
    : `linear-gradient(${direction[anchor]}, ${tint} 0%, ${tint}00 65%)`;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: scrim, opacity: strength }}
      />
      {vignette > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(70% 60% at 50% 50%, transparent 55%, ${tint} 130%)`,
            opacity: vignette,
          }}
        />
      )}
    </>
  );
}

// ── DropCap ────────────────────────────────────────────────────────────────
// Editorial-register drop cap: giant serif initial, three-line drop, coloured
// with the brand accent. Wrap the first character of a paragraph.
export function DropCap({
  children,
  color,
  size = 168,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`float-left mr-4 ${className}`}
      style={{
        fontFamily: EDITORIAL_SERIF,
        fontSize: size,
        lineHeight: 0.82,
        marginTop: 8,
        fontWeight: 500,
        letterSpacing: "-0.02em",
        color,
      }}
    >
      {children}
    </span>
  );
}

// ── EditorialTitle ────────────────────────────────────────────────────────
// A magazine-grade title: sans display with one word or phrase set in
// italic serif for typographic emphasis. Pass `emphasize` to mark the word
// that should switch to the serif italic; falls back gracefully if absent.
export function EditorialTitle({
  text,
  emphasize,
  color,
  accentColor,
  size = 148,
  align = "start",
  maxWidthPx = 1620,
  emphasisStyle = "italic-serif",
}: {
  text: string;
  emphasize?: string;
  color?: string;
  accentColor?: string;
  size?: number;
  align?: "start" | "center";
  maxWidthPx?: number;
  /** How the emphasized word renders. "italic-serif" (default) or "bold" (heavier sans, no italic). */
  emphasisStyle?: "italic-serif" | "bold";
}) {
  const parts: Array<{ t: string; italic: boolean }> = [];
  if (emphasize && text.toLowerCase().includes(emphasize.toLowerCase())) {
    const idx = text.toLowerCase().indexOf(emphasize.toLowerCase());
    if (idx > 0) parts.push({ t: text.slice(0, idx), italic: false });
    parts.push({ t: text.slice(idx, idx + emphasize.length), italic: true });
    const rest = text.slice(idx + emphasize.length);
    if (rest) parts.push({ t: rest, italic: false });
  } else {
    parts.push({ t: text, italic: false });
  }
  return (
    // A slide title is canvas artwork, not a document heading: rendering <h1>
    // here injected one top-level heading per thumbnail into every page that
    // shows slide previews. Keep the visual weight, drop the outline impact.
    <div
      className={`m-0 ${align === "center" ? "text-center" : ""}`}
      style={{
        fontSize: size,
        fontWeight: 600,
        lineHeight: 0.94,
        letterSpacing: "-0.035em",
        color,
        maxWidth: maxWidthPx,
        textWrap: "balance" as CSSProperties["textWrap"],
      }}
    >
      {parts.map((p, i) =>
        p.italic ? (
          emphasisStyle === "bold" ? (
            <strong
              key={i}
              style={{
                fontWeight: 800,
                color: accentColor ?? color,
                letterSpacing: "-0.035em",
              }}
            >
              {p.t}
            </strong>
          ) : (
            <em
              key={i}
              style={{
                fontFamily: EDITORIAL_SERIF,
                fontWeight: 400,
                color: accentColor ?? color,
                letterSpacing: "-0.02em",
              }}
            >
              {p.t}
            </em>
          )
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </div>
  );
}

// ── PullQuote ─────────────────────────────────────────────────────────────
// A pull-quote with real typographic pull: hanging opening glyph in accent,
// serif body at scale, tight leading. The optional lead-in word can be set
// to render as an editorial "eyebrow" small-caps flourish.
export function PullQuote({
  quote,
  brand,
  size = 96,
  color,
  className = "",
  closingGlyph = false,
  glyphOpacity,
}: {
  quote: string;
  brand: BrandMode;
  size?: number;
  color?: string;
  className?: string;
  /** When true, renders a matching italic serif closing glyph at bottom-right. */
  closingGlyph?: boolean;
  /** Override the default glyph opacity (0..1). */
  glyphOpacity?: number;
}) {
  const mode = useSlideMode();
  const opacity = glyphOpacity ?? (mode === "dark" ? 0.32 : 0.2);
  const glyphSize = size * 3.2;
  const glyphColor = brand.tokens.accent;
  const glyphStyle: CSSProperties = {
    fontFamily: EDITORIAL_SERIF,
    fontSize: glyphSize,
    lineHeight: 0.72,
    color: glyphColor,
    opacity,
    fontWeight: 500,
    letterSpacing: "-0.06em",
  };
  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden
        className="absolute select-none pointer-events-none"
        style={{
          top: -Math.round(size * 0.28),
          left: -Math.round(size * 0.55),
          ...glyphStyle,
        }}
      >
        {"\u201C"}
      </span>
      <blockquote
        className="m-0 relative"
        style={{
          fontFamily: EDITORIAL_SERIF,
          fontSize: size,
          fontWeight: 400,

          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          color,
          textWrap: "balance" as CSSProperties["textWrap"],
        }}
      >
        {quote}
      </blockquote>
      {closingGlyph && (
        <span
          aria-hidden
          className="absolute select-none pointer-events-none"
          style={{
            bottom: -Math.round(size * 0.55),
            right: -Math.round(size * 0.15),
            ...glyphStyle,
          }}
        >
          {"\u201D"}
        </span>
      )}
    </div>
  );
}

// ── ChartAnnotation ───────────────────────────────────────────────────────
// A callout that overlays a chart region with a numbered dot, a short label
// and an optional supporting line. Coordinates are in percent of the chart
// container so callers can position without knowing chart geometry.
export function ChartAnnotation({
  index,
  x,
  y,
  label,
  detail,
  brand,
  anchor = "right",
  width = 220,
}: {
  index: number;
  x: number; // 0..100
  y: number; // 0..100
  label: string;
  detail?: string;
  brand: BrandMode;
  anchor?: "right" | "left" | "top" | "bottom";
  width?: number;
}) {
  const mode = useSlideMode();
  const semanticInk = useSlideInk(brand.tokens.accent);
  const cardBg = mode === "dark" ? "rgba(10,10,40,0.82)" : "rgba(255,255,255,0.96)";
  const ring = mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(10,15,28,0.08)";
  const ink = semanticInk.text;
  const detailInk = semanticInk.muted;
  const dotSize = 26;
  const offset = 40;
  const cardStyle: CSSProperties = { width };
  if (anchor === "right") {
    cardStyle.left = offset;
    cardStyle.top = -12;
  } else if (anchor === "left") {
    cardStyle.right = offset;
    cardStyle.top = -12;
  } else if (anchor === "top") {
    cardStyle.bottom = offset;
    cardStyle.left = -width / 2 + dotSize / 2;
  } else {
    cardStyle.top = offset;
    cardStyle.left = -width / 2 + dotSize / 2;
  }
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      {/* Numbered dot */}
      <div
        className="relative flex items-center justify-center rounded-full font-semibold tabular-nums"
        style={{
          width: dotSize,
          height: dotSize,
          background: brand.tokens.accent,
          color: semanticInk.onSurface(mode === "dark" ? brand.tokens.primary : "#ffffff"),
          fontSize: 14,
          boxShadow: `0 0 0 6px ${brand.tokens.accent}22, 0 0 24px ${brand.tokens.accent}55`,
        }}
      >
        {index}
      </div>
      {/* Callout card + leader line */}
      <div
        className="absolute rounded-xl px-4 py-3"
        style={{
          ...cardStyle,
          background: cardBg,
          border: `1px solid ${ring}`,
          backdropFilter: "blur(8px)",
          boxShadow:
            mode === "dark" ? "0 12px 40px rgba(0,0,0,0.35)" : "0 12px 40px rgba(10,15,28,0.10)",
        }}
      >
        <div
          className="uppercase font-semibold"
          style={{ color: semanticInk.muted, fontSize: 11, letterSpacing: "0.24em" }}
        >
          Callout {String(index).padStart(2, "0")}
        </div>
        <div
          className="mt-1"
          style={{ color: ink, fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}
        >
          {label}
        </div>
        {detail && (
          <div className="mt-1" style={{ color: detailInk, fontSize: 12.5, lineHeight: 1.35 }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}

// ── StatRail ──────────────────────────────────────────────────────────────
// A skinny gradient rail used as decorative punctuation next to display type
// on hero and section slides. Feels architected without shouting.
export function StatRail({
  color,
  height = 88,
  className = "",
}: {
  color: string;
  height?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`rounded-full ${className}`}
      style={{
        width: 4,
        height,
        backgroundImage: `linear-gradient(180deg, ${color} 0%, ${color}00 100%)`,
        boxShadow: `0 0 20px ${color}55`,
      }}
    />
  );
}

// ── AuroraLayer ───────────────────────────────────────────────────────────
// Procedural aurora backdrop — 3 large blurred radial "orbs" over a deep
// navy field. Deterministic per seed (variant id), so a given slide always
// paints the same aurora. Rendered as pure SVG so it thumbnails cleanly and
// exports to PPTX at any zoom without artefacts.
export function AuroraLayer({
  seed = "aurora",
  brand,
  intensity = 1,
  className = "",
  baseTint,
  aspect,
}: {
  seed?: string;
  brand: BrandMode;
  intensity?: number;
  className?: string;
  baseTint?: string;
  /** Override the native 1280×720 landscape frame — pass e.g. `{ w: 850, h: 1100 }`
   *  for portrait Letter so orbs re-project onto the taller frame instead of
   *  cropping a slice of a landscape composition. Omit for 16:9 slides. */
  aspect?: { w: number; h: number };
}) {
  const mode = useSlideMode();
  const base = baseTint ?? (mode === "dark" ? "#03002C" : "#FFFFFF");
  const orbs = useMemo(
    () => auroraOrbs(seed, brand, mode, aspect),
    [seed, brand, mode, aspect?.w, aspect?.h],
  );
  const vw = aspect?.w ?? 1280;
  const vh = aspect?.h ?? 720;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ background: base }}
    >
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        style={{ opacity: auroraLayerOpacity(mode, intensity) }}
      >
        <defs>
          {orbs.map((o, i) => (
            <radialGradient
              key={i}
              id={`tp-aurora-${seed}-${i}`}
              cx="50%"
              cy="50%"
              r={mode === "dark" ? "90%" : "95%"}
            >
              <stop offset="0%" stopColor={o.color} stopOpacity={o.alpha} />
              <stop
                offset={mode === "dark" ? "38%" : "42%"}
                stopColor={o.color}
                stopOpacity={o.alpha * 0.55}
              />
              <stop
                offset={mode === "dark" ? "78%" : "80%"}
                stopColor={o.color}
                stopOpacity={o.alpha * 0.15}
              />
              <stop offset="100%" stopColor={o.color} stopOpacity="0" />
            </radialGradient>
          ))}
          <filter id={`tp-aurora-${seed}-blur`} x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation={mode === "dark" ? 55 : 125} />
          </filter>
        </defs>
        <g filter={`url(#tp-aurora-${seed}-blur)`}>
          {orbs.map((o, i) => (
            <ellipse
              key={i}
              cx={o.x}
              cy={o.y}
              rx={o.rx}
              ry={o.ry}
              fill={`url(#tp-aurora-${seed}-${i})`}
            />
          ))}
        </g>
      </svg>

      {mode === "light" && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            // Extra white scrim to guarantee logos/content are never
            // fighting the aurora on light slides. Fades from right to left.
            backgroundImage: `linear-gradient(to left, ${hexA(brand.tokens.accent, 0.025)} 0%, ${hexA(brand.tokens.accent, 0.01)} 35%, rgba(255,255,255,0) 70%), linear-gradient(to bottom, rgba(255,255,255,0.58), rgba(255,255,255,0.38))`,
          }}
        />
      )}
      {/* Free-form aurora v2 — no frosted-glass wash, no vignette. Content
          sits directly on the accent blooms, matching the reference
          backdrops. Both the on-screen renderer and the PPTX exporter in
          src/lib/aurora-svg.ts drop these overlays together. */}
    </div>
  );
}

// auroraOrbs is now defined in src/lib/aurora-svg.ts as the single source of
// truth shared by the on-screen renderer and the PPTX/PDF exporter. The
// parity test in src/lib/__tests__/aurora-parity.test.ts locks them together.

// Linearly blend two hex colors. t=0 returns a, t=1 returns b.
function mixHex(a: string, b: string, t: number): string {
  const pa = /^#?([a-f\d]{6})$/i.exec(a);
  const pb = /^#?([a-f\d]{6})$/i.exec(b);
  if (!pa || !pb) return a;
  const ia = parseInt(pa[1], 16);
  const ib = parseInt(pb[1], 16);
  const ar = (ia >> 16) & 255,
    ag = (ia >> 8) & 255,
    ab_ = ia & 255;
  const br = (ib >> 16) & 255,
    bg = (ib >> 8) & 255,
    bb_ = ib & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab_ + (bb_ - ab_) * t);
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(bl)}`;
}

// Rotate a hex color's hue by `deg` degrees and nudge lightness by `dl`.
// Used to derive the sibling aurora orb from the brand accent so we don't
// have to hand-pick a third color per division.
function shiftHue(hex: string, deg: number, dl = 0): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hh = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  hh = (hh + deg + 360) % 360;
  const l2 = Math.max(0, Math.min(1, l + dl));
  const c = (1 - Math.abs(2 * l2 - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const mm = l2 - c / 2;
  let rr = 0,
    gg = 0,
    bb = 0;
  if (hh < 60) {
    rr = c;
    gg = x;
  } else if (hh < 120) {
    rr = x;
    gg = c;
  } else if (hh < 180) {
    gg = c;
    bb = x;
  } else if (hh < 240) {
    gg = x;
    bb = c;
  } else if (hh < 300) {
    rr = x;
    bb = c;
  } else {
    rr = c;
    bb = x;
  }
  const to = (v: number) =>
    Math.round((v + mm) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(rr)}${to(gg)}${to(bb)}`;
}

// ── GlassTile ─────────────────────────────────────────────────────────────
// Frosted-navy translucent card with hairline border. The Canva "Aesop"
// spec: mid-alpha fill, 1px inner white ring, generous radius, no shadow.
// Automatically inverts for light-mode surfaces.
export function GlassTile({
  children,
  className = "",
  radius = 22,
  padding = "px-8 py-8",
  intensity = 1,
  accent,
  style,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  padding?: string;
  /** 0.5..1.5 — scales the tint alpha. */
  intensity?: number;
  /** Override the division accent (hex). Defaults to the slide's active
   *  division accent from SlideAccentContext. */
  accent?: string;
  style?: CSSProperties;
}) {
  const mode = useSlideMode();
  const ctxAccent = useSlideAccent();
  const ink = useSlideInk(accent ?? ctxAccent ?? undefined);
  const a = accent ?? ctxAccent ?? undefined;
  // Clearer glass: lower fill alpha, thinner hairline ring, plus an inner
  // top highlight and a soft accent-tinted underglow so the division colour
  // reads through the tile edge without tinting the whole surface.
  const fillAlpha = Math.min(0.7, (mode === "dark" ? 0.22 : 0.55) * intensity);
  const ringAlpha = Math.min(0.4, (mode === "dark" ? 0.16 : 0.16) * intensity);
  const bg =
    mode === "dark" ? `rgba(10, 8, 48, ${fillAlpha})` : `rgba(255, 255, 255, ${fillAlpha})`;
  const ring = a
    ? hexA(a, mode === "dark" ? 0.32 : 0.28)
    : mode === "dark"
      ? `rgba(255, 255, 255, ${ringAlpha})`
      : `rgba(10, 15, 28, ${ringAlpha})`;
  const highlight =
    mode === "dark"
      ? "inset 0 1px 0 0 rgba(255,255,255,0.08)"
      : "inset 0 1px 0 0 rgba(255,255,255,0.75)";
  const accentGlow = a ? `, 0 12px 40px -18px ${hexA(a, 0.35)}` : "";
  return (
    <div
      className={`relative ${padding} ${className}`}
      style={{
        background: bg,
        border: `1px solid ${ring}`,
        borderRadius: radius,
        backdropFilter: "blur(20px) saturate(150%)",
        boxShadow: `${highlight}${accentGlow}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── IconWell ──────────────────────────────────────────────────────────────
// Small rounded-square glass well for a mono-line icon. Used in bullet rows
// and challenge/solution/result stacks — never dominates the label.
export function IconWell({
  children,
  size = 44,
  radius = 12,
  accent,
  className = "",
}: {
  children?: ReactNode;
  size?: number;
  radius?: number;
  accent?: string;
  className?: string;
}) {
  const mode = useSlideMode();
  const ctxAccent = useSlideAccent();
  const a = accent ?? ctxAccent ?? undefined;
  const ink = useSlideInk(a);
  const bg = a
    ? hexA(a, mode === "dark" ? 0.14 : 0.1)
    : mode === "dark"
      ? "rgba(255,255,255,0.06)"
      : "rgba(10,15,28,0.05)";
  const ring = a
    ? hexA(a, mode === "dark" ? 0.45 : 0.35)
    : mode === "dark"
      ? "rgba(255,255,255,0.14)"
      : "rgba(10,15,28,0.10)";
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        border: `1px solid ${ring}`,
        color: ink.text,
        backdropFilter: "blur(12px) saturate(140%)",
        boxShadow: a ? `inset 0 0 0 1px ${hexA(a, 0.1)}` : undefined,
      }}
    >
      {children}
    </div>
  );
}

// Convert a "#RRGGBB" hex + alpha (0..1) to an rgba() string. Silently
// returns the original hex if it can't parse — glass primitives fall back
// to neutral rings in that case.
function hexA(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

// ── AuroraOrb ─────────────────────────────────────────────────────────────
// A single, large, feathered radial orb — used to place a soft, defocused
// bloom of the division accent BEHIND a glass panel so the accent peeks
// through the frosted surface (Aesop / "liquid glass" motif). Purely
// decorative, pointer-events: none. Position is % of slide (0..100).
export function AuroraOrb({
  accent,
  x = 82,
  y = 32,
  size = 780,
  intensity = 1,
  className = "",
}: {
  accent?: string;
  /** Center X in % of slide width. */
  x?: number;
  /** Center Y in % of slide height. */
  y?: number;
  /** Diameter in px (at 1920×1080 slide space). */
  size?: number;
  intensity?: number;
  className?: string;
}) {
  const mode = useSlideMode();
  const ctxAccent = useSlideAccent();
  const a = accent ?? ctxAccent ?? "#4F8CFF";
  const sibling = shiftHue(a, 34, 0.06);
  const isLight = mode === "light";
  const alpha = (isLight ? 0.28 : 0.72) * intensity;
  const scaled = isLight ? size * 1.55 : size * 1.2;
  const lightX = isLight ? (x >= 50 ? x + 10 : x - 10) : x;
  const lightY = isLight ? (y >= 50 ? y + 12 : y - 12) : y;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={{
        left: `${lightX}%`,
        top: `${lightY}%`,
        width: scaled,
        height: scaled,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: isLight
          ? `radial-gradient(circle at 38% 40%, ${hexA(sibling, alpha)} 0%, ${hexA(a, alpha * 0.85)} 12%, ${hexA(a, alpha * 0.5)} 34%, ${hexA(a, alpha * 0.18)} 62%, ${hexA(a, 0)} 100%)`
          : `radial-gradient(circle at 38% 40%, ${hexA(sibling, alpha)} 0%, ${hexA(a, alpha * 0.8)} 14%, ${hexA(a, alpha * 0.42)} 36%, ${hexA(a, alpha * 0.14)} 66%, ${hexA(a, 0)} 100%)`,
        filter: isLight ? "blur(78px)" : "blur(40px)",
        mixBlendMode: isLight ? "multiply" : "screen",
      }}
    />
  );
}

// ── AuroraSidePanel ───────────────────────────────────────────────────────
// The "right side" glass card the deck uses on close/CTA slides: a frosted
// panel with an eyebrow kicker and a numbered list of steps. Used together
// with AuroraOrb for the "orb-peeks-through-glass" hero pattern.
export function AuroraSidePanel({
  kicker,
  items,
  accent,
  className = "",
  numberStart = 1,
  maxItems = 4,
}: {
  kicker?: string;
  items: Array<{ label?: string; body?: string; meta?: string }>;
  accent?: string;
  className?: string;
  numberStart?: number;
  maxItems?: number;
}) {
  const ctxAccent = useSlideAccent();
  const a = accent ?? ctxAccent ?? undefined;
  const ink = useSlideInk(a);
  const shown = items.slice(0, maxItems);
  return (
    <GlassTile radius={28} padding="px-12 py-12" accent={a} className={className}>
      {kicker && (
        <div
          className="uppercase"
          style={{
            fontSize: 18,
            letterSpacing: "0.28em",
            fontWeight: 600,
            color: ink.faint,
          }}
        >
          {kicker}
        </div>
      )}
      <div className={`${kicker ? "mt-10" : ""} space-y-8`}>
        {shown.map((it, i) => (
          <div
            key={i}
            className={`grid grid-cols-[72px_1fr] items-start gap-6 tp-rise tp-rise-delay-${Math.min(i + 1, 3) as 1 | 2 | 3}`}
          >
            <div
              className="tabular-nums"
              style={{
                fontSize: 40,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--slide-accent-text)",
                lineHeight: 1,
              }}
            >
              {String(numberStart + i).padStart(2, "0")}
            </div>
            <div>
              {it.label && (
                <div style={{ fontSize: 26, lineHeight: 1.28, color: ink.strong, fontWeight: 500 }}>
                  {it.label}
                </div>
              )}
              {it.body && (
                <div className="mt-2" style={{ fontSize: 20, lineHeight: 1.4, color: ink.muted }}>
                  {it.body}
                </div>
              )}
              {it.meta && (
                <div
                  className="mt-3 uppercase"
                  style={{
                    fontSize: 14,
                    letterSpacing: "0.24em",
                    color: ink.faint,
                    fontWeight: 600,
                  }}
                >
                  {it.meta}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassTile>
  );
}
