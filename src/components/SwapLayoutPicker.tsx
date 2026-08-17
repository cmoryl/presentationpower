import { useMemo, useRef, useState } from "react";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import {
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  byId,
  variantsForSection,
} from "@/lib/taxonomy";
import type { BRAND_MODES } from "@/lib/taxonomy";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import type { DeckSlide } from "@/lib/deck-store";

type BrandMode = (typeof BRAND_MODES)[number];

export function SwapLayoutButton({
  slide,
  brand,
  onSwap,
  clientLogoUrl,
  clientName,
  subCompany,
}: {
  slide: DeckSlide;
  brand: BrandMode;
  onSwap: (variantId: string) => void;
  clientLogoUrl?: string | null;
  clientName?: string | null;
  subCompany?: string | null;
}) {
  const [open, setOpen] = useState(false);
  // Section-permitted variants are the *safe* set, not the only legal one:
  // swapVariant accepts any module id, so a slide must be able to become any
  // module in the master listing (a client-logo wall, a bento, anything).
  const [scope, setScope] = useState<"section" | "all">("section");
  const [query, setQuery] = useState("");
  const [familyId, setFamilyId] = useState<string | "all">("all");
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose: () => setOpen(false), containerRef: dialogRef });
  const currentVariant = byId(MODULE_VARIANTS, slide.variantId);
  const currentFamilyId = currentVariant?.familyId;

  const sectionIds = useMemo(
    () => new Set(variantsForSection(slide.sectionId).map((v) => v.id)),
    [slide.sectionId],
  );

  const options = useMemo(() => {
    const base = scope === "all" ? MODULE_VARIANTS : MODULE_VARIANTS.filter((v) => sectionIds.has(v.id));
    const scoped = familyId === "all" ? base : base.filter((v) => v.familyId === familyId);
    const q = query.trim().toLowerCase();
    const matched = q
      ? scoped.filter((v) => {
          const family = byId(MODULE_FAMILIES, v.familyId)?.name ?? "";
          return `${v.id} ${v.name} ${v.description} ${family}`.toLowerCase().includes(q);
        })
      : scoped;
    // Rank: section-compatible first, then same family, then the rest.
    return [...matched].sort((a, b) => {
      const aSec = sectionIds.has(a.id) ? 0 : 1;
      const bSec = sectionIds.has(b.id) ? 0 : 1;
      if (aSec !== bSec) return aSec - bSec;
      const aFam = a.familyId === currentFamilyId ? 0 : 1;
      const bFam = b.familyId === currentFamilyId ? 0 : 1;
      if (aFam !== bFam) return aFam - bFam;
      return a.name.localeCompare(b.name);
    });
  }, [scope, query, familyId, sectionIds, currentFamilyId]);

  // Group into readable family sections so the grid reads as a catalogue,
  // not a wall of truncated codes.
  const groups = useMemo(() => {
    const map = new Map<string, typeof MODULE_VARIANTS>();
    for (const v of options) {
      const list = map.get(v.familyId) ?? [];
      list.push(v);
      map.set(v.familyId, list);
    }
    return [...map.entries()].map(([fid, items]) => ({
      id: fid,
      name: byId(MODULE_FAMILIES, fid)?.name ?? fid,
      items,
    }));
  }, [options]);

  const familyCounts = useMemo(() => {
    const base = scope === "all" ? MODULE_VARIANTS : MODULE_VARIANTS.filter((v) => sectionIds.has(v.id));
    const counts = new Map<string, number>();
    for (const v of base) counts.set(v.familyId, (counts.get(v.familyId) ?? 0) + 1);
    return counts;
  }, [scope, sectionIds]);


  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium hover:border-[#003FC7]/40 hover:text-[#003FC7]"
      >
        Swap layout…
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-layout-title"
            tabIndex={-1}
            className="max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-6 py-4">
              <div>
                <div
                  id="swap-layout-title"
                  className="text-xs uppercase tracking-widest text-black/50"
                >
                  Swap layout · {byId(SECTION_FRAMEWORKS, slide.sectionId)?.name}
                </div>
                <div className="mt-1 text-sm text-black/70">
                  Overlapping fields carry over. {options.length} of {MODULE_VARIANTS.length} modules
                  shown.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-3 py-1 text-xs uppercase tracking-widest hover:border-black/30"
              >
                Close
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-b border-black/10 bg-black/[0.02] px-6 py-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all modules — client logos, bento, KPI…"
                aria-label="Search modules"
                className="min-w-[16rem] flex-1 rounded-full border border-black/15 bg-white px-4 py-1.5 text-sm outline-none focus:border-[#003FC7]"
              />
              <div
                role="group"
                aria-label="Module scope"
                className="flex overflow-hidden rounded-full border border-black/15 bg-white text-[10px] uppercase tracking-widest"
              >
                {(["section", "all"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    aria-pressed={scope === s}
                    className={`px-3 py-1.5 ${
                      scope === s ? "bg-[#003FC7] text-white" : "text-black/60 hover:text-black"
                    }`}
                  >
                    {s === "section" ? "This section" : `All modules (${MODULE_VARIANTS.length})`}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {options.map((v) => {
                  const isCurrent = v.id === slide.variantId;
                  const sameFamily = v.familyId === currentFamilyId;
                  const outsideSection = !sectionIds.has(v.id);
                  const previewSlide: DeckSlide = {
                    ...slide,
                    variantId: v.id,
                    layoutId: v.permittedLayoutIds[0],
                  };
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        onSwap(v.id);
                        setOpen(false);
                      }}
                      className={`group overflow-hidden rounded-xl border text-left transition ${
                        isCurrent
                          ? "border-[#003FC7] ring-2 ring-[#003FC7]/20"
                          : "border-black/10 hover:border-[#003FC7]/40 hover:shadow-lg"
                      }`}
                    >
                      <div className="aspect-[16/9] bg-white">
                        <ScaledSlide>
                          <VariantRenderer
                            slide={previewSlide}
                            variant={v}
                            brand={brand}
                            pageNumber={1}
                            clientName={clientName ?? undefined}
                            clientLogoUrl={clientLogoUrl ?? null}
                            subCompany={subCompany ?? undefined}
                          />
                        </ScaledSlide>
                      </div>
                      <div className="border-t border-black/10 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{v.name}</span>
                          {outsideSection && !isCurrent && (
                            <span
                              title="Outside this section's default set — still fully swappable."
                              className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-amber-800"
                            >
                              Cross
                            </span>
                          )}
                          {sameFamily && !outsideSection && !isCurrent && (
                            <span className="rounded-full bg-[#003FC7]/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-[#003FC7]">
                              Family
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded-full bg-black/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-white">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-black/50">{v.id}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {options.length === 0 && (
                <p className="py-10 text-center text-sm text-black/50">
                  No modules match “{query}”. Try “All modules”.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
