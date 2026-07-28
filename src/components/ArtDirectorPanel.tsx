import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { byId, SECTION_FRAMEWORKS } from "@/lib/taxonomy";
import {
  critiqueDeckRhythm,
  type ArtDirectorReport,
  type ArtDirectorNote,
} from "@/lib/art-director.functions";

type Severity = ArtDirectorNote["severity"];

type AppliedSwap = {
  key: string;
  slideIndex: number;
  fromVariantId: string;
  toVariantId: string;
  severity: Severity;
  headline: string;
  at: number;
};


const SEVERITY_META: Record<Severity, { label: string; ring: string; chip: string; dot: string }> =
  {
    critical: {
      label: "Critical",
      ring: "border-rose-400/40",
      chip: "bg-rose-500/15 text-rose-200",
      dot: "bg-rose-400",
    },
    warning: {
      label: "Warning",
      ring: "border-amber-400/40",
      chip: "bg-amber-500/15 text-amber-200",
      dot: "bg-amber-400",
    },
    suggestion: {
      label: "Nudge",
      ring: "border-sky-400/30",
      chip: "bg-sky-500/15 text-sky-200",
      dot: "bg-sky-400",
    },
  };

const CHAPTER_LABEL: Record<string, string> = {
  opening: "Opening",
  context: "Context",
  solution: "Solution",
  proof: "Proof",
  close: "Close",
};

const VERDICT_COLOR: Record<string, string> = {
  light: "#FFEB66",
  balanced: "#A6FA87",
  heavy: "#FF9B70",
};

function scoreBand(score: number) {
  if (score >= 85) return { label: "Cinematic", color: "#A6FA87" };
  if (score >= 70) return { label: "Well paced", color: "#FFEB66" };
  if (score >= 50) return { label: "Uneven", color: "#FF9B70" };
  return { label: "Flat", color: "#EC388A" };
}

