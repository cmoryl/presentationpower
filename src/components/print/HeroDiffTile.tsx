// Compact "before vs after" hero preview used in the bulk-apply confirmation
// modal. Renders two miniature page tiles side-by-side so the user can eyeball
// focal / scrim / wash behavior for each row before confirming — including
// skipped (customized) rows where they can verify nothing changes.
import type { PrintHeroMedia } from "@/lib/print-assets.types";

type Props = {
  before: PrintHeroMedia | null;
  after: PrintHeroMedia | null;
  status: "update" | "skip";
  accent?: string;
};

export function HeroDiffTile({ before, after, status, accent = "#003FC7" }: Props) {
  const rhs = status === "skip" ? before : after;
  const beforeH = Math.round(before?.heightPct ?? 46);
  const afterH = Math.round(rhs?.heightPct ?? 46);
  const heightChanged = status !== "skip" && beforeH !== afterH;
  return (
    <div className="flex items-stretch gap-1.5">
      <MiniHero media={before} accent={accent} label="Before" heightPct={beforeH} />
      <div className="flex flex-col items-center justify-center px-0.5 text-[9px] uppercase tracking-[0.16em] text-black/40">
        →
      </div>
      <MiniHero
        media={rhs}
        accent={accent}
        label={status === "skip" ? "Kept" : "After"}
        dimmed={status === "skip"}
        heightPct={afterH}
        highlightHeight={heightChanged}
      />
    </div>
  );
}

function MiniHero({
  media,
  accent,
  label,
  dimmed = false,
}: {
  media: PrintHeroMedia | null;
  accent: string;
  label: string;
  dimmed?: boolean;
}) {
  const hasMedia = !!media?.imageUrl;
  const heightPct = media?.heightPct ?? 46;
  const focalX = typeof media?.focalX === "number" ? media.focalX : 50;
  const focalY = typeof media?.focalY === "number" ? media.focalY : 40;
  const washStrength = media?.washStrength ?? 1;
  const overlayOpacity = (media?.overlayOpacity ?? 0.55) * washStrength;
  const overlayColor = media?.overlayColor ?? accent;
  const scrim = media?.scrim ?? "bottom";
  const scrimOpacity = media?.scrimOpacity ?? washStrength;
  const pageBg = "#FFFFFF";

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
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative overflow-hidden rounded border border-black/10 shadow-sm ${dimmed ? "opacity-70" : ""}`}
        style={{ width: 52, aspectRatio: "816 / 1056", background: pageBg }}
      >
        {hasMedia ? (
          <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: `${heightPct}%` }}>
            <img
              src={media!.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: `${focalX}% ${focalY}%` }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: overlayColor,
                opacity: overlayOpacity,
                mixBlendMode: (media?.blendMode ?? "multiply") as React.CSSProperties["mixBlendMode"],
              }}
            />
            {scrimGradient !== "none" ? (
              <div
                className="absolute inset-0"
                style={{ background: scrimGradient, opacity: scrimOpacity }}
              />
            ) : null}
          </div>
        ) : (
          <div className="absolute inset-x-0 top-0 bg-black/[0.04]" style={{ height: `${heightPct}%` }} />
        )}
        <div className="absolute inset-x-1 bottom-1 space-y-[2px]">
          <div className="h-[2px] w-2/3 rounded-full bg-black/10" />
          <div className="h-[2px] w-4/5 rounded-full bg-black/[0.08]" />
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-[0.16em] text-black/45">{label}</span>
    </div>
  );
}
