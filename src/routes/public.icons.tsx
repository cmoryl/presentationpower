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
  iconSetGroups,
  totalApprovedIcons,
} from "@/lib/brand-icon-sets";

import { getBrandGuide } from "@/lib/brand-guides";
import { iconByName } from "@/lib/icon-library";

/** Accent used to colour a division's card — its own guide accent, brand blue otherwise. */
function setAccent(slug: string): string {
  if (slug.startsWith("next-2026")) return iconColorOptions(slug)[1]?.hex ?? "#1B3E6F";
  return getBrandGuide(slug)?.secondaryColors?.[0]?.hex ?? "#003FC7";
}

/** sRGB relative luminance (0 = black, 1 = white). */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function mix(hex: string, target: string, amount: number): string {
  const parse = (v: string) =>
    [0, 2, 4].map((i) => parseInt(v.replace("#", "").slice(i, i + 2), 16));
  const a = parse(hex);
  const b = parse(target);
  const out = a.map((v, i) => Math.round(v + (b[i]! - v) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Ink used on top of an accent tint. Pale division accents (aqua, lavender,
 * yellow) fail contrast at glyph weight and on white cards, so they are darkened
 * toward brand navy until they clear a readable luminance instead of being
 * dropped to a flat navy — the division still reads as itself.
 */
function accentInk(hex: string): string {
  let out = hex;
  for (let i = 0; i < 8 && luminance(out) > 0.22; i++) out = mix(out, "#03002C", 0.22);
  return out;
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
  // Picking a division COLLAPSES the chooser: the point of the page is the icon
  // listings, and 23 division cards pushed them a full screen below the fold.
  const [pickerOpen, setPickerOpen] = useState(true);
  const guide = getBrandGuide(slug);
  const hero = useMemo(() => {
    // Readable ink, not the raw guide accent: pale division colours (aqua,
    // lavender, yellow) are unreadable on the white listing surface below.
    if (slug.startsWith("next-2026")) return accentInk(iconColorOptions(slug)[1]?.hex ?? "#1B3E6F");
    return accentInk(guide?.secondaryColors?.[0]?.hex ?? "#003FC7");
  }, [slug, guide]);

  const GROUPS = useMemo(() => iconSetGroups(), []);
  const set = BRAND_ICON_SETS.find((s) => s.slug === slug);
  const activeGroup = GROUPS.find((g) => g.sets.some((s) => s.slug === slug));
  const activeInk = accentInk(setAccent(slug));
  const activeCount = set ? set.subAreas.reduce((n, a) => n + a.icons.length, 0) : 0;

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-[#03002C]">
      <BackToTop />
      <header className="border-b border-black/10 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/55">
            TransPerfect Element · Design system
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Approved icon library
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-black/70">
            {totalApprovedIcons()} approved glyphs across {BRAND_ICON_SETS.length} brand guides,
            organised into {GROUPS.map((g) => g.label.toLowerCase()).join(", ")} — then by sub-area.
            These are the same marks the deck builder draws, so a download can never drift from what
            ships on a slide. Choose a set, a size and an approved colour, then download a single
            icon, a sub-area, or the full set.
          </p>

          {/* Collapsed state: one summary row so the listings sit right under the fold. */}
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-black/12 bg-white p-3 pl-4">
            <span
              aria-hidden
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ background: activeInk }}
            />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
                {set?.title ?? "Brand guide"}
              </span>
              <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-black/55">
                {activeGroup ? `${activeGroup.label} · ` : ""}
                {activeCount} icons · {set?.subAreas.length ?? 0} sub-areas
              </span>
            </span>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              className="ml-auto rounded-full border border-black/20 px-4 py-2 text-[12px] font-semibold tracking-[-0.01em] text-[#03002C] transition hover:border-[#003FC7] hover:text-[#003FC7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]/50"
            >
              {pickerOpen ? "Hide icon sets" : `Browse all sets (${BRAND_ICON_SETS.length})`}
            </button>
          </div>

          {pickerOpen && (
            <div className="mt-4 space-y-6">
              {GROUPS.map((group) => (
                <section key={group.id} aria-labelledby={`icon-group-${group.id}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2
                      id={`icon-group-${group.id}`}
                      className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#03002C]"
                    >
                      {group.label}
                    </h2>
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">
                      {group.sets.length} {group.sets.length === 1 ? "set" : "sets"}
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-black/60">
                    {group.note}
                  </p>
                  <nav
                    aria-label={`${group.label} icon sets`}
                    className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {group.sets.map((s) => {
                      const active = s.slug === slug;
                      const accent = setAccent(s.slug);
                      // Every structural use of the accent (rail, glyph strokes, badge,
                      // ring) runs through the readable ink so pale division colours
                      // stop dissolving into the white card.
                      const ink = accentInk(accent);
                      const count = s.subAreas.reduce((n, a) => n + a.icons.length, 0);
                      const preview = s.subAreas.flatMap((a) => a.icons.slice(0, 2)).slice(0, 5);
                      return (
                        <button
                          key={s.slug}
                          type="button"
                          onClick={() => {
                            setSlug(s.slug);
                            setPickerOpen(false);
                          }}
                          aria-pressed={active}
                          className={`group relative overflow-hidden rounded-2xl border bg-white p-4 pl-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]/50 ${
                            active
                              ? "border-transparent shadow-[0_12px_30px_-18px_rgba(3,0,44,0.55)]"
                              : "border-black/12 hover:-translate-y-0.5 hover:border-black/30 hover:shadow-[0_10px_24px_-20px_rgba(3,0,44,0.6)]"
                          }`}
                          style={active ? { boxShadow: `0 0 0 2px ${ink} inset` } : undefined}
                        >
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-1.5"
                            style={{ background: ink }}
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full opacity-[0.10] transition group-hover:opacity-[0.16]"
                            style={{ background: ink }}
                          />
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
                                {s.title}
                              </span>
                              <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-black/55">
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
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border"
                                  style={{
                                    background: `${ink}14`,
                                    borderColor: `${ink}33`,
                                    color: ink,
                                  }}
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
                </section>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {set && <p className="mb-6 max-w-3xl text-sm leading-relaxed text-black/70">{set.body}</p>}
        <BrandIconLibrary slug={slug} hero={hero} />
        <p className="mt-10 text-xs text-black/60">
          Approved sets only. Usage follows the TransPerfect brand guidelines — never recolour a
          glyph outside the approved colours shown above.
        </p>
      </div>
    </main>
  );
}
