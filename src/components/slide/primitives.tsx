import type { CSSProperties, ReactNode } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { useSlideInk, useSlideMode } from "./SlideChrome";
import { accentTokens, hexA } from "@/lib/accent-tokens";
import type { StatShape } from "@/lib/stat-layouts";
import { inferStatIcon, statIconPreset, type StatIconName } from "@/lib/stat-icons";
import { iconByName } from "@/lib/icon-library";
import type { IconSizeToken } from "@/lib/iconography";
import { useStatLayout } from "./StatLayoutContext";


/**
 * Editorial slide primitives — a small, disciplined typographic system used
 * across the 94 module variants so cover, divider, and content families feel
 * like one deck instead of 94 hand-tuned pages.
 *
 * Native stage is 1920×1080 (see ScaledSlide). Sizes are tuned for that stage;
 * they scale down cleanly to editor thumbnails and up cleanly to a projector.
 *
 * Rules of thumb (applied in Phase 2+):
 *   • No more than 3 type sizes per slide (Display + one supporting size + kicker).
 *   • Kicker in accent, uppercase, 0.28em tracking.
 *   • Titles use tight leading (0.98–1.05) and slight negative tracking.
 *   • Body copy at 30–36px with generous 1.35 leading.
 *   • Structural rules are always 1–2px, never heavy borders.
 */

// ── Kicker ────────────────────────────────────────────────────────────────
// Small uppercase eyebrow in accent above a title. Wide letterspacing gives
// the composition its editorial rhythm.
import { useSlideSkin } from "@/components/slide/SlideSkinContext";
import { ENTERPRISE_WHITE, isEnterpriseWhite } from "@/lib/slide-skin";

export function Kicker({
  brand,
  children,
  color,
  size = 22,
  tracking = "0.28em",
  className = "",
}: {
  brand: BrandMode;
  children: ReactNode;
  color?: string;
  size?: number;
  tracking?: string;
  className?: string;
}) {
  const ink = useSlideInk();
  const enterprise = isEnterpriseWhite(useSlideSkin());
  return (
    <div
      className={`${enterprise ? "font-bold" : "font-semibold"} uppercase ${className}`}
      style={{
        color: color ?? `var(--pack-ink-muted, ${enterprise ? ENTERPRISE_WHITE.ink : ink.muted})`,
        fontFamily: "var(--pack-kicker, inherit)",
        fontWeight: "var(--pack-kicker-weight, inherit)" as unknown as number,
        fontSize: enterprise ? Math.max(15, size - 5) : size,
        letterSpacing: `var(--pack-kicker-tracking, ${enterprise ? "0.18em" : tracking})`,
        lineHeight: 1.1,
      }}
    >
      {children}
    </div>
  );
}


// ── Display / Title ───────────────────────────────────────────────────────
// The single dominant type element on a slide. Sizes are named, not free-form,
// so covers stay cinematic and titles stay quiet.
type DisplaySize = "hero" | "cover" | "divider" | "section" | "title";
const DISPLAY_SPECS: Record<
  DisplaySize,
  { fontSize: number; lineHeight: number; letterSpacing: string; weight: number }
> = {
  hero: { fontSize: 124, lineHeight: 0.94, letterSpacing: "-0.04em", weight: 600 },
  cover: { fontSize: 100, lineHeight: 0.98, letterSpacing: "-0.03em", weight: 600 },
  divider: { fontSize: 88, lineHeight: 1.02, letterSpacing: "-0.025em", weight: 600 },
  section: { fontSize: 72, lineHeight: 1.04, letterSpacing: "-0.02em", weight: 600 },
  title: { fontSize: 56, lineHeight: 1.08, letterSpacing: "-0.015em", weight: 600 },
};

