import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useDeckStore } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { supabase } from "@/integrations/supabase/client";
import { deckCloudId } from "@/lib/deck-uuid";
import { getDeckSlideTranslations, listLanguages } from "@/lib/translation.functions";

export const Route = createFileRoute("/decks/$deckId/print")({
  head: () => ({ meta: [{ title: "Print · TransPerfect Modular" }] }),
  validateSearch: (raw) =>
    z.object({ lang: z.string().min(2).max(10).optional() }).parse(raw),
  component: PrintView,
});

function PrintView() {
  const { deckId } = Route.useParams();
  const { lang } = Route.useSearch();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));

  const fetchTx = useServerFn(getDeckSlideTranslations);
  const listLangs = useServerFn(listLanguages);
  const [overlay, setOverlay] = useState<Map<number, Record<string, unknown>> | null>(null);
  const [isRtl, setIsRtl] = useState(false);
  const [loading, setLoading] = useState<boolean>(!!lang);

  // Fetch translations for the requested language, then trigger print.
  useEffect(() => {
    let cancelled = false;
    if (!lang || !deck) {
      setLoading(false);
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) throw new Error("Sign in required for translated print");
        const cloudId = deckCloudId(uid, deckId);
        const [rows, langs] = await Promise.all([
          fetchTx({ data: { deckId: cloudId, targetLang: lang } }),
          listLangs().catch(() => [] as Array<{ id: string; rtl: boolean }>),
        ]);
        if (cancelled) return;
        const map = new Map<number, Record<string, unknown>>();
        for (const r of rows as Array<{ position: number; content: unknown }>) {
          if (r.content && typeof r.content === "object") map.set(r.position, r.content as Record<string, unknown>);
        }
        setOverlay(map);
        const l = (langs as Array<{ id: string; rtl: boolean }>).find((x) => x.id === lang);
        setIsRtl(!!l?.rtl);
      } catch {
        // fall through with no overlay
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTimeout(() => window.print(), 700);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, deckId, deck, fetchTx, listLangs]);

  const overlaidSlides = useMemo(() => {
    if (!deck) return [];
    if (!overlay) return deck.slides;
    return deck.slides.map((s) => {
      const t = overlay.get(s.position);
      return t ? { ...s, content: t } : s;
    });
  }, [deck, overlay]);

  if (!deck) throw notFound();
  const brand = resolveBrandMode(deck.brandModeId, deck.subCompany);
  const clientLogoUrl = deck.clientLogo?.primaryUrl ?? null;

  return (
    <div className="print-root min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0" dir={isRtl ? "rtl" : undefined}>
      <style>{`
        @media print {
          @page { size: 1280px 720px landscape; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .print-root { padding: 0 !important; background: #fff !important; }
          .no-print { display: none !important; }
          .print-slide { break-after: page; page-break-after: always; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; width: 1280px !important; height: 720px !important; }
          .print-slide:last-child { break-after: auto; page-break-after: auto; }
        }
        .print-slide, .print-slide * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      `}</style>
      <div className="no-print mx-auto mb-6 max-w-[1280px] px-6 text-xs text-black/60">
        <div className="rounded-lg border border-black/10 bg-white p-3">
          <strong>{loading ? "Preparing translated slides…" : "Ready to print."}</strong>{" "}
          {!loading && (
            <>
              If the dialog didn't open,{" "}
              <button className="underline" onClick={() => window.print()}>click here</button>. Select "Save as PDF" for
              a print-faithful PDF at 16:9.
            </>
          )}
          {lang && !loading && (
            <span className="ml-1 text-black/40">Language: {lang.toUpperCase()}</span>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 print:max-w-none print:gap-0">
        {overlaidSlides.map((slide, i) => {
          const variant = byId(MODULE_VARIANTS, slide.variantId);
          if (!variant) return null;
          return (
            <div
              key={slide.id}
              className="print-slide overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
              style={{ width: 1280, height: 720 }}
            >
              <ScaledSlide>
                <VariantRenderer
                  slide={slide}
                  variant={variant}
                  brand={brand}
                  pageNumber={i + 1}
                  clientName={brief?.prospect}
                  clientLogoUrl={clientLogoUrl}
                  subCompany={deck.subCompany}
                />
              </ScaledSlide>
            </div>
          );
        })}
      </div>
    </div>
  );
}
