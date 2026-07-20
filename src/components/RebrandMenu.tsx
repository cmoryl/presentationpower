import { useMemo, useRef, useState } from "react";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { useServerFn } from "@tanstack/react-start";
import { Palette, Loader2, X } from "lucide-react";
import { useDeckStore } from "@/lib/deck-store";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
import { BRAND_GUIDES } from "@/lib/brand-guides";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { snapshotDeckVersion } from "@/lib/deck-versions.functions";

type BrandTarget = {
  key: string;
  brandModeId: string;
  subCompany?: string;
  label: string;
  sublabel: string;
  swatches: string[];
};

function buildTargets(): BrandTarget[] {
  const list: BrandTarget[] = [];
  for (const g of BRAND_GUIDES) {
    if (g.divisionId === "master") {
      list.push({
        key: g.slug,
        brandModeId: "bm-enterprise",
        label: g.title,
        sublabel: "Master brand",
        swatches: [
          g.primaryColors[0]?.hex ?? "#03002C",
          g.primaryColors[1]?.hex ?? "#003FC7",
          g.secondaryColors[0]?.hex ?? "#A1FBF9",
          g.tertiaryColors[0]?.hex ?? "#FFEB66",
        ],
      });
      continue;
    }
    list.push({
      key: g.slug,
      brandModeId: g.divisionId,
      subCompany: g.title,
      label: g.title,
      sublabel: g.subtitle.replace(" · Brand Guidelines", ""),
      swatches: [
        g.primaryColors[0]?.hex ?? "#03002C",
        g.primaryColors[1]?.hex ?? g.primaryColors[0]?.hex ?? "#003FC7",
        g.secondaryColors[0]?.hex ?? "#A1FBF9",
        g.tertiaryColors[0]?.hex ?? "#FFEB66",
      ],
    });
  }
  return list;
}

export function RebrandMenu({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose: () => setOpen(false), containerRef: dialogRef });
  const [busy, setBusy] = useState(false);
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const rebrandDeck = useDeckStore((s) => s.rebrandDeck);
  const snapshot = useServerFn(snapshotDeckVersion);

  const targets = useMemo(buildTargets, []);
  const currentKey = useMemo(() => {
    if (!deck) return "";
    const bySub = targets.find((t) => t.subCompany && t.subCompany === deck.subCompany);
    if (bySub) return bySub.key;
    const byMode = targets.find((t) => !t.subCompany && t.brandModeId === deck.brandModeId);
    return byMode?.key ?? "transperfect-master";
  }, [deck, targets]);

  const [selectedKey, setSelectedKey] = useState<string>(currentKey);
  const selected = targets.find((t) => t.key === selectedKey) ?? targets[0];
  const previewBrand = selected
    ? { ...(byId(BRAND_MODES, selected.brandModeId) ?? BRAND_MODES[0]) }
    : BRAND_MODES[0];

  const activeSlide = deck?.slides[0];
  const activeVariant = activeSlide ? byId(MODULE_VARIANTS, activeSlide.variantId) : undefined;

  if (!deck) return null;

  async function onConfirm() {
    if (!selected || !deck) return;
    setBusy(true);
    try {
      // Best-effort pre-rebrand snapshot for one-click undo.
      try {
        const currentLabel = targets.find((t) => t.key === currentKey)?.label ?? "current";
        await snapshot({
          data: {
            deckId,
            changeSummary: `Rebranded: ${currentLabel} → ${selected.label}`,
          },
        });
      } catch {
        // Not signed in / not cloud-saved — proceed.
      }
      rebrandDeck(deckId, selected.brandModeId, selected.subCompany ?? null);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedKey(currentKey);
          setOpen(true);
        }}
        title="Rebrand this deck to another division"
        className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 py-2 text-sm font-medium text-black backdrop-blur hover:border-black/30 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/30"
      >
        <Palette size={14} /> Rebrand
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rebrand-menu-title"
            tabIndex={-1}
            className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#03002C] text-white shadow-2xl outline-none"
          >
            <div className="flex items-start justify-between border-b border-white/10 px-8 py-5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Rebrand deck</div>
                <h2 id="rebrand-menu-title" className="mt-1 text-2xl font-semibold">Re-tone this presentation for another division</h2>
                <p className="mt-1 max-w-2xl text-sm text-white/60">
                  Colors, backdrops, imagery treatment and the wordmark will re-render in the selected brand.
                  Slide text is not rewritten — review copy for division-specific references.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-[380px_1fr] overflow-hidden">
              {/* Brand list */}
              <div className="overflow-y-auto border-r border-white/10 p-4">
                <div className="grid gap-2">
                  {targets.map((t) => {
                    const isSelected = t.key === selectedKey;
                    const isCurrent = t.key === currentKey;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setSelectedKey(t.key)}
                        className={
                          "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition " +
                          (isSelected
                            ? "border-[#A1FBF9]/60 bg-[#A1FBF9]/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]")
                        }
                      >
                        <div className="flex h-8 shrink-0 items-center gap-0.5 overflow-hidden rounded-md ring-1 ring-white/10">
                          {t.swatches.slice(0, 4).map((hex, i) => (
                            <span key={i} className="block h-8 w-3.5" style={{ background: hex }} />
                          ))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">{t.label}</span>
                            {isCurrent && (
                              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/60">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[11px] text-white/50">{t.sublabel}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="flex flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden bg-black/40 p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Live preview · Slide 1</div>
                    <div className="text-xs text-white/60">
                      {selected?.label}
                    </div>
                  </div>
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-white ring-1 ring-white/10">
                    <ScaledSlide>
                      {activeSlide && activeVariant && (
                        <VariantRenderer
                          slide={activeSlide}
                          variant={activeVariant}
                          brand={previewBrand}
                          pageNumber={1}
                          clientName={brief?.prospect}
                          clientLogoUrl={deck.clientLogo?.primaryUrl ?? null}
                          subCompany={selected?.subCompany}
                        />
                      )}
                    </ScaledSlide>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
                  <div className="text-xs text-white/50">
                    A version snapshot will be saved so you can revert from the History drawer.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 hover:border-white/30 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onConfirm}
                      disabled={busy || selectedKey === currentKey}
                      className="inline-flex items-center gap-2 rounded-full bg-[#A1FBF9] px-5 py-2 text-sm font-semibold text-[#03002C] hover:bg-[#8FEEE9] disabled:opacity-50"
                    >
                      {busy && <Loader2 size={14} className="animate-spin" />}
                      {selectedKey === currentKey ? "Already applied" : "Apply rebrand"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
