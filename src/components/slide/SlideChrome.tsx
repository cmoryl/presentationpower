import type { BrandMode } from "@/lib/taxonomy";
import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import {
  resolveLogoPlacement,
  logoPositionStyles,
  type ChromeVariant,
  type LogoPosition,
  type LogoOrientation,
} from "@/lib/logo-placement";
import { GRAIN_SVG } from "@/components/slide/grain";
import { AuroraLayer } from "@/components/slide/flagship";


// Every slide can render in light or dark mode. VariantRenderer sets this
// context per slide; SlideFrame and helpers read it to flip content surfaces
// and text colors without every switch case having to know about the mode.
export type SlideMode = "light" | "dark";
export const SlideModeContext = createContext<SlideMode>("light");
export function useSlideMode(): SlideMode {
  return useContext(SlideModeContext);
}

// Division accent (hex) for the current slide — set by VariantRenderer from
// the active brand mode. Consumed by glass primitives so hairline rings, icon
// wells and inner glows automatically pick up the division's accent colour
// (Gaming emerald, Legal gold, Media magenta, etc.) without every call site
// having to thread `accent` explicitly.
export const SlideAccentContext = createContext<string | null>(null);
export function useSlideAccent(): string | null {
  return useContext(SlideAccentContext);
}


// Optional imagery layer rendered BEHIND the slide content. When set, the
// SlideFrame replaces its opaque token background with either a photo + scrim
// (`url`) or a CSS background layer (`css` — used by the curated background
// library for gradients / SVG patterns).
export type SlideBackdrop = {
  url?: string;
  css?: string;
  /** When true, render the procedural AuroraLayer instead of a photo/css bg. */
  aurora?: boolean;
  /** Seed for AuroraLayer determinism (defaults to variant id). */
  auroraSeed?: string;
  scrim?: "bottom" | "left" | "right" | "top" | "full" | "vignette";
  scrimStrength?: number;
  imageDim?: number;
  tint?: string;
  darkChrome?: boolean;
  // Image positioning (only used when `url` is set).
  fit?: "cover" | "contain";
  zoom?: number; // 1..3 — CSS scale on the image
  offsetX?: number; // -100..100 (percent). 0 = center.
  offsetY?: number; // -100..100 (percent). 0 = center.
};

export const SlideBackdropContext = createContext<SlideBackdrop | null>(null);

// A slide frame that owns the locked chrome — brand bar, footer, logo, page
// number. Locked fields live here so variant renderers cannot override them.
// The brand lockup is placed in an approved zone per chrome variant / layout;
// consumers can pass an explicit `logoPosition` for one-off overrides.

