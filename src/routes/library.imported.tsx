import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ExternalLink, Send, Image as ImageIcon, FileText, ChevronRight, X, Check, Wrench, Upload, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import { FaithfulSlideCanvas } from "@/components/slide/FaithfulSlideCanvas";
import { AssetInspectorPanel } from "@/components/AssetInspectorPanel";
import type { SlideLayout } from "@/lib/pptx-import";

import {
  listImportedDecksForDivision,
  getImportedDeckSlides,
  sendImportedSlideToLibrary,
  listLibrarySlideExamples,
  importedDeckSlugForDivision,
  listBrokenDeckImages,
  relinkDeckImage,
  reparseImportedDeck,
} from "@/lib/imported-decks.functions";
import { listDivisionImagery } from "@/lib/division-imagery.functions";


export const Route = createFileRoute("/library/imported")({
  head: () => ({
    meta: [
      { title: "Imported Slides · Library" },
      { name: "description", content: "Browse imported PPTX slides, assess layout and look, and promote them into the approved module library." },
      { property: "og:title", content: "Imported Slides · Library" },
      { property: "og:description", content: "Staging area for imported PPTX slides before they become approved module variants." },
    ],
  }),
  component: ImportedLibrary,
});

type Deck = {
  id: string;
  division_id: string;
  original_filename: string;
  file_size: number;
  slide_count: number;
  status: string;
  error: string | null;
  created_at: string;
};

