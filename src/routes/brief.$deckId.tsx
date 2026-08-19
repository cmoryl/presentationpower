import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Layers,
  Megaphone,
  Play,
  Presentation,
  Share2,
  Sparkles,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { useDeckStore } from "@/lib/deck-store";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { getPlaybook, getExpandedCollateral } from "@/lib/event-playbooks";
import { getSocialPlaybook } from "@/lib/social-playbooks";

export const Route = createFileRoute("/brief/$deckId")({
  head: () => ({
    meta: [
      { title: "Brief output hub · TransPerfect Element" },
      {
        name: "description",
        content:
          "Every asset a single brief produced — sales presentation, print leave-behinds, event collateral and social campaign — grouped by marketing channel.",
      },
      { property: "og:title", content: "Brief output hub · TransPerfect Element" },
      {
        property: "og:description",
        content: "See the full asset set one brief generated, organised by marketing channel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BriefOutputHub,
});

const KIND_LABELS: Record<string, string> = {
  "case-study": "Case study",
  spotlight: "Client spotlight",
  ebrochure: "eBrochure",
  "adaptor-brief": "Adaptor brief",
};

function kindLabel(kind: string) {
  return KIND_LABELS[kind] ?? kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Landing page a brief drops the user on once generation finishes. Rather than
 * dumping them straight into one editor, it lays out every artifact the brief
 * produced, grouped by the marketing area it serves, so the whole set reads as
 * one campaign instead of four disconnected files.
 */
function BriefOutputHub() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck?.briefId ? s.briefs[deck.briefId] : undefined));

  const brand = useMemo(
    () => (deck ? resolveBrandMode(deck.brandModeId, deck.subCompany) : null),
    [deck],
  );
  const brandLabel =
    BRAND_MODES.find((b) => b.id === deck?.brandModeId)?.name ?? brand?.name ?? "TransPerfect";

  const masterSet = deck?.context?.masterSet;
  const prints = masterSet?.printAssets ?? [];
  const eventPb = masterSet?.eventPlaybookId ? getPlaybook(masterSet.eventPlaybookId) : undefined;
  const socialPb = masterSet?.socialPlaybookId
    ? getSocialPlaybook(masterSet.socialPlaybookId)
    : undefined;
  const eventCollateral = eventPb ? getExpandedCollateral(eventPb) : [];
  const cover = deck?.slides[0];
  const coverVariant = cover ? byId(MODULE_VARIANTS, cover.variantId) : undefined;

  if (!deck) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Brief not found</h1>
          <p className="mt-2 text-sm text-black/60">
            This brief isn't in this browser's workspace. Open it from your deck library instead.
          </p>
          <Link
            to="/decks"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white"
          >
            Go to decks <ArrowRight size={15} strokeWidth={1.75} />
          </Link>
        </div>
      </AppShell>
    );
  }

  const accent = brand?.tokens?.accent || "#A1FBF9";
  const primary = brand?.tokens?.primary || "#003FC7";

  const totalAssets =
    1 + prints.length + (eventPb ? eventCollateral.length : 0) + (socialPb ? socialPb.deliverables.length : 0);

  const areas = [
    {
      id: "sales",
      count: 1,
      label: "Sales enablement",
      icon: Presentation,
    },
    { id: "print", count: prints.length, label: "Print & leave-behinds", icon: FileText },
    {
      id: "event",
      count: eventPb ? eventCollateral.length : 0,
      label: "Event & field",
      icon: CalendarDays,
    },
    {
      id: "social",
      count: socialPb ? socialPb.deliverables.length : 0,
      label: "Social & demand gen",
      icon: Megaphone,
    },
  ].filter((a) => a.count > 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        {/* ---- Brief summary ------------------------------------------- */}
        <header
          className="relative overflow-hidden rounded-3xl border border-black/[0.06] px-7 py-8"
          style={{
            background: `linear-gradient(135deg, ${primary}0D 0%, ${accent}26 100%)`,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
                <Sparkles size={12} strokeWidth={1.75} />
                Brief complete
              </span>
              <h1 className="mt-4 max-w-3xl text-[34px] font-semibold leading-[1.06] tracking-[-0.02em] text-[#03002C]">
                {brief?.prospect || deck.title}
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-[1.5] text-black/60">
                {brief?.meetingObjective ||
                  "Everything this brief generated, grouped by the marketing area it serves."}
              </p>

              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                {[
                  ["Brand mode", brandLabel],
                  ["Industry", brief?.industry || "—"],
                  ["Audience", brief?.audience || "—"],
                  [
                    "Generated",
                    new Date(deck.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                      {k}
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-medium text-[#03002C]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-black/[0.07] bg-white/80 px-5 py-4 text-center backdrop-blur">
              <div className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#03002C]">
                {totalAssets}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
                assets ready
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {areas.map((a) => (
                  <a
                    key={a.id}
                    href={`#${a.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1 text-[11px] text-black/65 transition hover:border-[#003FC7]/40 hover:text-[#003FC7]"
                  >
                    <a.icon size={12} strokeWidth={1.75} />
                    {a.count}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {deck.context?.assetRequest?.text ? (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-black/[0.07] bg-white/70 px-4 py-3">
              <Target size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[#003FC7]" />
              <p className="text-[13px] leading-[1.5] text-black/70">
                <span className="font-medium text-[#03002C]">You asked for:</span>{" "}
                {deck.context.assetRequest.text}
              </p>
            </div>
          ) : null}
        </header>

        {/* ---- Sales enablement ---------------------------------------- */}
        <Section
          id="sales"
          icon={Presentation}
          kicker="Sales enablement"
          title="The narrative deck"
          blurb="Your first-meeting story — open it to edit, present live, or export to PowerPoint."
        >
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Link
              to="/decks/$deckId"
              params={{ deckId }}
              className="group block overflow-hidden rounded-2xl border border-black/[0.08] bg-white transition hover:border-[#003FC7]/40 hover:shadow-[0_12px_36px_rgba(3,0,44,0.10)]"
            >
              <div className="aspect-[16/9] overflow-hidden bg-[#F2F2F2]">
                {cover && coverVariant && brand ? (
                  <ScaledSlide>
                    <VariantRenderer
                      slide={cover}
                      variant={coverVariant}
                      brand={brand}
                      pageNumber={1}
                      clientName={brief?.prospect}
                      clientLogoUrl={deck.clientLogo?.primaryUrl ?? null}
                      subCompany={deck.subCompany}
                      logoOrientation={deck.context?.logoOrientation}
                    />
                  </ScaledSlide>
                ) : null}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-[#03002C]">
                    {deck.title}
                  </div>
                  <div className="text-[12px] text-black/50">{deck.slides.length} slides</div>
                </div>
                <ArrowRight
                  size={16}
                  strokeWidth={1.75}
                  className="shrink-0 text-black/30 transition group-hover:translate-x-0.5 group-hover:text-[#003FC7]"
                />
              </div>
            </Link>

            <div className="flex flex-col gap-2.5">
              <ActionRow
                to="/decks/$deckId"
                deckId={deckId}
                icon={Layers}
                title="Edit the deck"
                desc="Slide-by-slide editing, brand review and Copilot refinement."
              />
              <ActionRow
                to="/decks/$deckId/present"
                deckId={deckId}
                icon={Play}
                title="Present now"
                desc="Full-screen presenter mode with transitions."
              />
              <ActionRow
                to="/decks/$deckId/export"
                deckId={deckId}
                icon={Share2}
                title="Export & share"
                desc="PPTX, PDF or a tracked share link."
              />
            </div>
          </div>
        </Section>

        {/* ---- Print --------------------------------------------------- */}
        {prints.length ? (
          <Section
            id="print"
            icon={FileText}
            kicker="Print & leave-behinds"
            title={`${prints.length} document${prints.length > 1 ? "s" : ""} built from the same story`}
            blurb="Print-ready collateral that carries the deck's proof points into the room and the follow-up."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prints.map((p) => (
                <Link
                  key={p.id}
                  to="/asset/$assetId"
                  params={{ assetId: p.id }}
                  className="group rounded-2xl border border-black/[0.08] bg-white p-5 transition hover:border-[#003FC7]/40 hover:shadow-[0_10px_30px_rgba(3,0,44,0.08)]"
                >
                  <div
                    className="flex size-9 items-center justify-center rounded-xl"
                    style={{ background: `${primary}12`, color: primary }}
                  >
                    <FileText size={16} strokeWidth={1.75} />
                  </div>
                  <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                    {kindLabel(p.kind)}
                  </div>
                  <div className="mt-1 text-[14px] font-medium leading-snug text-[#03002C]">
                    {p.title || kindLabel(p.kind)}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#003FC7]">
                    Open editor
                    <ArrowRight
                      size={13}
                      strokeWidth={1.75}
                      className="transition group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ---- Event --------------------------------------------------- */}
        {eventPb ? (
          <Section
            id="event"
            icon={CalendarDays}
            kicker="Event & field marketing"
            title={eventPb.name}
            blurb={eventPb.intent}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                  Collateral in this kit
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {eventCollateral.slice(0, 18).map((d, i) => (
                    <span
                      key={`${d.label}-${i}`}
                      className="rounded-full border border-black/10 px-2.5 py-1 text-[11.5px] text-black/65"
                    >
                      {d.label}
                    </span>
                  ))}
                  {eventCollateral.length > 18 ? (
                    <span className="rounded-full px-2.5 py-1 text-[11.5px] text-black/40">
                      +{eventCollateral.length - 18} more
                    </span>
                  ) : null}
                </div>
              </div>
              <KitSideCard
                to="/events/demo/$playbookId"
                playbookId={eventPb.id}
                accent={eventPb.accent}
                stat={`${eventCollateral.length}`}
                statLabel="pieces"
                cta="Open event kit"
                phases={eventPb.phases.length}
              />
            </div>
          </Section>
        ) : null}

        {/* ---- Social -------------------------------------------------- */}
        {socialPb ? (
          <Section
            id="social"
            icon={Megaphone}
            kicker="Social & demand gen"
            title={socialPb.name}
            blurb={socialPb.intent}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                  Post cadence
                </div>
                <ol className="mt-3 space-y-2.5">
                  {socialPb.phases.map((ph, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="mt-0.5 inline-flex h-5 min-w-[2.2rem] items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ background: `${socialPb.accent}2E`, color: "#03002C" }}
                      >
                        {ph.label}
                      </span>
                      <span className="text-[13px] leading-[1.45] text-black/70">
                        {ph.detail}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <KitSideCard
                to="/social/demo/$playbookId"
                playbookId={socialPb.id}
                accent={socialPb.accent}
                stat={`${socialPb.deliverables.length}`}
                statLabel="assets"
                cta="Open social kit"
                phases={socialPb.phases.length}
              />
            </div>
          </Section>
        ) : null}

        {/* ---- Extend -------------------------------------------------- */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-black/15 px-6 py-5">
          <div>
            <div className="text-[14px] font-medium text-[#03002C]">Need another angle?</div>
            <div className="text-[12.5px] text-black/55">
              Start a new brief for this prospect, or request a single extra asset in the same
              division style.
            </div>
          </div>
          <Link
            to="/brief/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#003FC7]"
          >
            New brief <ArrowRight size={15} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  id,
  icon: Icon,
  kicker,
  title,
  blurb,
  children,
}: {
  id: string;
  icon: typeof Presentation;
  kicker: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex size-8 items-center justify-center rounded-xl bg-[#03002C]/[0.06] text-[#03002C]">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
            {kicker}
          </div>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[#03002C]">{title}</h2>
          {blurb ? <p className="mt-1 max-w-2xl text-[13px] text-black/55">{blurb}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function ActionRow({
  to,
  deckId,
  icon: Icon,
  title,
  desc,
}: {
  to: "/decks/$deckId" | "/decks/$deckId/present" | "/decks/$deckId/export";
  deckId: string;
  icon: typeof Presentation;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      params={{ deckId }}
      className="group flex items-start gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3.5 transition hover:border-[#003FC7]/40 hover:shadow-[0_8px_24px_rgba(3,0,44,0.07)]"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#003FC7]/[0.08] text-[#003FC7]">
        <Icon size={15} strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-[#03002C]">{title}</span>
        <span className="block text-[12px] leading-[1.45] text-black/55">{desc}</span>
      </span>
      <ArrowRight
        size={15}
        strokeWidth={1.75}
        className="ml-auto mt-1 shrink-0 text-black/25 transition group-hover:translate-x-0.5 group-hover:text-[#003FC7]"
      />
    </Link>
  );
}

function KitSideCard({
  to,
  playbookId,
  accent,
  stat,
  statLabel,
  cta,
  phases,
}: {
  to: "/events/demo/$playbookId" | "/social/demo/$playbookId";
  playbookId: string;
  accent: string;
  stat: string;
  statLabel: string;
  cta: string;
  phases: number;
}) {
  return (
    <Link
      to={to}
      params={{ playbookId }}
      className="group flex flex-col justify-between rounded-2xl border border-black/[0.08] p-5 transition hover:shadow-[0_12px_32px_rgba(3,0,44,0.10)]"
      style={{ background: `linear-gradient(150deg, ${accent}26 0%, ${accent}0A 100%)` }}
    >
      <div>
        <div className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#03002C]">
          {stat}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
          {statLabel} · {phases} beats
        </div>
      </div>
      <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#03002C]">
        {cta}
        <ArrowRight
          size={14}
          strokeWidth={1.75}
          className="transition group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
