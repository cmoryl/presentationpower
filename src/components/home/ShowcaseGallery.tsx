// Homepage "Finished examples" gallery.
//
// Renders fully-built demo setups across all four Elements — Presentation,
// Print, Event, Social. Nothing here is a mock: presentation cards expand into
// real editable decks (authored copy, style pack, transitions), print cards
// deep-link to curated production layouts, and event/social cards render live
// SocialRenderer previews from the same playbook data /events/demo and
// /social/demo use. Hyper-real photography backs every card.

import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Presentation,
  Printer,
  Share2,
} from "lucide-react";

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
import { RegenerateApprovedCopiesButton } from "@/components/home/RegenerateApprovedCopiesButton";
import { PRINT_DEMOS } from "@/lib/showcase-print";
import { DemoTranslateBar, useDemoTranslate } from "@/components/demo/DemoTranslate";

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

/* ---------------- on-the-fly translation ---------------- */

/** Every translatable string a gallery card shows, keyed by card/demo id. */
type GalleryText = {
  id: string;
  title: string;
  blurb: string;
  label: string;
  pillsFeature: string[];
  pillsRail: string[];
  /** Live social/event cards only. */
  chip?: string;
  /** Live cards only — the SocialRenderer copy of the hero asset. */
  heroCopy?: unknown;
};

type ShowcasePreview = {
  name: string;
  accent: string;
  chip: string;
  brandId: string;
  assets: ReturnType<typeof buildCampaignAssets>;
  deliverables: number;
  phases: number;
  photo: boolean;
};

/** Builds the live social/event preview for a showcase entry (pure, memo-friendly). */
function buildShowcasePreview(entry: ShowcaseEntry): ShowcasePreview | null {
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
}

