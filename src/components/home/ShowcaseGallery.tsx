// Homepage "Finished examples" gallery.
//
// Renders fully-built demo variations (real assets, real brand tokens, real
// copy) so a first-time visitor can see a complete setup end to end instead of
// an empty workspace. Social + event cards render live SocialRenderer previews
// from the same playbook data the /social/demo and /events/demo routes use.

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Printer, Presentation, Share2 } from "lucide-react";

import { BRAND_MODES } from "@/lib/taxonomy";
import { KIT_PROFILES_BY_ID } from "@/lib/social-formats";
import { buildCampaignAssets, sourceFromVariant } from "@/lib/campaigns";
import {
  getSocialPlaybook,
  sourceFromSocialPlaybook,
  factsFromSocialPlaybook,
} from "@/lib/social-playbooks";
import { getPlaybook } from "@/lib/event-playbooks";
import { getPhotoSet, photoForFormat } from "@/lib/social-photography";
import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { AssetPreviewFrame } from "@/components/campaigns/AssetPreviewFrame";

type ShowcaseEntry = {
  id: string;
  surface: "social" | "event";
  playbookId: string;
  blurb: string;
};

const SHOWCASE: ShowcaseEntry[] = [
  {
    id: "sc-anthem",
    surface: "social",
    playbookId: "master-brand-anthem",
    blurb: "House-level anthem: square, story, LinkedIn link and portrait proof card.",
  },
  {
    id: "sc-media",
    surface: "social",
    playbookId: "media-localization-spotlight",
    blurb: "Media & Entertainment spotlight with division photography on every dark variant.",
  },
  {
    id: "sc-legal",
    surface: "social",
    playbookId: "legal-ediscovery-insight",
    blurb: "Legal thought-leadership drumbeat — insight card, stat callout, story.",
  },
  {
    id: "sc-launch",
    surface: "event",
    playbookId: "product-launch",
    blurb: "Day-one launch kit: hero banner, email header, story reel, press callouts.",
  },
  {
    id: "sc-conference",
    surface: "event",
    playbookId: "flagship-conference",
    blurb: "Flagship conference run-of-show with speaker cards and sponsor lockups.",
  },
  {
    id: "sc-lifesci",
    surface: "event",
    playbookId: "life-sciences-summit",
    blurb: "Life Sciences summit kit tuned for regulated-copy review.",
  },
];

const SURFACE_META = {
  social: { label: "Social kit", icon: Share2, accent: "#FF9B70" },
  event: { label: "Event kit", icon: CalendarDays, accent: "#A6FA87" },
} as const;

export function ShowcaseGallery() {
  return (
    <section className="mt-12">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
            Finished examples
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#03002C] dark:text-white">
            Fully built demo setups
          </h2>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            Complete, brand-checked kits — open one to see every asset, phase, and KPI.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link
            to="/social"
            className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            All social →
          </Link>
          <Link
            to="/events"
            className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            All events →
          </Link>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {SHOWCASE.map((entry) => (
          <ShowcaseCard key={entry.id} entry={entry} />
        ))}
        <StructureCard
          to="/templates"
          icon={<Presentation size={16} />}
          accent="#003FC7"
          label="Deck template"
          title="Pulse Fest · full deck build"
          blurb="A finished 12-slide narrative you can fork, edit live, and export to PPTX."
        />
        <StructureCard
          to="/library/print"
          icon={<Printer size={16} />}
          accent="#EC388A"
          label="Print library"
          title="Case study & e-brochure set"
          blurb="Production-ready print layouts with hero media, stats, and export-safe icons."
        />
      </div>
    </section>
  );
}

