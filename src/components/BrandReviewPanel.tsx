import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useDeckStore } from "@/lib/deck-store";
import { reviewDeck, listDeckReviews, type BrandReview, type BrandReviewFinding } from "@/lib/ai-review.functions";
import { deckCloudId } from "@/lib/deck-uuid";
import { byId, SECTION_FRAMEWORKS } from "@/lib/taxonomy";

type Severity = BrandReviewFinding["severity"];

const SEVERITY_META: Record<Severity, { label: string; ring: string; chip: string; dot: string }> = {
  critical: { label: "Critical", ring: "border-rose-400/40", chip: "bg-rose-500/15 text-rose-200", dot: "bg-rose-400" },
  warning: { label: "Warning", ring: "border-amber-400/40", chip: "bg-amber-500/15 text-amber-200", dot: "bg-amber-400" },
  suggestion: { label: "Suggestion", ring: "border-sky-400/30", chip: "bg-sky-500/15 text-sky-200", dot: "bg-sky-400" },
};

function scoreBand(score: number) {
  if (score >= 85) return { label: "On-brand", color: "#A6FA87", ring: "ring-emerald-400/40" };
  if (score >= 70) return { label: "Mostly aligned", color: "#FFEB66", ring: "ring-amber-300/40" };
  if (score >= 50) return { label: "Needs polish", color: "#FF9B70", ring: "ring-orange-300/40" };
  return { label: "Off-brand", color: "#EC388A", ring: "ring-rose-400/40" };
}

type HistoryRow = {
  id: string;
  overall_score: number;
  created_at: string;
  summary: string;
};