export function ShowcaseGallery() {
  // Pre-build the live social/event previews once so the translate pass can
  // include their rendered copy and cards never rebuild per render.
  const livePreviews = useMemo(
    () => SHOWCASE.map((entry) => ({ entry, built: buildShowcasePreview(entry) })),
    [],
  );

  // One translatable text bundle per card on the wall — titles, blurbs,
  // labels, pills, and the live preview copy. ~35 items, under the cap.
  const textItems = useMemo<GalleryText[]>(
    () => [
      ...SHOWCASE_DECKS.map((d) => ({
        id: d.id,
        title: d.name,
        blurb: d.blurb,
        label: `Deck · ${d.eyebrow}`,
        pillsFeature: [
          `${d.build().slides.length} slides`,
          "Authored copy",
          "Style pack set",
          "PPTX + PDF",
        ],
        pillsRail: [`${d.build().slides.length} slides`, "PPTX + PDF"],
      })),
      ...PRINT_DEMOS.map((p) => ({
        id: p.id,
        title: p.name,
        blurb: p.blurb,
        label: `Print · ${p.eyebrow}`,
        pillsFeature: p.pills,
        pillsRail: p.pills.slice(0, 2),
      })),
      ...livePreviews.flatMap(({ entry, built }) =>
        built
          ? [
              {
                id: entry.id,
                title: built.name,
                blurb: entry.blurb,
                label: SURFACE_META[entry.surface].label,
                pillsFeature: [] as string[],
                pillsRail: [] as string[],
                chip: built.chip,
                heroCopy: built.assets[0]?.copy,
              },
            ]
          : [],
      ),
    ],
    [livePreviews],
  );

  const tx = useDemoTranslate(textItems);
  const textById = useMemo(() => {
    const m = new Map<string, GalleryText>();
    for (const t of tx.items) m.set(t.id, t);
    return m;
  }, [tx.items]);

  return (
    <section className="mt-12" dir={tx.rtl ? "rtl" : "ltr"}>
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
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <RegenerateApprovedCopiesButton />
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

      <DemoTranslateBar
        className="mb-5"
        lang={tx.lang}
        setLang={tx.setLang}
        busy={tx.busy}
        error={tx.error}
        isTranslated={tx.isTranslated}
        note="Switch language and every card on this wall — including the live social and event previews — translates on the fly. Nothing is saved."
      />

      {/* Top line — the hero pair, full size. */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {SHOWCASE_DECKS.slice(0, 2).map((d, i) => {
          const t = textById.get(d.id);
          return (
            <MediaCard
              key={d.id}
              feature={i === 0}
              to={{ to: "/demo/deck/$demoId", params: { demoId: d.id } }}
              art={showcaseArt(d.id).src}
              artAlt={showcaseArt(d.id).alt}
              accent={d.accent}
              icon={<Presentation size={12} />}
              label={t?.label ?? `Deck · ${d.eyebrow}`}
              title={t?.title ?? d.name}
              blurb={t?.blurb ?? d.blurb}
              pills={
                t?.pillsFeature ?? [
                  `${d.build().slides.length} slides`,
                  "Authored copy",
                  "Style pack set",
                  "PPTX + PDF",
                ]
              }
            />
          );
        })}
      </div>

      {/* Second line — everything else, as a horizontal scroll rail. */}
      <ScrollRail count={SHOWCASE_DECKS.length - 2 + PRINT_DEMOS.length + SHOWCASE.length}>
        {SHOWCASE_DECKS.slice(2).map((d) => {
          const t = textById.get(d.id);
          return (
            <RailItem key={d.id}>
              <MediaCard
                compact
                to={{ to: "/demo/deck/$demoId", params: { demoId: d.id } }}
                art={showcaseArt(d.id).src}
                artAlt={showcaseArt(d.id).alt}
                accent={d.accent}
                icon={<Presentation size={12} />}
                label={t?.label ?? `Deck · ${d.eyebrow}`}
                title={t?.title ?? d.name}
                blurb={t?.blurb ?? d.blurb}
                pills={t?.pillsRail ?? [`${d.build().slides.length} slides`, "PPTX + PDF"]}
              />
            </RailItem>
          );
        })}

        {PRINT_DEMOS.map((p) => {
          const t = textById.get(p.id);
          return (
            <RailItem key={p.id}>
              <MediaCard
                compact
                to={{ to: "/demo/print/$demoId", params: { demoId: p.id } }}
                art={showcaseArt(p.id).src}
                artAlt={showcaseArt(p.id).alt}
                accent={p.accent}
                icon={<Printer size={12} />}
                label={t?.label ?? `Print · ${p.eyebrow}`}
                title={t?.title ?? p.name}
                blurb={t?.blurb ?? p.blurb}
                pills={t?.pillsRail ?? p.pills.slice(0, 2)}
              />
            </RailItem>
          );
        })}

        {livePreviews.map(({ entry, built }) => (
          <RailItem key={entry.id}>
            <ShowcaseCard entry={entry} compact built={built} text={textById.get(entry.id)} />
          </RailItem>
        ))}
      </ScrollRail>
    </section>
  );
}

/* ---------------- horizontal scroll rail ---------------- */

function RailItem({ children }: { children: React.ReactNode }) {
  return <div className="w-[264px] shrink-0 snap-start sm:w-[292px]">{children}</div>;
}

function ScrollRail({ children, count }: { children: React.ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Vertical mouse wheel over the rail scrolls it horizontally, and we only
  // swallow the gesture while there is still track left in that direction.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      const next = el.scrollLeft + e.deltaY;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1))
        return;
      e.preventDefault();
      el.scrollLeft = Math.max(0, Math.min(max, next));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] text-black/50 dark:text-white/50">
          {count} more finished demos — scroll across
        </div>
        <div className="flex items-center gap-2">
          <RailButton label="Scroll left" onClick={() => nudge(-1)}>
            <ChevronLeft size={16} strokeWidth={1.75} />
          </RailButton>
          <RailButton label="Scroll right" onClick={() => nudge(1)}>
            <ChevronRight size={16} strokeWidth={1.75} />
          </RailButton>
        </div>
      </div>
      <div className="relative">
        <div
          ref={ref}
          className="tp-no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function RailButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-black/12 text-[#03002C] transition hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

/* ---------------- generic photo-backed card ---------------- */

type CardLink =
  | { to: "/demo/deck/$demoId"; params: { demoId: string } }
  | { to: "/demo/print/$demoId"; params: { demoId: string } }
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
  feature = false,
  compact = false,
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
  /** Feature cards span two columns with a taller, cinematic art plate. */
  feature?: boolean;
  /** Compact cards live in the horizontal rail: shorter plate, tighter copy. */
  compact?: boolean;
}) {
  const linkProps = to as unknown as React.ComponentProps<typeof Link>;
  return (
    <Link
      {...linkProps}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25 ${
        feature ? "sm:col-span-2" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          feature ? "h-[300px] sm:h-[360px]" : compact ? "h-[148px]" : "h-[230px]"
        }`}
      >
        <img
          src={art}
          alt={artAlt}
          loading="lazy"
          width={1536}
          height={1024}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${
            feature ? "tp-kenburns" : ""
          }`}
        />
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${accent}00 34%, ${accent}CC 100%)`,
          }}
        />
        <span aria-hidden className="absolute bottom-0 left-0 flex h-1.5 w-full">
          {[0.9, 0.5, 0.28, 0.5, 0.9].map((o, i) => (
            <span key={i} className="flex-1" style={{ background: accent, opacity: o }} />
          ))}
        </span>
      </div>

      <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-4" : "p-5"}`}>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
          <span
            className="grid h-6 w-6 place-items-center rounded-lg text-white"
            style={{ background: accent }}
            aria-hidden
          >
            {icon}
          </span>
          {label}
          {feature ? (
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[10px] tracking-[0.18em] text-white"
              style={{ background: accent }}
            >
              Featured
            </span>
          ) : null}
        </div>
        <div
          className={`font-semibold text-[#03002C] dark:text-white ${
            feature ? "text-[22px] tracking-[-0.02em] sm:text-[26px]" : "text-base"
          }`}
        >
          {title}
        </div>
        <p
          className={`text-xs leading-relaxed text-black/60 dark:text-white/60 ${
            compact ? "line-clamp-2" : ""
          }`}
        >
          {blurb}
        </p>
        <div
          className={`mt-auto flex flex-wrap items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 ${
            compact ? "pt-2" : "pt-3"
          }`}
        >
          {pills.map((p) => (
            <Pill key={p}>{p}</Pill>
          ))}
        </div>
        <div
          className={`inline-flex items-center gap-1 text-[11px] font-medium text-[#003FC7] dark:text-[#A1FBF9] ${
            compact ? "mt-2" : "mt-3"
          }`}
        >
          Open full example{" "}
          <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/* ---------------- live-rendered social / event cards ---------------- */

