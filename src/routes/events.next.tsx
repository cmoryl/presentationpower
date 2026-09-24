// /events/next — TransPerfect NEXT 2026 hub.
//
// Indexes the full NEXT design system: 11 divisions × 56 formats (616 Canva
// designs), the City Series roadshow, and the two generatable playbooks that
// feed the existing kit engine.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  IdCard,
  ImageIcon,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import {
  NEXT_CITY_SERIES,
  NEXT_DIVISIONS,
  NEXT_EVENT,
  NEXT_FORMAT_GROUPS,
  cityStopLine,
  deckPagesFor,
  isPowerpointDeck,
  loadNextRegistry,
  nextHeadline,
  type NextDivision,
  type NextFormatGroupId,
  type NextRegistryRow,
} from "@/lib/next-event";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NextEditions } from "@/components/events/NextEditions";
import {
  LONDON_STYLES,
  LONDON_VENUE,
  londonPanelsByFloor,
  isVenueTemplatePanel,
  londonPanelCount,
  londonVenueItemMeta,
} from "@/lib/next-london-signage";
import { CityBadge } from "@/components/next/CityBadge";
import { PillarSign } from "@/components/next/PillarSign";
import { AgendaSheet } from "@/components/next/AgendaSheet";
import { agendaDefault } from "@/lib/next-agenda";
import {
  pickAgendaFile,
  pickPillarFile,
  useSavedAgendaFiles,
  useSavedPillarFiles,
} from "@/hooks/use-next-live-masters";

import {
  PILLAR_KINDS,
  pillarDefault,
  type PillarConfig,
  type PillarKindId,
} from "@/lib/next-pillar-masters";
import { CITY_BADGE_DEFAULT, cityBadgeDivision } from "@/lib/next-city-badge";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  NEXT_WORKSPACE_GROUPS,
  NEXT_WORKSPACE_PAGES,
  nextWorkspaceGroup,
} from "@/lib/next-workspace";

export const Route = createFileRoute("/events/next")({
  head: () => ({
    meta: [
      { title: "TransPerfect NEXT 2026 · Event brand system" },
      {
        name: "description",
        content:
          "Every NEXT 2026 design in one place — 11 divisions, 56 formats each, plus the City Series roadshow and generatable kits for social, signage, screens and decks.",
      },
      { property: "og:title", content: "TransPerfect NEXT 2026 · Event brand system" },
      {
        property: "og:description",
        content:
          "11 divisions, 56 formats each, City Series roadshow, and one-click generatable NEXT kits.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://presentationpower.lovable.app/events/next" }],
  }),
  component: () => (
    <AppShell>
      <NextHub />
    </AppShell>
  ),
});

function NextHub() {
  const [divisionId, setDivisionId] = useState<string>(NEXT_DIVISIONS[0].id);

  const division = NEXT_DIVISIONS.find((d) => d.id === divisionId) ?? NEXT_DIVISIONS[0];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
      <Hero division={division} />

      <div id="editions" tabIndex={-1} className="scroll-mt-24 outline-none">
        <NextEditions />
      </div>

      <LondonStatus />

      <MasterDesignSystem division={division} onSelect={setDivisionId} />

      <CitySeries />

      <PlaybookCta />

      <WorkspaceDirectory />
    </div>
  );
}

