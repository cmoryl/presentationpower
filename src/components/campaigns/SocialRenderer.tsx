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
  const objectPosition =
    style.photoFocus === "top" ? "center 26%" : style.photoFocus === "bottom" ? "center 76%" : "center 50%";

  // Extreme landscape hides eyebrow to protect single-clause headline.
  const showEyebrow = aspectClass(format) !== "landscape-wide" && style.eyebrow !== "hidden";
  const showCta = copy.cta && aspectClass(format) !== "landscape-wide";


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




        {/* Content stack — anchored per copyAlign, always inside safe area.
            Over photography the copy sits on a rounded translucent plate so the
            image still reads through while the text keeps its contrast. */}
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
            gap: (short * 2.4) / 100,
            ...(imageUrl ? plateStyle : null),
          }}
        >


          {showEyebrow && copy.eyebrow && (
            <div
              style={{
                fontSize: (short * preset.eyebrowPct) / 100,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: dimColor,
              }}
            >
              {copy.eyebrow}
            </div>
          )}

          <div
            style={{
              fontSize: (short * preset.titlePct) / 100,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              fontWeight: 700,
              display: "-webkit-box",
              WebkitLineClamp: aspectClass(format) === "landscape-wide" ? 2 : 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {copy.title}
          </div>

          {preset.showSummary && copy.summary && (
            <div
              style={{
                fontSize: (short * preset.summaryPct) / 100,
                lineHeight: 1.28,
                color: dimColor,
                maxWidth: format.width * 0.88,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {copy.summary}
            </div>
          )}

          {copy.stat && (
            <div className="flex items-baseline gap-3" style={{ marginTop: (short * 1.4) / 100 }}>
              <span
                style={{
                  fontSize: (short * preset.titlePct * 0.9) / 100,
                  fontWeight: 700,
                  color: brand.tokens.accent,
                  letterSpacing: "-0.04em",
                }}
              >
                {copy.stat.value}
              </span>
              <span style={{ fontSize: (short * preset.summaryPct) / 100, color: dimColor }}>
                {copy.stat.label}
              </span>
            </div>
          )}

          <div
            className="flex flex-wrap items-center gap-3"
            style={{ marginTop: (short * 1.6) / 100 }}
          >
            {showCta && (
              <span
                style={{
                  fontSize: (short * preset.ctaPct) / 100,
                  padding: `${(short * 1.2) / 100}px ${(short * 2.2) / 100}px`,
                  borderRadius: 9999,
                  background: brand.tokens.accent,
                  color: mode === "dark" ? "#03002C" : "#03002C",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
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


        {/* Lockup — always top-right, inside the safe area, ~15% larger for
            stronger brand presence across all formats. */}
        <div
          className="absolute"
          style={{
            top: safeInset.top,
            right: safeInset.right,
            transform: "scale(1.15)",
            transformOrigin: "top right",
          }}
        >
          <BrandLockup
            brand={brand}
            color={inkColor}
            size={preset.lockupSize}
            showMark
            showDivision={false}
            monochromeOfficialLogo
          />
        </div>
      </div>
    </div>
  );
}
