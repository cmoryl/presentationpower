// /events/demo/$playbookId — live playbook preview.
//
// Renders a fully-populated event kit end-to-end using the deterministic
// campaign pipeline. No AI, no persistence — the source variant, EventFacts,
// and kit profile all come from src/lib/event-playbooks.ts so the page is
// reproducible and reviewable. A "Configure this kit" CTA hands off to the
// existing /admin/campaigns/kit builder pre-seeded with the same profile.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Sparkles,
  Target,
  Hash,
  Users,
  BadgeCheck,
} from "lucide-react";
import { getPlaybook, EVENT_PLAYBOOKS, getExpandedCollateral, type EventPlaybook } from "@/lib/event-playbooks";
import { KIT_PROFILES_BY_ID, SOCIAL_FORMATS_BY_ID } from "@/lib/social-formats";
import { BRAND_MODES } from "@/lib/taxonomy";
import { buildCampaignAssets, sourceFromVariant } from "@/lib/campaigns";
import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { ForkPresetButton } from "@/components/campaigns/ForkPresetButton";
import { CollateralGrid } from "@/components/campaigns/CollateralGrid";


export const Route = createFileRoute("/events/demo/$playbookId")({
  loader: ({ params }) => {
    const playbook = getPlaybook(params.playbookId);
    if (!playbook) throw notFound();
    return { playbook };
  },
  head: ({ params }) => {
    const p = getPlaybook(params.playbookId);
    const title = p ? `${p.name} · Live event kit demo` : "Event demo";
    const desc = p?.intent ?? "Live preview of a full event kit.";
    return {
      meta: [
        { title: `${title} · TransPerfect Modular` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: () => (<AppShell><PlaybookDemoView /></AppShell>),
});

function PlaybookDemoView() {
  const { playbook } = Route.useLoaderData() as { playbook: EventPlaybook };
  const brand = useMemo(
    () => BRAND_MODES.find((b) => b.id === playbook.subBrand) ?? BRAND_MODES[0],
    [playbook.subBrand],
  );
  const kit = KIT_PROFILES_BY_ID[playbook.kitProfileId];
  const source = useMemo(
    () => sourceFromVariant(playbook.seedVariantId, brand),
    [playbook.seedVariantId, brand],
  );
  // Merge source copy with playbook facts (event name is the eyebrow).
  const assets = useMemo(
    () =>
      buildCampaignAssets(source, playbook.facts, {
        formatIds: kit?.formatIds ?? [],
        mode: "both",
        brandId: brand.id,
      }),
    [source, playbook.facts, kit, brand.id],
  );

  const startDate = playbook.facts.startDate
    ? new Date(playbook.facts.startDate).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-xs text-black/50">
        <Link to="/events" className="inline-flex items-center gap-1 hover:text-[#003FC7]">
          <ArrowLeft size={12} /> All playbooks
        </Link>
        <span aria-hidden>·</span>
        <span>{playbook.chip}</span>
      </div>

      {/* Hero */}
      <header
        className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 p-8 backdrop-blur"
        style={{
          background: `linear-gradient(120deg, ${playbook.accent}18 0%, rgba(255,255,255,0.65) 55%, ${playbook.accent}08 100%)`,
        }}
      >
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
              <CalendarDays size={12} /> {playbook.chip} · Live demo
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
              {playbook.name}
            </h1>
            <p className="max-w-2xl text-base text-black/65">{playbook.intent}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/admin/campaigns/kit"
                search={{ profile: playbook.kitProfileId }}
                className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2 text-sm font-medium text-white hover:bg-[#003FC7]"
              >
                <Sparkles size={14} /> Configure this kit →
              </Link>
              <ForkPresetButton kind="event" playbook={playbook} />
              <a
                href="#assets"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-5 py-2 text-sm font-medium text-[#03002C] hover:border-[#003FC7]/50"
              >
                Preview {assets.length} assets ↓
              </a>
            </div>
          </div>

          {/* Facts card */}
          <dl className="grid grid-cols-2 gap-3 self-start rounded-2xl border border-black/10 bg-white/85 p-5 text-sm text-black/80">
            <FactRow icon={<Sparkles size={12} />} label="Event">
              <span className="font-semibold text-[#03002C]">{playbook.facts.name}</span>
            </FactRow>
            <FactRow icon={<CalendarDays size={12} />} label="Date">
              {startDate ?? "TBD"}
            </FactRow>
            <FactRow icon={<MapPin size={12} />} label="Where">
              {playbook.facts.city || "—"}
              {playbook.facts.venue ? (
                <div className="text-black/55">{playbook.facts.venue}</div>
              ) : null}
            </FactRow>
            <FactRow icon={<Hash size={12} />} label="Hashtag">
              {playbook.facts.hashtag || "—"}
            </FactRow>
            <FactRow icon={<BadgeCheck size={12} />} label="Brand">
              {brand.name}
            </FactRow>
            <FactRow icon={<Users size={12} />} label="Speakers">
              {playbook.facts.speakers.length
                ? `${playbook.facts.speakers.length} confirmed`
                : "TBD"}
            </FactRow>
          </dl>
        </div>
      </header>

      {/* Phases timeline */}
      <section>
        <SectionHead
          eyebrow="Cadence"
          title="Rollout timeline"
          desc="Each phase ships a small format bundle so the story keeps moving without asset thrash."
        />
        <ol className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {playbook.phases.map((phase) => (
            <li
              key={phase.when}
              className="relative flex flex-col rounded-2xl border border-black/10 bg-white/85 p-5"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#003FC7]">
                {phase.when}
              </div>
              <div className="mt-1 text-lg font-semibold text-[#03002C]">{phase.label}</div>
              <p className="mt-1 text-sm text-black/60">{phase.detail}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {phase.formats.map((fid) => {
                  const f = SOCIAL_FORMATS_BY_ID[fid];
                  if (!f) return null;
                  return (
                    <span
                      key={fid}
                      className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] text-black/60"
                    >
                      {f.label}
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Live asset gallery — rendered assets first */}
      <section id="assets">
        <SectionHead
          eyebrow="Live preview"
          title={`${assets.length} rendered assets · light + dark`}
          desc="Rendered right now from the deterministic pipeline. Configure to swap copy, brand, and cadence."
        />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <AssetPreviewCard
              key={a.id}
              rendererProps={{
                format: a.format,
                brandId: a.brandId,
                mode: a.mode,
                copy: a.copy,
                facts: {
                  hashtag: playbook.facts.hashtag,
                  registrationUrl: playbook.facts.registrationUrl,
                },
              }}
              formatLabel={a.format.label}
              formatWidth={a.format.width}
              formatHeight={a.format.height}
              mode={a.mode}
            />
          ))}
        </div>

      </section>

      {/* Marketing collateral — full kit scope, grouped, with status ribbons */}
      <section>
        <SectionHead
          eyebrow="Ships in kit"
          title="Marketing collateral"
          desc="The full production scope for this playbook — sponsorship, badges, signage, print, video, digital, email and merch. Pieces flagged live render right now; the rest are on the roadmap."
        />
        <div className="mt-6">
          <CollateralGrid items={getExpandedCollateral(playbook)} />
        </div>
      </section>

      {/* KPI targets */}
      <section>
        <SectionHead eyebrow="Success" title="KPI targets" desc="Benchmark rules of thumb from prior runs." />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {playbook.kpis.map((k) => (
            <li
              key={k.label}
              className="flex items-baseline justify-between gap-4 rounded-2xl border border-black/10 bg-white/85 p-4"
            >
              <div>
                <div className="text-xs uppercase tracking-widest text-black/50">
                  <Target size={11} className="mr-1 inline" /> {k.label}
                </div>
                {k.detail ? <div className="mt-0.5 text-xs text-black/60">{k.detail}</div> : null}
              </div>
              <div className="text-2xl font-semibold tracking-tight text-[#03002C]">{k.target}</div>
            </li>
          ))}
        </ul>
      </section>


      {/* Related playbooks */}
      <section>
        <SectionHead eyebrow="Related" title="Other playbooks" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EVENT_PLAYBOOKS.filter((p) => p.id !== playbook.id)
            .slice(0, 4)
            .map((p) => (
              <Link
                key={p.id}
                to="/events/demo/$playbookId"
                params={{ playbookId: p.id }}
                className="group flex flex-col rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-[#003FC7]/50"
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
                  {p.chip}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#03002C]">{p.name}</div>
                <div className="mt-1 text-xs text-black/55">{p.tagline}</div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}

function FactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-black/50">
        {icon} {label}
      </dt>
      <dd className="text-sm text-[#03002C]">{children}</dd>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
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

const SURFACE_STYLE: Record<string, { bg: string; ink: string; label: string }> = {
  digital: { bg: "#003FC71a", ink: "#003FC7", label: "Digital" },
  signage: { bg: "#FF9B7022", ink: "#B04A20", label: "Signage" },
  print: { bg: "#03002C10", ink: "#03002C", label: "Print" },
  video: { bg: "#EC388a22", ink: "#B01E60", label: "Video" },
  email: { bg: "#A1FBF933", ink: "#0A6666", label: "Email" },
};

function SurfacePill({ surface }: { surface: string }) {
  const s = SURFACE_STYLE[surface] ?? SURFACE_STYLE.digital;
  return (
    <span
      className="mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
      style={{ backgroundColor: s.bg, color: s.ink }}
    >
      {s.label}
    </span>
  );
}