function Hero({ division, total }: { division: NextDivision; total: number }) {
  const goEditions = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("editions");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    el?.focus({ preventScroll: true });
  };
  return (
    <section className="full-bleed relative -mt-8 overflow-hidden border-b border-white/10 bg-[#03002C] py-10 text-white sm:-mt-12 sm:py-16 lg:py-20">
      <NextAurora division={division} />
      <NextWatermark accent={division.accent} />
      {/* Scrim keeps metadata text at AA over the aurora gradients. */}
      <div aria-hidden className="absolute inset-0 bg-[#03002C]/45" />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-[#03002C]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
          <Sparkles size={12} /> {NEXT_EVENT.subBrandLine}
        </span>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-white/85">
              {NEXT_EVENT.datesLabel}
            </p>
            <h1 className="mt-3 text-[42px] font-semibold leading-[1.02] sm:text-6xl">
              {NEXT_EVENT.name}
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/85">
              Pick a city for on-site assets, or a division for master brand templates.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#editions"
                onClick={goEditions}
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[#03002C] shadow-lg shadow-black/25 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#03002C]"
              >
                <MapPin size={14} /> Choose a city edition
              </a>
              <a
                href="#master-system"
                className="inline-flex items-center gap-2 rounded-md border border-white/40 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Master brand templates <ArrowRight size={14} />
              </a>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-white sm:grid-cols-4">
              <Fact icon={CalendarDays} label="Dates" value={NEXT_EVENT.datesLabel} />
              <Fact
                icon={MapPin}
                label="Venue"
                value={`${NEXT_EVENT.venue} · ${NEXT_EVENT.city}`}
              />
              <Fact icon={Globe2} label="Naming" value={NEXT_EVENT.namePattern} />
              <Fact icon={Sparkles} label="CTA" value={NEXT_EVENT.ctaLabel} />
            </dl>
          </div>

        </div>
      </div>
    </section>
  );
}

/** Master Design System zone — the only place the division selector lives. */
function MasterDesignSystem({
  division,
  onSelect,
}: {
  division: NextDivision;
  onSelect: (id: string) => void;
}) {
  return (
    <section id="master-system" className="mt-14 scroll-mt-24" aria-labelledby="next-master">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Master Design System
      </p>
      <h2 id="next-master" className="mt-1 text-xl font-semibold">
        Division master brand templates
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        These templates are not tied to a city. Pick a division to see its lockup and jobs; for
        on-site signage at a venue, open that city edition above.
      </p>

      <div role="group" aria-label="Choose a division" className="mt-4 flex flex-wrap gap-2">
        {NEXT_DIVISIONS.map((d) => {
          const active = d.id === division.id;
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(d.id)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span aria-hidden className="h-3 w-1 rounded-sm" style={{ background: d.accent }} />
              {d.eventName}
            </button>
          );
        })}
      </div>

      <DivisionDetail division={division} />

      <Pathways accent={division.accent} divisionId={division.id} />

      <Link
        to="/events/next/assets"
        search={{ division: division.id }}
        className="mt-6 flex items-center justify-between gap-3 rounded-md border border-border px-5 py-4 transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="inline-flex items-center gap-3">
          <Search size={18} className="text-icon-muted" />
          <span>
            <span className="block text-sm font-semibold">
              Search master templates
            </span>
            <span className="block text-xs text-muted-foreground">
              Filter by division, format family, code or size
            </span>
          </span>
        </span>
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}

/** Aurora backdrop — cross-fading per-division blob layers with scroll + pointer parallax. */
function NextAurora({ division }: { division: NextDivision }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reducedMotion) return;
    const el = rootRef.current?.parentElement;
    if (!el) return;
    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      setPointer({ x: curX, y: curY });
      if (Math.abs(targetX - curX) < 0.001 && Math.abs(targetY - curY) < 0.001) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
      targetY = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const y = reducedMotion ? 0 : Math.min(scrollY, 800);
  const pxA = pointer.x * 22;
  const pyA = pointer.y * 16;
  const pxB = pointer.x * -18;
  const pyB = pointer.y * -12;
  const washX = pointer.x * 6;
  const washY = pointer.y * 4;

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {NEXT_DIVISIONS.map((d, i) => {
        const active = d.id === division.id;
        // Deterministic per-division blob placement so each division reads distinct.
        const aTop = `${-160 + (i % 4) * 90}px`;
        const aLeft = `${-120 + (i % 5) * 160}px`;
        const bBottom = `${-140 + ((i + 2) % 4) * 80}px`;
        const bRight = `${-100 + ((i + 3) % 5) * 150}px`;
        return (
          <div
            key={d.id}
            className="absolute inset-0 transition-opacity duration-[1600ms] ease-[cubic-bezier(.4,0,.2,1)] will-change-[opacity]"
            style={{ opacity: active ? 1 : 0 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(60% 55% at ${20 + washX}% ${30 + washY}%, ${d.accent}22 0%, transparent 60%), radial-gradient(55% 50% at ${85 + washX}% ${75 + washY}%, #003FC71c 0%, transparent 65%)`,
              }}
            />
            <div
              className="absolute h-[520px] w-[520px] rounded-full blur-[120px] will-change-transform"
              style={{
                backgroundColor: d.accent,
                opacity: 0.38,
                top: aTop,
                left: aLeft,
                transform: `translate3d(${y * 0.08 + pxA}px, ${y * -0.35 + pyA}px, 0) scale(${active ? 1 : 0.94})`,
                transition: "transform 1600ms cubic-bezier(.4,0,.2,1)",
              }}
            />
            <div
              className="absolute h-[460px] w-[460px] rounded-full blur-[140px] will-change-transform"
              style={{
                backgroundColor: "#003FC7",
                opacity: 0.34,
                bottom: bBottom,
                right: bRight,
                transform: `translate3d(${y * -0.1 + pxB}px, ${y * 0.22 + pyB}px, 0) scale(${active ? 1 : 0.94})`,
                transition: "transform 1600ms cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
        );
      })}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),rgba(255,255,255,0)_90%)]" />
    </div>
  );
}

