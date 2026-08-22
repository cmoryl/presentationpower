// Rendered slide gallery for the demo landing pages.
//
// Demos are finished, approved builds — so every demo page shows an actual
// rendered comp of every slide (same renderer the editor, presenter and share
// viewer use), not just a text list of titles. Slides render lazily so a
// 16-slide deck stays cheap on first paint.

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

import { LazyMount } from "@/components/LazyMount";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { DeckPackScope, deckPack, packBrand } from "@/components/slide/DeckPackScope";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS, byId } from "@/lib/taxonomy";

type DemoSlide = {
  id?: string;
  sectionId: string;
  variantId: string;
  layoutId?: string;
  content: Record<string, unknown>;
  mode?: "light" | "dark";
  canvasBlocks?: unknown;
};

type DemoPayload = {
  title?: string;
  brandModeId?: string;
  subCompany?: string;
  context?: { stylePackId?: string | null; designRecipeId?: string | null } | null;
  slides: DemoSlide[];
};

function useRenderContext(payload: DemoPayload) {
  return useMemo(() => {
    const pack = deckPack(payload);
    const base =
      BRAND_MODES.find((b) => b.id === (payload.brandModeId ?? "bm-enterprise")) ?? BRAND_MODES[0];
    return { pack, brand: packBrand(base, pack) };
  }, [payload]);
}

function SlideFrame({
  payload,
  slide,
  index,
}: {
  payload: DemoPayload;
  slide: DemoSlide;
  index: number;
}) {
  const { pack, brand } = useRenderContext(payload);
  const variant = byId(MODULE_VARIANTS, slide.variantId);
  if (!variant) return null;
  return (
    <SlideBackdropContext.Provider value={null}>
      <ScaledSlide>
        <DeckPackScope pack={pack}>
          <VariantRenderer
            slide={{
              id: slide.id ?? `demo-${index}`,
              position: index,
              sectionId: slide.sectionId,
              variantId: slide.variantId,
              layoutId: slide.layoutId ?? variant.permittedLayoutIds[0],
              content: slide.content,
              changes: [],
              canvasBlocks: slide.canvasBlocks as never,
            }}
            variant={variant}
            brand={brand}
            pageNumber={index + 1}
            subCompany={payload.subCompany}
            mode={slide.mode ?? "light"}
          />
        </DeckPackScope>
      </ScaledSlide>
    </SlideBackdropContext.Provider>
  );
}

function SlideLightbox({
  payload,
  slide,
  index,
  onClose,
}: {
  payload: DemoPayload;
  slide: DemoSlide;
  index: number;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  const variant = byId(MODULE_VARIANTS, slide.variantId);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Slide ${index + 1} preview`}
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#03002C]/85 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0 text-sm font-semibold text-[#03002C]">
            {index + 1}. {variant?.name ?? slide.variantId}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close slide preview"
            className="grid h-11 w-11 place-items-center rounded-full border border-black/10 text-[#03002C] hover:bg-black/5"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="aspect-[16/9] w-full bg-white">
          <SlideFrame payload={payload} slide={slide} index={index} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ShowcaseSlideGallery({
  payload,
  accent,
}: {
  payload: DemoPayload;
  accent?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {open !== null && payload.slides[open] ? (
        <SlideLightbox
          payload={payload}
          slide={payload.slides[open]}
          index={open}
          onClose={() => setOpen(null)}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {payload.slides.map((s, i) => {
          const variant = byId(MODULE_VARIANTS, s.variantId);
          const section = byId(SECTION_FRAMEWORKS, s.sectionId);
          return (
            <figure
              key={`${s.variantId}-${i}`}
              className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10"
            >
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Enlarge slide ${i + 1}`}
                className="relative block aspect-[16/9] w-full bg-white"
              >
                <LazyMount placeholder={<div className="h-full w-full bg-black/5" />}>
                  <SlideFrame payload={payload} slide={s} index={i} />
                </LazyMount>
                <span
                  className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-lg text-[11px] font-semibold text-white"
                  style={{ background: accent ?? "#003FC7" }}
                >
                  {i + 1}
                </span>
                <span className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-[#03002C] opacity-0 transition group-hover:opacity-100">
                  <Maximize2 size={12} strokeWidth={1.75} />
                </span>
              </button>
              <figcaption className="px-3 py-2">
                <div className="truncate text-xs font-medium text-[#03002C] dark:text-white">
                  {(s.content.title as string) ??
                    (s.content.message as string) ??
                    variant?.name ??
                    s.variantId}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-black/50 dark:text-white/50">
                  {section?.name ?? s.sectionId} · {variant?.name ?? s.variantId}
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
