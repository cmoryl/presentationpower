// /events/demo/$playbookId — live playbook preview.
//
// Renders a fully-populated event kit end-to-end using the deterministic
// campaign pipeline. No AI, no persistence — the source variant, EventFacts,
// and kit profile all come from src/lib/event-playbooks.ts so the page is
// reproducible and reviewable. A "Configure this kit" CTA hands off to the
// existing /admin/campaigns/kit builder pre-seeded with the same profile.

import { resolveSocialStyle, type SocialStyleId } from "@/lib/social-styles";
import { readCampaignLookId, readCampaignStyleId, saveCampaignLook } from "@/lib/campaign-look";
import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  getPlaybook,
  EVENT_PLAYBOOKS,
  getExpandedCollateral,
  type EventPlaybook,
} from "@/lib/event-playbooks";
import { KIT_PROFILES_BY_ID, SOCIAL_FORMATS_BY_ID } from "@/lib/social-formats";
import { BRAND_MODES } from "@/lib/taxonomy";
import { buildCampaignAssets, sourceFromVariant } from "@/lib/campaigns";
import { photoForFormat } from "@/lib/social-photography";
import { AssetPreviewCard } from "@/components/campaigns/AssetPreviewCard";
import { ForkPresetButton } from "@/components/campaigns/ForkPresetButton";
import { CustomizeCampaignButton } from "@/components/campaigns/CustomizeCampaignButton";
import { CollateralGrid } from "@/components/campaigns/CollateralGrid";
import { PlaybookGallery } from "@/components/events/PlaybookGallery";
import type { CollateralContext } from "@/components/events/CollateralArtwork";
import { getDivisionLogos } from "@/lib/division-logos";
import { nextLockupSuite, nextTrackIdForPlaybook } from "@/lib/next-event-logos";
import { useSocialAssetEdits, socialEditKey } from "@/lib/social-asset-edit";
import {
  EVENT_LOOKS,
  EVENT_LOOKS_BY_ID,
  eventLookById,
  eventLookForPlaybook,
} from "@/lib/event-looks";

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
        { title: `${title} · TransPerfect Element` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: () => (
    <AppShell>
      <PlaybookDemoView />
    </AppShell>
  ),
});

