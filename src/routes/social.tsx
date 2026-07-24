// /social — Campaign-from-module hub.
//
// User-facing entry point for turning existing modules into social
// campaigns. Wraps the same infrastructure as /admin/campaigns/kit but
// is unauthenticated and starts from "pick a favorited module".

import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Star, Share2 } from "lucide-react";
import { KIT_PROFILES } from "@/lib/social-formats";
import { useFavorites } from "@/lib/favorites";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { useMemo } from "react";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "Social · TransPerfect Modular" },
      { name: "description", content: "Spin a full social campaign — square, story, LinkedIn, X, email — out of any module or favorited slide." },
      { property: "og:title", content: "Social · TransPerfect Modular" },
      { property: "og:description", content: "Spin a full social campaign — square, story, LinkedIn, X, email — out of any module or favorited slide." },
    ],
  }),
  component: SocialView,
});

function SocialView() {
  const { favorites } = useFavorites();
  const favoritedVariants = useMemo(
    () => MODULE_VARIANTS.filter((v) => favorites.has(v.id)),
    [favorites],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
          <Share2 size={12} /> Social
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-[#03002C]">
          Turn any module into a social campaign
        </h1>
        <p className="max-w-3xl text-sm text-black/60">
          Start from a favorited module, pick a kit profile, and get every format —
          square, portrait, story, LinkedIn, X, email — ready to publish. Copy carries
          over from the source; per-format adjustments happen inline.
        </p>
      </header>

      {/* Kit profiles */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
          Pick a kit profile
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {KIT_PROFILES.map((p) => (
            <Link
              key={p.id}
              to="/admin/campaigns/kit"
              search={{ profile: p.id }}
              className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-white/80 p-5 transition hover:border-[#003FC7]/50 hover:shadow-sm"
            >
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
                  {p.formatIds.length} formats
                </div>
                <div className="mt-2 text-lg font-semibold text-[#03002C]">{p.label}</div>
                <p className="mt-2 text-sm text-black/60">{p.description}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#003FC7] group-hover:text-[#03002C]">
                Start kit →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Favorites → kit */}
      <section className="rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
              From favorites
            </div>
            <h2 className="mt-1 text-xl font-semibold text-[#03002C]">
              {favoritedVariants.length === 0
                ? "No favorited modules yet"
                : `${favoritedVariants.length} module${favoritedVariants.length === 1 ? "" : "s"} ready`}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-black/60">
              Star a module in the{" "}
              <Link to="/library" className="text-[#003FC7] underline underline-offset-2">
                Presentation library
              </Link>{" "}
              to make it available here. Any KPI, quote, stat, or cover module can seed a
              social campaign.
            </p>
          </div>
          <Link
            to={favoritedVariants.length === 0 ? "/library" : "/admin/campaigns/kit"}
            className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-xs font-medium text-white hover:bg-[#003FC7]"
          >
            <Sparkles size={12} />
            {favoritedVariants.length === 0 ? "Browse the library →" : "Choose from favorites →"}
          </Link>
        </div>

        {favoritedVariants.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {favoritedVariants.slice(0, 9).map((v) => (
              <Link
                key={v.id}
                to="/admin/campaigns/kit"
                search={{ source: v.id, profile: "social-essentials" }}
                className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-3 text-sm transition hover:border-[#003FC7]/40"
              >
                <Star size={14} className="mt-0.5 shrink-0 fill-amber-400 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-black/85">{v.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-black/45">
                    {v.familyId} · {v.id}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
