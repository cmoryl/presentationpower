import type { DeckSlide, SlideSwapLogEntry } from "@/lib/deck-store";

const SOURCE_LABEL: Record<string, string> = {
  inspector: "Inspector",
  "quick-select": "Quick select",
  related: "Related modules",
  gallery: "Gallery",
  overview: "Overview",
  "import-map": "Import mapping",
  bulk: "Bulk apply",
  ai: "AI",
  unknown: "—",
};

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/** Append-only audit trail of module layout/variant swaps for one slide. */
export function SlideSwapLogPanel({
  slide,
  onClear,
}: {
  slide: DeckSlide;
  onClear?: () => void;
}) {
  const log: SlideSwapLogEntry[] = slide.swapLog ?? [];
  const entries = [...log].reverse();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-black/50">
          {entries.length} {entries.length === 1 ? "swap" : "swaps"} recorded
        </span>
        {entries.length > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/55 hover:border-black/40 hover:text-black"
          >
            Clear
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-black/50">
          No layout swaps yet. Every module change on this slide is logged here.
        </p>
      ) : (
        <ol className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {entries.map((e) => (
            <li key={e.id} className="rounded-xl border border-black/10 bg-white/70 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2 text-[11px] text-black/50">
                <span>{when(e.at)}</span>
                <span className="uppercase tracking-widest">
                  {SOURCE_LABEL[e.source] ?? e.source}
                </span>
              </div>
              <div className="mt-1 text-sm">
                <span className="text-black/60">{e.fromVariantName ?? e.fromVariantId}</span>
                <span className="mx-1.5 text-black/35">→</span>
                <span className="font-medium">{e.toVariantName ?? e.toVariantId}</span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-black/40">
                {e.fromVariantId} → {e.toVariantId}
                {e.fromLayoutId !== e.toLayoutId && ` · ${e.fromLayoutId} → ${e.toLayoutId}`}
              </div>
              <div className="mt-1 text-[11px] text-black/50">
                by {e.actorLabel ?? e.actorId ?? "unknown user"}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
