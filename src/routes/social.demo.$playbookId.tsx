// /social/demo/$playbookId — live division-scoped social campaign preview.
//
// Mirrors /events/demo/$playbookId but sources from src/lib/social-playbooks.ts
// so every TransPerfect division has a rendered, brand-appropriate demo kit.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  SOCIAL_STYLES,
  DEFAULT_SOCIAL_STYLE_ID,
  resolveSocialStyle,
  type SocialStyleId,
} from "@/lib/social-styles";

import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Target,
  Share2,
  Layers,
  BadgeCheck,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import { getPhotoSet, photoForFormat } from "@/lib/social-photography";
import { readCampaignLookId, readCampaignStyleId, saveCampaignLook } from "@/lib/campaign-look";
import {
  channelLook,
  eventLookById,
  reinkLook,
  EVENT_LOOKS,
  EVENT_LOOKS_BY_ID,
} from "@/lib/event-looks";

import {
  getSocialPlaybook,
  SOCIAL_PLAYBOOKS,
  sourceFromSocialPlaybook,
  factsFromSocialPlaybook,
  getExpandedSocialCollateral,
  type SocialPlaybook,
} from "@/lib/social-playbooks";
import { CollateralGrid } from "@/components/campaigns/CollateralGrid";
import type { CollateralContext } from "@/components/events/CollateralArtwork";
import { getDivisionLogos } from "@/lib/division-logos";
import { KIT_PROFILES_BY_ID, SOCIAL_FORMATS_BY_ID } from "@/lib/social-formats";
import { BRAND_MODES } from "@/lib/taxonomy";
import { buildCampaignAssets } from "@/lib/campaigns";
import { AssetPreviewCard } from "@/components/campaigns/AssetPreviewCard";
import { useSocialAssetEdits, socialEditKey } from "@/lib/social-asset-edit";
import { DemoTranslateBar, useDemoTranslate } from "@/components/demo/DemoTranslate";
import { ForkPresetButton } from "@/components/campaigns/ForkPresetButton";
import { CustomizeCampaignButton } from "@/components/campaigns/CustomizeCampaignButton";

export const Route = createFileRoute("/social/demo/$playbookId")({
  loader: ({ params }) => {
    const playbook = getSocialPlaybook(params.playbookId);
    if (!playbook) throw notFound();
    return { playbook };
  },
  head: ({ params }) => {
    const p = getSocialPlaybook(params.playbookId);
    const title = p ? `${p.name} · Live social kit demo` : "Social demo";
    const desc = p?.intent ?? "Live preview of a full social campaign kit.";
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
      <SocialDemoView />
    </AppShell>
  ),
});

