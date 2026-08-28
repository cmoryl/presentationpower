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
import { iconByName } from "@/lib/icon-library";

/** Accent used to colour a division's card — its own guide accent, brand blue otherwise. */
function setAccent(slug: string): string {
  if (slug.startsWith("next-2026")) return iconColorOptions(slug)[1]?.hex ?? "#1B3E6F";
  return getBrandGuide(slug)?.secondaryColors?.[0]?.hex ?? "#003FC7";
}

/** Relative luminance, so pale division accents never carry small glyph strokes. */
function isPale(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62;
}

/** Ink used on top of an accent tint — falls back to brand navy on pale accents. */
function accentInk(hex: string): string {
  return isPale(hex) ? "#03002C" : hex;
}



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

          <nav
            aria-label="Choose a brand guide"
            className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {BRAND_ICON_SETS.map((s) => {
              const active = s.slug === slug;
              const accent = setAccent(s.slug);
              const ink = accentInk(accent);
              const count = s.subAreas.reduce((n, a) => n + a.icons.length, 0);
              const preview = s.subAreas
                .flatMap((a) => a.icons.slice(0, 2))
                .slice(0, 5);
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setSlug(s.slug)}
                  aria-pressed={active}
                  className={`group relative overflow-hidden rounded-2xl border bg-white p-4 pl-5 text-left transition ${
                    active
                      ? "border-transparent shadow-[0_12px_30px_-18px_rgba(3,0,44,0.55)]"
                      : "border-black/10 hover:-translate-y-0.5 hover:border-black/25 hover:shadow-[0_10px_24px_-20px_rgba(3,0,44,0.6)]"
                  }`}
                  style={active ? { boxShadow: `0 0 0 2px ${ink} inset` } : undefined}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1.5"
                    style={{ background: accent }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full opacity-[0.12] transition group-hover:opacity-20"
                    style={{ background: accent }}
                  />
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
                        {s.title}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-black/40">
                        {count} icons · {s.subAreas.length} sub-areas
                      </span>
                    </span>
                    {active && (
                      <span
                        className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                        style={{ background: ink, color: "#FFFFFF" }}
                      >
                        Viewing
                      </span>
                    )}
                  </span>
                  <span className="mt-3 flex items-center gap-2">
                    {preview.map((icon) => {
                      const Glyph = iconByName(icon.name);
                      if (!Glyph) return null;
                      return (
                        <span
                          key={icon.name}
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ background: `${accent}1f`, color: ink }}
                        >
                          <Glyph className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        </span>
                      );
                    })}
                  </span>
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
