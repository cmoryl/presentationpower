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
  // With a backdrop, force dark text treatment for legibility over imagery.
  const hasBackdrop = !!backdrop;
  // Cover/divider/close = branded hero backdrop. Regular content flips to a
  // near-black navy in dark mode so cards/text remain legible.
  const bg = isChromeDark ? brand.tokens.primary : slideDark ? "#0A0A22" : "#ffffff";
  const fg = isChromeDark || slideDark || hasBackdrop ? "#ffffff" : brand.tokens.ink;
  const logoColor = isChromeDark || slideDark || hasBackdrop ? "#ffffff" : brand.tokens.primary;

  const placement = resolveLogoPlacement(variant, layoutId, logoPosition);
  const showLogo = placement.position !== "hidden";

  const scrimStrength = backdrop?.scrimStrength ?? 0.55;
  const tint = backdrop?.tint ?? "#03002C";
  const scrimGradient = (() => {
    if (!backdrop) return "none";
    const a = scrimStrength;
    const t = tint;
    const to = (dir: string) =>
      `linear-gradient(${dir}, ${hexA(t, a)} 0%, ${hexA(t, a * 0.55)} 45%, ${hexA(t, 0)} 100%)`;
    switch (backdrop.scrim ?? "bottom") {
      case "bottom": return to("to top");
      case "top":    return to("to bottom");
      case "left":   return to("to right");
      case "right":  return to("to left");
      case "full":   return `linear-gradient(${hexA(t, a)}, ${hexA(t, a)})`;
      case "vignette":
        return `radial-gradient(ellipse at center, ${hexA(t, 0)} 30%, ${hexA(t, a)} 100%)`;
    }
  })();

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: hasBackdrop ? "#000" : bg, color: fg }}>
      {hasBackdrop && (
        <>
          <img
            src={backdrop.url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: backdrop.imageDim ? `brightness(${1 - backdrop.imageDim}) saturate(0.95)` : undefined }}
          />
          {/* Soft-focus accent blobs — tinted from the division's brand tokens.
              Two large blurred radial gradients (accent + primary) sit above the
              image but below the scrim, giving each division a color-coded haze. */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: [
                `radial-gradient(38% 42% at 12% 22%, ${hexA(brand.tokens.accent, 0.45)} 0%, ${hexA(brand.tokens.accent, 0)} 70%)`,
                `radial-gradient(42% 46% at 88% 82%, ${hexA(brand.tokens.primary, 0.55)} 0%, ${hexA(brand.tokens.primary, 0)} 72%)`,
                `radial-gradient(28% 30% at 70% 18%, ${hexA(brand.tokens.accent, 0.28)} 0%, ${hexA(brand.tokens.accent, 0)} 75%)`,
              ].join(", "),
              filter: "blur(40px)",
              mixBlendMode: "screen",
              opacity: 0.9,
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
        style={{ color: isChromeDark || slideDark || hasBackdrop ? "rgba(255,255,255,0.7)" : "rgba(10,15,28,0.55)" }}
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