/** Oversized NEXT watermark with scroll parallax — mirrors the homepage signature. */
function NextWatermark({ accent }: { accent: string }) {
  const reducedMotion = useReducedMotion();
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);
  const y = reducedMotion ? 0 : Math.min(scrollY, 800);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-6 select-none text-center font-semibold leading-none tracking-[-0.04em] will-change-transform"
      style={{
        fontSize: "clamp(120px, 22vw, 320px)",
        background: `linear-gradient(180deg, ${accent}00 0%, ${accent}14 35%, ${accent}05 75%, transparent 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        mixBlendMode: "screen",
        transform: `translate3d(0, ${y * 0.45}px, 0)`,
        opacity: Math.max(0, 1 - y / 700),
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 100%)",
        maskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 100%)",
      }}
    >
      NEXT 2026
    </div>
  );
}

/** Renders a division lockup on a light plate — the color lockups are navy artwork. */
function LockupPlate({ division, className = "" }: { division: NextDivision; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-black/5 bg-white p-6 ${className}`}
    >
      <img
        src={division.lockup.horizontal}
        alt={`${division.eventName} lockup`}
        className="max-h-14 w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/80">
        <Icon size={14} /> {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

/** Job-based entry points into the master templates. */
const NEXT_PATHWAYS: {
  id: string;
  title: string;
  who: string;
  detail: string;
  group: NextFormatGroupId;
  cta: string;
}[] = [
  {
    id: "social",
    title: "Promote the event",
    who: "Campaign & social",
    detail:
      "Paid + organic ads, content banners, email headers, advocacy squares and speaker cards.",
    group: "asset-subsection",
    cta: "Open digital formats",
  },
  {
    id: "sponsorship",
    title: "Pitch or present",
    who: "Sponsorship & deck",
    detail: "Digital sponsorship packet, sponsors grid and the 16:9 PowerPoint template.",
    group: "sponsorship-deck",
    cta: "Open packet & deck",
  },
  {
    id: "signage",
    title: "Guide attendees on-site",
    who: "On-site signage",
    detail:
      "G-series printable posters in US Letter and A4 for wayfinding, rooms and registration.",
    group: "event-signage",
    cta: "Open signage set",
  },
  {
    id: "screens",
    title: "Set up stage & displays",
    who: "Screens & stage",
    detail: "S-series digital screen designs for stage, foyer and breakout displays.",
    group: "event-screens",
    cta: "Open screen set",
  },
  {
    id: "pillars",
    title: "Print large-format",
    who: "Large format",
    detail: "P-series pillar wraps at 15.75×78.7 in (40×200 cm), print-ready.",
    group: "pillar-signage",
    cta: "Open pillar set",
  },
];

const pathCard =
  "group relative overflow-hidden rounded-md border border-border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Pathways({ accent, divisionId }: { accent: string; divisionId: string }) {
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">What do you need to do?</h3>
        <a href="#generate" className="text-sm font-medium text-primary hover:underline">
          Or generate a kit →
        </a>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NEXT_PATHWAYS.map((p) => (
          <Link
            key={p.id}
            to="/events/next/assets"
            search={{ division: divisionId, group: p.group }}
            className={pathCard}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: accent }}
            />
            <h4 className="text-sm font-semibold">{p.title}</h4>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {p.who}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.detail}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
              {p.cta}
              <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
        <Link to="/events/next/agendas" search={{ division: divisionId }} className={pathCard}>
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: accent }}
          />
          <h4 className="text-sm font-semibold">Publish the schedule</h4>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Agendas &amp; schedules
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Multi-day, multi-page agenda sheets on the approved grounds — editable Word, layered PDF
            and press-ready art.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Open agenda set
            <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

