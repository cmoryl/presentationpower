// Renders one slide of an imported PPTX exactly as authored, inside a deck
// slide. Editable decks built from an imported deck store only a reference
// (`importedDeckId` + `importedSlideIndex`) in slide content — never the raw
// layout — because captured layouts are large and their image URLs are
// signed for 24h. Fetching on render keeps localStorage small and the signed
// URLs fresh.

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getImportedDeckSlides } from "@/lib/imported-decks.functions";
import { FaithfulSlideCanvas } from "@/components/slide/FaithfulSlideCanvas";

export type ImportedRef = {
  deckId: string;
  slideIndex: number;
};

/** Reads the faithful-import reference off a slide's content record. */
export function readImportedRef(c: Record<string, unknown>): ImportedRef | null {
  if (c.faithfulImport === false) return null;
  const deckId = typeof c.importedDeckId === "string" ? c.importedDeckId : "";
  const slideIndex =
    typeof c.importedSlideIndex === "number" ? c.importedSlideIndex : Number.NaN;
  if (!deckId || !Number.isFinite(slideIndex)) return null;
  return { deckId, slideIndex };
}

export function ImportedFaithfulSlide({
  deckId,
  slideIndex,
  /**
   * When true the canvas is rendered at the measured container width instead
   * of the 1920px slide canvas width — used by small comparison previews,
   * where a fixed 1920px render would overflow massively.
   */
  fitToContainer = false,
}: ImportedRef & { fitToContainer?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: 0, h: 0 });
  const fitWidth = fit.w;

  useEffect(() => {
    if (!fitToContainer) return;
    const el = hostRef.current;
    if (!el) return;
    const measure = () => setFit({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToContainer]);

  const getSlides = useServerFn(getImportedDeckSlides);
  const q = useQuery({
    queryKey: ["imported-deck-slides", deckId],
    queryFn: () => getSlides({ data: { id: deckId } }),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const deck = q.data as
    | {
        theme?: Record<string, string> | null;
        extras?: { fonts?: unknown[] } | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        slides?: any[];
      }
    | undefined;
  const slide = deck?.slides?.find((s) => s.index === slideIndex);

  const msgClass = fitToContainer
    ? "absolute inset-0 grid place-items-center bg-white px-4 text-center text-xs text-black/40"
    : "absolute inset-0 grid place-items-center bg-white px-24 text-center text-[28px] text-black/40";

  if (q.isLoading) {
    return (
      <div ref={hostRef} className={msgClass}>
        Loading imported slide…
      </div>
    );
  }

  if (!slide?.layout) {
    return (
      <div ref={hostRef} className={msgClass}>
        Original layout unavailable for slide {slideIndex + 1}.
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={
        fitToContainer
          ? "absolute inset-0 grid place-items-center overflow-hidden bg-white"
          : "absolute inset-0 overflow-hidden bg-white"
      }
    >
      {(!fitToContainer || fitWidth > 0) && (
        <FaithfulSlideCanvas
          layout={slide.layout}
          assets={slide.assets}
          theme={(deck?.theme ?? undefined) as Record<string, string> | undefined}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fonts={(deck?.extras as any)?.fonts}
          width={fitToContainer ? fitWidth : 1920}
          // Contain inside the preview box so nothing is cropped, letterboxing
          // a non-16:9 source the same way the native preview is framed.
          maxHeight={fitToContainer ? fit.h : undefined}
          showChrome={false}
        />
      )}
    </div>
  );
}

