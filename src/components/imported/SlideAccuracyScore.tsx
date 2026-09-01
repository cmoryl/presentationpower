// Per-slide accuracy readout for the AI reinterpretation review panel: how
// closely the designed slide matches the imported original, facet by facet.

import { scoreSlideAccuracy } from "@/lib/reinterpret-accuracy";
import type { MappedSlide } from "@/lib/pptx-mapping";

const BAND_STYLE: Record<"high" | "medium" | "low", { chip: string; bar: string; label: string }> = {
  high: { chip: "bg-[#A6FA87]/40 text-[#0B5A24]", bar: "bg-[#0B7A3B]", label: "Close match" },
  medium: { chip: "bg-[#FFEB66]/50 text-[#6B4A00]", bar: "bg-[#B25C00]", label: "Partial match" },
  low: { chip: "bg-[#FF9B70]/40 text-[#7A2410]", bar: "bg-[#E53D2E]", label: "Coverage drop" },
};

export function SlideAccuracyScore({
  slide,
  className = "",
}: {
  slide: MappedSlide;
  className?: string;
}) {
  const a = scoreSlideAccuracy(slide);
  const style = BAND_STYLE[a.band];

  return (
    <details className={`rounded-lg border border-black/10 bg-white/70 px-3 py-2 ${className}`}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-black/50">
        Accuracy vs original
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold normal-case ${style.chip}`}>
          {a.score}% · {style.label}
        </span>
        {a.missing.length > 0 && (
          <span className="normal-case text-[11px] text-black/45">
            {a.missing.length} line{a.missing.length === 1 ? "" : "s"} still unrepresented
          </span>
        )}
      </summary>

      {a.facets.length === 0 ? (
        <p className="mt-2 text-xs text-black/55">
          Nothing measurable on the source page — no copy, imagery or data to compare.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {a.facets.map((f) => (
            <li key={f.id}>
              <div className="flex items-center justify-between gap-3 text-xs text-[#03002C]">
                <span className="font-medium">{f.label}</span>
                <span className="text-black/50">{Math.round(f.score * 100)}%</span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10"
                role="img"
                aria-label={`${f.label}: ${Math.round(f.score * 100)} percent`}
              >
                <div
                  className={`h-full rounded-full ${
                    f.score >= 0.9 ? BAND_STYLE.high.bar : f.score >= 0.7 ? BAND_STYLE.medium.bar : BAND_STYLE.low.bar
                  }`}
                  style={{ width: `${Math.max(2, Math.round(f.score * 100))}%` }}
                />
              </div>
              <p className="mt-0.5 text-[11px] text-black/55">{f.detail}</p>
            </li>
          ))}
        </ul>
      )}

      {a.missing.length > 0 && (
        <div className="mt-2 border-t border-black/10 pt-2">
          <p className="text-[11px] uppercase tracking-wider text-black/45">Not represented anywhere</p>
          <ul className="mt-1 space-y-1 text-xs text-black/60">
            {a.missing.map((m, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-black/30">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
