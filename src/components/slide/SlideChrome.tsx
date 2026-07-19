import type { BrandMode } from "@/lib/taxonomy";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import {
  resolveLogoPlacement,
  logoPositionStyles,
  type ChromeVariant,
  type LogoPosition,
} from "@/lib/logo-placement";
import { GRAIN_SVG } from "@/components/slide/VariantRenderer";

// Every slide can render in light or dark mode. VariantRenderer sets this
// context per slide; SlideFrame and helpers read it to flip content surfaces
// and text colors without every switch case having to know about the mode.
export type SlideMode = "light" | "dark";
export const SlideModeContext = createContext<SlideMode>("light");
export function useSlideMode(): SlideMode {
  return useContext(SlideModeContext);
}

// Optional imagery layer rendered BEHIND the slide content. When set, the
// SlideFrame replaces its opaque token background with either a photo + scrim
// (`url`) or a CSS background layer (`css` — used by the curated background
// library for gradients / SVG patterns).
export type SlideBackdrop = {
  url?: string;
  css?: string;
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
  const hasBackdropCss = !!(backdrop?.css && !backdrop?.url);
  // A backdrop is "dark" when the caller flagged darkChrome, or when it's a
  // photo backdrop on a non-light slide (legacy behavior).
  const backdropIsDark = hasBackdrop && (backdrop?.darkChrome ?? (hasBackdropImage && !slideDark));
  const lightBackdrop = hasBackdrop && !backdropIsDark && !slideDark;
  const darkBackdrop = hasBackdrop && !lightBackdrop;
  const bg = slideDark ? "#03002C" : "#ffffff";
  const fg = darkBackdrop || slideDark ? "#ffffff" : brand.tokens.ink;
  const logoColor = darkBackdrop || slideDark ? "#ffffff" : brand.tokens.primary;

  const placement = resolveLogoPlacement(variant, layoutId, logoPosition);
  const showLogo = placement.position !== "hidden";


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


      {/* Editorial dark-chrome glow — a very subtle radial from brand primary
          toward near-black so cover/divider/close slides feel rich rather
          than flat. Only applied when the slide is on its dark chrome and
          no backdrop image is already handling the atmosphere. */}
      {slideDark && !hasBackdrop && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(120% 90% at 8% 12%, ${hexA(brand.tokens.primary, 0.55)} 0%, ${hexA(brand.tokens.primary, 0.0)} 55%), radial-gradient(80% 60% at 100% 100%, ${hexA(brand.tokens.accent, 0.10)} 0%, rgba(0,0,0,0) 60%)`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.35))" }}
          />
        </>
      )}

      {/* Brand bar (locked) — hairline accent rule, editorial not decorative. */}
      <div
        className="absolute left-0 top-0 h-[2px] w-full"
        style={{ backgroundColor: brand.tokens.accent, opacity: slideDark || darkBackdrop ? 0.85 : 0.9 }}
      />
      {/* Brand lockup (locked) — placed per approved zone. Content slides
          stay quiet at sm so titles carry the composition; cover / divider /
          close slides scale up so the mark reads at hero size. */}
      {showLogo && (
        <div style={logoPositionStyles(placement.position)}>
          <BrandLockup
            brand={brand}
            color={logoColor}
            size={variant === "content" ? "sm" : variant === "cover" ? "xl" : "md"}
            clientName={clientName}
            clientLogoUrl={clientLogoUrl ?? null}
            subCompany={subCompany}
          />
        </div>
      )}

      {/* Content — 96px side margin, 128px top / 96px bottom reserve. */}
      <div className="absolute inset-0 pt-32 pb-24 px-24">
        {isChromeDark && mode !== "dark" ? (
          <SlideModeContext.Provider value="dark">{children}</SlideModeContext.Provider>
        ) : (
          children
        )}
      </div>
      {/* Footer (locked) — micro uppercase, hairline aligned to page number. */}
      <div
        className="absolute bottom-10 left-24 right-24 flex items-center justify-between uppercase"
        style={{
          // Bumped alpha to clear AA against the actual chrome surface — the
          // previous 0.5 values dropped below 4.5:1 on both light and dark bg.
          color: darkBackdrop || slideDark ? "rgba(255,255,255,0.78)" : "rgba(10,15,28,0.72)",
          fontSize: 18,
          letterSpacing: "0.28em",
        }}
      >
        <span>Confidential · Internal review</span>
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

