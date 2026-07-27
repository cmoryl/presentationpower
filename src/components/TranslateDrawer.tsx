import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { deckCloudId } from "@/lib/deck-uuid";
import {
  Languages,
  X,
  Loader2,
  Check,
  AlertTriangle,
  History,
  RotateCcw,
  Square,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  listLanguages,
  listTranslationEngines,
  translateDeckInPlace,
  translateDeckToCopy,
  translateDeckBatch,
  listGlossary,
  listDeckTranslations,
  getDeckTranslationJobDetail,
  cancelDeckTranslation,
  retryDeckTranslation,
} from "@/lib/translation.functions";

type Mode = "in_place" | "copy" | "batch";
type Tab = "new" | "history";

export function TranslateDrawer({
  deckId,
  onClose,
  onTranslatedCopy,
}: {
  deckId: string;
  onClose: () => void;
  onTranslatedCopy?: (newDeckId: string) => void;
}) {
  const listLangs = useServerFn(listLanguages);
  const listEngines = useServerFn(listTranslationEngines);
  const listGloss = useServerFn(listGlossary);
  const inPlace = useServerFn(translateDeckInPlace);
  const toCopy = useServerFn(translateDeckToCopy);
  const batchFn = useServerFn(translateDeckBatch);

  const [languages, setLanguages] = useState<
    Array<{ id: string; label: string; native: string; rtl: boolean }>
  >([]);
  const [engines, setEngines] = useState<
    Array<{ id: "globallink" | "ai"; label: string; configured: boolean; note?: string }>
  >([]);
  const [glossaryCount, setGlossaryCount] = useState<number>(0);

  const [mode, setMode] = useState<Mode>("copy");
  const [selectedLang, setSelectedLang] = useState<string>("es");
  const [batchLangs, setBatchLangs] = useState<string[]>(["es", "fr", "de"]);
  const [engine, setEngine] = useState<"globallink" | "ai">("globallink");
  const [humanReview, setHumanReview] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "running" | "ok" | "err"; msg?: string }>({
    kind: "idle",
  });
  const [batchResults, setBatchResults] = useState<Record<
    string,
    { ok: true; deckId: string; title: string } | { ok: false; error: string }
  > | null>(null);

  // Job history state
  const [tab, setTab] = useState<Tab>("new");
  const [cloudDeckId, setCloudDeckId] = useState<string | null>(null);
  type JobRow = {
    id: string;
    target_lang: string;
    mode: Mode;
    status: "draft" | "translating" | "ready" | "failed" | "cancelled";
    engine: "globallink" | "ai";
    progress_current: number | null;
    progress_total: number | null;
    error: string | null;
    translated_deck_id: string | null;
    created_at: string;
    updated_at: string;
  };
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<
    Record<string, Awaited<ReturnType<typeof getDeckTranslationJobDetail>>>
  >({});
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const listJobs = useServerFn(listDeckTranslations);
  const jobDetail = useServerFn(getDeckTranslationJobDetail);
  const cancelJob = useServerFn(cancelDeckTranslation);
  const retryJob = useServerFn(retryDeckTranslation);

  // Resolve cloud deck id (deck_translations rows use it).
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!alive || !uid) return;
      setCloudDeckId(deckCloudId(uid, deckId));
    });
    return () => {
      alive = false;
    };
  }, [deckId]);

  const refreshJobs = useCallback(async () => {
    if (!cloudDeckId) return;
    try {
      const rows = (await listJobs({ data: { deckId: cloudDeckId } })) as JobRow[];
      setJobs(rows);
      // Refresh detail for any expanded rows so per-slide progress updates too.
      const expandedIds = Object.keys(expanded).filter((k) => expanded[k]);
      if (expandedIds.length > 0) {
        const results = await Promise.all(
          expandedIds.map((id) => jobDetail({ data: { jobId: id } }).catch(() => null)),
        );
        setDetails((prev) => {
          const next = { ...prev };
          expandedIds.forEach((id, i) => {
            if (results[i]) next[id] = results[i] as never;
          });
          return next;
        });
      }
    } catch {
      /* ignore transient */
    }
  }, [cloudDeckId, listJobs, jobDetail, expanded]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  // Poll while there is an active job or the history tab is open.
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "translating" || j.status === "draft");
    if (!hasActive && tab !== "history") return;
    pollRef.current = window.setInterval(() => {
      void refreshJobs();
    }, 2500) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [jobs, tab, refreshJobs]);

  async function toggleExpand(jobId: string) {
    const next = !expanded[jobId];
    setExpanded((p) => ({ ...p, [jobId]: next }));
    if (next && !details[jobId]) {
      try {
        const d = await jobDetail({ data: { jobId } });
        setDetails((p) => ({ ...p, [jobId]: d as never }));
      } catch {
        /* ignore */
      }
    }
  }

  async function onCancel(jobId: string) {
    setBusyJobId(jobId);
    try {
      await cancelJob({ data: { jobId } });
      await refreshJobs();
    } finally {
      setBusyJobId(null);
    }
  }
  async function onRetry(jobId: string) {
    setBusyJobId(jobId);
    try {
      await retryJob({ data: { jobId } });
      await refreshJobs();
    } finally {
      setBusyJobId(null);
    }
  }

  useEffect(() => {
    let alive = true;
    Promise.all([
      listLangs().catch(() => []),
      listEngines().catch(() => []),
      listGloss({ data: {} }).catch(() => []),
    ]).then(([langs, engs, gloss]) => {
      if (!alive) return;
      setLanguages(langs as never);
      setEngines(engs as never);
      setGlossaryCount((gloss as unknown[]).length);
      // Prefer GlobalLink when configured; otherwise fall back to AI.
      const configured = (engs as Array<{ id: string; configured: boolean }>).filter(
        (e) => e.configured,
      );
      if (configured.length > 0) setEngine(configured[0].id as "globallink" | "ai");
    });
    return () => {
      alive = false;
    };
  }, [listLangs, listEngines, listGloss]);

  const filteredLangs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        l.label.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q),
    );
  }, [languages, search]);

  const engineConfigured = engines.find((e) => e.id === engine)?.configured ?? false;
  const canRun =
    engineConfigured &&
    status.kind !== "running" &&
    (mode === "batch" ? batchLangs.length > 0 : !!selectedLang);

  async function run() {
    setStatus({ kind: "running" });
    setBatchResults(null);
    try {
      if (mode === "in_place") {
        await inPlace({ data: { deckId, targetLang: selectedLang, engine, humanReview } });
        setStatus({ kind: "ok", msg: "Deck translated in place. Reload to see the update." });
      } else if (mode === "copy") {
        const res = await toCopy({
          data: { deckId, targetLang: selectedLang, engine, humanReview },
        });
        setStatus({ kind: "ok", msg: `Created translated copy: ${res.title}` });
        onTranslatedCopy?.(res.deckId);
      } else {
        const res = await batchFn({
          data: { deckId, targetLangs: batchLangs, engine, humanReview },
        });
        setBatchResults(res as never);
        const okCount = Object.values(res as Record<string, { ok: boolean }>).filter(
          (r) => r.ok,
        ).length;
        setStatus({ kind: "ok", msg: `Completed ${okCount}/${batchLangs.length} languages.` });
      }
    } catch (e) {
      setStatus({ kind: "err", msg: (e as Error).message });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-[440px] max-w-full overflow-y-auto bg-white text-black shadow-2xl dark:bg-[#0B0B18] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-black/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#0B0B18]/95">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <Languages size={16} className="text-[#003FC7] dark:text-[#A1FBF9]" />
              <h2 className="text-lg font-semibold tracking-tight">Translate deck</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-1 px-5 pb-2 text-xs">
            {(
              [
                { id: "new", label: "New job", icon: <Languages size={12} /> },
                {
                  id: "history",
                  label: `History${jobs.length ? ` (${jobs.length})` : ""}`,
                  icon: <History size={12} />,
                },
              ] as Array<{ id: Tab; label: string; icon: React.ReactNode }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                  tab === t.id
                    ? "bg-[#003FC7] text-white dark:bg-[#A1FBF9] dark:text-[#03002C]"
                    : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "new" && (
          <div className="space-y-6 px-5 py-5">
            {/* Engine */}
            <section>
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                Engine
              </div>
              <div className="space-y-2">
                {engines.map((e) => (
                  <label
                    key={e.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                      engine === e.id
                        ? "border-[#003FC7] bg-[#003FC7]/5 dark:border-[#A1FBF9] dark:bg-[#A1FBF9]/10"
                        : "border-black/10 dark:border-white/15"
                    } ${!e.configured ? "opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name="engine"
                      className="mt-1"
                      checked={engine === e.id}
                      disabled={!e.configured}
                      onChange={() => setEngine(e.id)}
                    />
                    <div className="min-w-0">
                      <div className="font-medium">
                        {e.label}
                        {!e.configured && (
                          <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                            not configured
                          </span>
                        )}
                      </div>
                      {e.note && (
                        <div className="text-xs text-black/60 dark:text-white/60">{e.note}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Mode */}
            <section>
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                Mode
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(
                  [
                    { id: "in_place", label: "In place", hint: "Overwrite current deck" },
                    { id: "copy", label: "New copy", hint: "Keep original" },
                    { id: "batch", label: "Batch", hint: "Multiple languages" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id as Mode)}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      mode === m.id
                        ? "border-[#003FC7] bg-[#003FC7]/5 dark:border-[#A1FBF9] dark:bg-[#A1FBF9]/10"
                        : "border-black/10 hover:border-black/30 dark:border-white/15 dark:hover:border-white/30"
                    }`}
                  >
                    <div className="font-medium">{m.label}</div>
                    <div className="text-[11px] text-black/50 dark:text-white/50">{m.hint}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Language picker */}
            <section>
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                  {mode === "batch" ? `Target languages (${batchLangs.length})` : "Target language"}
                </div>
                <div className="text-[11px] text-black/50 dark:text-white/50">
                  {filteredLangs.length} available
                </div>
              </div>
              <input
                type="text"
                placeholder="Search languages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/5"
              />
              <div className="max-h-64 overflow-y-auto rounded-lg border border-black/10 dark:border-white/10">
                {filteredLangs.map((l) => {
                  const isPicked =
                    mode === "batch" ? batchLangs.includes(l.id) : selectedLang === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        if (mode === "batch") {
                          setBatchLangs((prev) =>
                            prev.includes(l.id) ? prev.filter((x) => x !== l.id) : [...prev, l.id],
                          );
                        } else {
                          setSelectedLang(l.id);
                        }
                      }}
                      className={`flex w-full items-center justify-between border-b border-black/5 px-3 py-2 text-left text-sm last:border-0 dark:border-white/5 ${
                        isPicked
                          ? "bg-[#003FC7]/10 dark:bg-[#A1FBF9]/10"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isPicked && (
                          <Check size={12} className="text-[#003FC7] dark:text-[#A1FBF9]" />
                        )}
                        <span className="font-medium">{l.label}</span>
                        <span className="text-black/50 dark:text-white/50">{l.native}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {l.rtl && (
                          <span className="rounded bg-black/5 px-1.5 text-[10px] dark:bg-white/10">
                            RTL
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-black/40 dark:text-white/40">
                          {l.id}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Options */}
            <section className="space-y-2 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <label
                className={`flex cursor-pointer items-center gap-2 text-sm ${engine !== "globallink" ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={humanReview}
                  disabled={engine !== "globallink"}
                  onChange={(e) => setHumanReview(e.target.checked)}
                />
                Submit for human review (GlobalLink)
              </label>
              <div className="text-xs text-black/60 dark:text-white/60">
                🛡 {glossaryCount} protected term{glossaryCount === 1 ? "" : "s"} loaded (brand +
                division + product names)
              </div>
            </section>

            {/* Status */}
            {status.kind !== "idle" && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  status.kind === "running"
                    ? "border-[#003FC7]/40 bg-[#003FC7]/5 text-[#003FC7]"
                    : status.kind === "ok"
                      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                      : "border-red-500/40 bg-red-500/5 text-red-800 dark:text-red-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {status.kind === "running" && <Loader2 size={14} className="animate-spin" />}
                  {status.kind === "err" && <AlertTriangle size={14} />}
                  {status.kind === "ok" && <Check size={14} />}
                  <span>{status.msg ?? (status.kind === "running" ? "Translating…" : "")}</span>
                </div>
              </div>
            )}

            {batchResults && (
              <div className="rounded-lg border border-black/10 dark:border-white/10">
                {Object.entries(batchResults).map(([lang, r]) => (
                  <div
                    key={lang}
                    className="flex items-center justify-between border-b border-black/5 px-3 py-2 text-xs last:border-0 dark:border-white/5"
                  >
                    <span className="font-mono">{lang}</span>
                    {r.ok ? (
                      <span className="text-emerald-600 dark:text-emerald-300">✓ {r.title}</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-300">✕ {r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="rounded-full border border-black/15 px-4 py-2 text-sm hover:border-black/30 dark:border-white/15 dark:hover:border-white/30"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={!canRun}
                className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#003FC7]/90 disabled:opacity-50"
              >
                {status.kind === "running" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Languages size={14} />
                )}
                {mode === "batch"
                  ? `Translate to ${batchLangs.length} language${batchLangs.length === 1 ? "" : "s"}`
                  : "Translate"}
              </button>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3 px-5 py-5">
            {jobs.length === 0 && (
              <div className="rounded-lg border border-dashed border-black/15 px-4 py-8 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
                No translation jobs yet. Start one from the "New job" tab.
              </div>
            )}
            {jobs.map((j) => {
              const total = j.progress_total ?? 0;
              const current = j.progress_current ?? 0;
              const pct = total > 0 ? Math.round((current / total) * 100) : 0;
              const active = j.status === "translating" || j.status === "draft";
              const canRetry = j.status === "failed" || j.status === "cancelled";
              const detail = details[j.id];
              const isOpen = !!expanded[j.id];
              const statusColor =
                j.status === "ready"
                  ? "text-emerald-600 dark:text-emerald-300"
                  : j.status === "failed"
                    ? "text-red-600 dark:text-red-300"
                    : j.status === "cancelled"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-[#003FC7] dark:text-[#A1FBF9]";
              return (
                <div key={j.id} className="rounded-lg border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleExpand(j.id)}
                      className="rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                      aria-label={isOpen ? "Collapse" : "Expand"}
                    >
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-[11px] uppercase tracking-wide">
                          {j.target_lang}
                        </span>
                        <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide dark:bg-white/10">
                          {j.mode === "in_place" ? "in place" : j.mode}
                        </span>
                        <span
                          className={`text-[11px] font-medium uppercase tracking-wide ${statusColor}`}
                        >
                          {j.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                          <div
                            className={`h-full transition-all ${
                              j.status === "failed"
                                ? "bg-red-500"
                                : j.status === "cancelled"
                                  ? "bg-amber-500"
                                  : j.status === "ready"
                                    ? "bg-emerald-500"
                                    : "bg-[#003FC7] dark:bg-[#A1FBF9]"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] tabular-nums text-black/60 dark:text-white/60">
                          {current}/{total}
                        </span>
                      </div>
                      {j.error && (
                        <div className="mt-1 text-[11px] text-red-600 dark:text-red-300">
                          {j.error}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {active && (
                        <button
                          type="button"
                          onClick={() => onCancel(j.id)}
                          disabled={busyJobId === j.id}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-300"
                          title="Cancel job"
                        >
                          <Square size={12} /> Cancel
                        </button>
                      )}
                      {canRetry && (
                        <button
                          type="button"
                          onClick={() => onRetry(j.id)}
                          disabled={busyJobId === j.id}
                          className="inline-flex items-center gap-1 rounded-full border border-[#003FC7]/40 px-2.5 py-1 text-[11px] font-medium text-[#003FC7] hover:bg-[#003FC7]/10 disabled:opacity-50 dark:border-[#A1FBF9]/40 dark:text-[#A1FBF9] dark:hover:bg-[#A1FBF9]/10"
                          title="Retry failed slides"
                        >
                          {busyJobId === j.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RotateCcw size={12} />
                          )}{" "}
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-black/5 bg-black/[0.02] px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                      {!detail && (
                        <div className="text-[11px] text-black/50 dark:text-white/50">
                          Loading slide progress…
                        </div>
                      )}
                      {detail && detail.slides.length === 0 && (
                        <div className="text-[11px] text-black/50 dark:text-white/50">
                          No slides on source deck.
                        </div>
                      )}
                      {detail && detail.slides.length > 0 && (
                        <div className="grid grid-cols-8 gap-1">
                          {detail.slides.map((s) => {
                            const color =
                              s.status === "ready"
                                ? "bg-emerald-500"
                                : s.status === "failed"
                                  ? "bg-red-500"
                                  : "bg-black/15 dark:bg-white/15";
                            return (
                              <div
                                key={s.slideId}
                                title={`Slide ${s.position + 1} — ${s.status}${s.error ? `: ${s.error}` : ""}`}
                                className={`h-6 rounded ${color} flex items-center justify-center text-[10px] font-mono text-white/90`}
                              >
                                {s.position + 1}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => void refreshJobs()}
                className="text-[11px] text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TranslateButton({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Translate this deck"
        aria-label="Translate this deck"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-icon transition hover:border-black/25 hover:bg-black/[0.04] hover:text-foreground dark:border-white/10 dark:bg-white/[0.04]"
      >
        <Languages size={14} />
      </button>
      {open && (
        <TranslateDrawer
          deckId={deckId}
          onClose={() => setOpen(false)}
          onTranslatedCopy={(newId) => {
            // Navigate to the new deck after copy mode finishes.
            if (typeof window !== "undefined") window.location.href = `/decks/${newId}`;
          }}
        />
      )}
    </>
  );
}
