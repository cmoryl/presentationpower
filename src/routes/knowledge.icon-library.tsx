// Cross-division approved icon library: every brand guide's approved set in one
// place, with the same preview + download controls the guides use.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandIconLibrary } from "@/components/brand/BrandIconLibrary";
import { BRAND_ICON_SETS, totalApprovedIcons } from "@/lib/brand-icon-sets";
import { getBrandGuide } from "@/lib/brand-guides";

export const Route = createFileRoute("/knowledge/icon-library")({
  head: () => ({
    meta: [
      { title: "Approved Icon Library · TransPerfect Brand System" },
      {
        name: "description",
        content:
          "Approved icon sets for TransPerfect and every division, by sub-area — preview at any size and approved colour, download as SVG or PNG.",
      },
      { property: "og:title", content: "Approved Icon Library · TransPerfect Brand System" },
      {
        property: "og:description",
        content:
          "Division-approved icon sets with SVG and PNG downloads, sized and coloured to the brand system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IconLibraryPage,
});

function IconLibraryPage() {
  const [slug, setSlug] = useState(BRAND_ICON_SETS[0]?.slug ?? "transperfect-master");
  const guide = getBrandGuide(slug);
  const hero = guide?.secondaryColors?.[0]?.hex ?? "#003FC7";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.3em] text-foreground/55">Brand system</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Approved icon library</h1>
        <p className="mt-3 max-w-3xl text-foreground/75">
          {totalApprovedIcons()} approved glyphs across {BRAND_ICON_SETS.length} brand guides,
          organised by sub-area. Everything here is the same mark the deck builder draws, so a
          download can never drift from what ships on a slide.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {BRAND_ICON_SETS.map((s) => {
            const active = s.slug === slug;
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => setSlug(s.slug)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  active ? "text-white" : "border-border text-foreground/75 hover:bg-muted"
                }`}
                style={active ? { background: hero, borderColor: hero } : undefined}
              >
                {s.title}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <BrandIconLibrary slug={slug} hero={hero} />
        </div>

        <p className="mt-10 text-sm text-foreground/70">
          Looking for the rest of the rules?{" "}
          <Link to="/knowledge/brand-guides" className="underline">
            Open the brand guides
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
