// Compact hero preview shown in the print asset inspector. Lets the user
// flip between the current `heroMedia` and the division aurora fallback
// (what the page renders when heroMedia is empty) before exporting.
import { useEffect, useState } from "react";
import type { PrintHeroMedia } from "@/lib/print-assets.types";
import type { BrandMode } from "@/lib/taxonomy";
import { Image as ImageIcon, Sparkles } from "lucide-react";

type Props = {
  media: PrintHeroMedia | undefined;
  brand: BrandMode | undefined;
};

export function HeroPreviewPanel({ media, brand }: Props) {
  const hasMedia = !!media?.imageUrl;
  const [view, setView] = useState<"media" | "aura">(hasMedia ? "media" : "aura");
  const [mode, setMode] = useState<"light" | "dark">("light");
  // Auto-follow: when the user picks or clears imagery in the panel above,
  // snap the preview to the matching view so changes are visible instantly
  // without needing to toggle Photo/Aura by hand.
  useEffect(() => {
    setView(hasMedia ? "media" : "aura");
  }, [hasMedia]);
  const active = view === "media" && !hasMedia ? "aura" : view;

  const accent = brand?.tokens?.accent ?? "#003FC7";
  const primary = brand?.tokens?.primary ?? accent;
  const isDark = mode === "dark";
  const pageBg = isDark ? "#111114" : "#FFFFFF";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between pb-2">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">Hero preview</div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-[10px] uppercase tracking-[0.2em]">
            <button
              type="button"
              onClick={() => setMode("light")}
              className={`rounded-full px-2 py-0.5 transition ${
                mode === "light" ? "bg-white text-[#0b0d18]" : "text-white/70 hover:text-white"
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setMode("dark")}
              className={`rounded-full px-2 py-0.5 transition ${
                mode === "dark" ? "bg-white text-[#0b0d18]" : "text-white/70 hover:text-white"
              }`}
            >
              Dark
            </button>
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-[10px] uppercase tracking-[0.2em]">
            <button
              type="button"
              onClick={() => setView("media")}
              disabled={!hasMedia}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
                active === "media" ? "bg-white text-[#0b0d18]" : "text-white/70 hover:text-white"
              } disabled:cursor-not-allowed disabled:opacity-40`}
              title={hasMedia ? "Show heroMedia" : "No heroMedia set"}
            >
              <ImageIcon className="h-3 w-3" /> Photo
            </button>
            <button
              type="button"
              onClick={() => setView("aura")}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
                active === "aura" ? "bg-white text-[#0b0d18]" : "text-white/70 hover:text-white"
              }`}
            >
              <Sparkles className="h-3 w-3" /> Aura
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-black/5 shadow-inner"
        style={{ aspectRatio: "816 / 1056", background: pageBg }}
      >
        {active === "media" && hasMedia ? (
          <PhotoBand media={media!} accent={accent} mode={mode} />
        ) : (
          <AuraBand accent={accent} primary={primary} mode={mode} />
        )}
        {/* Page body placeholder lines */}
        <div className="absolute inset-x-4 bottom-4 space-y-1.5">
          <div className={`h-1.5 w-2/3 rounded-full ${isDark ? "bg-white/15" : "bg-black/10"}`} />
          <div className={`h-1.5 w-4/5 rounded-full ${isDark ? "bg-white/10" : "bg-black/8"}`} />
          <div className={`h-1.5 w-1/2 rounded-full ${isDark ? "bg-white/10" : "bg-black/8"}`} />
        </div>
      </div>

      <div className="pt-2 text-[10px] leading-relaxed text-white/50">
        {active === "media"
          ? "Renders when heroMedia is set. Aspect, focal, and scrim controls above."
          : hasMedia
            ? "Fallback: shown only when the image URL is empty or fails to load."
            : "No heroMedia set — pages will render this division aurora fallback."}
      </div>
    </div>
  );
}

function PhotoBand({
  media,
  accent,
  mode,
}: {
  media: PrintHeroMedia;
  accent: string;
  mode: "light" | "dark";
}) {
  const heightPct = media.heightPct ?? 46;
  const focalX = typeof media.focalX === "number" ? media.focalX : 50;
  const focalY = typeof media.focalY === "number" ? media.focalY : 40;
  const washStrength = media.washStrength ?? 1;
  const overlayOpacity = (media.overlayOpacity ?? 0.55) * washStrength;
  const overlayColor = media.overlayColor ?? accent;
  const scrim = media.scrim ?? "bottom";
  const scrimOpacity = media.scrimOpacity ?? washStrength;
  const pageBg = mode === "dark" ? "#111114" : "#FFFFFF";

  const scrimGradient =
    scrim === "top"
      ? `linear-gradient(180deg, ${pageBg} 0%, transparent 60%)`
      : scrim === "both"
        ? `linear-gradient(180deg, ${pageBg} 0%, transparent 40%, transparent 60%, ${pageBg} 100%)`
        : scrim === "radial"
          ? `radial-gradient(ellipse at 50% 50%, transparent 40%, ${pageBg} 100%)`
          : scrim === "none"
            ? "none"
            : `linear-gradient(0deg, ${pageBg} 0%, transparent 55%)`;

  return (
    <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: `${heightPct}%` }}>
      <img
        src={media.imageUrl}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition: `${focalX}% ${focalY}%` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: accent,
          opacity: overlayOpacity,
          mixBlendMode: (media.blendMode ?? "multiply") as React.CSSProperties["mixBlendMode"],
        }}
      />
      {scrimGradient !== "none" ? (
        <div className="absolute inset-0" style={{ background: scrimGradient, opacity: scrimOpacity }} />
      ) : null}
    </div>
  );
}

function AuraBand({
  accent,
  primary,
  mode,
}: {
  accent: string;
  primary: string;
  mode: "light" | "dark";
}) {
  const isDark = mode === "dark";
  const pageBg = isDark ? "#111114" : "#FFFFFF";
  const bloom = isDark
    ? `radial-gradient(ellipse at 30% 25%, ${accent}88 0%, transparent 55%),` +
      `radial-gradient(ellipse at 78% 30%, ${primary}66 0%, transparent 60%)`
    : `radial-gradient(ellipse at 30% 25%, ${accent}55 0%, transparent 60%),` +
      `radial-gradient(ellipse at 78% 30%, ${primary}33 0%, transparent 65%)`;
  const mask = `linear-gradient(180deg, black 0%, black 62%, transparent 100%)`;
  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{
        height: "55%",
        background: `${bloom}, ${pageBg}`,
        WebkitMaskImage: mask,
        maskImage: mask,
        opacity: isDark ? 1 : 0.85,
        filter: "blur(0.4px)",
      }}
    />
  );
}