export function ArtDirectorPanel({
  deckId,
  onNavigateToSlide,
  onSwapVariant,
}: {
  deckId: string;
  onNavigateToSlide?: (index: number) => void;
  onSwapVariant?: (slideIndex: number, variantId: string) => void;
}) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const run = useServerFn(critiqueDeckRhythm);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [report, setReport] = useState<ArtDirectorReport | null>(null);
  const [appliedLog, setAppliedLog] = useState<AppliedSwap[]>([]);

  if (!deck) return null;

  function applySwap(note: ArtDirectorNote) {
    if (!deck || !onSwapVariant || note.slideIndex === undefined || !note.suggestedVariantId) return;
    const slideIndex = note.slideIndex;
    const target = deck.slides[slideIndex];
    if (!target) return;
    const fromVariantId = target.variantId;
    const toVariantId = note.suggestedVariantId;

    onSwapVariant(slideIndex, toVariantId);

    const entry: AppliedSwap = {
      key: `${slideIndex}-${toVariantId}-${Date.now()}`,
      slideIndex,
      fromVariantId,
      toVariantId,
      severity: note.severity,
      headline: note.headline,
      at: Date.now(),
    };
    setAppliedLog((prev) => [entry, ...prev].slice(0, 12));

    const title =
      note.severity === "critical"
        ? `Critical fix applied — Slide ${slideIndex + 1}`
        : `Layout swapped — Slide ${slideIndex + 1}`;
    const body = `${fromVariantId} → ${toVariantId} · ${note.headline}`;
    const opts = {
      description: body,
      duration: note.severity === "critical" ? 9000 : 5000,
      action: {
        label: "Undo",
        onClick: () => {
          onSwapVariant(slideIndex, fromVariantId);
          setAppliedLog((prev) => prev.filter((e) => e.key !== entry.key));
          toast.message(`Reverted Slide ${slideIndex + 1}`, {
            description: `${toVariantId} → ${fromVariantId}`,
          });
        },
      },
    };
    if (note.severity === "critical") toast.warning(title, opts);
    else toast.success(title, opts);

    onNavigateToSlide?.(slideIndex);
  }



  async function onRun() {
    if (!deck) return;
    setBusy(true);
    setError(null);
    setSetupNeeded(false);
    try {
      const payload = {
        deckTitle: deck.title,
        brandModeId: deck.brandModeId,
        slides: deck.slides.map((s, i) => {
          const title =
            s.content &&
            typeof s.content === "object" &&
            "title" in s.content &&
            typeof (s.content as { title?: unknown }).title === "string"
              ? String((s.content as { title?: unknown }).title)
              : undefined;
          const wordCount = JSON.stringify(s.content ?? {}).split(/\s+/).length;
          return {
            index: i,
            variantId: s.variantId,
            sectionId: s.sectionId,
            title,
            wordCount,
          };
        }),
      };
      const res = await run({ data: payload });
      if (!res.ok) {
        setError(res.error);
        setSetupNeeded(!!res.setup);
        return;
      }
      setReport(res.report);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const band = report ? scoreBand(report.overallScore) : null;
  const grouped: Record<Severity, ArtDirectorNote[]> = {
    critical: [],
    warning: [],
    suggestion: [],
  };
  (report?.notes ?? []).forEach((n) => grouped[n.severity].push(n));

  return (
    <section
      id="art-director"
      className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1B0033] via-[#2D0059] to-[#5B21B6] text-white shadow-2xl scroll-mt-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 px-8 py-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            Move D · Editorial Agent
          </div>
          <h2 className="mt-1 font-[Geist] text-2xl font-semibold tracking-tight">Art Director</h2>
          <p className="mt-1 max-w-xl text-sm text-white/60">
            Reads the deck as a deck — pacing, rhythm, hero moments, and chapter balance. Suggests
            variant swaps to tighten the arc.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2D0059] shadow transition hover:bg-white/90 disabled:opacity-60"
        >
          {busy ? "Reading the deck…" : report ? "Re-run critique" : "Run Art Director"}
        </button>
      </div>

      {error && (
        <div
          className={`px-8 py-4 text-sm ${setupNeeded ? "bg-amber-500/10 text-amber-100" : "bg-rose-500/10 text-rose-100"}`}
        >
          {setupNeeded ? "⚙ Setup required — " : "⚠ "}
          {error}
        </div>
      )}

      {!report && !busy && !error && (
        <div className="px-8 py-10 text-sm text-white/60">
          Click <span className="text-white">Run Art Director</span> for a holistic pacing critique
          of these {deck.slides.length} slides.
        </div>
      )}

      {busy && (
        <div className="flex items-center gap-3 px-8 py-10 text-sm text-white/70">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#C2A3FF]" />
          Reading arc, cadence, and hero placement — 20–40 seconds.
        </div>
      )}

      {report && band && (
        <div className="grid gap-6 px-8 py-6 lg:grid-cols-12">
          {/* Score + Arc */}
          <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
              Rhythm Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-[Geist] text-6xl font-semibold" style={{ color: band.color }}>
                {Math.round(report.overallScore)}
              </div>
              <div className="text-sm text-white/60">/ 100</div>
            </div>
            <div className="mt-1 text-sm font-medium" style={{ color: band.color }}>
              {band.label}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/80">{report.arcSummary}</p>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Cadence</div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{report.cadence}</p>
            </div>
          </div>

          {/* Chapter balance + moments */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/60">
                Chapter Balance
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                {report.chapterBalance.map((c) => (
                  <div
                    key={c.chapter}
                    className="rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="text-[10px] uppercase tracking-widest text-white/50">
                      {CHAPTER_LABEL[c.chapter] ?? c.chapter}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span
                        className="text-2xl font-semibold"
                        style={{ color: VERDICT_COLOR[c.verdict] ?? "#fff" }}
                      >
                        {c.slideCount}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-white/50">
                        {c.verdict}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-white/60">{c.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {(report.heroMoments.length > 0 || report.quietMoments.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {report.heroMoments.length > 0 && (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-200/80">
                      Hero moments
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {report.heroMoments.map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onNavigateToSlide?.(i)}
                          className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/30"
                        >
                          Slide {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {report.quietMoments.length > 0 && (
                  <div className="rounded-2xl border border-sky-400/30 bg-sky-500/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-sky-200/80">
                      Quiet moments
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {report.quietMoments.map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onNavigateToSlide?.(i)}
                          className="rounded-full bg-sky-500/20 px-2.5 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/30"
                        >
                          Slide {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live applied-changes feed */}
            {appliedLog.length > 0 && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                    <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-100/80">
                      Applied this session · {appliedLog.length}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedLog([])}
                    className="text-[11px] text-emerald-100/60 underline-offset-2 hover:underline"
                  >
                    Clear log
                  </button>
                </div>
                <ul className="space-y-2" aria-live="polite">
                  {appliedLog.map((e) => (
                    <li
                      key={e.key}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[12px]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${SEVERITY_META[e.severity].chip}`}
                        >
                          {SEVERITY_META[e.severity].label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigateToSlide?.(e.slideIndex)}
                          className="font-semibold text-white/85 hover:underline"
                        >
                          Slide {e.slideIndex + 1}
                        </button>
                        <span className="font-mono text-white/60">
                          {e.fromVariantId} → {e.toVariantId}
                        </span>
                        <span className="text-white/40">
                          {new Date(e.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSwapVariant?.(e.slideIndex, e.fromVariantId);
                          setAppliedLog((prev) => prev.filter((x) => x.key !== e.key));
                          toast.message(`Reverted Slide ${e.slideIndex + 1}`, {
                            description: `${e.toVariantId} → ${e.fromVariantId}`,
                          });
                        }}
                        className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/75 transition hover:bg-white/10"
                      >
                        Undo
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}

            {(["critical", "warning", "suggestion"] as Severity[]).map((sev) => {
              const items = grouped[sev];
              if (!items.length) return null;
              const meta = SEVERITY_META[sev];
              return (
                <div key={sev} className={`rounded-2xl border ${meta.ring} bg-white/5 p-5`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                      {meta.label} · {items.length}
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {items.map((n, i) => {
                      const slideExists =
                        n.slideIndex !== undefined &&
                        n.slideIndex >= 0 &&
                        n.slideIndex < deck.slides.length;
                      const swappable = slideExists && !!n.suggestedVariantId && !!onSwapVariant;
                      const sectionName = slideExists
                        ? byId(SECTION_FRAMEWORKS, deck.slides[n.slideIndex!].sectionId)?.name
                        : undefined;
                      return (
                        <li
                          key={`${sev}-${i}`}
                          className="rounded-xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {slideExists ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToSlide?.(n.slideIndex!)}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${meta.chip} hover:brightness-125`}
                                >
                                  Slide {n.slideIndex! + 1}
                                </button>
                              ) : (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${meta.chip}`}
                                >
                                  Deck-wide
                                </span>
                              )}
                              <span className="text-[10px] uppercase tracking-widest text-white/40">
                                {n.kind}
                              </span>
                              {sectionName && (
                                <span className="text-[10px] text-white/40">· {sectionName}</span>
                              )}
                            </div>
                            {swappable &&
                              (() => {
                                const already = appliedLog.some(
                                  (e) =>
                                    e.slideIndex === n.slideIndex &&
                                    e.toVariantId === n.suggestedVariantId,
                                );
                                if (already)
                                  return (
                                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-100">
                                      ✓ Applied
                                    </span>
                                  );
                                return (
                                  <button
                                    type="button"
                                    onClick={() => applySwap(n)}
                                    className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/10"
                                    title={`Swap to ${n.suggestedVariantId}`}
                                  >
                                    Apply swap →
                                  </button>
                                );
                              })()}

                          </div>
                          <div className="mt-2 text-sm font-medium">{n.headline}</div>
                          <div className="mt-1 text-sm text-white/70">{n.detail}</div>
                          {n.suggestedVariantId && (
                            <div className="mt-2 text-[11px] text-white/50">
                              Suggested variant:{" "}
                              <span className="font-mono text-white/70">
                                {n.suggestedVariantId}
                              </span>
                              {n.swapFromVariantId && (
                                <>
                                  {" "}
                                  (from{" "}
                                  <span className="font-mono text-white/70">
                                    {n.swapFromVariantId}
                                  </span>
                                  )
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {report.notes.length === 0 && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
                No pacing issues detected — the deck reads cleanly end to end.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
