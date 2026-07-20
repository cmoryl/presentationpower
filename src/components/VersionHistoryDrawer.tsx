import { useEffect, useRef, useState, useMemo } from "react";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { useServerFn } from "@tanstack/react-start";
import { History, X, RotateCcw, Eye, Loader2, Clock, User, Sparkles } from "lucide-react";
import {
  listDeckVersions,
  getDeckVersion,
  restoreDeckVersion,
  snapshotDeckVersion,
} from "@/lib/deck-versions.functions";
import { loadCloudDeck } from "@/lib/cloud-decks.functions";
import { useDeckStore, type Brief, type Deck, type DeckSlide } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS, byId } from "@/lib/taxonomy";
import { useSignedIn } from "@/components/CloudDeckControls";

type VersionRow = {
  id: string;
  version_number: number;
  change_summary: string | null;
  created_at: string;
  created_by: string | null;
};

type SnapshotSlideRow = {
  position: number;
  section_id: string;
  variant_id: string;
  layout_id: string;
  content: Record<string, unknown> | null;
  notes: string | null;
};

type VersionRecord = {
  id: string;
  version_number: number;
  change_summary: string | null;
  created_at: string;
  snapshot: {
    deck: { title: string; brand_mode_id: string; sub_company?: string | null } | null;
    slides: SnapshotSlideRow[];
    brief: { prospect: string | null } | null;
  };
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function VersionHistoryButton({ deckId }: { deckId: string }) {
  const signedIn = useSignedIn();
  const [open, setOpen] = useState(false);
  if (!signedIn) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-2 text-xs font-medium text-black hover:border-black/30"
        title="Version history"
      >
        <History className="h-3.5 w-3.5" />
        History
      </button>
      {open && <VersionHistoryDrawer deckId={deckId} onClose={() => setOpen(false)} />}
    </>
  );
}