export function DisplayTitle({
  children,
  size = "cover",
  color,
  maxWidthPx,
  // Slide titles are canvas artwork rendered many times per page (thumbnails,
  // previews, editors). Defaulting to <h1> put several top-level headings in
  // the document outline; callers that need real semantics can pass `as`.
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  size?: DisplaySize;
  color?: string;
  maxWidthPx?: number;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}) {
  const spec = DISPLAY_SPECS[size];
  const enterprise = isEnterpriseWhite(useSlideSkin());
  const style: CSSProperties = {
    // Style packs scale display type optically — a condensed Bebas headline and
    // a Cormorant headline want different heights at the same "cover" size.
    fontSize: `calc(${spec.fontSize}px * var(--pack-display-scale, 1))`,
    lineHeight: enterprise ? spec.lineHeight + 0.04 : spec.lineHeight,
    letterSpacing: `var(--pack-display-tracking, ${enterprise ? "-0.015em" : spec.letterSpacing})`,
    // Enterprise White headlines are light-weight editorial, not bold.
    fontWeight: `var(--pack-display-weight, ${enterprise ? 400 : spec.weight})` as unknown as number,
    fontFamily: "var(--pack-display, inherit)",
    textTransform: "var(--pack-display-transform, none)" as CSSProperties["textTransform"],
    maxWidth: maxWidthPx,
    color,
  };
  return (
    <Tag className={`m-0 ${className}`} style={style}>
      {children}
    </Tag>
  );

}

// ── Hairline / Rule ───────────────────────────────────────────────────────
// A 1–2px accent rule used as structural punctuation above titles and between
// sections. Never a heavy border.
export function Hairline({
  color,
  widthPx = 88,
  thicknessPx = 2,
  opacity = 1,
  className = "",
  vertical = false,
}: {
  color: string;
  widthPx?: number;
  thicknessPx?: number;
  opacity?: number;
  className?: string;
  vertical?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: color,
        opacity,
        width: vertical ? thicknessPx : widthPx,
        height: vertical ? widthPx : thicknessPx,
      }}
      aria-hidden
    />
  );
}

// A very quiet divider used between rows (border replacement).
export function SoftDivider({ className = "" }: { className?: string }) {
  const ink = useSlideInk();
  const color = ink.hairline;
  return (
    <div
      className={className}
      style={{ height: 1, width: "100%", backgroundColor: color }}
      aria-hidden
    />
  );
}

// ── Body / Supporting text ────────────────────────────────────────────────
export function SupportingText({
  children,
  size = "lg",
  maxWidthPx,
  opacity,
  className = "",
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  maxWidthPx?: number;
  opacity?: number;
  className?: string;
}) {
  const fontSize = size === "xl" ? 40 : size === "lg" ? 32 : size === "md" ? 26 : 22;
  return (
    <p
      className={`m-0 ${className}`}
      style={{ fontSize, lineHeight: 1.38, opacity, maxWidth: maxWidthPx }}
    >
      {children}
    </p>
  );
}

