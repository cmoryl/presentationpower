// Visual conversion review for imported decks.
//
// Scans the staged slides for graphical intent — charts and tables whose data we
// captured, charts whose data the original file withheld, pictures of dashboards
// and infographics, and figures still trapped in bullet copy — then asks the AI
// visual reader to author each one onto a real module. Every proposal is shown
// with its source, rationale and any data gaps before a human accepts it, and
// accepted proposals are what the built deck uses.

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { readImportedDeckVisuals } from "@/lib/imported-visuals.functions";
import { classifyVisualSignal, summarizeVisualSignals } from "@/lib/imported-graphics";
import type { VisualSignal } from "@/lib/imported-graphics";
import type { StoredImportedDeck, StoredImportedSlide } from "@/lib/imported-to-deck";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";

export type VisualOverrideMap = Record<
  number,
  { variantId: string; content: Record<string, unknown> }
>;

type Proposal = {
  index: number;
  moduleId: string;
  moduleName: string;
  content: Record<string, unknown>;
  rationale: string;
  confidence: number;
  source: string;
  placeholders: string[];
  warnings: string[];
};

const SIGNAL_LABEL: Record<string, string> = {
  structured: "Chart data captured",
  stripped: "Chart without data",
  "image-graphic": "Picture of a visual",
  "stat-copy": "Figures in copy",
};

const SIGNAL_TONE: Record<string, string> = {
  structured: "border-emerald-200 bg-emerald-50 text-emerald-700",
  stripped: "border-amber-200 bg-amber-50 text-amber-800",
  "image-graphic": "border-[#003FC7]/25 bg-[#003FC7]/5 text-[#003FC7]",
  "stat-copy": "border-black/15 bg-black/[0.03] text-black/60",
};

const SOURCE_LABEL: Record<string, string> = {
  "read-from-image": "Read from the picture",
  "from-copy": "From the slide copy",
  placeholder: "Needs your numbers",
};

function previewSlide(p: Proposal): DeckSlide {
  return {
    id: `visual-${p.index}`,
    position: p.index,
    sectionId: "sec-proof",
    variantId: p.moduleId,
    layoutId: "layout-full",
    content: p.content as DeckSlide["content"],
    changes: [],
  };
}

