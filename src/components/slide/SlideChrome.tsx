import type { BrandMode } from "@/lib/taxonomy";
import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import {
  resolveLogoPlacement,
  logoPositionStyles,
  type ChromeVariant,
  type LogoPosition,
  type LogoOrientation,
} from "@/lib/logo-placement";
import { GRAIN_SVG } from "@/components/slide/grain";
import { accentInk, hexA } from "@/lib/accent-tokens";
import { AuroraLayer } from "@/components/slide/flagship";
import { useSlideSkin } from "@/components/slide/SlideSkinContext";
import { ENTERPRISE_WHITE, isEnterpriseWhite } from "@/lib/slide-skin";
import { enterpriseGroundFor } from "@/lib/enterprise-grounds";
import { useStylePack } from "@/components/slide/StylePackContext";
import { GRAIN_PLATE, stylePackGround } from "@/lib/style-packs";
import { packSignature } from "@/lib/style-pack-motifs";


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

// ── useSlideInk ────────────────────────────────────────────────────────────
// Semantic "ink" palette every data / chart primitive should consume instead
// of hardcoding `rgba(10,15,28,X)` slate. Automatically flips for dark mode
// and exposes an `accent()` helper so hairlines/underglows can tint toward
// the active division colour. Keeps all data visuals consistent and cohesive
// across every brand mode and light/dark surface.
export type SlideInk = {
  /** Primary text — the strongest reading colour on the current surface. */
  text: string;
  /** Alias for primary text used by chart/module helpers. */
  strong: string;
  /** Secondary text — labels, meta, kicker copy. */
  muted: string;
  /** Tertiary text — captions, notes, axis ticks. */
  faint: string;
  /** Thin hairline (borders, chart baselines). */
  hairline: string;
  /** Slightly stronger hairline (row dividers, table rules). */
  hairlineStrong: string;
  /** Faint fill for empty bars, progress tracks, gridlines behind data. */
  trackFill: string;
  /** Airy panel fill for glass tiles when accent tint isn't desired. */
  panel: string;
  /** Hex + alpha helper — `accent(0.24)` returns rgba of the division accent
   *  (falls back to a neutral if no accent is in context). */
  accent: (alpha: number) => string;
  /** Same as `accent` but tinted to always read on the current surface — used
   *  for text overlays on charts (never returns a colour that vanishes into
   *  the background). */
  onSurface: (hex: string) => string;
  /** Contrast-tuned hex for using the division accent as TEXT — darkens bright
   *  accents on white, lightens deep accents on navy. Prefer this over
   *  `brand.tokens.accent` for accent-coloured labels/numbers/kickers. */
  accentText: string;
};

export const SlideInkContext = createContext<SlideInk | null>(null);

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function readableOn(
  hex: string,
  backgrounds: string[],
  prefer: "darken" | "lighten",
  target = 4.5,
): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const pole = prefer === "darken" ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  let best = hex;
  for (let step = 0; step <= 20; step++) {
    const candidate = rgbToHex(mixRgb(rgb, pole, step / 20));
    best = candidate;
    if (backgrounds.every((bg) => contrastRatio(candidate, bg) >= target)) return candidate;
  }
  return best;
}

// ── readableAccent ─────────────────────────────────────────────────────────
// Returns a hex tuned so an accent used as TEXT stays legible on the current
// slide surface — without wrapping the text in a background box. Bright
// division accents (Gaming green, Aqua, Yellow, Life Sciences green, Peach)
// darken on white; deep accents (Corporate blue, Berry, Legal teal) lighten
// on navy. Only luminance is shifted — the hue stays the division's own so
// the palette identity is preserved.
export function readableAccent(hex: string, mode: SlideMode, surfaceHex?: string): string {
  // Dark surfaces get the shared accentInk ramp (guaranteed AA against both
  // navy plates, with a white fallback for accents that can never clear it) so
  // deep accents like Blue 500 / Pink / Red never blend into the background.
  if (mode === "dark") return accentInk(hex, "dark", 4.5);
  const backgrounds = ["#FFFFFF", surfaceHex ?? "#FFFFFF"];
  return readableOn(hex, backgrounds, "darken", 4.5);
}

