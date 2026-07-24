// /events/presets — folder-style gallery of every event preset grouped by kind.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { FolderOpen, ArrowRight, CalendarDays } from "lucide-react";
import {
  EVENT_PLAYBOOKS,
  type EventPlaybook,
  type PlaybookKind,
} from "@/lib/event-playbooks";
import { KIT_PROFILES_BY_ID } from "@/lib/social-formats";

const KIND_LABEL: Record<PlaybookKind, string> = {
  launch: "Launches",
  conference: "Conferences",
  summit: "Summits",
  webinar: "Webinars",
  roundtable: "Roundtables",
  briefing: "Briefings",
  roadshow: "Roadshows",
  awards: "Awards",
  "trade-show": "Trade shows",
  hackathon: "Hackathons",
  "field-day": "Field days",
};

export const Route = createFileRoute("/events/presets")({
  head: () => ({
    meta: [
      { title: "Event presets · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Folder-style gallery of every event preset — grouped by kind, forkable in one click.",
      },
      { property: "og:title", content: "Event presets · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "Every event preset in one folder-style gallery — launches, summits, roundtables, trade shows and more — forkable into your saved kits.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => (
    <AppShell>
      <PresetsView />
    </AppShell>
  ),
});

function PresetsView() {
  const groups = useMemo(() => {
    const map = new Map<PlaybookKind, EventPlaybook[]>();
    for (const p of EVENT_PLAYBOOKS) {
      const list = map.get(p.kind) ?? [];
      list.push(p);
      map.set(p.kind, list);
    }
    return Array.from(map.entries())
      .map(([kind, items]) => ({ kind, label: KIND_LABEL[kind] ?? kind, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, []);

  return (
    <>
      <header className="full-bleed relative -mt-6 overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#003FC70a] via-white/60 to-[#A1FBF922] py-14 sm:-mt-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
              <FolderOpen size={12} /> Events · preset library
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
              All event presets, one folder view.
            </h1>
            <p className="max-w-2xl text-base text-black/65">
              Every industry-standard event preset — grouped by kind. Preview
              any live, or fork it into your saved kits.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {groups.map(({ kind, label, items }) => (
          <section key={kind} className="space-y-4">
            <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                  Folder
                </div>
                <h2 className="text-xl font-semibold text-[#03002C]">{label}</h2>
              </div>
              <div className="text-xs text-black/50">
                {items.length} preset{items.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => {
                const profile = KIT_PROFILES_BY_ID[p.kitProfileId];
                return (
                  <Link
                    key={p.id}
                    to="/events/demo/$playbookId"
                    params={{ playbookId: p.id }}
                    className="group flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white/85 p-4 transition hover:border-[#003FC7]/50 hover:shadow-[0_10px_30px_-14px_rgba(3,0,44,0.25)]"
                    style={{
                      background: `linear-gradient(160deg, ${p.accent}12 0%, rgba(255,255,255,0.92) 65%)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold uppercase tracking-widest"
                        style={{ backgroundColor: `${p.accent}22`, color: "#03002C" }}
                      >
                        <CalendarDays size={11} /> {p.chip}
                      </span>
                      <span className="text-[10px] text-black/45">
                        {profile?.label ?? p.kitProfileId}
                      </span>
                    </div>
                    <div className="mt-3 line-clamp-1 text-sm font-semibold text-[#03002C]">
                      {p.name}
                    </div>
                    <p className="mt-1 line-clamp-2 flex-1 text-xs text-black/60">
                      {p.tagline}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-black/55">
                      <span>
                        {p.phases.length} beats · {p.deliverables.length} assets
                      </span>
                      <ArrowRight
                        size={13}
                        className="translate-x-0 transition group-hover:translate-x-0.5"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
