// Hero scrim — shared photo/text-anchor scrim used by cover-family modules.
import React, { useContext } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { SlideModeContext } from "./SlideChrome";

export function HeroScrim({
  brand,
  anchor = "bottom",
}: {
  brand: BrandMode;
  anchor?: "bottom" | "center";
}) {
  const mode = useContext(SlideModeContext);
  const primary = brand.tokens.primary;
  const accent = brand.tokens.accent;
  const isLight = mode === "light";

  // Text-anchor scrim. Light mode uses a near-white wash; dark mode uses the
  // brand primary so titles still land on brand-colored ground.
  const anchorScrim = (() => {
    if (anchor === "center") {
      return isLight
        ? `radial-gradient(130% 100% at 50% 55%, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.58) 42%, rgba(255,255,255,0.18) 90%)`
        : `radial-gradient(130% 100% at 50% 55%, ${primary}D6 0%, ${primary}96 42%, ${primary}30 90%)`;
    }
    // bottom-heavy
    return isLight
      ? `linear-gradient(to top, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.78) 18%, rgba(255,255,255,0.32) 42%, rgba(255,255,255,0.06) 68%, rgba(255,255,255,0) 84%)`
      : `linear-gradient(to top, ${primary}EE 0%, ${primary}D6 14%, ${primary}8C 34%, ${primary}30 58%, rgba(0,0,0,0) 82%)`;
  })();

  // Small wordmark shield — a low, near-black band at the very top so the
  // top-center brand lockup reads crisply without dumping brand color onto
  // the photo. Light mode uses white.
  const wordmarkShield = isLight
    ? `linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 40%, rgba(255,255,255,0) 100%)`
    : `linear-gradient(180deg, rgba(3,0,44,0.62) 0%, rgba(3,0,44,0.22) 45%, rgba(3,0,44,0) 100%)`;

  // Accent glow — a soft brand-accent radial in the corner where the title
  // will sit (bottom-left for anchor=bottom, bottom for center). Signals a
  // brand re-tone on division switch without stacking a second duotone.
  const accentGlow =
    anchor === "center"
      ? `radial-gradient(50% 30% at 50% 100%, ${accent}${isLight ? "22" : "33"} 0%, transparent 70%)`
      : `radial-gradient(55% 42% at 6% 96%, ${accent}${isLight ? "24" : "3A"} 0%, transparent 72%)`;

  return (
    <>
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: anchorScrim }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[18%]"
        style={{ backgroundImage: wordmarkShield }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: accentGlow, mixBlendMode: isLight ? "multiply" : "screen" }}
      />
    </>
  );
}