function ShowcaseCard({ entry }: { entry: ShowcaseEntry }) {
  const meta = SURFACE_META[entry.surface];
  const Icon = meta.icon;

  const built = useMemo(() => {
    if (entry.surface === "social") {
      const pb = getSocialPlaybook(entry.playbookId);
      if (!pb) return null;
      const kit = KIT_PROFILES_BY_ID[pb.kitProfileId];
      const assets = buildCampaignAssets(
        sourceFromSocialPlaybook(pb),
        factsFromSocialPlaybook(pb),
        { formatIds: kit?.formatIds ?? [], mode: "dark", brandId: pb.subBrand },
      );
      return {
        name: pb.name,
        accent: pb.accent,
        chip: pb.chip,
        division: pb.divisionLabel,
        brandId: pb.subBrand,
        assets,
        deliverables: pb.deliverables.length,
        phases: pb.phases.length,
        photo: Boolean(getPhotoSet(pb.subBrand)),
      };
    }
    const pb = getPlaybook(entry.playbookId);
    if (!pb) return null;
    const brand = BRAND_MODES.find((b) => b.id === pb.subBrand) ?? BRAND_MODES[0];
    const kit = KIT_PROFILES_BY_ID[pb.kitProfileId];
    const assets = buildCampaignAssets(sourceFromVariant(pb.seedVariantId, brand), pb.facts, {
      formatIds: kit?.formatIds ?? [],
      mode: "dark",
      brandId: brand.id,
    });
    return {
      name: pb.name,
      accent: pb.accent,
      chip: pb.chip,
      division: pb.facts.city ?? brand.label ?? "TransPerfect",
      brandId: brand.id,
      assets,
      deliverables: pb.deliverables.length,
      phases: pb.phases.length,
      photo: Boolean(getPhotoSet(brand.id)),
    };
  }, [entry]);

  if (!built || built.assets.length === 0) return null;

  const hero = built.assets[0];
  const imageUrl = photoForFormat(built.brandId, hero.format);

  const href =
    entry.surface === "social"
      ? { to: "/social/demo/$playbookId" as const, params: { playbookId: entry.playbookId } }
      : { to: "/events/demo/$playbookId" as const, params: { playbookId: entry.playbookId } };

  return (
    <Link
      {...href}
      className="group flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25"
    >
      <div
        className="flex h-[230px] items-center justify-center overflow-hidden p-4"
        style={{ background: `linear-gradient(140deg, ${built.accent}22, ${built.accent}06)` }}
      >
        <AssetPreviewFrame
          width={hero.format.width}
          height={hero.format.height}
          maxShortEdge={210}
          maxHeight={198}
        >
          {(displayShortEdge) => (
            <SocialRenderer
              format={hero.format}
              brandId={hero.brandId}
              mode={hero.mode}
              copy={hero.copy}
              imageUrl={imageUrl}
              imageScrimPct={62}
              displayShortEdge={displayShortEdge}
            />
          )}
        </AssetPreviewFrame>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
          <span
            className="grid h-6 w-6 place-items-center rounded-lg text-white"
            style={{ background: meta.accent }}
            aria-hidden
          >
            <Icon size={12} />
          </span>
          {meta.label} · {built.chip}
        </div>
        <div className="text-base font-semibold text-[#03002C] dark:text-white">{built.name}</div>
        <p className="text-xs leading-relaxed text-black/60 dark:text-white/60">{entry.blurb}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-[11px] text-black/55 dark:text-white/55">
          <Pill>{built.assets.length} rendered sizes</Pill>
          <Pill>{built.deliverables} deliverables</Pill>
          <Pill>{built.phases} phases</Pill>
          {built.photo ? <Pill>Photography</Pill> : null}
        </div>
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[#003FC7] dark:text-[#A1FBF9]">
          Open full example{" "}
          <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/10">
      {children}
    </span>
  );
}

function StructureCard({
  to,
  icon,
  accent,
  label,
  title,
  blurb,
}: {
  to: string;
  icon: React.ReactNode;
  accent: string;
  label: string;
  title: string;
  blurb: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25"
    >
      <div
        className="flex h-[230px] items-center justify-center"
        style={{ background: `linear-gradient(140deg, ${accent}22, ${accent}06)` }}
      >
        <span
          className="grid h-16 w-16 place-items-center rounded-2xl text-white"
          style={{ background: accent }}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
          {label}
        </div>
        <div className="text-base font-semibold text-[#03002C] dark:text-white">{title}</div>
        <p className="text-xs leading-relaxed text-black/60 dark:text-white/60">{blurb}</p>
        <div className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-medium text-[#003FC7] dark:text-[#A1FBF9]">
          Open <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