function ShowcaseCard({
  entry,
  compact = false,
  built,
  text,
}: {
  entry: ShowcaseEntry;
  compact?: boolean;
  /** Pre-built preview from the gallery — shared with the translate pass. */
  built: ShowcasePreview | null;
  /** Translated card text + live hero copy (falls back to source when unset). */
  text?: GalleryText;
}) {
  const meta = SURFACE_META[entry.surface];
  const Icon = meta.icon;

  if (!built || built.assets.length === 0) return null;

  const hero = built.assets[0];
  const heroCopy = (text?.heroCopy ?? hero.copy) as typeof hero.copy;
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
        className={`relative flex items-center justify-center overflow-hidden p-4 ${
          compact ? "h-[148px]" : "h-[230px]"
        }`}
      >
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
            maxShortEdge={compact ? 150 : 210}
            maxHeight={compact ? 122 : 198}
          >
            {(displayShortEdge) => (
              <SocialRenderer
                format={hero.format}
                brandId={hero.brandId}
                mode={hero.mode}
                copy={heroCopy}
                imageUrl={imageUrl}
                imageScrimPct={62}
                displayShortEdge={displayShortEdge}
              />
            )}
          </AssetPreviewFrame>
        </div>
      </div>

      <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-4" : "p-5"}`}>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
          <span
            className="grid h-6 w-6 place-items-center rounded-lg text-white"
            style={{ background: meta.accent }}
            aria-hidden
          >
            <Icon size={12} />
          </span>
          {text?.label ?? meta.label} · {text?.chip ?? built.chip}
        </div>
        <div className="text-base font-semibold text-[#03002C] dark:text-white">
          {text?.title ?? built.name}
        </div>
        <p
          className={`text-xs leading-relaxed text-black/60 dark:text-white/60 ${
            compact ? "line-clamp-2" : ""
          }`}
        >
          {text?.blurb ?? entry.blurb}
        </p>
        <div
          className={`mt-auto flex flex-wrap items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55 ${
            compact ? "pt-2" : "pt-3"
          }`}
        >
          <Pill>{built.assets.length} rendered sizes</Pill>
          {compact ? null : <Pill>{built.deliverables} deliverables</Pill>}
          <Pill>{built.phases} phases</Pill>
          {built.photo && !compact ? <Pill>Photography</Pill> : null}
        </div>
        <div
          className={`inline-flex items-center gap-1 text-[11px] font-medium text-[#003FC7] dark:text-[#A1FBF9] ${
            compact ? "mt-2" : "mt-3"
          }`}
        >
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
