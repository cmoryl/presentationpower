// Homepage "Finished examples" gallery.
//
// Renders fully-built demo setups across all four Elements — Presentation,
// Print, Event, Social. Nothing here is a mock: presentation cards expand into
// real editable decks (authored copy, style pack, transitions), print cards
// deep-link to curated production layouts, and event/social cards render live
// SocialRenderer previews from the same playbook data /events/demo and
// /social/demo use. Hyper-real photography backs every card.

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Presentation, Printer, Share2 } from "lucide-react";

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
import { SHOWCASE_DECKS } from "@/lib/showcase-decks";
import { showcaseArt } from "@/lib/showcase-art";
import { PRINT_DEMOS } from "@/lib/showcase-print";


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
    blurb: "Legal insight drop: authority-led statements, dark variants, quote card and carousel.",
  },
  {
    id: "sc-gaming",
    surface: "social",
    playbookId: "gaming-scale-drop",
    blurb: "Gaming scale drop with neon accents, vertical story cuts and launch-day countdown.",
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
    id: "sc-legaltech",
    surface: "event",
    playbookId: "legaltech-day",
    blurb: "Legal-tech day: roundtable signage, agenda boards and panel speaker cards.",
  },
  {
    id: "sc-gaming-party",
    surface: "event",
    playbookId: "gaming-launch-party",
    blurb: "Launch party kit: LED stage plates, invite set and social cut-downs.",
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
            Complete, ready-to-ship demos
          </h2>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">
            End to end across every element — real copy, real photography, real export paths. Open
            one and edit it as your own.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            to="/library/print"
            className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            All print →
          </Link>
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
        {SHOWCASE_DECKS.map((d) => (
          <MediaCard
            key={d.id}
            to={{ to: "/demo/deck/$demoId", params: { demoId: d.id } }}
            art={showcaseArt(d.id).src}
            artAlt={showcaseArt(d.id).alt}
            accent={d.accent}
            icon={<Presentation size={12} />}
            label={`Deck · ${d.eyebrow}`}
            title={d.name}
            blurb={d.blurb}
            pills={[
              `${d.build().slides.length} slides`,
              "Authored copy",
              "Style pack set",
              "PPTX + PDF",
            ]}
          />
        ))}

        {PRINT_DEMOS.map((p) => (
          <MediaCard
            key={p.id}
            to={{ to: "/library/print", search: p.search }}
            art={showcaseArt(p.id).src}
            artAlt={showcaseArt(p.id).alt}
            accent={p.accent}
            icon={<Printer size={12} />}
            label={p.label}
            title={p.title}
            blurb={p.blurb}
            pills={[...p.pills]}
          />
        ))}

        {SHOWCASE.map((entry) => (
          <ShowcaseCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

/* ---------------- generic photo-backed card ---------------- */

type CardLink =
  | { to: "/demo/deck/$demoId"; params: { demoId: string } }
  | { to: "/library/print"; search: { division: string; type: string; q: string } };

function MediaCard({
  to,
  art,
  artAlt,
  accent,
  icon,
  label,
  title,
  blurb,
  pills,
}: {
  to: CardLink;
  art: string;
  artAlt: string;
  accent: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  blurb: string;
  pills: string[];
}) {
  const linkProps = to as unknown as React.ComponentProps<typeof Link>;
  return (
    <Link
      {...linkProps}
      className="group flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25"
    >
      <div className="relative h-[230px] overflow-hidden">
        <img
          src={art}
          alt={artAlt}
          loading="lazy"
          width={1536}
          height={1024}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${accent}00 34%, ${accent}CC 100%)`,
          }}
        />
        <span
          aria-hidden
          className="absolute bottom-0 left-0 flex h-1.5 w-full"
        >
          {[0.9, 0.5, 0.28, 0.5, 0.9].map((o, i) => (
            <span key={i} className="flex-1" style={{ background: accent, opacity: o }} />
          ))}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
          <span
            className="grid h-6 w-6 place-items-center rounded-lg text-white"
            style={{ background: accent }}
            aria-hidden
          >
            {icon}
          </span>
          {label}
        </div>
        <div className="text-base font-semibold text-[#03002C] dark:text-white">{title}</div>
        <p className="text-xs leading-relaxed text-black/60 dark:text-white/60">{blurb}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-[11px] text-black/55 dark:text-white/55">
          {pills.map((p) => (
            <Pill key={p}>{p}</Pill>
          ))}
        </div>
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[#003FC7] dark:text-[#A1FBF9]">
          Open full example{" "}
          <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/* ---------------- live-rendered social / event cards ---------------- */

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
      <div className="relative flex h-[230px] items-center justify-center overflow-hidden p-4">
        <img
          src={showcaseArt(entry.id).src}
          alt=""
          aria-hidden
          loading="lazy"
          width={1536}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span
          aria-hidden
          className="absolute inset-0 backdrop-blur-[2px]"
          style={{
            background: `linear-gradient(150deg, ${built.accent}D9, ${built.accent}66 55%, #03002CCC)`,
          }}
        />
        <div className="relative">
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