export function BrandReviewPanel({
  deckId,
  onNavigateToSlide,
}: {
  deckId: string;
  onNavigateToSlide?: (index: number) => void;
}) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));

  const run = useServerFn(reviewDeck);
  const list = useServerFn(listDeckReviews);

  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [review, setReview] = useState<BrandReview | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  const cloudDeckId = useMemo(
    () => (userId ? deckCloudId(userId, deckId) : null),
    [userId, deckId],
  );

  // Load prior reviews when we have a cloud id
  useEffect(() => {
    if (!cloudDeckId) return;
    list({ data: { cloudDeckId } })
      .then((r) => {
        if (r.ok) setHistory(r.reviews as HistoryRow[]);
      })
      .catch(() => {});
  }, [cloudDeckId, list]);

  if (!deck) return null;

  async function onRun() {
    if (!deck) return;
    setBusy(true);
    setError(null);
    setSetupNeeded(false);
    try {
      const payload = {
        cloudDeckId: cloudDeckId ?? undefined,
        deckTitle: deck.title,
        brandModeId: deck.brandModeId,
        subCompany: deck.subCompany,
        brief: brief
          ? {
              prospect: brief.prospect,
              industry: brief.industry,
              audience: brief.audience,
              meetingObjective: brief.meetingObjective,
            }
          : undefined,
        slides: deck.slides.map((s, i) => ({
          index: i,
          sectionName: byId(SECTION_FRAMEWORKS, s.sectionId)?.name ?? "",
          variantId: s.variantId,
          content: s.content as Record<string, unknown>,
        })),
      };
      const res = await run({ data: payload });
      if (!res.ok) {
        setError(res.error);
        setSetupNeeded(!!res.setup);
        return;
      }
      setReview(res.review);
      // Refresh history if persisted
      if (cloudDeckId) {
        list({ data: { cloudDeckId } })
          .then((r) => {
            if (r.ok) setHistory(r.reviews as HistoryRow[]);
          })
          .catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const band = review ? scoreBand(review.overallScore) : null;
  const grouped = useMemo(() => {
    const g: Record<Severity, BrandReviewFinding[]> = { critical: [], warning: [], suggestion: [] };
    (review?.findings ?? []).forEach((f) => g[f.severity].push(f));
    return g;
  }, [review]);

  async function copyFix(fix: string, idx: number) {
    try {
      await navigator.clipboard.writeText(fix);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((v) => (v === idx ? null : v)), 1400);
    } catch { /* ignore */ }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#03002C] via-[#0A1350] to-[#003FC7] text-white shadow-2xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 px-8 py-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">AI Reviewer · Phase A</div>
          <h2 className="mt-1 font-[Geist] text-2xl font-semibold tracking-tight">Brand Review</h2>
          <p className="mt-1 max-w-xl text-sm text-white/60">
            High-reasoning audit against this division's brand guide — terminology, voice, claims, structure, and branding.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#03002C] shadow transition hover:bg-white/90 disabled:opacity-60"
        >
          {busy ? "Reviewing…" : review ? "Re-run review" : "Run brand review"}
        </button>
      </div>

      {error && (
        <div className={`px-8 py-4 text-sm ${setupNeeded ? "bg-amber-500/10 text-amber-100" : "bg-rose-500/10 text-rose-100"}`}>
          {setupNeeded ? "⚙ Setup required — " : "⚠ "}
          {error}
        </div>
      )}

      {!review && !busy && !error && (
        <div className="px-8 py-10 text-sm text-white/60">
          Click <span className="text-white">Run brand review</span> to score this deck against the {deck.brandModeId} brand guide.
        </div>
      )}

      {busy && (
        <div className="flex items-center gap-3 px-8 py-10 text-sm text-white/70">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#A1FBF9]" />
          Reasoning across {deck.slides.length} slides — this usually takes 20–40 seconds.
        </div>
      )}

      {review && band && (
        <div className="grid gap-6 px-8 py-6 lg:grid-cols-12">
          {/* Score */}
          <div className={`lg:col-span-4 rounded-2xl border border-white/10 bg-white/5 p-6 ring-2 ${band.ring}`}>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Overall Score</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-[Geist] text-6xl font-semibold" style={{ color: band.color }}>
                {Math.round(review.overallScore)}
              </div>
              <div className="text-sm text-white/60">/ 100</div>
            </div>
            <div className="mt-1 text-sm font-medium" style={{ color: band.color }}>
              {band.label}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/80">{review.summary}</p>

            {review.strengths.length > 0 && (
              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Strengths</div>
                <ul className="mt-2 space-y-1.5 text-sm text-white/80">
                  {review.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#A6FA87]">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Findings */}
          <div className="lg:col-span-8 space-y-4">
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
                    {items.map((f, i) => {
                      const globalIdx = (review.findings.indexOf(f));
                      const isCopied = copiedIdx === globalIdx;
                      const slideNum = f.slideIndex + 1;
                      const slideExists = f.slideIndex >= 0 && f.slideIndex < deck.slides.length;
                      return (
                        <li key={`${sev}-${i}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => slideExists && onNavigateToSlide?.(f.slideIndex)}
                                disabled={!slideExists}
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${meta.chip} ${slideExists ? "hover:brightness-125" : "opacity-60"}`}
                              >
                                Slide {slideNum}
                              </button>
                              <span className="text-[10px] uppercase tracking-widest text-white/40">{f.category}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyFix(f.suggestedFix, globalIdx)}
                              className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/10"
                            >
                              {isCopied ? "Copied ✓" : "Apply fix"}
                            </button>
                          </div>
                          <div className="mt-2 text-sm font-medium">{f.issue}</div>
                          {f.evidence && (
                            <div className="mt-1 text-xs italic text-white/50">"{f.evidence}"</div>
                          )}
                          <div className="mt-2 text-sm text-white/80">
                            <span className="text-white/50">Fix: </span>
                            {f.suggestedFix}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {review.findings.length === 0 && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
                No findings — this deck is fully aligned with the brand guide. Nice work.
              </div>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-white/10 px-8 py-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Review History</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">{history.length} run{history.length === 1 ? "" : "s"}</div>
          </div>
          <div className="flex items-end gap-3 overflow-x-auto pb-1">
            {[...history].reverse().map((h) => {
              const b = scoreBand(h.overall_score);
              const date = new Date(h.created_at);
              return (
                <div key={h.id} className="flex min-w-[64px] flex-col items-center gap-1" title={`${h.overall_score}/100 — ${date.toLocaleString()}`}>
                  <div
                    className="w-10 rounded-t"
                    style={{ height: `${Math.max(6, h.overall_score * 0.6)}px`, background: b.color }}
                  />
                  <div className="text-[10px] font-semibold" style={{ color: b.color }}>
                    {h.overall_score}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40">
                    {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
          {!cloudDeckId && (
            <div className="mt-3 text-[11px] text-white/40">
              Save this deck to your account to persist review history across sessions.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