function PlaybookDemoView() {
  const { playbook } = Route.useLoaderData() as { playbook: EventPlaybook };
  const brand = useMemo(
    () => BRAND_MODES.find((b) => b.id === playbook.subBrand) ?? BRAND_MODES[0],
    [playbook.subBrand],
  );
  const kit = KIT_PROFILES_BY_ID[playbook.kitProfileId];
  // Per-asset edits (text blocks, caption, photo panel) for both light and
  // dark variants — same model the social demos and kit builder use.
  const assetEdits = useSocialAssetEdits();
  // Hand-authored playbook copy wins over the seeded module story so the
  // socials speak to the event itself (booth number, "come visit us").
  const source = useMemo(
    () =>
      playbook.socialCopy
        ? ({ kind: "manual", copy: playbook.socialCopy } as const)
        : sourceFromVariant(playbook.seedVariantId, brand),
    [playbook.socialCopy, playbook.seedVariantId, brand],
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

  // NEXT events lead with their own lockup suite: the City Series roadshow
  // uses the City Series mark, every other NEXT edition (London flagship
  // included) uses the master TRANSPERFECT NEXT lockup.
  const nextSuite = useMemo(() => {
    const trackId = nextTrackIdForPlaybook(playbook.id, playbook.name);
    return trackId ? nextLockupSuite(trackId) : undefined;
  }, [playbook.id, playbook.name]);

  // Art direction for this demo set. Each playbook maps to its own authored
  // look; the switcher below lets a user retarget the whole set live and the
  // choice sticks per playbook.
  const [lookId, setLookId] = useState<string>(() => eventLookForPlaybook(playbook.id).id);
  // Look memory is scoped to the DIVISION so an event kit opens in whatever
  // campaign direction the social or digital demos for this brand are already
  // wearing — one campaign look across every channel.
  useEffect(() => {
    const stored = readCampaignLookId(playbook.subBrand);
    setLookId(stored && EVENT_LOOKS_BY_ID[stored] ? stored : eventLookForPlaybook(playbook.id).id);
  }, [playbook.id, playbook.subBrand]);
  const look = lookId.includes("--")
    ? eventLookForPlaybook(playbook.id)
    : eventLookById(lookId);
  const pickLook = (id: string) => {
    setLookId(id);
    saveCampaignLook(playbook.subBrand, { lookId: id });
  };
  // The social template style rides along, so the kit's digital/web trims match
  // the generated social posts for the same campaign.
  const [campaignStyleId, setCampaignStyleId] = useState<string | undefined>(undefined);
  useEffect(() => {
    setCampaignStyleId(readCampaignStyleId(playbook.subBrand) ?? undefined);
  }, [playbook.subBrand]);
  const styleId = campaignStyleId ?? look.styleId;

  const eventLogo = useMemo(
    () =>
      nextSuite
        ? { url: nextSuite.wide.url, ratio: nextSuite.wide.ratio, urlDark: nextSuite.wideWhite.url }
        : undefined,
    [nextSuite],
  );

  // Every demo renders a finished comp for every collateral piece. Playbooks
  // outside the NEXT lockup suites (flagship conference, field events …) fall
  // back to the division lockup so no tile is ever left blank.
  const artworkCtx = useMemo<CollateralContext>(() => {
    const d = playbook.facts.startDate
      ? new Date(playbook.facts.startDate).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Dates TBC";
    const logos = getDivisionLogos(playbook.subBrand);
    const wide = logos?.white ?? logos?.color ?? "/brand-logos/tp-white.png";
    const stacked = logos?.stackedWhite ?? logos?.stackedColor ?? wide;
    return {
      eventName: playbook.facts.name || playbook.name,
      city: playbook.facts.city || nextSuite?.trackName || playbook.chip,
      venue: playbook.facts.venue || "Venue TBC",
      dateLine: d,
      hashtag: playbook.facts.hashtag || "#TransPerfectNEXT",
      url: playbook.facts.registrationUrl || "transperfect.com/next",
      accent: look.accent,
      logoWide: nextSuite?.wide ?? { url: wide, ratio: 4.6 },
      logoStacked: nextSuite?.stacked ?? { url: stacked, ratio: 2.1 },
      logoNeedsKnockout: nextSuite ? undefined : !logos?.white,
      lookId: look.id,
      look,
      styleId,
    };
  }, [nextSuite, playbook, look, styleId]);

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
          background: `linear-gradient(120deg, ${look.accent}22 0%, rgba(255,255,255,0.66) 52%, ${look.accentAlt}18 100%)`,
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
              <CustomizeCampaignButton kind="event" playbook={playbook} />
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

      {/* Look & feel — cinematic photography set */}
      <section>
        <SectionHead
          eyebrow="Look & feel"
          title="Environment reference"
          desc="Photographic direction for this archetype — staging, lighting and texture the kit is designed to sit inside."
        />
        <div className="mt-6">
          <PlaybookGallery
            playbookId={playbook.id}
            accent={look.accent}
            name={playbook.name}
          />
        </div>
      </section>

      {/* Event lockup suite */}
      {nextSuite ? (
        <section>
          <SectionHead
            eyebrow="Event identity"
            title={`${nextSuite.trackName} lockup suite`}
            desc="Approved NEXT 2026 lockups in full colour and all-white. Pick by frame: single-line for banners and wide crops, stacked for square and portrait."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {nextSuite.showcase.map((l) => (
              <div
                key={l.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white/85"
              >
                <div className="flex h-32 items-center justify-center bg-white p-6">
                  <img src={l.color} alt={`${l.label} lockup, full colour`} className="max-h-full w-auto" />
                </div>
                <div className="flex h-32 items-center justify-center bg-[#03002C] p-6">
                  <img src={l.white} alt={`${l.label} lockup, all white`} className="max-h-full w-auto" />
                </div>
                <div className="space-y-1 p-4">
                  <div className="text-sm font-semibold text-[#03002C]">{l.label}</div>
                  <p className="text-xs text-black/55">{l.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
          desc="Rendered right now from the deterministic pipeline on this demo set's own art direction. Switch the look to retarget every asset and collateral comp below."
        />
        <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            Demo look &amp; feel
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {EVENT_LOOKS.map((l) => {
              const active = l.id === look.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => pickLook(l.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/15 bg-white text-[#03002C] hover:border-[#003FC7]/50"
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full border border-black/10"
                    style={{ background: `linear-gradient(135deg,${l.accent},${l.deep})` }}
                  />
                  {l.label}
                  <span className={active ? "text-white/70" : "text-black/40"}>{l.tag}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 max-w-3xl text-xs text-black/60">{look.blurb}</p>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => {
            // Light variants crop the division photography into a designed
            // panel sized to the frame's aspect; dark variants run full bleed.
            const imageUrl = photoForFormat(a.brandId, a.format);
            const panel = a.mode === "light";
            const editKey = socialEditKey(`events-demo:${playbook.id}:${look.id}`, a.id);
            return (
              <AssetPreviewCard
                key={`${look.id}-${a.id}`}
                edit={assetEdits.get(editKey)}
                onEditChange={(next) => assetEdits.set(editKey, next)}
                onEditReset={() => assetEdits.reset(editKey)}
                editKey={editKey}
                rendererProps={{
                  format: a.format,
                  brandId: a.brandId,
                  mode: a.mode,
                  copy: a.copy,
                  facts: {
                    hashtag: playbook.facts.hashtag,
                    registrationUrl: playbook.facts.registrationUrl,
                  },
                  eventLogo,
                  imageUrl,
                  imageLayout: panel ? "panel" : "bleed",
                  imageScrimPct: 60,
                  styleId: resolveSocialStyle(styleId).id as SocialStyleId,
                }}
                badge={imageUrl ? (panel ? "Panel" : "Photo") : undefined}
                formatLabel={a.format.label}
                formatWidth={a.format.width}
                formatHeight={a.format.height}
                mode={a.mode}
              />
            );
          })}
        </div>

      </section>

      {/* Marketing collateral — full kit scope, grouped, with status ribbons */}
      <section>
        <SectionHead
          eyebrow="Ships in kit"
          title="Marketing collateral"
          desc={
            artworkCtx
              ? "Every piece in the production scope, rendered as a demo comp on the event lockup — badges, signage, print, video, digital, email, wearables and merch. Click any tile to enlarge."
              : "The full production scope for this playbook — sponsorship, badges, signage, print, video, digital, email and merch. Pieces flagged live render right now; the rest are on the roadmap."
          }
        />
        <div className="mt-6">
          <CollateralGrid items={getExpandedCollateral(playbook)} artworkCtx={artworkCtx} />
        </div>
      </section>

      {/* KPI targets */}
      <section>
        <SectionHead
          eyebrow="Success"
          title="KPI targets"
          desc="Benchmark rules of thumb from prior runs."
        />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {playbook.kpis.map((k) => (
            <li
              key={k.label}
              className="flex items-baseline justify-between gap-4 rounded-2xl border border-black/10 bg-white/85 p-4"
            >
              <div>
                <div className="text-xs uppercase tracking-widest text-black/50">
                  <Target size={12} className="mr-1 inline" /> {k.label}
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
