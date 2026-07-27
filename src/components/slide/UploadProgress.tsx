// Shared upload progress indicator for image drops (deck stage +
// SlideImageryPanel). Driven by useImageDrop's coarse phase progress.

import { useEffect, useRef, useState } from "react";
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
  const pct = progress?.pct ?? 5;
  const label = progress ? describeProgress(progress) : "Uploading…";

  // Announce meaningful milestones only (phase / file changes), never every
  // percentage tick — otherwise screen readers chatter through the upload.
  const [announcement, setAnnouncement] = useState("");
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (!busy) {
      lastKey.current = null;
      setAnnouncement("");
      return;
    }
    const key = `${progress?.phase ?? "start"}:${progress?.fileName ?? ""}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    setAnnouncement(`${label} ${pct}% complete.`);
  }, [busy, label, pct, progress?.fileName, progress?.phase]);

  if (!busy) return null;

  return (
    <div className={`w-full ${className}`}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <div
        className={`flex items-center justify-between gap-3 text-[11px] ${
          tone === "onBrand" ? "text-[#03002C]" : "text-black/60"
        }`}
        aria-hidden="true"
      >
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${
          tone === "onBrand" ? "bg-white/40" : "bg-black/10"
        }`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${label} ${pct}%`}
        aria-label="Image upload progress"
      >
        <div
          className={`h-full rounded-full ${
            tone === "onBrand" ? "bg-white" : "bg-[#003FC7]"
          } transition-[width] duration-300 ease-out motion-reduce:transition-none`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
}

