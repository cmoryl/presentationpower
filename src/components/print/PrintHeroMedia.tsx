// Hero photography / imagery layer for print templates.
// Renders an absolutely-positioned image band at the top of the page with an
// optional accent-color wash and gradient scrim so hero copy stays legible.
// Opt-in per asset via `content.heroMedia` — layouts without a value keep the
// existing accent-halo hero and read exactly as before.
import type { CSSProperties } from "react";

export type PrintHeroScrim = "top" | "bottom" | "both" | "radial" | "none";

export type PrintHeroMedia = {
  imageUrl: string;
  focalPoint?: string;           // CSS object-position, e.g. "50% 35%"
  overlayColor?: string;         // hex; defaults to page accent supplied by layout
  overlayOpacity?: number;       // 0..1, default 0.55 — accent wash strength
  washStrength?: number;         // 0..1, default 1 — legibility scrim + feather multiplier
  scrim?: PrintHeroScrim;        // legibility gradient, default "bottom"
  blendMode?: CSSProperties["mixBlendMode"]; // default "multiply"
  heightPct?: number;            // 0..100, share of page height, default 46
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
  const overlayOpacity = media.overlayOpacity ?? 0.55;
  const scrim = media.scrim ?? "bottom";
  const blendMode = media.blendMode ?? "multiply";
  const heightPct = media.heightPct ?? 46;

  const scrimGradient =
    scrim === "top"
      ? `linear-gradient(180deg, ${mode === "dark" ? "#111114" : "#FFFFFF"} 0%, transparent 55%)`
      : scrim === "bottom"
      ? `linear-gradient(180deg, transparent 40%, ${mode === "dark" ? "#111114" : "#FFFFFF"} 100%)`
      : scrim === "both"
      ? `linear-gradient(180deg, ${mode === "dark" ? "#111114" : "#FFFFFF"} 0%, transparent 35%, transparent 65%, ${mode === "dark" ? "#111114" : "#FFFFFF"} 100%)`
      : scrim === "radial"
      ? `radial-gradient(ellipse at 30% 45%, transparent 0%, transparent 40%, ${mode === "dark" ? "#111114" : "#FFFFFF"} 85%)`
      : "none";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0"
      aria-hidden
      style={{ height: `${heightPct}%`, overflow: "hidden" }}
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
          objectPosition: media.focalPoint ?? "50% 40%",
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
      {/* Legibility scrim into the body background */}
      {scrim !== "none" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: scrimGradient,
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
          background: `linear-gradient(180deg, transparent 0%, ${mode === "dark" ? "#111114" : "#FFFFFF"} 100%)`,
        }}
      />
    </div>
  );
}
