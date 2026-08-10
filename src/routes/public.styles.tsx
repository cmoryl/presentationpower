// Public, no-login STYLE DIRECTORY.
//
// A side-by-side of every alternate master design ("style pack") applied to the
// same four modules. Purpose: pick a look. Content is identical across packs —
// real division knowledge, real seeded copy — so what changes on screen is
// purely the design language: ground, ink, accent, type, corner, texture.
//
// From here a reviewer jumps into the full module library dressed in the pack
// they liked: /public/modules?style=<id>.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";

import { BackToTop } from "@/components/BackToTop";
import { LazyMount } from "@/components/LazyMount";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { STYLE_PACKS, packToneBrand, type StylePack } from "@/lib/style-packs";
import {
  BRAND_MODES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  byId,
  type BrandMode,
  type ModuleVariant,
} from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";

export const Route = createFileRoute("/public/styles")({
  head: () => ({
    meta: [
      { title: "Design Style Directory · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Ten alternate master design styles applied to the same slide modules — compare grounds, type, colour and card treatment, then browse the full library in the look you prefer.",
      },
      { property: "og:title", content: "Design Style Directory · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "Compare ten alternate master design languages across the same modules. Same content, different look. No login required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicStyleDirectory,
});

/** The four modules each pack is judged on: a cover, a stat page, a pillar
 *  layout, and an editorial/quote page. Enough to see type, figures, cards and
 *  a hero moment in one row. */
const SAMPLE_IDS = ["MV-OP-COVER", "MV-PROOF-STATS-3", "MV-SOL-PILLARS-3", "MV-INS-QUOTE"];

const DEFAULT_BRAND_ID =
  BRAND_MODES.find((b) => b.id === "bm-enterprise")?.id ?? BRAND_MODES[0]!.id;

function sectionForVariant(v: ModuleVariant): string {
  return SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? "SF-01";
}

function StageSample({
  variant,
  brand,
  pack,
  index,
}: {
  variant: ModuleVariant;
  brand: BrandMode;
  pack: StylePack;
  index: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const brief = useMemo(() => resolveDivisionBrief(brand), [brand]);
  const slide = useMemo(
    () => ({
      id: `${pack.id}:${variant.id}`,
      position: 0,
      sectionId: sectionForVariant(variant),
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0],
      content: seedDivisionContent(variant.id, brief, "Style preview", brand),
      changes: [],
    }),
    [pack.id, variant, brief, brand],
  );

  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{ background: pack.tokens.surface }}
      data-variant-id={variant.id}
    >
      <ScaledSlide>
        <StylePackProvider pack={pack}>
          <StylePackVars pack={pack} className="h-full w-full">
            <SlideBackdropContext.Provider value={null}>
              <VariantRenderer
                slide={slide as never}
                variant={variant}
                brand={packToneBrand(brand, pack)}
                pageNumber={index + 1}
                mode={pack.mode}
              />
            </SlideBackdropContext.Provider>
          </StylePackVars>
        </StylePackProvider>
      </ScaledSlide>
    </div>
  );
}

function PackRow({ pack, brand }: { pack: StylePack; brand: BrandMode }) {
  const samples = SAMPLE_IDS.map((id) => byId(MODULE_VARIANTS, id)).filter(
    (v): v is ModuleVariant => !!v,
  );

  return (
    <section
      id={pack.id}
      className="scroll-mt-24 border-t border-black/10 py-12 first:border-t-0"
      aria-labelledby={`${pack.id}-title`}
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex overflow-hidden rounded-sm">
              {pack.swatch.map((c) => (
                <span key={c} className="h-5 w-6" style={{ backgroundColor: c }} />
              ))}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
              {pack.mode} · {pack.id}
            </span>
          </div>
          <h2 id={`${pack.id}-title`} className="mt-3 text-2xl font-semibold tracking-tight">
            {pack.label}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-black/60">{pack.tagline}</p>
          <p className="mt-1 text-xs text-black/45">Reference: {pack.reference}</p>
        </div>
        <a
          href={`/public/modules?style=${pack.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-xs font-medium text-white transition hover:bg-[#003FC7]"
        >
          Browse all modules in this look
          <ArrowRight size={13} strokeWidth={1.75} />
        </a>
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {samples.map((v, i) => (
          <li
            key={v.id}
            className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
          >
            <div className="relative aspect-video w-full overflow-hidden">
              <LazyMount
                placeholder={
                  <div className="absolute inset-0 grid place-items-center text-black/25">
                    <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                  </div>
                }
              >
                <StageSample variant={v} brand={brand} pack={pack} index={i} />
              </LazyMount>
            </div>
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
              {v.name}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PublicStyleDirectory() {
  const [brandId, setBrandId] = useState<string>(DEFAULT_BRAND_ID);
  const brand = byId(BRAND_MODES, brandId) ?? BRAND_MODES[0]!;

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-[#03002C]">
      <BackToTop />
      <header className="border-b border-black/10 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-[1500px] px-6 py-10">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
            Design test · public review
          </div>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Alternate design directory
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/60">
            Twenty-eight master design languages, each applied to the same four modules with the same
            division content. These are deliberately off-brand explorations for taste-testing —
            grounds, type, colour, corners and texture all change; the words never do. Pick the
            directions worth pursuing, then open the full {MODULE_VARIANTS.length}-module library in
            that look.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="text-xs text-black/55">
              <span className="mr-2 font-medium">Content source</span>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="h-9 rounded-full border border-black/15 bg-white px-4 text-sm outline-none focus:border-[#003FC7]"
                aria-label="Division content source"
              >
                {BRAND_MODES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <a
              href="/public/modules"
              className="text-xs font-medium text-[#003FC7] underline-offset-4 hover:underline"
            >
              Approved brand library →
            </a>
          </div>

          <nav aria-label="Jump to a style" className="mt-6 flex flex-wrap gap-2">
            {STYLE_PACKS.map((p) => (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="flex items-center gap-2 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium hover:border-black/40"
              >
                <span aria-hidden className="flex overflow-hidden rounded-full">
                  {p.swatch.slice(0, 3).map((c) => (
                    <span key={c} className="h-3 w-2" style={{ backgroundColor: c }} />
                  ))}
                </span>
                {p.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 pb-16">
        {STYLE_PACKS.map((p) => (
          <PackRow key={p.id} pack={p} brand={brand} />
        ))}
      </div>
    </main>
  );
}