function ImportedLibrary() {
  const [brandModeId, setBrandModeId] = useState<string>("bm-enterprise");
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<number | null>(null);

  const divisionSlug = useMemo(() => importedDeckSlugForDivision(brandModeId), [brandModeId]);

  const listFn = useServerFn(listImportedDecksForDivision);
  const getSlidesFn = useServerFn(getImportedDeckSlides);
  const listApprovedFn = useServerFn(listLibrarySlideExamples);

  const decksQ = useQuery({
    queryKey: ["imported-library-decks", divisionSlug],
    queryFn: () => listFn({ data: { divisionId: divisionSlug } }),
  });

  const decks = (decksQ.data ?? []) as Deck[];

  const slidesQ = useQuery({
    queryKey: ["imported-library-slides", activeDeckId],
    queryFn: () => getSlidesFn({ data: { id: activeDeckId! } }),
    enabled: !!activeDeckId,
  });

  const approvedQ = useQuery({
    queryKey: ["approved-library-examples", brandModeId],
    queryFn: () => listApprovedFn({ data: { divisionId: brandModeId } }),
  });

  const approvedKey = useMemo(() => {
    const set = new Set<string>();
    for (const row of approvedQ.data ?? []) {
      if (row.imported_deck_id) set.add(`${row.imported_deck_id}:${row.slide_index}`);
    }
    return set;
  }, [approvedQ.data]);

  return (
    <AppShell>
      <div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-black/50">
          <Link to="/library" className="hover:text-[#003FC7]">Library</Link>
          <ChevronRight size={12} className="opacity-40" />
          <span className="text-black">Imported</span>
        </div>
        <h1 className="mt-3 text-4xl font-semibold text-[#03002C]">Imported slide staging.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Every PPTX you upload lands here first. Inspect layout, hierarchy and imagery, then promote the strongest slides into the approved module library so the assembler can reuse them.
        </p>
      </div>

      {/* Brand mode scope */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-black/10 pb-6">
        <span className="mr-2 text-xs uppercase tracking-widest text-black/40">Scope</span>
        {BRAND_MODES.map((bm) => {
          const active = bm.id === brandModeId;
          return (
            <button
              key={bm.id}
              type="button"
              onClick={() => { setBrandModeId(bm.id); setActiveDeckId(null); }}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                active
                  ? "bg-[#03002C] text-white"
                  : "border border-black/15 bg-white text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
              }`}
            >
              {bm.name}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
        {/* Deck sidebar */}
        <aside className="space-y-2">
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="text-xs uppercase tracking-widest text-black/40">Imported decks</div>
            <div className="text-xs text-black/40">{decks.length}</div>
          </div>
          {decksQ.isLoading ? (
            <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/40">
              <Loader2 size={14} className="mr-2 inline animate-spin" />
              Loading…
            </div>
          ) : decks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 bg-white p-6 text-sm text-black/50">
              No decks imported for this scope yet. Upload a PPTX from{" "}
              <Link to="/admin/knowledge" className="text-[#003FC7] underline">Admin → Knowledge</Link>.
            </div>
          ) : (
            decks.map((d) => {
              const active = d.id === activeDeckId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveDeckId(d.id)}
                  className={`block w-full rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-[#003FC7] bg-[#003FC7]/5"
                      : "border-black/10 bg-white hover:border-black/25"
                  }`}
                >
                  <div className="truncate text-sm font-medium text-[#03002C]">{d.original_filename}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-black/50">
                    <span>{d.slide_count} slides</span>
                    <span>·</span>
                    <span>{(d.file_size / 1024 / 1024).toFixed(1)} MB</span>
                    {d.status !== "parsed" && (
                      <>
                        <span>·</span>
                        <span className={d.status === "error" ? "text-red-600" : "text-amber-600"}>
                          {d.status}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Slide grid */}
        <section>
          {!activeDeckId ? (
            <EmptyState />
          ) : slidesQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-black/50">
              <Loader2 size={14} className="animate-spin" /> Loading slides…
            </div>
          ) : slidesQ.data ? (
            <DeckSlides
              deck={slidesQ.data}
              brandModeId={brandModeId}
              approvedKey={approvedKey}
              onPreview={(idx) => setPreviewSlideIdx(idx)}
            />
          ) : null}
        </section>
      </div>

      {previewSlideIdx !== null && slidesQ.data && (
        <SlidePreview
          slide={slidesQ.data.slides.find((s) => s.index === previewSlideIdx)!}
          deckName={slidesQ.data.original_filename}
          deckTheme={themeToTokens(slidesQ.data.theme)}
          deckExtras={slidesQ.data.extras}
          onClose={() => setPreviewSlideIdx(null)}
        />
      )}

    </AppShell>
  );
}

function themeToTokens(theme?: {
  accent1?: string; accent2?: string; accent3?: string; accent4?: string; accent5?: string; accent6?: string;
  dark1?: string; dark2?: string; light1?: string; light2?: string;
}): Record<string, string> | undefined {
  if (!theme) return undefined;
  const t: Record<string, string> = {};
  if (theme.accent1) t.accent1 = theme.accent1;
  if (theme.accent2) t.accent2 = theme.accent2;
  if (theme.accent3) t.accent3 = theme.accent3;
  if (theme.accent4) t.accent4 = theme.accent4;
  if (theme.accent5) t.accent5 = theme.accent5;
  if (theme.accent6) t.accent6 = theme.accent6;
  if (theme.dark1) { t.dk1 = theme.dark1; t.tx1 = theme.dark1; }
  if (theme.dark2) { t.dk2 = theme.dark2; t.tx2 = theme.dark2; }
  if (theme.light1) { t.lt1 = theme.light1; t.bg1 = theme.light1; }
  if (theme.light2) { t.lt2 = theme.light2; t.bg2 = theme.light2; }
  return Object.keys(t).length ? t : undefined;
}

function EmptyState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white text-center">
      <FileText size={28} className="text-black/25" />
      <div className="mt-3 text-sm font-medium text-[#03002C]">Select an imported deck</div>
      <div className="mt-1 text-xs text-black/50">Its slides will appear here as inspectable cards.</div>
    </div>
  );
}

type ImportedSlide = {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
  imageCount: number;
  imagePaths?: string[];
  imageUrls?: string[];
  layout?: SlideLayout;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assets?: any;
};

type DeckSlidesData = {
  id: string;
  original_filename: string;
  slide_count: number;
  theme: {
    accent1?: string; accent2?: string; accent3?: string; accent4?: string; accent5?: string; accent6?: string;
    dark1?: string; dark2?: string; light1?: string; light2?: string;
    headingFont?: string; bodyFont?: string;
  };
  slides: ImportedSlide[];
  status: string;
  error: string | null;
  downloadUrl: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extras?: any;
};


function DeckSlides({
  deck,
  brandModeId,
  approvedKey,
  onPreview,
}: {
  deck: DeckSlidesData;
  brandModeId: string;
  approvedKey: Set<string>;
  onPreview: (idx: number) => void;
}) {
  const [relinkOpen, setRelinkOpen] = useState(false);
  const qc = useQueryClient();
  const reparseFn = useServerFn(reparseImportedDeck);
  const reparse = useMutation({
    mutationFn: () => reparseFn({ data: { id: deck.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["imported-library-slides", deck.id] });
    },
  });
  const missingLayouts = deck.slides.filter((s) => !s.layout).length;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-black/40">Deck</div>
          <div className="mt-1 text-xl font-semibold text-[#03002C]">{deck.original_filename}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-black/50">
            <span>{deck.slide_count} slides</span>
            {deck.theme?.accent1 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: deck.theme.accent1 }} />
                accent
              </span>
            )}
            {deck.theme?.headingFont && <span>{deck.theme.headingFont}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => reparse.mutate()}
            disabled={reparse.isPending}
            title={missingLayouts > 0 ? `${missingLayouts} slides missing layout — re-extract from original .pptx` : "Re-extract layouts, shapes and charts from the original .pptx"}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs disabled:opacity-60 ${
              missingLayouts > 0
                ? "border-[#003FC7] bg-[#003FC7] text-white hover:opacity-90"
                : "border-black/15 bg-white text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
            }`}
          >
            {reparse.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {reparse.isPending
              ? "Re-extracting…"
              : missingLayouts > 0
                ? `Re-extract layouts (${missingLayouts})`
                : "Re-extract layouts"}
          </button>
          <button
            type="button"
            onClick={() => setRelinkOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            <Wrench size={12} /> Fix images
          </button>
          {deck.downloadUrl && (
            <a
              href={deck.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
            >
              <ExternalLink size={12} /> Original .pptx
            </a>
          )}
        </div>
      </div>
      {reparse.data && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Re-extracted {reparse.data.slidesWithLayout}/{reparse.data.slideCount} slide layouts
          {reparse.data.slidesWithShapes ? ` · ${reparse.data.slidesWithShapes} with shapes` : ""}
          {reparse.data.graphicsSummary
            ? ` · ${reparse.data.graphicsSummary.charts} charts, ${reparse.data.graphicsSummary.tables} tables, ${reparse.data.graphicsSummary.diagrams} diagrams, ${reparse.data.graphicsSummary.media ?? 0} media, ${reparse.data.graphicsSummary.hyperlinks ?? 0} links, ${reparse.data.graphicsSummary.comments ?? 0} comments${reparse.data.graphicsSummary.hiddenSlides ? `, ${reparse.data.graphicsSummary.hiddenSlides} hidden` : ""}`
            : ""}
        </div>
      )}
      {reparse.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {(reparse.error as Error).message}
        </div>
      )}
      {relinkOpen && (
        <RelinkDrawer
          deckId={deck.id}
          brandModeId={brandModeId}
          onClose={() => setRelinkOpen(false)}
        />
      )}


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {deck.slides.map((s) => (
          <SlideCard
            key={s.index}
            slide={s}
            deckId={deck.id}
            deckTheme={themeToTokens(deck.theme)}
            deckFonts={deck.extras?.embeddedFonts}
            brandModeId={brandModeId}
            approved={approvedKey.has(`${deck.id}:${s.index}`)}
            onPreview={() => onPreview(s.index)}
          />
        ))}
      </div>
    </div>
  );
}

function SlideCard({
  slide,
  deckId,
  deckTheme,
  deckFonts,
  brandModeId,
  approved,
  onPreview,
}: {
  slide: ImportedSlide;
  deckId: string;
  deckTheme?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deckFonts?: any;
  brandModeId: string;
  approved: boolean;
  onPreview: () => void;
}) {
  const sendFn = useServerFn(sendImportedSlideToLibrary);
  const qc = useQueryClient();

  const send = useMutation({
    mutationFn: () => sendFn({ data: { importedDeckId: deckId, slideIndex: slide.index, brandModeId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approved-library-examples", brandModeId] });
    },
  });

  return (
    <div className="group flex flex-col rounded-xl border border-black/10 bg-white p-3 transition hover:border-black/25 hover:shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-black/40">
          Slide {slide.index + 1}
        </div>
        {approved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
            <Check size={10} /> Approved
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="block overflow-hidden rounded-md border border-black/10 bg-white text-left"
        aria-label={`Preview slide ${slide.index + 1}`}
      >
        {slide.layout ? (
          <FaithfulSlideCanvas layout={slide.layout} theme={deckTheme} width={320} assets={slide.assets} fonts={deckFonts} />
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-black/[0.02] text-[10px] text-black/40">
            No layout captured
          </div>
        )}
      </button>

      <div className="mt-2 line-clamp-2 text-xs font-medium text-[#03002C] group-hover:text-[#003FC7]">
        {slide.title || <span className="italic text-black/40">Untitled</span>}
      </div>


      {slide.bullets.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-black/60">
          {slide.bullets.slice(0, 3).map((b, i) => (
            <li key={i} className="line-clamp-1">• {b}</li>
          ))}
          {slide.bullets.length > 3 && (
            <li className="text-black/40">+{slide.bullets.length - 3} more</li>
          )}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-black/5 pt-3 text-[11px] text-black/50">
        {slide.imageCount > 0 && (
          <span className="inline-flex items-center gap-1"><ImageIcon size={11} />{slide.imageCount}</span>
        )}
        {slide.notes && <span>• Notes</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPreview}
            className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] uppercase tracking-widest text-black/60 hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            Inspect
          </button>
          <button
            type="button"
            onClick={() => send.mutate()}
            disabled={send.isPending || approved}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest ${
              approved
                ? "bg-green-50 text-green-700"
                : "bg-[#03002C] text-white hover:opacity-90 disabled:opacity-60"
            }`}
          >
            {send.isPending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
            {approved ? "Approved" : send.isPending ? "Sending…" : "Approve"}
          </button>
        </div>
      </div>
      {send.error && (
        <div className="mt-2 text-[10px] text-red-600">{(send.error as Error).message}</div>
      )}
    </div>
  );
}

function SlidePreview({
  slide,
  deckName,
  deckTheme,
  deckExtras,
  onClose,
}: {
  slide: ImportedSlide;
  deckName: string;
  deckTheme?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deckExtras?: any;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-6 backdrop-blur-sm"
      onClick={onClose}
    >

      <div
        className="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-black/60 hover:bg-white hover:text-black"
        >
          <X size={16} />
        </button>
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-3">
          <div className="text-xs uppercase tracking-widest text-black/50">
            {deckName} · Slide {slide.index + 1}
          </div>
          <div className="text-xs text-black/50">Faithful preview · 1:1 layout</div>
        </div>
        <div className="bg-black/[0.03] p-6">
          {slide.layout ? (
            <div className="mx-auto" style={{ maxWidth: 1100 }}>
              <FaithfulSlideCanvas layout={slide.layout} theme={deckTheme} width={1100} assets={slide.assets} fonts={deckExtras?.embeddedFonts} className="rounded-lg shadow-lg ring-1 ring-black/10" />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-black/20 bg-white p-16 text-center text-sm text-black/50">
              No layout captured for this slide.
            </div>
          )}
          {(slide.title || slide.notes) && (
            <div className="mx-auto mt-6 grid max-w-4xl gap-4 sm:grid-cols-2">
              {slide.title && (
                <div className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-widest text-black/40">Title</div>
                  <div className="mt-1 text-sm text-[#03002C]">{slide.title}</div>
                </div>
              )}
              {slide.notes && (
                <div className="rounded-lg border border-black/10 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-widest text-black/40">Speaker notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-xs text-black/70">{slide.notes}</div>
                </div>
              )}
            </div>
          )}
          <AssetInspectorPanel slide={slide} extras={deckExtras} />
        </div>

      </div>
    </div>
  );
}

// ── RelinkDrawer ───────────────────────────────────────────────────────
// Missing/broken embedded image refs → replace with an uploaded file or
// an existing Division Imagery entry. Patches the deck's stored layout
// so FaithfulSlideCanvas immediately renders the new asset.

type BrokenRefRow = {
  slideIndex: number;
  target: "shape" | "fill" | "background";
  shapeIndex?: number;
  embedId?: string;
  frame?: { x: number; y: number; w: number; h: number };
  prst?: string;
};

function refKey(r: BrokenRefRow): string {
  return `${r.slideIndex}:${r.target}:${r.shapeIndex ?? "-"}`;
}

function RelinkDrawer({
  deckId,
  brandModeId,
  onClose,
}: {
  deckId: string;
  brandModeId: string;
  onClose: () => void;
}) {
  const listFn = useServerFn(listBrokenDeckImages);
  const imageryFn = useServerFn(listDivisionImagery);
  const qc = useQueryClient();

  const brokenQ = useQuery({
    queryKey: ["deck-broken-images", deckId],
    queryFn: () => listFn({ data: { id: deckId } }),
  });

  const imageryQ = useQuery({
    queryKey: ["division-imagery", brandModeId],
    queryFn: () => imageryFn({ data: { divisionId: brandModeId } }),
  });

  const broken = (brokenQ.data?.broken ?? []) as BrokenRefRow[];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-black/40">Fix images</div>
            <div className="text-sm font-medium text-[#03002C]">
              {brokenQ.data?.filename ?? "Deck"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-black/50 hover:bg-black/5 hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {brokenQ.isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-black/50">
              <Loader2 size={16} className="mr-2 animate-spin" /> Scanning slides…
            </div>
          ) : brokenQ.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {(brokenQ.error as Error).message}
            </div>
          ) : broken.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Check size={22} className="text-green-600" />
              <div className="mt-2 text-sm font-medium text-[#03002C]">All image refs resolved.</div>
              <div className="mt-1 text-xs text-black/50">No missing embeds to remap.</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {broken.length} image reference{broken.length === 1 ? "" : "s"} could not be extracted from the original .pptx. Attach a replacement below — the deck will re-render immediately.
              </div>
              {broken.map((r) => (
                <RelinkRow
                  key={refKey(r)}
                  deckId={deckId}
                  brandModeId={brandModeId}
                  broken={r}
                  imagery={imageryQ.data ?? []}
                  onDone={async () => {
                    await qc.invalidateQueries({ queryKey: ["deck-broken-images", deckId] });
                    await qc.invalidateQueries({ queryKey: ["imported-library-slides", deckId] });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RelinkRow({
  deckId,
  brandModeId,
  broken,
  imagery,
  onDone,
}: {
  deckId: string;
  brandModeId: string;
  broken: BrokenRefRow;
  imagery: Array<{ storage_path: string; filename: string; signedUrl: string | null }>;
  onDone: () => void | Promise<void>;
}) {
  const relinkFn = useServerFn(relinkDeckImage);
  const [mode, setMode] = useState<"upload" | "reuse">("upload");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  void brandModeId;

  async function handleFile(file: File) {
    setBusy(true); setErr(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const dataBase64 = btoa(bin);
      await relinkFn({
        data: {
          deckId,
          slideIndex: broken.slideIndex,
          target: broken.target,
          shapeIndex: broken.shapeIndex,
          dataBase64,
          contentType: file.type || "image/png",
          filename: file.name,
        },
      });
      setDone(true);
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReuse(path: string) {
    setBusy(true); setErr(null);
    try {
      await relinkFn({
        data: {
          deckId,
          slideIndex: broken.slideIndex,
          target: broken.target,
          shapeIndex: broken.shapeIndex,
          reusePath: path,
        },
      });
      setDone(true);
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Relink failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          <div className="font-medium text-[#03002C]">
            Slide {broken.slideIndex + 1} · {broken.target}
            {broken.shapeIndex !== undefined ? ` #${broken.shapeIndex}` : ""}
          </div>
          <div className="mt-0.5 text-[11px] text-black/50">
            {broken.embedId ? `Missing embed ${broken.embedId}` : "Missing image blob"}
            {broken.frame && ` · ${broken.frame.w.toFixed(2)}″ × ${broken.frame.h.toFixed(2)}″`}
            {broken.prst && ` · ${broken.prst}`}
          </div>
        </div>
        {done && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
            <Check size={10} /> Linked
          </span>
        )}
      </div>

      {!done && (
        <>
          <div className="mt-3 flex gap-1 text-[10px] uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`rounded-full px-2.5 py-1 ${mode === "upload" ? "bg-[#03002C] text-white" : "bg-black/5 text-black/60 hover:bg-black/10"}`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setMode("reuse")}
              className={`rounded-full px-2.5 py-1 ${mode === "reuse" ? "bg-[#03002C] text-white" : "bg-black/5 text-black/60 hover:bg-black/10"}`}
            >
              Pick from library
            </button>
          </div>

          {mode === "upload" ? (
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-black/20 bg-black/[0.02] px-3 py-4 text-xs text-black/60 hover:border-[#003FC7] hover:text-[#003FC7]">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {busy ? "Uploading…" : "Choose image (PNG, JPG, WebP, SVG)"}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-black/10 bg-black/[0.02] p-2">
              {imagery.length === 0 ? (
                <div className="p-4 text-center text-[11px] text-black/40">
                  No imagery in this division yet.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {imagery.map((it) => (
                    <button
                      key={it.storage_path}
                      type="button"
                      disabled={busy}
                      onClick={() => handleReuse(it.storage_path)}
                      className="group overflow-hidden rounded-md border border-black/10 bg-white hover:border-[#003FC7] disabled:opacity-50"
                      title={it.filename}
                    >
                      {it.signedUrl ? (
                        <img src={it.signedUrl} alt={it.filename} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center text-[9px] text-black/30">
                          <ImageIcon size={14} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {err && <div className="mt-2 text-[10px] text-red-600">{err}</div>}
        </>
      )}
    </div>
  );
}