export function SlideFrame({
  brand,
  pageNumber,
  children,
  variant = "content",
  clientName,
  clientLogoUrl,
  subCompany,
  layoutId,
  logoPosition,
  logoOrientation = "horizontal",
}: {
  brand: BrandMode;
  pageNumber?: number;
  children: ReactNode;
  variant?: ChromeVariant;
  clientName?: string;
  clientLogoUrl?: string | null;
  subCompany?: string;
  layoutId?: string;
  logoPosition?: LogoPosition;
  logoOrientation?: LogoOrientation;
}) {

  const mode = useSlideMode();
  const backdrop = useContext(SlideBackdropContext);
  const isChromeDark = variant === "cover" || variant === "divider" || variant === "close";
  const slideDark = mode === "dark" || isChromeDark;
  // Baseline variants are simple and readable: white slides with ink text in
  // light mode, dark navy slides with white text in dark mode. Cover / divider
  // / close chrome always renders on the dark navy surface regardless of
  // theme so hero titles keep their editorial contrast.
  const hasBackdrop = !!backdrop;
  const hasBackdropImage = !!backdrop?.url;
  const hasBackdropAurora = !!backdrop?.aurora;
  const hasBackdropCss = !!(backdrop?.css && !backdrop?.url && !backdrop?.aurora);
  // A backdrop is "dark" when the caller flagged darkChrome, or when it's a
  // photo/aurora backdrop on a non-light slide (legacy behavior).
  const backdropIsDark = hasBackdrop && (backdrop?.darkChrome ?? ((hasBackdropImage || hasBackdropAurora) && !slideDark));
  const lightBackdrop = hasBackdrop && !backdropIsDark && !slideDark;
  const darkBackdrop = hasBackdrop && !lightBackdrop;

  const bg = slideDark ? "#03002C" : "#ffffff";
  const fg = darkBackdrop || slideDark ? "#ffffff" : brand.tokens.ink;
  const logoColor = darkBackdrop || slideDark ? "#ffffff" : brand.tokens.primary;

  const placement = resolveLogoPlacement(variant, layoutId, logoPosition);
  const showLogo = placement.position !== "hidden";
  // Bottom-adjacent logos sit above the footer band; content needs extra
  // pb so titles / bullets / cards don't slide under the lockup. Top-adjacent
  // logos need a little more pt on hero (cover) chrome where the mark is xl.
  const bottomLogo = showLogo && (
    placement.position === "bottom-left" ||
    placement.position === "bottom-right" ||
    placement.position === "bottom-center"
  );
  const topCenterLogo = showLogo && placement.position === "top-center";
  const bottomCenterLogo = showLogo && placement.position === "bottom-center";



  // Light backdrops use a cream/white tint so photography reads bright; dark
  // backdrops keep the original navy scrim. Callers can still override tint.
  const defaultTint = lightBackdrop ? "#FFFFFF" : "#03002C";
  // Light mode: force the backdrop tint to pure white and push the scrim
  // near-opaque so imagery reads as a subtle wash on a white page.
  const tint = lightBackdrop ? "#FFFFFF" : (backdrop?.tint ?? defaultTint);
  const scrimStrength = lightBackdrop ? 0.92 : (backdrop?.scrimStrength ?? 0.55);


  const scrimGradient = (() => {
    if (!backdrop) return "none";
    const a = scrimStrength;
    const t = tint;
    // Light mode: keep the whole frame near-white and only let the image
    // peek through as a faint tinted wash on the opposite edge.
    const minA = lightBackdrop ? Math.min(1, a * 0.78) : 0;
    const midA = lightBackdrop ? Math.min(1, a * 0.9) : a * 0.55;
    const to = (dir: string) =>
      `linear-gradient(${dir}, ${hexA(t, a)} 0%, ${hexA(t, midA)} 45%, ${hexA(t, minA)} 100%)`;
    switch (backdrop.scrim ?? "bottom") {
      case "bottom": return to("to top");
      case "top":    return to("to bottom");
      case "left":   return to("to right");
      case "right":  return to("to left");
      case "full":   return `linear-gradient(${hexA(t, a)}, ${hexA(t, a)})`;
      case "vignette":
        return lightBackdrop
          ? `radial-gradient(circle at 50% 50%, ${hexA(t, a * 0.85)} 0%, ${hexA(t, a)} 70%)`
          : `linear-gradient(${hexA(t, a * 0.35)}, ${hexA(t, a)})`;
    }

  })();

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: hasBackdrop ? (lightBackdrop ? "#fff" : "#000") : bg, color: fg }}>
      {hasBackdropCss && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: backdrop!.css }}
        />
      )}
      {hasBackdropAurora && (
        <AuroraLayer seed={backdrop?.auroraSeed ?? "aurora"} brand={brand} />
      )}
      {hasBackdropImage && (
        <>

          <img
            src={backdrop!.url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full"
            style={{
              objectFit: backdrop!.fit ?? "cover",
              objectPosition: `${50 + (backdrop!.offsetX ?? 0) / 2}% ${50 + (backdrop!.offsetY ?? 0) / 2}%`,
              transform: backdrop!.zoom && backdrop!.zoom !== 1 ? `scale(${backdrop!.zoom})` : undefined,
              transformOrigin: "center center",
              filter: lightBackdrop
                ? `brightness(${1.08 + (backdrop!.imageDim ?? 0) * 0.2}) saturate(0.85) contrast(0.95)`
                : backdrop!.imageDim
                  ? `brightness(${1 - backdrop!.imageDim}) saturate(0.95)`
                  : undefined,
            }}
          />
          {/* Soft-focus accent haze — tinted from the division's brand tokens.
              On light backdrops we swap to `multiply` so the tint reads as a
              gentle wash rather than a bright screen blend. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-[12%] top-[4%] h-[48%] w-[54%] rounded-full"
            style={{
              backgroundColor: hexA(brand.tokens.accent, lightBackdrop ? 0.28 : 0.18),
              filter: "blur(58px)",
              mixBlendMode: lightBackdrop ? "multiply" : "screen",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-[12%] right-[-10%] h-[56%] w-[56%] rounded-full"
            style={{
              backgroundColor: hexA(brand.tokens.primary, lightBackdrop ? 0.14 : 0.22),
              filter: "blur(64px)",
              mixBlendMode: lightBackdrop ? "multiply" : "screen",
            }}
          />
          <div className="absolute inset-0" style={{ backgroundImage: scrimGradient }} />
        </>
      )}


      {/* ─────────────────────────────────────────────────────────────────
          Abstract ground grammar (no-backdrop slides). One layered system
          echoing the photographic grammar from MediaTile / HeroScrim:
            • angled brand-primary→ink wash (direction, not centered blob)
            • accent corner glow — carries the division re-tone
            • soft top-highlight + bottom vignette for depth
            • shared GRAIN_SVG at low alpha so abstract slides have the
              same tactile finish as photographic ones
          Chrome variants (cover / divider / close) get a bolder sweep and
          stronger accent presence — those are the deck's dramatic moments.
          Content variants stay quiet and recessive so data reads clean.
          ───────────────────────────────────────────────────────────────── */}
      {!hasBackdrop && slideDark && (() => {
        const isHero = variant === "cover" || variant === "divider" || variant === "close";
        const primary = brand.tokens.primary;
        const accent = brand.tokens.accent;
        const sweepA = isHero ? 0.72 : 0.48;
        const sweepB = isHero ? 0.28 : 0.14;
        const accentA = isHero ? 0.30 : 0.14;
        const accentB = isHero ? 0.14 : 0.06;
        return (
          <>
            {/* Angled primary wash — bottom-left → top-right, so light rakes
                across the slide the way it does across a photograph. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(118deg, ${hexA(primary, sweepA)} 0%, ${hexA(primary, sweepB)} 48%, rgba(0,0,0,0) 82%)`,
              }}
            />
            {/* Accent corner glow — the moment of division re-tone. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(58% 44% at 92% 96%, ${hexA(accent, accentA)} 0%, ${hexA(accent, 0)} 70%), radial-gradient(42% 30% at 6% 8%, ${hexA(accent, accentB)} 0%, ${hexA(accent, 0)} 70%)`,
                mixBlendMode: "screen",
              }}
            />
            {/* Depth: subtle top highlight + bottom vignette. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.32) 100%)" }}
            />
            {/* Grain — matches MediaTile / HeroScrim tactile finish. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: GRAIN_SVG, backgroundSize: "160px 160px", opacity: isHero ? 0.14 : 0.08, mixBlendMode: "overlay" }}
            />
          </>
        );
      })()}

      {/* Light-mode abstract ground — same grammar, airy mood. Extremely
          recessive by default so content variants stay clean; hero chrome
          variants in light mode already flip to dark chrome above so they
          take the dark branch, not this one. */}
      {!hasBackdrop && !slideDark && (() => {
        const primary = brand.tokens.primary;
        const accent = brand.tokens.accent;
        return (
          <>
            {/* Angled wash — off-white with a whisper of primary along the
                bottom-left → top-right axis, kept far below AA-impact. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(118deg, ${hexA(primary, 0.05)} 0%, ${hexA(primary, 0.02)} 45%, rgba(255,255,255,0) 80%), linear-gradient(180deg, rgba(255,255,255,1) 0%, ${hexA(brand.tokens.surface, 0.55)} 100%)`,
              }}
            />
            {/* Accent corner glow — division re-tone as a faint tint. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(50% 38% at 96% 96%, ${hexA(accent, 0.12)} 0%, ${hexA(accent, 0)} 70%), radial-gradient(36% 26% at 4% 8%, ${hexA(primary, 0.06)} 0%, ${hexA(primary, 0)} 72%)`,
                mixBlendMode: "multiply",
              }}
            />
            {/* Vignette — very faint, keeps corners from feeling paper-cut. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 60%, rgba(3,0,44,0.05) 100%)" }}
            />
            {/* Grain — barely-there tactile finish. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: GRAIN_SVG, backgroundSize: "160px 160px", opacity: 0.05, mixBlendMode: "multiply" }}
            />
          </>
        );
      })()}


      {/* Brand bar (locked) — hairline accent rule, editorial not decorative. */}
      <div
        className="absolute left-0 top-0 h-[2px] w-full"
        style={{ backgroundColor: brand.tokens.accent, opacity: slideDark || darkBackdrop ? 0.85 : 0.9 }}
      />
      {/* Brand lockup (locked) — placed per approved zone. Content slides
          stay quiet at sm so titles carry the composition; cover / divider /
          close slides scale up so the mark reads at hero size. */}
      {showLogo && (() => {
        const isVertical = logoOrientation === "vertical-left" || logoOrientation === "vertical-right";
        const isMarkOnly = logoOrientation === "mark-only";
        // Half-size positions per brand direction (top/bottom-center + left side).
        const halfSize = (
          placement.position === "top-center" ||
          placement.position === "bottom-center" ||
          placement.position === "top-left" ||
          placement.position === "bottom-left"
        );
        const baseSize = variant === "content" ? "sm" : variant === "cover" ? "xl" : "md";
        const shrink: Record<string, "2xs" | "xs" | "sm" | "md" | "lg" | "xl"> = {
          xl: "sm", lg: "xs", md: "xs", sm: "2xs", xs: "2xs", "2xs": "2xs",
        };
        const sizeAfterHalf = halfSize ? shrink[baseSize] : (baseSize as "sm" | "md" | "xl");
        // Mark-only is a quiet signature — one step smaller than the base.
        const effectiveSize = isMarkOnly ? (shrink[sizeAfterHalf] ?? sizeAfterHalf) : sizeAfterHalf;

        // Vertical orientations pin to the corresponding edge, vertically
        // centered. We clamp max-height so the rotated lockup can't drift
        // into the top brand-bar band or the bottom footer band.
        const containerStyle = isVertical
          ? (() => {
              const onLeft = logoOrientation === "vertical-left";
              const style: React.CSSProperties = {
                position: "absolute",
                top: 140,                              // clears brand bar + safe zone
                bottom: 120,                           // clears footer + safe zone
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              };
              if (onLeft) style.left = 32;
              else style.right = 32;
              return style;
            })()
          : logoPositionStyles(placement.position);

        return (
          // Logo is always the top-most visual layer on every slide.
          <div style={{ ...containerStyle, zIndex: 60, pointerEvents: "none" }}>
            <BrandLockup
              brand={brand}
              color={logoColor}
              size={effectiveSize}
              clientName={clientName}
              clientLogoUrl={clientLogoUrl ?? null}
              subCompany={subCompany}
              orientation={logoOrientation}
            />
          </div>
        );
      })()}


      {/* Content — 96px side margin. Vertical reserves grow when a logo
          hugs the top or bottom so text never runs under the lockup or the
          locked footer band. Baseline: pt=128, pb=96. */}
      <div
        className="absolute inset-0 px-24"
        style={{
          // Cover-mode top-center logo is xl; add breathing room so titles
          // don't kiss the wordmark.
          paddingTop: topCenterLogo && variant === "cover" ? 224 : 128,
          // Bottom logos: reserve enough room for the lockup (≈ 72px) plus
          // the 96px inset above the footer. Also pushes clear of the footer
          // (~62px band) even without a logo.
          paddingBottom: bottomLogo ? 208 : 96,
        }}
      >
        {isChromeDark && mode !== "dark" ? (
          <SlideModeContext.Provider value="dark">{children}</SlideModeContext.Provider>
        ) : (
          children
        )}
      </div>
      {/* Footer (locked) — micro uppercase, hairline aligned to page number.
          When a bottom-center lockup is present, the centered footer text
          would collide with it; we tuck each half further out and up so the
          three elements share the band cleanly. */}
      <div
        className="absolute left-24 right-24 flex items-center justify-between uppercase"
        style={{
          bottom: bottomCenterLogo ? 40 : 40,
          color: darkBackdrop || slideDark ? "rgba(255,255,255,0.78)" : "rgba(10,15,28,0.72)",
          fontSize: 18,
          letterSpacing: "0.28em",
          // Fade the footer copy under a centered logo so it doesn't compete
          // — the page number on the right still reads clearly.
          opacity: bottomCenterLogo ? 0.9 : 1,
        }}
      >
        <span
          style={{
            // If a centered logo eats the middle, keep left copy short and
            // clipped so it never crawls under the mark.
            maxWidth: bottomCenterLogo ? "38%" : undefined,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Confidential · Internal review
        </span>
        {pageNumber !== undefined && (
          <span className="tabular-nums" style={{ letterSpacing: "0.18em" }}>
            {String(pageNumber).padStart(2, "0")}
          </span>
        )}
      </div>


    </div>
  );
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