// ── Meta row (dates, presenters, "prepared by" line) ──────────────────────
export function MetaRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-16 gap-y-3 uppercase ${className}`}
      style={{ fontSize: 20, letterSpacing: "0.28em", opacity: 0.7 }}
    >
      {children}
    </div>
  );
}

// ── Editorial title block (kicker + hairline + title + optional dek) ─────
// Used across content slides in place of the ad-hoc SlideTitle. Keeps the
// deck feeling like one designed system.
export function TitleBlock({
  brand,
  kicker,
  title,
  dek,
  size = "title",
  align = "start",
}: {
  brand: BrandMode;
  kicker?: string;
  title: string;
  dek?: string;
  size?: DisplaySize;
  align?: "start" | "center";
}) {
  const ink = useSlideInk();
  const titleColor = ink.text;
  const dekColor = ink.muted;
  return (
    <div
      className={(align === "center" ? "flex flex-col items-center text-center" : "") + " mb-10"}
    >
      {kicker && (
        <div className="mb-6">
          <Kicker brand={brand}>{kicker}</Kicker>
        </div>
      )}
      {!kicker && (
        <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mb-6" />
      )}
      <DisplayTitle size={size} color={titleColor}>
        {title}
      </DisplayTitle>
      {dek && (
        <div className="mt-6">
          <SupportingText size="lg" opacity={1} maxWidthPx={1180} className="">
            <span style={{ color: dekColor }}>{dek}</span>
          </SupportingText>
        </div>
      )}
    </div>
  );
}

// ── StatFigure ────────────────────────────────────────────────────────────
// A single stat, sized like a display headline: huge tabular numeral in
// primary, unit/suffix in accent, small-caps label beneath. Sizes are named
// so a stat row baseline-aligns and a single-stat slide can go monumental.
type StatSize = "sm" | "md" | "lg" | "xl" | "monumental";
const STAT_SPECS: Record<StatSize, { valuePx: number; unitPx: number; labelPx: number }> = {
  sm: { valuePx: 84, unitPx: 32, labelPx: 20 },
  md: { valuePx: 116, unitPx: 42, labelPx: 22 },
  lg: { valuePx: 156, unitPx: 54, labelPx: 24 },
  xl: { valuePx: 200, unitPx: 66, labelPx: 26 },
  monumental: { valuePx: 280, unitPx: 84, labelPx: 28 },
};

/**
 * Typographic SHAPE treatments for a statistic. A stat is composed as a
 * figure, not just set as type: the numeral is the primary shape and the
 * geometry around it is drawn in relation to its optical box. The catalog
 * (ids, labels, per-module defaults) lives in `@/lib/stat-layouts`.
 */
export type { StatShape };

export function StatFigure({
  brand,
  value,
  unit,
  label,
  source,
  size = "md",
  align,
  valueColor,
  unitColor,
  monoLabel = true,
  shape,
  progress,
  accent,
  icon,
  iconSize,
}: {
  brand: BrandMode;
  value: string;
  unit?: string;
  label?: string;
  source?: string;
  size?: StatSize;
  align?: "start" | "center";
  valueColor?: string;
  unitColor?: string;
  monoLabel?: boolean;
  /**
   * Typographic shape treatment. Omit to inherit the module's intentional
   * layout from `StatLayoutProvider` (falls back to the `auto` recipe).
   */
  shape?: StatShape;
  /** 0..1 — drives column / arc / dial / steps / rule length. */
  progress?: number;
  /** Override the division accent used by the shape geometry. */
  accent?: string;
  /**
   * Icon for the `icon-*` shapes. Omit to inherit the module layout's icon,
   * and failing that an icon inferred from the stat's own words.
   */
  icon?: StatIconName | string;
  /**
   * Relative size for the stat's icon. Mirrors the global icon scale so a
   * Slide Studio size change is reflected live on the figure.
   */
  iconSize?: IconSizeToken | string;
}) {
  const ink = useSlideInk();
  const mode = useSlideMode();
  // Per-module layout: an explicit prop always wins, otherwise inherit the
  // intentional treatment configured for this slide's module.
  const moduleLayout = useStatLayout();
  // An explicit icon override implies the caller wants the icon on screen, so
  // promote non-icon shapes to `icon-lead` rather than dropping the pick.
  const baseShape: StatShape = shape ?? moduleLayout.shape ?? "auto";
  const resolvedShape: StatShape =
    icon && !baseShape.startsWith("icon-") ? "icon-lead" : baseShape;
  const resolvedAlign = align ?? moduleLayout.align ?? "start";
  const isIconShape = resolvedShape.startsWith("icon-");
  // Explicit overrides may name a curated stat preset *or* any icon from the
  // shared icon library (that is what the Slide Studio picker offers), so try
  // both before falling back to the module layout / inferred icon.
  const overrideIcon = icon ? (statIconPreset(icon)?.Icon ?? iconByName(icon)) : null;
  const iconPreset = isIconShape
    ? (statIconPreset(moduleLayout.icon) ??
      statIconPreset(inferStatIcon({ value, unit, label })))
    : null;
  const StatIcon = (isIconShape ? (overrideIcon ?? iconPreset?.Icon) : null) ?? null;
  // md === the figure's intrinsic proportion; other tokens scale around it.
  const iconK =
    ({ xs: 0.6, sm: 0.8, md: 1, lg: 1.25, xl: 1.6, display: 2.2 } as Record<string, number>)[
      String(iconSize ?? "md")
    ] ?? 1;
  const isIconRow = resolvedShape === "icon-lead" || resolvedShape === "icon-tile";
  const spec = STAT_SPECS[size];
  const shapeAccent = accent ?? brand.tokens.accent;
  const aTok = accentTokens(shapeAccent, mode === "dark" ? "dark" : "light");
  // Accent-derived ink: `aInk` for text, `aFig` for the primary graphic marks
  // (arcs, slabs, rules). Both fall back to the raw accent when it already
  // clears contrast, and lighten deep accents (Blue 500, Pink, Red) on navy so
  // the figure never blends into the dark plate — on-screen or in PDF export.
  const aInk = aTok.ink;
  const aFig = aTok.figureInk;
  const p = Math.max(0, Math.min(1, progress ?? moduleLayout.progress ?? 0.72));
  const centeredShape = resolvedAlign === "center";
  const ruleWeight = Math.max(3, Math.round(spec.valuePx * 0.035));
  const ruleWidth = centeredShape
    ? "58%"
    : `${Math.min(100, Math.round(34 + p * 60))}%`;

  const vc = valueColor ?? ink.text;
  const uc = unitColor ?? ink.muted;
  const labelColor = ink.muted;
  // Overflow safeguards: wide values (e.g. "$220k", "1,240 pts") sitting in
  // half-width grid columns previously spilled into the neighbor. We now:
  //   • constrain the wrapper with `min-w-0 max-w-full` so it can actually
  //     shrink inside a grid track (grid children default to `min-width: auto`
  //     and refuse to compress, which is what caused the overlap);
  //   • keep the numeral on one line but let it shrink via a viewport-clamped
  //     font-size ceiling so very wide values step down automatically before
  //     they touch the next column;
  //   • tighten letter-spacing on the value so long strings stay compact.
  const unitText = unit?.trim() ?? "";
  const unitIsLong = /\s|·|\/|–|-/.test(unitText) || unitText.length > 6;
  // A "phrase value" is a value that isn't just a number+suffix but a full
  // clause like "38% ↓ time to market". These previously overflowed their
  // grid track because `white-space:nowrap` refused to wrap. Detect the case
  // and switch into a wrapping, size-stepped-down mode so the phrase fits
  // inside its column at the same visual weight.
  const valueText = value ?? "";
  const valueIsPhrase =
    valueText.trim().length > 8 &&
    /\s/.test(valueText.trim()) &&
    // exclude thousand-separated numerics like "1 240" (rare) — require at
    // least one alphabetic word of 3+ chars to qualify as a phrase.
    /[A-Za-z]{3,}/.test(valueText);
  const valueFontSize = valueIsPhrase
    ? `min(${Math.round(spec.valuePx * 0.5)}px, 9cqw)`
    : unitIsLong
      ? `min(${spec.valuePx}px, 18cqw)`
      : `min(${spec.valuePx}px, 20cqw)`;
  const unitFontSize = unitIsLong
    ? `min(${Math.max(32, Math.round(spec.unitPx * 0.58))}px, 5.6cqw)`
    : `min(${spec.unitPx}px, 6.5cqw)`;
  return (
    <div
      data-stat-figure={size}
      data-stat-shape={resolvedShape}
      className={`relative min-w-0 max-w-full overflow-hidden ${centeredShape ? "flex flex-col items-center text-center" : ""}`}
      style={{
        containerType: "inline-size",
        contain: "inline-size",
        ...(resolvedShape === "frame"
          ? {
              border: `${Math.max(1, Math.round(spec.valuePx * 0.008))}px solid ${hexA(aFig, mode === "dark" ? 0.4 : 0.28)}`,
              borderRadius: Math.round(spec.valuePx * 0.05),
              padding: `${Math.round(spec.valuePx * 0.14)}px ${Math.round(spec.valuePx * 0.16)}px`,
            }
          : null),
        ...(resolvedShape === "spine"
          ? { paddingLeft: Math.round(spec.valuePx * 0.16) }
          : null),
        ...(resolvedShape === "bracket"
          ? { paddingLeft: Math.round(spec.valuePx * 0.16), paddingRight: Math.round(spec.valuePx * 0.16) }
          : null),
      }}
    >
      {(resolvedShape === "ghost" || resolvedShape === "auto") && !valueIsPhrase && (() => {
        // The ghost counterform is a single nowrap line inside an
        // `overflow:hidden` container, so a long value ("$220k", "1,240 hrs")
        // used to run past the right edge and read as a clipped/broken figure.
        // Budget the type size against the character count so the whole
        // counterform always fits the track: width ≈ chars × 0.56em.
        const ghostText = value || "\u2014";
        const chars = Math.max(1, ghostText.replace(/\s/g, "").length);
        const cqwCeiling = Math.max(8, Math.min(mode === "dark" ? 34 : 26, 96 / (chars * 0.56)));
        const pxCeiling = Math.round(spec.valuePx * (mode === "dark" ? 1.7 : 1.35));
        return (
          <span
            aria-hidden
            data-accent-glow
            data-decorative
            className="pointer-events-none absolute select-none font-semibold tabular-nums"
            style={{
              // Light surfaces get a smaller, quieter counterform so it reads as
              // texture behind the numeral instead of a second competing figure.
              fontSize: `min(${pxCeiling}px, ${cqwCeiling.toFixed(2)}cqw)`,
              lineHeight: 0.74,
              letterSpacing: "-0.05em",
              top: `-${Math.round(spec.valuePx * (mode === "dark" ? 0.3 : 0.2))}px`,
              left: centeredShape ? "50%" : 0,
              transform: centeredShape ? "translateX(-50%)" : undefined,
              color: "transparent",
              WebkitTextFillColor: "transparent",
              WebkitTextStrokeWidth: Math.max(1, Math.round(spec.valuePx * 0.012)),
              WebkitTextStrokeColor: hexA(aFig, mode === "dark" ? 0.18 : 0.1),
              whiteSpace: "nowrap",
              maxWidth: "100%",
              zIndex: 0,
            }}
          >
            {ghostText}
          </span>
        );
      })()}

      {resolvedShape === "slab" && (
        <span
          aria-hidden
          data-accent-glow
          className="pointer-events-none absolute"
          style={{
            left: centeredShape ? "50%" : 0,
            transform: centeredShape ? "translateX(-50%)" : undefined,
            top: `${Math.round(spec.valuePx * 0.5)}px`,
            height: `${Math.round(spec.valuePx * 0.3)}px`,
            width: ruleWidth,
            background: `linear-gradient(90deg, ${hexA(aFig, mode === "dark" ? 0.34 : 0.18)} 0%, ${hexA(aFig, 0)} 100%)`,
            borderRadius: 2,
            zIndex: 0,
          }}
        />
      )}
      {resolvedShape === "notch" && (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0" style={{ zIndex: 0 }}>
          <span
            className="absolute left-0 top-0"
            style={{
              width: Math.round(spec.valuePx * 0.14),
              height: Math.round(spec.valuePx * 0.14),
              borderTop: `2px solid ${hexA(aFig, 0.55)}`,
              borderLeft: `2px solid ${hexA(aFig, 0.55)}`,
            }}
          />
          <span
            className="absolute right-0 top-0"
            style={{
              width: Math.round(spec.valuePx * 0.14),
              height: Math.round(spec.valuePx * 0.14),
              borderTop: `2px solid ${hexA(aFig, 0.55)}`,
              borderRight: `2px solid ${hexA(aFig, 0.55)}`,
            }}
          />
        </span>
      )}
      {resolvedShape === "arc" && (
        <svg
          aria-hidden
          viewBox="0 0 200 112"
          className="pointer-events-none absolute"
          style={{
            width: `${Math.round(spec.valuePx * 1.95)}px`,
            top: `-${Math.round(spec.valuePx * 0.12)}px`,
            left: centeredShape ? "50%" : 0,
            transform: centeredShape ? "translateX(-50%)" : undefined,
            zIndex: 0,
          }}
        >
          <path
            d="M12 104 A88 88 0 0 1 188 104"
            fill="none"
            stroke={hexA(aFig, mode === "dark" ? 0.2 : 0.14)}
            strokeWidth={8}
            strokeLinecap="round"
          />
          <path
            d="M12 104 A88 88 0 0 1 188 104"
            fill="none"
            stroke={aFig}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={277}
            strokeDashoffset={277 * (1 - p)}
          />
        </svg>
      )}
      {resolvedShape === "spine" && (
        <span
          aria-hidden
          data-decorative
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: Math.max(4, Math.round(spec.valuePx * 0.035)),
            height: Math.round(spec.valuePx * 0.92),
            borderRadius: 999,
            background: `linear-gradient(180deg, ${aFig} 0%, ${hexA(aFig, 0.08)} 100%)`,
            zIndex: 0,
          }}
        />
      )}
      {resolvedShape === "bracket" && (
        <span
          aria-hidden
          data-decorative
          className="pointer-events-none absolute top-0"
          style={{
            // Keep the brackets optically tied to the figure instead of
            // stretching across the entire slide-width stat track.
            left: "22%",
            right: "22%",
            height: Math.round(spec.valuePx * 0.86),
            zIndex: 0,
          }}
        >
          {(["left", "right"] as const).map((side) => (
            <span
              key={side}
              className={`absolute top-0 h-full ${side === "left" ? "left-0" : "right-0"}`}
              style={{
                width: Math.round(spec.valuePx * 0.11),
                borderTop: `${Math.max(3, Math.round(spec.valuePx * 0.026))}px solid ${aFig}`,
                borderBottom: `${Math.max(3, Math.round(spec.valuePx * 0.026))}px solid ${aFig}`,
                borderLeft:
                  side === "left"
                    ? `${Math.max(3, Math.round(spec.valuePx * 0.026))}px solid ${aFig}`
                    : undefined,
                borderRight:
                  side === "right"
                    ? `${Math.max(3, Math.round(spec.valuePx * 0.026))}px solid ${aFig}`
                    : undefined,
              }}
            />
          ))}
        </span>
      )}
      {resolvedShape === "dial" && (
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="pointer-events-none absolute"
          style={{
            width: `${Math.round(spec.valuePx * 1.9)}px`,
            top: `-${Math.round(spec.valuePx * 0.42)}px`,
            left: centeredShape ? "50%" : 0,
            transform: centeredShape ? "translateX(-50%)" : undefined,
            zIndex: 0,
          }}
        >
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={hexA(aFig, mode === "dark" ? 0.18 : 0.12)}
            strokeWidth={8}
          />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={aFig}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={578}
            strokeDashoffset={578 * (1 - p)}
            transform="rotate(-90 100 100)"
          />
        </svg>
      )}
      {resolvedShape === "strike" && !valueIsPhrase && (
        <span
          aria-hidden
          data-decorative
          className="pointer-events-none absolute"
          style={{
            top: `${Math.round(spec.valuePx * 0.44)}px`,
            left: centeredShape ? "50%" : 0,
            transform: centeredShape ? "translateX(-50%)" : undefined,
            width: ruleWidth,
            height: Math.max(3, Math.round(spec.valuePx * 0.022)),
            borderRadius: 999,
            background: hexA(aFig, mode === "dark" ? 0.8 : 0.55),
            zIndex: 2,
          }}
        />
      )}
      {resolvedShape === "stack" && (
        <span
          aria-hidden
          className="relative block"
          style={{
            width: centeredShape ? "42%" : "100%",
            height: Math.max(2, Math.round(spec.valuePx * 0.014)),
            marginBottom: Math.round(spec.valuePx * 0.12),
            background: mode === "dark" ? "rgba(255,255,255,0.22)" : hexA(aFig, 0.28),
            zIndex: 1,
          }}
        />
      )}
      {resolvedShape === "icon-ghost" && StatIcon && (
        <span
          aria-hidden
          data-decorative
          data-accent-glow
          className="pointer-events-none absolute"
          style={{
            top: `-${Math.round(spec.valuePx * 0.18)}px`,
            left: centeredShape ? "50%" : `-${Math.round(spec.valuePx * 0.06)}px`,
            transform: centeredShape ? "translateX(-50%)" : undefined,
            color: hexA(aFig, mode === "dark" ? 0.22 : 0.13),
            zIndex: 0,
          }}
        >
          <StatIcon
            size={Math.round(spec.valuePx * 1.25 * iconK)}
            strokeWidth={1.25}
            absoluteStrokeWidth
          />
        </span>
      )}
      {resolvedShape === "icon-crest" && StatIcon && (
        <span
          aria-hidden
          data-decorative
          className={`relative block ${centeredShape ? "mx-auto" : ""}`}
          style={{
            width: Math.round(spec.valuePx * 0.62),
            marginBottom: Math.round(spec.valuePx * 0.07),
            color: aInk,
            zIndex: 1,
          }}
        >
          <StatIcon size={Math.round(spec.valuePx * 0.62 * iconK)} strokeWidth={1.4} absoluteStrokeWidth />
        </span>
      )}
      <div
        className={isIconRow ? "relative flex items-center" : "relative"}
        style={{ zIndex: 1, gap: isIconRow ? Math.round(spec.valuePx * 0.16) : undefined }}
      >
        {isIconRow && StatIcon && (
          resolvedShape === "icon-tile" ? (
            <span
              aria-hidden
              data-decorative
              className="relative flex shrink-0 items-center justify-center"
              style={{
                width: Math.round(spec.valuePx * 0.78),
                height: Math.round(spec.valuePx * 0.78),
                borderRadius: Math.round(spec.valuePx * 0.18),
                background: `linear-gradient(160deg, ${hexA(aFig, mode === "dark" ? 0.28 : 0.16)} 0%, ${hexA(aFig, mode === "dark" ? 0.1 : 0.05)} 100%)`,
                border: `1px solid ${hexA(aFig, mode === "dark" ? 0.4 : 0.24)}`,
                color: aInk,
              }}
            >
              <StatIcon
                size={Math.round(spec.valuePx * 0.44 * iconK)}
                strokeWidth={1.6}
                absoluteStrokeWidth
              />
            </span>
          ) : (
            <span
              aria-hidden
              data-decorative
              className="relative flex shrink-0 items-center"
              style={{
                color: aInk,
                paddingRight: Math.round(spec.valuePx * 0.14),
                borderRight: `1px solid ${hexA(aFig, mode === "dark" ? 0.32 : 0.2)}`,
              }}
            >
              <StatIcon
                size={Math.round(spec.valuePx * 0.86 * iconK)}
                strokeWidth={1.3}
                absoluteStrokeWidth
              />
            </span>
          )
        )}
      <div className="relative min-w-0 max-w-full">
      <div
        className={valueIsPhrase ? "font-semibold" : "font-semibold tabular-nums"}
        style={{
          fontSize: valueFontSize,
          lineHeight: valueIsPhrase ? 1.05 : 0.92,
          letterSpacing: valueIsPhrase ? "-0.02em" : "-0.035em",
          color: vc,
          whiteSpace: valueIsPhrase ? "normal" : "nowrap",
          overflowWrap: valueIsPhrase ? "anywhere" : "normal",
          wordBreak: "normal",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "clip",
        }}
      >
        <span>{value || "—"}</span>
        {unitText && !unitIsLong && (
          <span
            className="ml-2 font-medium align-top"
            style={{ fontSize: unitFontSize, color: uc, letterSpacing: "-0.02em" }}
          >
            {unitText}
          </span>
        )}
      </div>
      {unitText && unitIsLong && (
        <div
          className={centeredShape ? "mx-auto mt-2 font-medium" : "mt-2 font-medium"}
          style={{
            fontSize: unitFontSize,
            lineHeight: 1.08,
            letterSpacing: "-0.015em",
            color: uc,
            maxWidth: "100%",
            overflow: "hidden",
            overflowWrap: "anywhere",
            wordBreak: "normal",
          }}
        >
          {unitText}
        </div>
      )}
      </div>
      </div>
      {(resolvedShape === "auto" || resolvedShape === "rule" || resolvedShape === "notch") && (
        <span
          aria-hidden
          data-accent-glow
          className="relative block"
          style={{
            marginTop: Math.round(spec.valuePx * 0.1),
            height: ruleWeight,
            width: ruleWidth,
            borderRadius: ruleWeight,
            background: `linear-gradient(90deg, ${aFig} 0%, ${hexA(aFig, 0.14)} 100%)`,
            zIndex: 1,
          }}
        />
      )}
      {(resolvedShape === "column" || resolvedShape === "slab" || resolvedShape === "icon-tile") && (
        <span
          aria-hidden
          className="relative block overflow-hidden"
          style={{
            marginTop: Math.round(spec.valuePx * 0.11),
            height: Math.max(5, Math.round(spec.valuePx * 0.05)),
            width: "100%",
            borderRadius: 999,
            background: mode === "dark" ? "rgba(255,255,255,0.10)" : hexA(aFig, 0.12),
            zIndex: 1,
          }}
        >
          <span
            className="absolute inset-y-0 left-0 block"
            style={{
              width: `${Math.round(p * 100)}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${aFig} 0%, ${hexA(aFig, 0.35)} 100%)`,
            }}
          />
        </span>
      )}
      {resolvedShape === "ledger" && (
        <span
          aria-hidden
          className="relative block"
          style={{
            marginTop: Math.round(spec.valuePx * 0.1),
            height: Math.max(2, Math.round(spec.valuePx * 0.014)),
            width: "100%",
            background: mode === "dark" ? "rgba(255,255,255,0.16)" : hexA(aFig, 0.22),
            zIndex: 1,
          }}
        >
          <span
            className="absolute block"
            style={{
              top: -Math.max(1, Math.round(spec.valuePx * 0.011)),
              left: centeredShape ? "50%" : 0,
              transform: centeredShape ? "translateX(-50%)" : undefined,
              width: Math.round(spec.valuePx * 0.42),
              height: Math.max(4, Math.round(spec.valuePx * 0.036)),
              borderRadius: 2,
              background: aFig,
            }}
          />
        </span>
      )}
      {resolvedShape === "steps" && (
        <span
          aria-hidden
          className="relative flex w-full gap-2"
          style={{ marginTop: Math.round(spec.valuePx * 0.11), zIndex: 1 }}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const fill = Math.max(0, Math.min(1, p * 5 - i));
            return (
              <span
                key={i}
                className="relative block flex-1 overflow-hidden"
                style={{
                  height: Math.max(6, Math.round(spec.valuePx * 0.055)),
                  borderRadius: 2,
                  background: mode === "dark" ? "rgba(255,255,255,0.10)" : hexA(aFig, 0.12),
                }}
              >
                <span
                  className="absolute inset-y-0 left-0 block"
                  style={{
                    width: `${Math.round(fill * 100)}%`,
                    borderRadius: 2,
                    background: aFig,
                  }}
                />
              </span>
            );
          })}
        </span>
      )}
      {label && (
        <div
          className={monoLabel ? "mt-6 font-semibold uppercase" : "mt-6"}
          style={{
            fontSize: spec.labelPx,
            letterSpacing: monoLabel ? "0.28em" : "-0.005em",
            color: labelColor,
            lineHeight: 1.25,
            maxWidth: 560,
          }}
        >
          {label}
        </div>
      )}
      {source && (
        <div
          className="mt-4 uppercase"
          style={{ fontSize: 16, letterSpacing: "0.28em", color: labelColor, opacity: 0.75 }}
        >
          Source · {source}
        </div>
      )}
    </div>
  );
}

// ── QuoteMark ─────────────────────────────────────────────────────────────
// The typographic curly quote glyph in accent at low opacity, positioned
// behind or above a pull quote. Never a card ornament — always the sheet.
export function QuoteMark({
  color,
  size = 520,
  opacity = 0.12,
  className = "",
  style = {},
  glyph = "\u201C",
}: {
  color: string;
  size?: number;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
  glyph?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      style={{
        color,
        opacity,
        fontSize: size,
        lineHeight: 0.72,
        fontWeight: 600,
        letterSpacing: "-0.06em",
        ...style,
      }}
    >
      {glyph}
    </div>
  );
}

// ── Attribution ───────────────────────────────────────────────────────────
// Small-caps meta line for quote attributions, preceded by a short hairline.
export function Attribution({
  brand,
  name,
  role,
  org,
  align = "start",
}: {
  brand: BrandMode;
  name: string;
  role?: string;
  org?: string;
  align?: "start" | "center";
}) {
  const ink = useSlideInk(brand.tokens.accent);
  const nameColor = ink.text;
  const metaColor = ink.muted;
  return (
    <div className={align === "center" ? "flex flex-col items-center text-center" : ""}>
      <Hairline color={brand.tokens.accent} widthPx={56} thicknessPx={2} className="mb-5" />
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.015em", color: nameColor }}>
        {name}
      </div>
      {(role || org) && (
        <div
          className="mt-2 uppercase"
          style={{ fontSize: 18, letterSpacing: "0.28em", color: metaColor, fontWeight: 500 }}
        >
          {[role, org].filter(Boolean).join("  ·  ")}
        </div>
      )}
    </div>
  );
}
