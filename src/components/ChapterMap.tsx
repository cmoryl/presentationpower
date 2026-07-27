import { computeChapters } from "@/lib/chapter-scaffold";
import type { DeckStrategy } from "@/lib/ai-strategist.functions";

/**
 * Visual chapter scaffold — collapses a DeckStrategy into 3–5 narrative
 * chapters so the user can eyeball rhythm and balance before generation.
 */
export function ChapterMap({
  plan,
  primaryColor = "#003FC7",
}: {
  plan: DeckStrategy;
  primaryColor?: string;
}) {
  const chapters = computeChapters(plan);
  if (chapters.length === 0) return null;
  const total = plan.recommendedSections.length;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">
          Narrative scaffold · {chapters.length} chapters
        </span>
        <span className="text-[10px] text-black/40">{total} slides</span>
      </div>
      <div className="flex gap-1.5">
        {chapters.map((ch) => {
          const width = Math.max(6, (ch.sections.length / total) * 100);
          return (
            <div
              key={ch.id}
              className="min-w-0 flex-none"
              style={{ width: `${width}%` }}
              title={`${ch.label} · ${ch.sections.length} slide${ch.sections.length === 1 ? "" : "s"}\n${ch.tone}`}
            >
              <div
                className="h-1.5 w-full rounded-full"
                style={{
                  backgroundColor: primaryColor,
                  opacity: 0.35 + (ch.sections.length / total) * 0.5,
                }}
              />
              <div
                className="mt-1.5 truncate text-[11px] font-bold uppercase tracking-widest"
                style={{ color: primaryColor }}
              >
                {ch.label}
              </div>
              <div className="text-[10px] text-black/60">
                {ch.sections.length} slide{ch.sections.length === 1 ? "" : "s"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
