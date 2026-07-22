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
import { useMemo } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { useSlideMode } from "./SlideChrome";

export type SlideRegister = "corporate" | "product" | "editorial";

// The editorial serif stack — kept system-friendly so it renders offline in
// PPTX exports and in reduced-JS previews.
export const EDITORIAL_SERIF =
  '"Instrument Serif","Cormorant Garamond","EB Garamond","Palatino","Georgia",serif';
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
}: { id: string; shadow: string; highlight: string }) {
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
          <feColorMatrix
            type="matrix"
            values={[r, g, b, "0 0 0 1 0"].join(" ")}
          />
        </filter>
      </defs>
    </svg>
  );
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const n = h.length === 3
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
  const id = useMemo(() => Math.random().toString(36).slice(2, 8), []);
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
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: scrim, opacity: strength }} />
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
}: {
  text: string;
  emphasize?: string;
  color?: string;
  accentColor?: string;
  size?: number;
  align?: "start" | "center";
  maxWidthPx?: number;
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
    <h1
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
          <em
            key={i}
            style={{
              fontFamily: EDITORIAL_SERIF,
              fontStyle: "italic",
              fontWeight: 400,
              color: accentColor ?? color,
              letterSpacing: "-0.02em",
            }}
          >
            {p.t}
          </em>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </h1>
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
}: {
  quote: string;
  brand: BrandMode;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden
        className="absolute select-none"
        style={{
          top: -Math.round(size * 0.28),
          left: -Math.round(size * 0.55),
          fontFamily: EDITORIAL_SERIF,
          fontSize: size * 3.2,
          lineHeight: 0.72,
          color: brand.tokens.accent,
          opacity: 0.22,
          fontWeight: 500,
          letterSpacing: "-0.06em",
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
          fontStyle: "italic",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          color,
          textWrap: "balance" as CSSProperties["textWrap"],
        }}
      >
        {quote}
      </blockquote>
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
  const cardBg = mode === "dark" ? "rgba(10,10,40,0.82)" : "rgba(255,255,255,0.96)";
  const ring = mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(10,15,28,0.08)";
  const ink = mode === "dark" ? "#ffffff" : brand.tokens.primary;
  const detailInk = mode === "dark" ? "rgba(255,255,255,0.72)" : "rgba(10,15,28,0.62)";
  const dotSize = 26;
  const offset = 40;
  const cardStyle: CSSProperties = { width };
  if (anchor === "right") { cardStyle.left = offset; cardStyle.top = -12; }
  else if (anchor === "left") { cardStyle.right = offset; cardStyle.top = -12; }
  else if (anchor === "top") { cardStyle.bottom = offset; cardStyle.left = -width / 2 + dotSize / 2; }
  else { cardStyle.top = offset; cardStyle.left = -width / 2 + dotSize / 2; }
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
          color: mode === "dark" ? brand.tokens.primary : "#ffffff",
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
          boxShadow: mode === "dark" ? "0 12px 40px rgba(0,0,0,0.35)" : "0 12px 40px rgba(10,15,28,0.10)",
        }}
      >
        <div
          className="uppercase font-semibold"
          style={{ color: brand.tokens.accent, fontSize: 11, letterSpacing: "0.24em" }}
        >
          Callout {String(index).padStart(2, "0")}
        </div>
        <div className="mt-1" style={{ color: ink, fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>
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
}: { color: string; height?: number; className?: string }) {
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
