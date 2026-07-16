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

// Every slide can render in light or dark mode. VariantRenderer sets this
// context per slide; SlideFrame and helpers read it to flip content surfaces
// and text colors without every switch case having to know about the mode.
export type SlideMode = "light" | "dark";
export const SlideModeContext = createContext<SlideMode>("light");
export function useSlideMode(): SlideMode {
  return useContext(SlideModeContext);
}

// Optional imagery layer rendered BEHIND the slide content. When set, the
// SlideFrame replaces its opaque token background with the image + a gradient
// scrim so content stays legible with real alpha-blended photography.
export type SlideBackdrop = {
  url: string;
  // Scrim direction/strength. "bottom" darkens lower half, "left" darkens
  // left half, "full" applies an even overlay, "vignette" a radial darken.
  scrim?: "bottom" | "left" | "right" | "top" | "full" | "vignette";
  // 0..1 — how strongly the scrim covers the image (default 0.55).
  scrimStrength?: number;
  // 0..1 — how much to desaturate/darken the image itself (default 0).
  imageDim?: number;
  // Tint color for the scrim (defaults to brand ink navy).
  tint?: string;
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
  layoutId,
  logoPosition,
}: {
  brand: BrandMode;
  pageNumber?: number;
  children: ReactNode;
  variant?: ChromeVariant;
  clientName?: string;
  layoutId?: string;
  logoPosition?: LogoPosition;
}) {
  const mode = useSlideMode();
  const backdrop = useContext(SlideBackdropContext);
  const isChromeDark = variant === "cover" || variant === "divider" || variant === "close";
  const slideDark = mode === "dark";
  // With a backdrop, chrome/dark slides force light text over a dark scrim;
  // in light-mode content slides we instead render a *light* scrim (cream/white
  // tint) so ink text stays legible and imagery reads as a light-mode photo.
  const hasBackdrop = !!backdrop;
  const lightBackdrop = hasBackdrop && !slideDark && !isChromeDark;
  const darkBackdrop = hasBackdrop && !lightBackdrop;
  // Cover/divider/close = branded hero backdrop. Regular content flips to a
  // near-black navy in dark mode so cards/text remain legible.
  const bg = isChromeDark ? brand.tokens.primary : slideDark ? "#0A0A22" : "#ffffff";
  const fg = darkBackdrop || isChromeDark || slideDark ? "#ffffff" : brand.tokens.ink;
  const logoColor = darkBackdrop || isChromeDark || slideDark ? "#ffffff" : brand.tokens.primary;

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
      {hasBackdrop && (
        <>
          <img
            src={backdrop.url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              filter: lightBackdrop
                // Light mode: brighten and desaturate slightly so the photo
                // reads as an airy background rather than a dark hero.
                ? `brightness(${1.08 + (backdrop.imageDim ?? 0) * 0.2}) saturate(0.85) contrast(0.95)`
                : backdrop.imageDim
                  ? `brightness(${1 - backdrop.imageDim}) saturate(0.95)`
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


      {/* Brand bar (locked) */}
      <div
        className="absolute left-0 top-0 h-2 w-full"
        style={{ backgroundColor: brand.tokens.accent }}
      />
      {/* Brand lockup (locked) — placed per approved zone */}
      {showLogo && (
        <div style={logoPositionStyles(placement.position)}>
          <BrandLockup brand={brand} color={logoColor} size="md" clientName={clientName} />
        </div>
      )}
      {/* Content */}
      <div className="absolute inset-0 pt-32 pb-24 px-24">{children}</div>
      {/* Footer (locked) */}
      <div
        className="absolute bottom-10 left-24 right-24 flex items-center justify-between text-sm"
        style={{ color: darkBackdrop || isChromeDark || slideDark ? "rgba(255,255,255,0.7)" : "rgba(10,15,28,0.55)" }}

      >
        <span>Confidential — for internal review</span>
        {pageNumber !== undefined && <span>{String(pageNumber).padStart(2, "0")}</span>}
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

