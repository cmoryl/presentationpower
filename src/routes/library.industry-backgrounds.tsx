/**
 * /library/industry-backgrounds — Industry Background Gallery.
 *
 * Review/inspection surface only: it renders the real procedural output of the
 * industry background engine (R01–R30 × 11 scenes × 4 takes = 1,320
 * compositions). No new styles, no rendering changes, no mockups.
 */

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import { BackToTop } from "@/components/BackToTop";
import {
  AllBackgroundsGrid,
  DEFAULT_FILTERS,
  GalleryFilterBar,
  IndustryOverviewCard,
  activeScenes,
  activeTakes,
  matchesIndustry,
  type GalleryFilters,
} from "@/components/library/IndustryBackgroundGallery";
import { INDUSTRY_BG_COMBOS, industryBackgroundSets } from "@/lib/industry-backgrounds";

const TITLE = "Industry Background Gallery — OnDeck";
const DESC =
  "Inspect every authored industry background system R01–R30 at real render fidelity: 11 scenes × 4 takes per sector, 1,320 procedural compositions.";

export const Route = createFileRoute("/library/industry-backgrounds")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndustryBackgroundGalleryPage,
});

function IndustryBackgroundGalleryPage() {
  const sets = React.useMemo(() => industryBackgroundSets(), []);
  const [filters, setFilters] = React.useState<GalleryFilters>(DEFAULT_FILTERS);
  const [mode, setMode] = React.useState<"overview" | "all">("overview");
  const [open, setOpen] = React.useState<string | null>(null);

  const shownSets = React.useMemo(
    () => sets.filter((s) => matchesIndustry(s, filters.q)),
    [sets, filters.q],
  );
  const perSet = activeScenes(filters).length * activeTakes(filters).length;
  const total = shownSets.length * perSet;

  return (
    <AppShell>
      <LibrarySubnav active="/library" />

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
            Approved Visual Style Library
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#03002C] dark:text-white">
            Industry Background Gallery
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-black/55 dark:text-white/55">
            The 30 authored industry background systems (R01–R30), rendered live through the same{" "}
            <code className="rounded bg-black/[0.05] px-1 dark:bg-white/10">ground()</code> engine
            the slide stage and PPTX/PDF/PNG exporters use. {sets.length} industries ×{" "}
            {INDUSTRY_BG_COMBOS} scene × take compositions = {sets.length * INDUSTRY_BG_COMBOS}{" "}
            backgrounds. Pure background fields only — typography, cards and layout still come from
            the approved 28 visual languages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Gallery mode"
            className="inline-flex items-center rounded-full bg-black/[0.04] p-0.5 text-[11px] font-semibold dark:bg-white/10"
          >
            {(["overview", "all"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 transition ${
                  mode === m
                    ? "bg-white text-[#03002C] shadow-sm dark:bg-[#03002C] dark:text-white"
                    : "text-black/50 hover:text-black dark:text-white/50"
                }`}
              >
                {m === "overview" ? "Industries" : "All backgrounds"}
              </button>
            ))}
          </div>
          <Link
            to="/library"
            className="rounded-full border border-black/12 px-3 py-1.5 text-[12px] font-semibold text-[#03002C]/70 transition hover:border-[#003FC7]/40 hover:text-[#003FC7] dark:border-white/15 dark:text-white/70"
          >
            ← Back to library
          </Link>
        </div>
      </header>

      <div className="mt-5">
        <GalleryFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => {
            setFilters(DEFAULT_FILTERS);
            setOpen(null);
          }}
          resultLabel={
            mode === "overview"
              ? `${shownSets.length} industries · ${total} compositions`
              : `${total} compositions`
          }
        />
      </div>

      <div className="mt-5">
        {mode === "overview" ? (
          shownSets.length === 0 ? (
            <p className="rounded-2xl border border-black/10 p-6 text-[13px] text-black/55 dark:border-white/10 dark:text-white/55">
              No industry matches “{filters.q}”.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shownSets.map((set) => (
                <IndustryOverviewCard
                  key={set.recipeId}
                  set={set}
                  filters={filters}
                  open={open === set.recipeId}
                  onToggle={() => setOpen((cur) => (cur === set.recipeId ? null : set.recipeId))}
                />
              ))}
            </div>
          )
        ) : (
          <AllBackgroundsGrid filters={filters} />
        )}
      </div>

      <BackToTop />
    </AppShell>
  );
}
