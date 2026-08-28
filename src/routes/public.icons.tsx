// Public, no-login APPROVED ICON LIBRARY.
//
// Share-safe surface for the Icon Studio: only the approved brand icon sets and
// their download controls. No admin chrome, no app sidebar, no pack browser and
// no governance tooling — nothing here links back into the admin directory.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { BackToTop } from "@/components/BackToTop";
import { BrandIconLibrary } from "@/components/brand/BrandIconLibrary";
import {
  BRAND_ICON_SETS,
  iconColorOptions,
  totalApprovedIcons,
} from "@/lib/brand-icon-sets";
import { getBrandGuide } from "@/lib/brand-guides";

export const Route = createFileRoute("/public/icons")({
  head: () => ({
    meta: [
      { title: "Approved Icon Library · TransPerfect Element" },
      {
        name: "description",
        content:
          "Download the approved TransPerfect icon sets by division and sub-area — pick a size and an approved colour, export as SVG or PNG. No login required.",
      },
      { property: "og:title", content: "Approved Icon Library · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Division-approved icon sets with SVG and PNG downloads, sized and coloured to the TransPerfect brand system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicIconLibrary,
});

function PublicIconLibrary() {
  const [slug, setSlug] = useState(BRAND_ICON_SETS[0]?.slug ?? "transperfect-master");
  const guide = getBrandGuide(slug);
  const hero = useMemo(() => {
    if (slug.startsWith("next-2026")) return iconColorOptions(slug)[1]?.hex ?? "#1B3E6F";
    return guide?.secondaryColors?.[0]?.hex ?? "#003FC7";
  }, [slug, guide]);

  const set = BRAND_ICON_SETS.find((s) => s.slug === slug);

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-[#03002C]">
      <BackToTop />
      <header className="border-b border-black/10 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
            TransPerfect Element · Design system
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Approved icon library
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/60">
            {totalApprovedIcons()} approved glyphs across {BRAND_ICON_SETS.length} brand guides,
            organised by sub-area. These are the same marks the deck builder draws, so a download
            can never drift from what ships on a slide. Choose a division, a size and an approved
            colour, then download a single icon, a sub-area, or the full set.
          </p>

          <nav aria-label="Choose a brand guide" className="mt-6 flex flex-wrap gap-2">
            {BRAND_ICON_SETS.map((s) => {
              const active = s.slug === slug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setSlug(s.slug)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                    active
                      ? "text-white"
                      : "border-black/15 bg-white text-black/70 hover:border-black/40"
                  }`}
                  style={active ? { background: hero, borderColor: hero } : undefined}
                >
                  {s.title}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {set && (
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-black/65">{set.body}</p>
        )}
        <BrandIconLibrary slug={slug} hero={hero} />
        <p className="mt-10 text-xs text-black/50">
          Approved sets only. Usage follows the TransPerfect brand guidelines — never recolour a
          glyph outside the approved colours shown above.
        </p>
      </div>
    </main>
  );
}
