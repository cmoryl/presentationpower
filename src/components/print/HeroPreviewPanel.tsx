// Compact hero preview shown in the print asset inspector. Lets the user
// preview the current `heroMedia` or the plain page-base hero state that
// renders when heroMedia is empty.
import { useEffect, useState } from "react";
import type { PrintHeroMedia } from "@/lib/print-assets.types";
import type { BrandMode } from "@/lib/taxonomy";
import { Crosshair, Image as ImageIcon, Sparkles } from "lucide-react";

type Props = {
  media: PrintHeroMedia | undefined;
  brand: BrandMode | undefined;
};

export function HeroPreviewPanel({ media, brand }: Props) {
  const hasMedia = !!media?.imageUrl;
  const [view, setView] = useState<"media" | "base">(hasMedia ? "media" : "base");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [showGuides, setShowGuides] = useState(true);
  // Auto-follow: when the user picks or clears imagery in the panel above,
  // snap the preview to the matching view so changes are visible instantly
  // without needing to toggle Photo/Aura by hand.
  useEffect(() => {
    setView(hasMedia ? "media" : "base");
  }, [hasMedia]);
  const active = view === "media" && !hasMedia ? "base" : view;

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
              onClick={() => setView("base")}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
                active === "base" ? "bg-white text-[#0b0d18]" : "text-white/70 hover:text-white"
              }`}
            >
              <Sparkles className="h-3 w-3" /> Base
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowGuides((s) => !s)}
            className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] transition ${
              showGuides ? "bg-white text-[#0b0d18]" : "text-white/70 hover:text-white"
            }`}
            title={showGuides ? "Hide centering guides" : "Show centering guides"}
          >
            <Crosshair className="h-3 w-3" /> Guides
          </button>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-black/5 shadow-inner"
        style={{ aspectRatio: "816 / 1056", background: pageBg }}
      >
        {active === "media" && hasMedia ? (
          <PhotoBand media={media!} accent={accent} mode={mode} />
        ) : (
          <BaseHeroPreview mode={mode} />
        )}
        {showGuides && (
          <CenteringGuides
            heightPct={active === "media" && hasMedia ? (media!.heightPct ?? 46) : 55}
            offsetPct={media?.copyOffsetPct ?? 0}
            isDark={isDark}
          />
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
            ? "Plain page-base hero shown when the image URL is empty or fails to load."
            : "No heroMedia set — pages render the hero directly on the page base."}
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
          background: overlayColor,
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

function BaseHeroPreview({ mode }: { mode: "light" | "dark" }) {
  const isDark = mode === "dark";
  const pageBg = isDark ? "#111114" : "#FFFFFF";
  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{
        height: "55%",
        background: pageBg,
      }}
    />
  );
}

/**
 * Subtle overlay guides to help align the hero copy vertically:
 *  - dashed horizontal line at the hero band's true vertical center
 *  - dashed vertical line at horizontal center (as an alignment reference)
 *  - accent-colored line at the current copy-offset target position,
 *    with a small % chip when non-zero
 */
function CenteringGuides({
  heightPct,
  offsetPct,
  isDark,
}: {
  heightPct: number;
  offsetPct: number;
  isDark: boolean;
}) {
  const clampedOffset = Math.max(-50, Math.min(50, offsetPct));
  // Copy is centered inside the hero band (0..heightPct% of page).
  // Offset translates the copy block by `offsetPct%` of the band height.
  const centerY = heightPct / 2;
  const offsetY = centerY + (clampedOffset / 100) * heightPct;
  const guideColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
  const accent = "#003FC7";
  const nudged = clampedOffset !== 0;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* horizontal center of the hero band */}
      <div
        className="absolute inset-x-0"
        style={{
          top: `${centerY}%`,
          height: 0,
          borderTop: `1px dashed ${guideColor}`,
        }}
      />
      {/* vertical center reference */}
      <div
        className="absolute inset-y-0"
        style={{
          left: "50%",
          width: 0,
          borderLeft: `1px dashed ${guideColor}`,
          opacity: 0.6,
        }}
      />
      {/* current offset position (only when nudged) */}
      {nudged ? (
        <>
          <div
            className="absolute inset-x-0"
            style={{
              top: `${offsetY}%`,
              height: 0,
              borderTop: `1px solid ${accent}`,
              boxShadow: `0 0 0 0.5px ${accent}`,
            }}
          />
          <div
            className="absolute rounded-full px-1.5 py-[1px] text-[9px] font-medium leading-none text-white"
            style={{
              top: `calc(${offsetY}% - 8px)`,
              right: 6,
              background: accent,
            }}
          >
            {clampedOffset > 0 ? "+" : ""}
            {Math.round(clampedOffset)}%
          </div>
        </>
      ) : null}
    </div>
  );
}

