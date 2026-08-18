// Dev-only contact sheet used by the master-PDF export script.
// Renders a paginated run of module variants at full 1920×1080 stage scale,
// one page per (variant × mode), so a headless browser can screenshot each
// [data-sheet-page] element and assemble a print-ready PDF.

import { useEffect, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS, type ModuleVariant } from "@/lib/taxonomy";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";

type Search = { start: number; count: number; w: number; fix: number; ar: string; ids: string };

export const Route = createFileRoute("/dev/module-sheet")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    start: Number(raw.start ?? 0) || 0,
    count: Number(raw.count ?? 6) || 6,
    w: Number(raw.w ?? 1280) || 1280,
    // fix=0 renders the raw variant output without the runtime WCAG auto-fix,
    // so a contrast audit measures what the module itself authored.
    fix: raw.fix === "0" || raw.fix === 0 ? 0 : 1,
    // ar=16:9 | 4:3 | 1:1 — stage aspect ratio under test.
    ar: typeof raw.ar === "string" && /^\d+:\d+$/.test(raw.ar) ? raw.ar : "16:9",
    // ids=MV-A,MV-B renders an explicit variant set instead of a slice.
    ids: typeof raw.ids === "string" ? raw.ids : "",
  }),
  head: () => ({
    meta: [
      { title: "Module contact sheet · TransPerfect" },
      { name: "description", content: "Internal contact sheet of every module variant." },
    ],
  }),
  component: ModuleSheet,
});

function sectionForVariant(v: ModuleVariant): string {
  return (
    SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? "SF-01"
  );
}

export function stageForAspect(ar: string): { w: number; h: number } {
  const [aw, ah] = ar.split(":").map((n) => Number(n));
  if (!aw || !ah) return { w: 1920, h: 1080 };
  // Keep authored width fixed so type scales stay comparable across ratios.
  return { w: 1920, h: Math.round((1920 * ah) / aw) };
}

function SheetPage({
  variant,
  mode,
  width,
  index,
  fix,
  ar,
}: {
  variant: ModuleVariant;
  mode: "light" | "dark";
  width: number;
  index: number;
  fix: boolean;
  ar: string;
}) {
  const stage = stageForAspect(ar);
  const brand = BRAND_MODES.find((b) => b.id === "bm-enterprise") ?? BRAND_MODES[0]!;
  const brief = useMemo(() => resolveDivisionBrief(brand), [brand]);
  const slide = useMemo(
    () => ({
      id: `${variant.id}:${mode}`,
      position: 0,
      sectionId: sectionForVariant(variant),
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0],
      content: seedDivisionContent(variant.id, brief, "Preview section", brand) as Record<
        string,
        unknown
      >,
      changes: [],
    }),
    [variant, brief, brand, mode],
  );
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(async () => {
      const el = ref.current;
      if (!el) return;
      if (fix) {
        const { applyAutoFix, auditAndFixTypography } = await import("@/lib/wcag");
        auditAndFixTypography(el);
        applyAutoFix(el);
      }
      el.setAttribute("data-sheet-ready", "1");
    }, 400);
    return () => window.clearTimeout(t);
  }, [variant.id, mode, fix]);

  return (
    <div
      data-sheet-page=""
      data-sheet-variant={variant.id}
      data-sheet-mode={mode}
      data-sheet-index={index}
      data-sheet-ar={ar}
      style={{ width, height: Math.round((width * stage.h) / stage.w) }}
      className="relative overflow-hidden"
    >
      <div
        ref={ref}
        className="absolute inset-0"
        style={{ background: mode === "dark" ? "#03002C" : "#F2F2F2" }}
      >
        <ScaledSlide stageW={stage.w} stageH={stage.h}>
          <SlideBackdropContext.Provider value={backdropForVariant(variant, brand.id, mode)}>
            <VariantRenderer
              slide={slide as never}
              variant={variant}
              brand={brand}
              pageNumber={index + 1}
              mode={mode}
            />
          </SlideBackdropContext.Provider>
        </ScaledSlide>
      </div>
    </div>
  );
}

function ModuleSheet() {
  const { start, count, w, fix, ar, ids } = Route.useSearch();
  const picked = ids
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const slice = picked.length
    ? picked
        .map((id) => MODULE_VARIANTS.find((v) => v.id === id))
        .filter((v): v is ModuleVariant => Boolean(v))
    : MODULE_VARIANTS.slice(start, start + count);
  return (
    <main className="bg-white p-0" data-sheet-root="" data-sheet-total={MODULE_VARIANTS.length}>
      <h1 className="sr-only">Module contact sheet</h1>
      {slice.map((v, i) =>
        (["light", "dark"] as const).map((m) => (
          <SheetPage
            key={`${v.id}-${m}`}
            variant={v}
            mode={m}
            width={w}
            index={start + i}
            fix={fix === 1}
            ar={ar}
          />
        )),
      )}
    </main>
  );
}