function SocialDemoView() {
  const { playbook } = Route.useLoaderData() as { playbook: SocialPlaybook };
  const brand = useMemo(
    () => BRAND_MODES.find((b) => b.id === playbook.subBrand) ?? BRAND_MODES[0],
    [playbook.subBrand],
  );
  const kit = KIT_PROFILES_BY_ID[playbook.kitProfileId];
  const photoSet = getPhotoSet(playbook.subBrand);
  // Art direction. A social kit wears the SAME authored look family as its
  // division's event collateral (`channelLook`), so posts, event artwork and
  // print comps for one division read as one campaign end to end. The switcher
  // below retargets the whole set live and the choice sticks per playbook,
  // exactly like the events demo.
  const baseLook = useMemo(
    () =>
      channelLook({
        key: `social:${playbook.id}`,
        brandId: playbook.subBrand,
        intentId: playbook.angle,
        accent: playbook.accent,
      }),
    [playbook.id, playbook.subBrand, playbook.angle, playbook.accent],
  );
  const [lookId, setLookId] = useState<string>(() => baseLook.id);
  // Look memory is scoped to the DIVISION, not this route: if the user already
  // picked an art direction on the events or digital demo for this brand, the
  // social kit opens in that same campaign look, and vice versa.
  useEffect(() => {
    const stored = readCampaignLookId(playbook.subBrand);
    setLookId(stored && EVENT_LOOKS_BY_ID[stored] ? stored : baseLook.id);
  }, [playbook.subBrand, baseLook.id]);
  // The division's own accent always re-inks whichever look is active, so a
  // retarget changes the field graphic and type — never the brand colour.
  const look = useMemo(
    () => (lookId === baseLook.id ? baseLook : reinkLook(eventLookById(lookId), playbook.accent)),
    [lookId, baseLook, playbook.accent],
  );

  const pickLook = (id: string) => {
    setLookId(id);
    saveCampaignLook(playbook.subBrand, { lookId: id });
  };
  const [styleId, setStyleId] = useState<SocialStyleId>(
    () => (baseLook.styleId as SocialStyleId) ?? DEFAULT_SOCIAL_STYLE_ID,
  );
  // The look owns the template style: retargeting the art direction restyles
  // every rendered asset, and the style chips still allow a manual override.
  useEffect(() => {
    const stored = readCampaignStyleId(playbook.subBrand);
    setStyleId(stored ?? (look.styleId as SocialStyleId) ?? DEFAULT_SOCIAL_STYLE_ID);
  }, [look.styleId, playbook.subBrand]);
  const pickStyle = (id: SocialStyleId) => {
    setStyleId(id);
    saveCampaignLook(playbook.subBrand, { styleId: id });
  };
  const activeStyle = resolveSocialStyle(styleId);

  const source = useMemo(() => sourceFromSocialPlaybook(playbook), [playbook]);
  const facts = useMemo(() => factsFromSocialPlaybook(playbook), [playbook]);

  // Collateral artwork context — the collateral grid renders a finished demo
  // asset for every piece in the kit, skinned with this division's lockup,
  // accent and campaign copy.
  const artworkCtx = useMemo<CollateralContext>(() => {
    const logos = getDivisionLogos(playbook.subBrand);
    const wide = logos?.white ?? logos?.color ?? "/brand-logos/tp-white.png";
    const stacked = logos?.stackedWhite ?? logos?.stackedColor ?? wide;
    // Divisions without a white lockup on disk fall back to the colour file,
    // which needs knocking out so it reads on the dark artwork fields.
    const needsKnockout = !logos?.white;
    return {
      eventName: playbook.copy.title,
      city: playbook.divisionLabel,
      venue: playbook.tagline,
      dateLine: playbook.chip,
      hashtag: `#${playbook.divisionLabel.replace(/[^A-Za-z0-9]/g, "")}`,
      url: "transperfect.com",
      accent: playbook.accent,
      logoWide: { url: wide, ratio: 4.6 },
      logoStacked: { url: stacked, ratio: 2.1 },
      logoNeedsKnockout: needsKnockout,
      lookId: look.id,
      look,
      styleId,
      // Division photography — the digital/social trims paint from the same
      // photo set as the generated posts so the kit reads end-to-end.
      photo: getPhotoSet(playbook.subBrand),
    };
  }, [playbook, look, styleId]);

  const assets = useMemo(
    () =>
      buildCampaignAssets(source, facts, {
        formatIds: kit?.formatIds ?? [],
        mode: "both",
        brandId: playbook.subBrand,
      }),
    [source, facts, kit, playbook.subBrand],
  );
  const assetEdits = useSocialAssetEdits();

  // Language preview: rendered asset copy is translated in place so the whole
  // kit previews localized while art direction and photography stay identical.
  const tx = useDemoTranslate(assets as unknown[]);
  const localizedAssets = (tx.isTranslated ? (tx.items as typeof assets) : assets) ?? assets;

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-black/50">
        <Link to="/social" className="inline-flex items-center gap-1 hover:text-[#003FC7]">
          <ArrowLeft size={12} /> All playbooks
        </Link>
        <span aria-hidden>·</span>
        <span>{playbook.divisionLabel}</span>
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
              <Share2 size={12} /> {playbook.chip} · Live demo
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
              {playbook.name}
            </h1>
            <p className="max-w-2xl text-base text-black/65">{playbook.intent}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <CustomizeCampaignButton kind="social" playbook={playbook} />
              <ForkPresetButton kind="social" playbook={playbook} />
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
            <FactRow icon={<BadgeCheck size={12} />} label="Division">
              <span className="font-semibold text-[#03002C]">{playbook.divisionLabel}</span>
            </FactRow>
            <FactRow icon={<Share2 size={12} />} label="Angle">
              {playbook.chip}
            </FactRow>
            <FactRow icon={<Layers size={12} />} label="Kit profile">
              {kit?.label ?? "Custom"}
            </FactRow>
            <FactRow icon={<Star size={12} />} label="Seed module">
              <span className="font-mono text-xs">{playbook.seedVariantId}</span>
            </FactRow>
            <FactRow icon={<Sparkles size={12} />} label="Palette">
              {brand.name}
            </FactRow>
            <FactRow icon={<Target size={12} />} label="Formats">
              {kit?.formatIds.length ?? 0} × light+dark
            </FactRow>
          </dl>
        </div>
      </header>

      {/* Cadence */}
      <section>
        <SectionHead
          eyebrow="Cadence"
          title="Post schedule"
          desc="Each beat ships a small format bundle so the story keeps moving without asset thrash."
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
          title={`${localizedAssets.length} rendered assets · light + dark`}
          desc={
            photoSet
              ? "Rendered right now from the deterministic pipeline. Dark variants use the division photography set — each ad size pulls the crop built for its aspect."
              : "Rendered right now from the deterministic pipeline. Configure to swap copy and cadence."
          }
        />
        {/* Art direction — the same look family this division's event
            collateral wears, so every channel stays cohesive. */}
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
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/15 bg-white text-[#03002C] hover:border-[#003FC7]/50"
                  }`}
                >
                  {l.label}
                  <span className={active ? "ml-2 text-white/70" : "ml-2 text-black/40"}>
                    {l.tag}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 max-w-3xl text-xs text-black/60">{look.blurb}</p>
        </div>
        <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            Template style
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SOCIAL_STYLES.map((s) => {
              const active = s.id === styleId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStyle(s.id)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/15 bg-white text-[#03002C] hover:border-[#003FC7]/50"
                  }`}
                >
                  {s.label}
                  <span className={active ? "ml-2 text-white/70" : "ml-2 text-black/40"}>
                    {s.tag}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 max-w-3xl text-xs text-black/60">{activeStyle.blurb}</p>
        </div>
        {photoSet ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-xs text-black/60">
            <ImageIcon size={14} className="text-[#003FC7]" />
            <span className="font-semibold text-[#03002C]">{photoSet.label}</span>
            <span aria-hidden>·</span>
            <span>{photoSet.credit} — wide, square and vertical crops</span>
          </div>
        ) : null}
        <DemoTranslateBar
          className="mt-4"
          lang={tx.lang}
          setLang={tx.setLang}
          busy={tx.busy}
          error={tx.error}
          isTranslated={tx.isTranslated}
          note="Preview the whole kit in another language. Every rendered post re-paints with translated copy — format, photography and lockups stay untouched."
        />
        <div
          className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          dir={tx.rtl ? "rtl" : undefined}
        >
          {localizedAssets.map((a) => {
            // Both modes carry photography now. Dark variants run the photo
            // full bleed; light variants crop it into a designed panel sized to
            // the frame's own aspect, with the copy owning the rest.
            const imageUrl = photoForFormat(playbook.subBrand, a.format);
            const panel = a.mode === "light";
            const editKey = socialEditKey(`social-demo:${playbook.id}:${styleId}`, a.id);
            return (
              <AssetPreviewCard
                key={`${styleId}-${tx.lang}-${a.id}`}
                edit={assetEdits.get(editKey)}
                onEditChange={(next) => assetEdits.set(editKey, next)}
                onEditReset={() => assetEdits.reset(editKey)}
                editKey={editKey}
                rendererProps={{
                  format: a.format,
                  brandId: a.brandId,
                  mode: a.mode,
                  copy: a.copy,
                  imageUrl,
                  imageLayout: panel ? "panel" : "bleed",
                  imageScrimPct: 62,
                  styleId,
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
          desc="The full production scope for this campaign — feed, story, reels, ad variants, PR headers, newsletter, employee advocacy and more. Pieces flagged live render right now; the rest are on the roadmap."
        />
        <div className="mt-6">
          <CollateralGrid items={getExpandedSocialCollateral(playbook)} artworkCtx={artworkCtx} />
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

      {/* Related */}
      <section>
        <SectionHead eyebrow="Related" title="Other division playbooks" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SOCIAL_PLAYBOOKS.filter((p) => p.id !== playbook.id)
            .slice(0, 4)
            .map((p) => (
              <Link
                key={p.id}
                to="/social/demo/$playbookId"
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
        <div className="mt-4 text-right">
          <Link to="/social" className="text-xs font-medium text-[#003FC7]">
            View all {SOCIAL_PLAYBOOKS.length} playbooks →
          </Link>
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
