// Geometry-agnostic social/event renderer.
//
// One component, driven by SocialFormat + brand tokens + CampaignCopy.
// Uses the existing AuroraLayer (with aspect override) so backgrounds match
// the deck/print system, and BrandLockup for the wordmark. Layout preset is
// chosen from aspectClass(format), not the exact size — that's the point of
// the scaffold: adding a new size in social-formats.ts costs zero renderer
// code as long as it falls into an existing aspect class.
//
// Known-broken cases are called out in `/admin/campaigns` for honesty:
// extreme portrait (1080×1920 story) and extreme landscape (1600×900) push
// the shared preset in opposite directions and eventually want bespoke
// layouts, not pure scaling.

import type { CSSProperties } from "react";
import { AuroraLayer } from "@/components/slide/flagship";
import { SlideModeContext } from "@/components/slide/SlideChrome";
import { BrandLockup } from "@/components/BrandLockup";
import type { BrandMode } from "@/lib/taxonomy";
import { BRAND_MODES } from "@/lib/taxonomy";
import type { SocialFormat } from "@/lib/social-formats";
import { aspectClass } from "@/lib/social-formats";
import type { CampaignCopy, EventFacts } from "@/lib/campaigns";
import { resolveSocialStyle, type SocialStyleId } from "@/lib/social-styles";


type Preset = {
  padPct: number;
  eyebrowPct: number;
  titlePct: number;
  summaryPct: number;
  ctaPct: number;
  align: "start" | "end";
  showSummary: boolean;
  lockupSize: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
};

// Percentages are fractions of the frame's shorter edge (min(w, h)) so a
// story and a square use compatible units.
function presetFor(format: SocialFormat): Preset {
  switch (aspectClass(format)) {
    case "landscape-wide":
      return {
        padPct: 5,
        eyebrowPct: 2.4,
        titlePct: 10,
        summaryPct: 3.2,
        ctaPct: 2.6,
        align: "end",
        showSummary: false,
        lockupSize: "sm",
      };
    case "landscape":
      return {
        padPct: 5.5,
        eyebrowPct: 2.4,
        titlePct: 9,
        summaryPct: 3.4,
        ctaPct: 2.6,
        align: "end",
        showSummary: true,
        lockupSize: "sm",
      };
    case "square":
      return {
        padPct: 6,
        eyebrowPct: 2.6,
        titlePct: 8.5,
        summaryPct: 3.6,
        ctaPct: 2.8,
        align: "end",
        showSummary: true,
        lockupSize: "md",
      };
    case "portrait":
      return {
        padPct: 6,
        eyebrowPct: 2.6,
        titlePct: 8,
        summaryPct: 3.4,
        ctaPct: 2.8,
        align: "end",
        showSummary: true,
        lockupSize: "md",
      };
    case "portrait-tall":
      // Story/reel — chrome eats top and bottom, so anchor content to the
      // vertical middle and keep it inside the safe rect.
      return {
        padPct: 7,
        eyebrowPct: 2.4,
        titlePct: 7.5,
        summaryPct: 3.2,
        ctaPct: 2.6,
        align: "end",
        showSummary: true,
        lockupSize: "sm",
      };
  }
}

function findBrand(brandId: string): BrandMode {
  return BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
}

// ---- Stat figure ----------------------------------------------------------
// Stats used to be "big number + words". This renders them as a small
// infographic instead: a percentage becomes a donut gauge, a plain figure
// becomes a metered card with an accent bar. Everything scales off the
// frame's short edge so it works at 1080×1080 and 1600×900 alike.

function parseStat(value: string): { num: number | null; pct: number | null; display: string } {
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  const num = match ? Number(match[0].replace(",", ".")) : null;
  const pct = value.includes("%") && num !== null ? Math.max(0, Math.min(100, num)) : null;
  return { num, pct, display: value };
}

