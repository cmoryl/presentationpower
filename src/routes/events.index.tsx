// /events — Events command center.
//
// Deep-dive redesign: industry-standard event playbooks (launch, summit,
// life-sciences, legal, webinar, executive briefing, roadshow, awards),
// each with a live demo route at /events/demo/$playbookId that renders
// a real kit end-to-end. Also surfaces the format catalog by surface, a
// phased-rollout explainer, and the favorites-to-kit entry point.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  CalendarDays,
  Sparkles,
  Star,
  ArrowRight,
  Rocket,
  Building2,
  FlaskConical,
  Scale,
  Video,
  Presentation,
  Map,
  Trophy,
  Clock3,
  LayoutGrid,
  Printer,
  Monitor,
  Mail,
  Film,
} from "lucide-react";
import { EVENT_PLAYBOOKS, type EventPlaybook } from "@/lib/event-playbooks";
import { getPlaybookImagery } from "@/lib/playbook-imagery";
import { SOCIAL_FORMATS, KIT_PROFILES } from "@/lib/social-formats";
import { useFavorites } from "@/lib/favorites";
import { SavedKitsSection } from "@/components/campaigns/SavedKitsSection";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Industry-standard event playbooks — launches, summits, webinars, briefings, roadshows, and awards — with live demo kits, phased timelines, and one-click generation.",
      },
      { property: "og:title", content: "Events · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "Industry-standard event playbooks with live demo kits, phased timelines, and one-click generation.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://presentationpower.lovable.app/events" }],
  }),
  component: () => (
    <AppShell>
      <EventsView />
    </AppShell>
  ),
});

const PLAYBOOK_ICON: Record<
  EventPlaybook["kind"],
  React.ComponentType<{ size?: number; className?: string }>
> = {
  launch: Rocket,
  conference: Building2,
  summit: FlaskConical,
  webinar: Video,
  roundtable: Video,
  briefing: Presentation,
  roadshow: Map,
  awards: Trophy,
  "trade-show": Building2,
  hackathon: LayoutGrid,
  "field-day": CalendarDays,
};

