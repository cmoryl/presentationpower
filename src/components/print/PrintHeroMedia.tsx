// Hero photography / imagery layer for print templates.
// Renders an absolutely-positioned image band at the top of the page with an
// optional accent-color wash and gradient scrim so hero copy stays legible.
// Opt-in per asset via `content.heroMedia` — layouts without a value keep the
// existing accent-halo hero and read exactly as before.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export type PrintHeroScrim = "top" | "bottom" | "both" | "radial" | "none";
export type PrintHeroAspect = "fill" | "21:9" | "16:9" | "3:2" | "4:3" | "1:1";

export type PrintHeroMedia = {
  imageUrl: string;
  focalPoint?: string; // legacy CSS object-position, e.g. "50% 35%"
  focalX?: number; // 0..100 — horizontal focal point %, wins over focalPoint
  focalY?: number; // 0..100 — vertical focal point %, wins over focalPoint
  aspect?: PrintHeroAspect; // band shape; "fill" uses heightPct, others letterbox to ratio
  overlayColor?: string; // hex; defaults to page accent supplied by layout
  overlayOpacity?: number; // 0..1, default 0.55 — accent wash strength
  washStrength?: number; // 0..1, default 1 — feather-into-page intensity
  scrimOpacity?: number; // 0..1 — scrim gradient opacity; falls back to washStrength
  scrim?: PrintHeroScrim; // legibility gradient, default "bottom"
  autoScrim?: boolean; // when true, sample image luminance and boost scrim on bright photos
  autoScrimThreshold?: number; // 0..1 luminance above which the boost kicks in (default 0.6)
  blendMode?: CSSProperties["mixBlendMode"]; // default "multiply"
  // Show the photo completely untreated: no accent wash, no readability veil,
  // no scrim, no page-coloured bottom fade. Only the band's soft edge mask
  // stays so the crop doesn't end in a hard seam.
  rawImage?: boolean;
  heightPct?: number; // 0..100, share of page height, default 46 (used when aspect="fill")
  // Responsive safe-area guards. Focal point is clamped so the subject can't
  // slide out of the crop as the band re-flows across breakpoints, and the
  // legibility scrim reserves this strip for hero copy.
  safeAreaX?: number; // 0..40 — horizontal safe inset %, default 8
  safeAreaY?: number; // 0..40 — vertical safe inset %, default 10
  // Automatic focal-point cropping. When on (default) and no explicit
  // focalX/focalY is set, the image is analysed for where its detail sits and
  // the crop is solved — per measured band size — so the busy subject stays
  // opposite the copy zone and the quiet "headline wall" stays under the
  // headline at every breakpoint.
  autoFocal?: boolean;
  copyZone?: "left" | "right" | "center"; // where hero copy sits, default "left"
  // Auto-generated per-mode treatments, merged over the base settings below.
  variants?: { light?: PrintHeroVariantOverrides; dark?: PrintHeroVariantOverrides };
};

export type PrintHeroVariantOverrides = Partial<
  Pick<
    PrintHeroMedia,
    | "overlayColor"
    | "overlayOpacity"
    | "washStrength"
    | "scrimOpacity"
    | "scrim"
    | "blendMode"
    | "autoScrimThreshold"
  >
>;

/** Detail centroid of an image, 0..1 in image space. */
type FocalAnalysis = { x: number; y: number; ready: boolean };

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