function StatFigure({
  value,
  label,
  short,
  accent,
  inkColor,
  dimColor,
  chipBg,
  chipBorder,
  valuePx,
  labelPx,
}: {
  value: string;
  label: string;
  short: number;
  accent: string;
  inkColor: string;
  dimColor: string;
  chipBg: string;
  chipBorder: string;
  valuePx: number;
  labelPx: number;
}) {
  const { num, pct, display } = parseStat(value);
  const pad = (short * 1.8) / 100;
  const gap = (short * 1.6) / 100;
  const radius = (short * 1.6) / 100;

  // Donut gauge for percentages.
  const ring = (short * 11) / 100;
  const stroke = ring * 0.13;
  const r = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  // Meter for absolute figures: fill scales on a log curve so both 12 and
  // 4,300 produce a sensible-looking bar.
  const meterFill =
    num !== null ? Math.max(0.18, Math.min(1, Math.log10(Math.abs(num) + 1) / 5)) : 0.55;

  return (
    <div
      className="flex items-center"
      style={{
        marginTop: (short * 1.6) / 100,
        alignSelf: "flex-start",
        gap,
        // No plate/box behind stats — figures sit directly on the artwork.
        padding: `${pad * 0.2}px 0`,
        borderRadius: radius,
        background: "transparent",
        border: "none",
      }}
    >

      {pct !== null ? (
        <div className="relative shrink-0" style={{ width: ring, height: ring }}>
          <svg width={ring} height={ring} viewBox={`0 0 ${ring} ${ring}`} aria-hidden="true">
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={r}
              fill="none"
              stroke={dimColor}
              strokeOpacity={0.28}
              strokeWidth={stroke}
            />
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={r}
              fill="none"
              stroke={accent}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
              transform={`rotate(-90 ${ring / 2} ${ring / 2})`}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center"
            style={{
              fontSize: ring * 0.3,
              fontWeight: 800,
              color: accent,
              backgroundImage: accentGradient(accent),
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.03em",
            }}
          >
            {Math.round(pct)}%
          </span>
        </div>
      ) : (
        <div
          className="shrink-0"
          style={{
            width: Math.max(3, (short * 0.55) / 100),
            height: valuePx * 1.5,
            borderRadius: 9999,
            backgroundImage: accentGradient(accent, "180deg"),
          }}
        />
      )}

      <div className="flex flex-col" style={{ gap: (short * 0.7) / 100 }}>
        {pct === null && (
          <span
            style={{
              fontSize: valuePx,
              fontWeight: 800,
              lineHeight: 1,
              color: accent,
              backgroundImage: accentGradient(accent),
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.045em",
            }}
          >
            {display}
          </span>
        )}

        <span
          style={{
            fontSize: labelPx,
            lineHeight: 1.2,
            color: dimColor,
            fontWeight: 600,
            letterSpacing: "0.01em",
            maxWidth: short * 0.5,
          }}
        >
          {label}
        </span>
        {pct === null && (
          <div
            style={{
              height: Math.max(2, (short * 0.35) / 100),
              width: short * 0.24,
              borderRadius: 9999,
              background: dimColor,
              opacity: 0.25,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${meterFill * 100}%`,
                borderRadius: 9999,
                background: accent,
                opacity: 1,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Hex (#rgb/#rrggbb) or existing rgb()/rgba() → rgba string at the given alpha.
 *  Used by the Aura style so a division's accent can bloom behind copy at a
 *  controlled, text-safe opacity. */
function tintRgba(color: string, alpha: number): string {
  const hex = color.trim();
  if (hex.startsWith("#")) {
    const h = hex.slice(1);
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full.slice(0, 6), 16);
    if (!Number.isNaN(n)) {
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }
  }
  const m = hex.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(",").map((v) => parseFloat(v));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(0, 63, 199, ${alpha})`;
}

/** Division-accent gradient used to fill figures (text clip) and accent bars.
 *  Runs from the full accent into a lighter, semi-transparent tail so numbers
 *  read as a graded highlight rather than flat colour. */
function accentGradient(accent: string, angle = "100deg"): string {
  return `linear-gradient(${angle}, ${accent} 0%, ${tintRgba(accent, 0.92)} 45%, ${tintRgba(accent, 0.55)} 100%)`;
}

/** Soft gradient underline: accent at the start, fading out to nothing. */
function accentUnderline(accent: string, emphasis: number): string {
  return `linear-gradient(90deg, ${tintRgba(accent, 0.85 * emphasis)} 0%, ${tintRgba(accent, 0.45 * emphasis)} 55%, ${tintRgba(accent, 0)} 100%)`;
}

/** Matches figures inside running copy: 40%, 3.5x, $2M, 1,200+, 24/7, 10× … */
const FIGURE_RE =
  /((?:[$€£¥]\s?)?\d[\d.,]*(?:\s?(?:%|percent|x|×|k|K|M|B|bn|\+|\/\d+))?)/g;

/** Renders text with every statistic / percentage lifted in the division
 *  accent — gradient-filled glyphs over a soft gradient underline. No plate
 *  or box behind the figure. */
function AccentFigures({
  text,
  accent,
  emphasis = 1,
}: {
  text: string;
  accent: string;
  /** Scales the highlight strength — titles get the full treatment, body copy less. */
  emphasis?: number;
}) {
  const parts = text.split(FIGURE_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const isFigure = /^(?:[$€£¥]\s?)?\d/.test(part);
        if (!isFigure) return <span key={i}>{part}</span>;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              paddingBottom: "0.06em",
              backgroundImage: accentUnderline(accent, emphasis),
              backgroundSize: "100% 0.1em",
              backgroundPosition: "0 100%",
              backgroundRepeat: "no-repeat",
            }}
          >
            <span
              style={{
                color: accent,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                backgroundImage: accentGradient(accent),
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {part}
            </span>
          </span>
        );
      })}
    </>
  );
}




export type SocialRendererProps = {
  format: SocialFormat;
  brandId: string;
  mode: "light" | "dark";
  copy: CampaignCopy;
  facts?: Pick<EventFacts, "hashtag" | "registrationUrl">;
  /** Optional full-bleed background photo (URL or data URL). */
  imageUrl?: string;
  /** 0–100 — how strongly the brand scrim darkens the photo. */
  imageScrimPct?: number;
  /** Template style skin — see src/lib/social-styles.ts. */
  styleId?: SocialStyleId;
  /** Optional event lockup (e.g. TransPerfect NEXT · City Series). When set it
   *  replaces the division wordmark so the event brand leads the asset. */
  eventLogo?: { url: string; ratio: number; urlDark?: string };
  /** Display size in CSS pixels — the frame renders at format.width×.height
   *  and this prop just scales the wrapper. Defaults to 320px on the short
   *  edge for grid previews. */
  displayShortEdge?: number;
};

export function SocialRenderer({
  format,
  brandId,
  mode,
  copy,
  facts,
  imageUrl,
  imageScrimPct = 55,
  styleId,
  eventLogo,
  displayShortEdge = 320,
}: SocialRendererProps) {

  const brand = findBrand(brandId);
  const preset = presetFor(format);
  const style = resolveSocialStyle(styleId);
  const short = Math.min(format.width, format.height);
  const scale = displayShortEdge / short;
  const wrapperStyle: CSSProperties = {
    width: format.width * scale,
    height: format.height * scale,
  };
  const inner: CSSProperties = {
    width: format.width,
    height: format.height,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  };

  const inkColor = mode === "dark" ? "#FFFFFF" : "#03002C";
  const dimColor = mode === "dark" ? "rgba(255,255,255,0.72)" : "rgba(3,0,44,0.62)";
  const chipBg = mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.06)";
  const chipBorder =
    mode === "dark" ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(3,0,44,0.14)";

  const padPx = (short * preset.padPct) / 100;
  const safe = format.safeArea ?? {};
  const safeInset = {
    top: padPx + (safe.top ?? 0) * format.height,
    bottom: padPx + (safe.bottom ?? 0) * format.height,
    left: padPx + (safe.left ?? 0) * format.width,
    right: padPx + (safe.right ?? 0) * format.width,
  };

  // The style decides where copy anchors; the photo subject and scrim flip
  // to sit in the opposite half of the frame.
  const copyAlign = style.copyAlign;
  const scrim = Math.min(100, imageScrimPct * style.scrimMultiplier);

  // ---- Rule of thirds ------------------------------------------------------
  // The photography sets are composed with the subject on an upper-third
  // intersection and clean negative space in the opposite band. The renderer
  // holds up its side of that contract:
  //  · the photo is cropped so the subject lands on a third line, never centre;
  //  · the copy stack is capped to the opposite band so it can never grow into
  //    the subject, whatever the format or copy length.
  const cls = aspectClass(format);
  const focalY = style.photoFocus === "top" ? 33 : style.photoFocus === "bottom" ? 67 : 50;
  // Nudge the crop away from the copy band on tall frames, where object-cover
  // has the most vertical slack to give.
  const focalYAdjusted =
    cls === "portrait-tall" ? (copyAlign === "end" ? 26 : 74) : focalY;
  const objectPosition = `center ${focalYAdjusted}%`;

  // Copy band: how much of the frame the copy stack may occupy, opposite the
  // subject. Enforced through the line clamps below rather than a hard crop —
  // a cap that slices through a line of text reads worse than a deeper band.

  // Wide frames also thirds horizontally — copy occupies two thirds, the
  // subject's third stays clear.
  const copyMaxWidth =
    imageUrl && (cls === "landscape-wide" || cls === "landscape")
      ? format.width * 0.66
      : format.width * 0.92;

  // Photography competes with type, so tighten the stack when an image is on.
  // Wide frames give the copy the least room, so they shrink hardest — a
  // clipped half-sentence reads worse than slightly smaller type.
  const copyScale = imageUrl ? (cls === "landscape-wide" ? 0.8 : 0.9) : 1;
  const titleLines = cls === "landscape-wide" ? (imageUrl ? 3 : 2) : imageUrl ? 3 : 4;


  // Extreme landscape hides eyebrow to protect single-clause headline.
  const showEyebrow = aspectClass(format) !== "landscape-wide" && style.eyebrow !== "hidden";
  const showCta = copy.cta && aspectClass(format) !== "landscape-wide";


  // ---- Copy plate, per template style -------------------------------------
  const plateTextShadow =
    mode === "dark"
      ? "0 1px 12px rgba(3,0,44,0.55), 0 0 2px rgba(3,0,44,0.35)"
      : "0 1px 10px rgba(255,255,255,0.75), 0 0 2px rgba(255,255,255,0.45)";
  const hairline =
    mode === "dark" ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.50)";
  const accentRuleWidth = Math.max(2, (short * 0.7) / 100);
  const bleed = style.plateFullBleed
    ? {
        // Cancel the safe-area inset horizontally so the plate runs edge to
        // edge at every format, then re-add it as padding so copy stays safe.
        marginLeft: -safeInset.left,
        marginRight: -safeInset.right,
        paddingLeft: safeInset.left,
        paddingRight: safeInset.right,
      }
    : {
        paddingLeft: (short * 3.2) / 100,
        paddingRight: (short * 3.2) / 100,
      };
  // Vertical bleed: a soft-focus plate must reach the physical frame edge on
  // the side the copy is anchored to. If it stops at the safe-area inset the
  // blur/tint terminates mid-frame and reads as a hard cut line across the
  // photo. Cancel the inset with a negative margin and re-add it as padding so
  // the copy itself stays inside the safe area.
  const edgeBleed = style.plateFullBleed || style.plate === "aura";
  const bleedBottom = edgeBleed && copyAlign === "end" ? safeInset.bottom : 0;
  const bleedTop = edgeBleed && copyAlign !== "end" ? safeInset.top : 0;
  const plateBase: CSSProperties = {
    ...bleed,
    paddingTop: (short * 3.4) / 100 + bleedTop,
    paddingBottom: (short * 3.4) / 100 + bleedBottom,
    marginTop: (short * -1.6) / 100 - bleedTop,
    marginBottom: (short * -1.6) / 100 - bleedBottom,
    borderRadius: (short * style.plateRadiusPct) / 100,
    textShadow: style.plate === "solid" ? undefined : plateTextShadow,
  };
  const auraMask =
    copyAlign === "end"
      ? "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 46%, rgba(0,0,0,0.66) 72%, rgba(0,0,0,0.24) 89%, rgba(0,0,0,0) 100%)"
      : "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 46%, rgba(0,0,0,0.66) 72%, rgba(0,0,0,0.24) 89%, rgba(0,0,0,0) 100%)";
  const plateFill: CSSProperties =
    style.plate === "glass"
      ? {
          // Almost-clear glass: readability comes from blur + text shadow
          // rather than a dark tint, so the photo still reads through.
          background:
            mode === "dark"
              ? "linear-gradient(140deg, rgba(255,255,255,0.06) 0%, rgba(3,0,44,0.10) 100%)"
              : "linear-gradient(140deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 100%)",
          backdropFilter: "blur(32px) saturate(155%)",
          borderTop: hairline,
          borderBottom: hairline,
          boxShadow:
            mode === "dark"
              ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 28px rgba(3,0,44,0.14)"
              : "inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 24px rgba(3,0,44,0.08)",
        }
      : style.plate === "aura"
        ? {
            // Aura soft focus: no panel edges. A wide accent bloom (the
            // division's own accent colour) sits under a heavy backdrop blur
            // and is feathered out with a mask, so the photo dissolves behind
            // the copy instead of being covered by a card. Alphas stay low so
            // the tint never fights light or dark ink.
            background:
              mode === "dark"
                ? `radial-gradient(130% 150% at 26% ${copyAlign === "end" ? "104%" : "-4%"}, ${tintRgba(brand.tokens.accent, 0.3)} 0%, ${tintRgba(brand.tokens.accent, 0.12)} 42%, rgba(3,0,44,0) 76%), linear-gradient(${copyAlign === "end" ? "180deg" : "0deg"}, rgba(3,0,44,0) 0%, rgba(3,0,44,0.26) 48%, rgba(3,0,44,0.5) 100%)`
                : `radial-gradient(130% 150% at 26% ${copyAlign === "end" ? "104%" : "-4%"}, ${tintRgba(brand.tokens.accent, 0.26)} 0%, ${tintRgba(brand.tokens.accent, 0.1)} 42%, rgba(255,255,255,0) 76%), linear-gradient(${copyAlign === "end" ? "180deg" : "0deg"}, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 48%, rgba(255,255,255,0.66) 100%)`,
            backdropFilter: "blur(26px) saturate(150%)",
            // Full strength at the anchored edge, feathering to nothing on the
            // open side — never the reverse, or the bloom clips against the
            // frame and shows a line.
            maskImage: auraMask,
            WebkitMaskImage: auraMask,
            paddingTop: (short * 7) / 100 + bleedTop,
            paddingBottom: (short * 5) / 100 + bleedBottom,
          }
        : style.plate === "solid"
        ? {
            background: mode === "dark" ? "rgba(3,0,44,0.88)" : "rgba(255,255,255,0.92)",
            boxShadow: "0 10px 30px rgba(3,0,44,0.18)",
          }
        : style.plate === "band"
          ? {
              background: mode === "dark" ? "rgba(3,0,44,0.42)" : "rgba(255,255,255,0.48)",
              backdropFilter: "blur(18px) saturate(140%)",
            }
          : style.plateFullBleed
            ? {
                // Plate-less: a soft brand gradient rising behind the copy does
                // the offsetting instead of a panel, so the photo stays whole.
                background:
                  mode === "dark"
                    ? copyAlign === "end"
                      ? "linear-gradient(180deg, rgba(3,0,44,0) 0%, rgba(3,0,44,0.34) 45%, rgba(3,0,44,0.62) 100%)"
                      : "linear-gradient(0deg, rgba(3,0,44,0) 0%, rgba(3,0,44,0.34) 45%, rgba(3,0,44,0.62) 100%)"
                    : copyAlign === "end"
                      ? "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.48) 45%, rgba(255,255,255,0.78) 100%)"
                      : "linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.48) 45%, rgba(255,255,255,0.78) 100%)",
              }
            : { background: "transparent" };
  const accent: CSSProperties = style.accentRule
    ? style.plateFullBleed
      ? { borderTop: `${accentRuleWidth}px solid ${brand.tokens.accent}` }
      : {
          borderLeft: `${accentRuleWidth}px solid ${brand.tokens.accent}`,
          paddingLeft: (short * 3.2) / 100,
        }
    : {};
  // The plate's visual treatment (tint, backdrop blur, mask feather, borders)
  // must sit BEHIND the copy, never over it: applying a mask/blur to the same
  // element that holds the text fades and softens the text itself. So split
  // the plate into layout (stays on the copy container) and fill (rendered as
  // a z-index:-1 layer inside an isolated stacking context).
  const { paddingTop: fillPadTop, paddingBottom: fillPadBottom, ...plateFillPaint } =
    plateFill as CSSProperties & { paddingTop?: number; paddingBottom?: number };
  const plateStyle: CSSProperties = {
    ...plateBase,
    ...(fillPadTop !== undefined ? { paddingTop: fillPadTop } : null),
    ...(fillPadBottom !== undefined ? { paddingBottom: fillPadBottom } : null),
    ...accent,
    position: "relative",
    isolation: "isolate",
  };
  const plateFillStyle: CSSProperties = {
    ...plateFillPaint,
    position: "absolute",
    inset: 0,
    zIndex: -1,
    borderRadius: plateBase.borderRadius,
    pointerEvents: "none",
  };

  const lockupPos: CSSProperties =
    style.lockup === "top-left"
      ? { top: safeInset.top, left: safeInset.left, transformOrigin: "top left" }
      : style.lockup === "bottom-right"
        ? { bottom: safeInset.bottom, right: safeInset.right, transformOrigin: "bottom right" }
        : { top: safeInset.top, right: safeInset.right, transformOrigin: "top right" };


  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-[0_6px_24px_rgba(3,0,44,0.14)]"
      style={wrapperStyle}
    >
      <div className="relative" style={inner} data-kit-asset-frame="true">
        {/* Force mode into the aurora subtree — SocialRenderer is invoked
            outside the deck editor's provider. */}
        <SlideModeContext.Provider value={mode}>
          <AuroraLayer
            seed={`${brandId}-${format.id}-${mode}`}
            brand={brand}
            intensity={1}
            aspect={{ w: format.width, h: format.height }}
          />
        </SlideModeContext.Provider>

        {/* Optional imagery layer — sits above the aurora, below the copy.
            The photo's focal point is pushed into the negative space opposite
            the copy block so the subject is never buried behind the text. */}
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              crossOrigin="anonymous"
              className="absolute inset-0 size-full object-cover"
              style={{ objectPosition }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  mode === "dark"
                    ? copyAlign === "end"
                      ? `linear-gradient(180deg, rgba(3,0,44,${(scrim / 100) * 0.08}) 0%, rgba(3,0,44,${(scrim / 100) * 0.14}) 40%, rgba(3,0,44,${(scrim / 100) * 0.55}) 100%)`
                      : `linear-gradient(0deg, rgba(3,0,44,${(scrim / 100) * 0.08}) 0%, rgba(3,0,44,${(scrim / 100) * 0.14}) 40%, rgba(3,0,44,${(scrim / 100) * 0.55}) 100%)`
                    : copyAlign === "end"
                      ? `linear-gradient(180deg, rgba(255,255,255,${(scrim / 100) * 0.12}) 0%, rgba(255,255,255,${(scrim / 100) * 0.22}) 40%, rgba(255,255,255,${Math.min(1, (scrim / 100) * 0.55 + 0.08)}) 100%)`
                      : `linear-gradient(0deg, rgba(255,255,255,${(scrim / 100) * 0.12}) 0%, rgba(255,255,255,${(scrim / 100) * 0.22}) 40%, rgba(255,255,255,${Math.min(1, (scrim / 100) * 0.55 + 0.08)}) 100%)`,
              }}
            />

          </>
        ) : null}




        {/* Content stack — anchored per copyAlign, inside the safe area and
            capped to the rule-of-thirds copy band so it can never grow into
            the photo's subject third. */}
        <div
          className="absolute flex flex-col"
          style={{
            top: safeInset.top,
            bottom: safeInset.bottom,
            left: safeInset.left,
            right: safeInset.right,
            justifyContent: copyAlign === "end" ? "flex-end" : "flex-start",
            color: inkColor,
          }}
        >
        <div
          className="flex flex-col"
          style={{
            gap: (short * 2.4 * copyScale) / 100,
            // NOTE: width is constrained on the text itself, not here — the
            // plate still needs to bleed full width on full-bleed styles.

            // Soft guide, not a clip: the per-element line clamps do the
            // bounding, so copy never gets sliced through a line of text.
            minHeight: 0,

            ...(imageUrl ? plateStyle : null),
          }}
        >
          {imageUrl ? <div aria-hidden style={plateFillStyle} /> : null}



          {showEyebrow && copy.eyebrow && (
            <div
              style={
                style.eyebrow === "pill"
                  ? {
                      alignSelf: "flex-start",
                      fontSize: (short * preset.eyebrowPct * 0.95) / 100,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: inkColor,
                      background: chipBg,
                      border: chipBorder,
                      borderRadius: 9999,
                      padding: `${(short * 0.9) / 100}px ${(short * 1.8) / 100}px`,
                    }
                  : {
                      fontSize: (short * preset.eyebrowPct) / 100,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color: dimColor,
                    }
              }
            >
              <AccentFigures text={copy.eyebrow} accent={brand.tokens.accent} emphasis={0.6} />
            </div>
          )}

          <div
            style={{
              fontSize: (short * preset.titlePct * style.titleScale * copyScale) / 100,
              lineHeight: style.titleUppercase ? 1.06 : 1.04,
              letterSpacing: style.titleTracking,
              fontWeight: style.titleWeight,
              textTransform: style.titleUppercase ? "uppercase" : "none",
              maxWidth: copyMaxWidth,
              display: "-webkit-box",
              WebkitLineClamp: titleLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <AccentFigures text={copy.title} accent={brand.tokens.accent} />
          </div>


          {preset.showSummary && copy.summary && (
            <div
              style={{
                fontSize: (short * preset.summaryPct * copyScale) / 100,
                lineHeight: 1.28,
                color: dimColor,
                maxWidth: copyMaxWidth,
                display: "-webkit-box",
                WebkitLineClamp: imageUrl ? 2 : 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              <AccentFigures text={copy.summary} accent={brand.tokens.accent} emphasis={0.7} />
            </div>
          )}

          {copy.stat && (
            <StatFigure
              value={copy.stat.value}
              label={copy.stat.label}
              short={short}
              accent={brand.tokens.accent}
              inkColor={inkColor}
              dimColor={dimColor}
              chipBg={chipBg}
              chipBorder={chipBorder}
              valuePx={(short * preset.titlePct * 0.78 * copyScale) / 100}
              labelPx={(short * preset.summaryPct * 0.92 * copyScale) / 100}
            />

          )}

          <div
            className="flex flex-wrap items-center gap-3"
            style={{ marginTop: (short * 1.6) / 100 }}
          >
            {showCta && (
              <span
                style={
                  style.cta === "underline"
                    ? {
                        fontSize: (short * preset.ctaPct) / 100,
                        paddingBottom: (short * 0.5) / 100,
                        borderBottom: `${Math.max(1.5, (short * 0.35) / 100)}px solid ${brand.tokens.accent}`,
                        color: inkColor,
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                      }
                    : {
                        fontSize: (short * preset.ctaPct) / 100,
                        padding: `${(short * 1.2) / 100}px ${(short * 2.2) / 100}px`,
                        borderRadius: style.cta === "block" ? (short * 0.6) / 100 : 9999,
                        background: brand.tokens.accent,
                        color: "#03002C",
                        fontWeight: style.cta === "block" ? 700 : 600,
                        letterSpacing: "0.02em",
                      }
                }
              >
                {copy.cta}
              </span>
            )}
            {facts?.hashtag && (
              <span
                style={{
                  fontSize: (short * preset.ctaPct * 0.95) / 100,
                  padding: `${(short * 1) / 100}px ${(short * 1.8) / 100}px`,
                  borderRadius: 9999,
                  background: chipBg,
                  border: chipBorder,
                  color: inkColor,
                }}
              >
                {facts.hashtag}
              </span>
            )}
          </div>
        </div>
        </div>


        {/* Lockup — corner set by the template style, inside the safe area,
            ~15% larger for stronger brand presence across all formats. */}
        <div
          className="absolute"
          style={{ ...lockupPos, transform: "scale(1.15)" }}
        >

          {eventLogo ? (
            <img
              src={mode === "dark" ? (eventLogo.urlDark ?? eventLogo.url) : eventLogo.url}
              alt=""
              aria-hidden
              style={{
                width: (short * 26) / 100,
                height: (short * 26) / 100 / eventLogo.ratio,
                objectFit: "contain",
                display: "block",
                filter:
                  mode === "dark"
                    ? "drop-shadow(0 2px 10px rgba(0,0,0,0.45))"
                    : "drop-shadow(0 2px 8px rgba(3,0,44,0.18))",
              }}
            />
          ) : (
            <BrandLockup
              brand={brand}
              color={inkColor}
              size={preset.lockupSize}
              showMark
              showDivision={false}
              monochromeOfficialLogo
            />
          )}
        </div>
      </div>
    </div>
  );
}