export function makeSlideInk(
  mode: SlideMode,
  accentHex?: string | null,
  primaryHex?: string | null,
  surfaceHex?: string | null,
  baseInkHex?: string | null,
): SlideInk {
  const dark = mode === "dark";
  const textHex = dark
    ? "#FFFFFF"
    : readableOn(
        primaryHex ?? baseInkHex ?? "#03002C",
        ["#FFFFFF", surfaceHex ?? "#FFFFFF"],
        "darken",
        4.5,
      );
  const bodyHex = dark
    ? "#FFFFFF"
    : readableOn(baseInkHex ?? "#03002C", ["#FFFFFF", surfaceHex ?? "#FFFFFF"], "darken", 4.5);
  const accentText = accentHex ? readableAccent(accentHex, mode, surfaceHex ?? undefined) : textHex;
  const rgb = hexToRgb(bodyHex) ?? (dark ? { r: 255, g: 255, b: 255 } : { r: 10, g: 15, b: 28 });
  const base = `${rgb.r},${rgb.g},${rgb.b}`;
  return {
    text: textHex,
    strong: textHex,
    muted: `rgba(${base},${dark ? 0.72 : 0.68})`,
    faint: `rgba(${base},${dark ? 0.52 : 0.52})`,
    hairline: `rgba(${base},${dark ? 0.14 : 0.12})`,
    hairlineStrong: `rgba(${base},${dark ? 0.22 : 0.18})`,
    trackFill: `rgba(${base},${dark ? 0.08 : 0.07})`,
    panel: dark ? "rgba(10, 8, 48, 0.34)" : "rgba(255,255,255,0.55)",
    accent: (a: number) => (accentHex ? hexToRgba(accentHex, a) : `rgba(${base},${a})`),
    onSurface: (hex: string) =>
      readableOn(
        hex,
        dark ? ["#03002C", "#0A1230"] : ["#FFFFFF", surfaceHex ?? "#FFFFFF"],
        dark ? "lighten" : "darken",
        4.5,
      ),
    accentText,
  };
}