export function PrintHeroMediaLayer({ media: rawMedia, accent, mode, cq }: Props) {
  const isDark = mode === "dark";
  // Merge the auto-generated variant for this mode over the base settings so a
  // single uploaded photo carries a matched light AND dark treatment.
  const media: PrintHeroMedia = { ...rawMedia, ...(rawMedia.variants?.[mode] ?? {}) };
  const overlayColor = media.overlayColor ?? accent;
  // Mode-aware wash defaults: dark pages multiply the accent into the photo so
  // light ink reads; light pages keep a softer wash so dark ink reads.
  const overlayOpacity = clamp01(media.overlayOpacity ?? (isDark ? 0.62 : 0.42));
  const washStrength = clamp01(media.washStrength ?? 1);
  // Readability floor — never let the scrim drop below what hero copy needs.
  const scrimFloor = isDark ? 0.55 : 0.45;
  const scrimOpacity = Math.max(scrimFloor, clamp01(media.scrimOpacity ?? media.washStrength ?? 1));
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
  const explicitFx = rawFx !== null ? clampRange(rawFx, safeX, 100 - safeX) : null;
  const explicitFy = rawFy !== null ? clampRange(rawFy, safeY, 100 - safeY) : null;

  // ---- Automatic focal-point cropping -------------------------------------
  // Only kicks in when the author hasn't pinned a focal point by hand.
  const autoFocalOn = media.autoFocal !== false && rawFx === null && rawFy === null;
  const copyZone = media.copyZone ?? "left";
  const bandRef = useRef<HTMLDivElement | null>(null);
  const [bandSize, setBandSize] = useState<{ w: number; h: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [analysis, setAnalysis] = useState<FocalAnalysis>({ x: 0.5, y: 0.45, ready: false });

  // Measure the rendered band so the crop is re-solved at every breakpoint
  // instead of relying on a single authored percentage.
  useEffect(() => {
    const el = bandRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0 && r.height > 0) setBandSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Detail analysis: sample a small grid and weight each cell by local
  // contrast (how much it differs from its neighbours). Flat wall / sky reads
  // as near-zero weight; faces, plants and props dominate the centroid.
  useEffect(() => {
    if (!autoFocalOn || !media.imageUrl) {
      setAnalysis({ x: 0.5, y: 0.45, ready: false });
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      setNatural({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      try {
        const w = 48,
          h = 32;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        const lumAt = (x: number, y: number) => {
          const i = (y * w + x) * 4;
          return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        };
        let wx = 0,
          wy = 0,
          total = 0;
        for (let y = 1; y < h - 1; y += 1) {
          for (let x = 1; x < w - 1; x += 1) {
            const c = lumAt(x, y);
            const detail =
              Math.abs(c - lumAt(x - 1, y)) +
              Math.abs(c - lumAt(x + 1, y)) +
              Math.abs(c - lumAt(x, y - 1)) +
              Math.abs(c - lumAt(x, y + 1));
            const weight = detail * detail; // square so real edges outrank noise
            wx += weight * ((x + 0.5) / w);
            wy += weight * ((y + 0.5) / h);
            total += weight;
          }
        }
        if (!cancelled && total > 0) {
          setAnalysis({ x: clamp01(wx / total), y: clamp01(wy / total), ready: true });
        }
      } catch {
        // Tainted canvas — fall back to the authored/default focal point.
        if (!cancelled) setAnalysis({ x: 0.5, y: 0.45, ready: false });
      }
    };
    img.onerror = () => {
      if (!cancelled) setAnalysis({ x: 0.5, y: 0.45, ready: false });
    };
    img.src = media.imageUrl;
    return () => {
      cancelled = true;
    };
  }, [media.imageUrl, autoFocalOn]);

  // Solve object-position from the measured crop. With object-fit: cover the
  // image overflows on one axis by factor z; a position p puts image point s
  // at frame fraction t when p = (s - t/z) / (1 - 1/z). Solving per measured
  // band keeps the subject — and therefore the empty headline wall — locked
  // to the same place no matter how the band reflows.
  const autoFocal = useMemo(() => {
    if (!autoFocalOn || !analysis.ready || !bandSize || !natural) return null;
    const targetX = copyZone === "left" ? 0.74 : copyZone === "right" ? 0.26 : 0.5;
    const targetY = 0.46;
    const zx = (bandSize.w / bandSize.h) / (natural.w / natural.h); // >1 → crops vertically
    const solve = (subject: number, target: number, zoom: number) => {
      if (!Number.isFinite(zoom) || Math.abs(zoom - 1) < 0.001) return null; // no overflow on this axis
      return clamp01((subject - target / zoom) / (1 - 1 / zoom));
    };
    // Horizontal overflow exists when the image is wider than the band ratio.
    const px = solve(analysis.x, targetX, 1 / zx);
    const py = solve(analysis.y, targetY, zx);
    return { x: px, y: py };
  }, [autoFocalOn, analysis, bandSize, natural, copyZone]);

  const autoFxPct = autoFocal?.x != null ? clampRange(autoFocal.x * 100, safeX, 100 - safeX) : null;
  const autoFyPct = autoFocal?.y != null ? clampRange(autoFocal.y * 100, safeY, 100 - safeY) : null;
  const fx = explicitFx ?? autoFxPct;
  const fy = explicitFy ?? autoFyPct;
  const objectPosition =
    fx !== null || fy !== null
      ? `${fx ?? 50}% ${fy ?? 40}%`
      : (media.focalPoint ?? "50% 40%");

  // Band sizing. Container-query units (cqw) keep the band proportional to
  // the page width across every preview breakpoint. For "fill" we also
  // clamp the height into a sensible min/max in cqw so the band never
  // collapses on very tall previews or overwhelms very short ones.
  const minBandCqw = cq(280); // ≈ 34% of page width, floor for readable hero
  const maxBandCqw = cq(720); // upper ceiling on very short containers
  // Feather the WHOLE band (photo + accent wash + veil + scrim) to zero alpha
  // over its bottom third with an alpha mask. A page-coloured gradient alone
  // leaves a visible seam whenever the layout background behind the band is
  // not exactly `pageBg` (cards, tinted pages, print surfaces) — the mask is
  // background-agnostic so the edge always dissolves cleanly.
  const bandMask =
    "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 62%, rgba(0,0,0,0.86) 76%, rgba(0,0,0,0.5) 88%, rgba(0,0,0,0) 100%)";
  const bandStyle: CSSProperties =
    aspect === "fill"
      ? {
          height: `clamp(${minBandCqw}, ${heightPct}%, ${maxBandCqw})`,
          overflow: "hidden",
          maskImage: bandMask,
          maskSize: "100% 100%",
          maskRepeat: "no-repeat",
        }
      : {
          aspectRatio: String(ASPECT_RATIOS[aspect]),
          width: "100%",
          minHeight: minBandCqw,
          maxHeight: maxBandCqw,
          overflow: "hidden",
          maskImage: bandMask,
          maskSize: "100% 100%",
          maskRepeat: "no-repeat",
        };

  // scrimGradient is derived below from `effectiveScrim` so auto-scrim can
  // upgrade a "none" scrim when bright imagery is detected.

  const [failed, setFailed] = useState(false);
  const [autoBoost, setAutoBoost] = useState(0); // extra scrim opacity added when auto detects bright imagery
  useEffect(() => {
    setFailed(false);
    setAutoBoost(0);
  }, [media.imageUrl]);

  // Auto legibility: sample the image band where hero text sits and, if too
  // bright, boost the scrim opacity so light copy still reads. CORS-tainted
  // canvases just no-op — we degrade gracefully to the manual scrim setting.
  // Auto legibility is ON by default so any image stays readable in both modes;
  // authors can still opt out with autoScrim: false.
  const rawImage = media.rawImage === true;
  const autoScrimOn = !rawImage && media.autoScrim !== false;
  useEffect(() => {
    if (!autoScrimOn || !media.imageUrl) {
      setAutoBoost(0);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const w = 32,
          h = 32;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        // Sample the region where hero text sits based on scrim position.
        const region =
          scrim === "top"
            ? { y0: 0, y1: h * 0.5 }
            : scrim === "both" || scrim === "radial"
              ? { y0: 0, y1: h }
              : { y0: h * 0.5, y1: h }; // "bottom" | "none"
        const data = ctx.getImageData(
          0,
          Math.floor(region.y0),
          w,
          Math.floor(region.y1 - region.y0),
        ).data;
        let sum = 0,
          count = 0;
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
    img.onerror = () => {
      if (!cancelled) setAutoBoost(0);
    };
    img.src = media.imageUrl;
    return () => {
      cancelled = true;
    };
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
  const effectiveScrim: PrintHeroScrim = scrim === "none" && autoBoost > 0 ? "bottom" : scrim;
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
      ref={bandRef}
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

      {/* Accent color wash over the photo — skipped entirely in raw mode */}
      {!rawImage && (
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
      {/* Readability plate — a flat veil in the page background colour so hero
          copy keeps contrast over ANY image. Light mode veils toward white
          (dark ink reads), dark mode veils toward near-black (light ink reads).
          Strength ramps with the auto-luminance boost. */}
      {autoScrimOn && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: pageBg,
            opacity: clamp01((isDark ? 0.18 : 0.2) + autoBoost * 0.5),
          }}
        />
      )}

      {/* Legibility scrim into the body background — scaled by washStrength */}
      {!rawImage && effectiveScrim !== "none" && effectiveScrimOpacity > 0 && (
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
      {!rawImage && <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: `max(${cq(120)}, ${safeY * 1.6}%)`,
          background: `linear-gradient(180deg, transparent 0%, ${pageBg} 92%, ${pageBg} 100%)`,
          opacity: washStrength * 0.7,
        }}
      />}
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

