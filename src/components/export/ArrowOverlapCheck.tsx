import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ScanSearch } from "lucide-react";
import {
  scanArrowOverlaps,
  summarizeArrowOverlaps,
  type ArrowOverlapReport,
} from "@/lib/arrow-overlap-check";

/**
 * Pre-export arrow overlap check.
 *
 * Measures the slide previews already rendered on this page and highlights any
 * place a directional cue sits on top of live copy or imagery — the exact
 * collision that becomes an overlapping shape in an exported .pptx. Read-only:
 * it never touches the slides, so it is safe to run right before exporting.
 */
export function ArrowOverlapCheck({ className = "" }: { className?: string }) {
  const [report, setReport] = useState<ArrowOverlapReport | null>(null);
  const [highlight, setHighlight] = useState(true);

  const run = useCallback(() => {
    setReport(scanArrowOverlaps(document));
  }, []);

  // Rects are viewport-relative, so re-measure while the highlight is showing.
  useEffect(() => {
    if (!report || !highlight || report.slides.length === 0) return;
    let raf = 0;
    const refresh = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setReport(scanArrowOverlaps(document)));
    };
    window.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, report?.slides.length]);

  const clean = report && report.slides.length === 0;

  return (
    <section
      className={`rounded-2xl border border-black/10 bg-white/80 p-5 print:hidden ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#03002C]">
            Arrow overlap check
          </h2>
          <p className="mt-1 text-xs text-black/55">
            Scans the previews below for directional cues sitting on top of copy or imagery — the
            collisions that survive into PowerPoint as overlapping shapes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report && report.slides.length > 0 && (
            <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-black/70">
              <input
                type="checkbox"
                checked={highlight}
                onChange={(e) => setHighlight(e.target.checked)}
                className="h-4 w-4"
              />
              Highlight on slides
            </label>
          )}
          <button
            type="button"
            onClick={run}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#03002C] px-4 text-sm font-semibold text-white hover:bg-[#003FC7]"
          >
            <ScanSearch className="h-4 w-4" aria-hidden />
            {report ? "Re-check" : "Check overlap"}
          </button>
        </div>
      </div>

      {clean && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0B7A3B]">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {summarizeArrowOverlaps(report)} · {report.arrows} cue
          {report.arrows === 1 ? "" : "s"} measured
        </p>
      )}

      {report && report.slides.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {summarizeArrowOverlaps(report)}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-900/90">
            {report.slides.map((s) => (
              <li key={s.slideId}>
                <span className="font-mono text-amber-900/60">Slide {s.index}</span>{" "}
                {s.hits
                  .slice(0, 3)
                  .map((h) => `${h.arrowKind} over “${h.content}” (${Math.round(h.ratio * 100)}%)`)
                  .join(" · ")}
                {s.hits.length > 3 ? ` · +${s.hits.length - 3} more` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-900/70">
            Fix by shortening the copy, switching the cue to a lighter arrow style, or moving the
            block in the slide editor — then re-check.
          </p>
        </div>
      )}

      {highlight && report && report.slides.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
          {report.slides.flatMap((s) =>
            s.hits.map((h, k) => (
              <div
                key={`${s.slideId}-${k}`}
                className="absolute rounded-[3px] border-2 border-[#E53D2E] bg-[#E53D2E]/25"
                style={{
                  left: h.rect.left,
                  top: h.rect.top,
                  width: h.rect.width,
                  height: h.rect.height,
                }}
              />
            )),
          )}
        </div>
      )}
    </section>
  );
}
