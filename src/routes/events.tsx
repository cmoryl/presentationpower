// /events — Event templates hub.
//
// Home for event-driven asset templates: conference kits, webinars,
// launches, executive briefings. Today this surfaces the "Event kit"
// profile from the social-format registry and links straight into the
// kit builder pre-selected. Bespoke event template gallery lives here
// as more formats land.

import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Sparkles, Star } from "lucide-react";
import { KIT_PROFILES, SOCIAL_FORMATS_BY_ID } from "@/lib/social-formats";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events · TransPerfect Modular" },
      { name: "description", content: "Event-driven asset templates: signage, badges, hero banners, invites, and social posts pre-tuned for launches, conferences, and webinars." },
      { property: "og:title", content: "Events · TransPerfect Modular" },
      { property: "og:description", content: "Event-driven asset templates: signage, badges, hero banners, invites, and social posts pre-tuned for launches, conferences, and webinars." },
    ],
  }),
  component: EventsView,
});

const EVENT_STARTERS = [
  {
    key: "launch",
    label: "Product launch",
    blurb: "Hero banner, LinkedIn announcement, story reel, and email header on a single narrative.",
    profileId: "event-kit",
  },
  {
    key: "conference",
    label: "Conference / summit",
    blurb: "Speaker cards, session badges, sponsorship rails, and countdown stories.",
    profileId: "event-kit",
  },
  {
    key: "webinar",
    label: "Webinar / roundtable",
    blurb: "Registration graphic, LinkedIn link card, callout post, and follow-up recap.",
    profileId: "social-essentials",
  },
  {
    key: "executive",
    label: "Executive briefing",
    blurb: "Confidential invite + agenda card in the corporate dark palette.",
    profileId: "email-set",
  },
] as const;

function EventsView() {
  const { favorites } = useFavorites();
  const eventKit = KIT_PROFILES.find((p) => p.id === "event-kit");

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
          <CalendarDays size={12} /> Events
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-[#03002C]">
          Event templates & campaign kits
        </h1>
        <p className="max-w-3xl text-sm text-black/60">
          Everything you need to launch a moment — hero banners, signage, invites,
          badges, and social. Start from a template below, or convert any favorited
          module into a full event kit.
        </p>
      </header>

      {/* Starter templates */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
          Starter templates
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EVENT_STARTERS.map((s) => (
            <Link
              key={s.key}
              to="/admin/campaigns/kit"
              search={{ profile: s.profileId }}
              className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-white/80 p-5 transition hover:border-[#003FC7]/50 hover:shadow-sm"
            >
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
                  {s.profileId === "event-kit" ? "Full event kit" : "Kit profile"}
                </div>
                <div className="mt-2 text-lg font-semibold text-[#03002C]">{s.label}</div>
                <p className="mt-2 text-sm text-black/60">{s.blurb}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#003FC7] group-hover:text-[#03002C]">
                Configure kit →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Event kit formats */}
      {eventKit ? (
        <section className="rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
                Included in Event kit
              </div>
              <h2 className="mt-1 text-xl font-semibold text-[#03002C]">
                {eventKit.formatIds.length} formats
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-black/60">{eventKit.description}</p>
            </div>
            <Link
              to="/admin/campaigns/kit"
              search={{ profile: "event-kit" }}
              className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-xs font-medium text-white hover:bg-[#003FC7]"
            >
              <Sparkles size={12} /> Build the event kit →
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {eventKit.formatIds.map((id) => {
              const f = SOCIAL_FORMATS_BY_ID[id];
              if (!f) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] text-black/70"
                >
                  {f.label}
                  <span className="text-[10px] opacity-60">
                    {f.width}×{f.height}
                  </span>
                </span>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Favorites entry */}
      <section className="flex items-center gap-3 rounded-2xl border border-dashed border-black/15 bg-white/50 p-5 text-sm text-black/70">
        <Star size={18} className="fill-amber-400 text-amber-500" />
        <div className="flex-1">
          <div className="font-semibold text-black/80">
            {favorites.size === 0
              ? "Convert a favorited module into an event kit"
              : `${favorites.size} favorited module${favorites.size === 1 ? "" : "s"} ready to convert`}
          </div>
          <div className="text-black/55">
            Star modules on the Presentation library, then generate signage, invites, and social all at once.
          </div>
        </div>
        <Link
          to={favorites.size === 0 ? "/library" : "/admin/campaigns/kit"}
          className="rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#03002C]"
        >
          {favorites.size === 0 ? "Browse presentations →" : "Choose favorites →"}
        </Link>
      </section>
    </div>
  );
}
