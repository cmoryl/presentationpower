// Shared upload progress indicator for image drops (deck stage +
// SlideImageryPanel). Driven by useImageDrop's coarse phase progress.

import { describeProgress, type ImageDropProgress } from "@/hooks/use-image-drop";

export function UploadProgress({
  progress,
  busy,
  className = "",
  tone = "light",
}: {
  progress: ImageDropProgress | null;
  busy: boolean;
  className?: string;
  /** "light" for white panels, "onBrand" when sitting on the blue overlay. */
  tone?: "light" | "onBrand";
}) {
  if (!busy) return null;
  const pct = progress?.pct ?? 5;
  const label = progress ? describeProgress(progress) : "Uploading…";
  const track = tone === "onBrand" ? "bg-white/40" : "bg-black/10";
  const bar = tone === "onBrand" ? "bg-white" : "bg-[#003FC7]";
  const text = tone === "onBrand" ? "text-[#03002C]" : "text-black/60";

  return (
    <div className={`w-full ${className}`} role="status" aria-live="polite">
      <div className={`flex items-center justify-between gap-3 text-[11px] ${text}`}>
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${track}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Image upload progress"
      >
        <div
          className={`h-full rounded-full ${bar} transition-[width] duration-300 ease-out`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
}