export function VisualConversionPanel({
  deck,
  brandModeId,
  accepted,
  onAcceptedChange,
}: {
  deck: StoredImportedDeck & { slides: StoredImportedSlide[]; original_filename: string };
  brandModeId: string;
  accepted: VisualOverrideMap;
  onAcceptedChange: (next: VisualOverrideMap) => void;
}) {
  const [open, setOpen] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const readFn = useServerFn(readImportedDeckVisuals);
  const brand = useMemo(() => byId(BRAND_MODES, brandModeId) ?? BRAND_MODES[0], [brandModeId]);

  const signals = useMemo(() => {
    const out = new Map<number, VisualSignal>();
    for (const s of deck.slides) {
      out.set(
        s.index,
        classifyVisualSignal({
          index: s.index,
          title: s.title ?? "",
          bullets: s.bullets ?? [],
          notes: s.notes ?? "",
          imageCount: (s.imageUrls ?? []).length,
          assets: s.assets ?? null,
        }),
      );
    }
    return out;
  }, [deck.slides]);

  const summary = useMemo(
    () =>
      summarizeVisualSignals(
        deck.slides.map((s) => ({
          index: s.index,
          title: s.title ?? "",
          bullets: s.bullets ?? [],
          notes: s.notes ?? "",
          imageCount: (s.imageUrls ?? []).length,
          assets: s.assets ?? null,
        })),
      ),
    [deck.slides],
  );

  // Slides worth an AI pass: everything visual except the ones whose numbers we
  // already hold, which convert deterministically with no model call.
  const candidates = useMemo(
    () =>
      deck.slides.filter((s) => {
        const sig = signals.get(s.index);
        return Boolean(sig?.needsAi);
      }),
    [deck.slides, signals],
  );

  const run = useMutation({
    mutationFn: async () => {
      const batches: StoredImportedSlide[][] = [];
      for (let i = 0; i < candidates.length; i += 6) batches.push(candidates.slice(i, i + 6));
      const all: Proposal[] = [];
      for (const batch of batches) {
        const res = await readFn({
          data: {
            deckTitle: deck.original_filename,
            divisionId: brandModeId,
            slides: batch.map((s) => {
              const sig = signals.get(s.index);
              return {
                index: s.index,
                title: s.title ?? "",
                bullets: (s.bullets ?? []).filter(Boolean).slice(0, 30),
                notes: (s.notes ?? "").slice(0, 2000),
                figures: sig?.figures ?? [],
                signal: sig?.kind ?? "stat-copy",
                imageUrls: (s.imageUrls ?? []).filter(Boolean).slice(0, 2),
              };
            }),
          },
        });
        if (res.error) throw new Error(res.error);
        all.push(...(res.proposals as Proposal[]));
      }
      return all;
    },
    onSuccess: (list) => {
      setProposals(list);
      setOpen(true);
      toast.success(`${list.length} visual${list.length === 1 ? "" : "s"} proposed`);
    },
    onError: (e) => toast.error((e as Error).message || "Visual reading failed"),
  });

  function accept(p: Proposal) {
    onAcceptedChange({ ...accepted, [p.index]: { variantId: p.moduleId, content: p.content } });
  }
  function reject(p: Proposal) {
    const next = { ...accepted };
    delete next[p.index];
    onAcceptedChange(next);
  }

  const acceptedCount = Object.keys(accepted).length;

  return (
    <div className="mb-5 rounded-xl border border-[#003FC7]/20 bg-[#003FC7]/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
            <BarChart3 size={15} className="text-[#003FC7]" /> Visual data conversion
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-black/55">
            {summary.structured} slide{summary.structured === 1 ? "" : "s"} carry chart or table
            numbers we already captured — those convert to native modules automatically.{" "}
            {candidates.length} more hold visual information only as a picture or as figures inside
            the copy; the AI reads those and designs a matching module in our look.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {acceptedCount > 0 && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">
              {acceptedCount} accepted
            </span>
          )}
          <button
            type="button"
            onClick={() => (proposals.length ? setOpen((v) => !v) : run.mutate())}
            disabled={run.isPending || candidates.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7] bg-[#003FC7] px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-60"
          >
            {run.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {run.isPending
              ? "Reading visuals…"
              : proposals.length
                ? open
                  ? "Hide proposals"
                  : `Review ${proposals.length} proposals`
                : `Read visuals with AI (${candidates.length})`}
          </button>
          {proposals.length > 0 && (
            <button
              type="button"
              onClick={() => run.mutate()}
              disabled={run.isPending}
              className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/60 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-60"
            >
              Re-read
            </button>
          )}
        </div>
      </div>

      {/* Signal map — what each staged slide is holding. */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {deck.slides.map((s) => {
          const sig = signals.get(s.index);
          if (!sig || sig.kind === "none") return null;
          return (
            <span
              key={s.index}
              title={sig.reason}
              className={`rounded-full border px-2 py-0.5 text-[10px] ${SIGNAL_TONE[sig.kind] ?? SIGNAL_TONE["stat-copy"]}`}
            >
              #{s.index + 1} · {SIGNAL_LABEL[sig.kind] ?? sig.kind}
            </span>
          );
        })}
      </div>

      {open && proposals.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {proposals.map((p) => {
            const isAccepted = Boolean(accepted[p.index]);
            const variant = byId(MODULE_VARIANTS, p.moduleId);
            if (!variant) return null;
            return (
              <div
                key={`${p.index}-${p.moduleId}`}
                className={`rounded-xl border bg-white p-3 ${isAccepted ? "border-emerald-300" : "border-black/10"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#03002C]">
                      Slide {p.index + 1} · {p.moduleName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-black/45">
                      {SOURCE_LABEL[p.source] ?? p.source} · {Math.round(p.confidence * 100)}%
                      confidence
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => accept(p)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                        isAccepted
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-black/15 bg-white text-black/60 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      <Check size={11} /> {isAccepted ? "Accepted" : "Accept"}
                    </button>
                    {isAccepted && (
                      <button
                        type="button"
                        onClick={() => reject(p)}
                        className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2 py-1 text-[11px] text-black/50 hover:border-red-300 hover:text-red-600"
                      >
                        <X size={11} /> Undo
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 overflow-hidden rounded-lg border border-black/10 bg-[#F7F8FB]">
                  <ScaledSlide>
                    <VariantRenderer
                      slide={previewSlide(p)}
                      variant={variant}
                      brand={brand}
                      mode="light"
                    />
                  </ScaledSlide>
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-black/55">{p.rationale}</p>
                {p.placeholders.length > 0 && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                    Supply before sending: {p.placeholders.join(", ")}
                  </div>
                )}
                {p.warnings.length > 0 && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                    {p.warnings.join(" · ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
