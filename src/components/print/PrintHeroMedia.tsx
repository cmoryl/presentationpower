// Hero photography / imagery layer for print templates.
// Renders an absolutely-positioned image band at the top of the page with an
// optional accent-color wash and gradient scrim so hero copy stays legible.
// Opt-in per asset via `content.heroMedia` — layouts without a value keep the
// existing accent-halo hero and read exactly as before.
import { useEffect, useState, type CSSProperties } from "react";

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
  washStrength?: number;         // 0..1, default 1 — feather-into-page intensity
  scrimOpacity?: number;         // 0..1 — scrim gradient opacity; falls back to washStrength
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
  const scrimOpacity = clamp01(media.scrimOpacity ?? media.washStrength ?? 1);
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

  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [media.imageUrl]);
  const showFallback = !media.imageUrl || failed;

  // Fallback: page-bg base (white / off-black) with a soft accent wash so the
  // hero band still reads as intentional even when photography is absent.
  const fallbackBg = `linear-gradient(160deg, ${pageBg} 0%, ${pageBg} 55%, ${withAlpha(overlayColor, 0.18)} 100%), radial-gradient(120% 90% at ${fx ?? 30}% ${fy ?? 40}%, ${withAlpha(overlayColor, 0.28)} 0%, transparent 70%), ${pageBg}`;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0"
      aria-hidden
      style={bandStyle}
    >
      {showFallback ? (
        <div style={{ position: "absolute", inset: 0, background: fallbackBg }} />
      ) : (
        <img
          src={media.imageUrl}
          alt=""
          onError={() => setFailed(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition,
          }}
        />
      )}

      {/* Accent color wash — skip on fallback so we don't double-tint the gradient */}
      {!showFallback && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
            mixBlendMode: blendMode,
          }}
        />
      )}
      {/* Legibility scrim into the body background — scaled by washStrength */}
      {scrim !== "none" && scrimOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: scrimGradient,
            opacity: scrimOpacity,
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

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(clamp01(alpha) * 255).toString(16).padStart(2, "0");
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    const r = h[0], g = h[1], b = h[2];
    return `#${r}${r}${g}${g}${b}${b}${a}`;
  }
  if (h.length === 6 || h.length === 8) return `#${h.slice(0, 6)}${a}`;
  return hex;
}
