// Division-tuned aurora hero band used as the fallback hero visual when a
// print asset does not supply `content.heroMedia`. Renders in BOTH light and
// dark modes so every template carries the division's look-and-feel at the
// top of the page instead of a blank band.
import type { CSSProperties } from "react";
import { AuroraLayer } from "@/components/slide/flagship";
import type { BrandMode } from "@/lib/taxonomy";

type Aspect = { w: number; h: number };

type Props = {
  brand: BrandMode;
  mode: "light" | "dark";
  accent: string;
  primary?: string;
  seed: string;
  aspect: Aspect;
  cq: (v: number) => string;
  /** 0..1 share of page height covered by the hero aura. Default 0.55. */
  heightPct?: number;
};

/**
 * Renders the division aurora + accent bloom in a top band, feathered into
 * the page background so the lower half stays clean. Intensity and page
 * background are tuned per mode:
 *   - dark  → deep navy base, full aurora
 *   - light → subtle aurora on white, softer bloom
 */
export function PrintHeroAura({
  brand,
  mode,
  accent,
  primary,
  seed,
  aspect,
  cq,
  heightPct = 55,
}: Props) {
  const isDark = mode === "dark";
  const intensity = isDark
    ? (brand.id === "bm-enterprise" ? 0.35 : 0.9)
    : (brand.id === "bm-enterprise" ? 0.2 : 0.55);
  // Mask fades the whole band into the page background.
  const maskImage = "linear-gradient(180deg, black 0%, black 62%, transparent 100%)";
  const containerStyle: CSSProperties = {
    height: `${heightPct}%`,
    WebkitMaskImage: maskImage,
    maskImage,
    opacity: isDark ? 1 : 0.85,
  };

  const bloomBg = isDark
    ? `radial-gradient(ellipse at 30% 30%, ${accent}59 0%, transparent 55%),` +
      `radial-gradient(ellipse at 75% 25%, ${accent}44 0%, transparent 60%)`
    : `radial-gradient(ellipse at 30% 30%, ${accent}33 0%, transparent 60%),` +
      `radial-gradient(ellipse at 78% 22%, ${(primary ?? accent)}22 0%, transparent 65%)`;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      aria-hidden
      style={containerStyle}
    >
      <AuroraLayer seed={seed} brand={brand} intensity={intensity} aspect={aspect} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: bloomBg,
          filter: `blur(${cq(8)})`,
          mixBlendMode: isDark ? "screen" : "multiply",
        }}
      />
    </div>
  );
}