export function useSlideInk(accentOverride?: string | null): SlideInk {
  const provided = useContext(SlideInkContext);
  const mode = useSlideMode();
  const ctxAccent = useSlideAccent();
  const accentHex = accentOverride ?? ctxAccent ?? null;
  if (provided && accentOverride === undefined) return provided;
  return makeSlideInk(mode, accentHex);
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
  const skin = useSlideSkin();
  // Alternate style pack (public taste-testing directory). When active it owns
  // the page ground, ink and accent; it never applies on production surfaces.
  const pack = useStylePack();
  // Enterprise White master template — white page, navy ink, soft pastel
  // corner wash, hairline footer. Suppresses the flagship aurora grounds.
  const enterprise = isEnterpriseWhite(skin);

  const backdrop = useContext(SlideBackdropContext);
  // Cover / divider / close chrome historically forced a dark navy surface so
  // hero titles kept dramatic contrast even when the deck ran in default light
  // mode. That override predates mode-aware ink tokens and breaks light-mode
  // aurora: it forces the inner SlideModeContext to "dark", so titles resolve
  // to `#FFFFFF` and vanish on the pale aurora surface. Now: honor the mode
  // authority. When the caller renders with `mode="light"` (VariantRenderer
  // sets this via SlideModeContext.Provider), chrome stays light and titles
  // resolve to a dark ink via `makeSlideInk`. Legacy dark covers still work —
  // callers just pass `mode="dark"`.
  const isChromeDark =
    !enterprise &&
    (variant === "cover" || variant === "divider" || variant === "close") &&
    mode === "dark";
  const slideDark = !enterprise && mode === "dark";

  // A style pack is a complete master design, so it owns the page ground
  // outright: brand mesh/aurora backdrops are suppressed while one is active.
  // Without this, every dark pack rendered the corporate navy backdrop and the
  // packs read as recolours of one sheet instead of distinct designs.
  const hasBackdrop = !!backdrop && !pack;
  const hasBackdropImage = !!backdrop?.url && !pack;
  const hasBackdropAurora = !!backdrop?.aurora && !pack;

  const hasBackdropCss = !!(backdrop?.css && !backdrop?.url && !backdrop?.aurora) && !pack;
  // A backdrop is "dark" when the caller flagged darkChrome, or when it's a
  // photo/aurora backdrop on a non-light slide (legacy behavior).
  const backdropIsDark =
    hasBackdrop &&
    (backdrop?.darkChrome ?? ((hasBackdropImage || hasBackdropAurora) && !slideDark));
  const lightBackdrop = hasBackdrop && !backdropIsDark && !slideDark;
  const darkBackdrop = hasBackdrop && !lightBackdrop;

  const bg = pack ? pack.tokens.surface : slideDark ? "#03002C" : "#ffffff";
  const fg = pack ? pack.tokens.ink : darkBackdrop || slideDark ? "#ffffff" : brand.tokens.ink;

  // Chrome (logo lockup + footer band) can sit on top of full-bleed
  // photography rendered *by the variant* rather than by the backdrop, so the
  // backdrop flags alone can't tell us the ink is on an image. Measure it:
  // after layout, test the logo / footer rects against every media tile on the
  // slide and force white ink where they overlap.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [logoOnMedia, setLogoOnMedia] = useState(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const measure = () => {
      const medias = Array.from(
        root.querySelectorAll<HTMLElement>("[data-media-tile], img[data-media-kind]"),
      )
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 40 && r.height > 40);
      const overlaps = (el: HTMLElement | null, minFraction = 0.5) => {
        if (!el || medias.length === 0) return false;
        const r = el.getBoundingClientRect();
        const area = r.width * r.height;
        if (area <= 0) return false;
        return medias.some((m) => {
          const ov =
            Math.max(0, Math.min(r.right, m.right) - Math.max(r.left, m.left)) *
            Math.max(0, Math.min(r.bottom, m.bottom) - Math.max(r.top, m.top));
          return ov > minFraction * area;
        });
      };
      const footer = footerRef.current;
      if (footer) {
        if (overlaps(footer, 0.2)) footer.dataset.chromeOnMedia = "true";
        else delete footer.dataset.chromeOnMedia;
      }
      setLogoOnMedia(overlaps(logoRef.current));
    };
    raf = requestAnimationFrame(() => {
      measure();
      raf = requestAnimationFrame(measure);
    });
    const obs = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    obs.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "src"] });
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  });
  const logoColor = darkBackdrop || slideDark || logoOnMedia ? "#ffffff" : "#03002C";

  const placement = resolveLogoPlacement(variant, layoutId, logoPosition);
  const showLogo = placement.position !== "hidden";
  // Bottom-adjacent logos sit above the footer band; content needs extra
  // pb so titles / bullets / cards don't slide under the lockup. Top-adjacent
  // logos need a little more pt on hero (cover) chrome where the mark is xl.
  const bottomLogo =
    showLogo &&
    (placement.position === "bottom-left" ||
      placement.position === "bottom-right" ||
      placement.position === "bottom-center");
  const topCenterLogo = showLogo && placement.position === "top-center";
  const bottomCenterLogo = showLogo && placement.position === "bottom-center";

  // Light backdrops use a cream/white tint so photography reads bright; dark
  // backdrops keep the original navy scrim. Callers can still override tint.
  const defaultTint = lightBackdrop ? "#FFFFFF" : "#03002C";
  // Light mode: force the backdrop tint to pure white and push the scrim
  // near-opaque so imagery reads as a subtle wash on a white page.
  const tint = lightBackdrop ? "#FFFFFF" : (backdrop?.tint ?? defaultTint);
  const scrimStrength = lightBackdrop ? 0.97 : (backdrop?.scrimStrength ?? 0.55);

  const scrimGradient = (() => {
    if (!backdrop) return "none";
    const a = scrimStrength;
    const t = tint;
    // Light mode: keep the whole frame near-white and only let the image
    // peek through as a faint tinted wash on the opposite edge.
    const minA = lightBackdrop ? Math.min(1, a * 0.88) : 0;
    const midA = lightBackdrop ? Math.min(1, a * 0.96) : a * 0.55;
    const to = (dir: string) =>
      `linear-gradient(${dir}, ${hexA(t, a)} 0%, ${hexA(t, midA)} 45%, ${hexA(t, minA)} 100%)`;
    switch (backdrop.scrim ?? "bottom") {
      case "bottom":
        return to("to top");
      case "top":
        return to("to bottom");
      case "left":
        return to("to right");
      case "right":
        return to("to left");
      case "full":
        return `linear-gradient(${hexA(t, a)}, ${hexA(t, a)})`;
      case "vignette":
        return lightBackdrop
          ? `radial-gradient(circle at 50% 50%, ${hexA(t, a * 0.85)} 0%, ${hexA(t, a)} 70%)`
          : `linear-gradient(${hexA(t, a * 0.35)}, ${hexA(t, a)})`;
    }
  })();

  // A dark chrome (cover/divider/close) or backdrop-dark surface reads as dark
  // for accent-as-text purposes; content-on-white uses light mode tuning.
  const inkMode: SlideMode = slideDark || darkBackdrop ? "dark" : "light";
  const frameInk = makeSlideInk(
    inkMode,
    brand.tokens.accent,
    brand.tokens.primary,
    brand.tokens.surface,
    brand.tokens.ink,
  );
  const accentTextHex = frameInk.accentText;

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: hasBackdrop ? (lightBackdrop ? "#fff" : "#000") : bg,
        color: fg,
        // Contrast-tuned accent for use as TEXT — variants read this via
        // `color: "var(--slide-accent-text)"` so accent-coloured labels
        // stay legible in every division × mode combination without
        // needing a background box.
        ["--slide-accent-text" as string]: pack ? pack.tokens.accentText : accentTextHex,
        ["--slide-ink" as string]: pack ? pack.tokens.ink : frameInk.text,
        ["--slide-ink-muted" as string]: pack ? pack.tokens.inkMuted : frameInk.muted,
        ["--slide-ink-faint" as string]: pack ? pack.tokens.inkFaint : frameInk.faint,
        ["--slide-hairline" as string]: pack ? pack.tokens.hairline : frameInk.hairline,
        ["--slide-track-fill" as string]: pack
          ? hexA(pack.tokens.accent, 0.28)
          : frameInk.trackFill,
        ...(pack ? { fontFamily: pack.type.body } : null),

      }}
    >
      {hasBackdropCss && (
        <div aria-hidden className="absolute inset-0" style={{ background: backdrop!.css }} />
      )}
      {hasBackdropAurora && (
        <AuroraLayer
          seed={backdrop?.auroraSeed ?? "aurora"}
          brand={brand}
          baseTint={backdrop?.tint}
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
              transform:
                backdrop!.zoom && backdrop!.zoom !== 1 ? `scale(${backdrop!.zoom})` : undefined,
              transformOrigin: "center center",
              filter: lightBackdrop
                ? `brightness(${1.16 + (backdrop!.imageDim ?? 0) * 0.16}) saturate(0.62) contrast(0.82)`
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
              backgroundColor: hexA(brand.tokens.accent, lightBackdrop ? 0.06 : 0.18),
              filter: lightBackdrop ? "blur(118px)" : "blur(58px)",
              mixBlendMode: lightBackdrop ? "multiply" : "screen",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-[12%] right-[-10%] h-[56%] w-[56%] rounded-full"
            style={{
              backgroundColor: hexA(brand.tokens.primary, lightBackdrop ? 0.035 : 0.22),
              filter: lightBackdrop ? "blur(132px)" : "blur(64px)",
              mixBlendMode: lightBackdrop ? "multiply" : "screen",
            }}
          />
          {lightBackdrop && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.62))",
              }}
            />
          )}
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
      {!hasBackdrop &&
        !pack &&
        slideDark &&

        (() => {
          const isHero = variant === "cover" || variant === "divider" || variant === "close";
          const primary = brand.tokens.primary;
          const accent = brand.tokens.accent;
          const sweepA = isHero ? 0.72 : 0.48;
          const sweepB = isHero ? 0.28 : 0.14;
          const accentA = isHero ? 0.3 : 0.14;
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
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.32) 100%)",
                }}
              />
              {/* Grain — matches MediaTile / HeroScrim tactile finish. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: GRAIN_SVG,
                  backgroundSize: "160px 160px",
                  opacity: isHero ? 0.14 : 0.08,
                  mixBlendMode: "overlay",
                }}
              />
            </>
          );
        })()}

      {/* Light-mode abstract ground — same grammar, airy mood. Extremely
          recessive by default so content variants stay clean; hero chrome
          variants in light mode already flip to dark chrome above so they
          take the dark branch, not this one. */}
      {/* Style pack ground — procedural alternate master design. */}
      {pack && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: stylePackGround(
              pack,
              layoutId ?? variant,
              packCompositionFor(variant, layoutId),
            ),
          }}
        />
      )}
      {/* Signature motif — the pack's own piece of art (halftone cone, contour
          survey, circuit trace, arcade floor...). Decorative, never content. */}
      {pack &&
        (() => {
          const sig = packSignature(pack);
          if (!sig) return null;
          return (
            <div
              aria-hidden
              data-decorative="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: sig.background,
                opacity: sig.opacity,
                mixBlendMode: sig.blend,
                clipPath: sig.clip,
              }}
            />
          );
        })()}
      {pack && pack.grain > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: GRAIN_PLATE,
            backgroundSize: "160px 160px",
            opacity: pack.grain,
            mixBlendMode: pack.mode === "dark" ? "overlay" : "multiply",
          }}
        />
      )}
      {/* Light-page ground — the saved Enterprise ground SET.
          Previously only the `enterprise-white` skin drew these composition-
          aware grounds; the default (flagship) light branch drew a wash at
          0.02–0.045 alpha, which is why light module renders read as bare white
          sheets on the library, editor, present, share and print surfaces.
          Light pages now always draw a designed ground, keyed to the module's
          layout so colour lands away from the copy. */}
      {!hasBackdrop && !pack && (enterprise || !slideDark) && (
        <>
          <div
            aria-hidden
            data-decorative="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: enterpriseGroundFor(layoutId ?? variant, brand.tokens.accent) }}
          />
          {/* Grain — barely-there tactile finish, matches media tiles. */}
          <div
            aria-hidden
            data-decorative="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: GRAIN_SVG,
              backgroundSize: "160px 160px",
              opacity: 0.035,
              mixBlendMode: "multiply",
            }}
          />
        </>
      )}


      {/* Brand bar (locked) — hairline accent rule, editorial not decorative.
          Enterprise White replaces the full-bleed bar with nothing at the top
          (the master template keeps the page edge clean) and instead closes
          the page with a hairline rule above the footer band. */}
      {pack ? (
        pack.topBar ? (
          <div
            className="absolute left-0 top-0 h-[4px] w-full"
            style={{ backgroundColor: pack.tokens.accent }}
          />
        ) : null
      ) : null}
      {!enterprise && !pack && (

        <div
          className="absolute left-0 top-0 h-[2px] w-full"
          style={{
            backgroundColor: brand.tokens.accent,
            opacity: slideDark || darkBackdrop ? 0.85 : 0.9,
          }}
        />
      )}
      {/* Brand lockup (locked) — placed per approved zone. Content slides
          stay quiet at sm so titles carry the composition; cover / divider /
          close slides scale up so the mark reads at hero size. */}
      {showLogo &&
        (() => {
          // Vertical orientations are retired — coerce legacy vertical-* to
          // horizontal so persisted decks never render rotated lockups.
          const normalizedOrient: "horizontal" | "stacked" | "mark-only" =
            logoOrientation === "stacked"
              ? "stacked"
              : logoOrientation === "mark-only"
                ? "mark-only"
                : "horizontal";

          const isMarkOnly = normalizedOrient === "mark-only";
          // Half-size positions: centered bands and any corner placement.
          // Corner lockups sit beside content, so they stay compact — a hero
          // (xl) mark in a corner crowds the composition.
          const halfSize =
            placement.position === "top-center" ||
            placement.position === "bottom-center" ||
            placement.position === "top-left" ||
            placement.position === "bottom-left" ||
            placement.position === "top-right" ||
            placement.position === "bottom-right";

          const baseSize = variant === "content" ? "sm" : variant === "cover" ? "xl" : "md";
          const shrink: Record<string, "2xs" | "xs" | "sm" | "md" | "lg" | "xl"> = {
            xl: "sm",
            lg: "xs",
            md: "xs",
            sm: "2xs",
            xs: "2xs",
            "2xs": "2xs",
          };
          const sizeAfterHalf = halfSize ? shrink[baseSize] : (baseSize as "sm" | "md" | "xl");
          const effectiveSize = isMarkOnly
            ? (shrink[sizeAfterHalf] ?? sizeAfterHalf)
            : sizeAfterHalf;

          const containerStyle = logoPositionStyles(placement.position);

          return (
            // Logo is always the top-most visual layer on every slide.
            <div ref={logoRef} style={{ ...containerStyle, zIndex: 60, pointerEvents: "none" }}>
              <BrandLockup
                brand={brand}
                color={logoColor}
                size={effectiveSize}
                clientName={clientName}
                clientLogoUrl={clientLogoUrl ?? null}
                subCompany={subCompany}
                orientation={normalizedOrient}
                monochromeOfficialLogo
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
        {children}
      </div>

      {/* Footer (locked) — micro uppercase, hairline aligned to page number.
          When a bottom-center lockup is present, the centered footer text
          would collide with it; we tuck each half further out and up so the
          three elements share the band cleanly. */}
      {enterprise && (
        <div
          aria-hidden
          className="absolute left-24 right-24 h-px"
          style={{ bottom: 88, backgroundColor: ENTERPRISE_WHITE.hairline }}
        />
      )}
      <div
        ref={footerRef}
        className="absolute left-24 right-24 flex items-center justify-between uppercase"
        style={{
          bottom: bottomCenterLogo ? 40 : 40,
          color: enterprise ? ENTERPRISE_WHITE.inkFaint : frameInk.muted,
          fontSize: enterprise ? 15 : 18,
          fontWeight: enterprise ? 600 : undefined,
          letterSpacing: enterprise ? "0.22em" : "0.28em",
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


