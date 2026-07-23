// Hero photography / imagery layer for print templates.
// Renders an absolutely-positioned image band at the top of the page with an
// optional accent-color wash and gradient scrim so hero copy stays legible.
// Opt-in per asset via `content.heroMedia` — layouts without a value keep the
// existing accent-halo hero and read exactly as before.
import type { CSSProperties } from "react";

export type PrintHeroScrim = "top" | "bottom" | "both" | "radial" | "none";
export type PrintHeroAspect = "fill" | "21:9" | "16:9" | "3:2" | "4:3" | "1:1";

export type PrintHeroMedia = {
  imageUrl: string;
  focalPoint?: string;           // legacy CSS object-position, e.g. "50% 35%"
  focalX?: number;               // 0..100 — horizontal focal point %, wins over focalPoint
  focalY?: number;               // 0..100 — vertical focal point %, wins over focalPoint
  aspect?: PrintHeroAspect;      // band shape; "fill" uses heightPct, others letterbox to ratio
  overlayColor?: string;         // hex; defaults to page accent supplied by layout
  overlayOpacity?: number;       // 0..1, default 0.55 — accent wash strength
  washStrength?: number;         // 0..1, default 1 — legibility scrim + feather multiplier
  scrim?: PrintHeroScrim;        // legibility gradient, default "bottom"
  blendMode?: CSSProperties["mixBlendMode"]; // default "multiply"
  heightPct?: number;            // 0..100, share of page height, default 46 (used when aspect="fill")
};

const ASPECT_RATIOS: Record<Exclude<PrintHeroAspect, "fill">, number> = {
  "21:9": 21 / 9,
  "16:9": 16 / 9,
  "3:2": 3 / 2,
  "4:3": 4 / 3,
  "1:1": 1,
};

type Props = {
  media: PrintHeroMedia;
  accent: string;
  mode: "light" | "dark";
  // Reuse the layout's cq() converter so px maps to container-query units.
  cq: (v: number) => string;
};

export function PrintHeroMediaLayer({ media, accent, mode, cq }: Props) {
  const overlayColor = media.overlayColor ?? accent;
  const overlayOpacity = clamp01(media.overlayOpacity ?? 0.55);
  const washStrength = clamp01(media.washStrength ?? 1);
  const scrim = media.scrim ?? "bottom";
  const blendMode = media.blendMode ?? "multiply";
  const heightPct = media.heightPct ?? 46;
  const aspect = media.aspect ?? "fill";
  const pageBg = mode === "dark" ? "#111114" : "#FFFFFF";

  // Focal point: prefer explicit x/y, then legacy focalPoint, else 50%/40%.
  const fx = typeof media.focalX === "number" ? clampPct(media.focalX) : null;
  const fy = typeof media.focalY === "number" ? clampPct(media.focalY) : null;
  const objectPosition =
    fx !== null || fy !== null
      ? `${fx ?? 50}% ${fy ?? 40}%`
      : media.focalPoint ?? "50% 40%";

  // Band sizing: "fill" uses heightPct; ratios use aspectRatio and let the
  // browser derive height from page width so photos stay properly proportioned
  // across A4 / Letter / Square.
  const bandStyle: CSSProperties =
    aspect === "fill"
      ? { height: `${heightPct}%`, overflow: "hidden" }
      : { aspectRatio: String(ASPECT_RATIOS[aspect]), width: "100%", overflow: "hidden" };

  const scrimGradient =
    scrim === "top"
      ? `linear-gradient(180deg, ${pageBg} 0%, transparent 55%)`
      : scrim === "bottom"
      ? `linear-gradient(180deg, transparent 40%, ${pageBg} 100%)`
      : scrim === "both"
      ? `linear-gradient(180deg, ${pageBg} 0%, transparent 35%, transparent 65%, ${pageBg} 100%)`
      : scrim === "radial"
      ? `radial-gradient(ellipse at ${fx ?? 30}% ${fy ?? 45}%, transparent 0%, transparent 40%, ${pageBg} 85%)`
      : "none";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0"
      aria-hidden
      style={bandStyle}
    >
      {/* Photograph */}
      <img
        src={media.imageUrl}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition,
        }}
      />

      {/* Accent color wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
          mixBlendMode: blendMode,
        }}
      />
      {/* Legibility scrim into the body background — scaled by washStrength */}
      {scrim !== "none" && washStrength > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: scrimGradient,
            opacity: washStrength,
          }}
        />
      )}
      {/* Soft feathered bottom edge so the seam blends into the page */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: cq(80),
          background: `linear-gradient(180deg, transparent 0%, ${pageBg} 100%)`,
          opacity: washStrength,
        }}
      />
    </div>
  );
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, n));
}
