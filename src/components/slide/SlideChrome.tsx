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
  const isChromeDark = variant === "cover" || variant === "divider" || variant === "close";
  const slideDark = mode === "dark";
  // Cover/divider/close = branded hero backdrop. Regular content flips to a
  // near-black navy in dark mode so cards/text remain legible.
  const bg = isChromeDark ? brand.tokens.primary : slideDark ? "#0A0A22" : "#ffffff";
  const fg = isChromeDark || slideDark ? "#ffffff" : brand.tokens.ink;
  const logoColor = isChromeDark || slideDark ? "#ffffff" : brand.tokens.primary;

  const placement = resolveLogoPlacement(variant, layoutId, logoPosition);
  const showLogo = placement.position !== "hidden";

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: bg, color: fg }}>
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
        style={{ color: isChromeDark || slideDark ? "rgba(255,255,255,0.7)" : "rgba(10,15,28,0.55)" }}
      >
        <span>Confidential — for internal review</span>
        {pageNumber !== undefined && <span>{String(pageNumber).padStart(2, "0")}</span>}
      </div>
    </div>
  );
}

