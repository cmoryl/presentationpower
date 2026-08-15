// Progress screen shown while a cloud-only deck is pulled into the local editor.
// Client-only by design (rendered after mount) so SSR text never mismatches.
type Stage = "fetching" | "building" | "opening";

const STEPS: Array<{ id: Stage; label: string }> = [
  { id: "fetching", label: "Fetching the deck from your account" },
  { id: "building", label: "Rebuilding slides and brand settings" },
  { id: "opening", label: "Opening the editor" },
];

export function DeckImportProgress({
  stage,
  title,
  slideCount,
}: {
  stage: Stage;
  title?: string;
  slideCount?: number;
}) {
  const index = STEPS.findIndex((s) => s.id === stage);
  const pct = ((index + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-10">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-background/70 p-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#003FC7] border-t-transparent"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {title || "Opening deck"}
            </p>
            <p className="text-[11px] text-foreground/50">
              {typeof slideCount === "number"
                ? `${slideCount} slide${slideCount === 1 ? "" : "s"} loaded`
                : "Loading from your account…"}
            </p>
          </div>
        </div>

        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label="Deck import progress"
        >
          <div
            className="h-full rounded-full bg-[#003FC7] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ol className="mt-4 space-y-2" aria-live="polite">
          {STEPS.map((s, i) => {
            const done = i < index;
            const active = i === index;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-2 text-xs ${
                  active
                    ? "font-medium text-foreground"
                    : done
                      ? "text-foreground/55"
                      : "text-foreground/35"
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                    done
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : active
                        ? "border-[#003FC7] text-[#003FC7]"
                        : "border-foreground/20"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {s.label}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function DeckImportFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-10">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-background/70 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Could not open this deck</p>
        <p className="mt-1 text-xs text-foreground/55">
          The deck may not exist, or you may need to sign in again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