function VersionHistoryDrawer({ deckId, onClose }: { deckId: string; onClose: () => void }) {
  const list = useServerFn(listDeckVersions);
  const fetchVersion = useServerFn(getDeckVersion);
  const restore = useServerFn(restoreDeckVersion);
  const snapshot = useServerFn(snapshotDeckVersion);
  const load = useServerFn(loadCloudDeck);
  const hydrate = useDeckStore((s) => s.hydrate);
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));

  const [rows, setRows] = useState<VersionRow[] | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, onClose, containerRef: dialogRef });
  const [selected, setSelected] = useState<VersionRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    try {
      const r = (await list({ data: { deckId } })) as VersionRow[];
      setRows(r);
    } catch (e) {
      setRows([]);
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const v = (await fetchVersion({ data: { versionId: selectedId } })) as unknown as VersionRecord;
        if (alive) setSelected(v);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId, fetchVersion]);

  async function onCreateCheckpoint() {
    setCreating(true);
    setError(null);
    try {
      await snapshot({ data: { deckId, changeSummary: "Manual checkpoint" } });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function onRestore(versionId: string, versionNumber: number) {
    if (!confirm(`Restore this deck to v${versionNumber}? Your current state will be saved as a checkpoint first.`)) return;
    setBusy(versionId);
    setError(null);
    try {
      const res = (await restore({ data: { versionId } })) as { deckUuid: string };
      // Re-load the deck into local store so the editor reflects the restored slides.
      const loaded = (await load({ data: { deckId: res.deckUuid } })) as {
        deck: {
          id: string;
          title: string;
          brand_mode_id: string | null;
          archetype_id: string | null;
          created_at: string | null;
          context?: Record<string, unknown> | null;
        };
        brief: null | {
          id: string;
          prospect: string | null;
          industry: string | null;
          meeting_objective: string | null;
          audience: string | null;
          brand_mode_id: string | null;
          sub_company: string | null;
          length_target: number | null;
          known_facts: string | null;
          inputs: unknown;
          created_at: string | null;
        };
        slides: Array<{
          id: string;
          position: number;
          section_id: string;
          variant_id: string;
          layout_id: string;
          content: Record<string, unknown> | null;
          notes: string | null;
        }>;
      };

      if (deck && brief) {
        const storedInputs =
          loaded.brief?.inputs && typeof loaded.brief.inputs === "object"
            ? (loaded.brief.inputs as Partial<Brief>)
            : null;
        const rebuiltBrief: Brief = {
          ...brief,
          ...(storedInputs ?? {}),
          id: brief.id,
        };
        const rebuiltSlides: DeckSlide[] = loaded.slides.map((s, i) => {
          const c = (s.content ?? {}) as Record<string, unknown> & {
            __localId?: string;
            __changes?: unknown[];
          };
          const { __localId, __changes, ...content } = c;
          return {
            id: typeof __localId === "string" ? __localId : s.id,
            position: s.position ?? i,
            sectionId: s.section_id,
            variantId: s.variant_id,
            layoutId: s.layout_id,
            content,
            changes: Array.isArray(__changes) ? (__changes as DeckSlide["changes"]) : [],
            notes: typeof s.notes === "string" ? s.notes : undefined,
          };
        });
        const rebuiltDeck: Deck = {
          ...deck,
          title: loaded.deck.title,
          brandModeId: loaded.deck.brand_mode_id ?? deck.brandModeId,
          slides: rebuiltSlides,
          context: (loaded.deck.context ?? deck.context) as Deck["context"],
        };
        hydrate({ brief: rebuiltBrief, deck: rebuiltDeck });
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const previewBrand = useMemo(() => {
    const snap = selected?.snapshot.deck;
    return resolveBrandMode(snap?.brand_mode_id ?? "", snap?.sub_company);
  }, [selected]);
  const previewClient = selected?.snapshot.brief?.prospect ?? brief?.prospect;

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 flex outline-none" role="dialog" aria-modal="true" aria-labelledby="version-history-title" tabIndex={-1}>
      <button
        type="button"
        aria-label="Close history"
        onClick={onClose}
        className="flex-1 bg-[#050B18]/60 backdrop-blur-sm"
      />
      <aside className="relative flex h-full w-full max-w-[900px] flex-col overflow-hidden border-l border-white/10 bg-[#050B18] text-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#0B2A4A]/80 to-transparent px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#A1FBF9] to-[#003FC7]">
              <History className="h-4 w-4 text-[#050B18]" />
            </div>
            <div>
              <div id="version-history-title" className="text-[10px] uppercase tracking-[0.24em] text-white/50">Version history</div>
              <div className="text-base font-medium">{deck?.title ?? "Deck"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateCheckpoint}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white hover:border-[#A1FBF9]/40 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-[#A1FBF9]" />}
              Save checkpoint
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-400/30 bg-red-500/10 px-6 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="grid flex-1 grid-cols-[340px_1fr] overflow-hidden">
          {/* List */}
          <div className="overflow-y-auto border-r border-white/10 bg-white/[0.02]">
            {rows === null ? (
              <div className="flex items-center justify-center p-10 text-sm text-white/50">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading history…
              </div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-sm text-white/60">
                No versions yet. Save this deck to the cloud, then use <b>Save checkpoint</b> to start tracking changes.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {rows.map((r) => {
                  const isSel = selectedId === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={`block w-full px-5 py-4 text-left transition ${
                          isSel ? "bg-gradient-to-r from-[#003FC7]/25 to-transparent" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A1FBF9]">
                            v{r.version_number}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-white/45">
                            <Clock className="h-3 w-3" />
                            {timeAgo(r.created_at)}
                          </span>
                        </div>
                        <div className="mt-1.5 line-clamp-2 text-sm text-white/85">
                          {r.change_summary || "Snapshot"}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-white/40">
                          <User className="h-3 w-3" />
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Preview */}
          <div className="flex min-w-0 flex-col overflow-hidden">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-white/50">
                <div>
                  <Eye className="mx-auto mb-2 h-5 w-5 text-white/40" />
                  Select a version to preview it read-only before restoring.
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                      v{selected.version_number} · {new Date(selected.created_at).toLocaleString()}
                    </div>
                    <div className="truncate text-sm text-white/85">
                      {selected.change_summary || "Snapshot"} · {selected.snapshot.slides.length} slides
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(selected.id, selected.version_number)}
                    disabled={busy === selected.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#A1FBF9] px-4 py-2 text-xs font-semibold text-[#050B18] hover:opacity-90 disabled:opacity-60"
                  >
                    {busy === selected.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Restore this version
                  </button>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5">
                  {selected.snapshot.slides.map((s, i) => {
                    const variant = byId(MODULE_VARIANTS, s.variant_id);
                    const sf = byId(SECTION_FRAMEWORKS, s.section_id);
                    const localSlide: DeckSlide = {
                      id: `preview-${selected.id}-${i}`,
                      position: s.position,
                      sectionId: s.section_id,
                      variantId: s.variant_id,
                      layoutId: s.layout_id,
                      content: (s.content ?? {}) as DeckSlide["content"],
                      changes: [],
                      notes: s.notes ?? undefined,
                    };
                    return (
                      <div
                        key={i}
                        className="overflow-hidden rounded-xl border border-white/10 bg-white"
                      >
                        <div className="aspect-[16/9]">
                          <ScaledSlide>
                            {variant && (
                              <VariantRenderer
                                slide={localSlide}
                                variant={variant}
                                brand={previewBrand}
                                pageNumber={i + 1}
                                clientName={previewClient ?? undefined}
                              />
                            )}
                          </ScaledSlide>
                        </div>
                        <div className="border-t border-black/10 bg-white px-3 py-1.5 text-[10px] text-black/60">
                          {String(i + 1).padStart(2, "0")} · {sf?.name ?? s.section_id}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
