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
  autoScrim?: boolean;           // when true, sample image luminance and boost scrim on bright photos
  autoScrimThreshold?: number;   // 0..1 luminance above which the boost kicks in (default 0.6)
  blendMode?: CSSProperties["mixBlendMode"]; // default "multiply"
  heightPct?: number;            // 0..100, share of page height, default 46 (used when aspect="fill")
  // Responsive safe-area guards. Focal point is clamped so the subject can't
  // slide out of the crop as the band re-flows across breakpoints, and the
  // legibility scrim reserves this strip for hero copy.
  safeAreaX?: number;            // 0..40 — horizontal safe inset %, default 8
  safeAreaY?: number;            // 0..40 — vertical safe inset %, default 10
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
  const isDark = mode === "dark";
  const overlayColor = media.overlayColor ?? accent;
  // Mode-aware wash defaults: dark pages multiply the accent into the photo so
  // light ink reads; light pages keep a softer wash so dark ink reads.
  const overlayOpacity = clamp01(media.overlayOpacity ?? (isDark ? 0.62 : 0.42));
  const washStrength = clamp01(media.washStrength ?? 1);
  // Readability floor — never let the scrim drop below what hero copy needs.
  const scrimFloor = isDark ? 0.55 : 0.45;
  const scrimOpacity = Math.max(
    scrimFloor,
    clamp01(media.scrimOpacity ?? media.washStrength ?? 1),
  );
  const scrim = media.scrim ?? "bottom";
  const blendMode = media.blendMode ?? (isDark ? "multiply" : "soft-light");
  const heightPct = media.heightPct ?? 46;
  const aspect = media.aspect ?? "fill";
  const pageBg = isDark ? "#111114" : "#FFFFFF";


  // Safe-area guards keep the subject inside the crop as the band reflows
  // across breakpoints. Clamp so users can't zero-out the buffer.
  const safeX = Math.min(40, Math.max(0, media.safeAreaX ?? 8));
  const safeY = Math.min(40, Math.max(0, media.safeAreaY ?? 10));

  // Focal point: prefer explicit x/y, then legacy focalPoint, else 50%/40%.
  // Then clamp within [safeArea, 100 - safeArea] so the point of interest
  // can never slide out of the visible band at any breakpoint.
  const rawFx = typeof media.focalX === "number" ? clampPct(media.focalX) : null;
  const rawFy = typeof media.focalY === "number" ? clampPct(media.focalY) : null;
  const fx = rawFx !== null ? clampRange(rawFx, safeX, 100 - safeX) : null;
  const fy = rawFy !== null ? clampRange(rawFy, safeY, 100 - safeY) : null;
  const objectPosition =
    fx !== null || fy !== null
      ? `${fx ?? 50}% ${fy ?? 40}%`
      : media.focalPoint ?? "50% 40%";

  // Band sizing. Container-query units (cqw) keep the band proportional to
  // the page width across every preview breakpoint. For "fill" we also
  // clamp the height into a sensible min/max in cqw so the band never
  // collapses on very tall previews or overwhelms very short ones.
  const minBandCqw = cq(280); // ≈ 34% of page width, floor for readable hero
  const maxBandCqw = cq(720); // upper ceiling on very short containers
  const bandStyle: CSSProperties =
    aspect === "fill"
      ? {
          height: `clamp(${minBandCqw}, ${heightPct}%, ${maxBandCqw})`,
          overflow: "hidden",
        }
      : {
          aspectRatio: String(ASPECT_RATIOS[aspect]),
          width: "100%",
          minHeight: minBandCqw,
          maxHeight: maxBandCqw,
          overflow: "hidden",
        };


  // scrimGradient is derived below from `effectiveScrim` so auto-scrim can
  // upgrade a "none" scrim when bright imagery is detected.

  const [failed, setFailed] = useState(false);
  const [autoBoost, setAutoBoost] = useState(0); // extra scrim opacity added when auto detects bright imagery
  useEffect(() => { setFailed(false); setAutoBoost(0); }, [media.imageUrl]);

  // Auto legibility: sample the image band where hero text sits and, if too
  // bright, boost the scrim opacity so light copy still reads. CORS-tainted
  // canvases just no-op — we degrade gracefully to the manual scrim setting.
  // Auto legibility is ON by default so any image stays readable in both modes;
  // authors can still opt out with autoScrim: false.
  const autoScrimOn = media.autoScrim !== false;
  useEffect(() => {
    if (!autoScrimOn || !media.imageUrl) { setAutoBoost(0); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const w = 32, h = 32;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        // Sample the region where hero text sits based on scrim position.
        const region = scrim === "top" ? { y0: 0, y1: h * 0.5 }
                     : scrim === "both" || scrim === "radial" ? { y0: 0, y1: h }
                     : { y0: h * 0.5, y1: h }; // "bottom" | "none"
        const data = ctx.getImageData(0, Math.floor(region.y0), w, Math.floor(region.y1 - region.y0)).data;
        let sum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Rec. 709 luma, 0..1
          sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          count += 1;
        }
        const lum = count ? sum / count : 0;
        // Mode-aware contrast risk:
        //  - dark pages use light ink → bright photos are the problem
        //  - light pages use dark ink → dark photos are the problem
        const threshold = clamp01(media.autoScrimThreshold ?? (isDark ? 0.6 : 0.45));
        const risk = isDark
          ? (lum - threshold) / Math.max(0.001, 1 - threshold)
          : (threshold - lum) / Math.max(0.001, threshold);
        if (risk > 0) {
          // Ramp: just past threshold → +0.15, worst case → +0.55.
          setAutoBoost(clamp01(0.15 + clamp01(risk) * 0.4));
        } else {
          setAutoBoost(0);
        }
      } catch {
        // Tainted canvas / cross-origin — keep manual scrim.
        setAutoBoost(0);
      }
    };
    img.onerror = () => { if (!cancelled) setAutoBoost(0); };
    img.src = media.imageUrl;
    return () => { cancelled = true; };
  }, [media.imageUrl, autoScrimOn, media.autoScrimThreshold, scrim, isDark]);


  const showFallback = !media.imageUrl || failed;
  // When no image is present (or it failed to load) we render NOTHING — no
  // fallback wash / accent gradient band. Users repeatedly reported that
  // empty-hero blocks produce a "weird gradient band" over their page.
  // Layouts already ship their own deterministic hero when heroMedia is
  // absent, so returning null here keeps the canvas clean.
  if (showFallback) return null;

  // When auto-scrim boosts on a "none" scrim, promote to "bottom" so we
  // actually have a gradient to intensify.
  const effectiveScrim: PrintHeroScrim =
    scrim === "none" && autoBoost > 0 ? "bottom" : scrim;
  const effectiveScrimOpacity = clamp01(scrimOpacity + autoBoost);

  const scrimGradient =
    effectiveScrim === "top"
      ? `linear-gradient(180deg, ${pageBg} 0%, transparent 55%)`
      : effectiveScrim === "bottom"
      ? `linear-gradient(180deg, transparent 40%, ${pageBg} 100%)`
      : effectiveScrim === "both"
      ? `linear-gradient(180deg, ${pageBg} 0%, transparent 35%, transparent 65%, ${pageBg} 100%)`
      : effectiveScrim === "radial"
      ? `radial-gradient(ellipse at ${fx ?? 30}% ${fy ?? 45}%, transparent 0%, transparent 40%, ${pageBg} 85%)`
      : "none";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0"
      aria-hidden
      style={bandStyle}
    >
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

      {/* Accent color wash over the photo */}
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
      {effectiveScrim !== "none" && effectiveScrimOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: scrimGradient,
            opacity: effectiveScrimOpacity,
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
          height: `max(${cq(80)}, ${safeY * 0.9}%)`,
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

function clampRange(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return (lo + hi) / 2;
  return Math.max(lo, Math.min(hi, n));
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