function DivisionDetail({ division }: { division: NextDivision }) {
  return (
    <div className="mt-6 grid gap-6 rounded-md border border-border p-6 md:grid-cols-[240px_1fr]">
      <LockupPlate division={division} className="self-start" />

      <div>
        <h3 className="text-2xl font-semibold">{nextHeadline(division)}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {division.body}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-medium"
            style={{ color: division.accent }}
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: division.accent }}
            />
            {division.accent}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
            Pantone {division.pantone}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
            Brand mode {division.brandModeId}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            to="/events/next/badges"
            search={{ division: division.id }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-background"
            style={{ background: division.accent }}
          >
            <IdCard size={13} /> {division.eventName} attendee badge
            <ArrowRight size={13} />
          </Link>
          <Link
            to="/events/next/agendas"
            search={{ division: division.id }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <CalendarDays size={13} /> {division.eventName} agenda board
            <ArrowRight size={13} />
          </Link>
          <span className="text-xs text-muted-foreground">
            Approved City Series artwork with the division lockup, dark + light faces, print-ready
            at 4.58″ × 6.55″ bleed. The agenda board is fully editable per division and exports as
            layered vector art.
          </span>
        </div>
      </div>
    </div>
  );
}

/** London is produced on its own edition page; the hub only reports status. */
function LondonStatus() {
  return (
    <section className="mt-8" aria-label="London production status">
      <Link
        to="/events/next/london"
        className="group flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-5 py-4 transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>
          <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            In production · Job {LONDON_VENUE.job}
          </span>
          <span className="mt-1 block text-base font-semibold">
            London · {LONDON_VENUE.venue}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Open London workbench
          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
        </span>
      </Link>
    </section>
  );
}

function CitySeries() {
  return (
    <section id="cities" className="mt-14 scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight">{NEXT_CITY_SERIES.name}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {NEXT_CITY_SERIES.detail}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NEXT_CITY_SERIES.stops.map((stop) => (
          <article
            key={stop.id}
            className="rounded-xl border border-border p-4"
            aria-label={`${stop.city} stop`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{stop.city}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  stop.status === "confirmed"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {stop.status === "confirmed" ? "Confirmed" : "Dates TBC"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stop.country}</p>
            <p className="mt-2 text-xs text-muted-foreground">{cityStopLine(stop)}</p>
            {stop.note && <p className="mt-2 text-xs text-muted-foreground">{stop.note}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function PlaybookCta() {
  return (
    <section id="generate" className="mt-14 scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight">Generate</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Both kits render live through the existing engine — pick a division, and accents, lockups
        and headline suffixes are applied automatically.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          {
            to: "/events/demo/$playbookId",
            params: { playbookId: "next-flagship-london" },
            title: "Generate the flagship kit",
            detail:
              "London edition — social drumbeat, speaker cards, advocacy squares, signage and deck, rendered live per division.",
          },
          {
            to: "/events/demo/$playbookId",
            params: { playbookId: "next-city-series" },
            title: "Generate a City Series kit",
            detail:
              "Same system, regional stop — city/venue line swaps while lockups, accents and formats stay locked.",
          },
        ].map((c) => (
          <Link
            key={c.params.playbookId}
            to={c.to}
            params={c.params}
            className="group rounded-2xl border border-border p-5 transition hover:bg-muted"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {c.title}
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * "Where everything lives" — the whole NEXT workspace in one grouped index,
 * driven by src/lib/next-workspace.ts so a new page can never be orphaned.
 */
function WorkspaceDirectory() {
  return (
    <section className="mt-10" aria-labelledby="next-directory">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="next-directory" className="text-xl font-semibold tracking-tight">
          Where everything lives
        </h2>
        <span className="text-sm text-muted-foreground">London-only pages are marked</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NEXT_WORKSPACE_GROUPS.map((g) => (
          <div key={g.id} className="rounded-2xl border border-border p-4">
            <div className="text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
              {g.label}
            </div>
            <p className="mt-1 text-xs text-black/55 dark:text-white/55">{g.blurb}</p>
            <ul className="mt-3 space-y-1.5">
              {nextWorkspaceGroup(g.id).map((p) => (
                <li key={p.to}>
                  <Link
                    to={p.to}
                    className="block rounded-lg px-2 py-1.5 transition hover:bg-primary/8"
                  >
                    <span className="text-sm font-medium">{p.label}</span>
                    {p.scope === "london" ? (
                      <span className="ml-1.5 rounded-full border border-black/15 px-1.5 py-px text-[10px] text-black/50 dark:border-white/15 dark:text-white/50">
                        London
                      </span>
                    ) : null}
                    <span className="block text-xs text-black/55 dark:text-white/55">
                      {p.purpose}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
