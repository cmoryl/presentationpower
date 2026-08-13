// Visual "Add slide" gallery — replaces the plain section list with a modal
// that shows live slide previews for every module variant, grouped by section.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { LazyMount } from "@/components/LazyMount";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, byId, variantsForSection } from "@/lib/taxonomy";
import type { BrandMode } from "@/lib/taxonomy";
import type { Brief, DeckSlide, SlideContent } from "@/lib/deck-store";
import { seedDivisionContent } from "@/lib/library-preview";

type Props = {
  brand: BrandMode;
  brief: Brief;
  /** Insert a slide with fully-seeded content (matches the preview exactly). */
  onInsert: (variantId: string, content: SlideContent) => void;
};

export function AddSlideGallery({ brand, brief, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="rounded-xl border border-dashed border-black/20 bg-white/50 p-3">
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left text-xs font-medium uppercase tracking-widest text-black/60 hover:text-black"
        >
          + Add slide
        </button>
        <p className="mt-1 text-[10px] text-black/40">Browse module layouts visually</p>
      </div>
      {open && (
        <GalleryModal
          brand={brand}
          brief={brief}
          onClose={() => setOpen(false)}
          onInsert={onInsert}
        />
      )}
    </>
  );
}

function GalleryModal({ brand, brief, onClose, onInsert }: Props & { onClose: () => void }) {
  const [sectionId, setSectionId] = useState<string>(SECTION_FRAMEWORKS[0]?.id ?? "");
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const variants = useMemo(() => {
    const pool = q.trim()
      ? MODULE_VARIANTS.filter((v) =>
          `${v.id} ${v.name} ${v.description}`.toLowerCase().includes(q.trim().toLowerCase()),
        )
      : sectionId === "*"
        ? MODULE_VARIANTS
        : variantsForSection(sectionId);
    return pool.slice(0, 200);
  }, [sectionId, q]);

  const sectionName = byId(SECTION_FRAMEWORKS, sectionId)?.name ?? "";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add slide"
      onClick={onClose}
    >
      <div
        className="flex h-[86vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sections rail */}
        <aside className="w-60 shrink-0 overflow-auto border-r border-black/10 bg-black/[0.02] p-3">
          <div className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-black/40">
            Sections
          </div>
          <button
            onClick={() => {
              setSectionId("*");
              setQ("");
            }}
            className={`mb-1 block w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
              !q && sectionId === "*"
                ? "bg-[#003FC7] text-white"
                : "hover:bg-black/5 text-black/80"
            }`}
          >
            All modules ({MODULE_VARIANTS.length})
          </button>
          {SECTION_FRAMEWORKS.map((sf) => (
            <button
              key={sf.id}
              onClick={() => {
                setSectionId(sf.id);
                setQ("");
              }}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                !q && sf.id === sectionId
                  ? "bg-[#003FC7] text-white"
                  : "hover:bg-black/5 text-black/80"
              }`}
            >
              <span
                className={`font-mono ${!q && sf.id === sectionId ? "text-white/60" : "text-black/35"}`}
              >
                {sf.id}
              </span>{" "}
              {sf.name}
            </button>
          ))}
        </aside>

        {/* Grid */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-black/10 px-5 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-black/80">
                {q ? "Search results" : sectionId === "*" ? "All modules" : sectionName}
              </div>
              <div className="text-[11px] text-black/45">{variants.length} layouts</div>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search all layouts…"
              className="ml-auto w-64 rounded-md border border-black/15 px-2.5 py-1.5 text-xs outline-none focus:border-[#003FC7]"
            />
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-sm text-black/50 hover:bg-black/5 hover:text-black"
            >
              ✕
            </button>
          </header>

          {/* content-start + auto-rows-min: the grid has a definite height
              (flex-1), so default stretch alignment squeezed 80+ rows to ~40px
              each and clipped every preview. */}
          <div className="grid flex-1 auto-rows-min content-start grid-cols-2 gap-4 overflow-auto p-5 lg:grid-cols-3">
            {variants.map((mv) => {
              const content = seedDivisionContent(mv.id, brief, sectionName || mv.name, brand);
              const previewSlide: DeckSlide = {
                id: `gallery-${mv.id}`,
                position: 0,
                sectionId: sectionId || "SEC-01",
                variantId: mv.id,
                layoutId: mv.permittedLayoutIds[0],
                content,
                changes: [],
              };
              return (
                <button
                  key={mv.id}
                  type="button"
                  onClick={() => {
                    onInsert(mv.id, content);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-lg border border-black/10 bg-white text-left transition hover:border-[#003FC7] hover:shadow-lg"
                >
                  {/* Ratio box: with 80+ cards in one grid, relying on
                      `aspect-[16/9]` alone let rows collapse to the label
                      height (previews rendered but clipped to ~0). A
                      padding-ratio box + explicit min-height always reserves
                      real height before the slide mounts. */}
                  <div
                    className="relative w-full overflow-hidden bg-[#03002C]"
                    style={{ aspectRatio: "16 / 9", minHeight: 120 }}
                  >
                    <LazyMount placeholder={null} className="absolute inset-0">
                      <SlideThumbnailContext.Provider value={true}>
                        <ScaledSlide>
                          <VariantRenderer
                            slide={previewSlide}
                            variant={mv}
                            brand={brand}
                            pageNumber={1}
                          />
                        </ScaledSlide>
                      </SlideThumbnailContext.Provider>
                    </LazyMount>
                  </div>
                  <div className="px-3 py-2">
                    <div className="truncate text-[11px] font-semibold text-black/80">
                      {mv.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-black/35">{mv.id}</div>
                  </div>
                </button>
              );
            })}
            {variants.length === 0 && (
              <div className="col-span-full py-16 text-center text-sm text-black/40">
                No layouts match “{q}”.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