function EventsView() {
  const { favorites } = useFavorites();

  // Format catalog grouped by surface for the "everything ships" section.
  const catalogBySurface = useMemo(() => {
    const groups: Record<string, typeof SOCIAL_FORMATS> = {
      Digital: [],
      Email: [],
      Signage: [],
      Kit: [],
    };
    for (const f of SOCIAL_FORMATS) {
      if (f.category === "email") groups.Email.push(f);
      else if (f.category === "signage" || f.category === "screen") groups.Signage.push(f);
      else if (f.category === "kit") groups.Kit.push(f);
      else groups.Digital.push(f);
    }
    return groups;
  }, []);

  const totalAssets = EVENT_PLAYBOOKS.reduce(
    (n, p) => n + (KIT_PROFILES.find((k) => k.id === p.kitProfileId)?.formatIds.length ?? 0) * 2,
    0,
  );

  return (
    <>
      {/* Hero */}
      <header className="full-bleed relative -mt-6 overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#A6FA8724] via-white/70 to-[#C2A3FF26] py-14 sm:-mt-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
              <CalendarDays size={12} /> Events command center
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
              Every event, one visual system.
            </h1>
            <p className="max-w-2xl text-base text-black/65">
              Industry-standard playbooks for launches, summits, webinars, briefings, roadshows, and
              awards — each ships a full kit of signage, invites, social, and email. Preview any
              playbook live, then configure it for your event in under a minute.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#playbooks"
                className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2 text-sm font-medium text-white hover:bg-[#003FC7]"
              >
                <Sparkles size={14} /> Explore playbooks ↓
              </a>
              <Link
                to="/events/new"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
              >
                Start from a blank kit <ArrowRight size={14} />
              </Link>
              <Link
                to="/events/presets"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
              >
                All presets <ArrowRight size={14} />
              </Link>
              <Link
                to="/events/next"
                className="inline-flex items-center gap-2 rounded-full border border-[#003FC7]/40 bg-white/70 px-5 py-2 text-sm font-medium text-[#003FC7] hover:bg-white"
              >
                TransPerfect NEXT 2026 <ArrowRight size={14} />
              </Link>
            </div>

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        {/* Your saved kits (signed-in, non-empty only) */}
        <SavedKitsSection surface="event" />

        {/* Playbook grid */}
        <section id="playbooks" className="space-y-5">
          <SectionHead
            eyebrow="Playbooks"
            title="Live event archetypes"
            desc="Each card opens a rendered demo — real copy, real brand tokens, real phase timeline. Configure to make it yours."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {EVENT_PLAYBOOKS.map((p) => {
              const Icon = PLAYBOOK_ICON[p.kind] ?? CalendarDays;
              return (
                <Link
                  key={p.id}
                  to="/events/demo/$playbookId"
                  params={{ playbookId: p.id }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/85 p-5 transition hover:border-[#003FC7]/50 hover:shadow-[0_10px_30px_-14px_rgba(3,0,44,0.25)]"
                  style={{
                    background: `linear-gradient(160deg, ${p.accent}12 0%, rgba(255,255,255,0.9) 60%)`,
                  }}
                >
                  {getPlaybookImagery(p.id) ? (
                    <div className="-mx-5 -mt-5 mb-4 aspect-[16/9] overflow-hidden border-b border-black/10">
                      <img
                        src={getPlaybookImagery(p.id)!.hero}
                        alt={`${p.name} event environment`}
                        loading="lazy"
                        width={1536}
                        height={864}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">

                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${p.accent}22`, color: p.accent }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-black/45">
                      {p.chip}
                    </span>
                  </div>
                  <div className="mt-4 text-lg font-semibold text-[#03002C]">{p.name}</div>
                  <p className="mt-1 flex-1 text-sm text-black/60">{p.tagline}</p>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-black/55">
                    <span>
                      {p.phases.length} phases · {p.deliverables.length} deliverables
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-[#003FC7] group-hover:text-[#03002C]">
                      Preview <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Phased rollout explainer */}
        <section className="rounded-3xl border border-black/10 bg-white/70 p-6 sm:p-8">
          <SectionHead
            eyebrow="How playbooks work"
            title="Phased rollout, one narrative"
            desc="Every kit ships in four beats so the story keeps moving without asset thrash."
          />
          <ol className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              {
                when: "T-30 → T-14",
                label: "Tease",
                detail: "Countdown, save-the-date, exec teaser.",
                icon: Clock3,
              },
              {
                when: "T-7 → T-1",
                label: "Prime",
                detail: "Registration push, speaker reveal, pre-reads.",
                icon: Sparkles,
              },
              {
                when: "Day of",
                label: "Live",
                detail: "Hero reveal, story loop, wayfinding, signage.",
                icon: Rocket,
              },
              {
                when: "T+1 → T+14",
                label: "Echo",
                detail: "Recap, replays, sponsor thank-yous, press.",
                icon: ArrowRight,
              },
            ].map((step) => (
              <li key={step.label} className="rounded-2xl border border-black/10 bg-white/85 p-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#003FC7]/10 text-[#003FC7]">
                    <step.icon size={14} />
                  </span>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                    {step.when}
                  </div>
                </div>
                <div className="mt-2 text-lg font-semibold text-[#03002C]">{step.label}</div>
                <p className="mt-1 text-sm text-black/60">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Format catalog by surface */}
        <section>
          <SectionHead
            eyebrow="Everything ships"
            title="Format catalog by surface"
            desc="From 1080-square to 1080×1920 story to 1200×400 email banner — one geometry registry, every renderer."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { key: "Digital", icon: Monitor },
                { key: "Kit", icon: LayoutGrid },
                { key: "Email", icon: Mail },
                { key: "Signage", icon: Printer },
              ] as const
            ).map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/85 p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#03002C]/5 text-[#03002C]">
                    <Icon size={14} />
                  </span>
                  <div className="text-sm font-semibold text-[#03002C]">{key}</div>
                  <span className="ml-auto text-[10px] text-black/50">
                    {(catalogBySurface[key] ?? []).length}
                  </span>
                </div>
                <ul className="space-y-1.5 text-[12px] text-black/70">
                  {(catalogBySurface[key] ?? []).slice(0, 6).map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{f.label}</span>
                      <span className="shrink-0 text-[10px] text-black/45">
                        {f.width}×{f.height}
                      </span>
                    </li>
                  ))}
                  {(catalogBySurface[key] ?? []).length === 0 ? (
                    <li className="italic text-black/40">Coming in a future pass.</li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Kit profiles */}
        <section>
          <SectionHead
            eyebrow="Kit profiles"
            title="Bundle presets"
            desc="Skip the checkbox marathon — profiles pack the right formats for the moment."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KIT_PROFILES.map((k) => (
              <Link
                key={k.id}
                to="/admin/campaigns/kit"
                search={{ profile: k.id }}
                className="group flex flex-col rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-[#003FC7]/50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
                    {k.formatIds.length} formats
                  </div>
                  <Film size={14} className="text-foreground/40 group-hover:text-[#003FC7]" />
                </div>
                <div className="mt-2 text-base font-semibold text-[#03002C]">{k.label}</div>
                <p className="mt-1 flex-1 text-xs text-black/60">{k.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[#003FC7]">
                  Build kit <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Favorites CTA */}
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-black/15 bg-white/50 p-5 text-sm text-black/70 sm:p-6">
          <Star size={16} className="fill-amber-400 text-accent-foreground" />
          <div className="min-w-[220px] flex-1">
            <div className="font-semibold text-[#03002C]">
              {favorites.size === 0
                ? "Convert a favorited module into an event kit"
                : `${favorites.size} favorited module${favorites.size === 1 ? "" : "s"} ready to convert`}
            </div>
            <div className="text-black/55">
              Star modules on the Presentation library, then generate signage, invites, and social
              all at once.
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
    </>
  );
}

function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-[#03002C]">{title}</h2>
      {desc ? <p className="max-w-2xl text-sm text-black/60">{desc}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-black/45">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-[#03002C]">{value}</dd>
    </div>
  );
}
