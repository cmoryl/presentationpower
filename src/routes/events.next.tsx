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
import { NextBadge } from "@/components/next/NextBadge";
import { badgeDivisionFor, SAMPLE_ATTENDEE } from "@/lib/next-badge";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

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
  const [group, setGroup] = useState<NextFormatGroupId | "all">("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<NextRegistryRow[] | null>(null);
  const [preview, setPreview] = useState<NextRegistryRow | null>(null);

  useEffect(() => {
    let alive = true;
    loadNextRegistry().then((r) => {
      if (alive) setRows(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  const division = NEXT_DIVISIONS.find((d) => d.id === divisionId) ?? NEXT_DIVISIONS[0];

  const divisionRows = useMemo(
    () => (rows ?? []).filter((r) => r.divisionId === divisionId),
    [rows, divisionId],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return divisionRows.filter(
      (r) =>
        (group === "all" || r.group === group) &&
        (!q ||
          r.format.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.category ?? "").toLowerCase().includes(q) ||
          r.size.toLowerCase().includes(q)),
    );
  }, [divisionRows, group, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, NextRegistryRow[]>();
    for (const r of visible) {
      const key = `${r.group}::${r.category ?? ""}`;
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    const order = NEXT_FORMAT_GROUPS.map((g) => g.id);
    return [...map.entries()].sort(
      (a, b) =>
        order.indexOf(a[0].split("::")[0] as NextFormatGroupId) -
        order.indexOf(b[0].split("::")[0] as NextFormatGroupId),
    );
  }, [visible]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
      <Hero division={division} total={rows?.length ?? 0} onSelect={setDivisionId} />

      <DivisionDetail division={division} count={divisionRows.length} />

      <Pathways
        accent={division.accent}
        onPick={(g) => {
          setGroup(g);
          setQuery("");
          document.getElementById("registry")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      {/* Registry controls */}
      <div id="registry" className="mt-8 flex scroll-mt-24 flex-wrap items-center gap-2">

        <FilterChip active={group === "all"} onClick={() => setGroup("all")}>
          All formats
        </FilterChip>
        {NEXT_FORMAT_GROUPS.map((g) => (
          <FilterChip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>
            {g.label}
          </FilterChip>
        ))}
        <div className="relative ml-auto">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-icon-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search formats, codes, sizes…"
            aria-label="Search NEXT formats"
            className="h-9 w-64 rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {rows === null ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading the design registry…</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No formats match that search for {division.eventName}.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.map(([key, list]) => {
            const [gid, cat] = key.split("::");
            const meta = NEXT_FORMAT_GROUPS.find((g) => g.id === gid);
            return (
              <section key={key}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-sm font-semibold tracking-tight">
                    {cat || meta?.label || gid}
                  </h3>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {meta?.badge}
                  </span>
                  <span className="text-xs text-muted-foreground">{list.length} designs</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((r) => (
                    <RegistryCard
                      key={`${r.group}-${r.code}-${r.format}`}
                      row={r}
                      accent={division.accent}
                      onPreview={() => setPreview(r)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <CitySeries />

      <PlaybookCta />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogTitle className="text-sm font-semibold">
            {preview ? `${preview.code} — ${preview.format}` : ""}
          </DialogTitle>
          {preview && deckPagesFor(preview) ? (
            <DeckPages pages={deckPagesFor(preview)!} label={preview.format} />


          ) : preview?.badgeSide && badgeDivisionFor(preview.divisionId) ? (
            <div className="flex justify-center rounded-lg border border-border bg-[#03002C] p-4">
              <NextBadge
                division={badgeDivisionFor(preview.divisionId)!}
                attendee={SAMPLE_ATTENDEE}
                side={preview.badgeSide}
                ppi={72}
                guides
                style={{ borderRadius: 6 }}
              />
            </div>
          ) : preview?.exampleUrl ? (
            <img
              src={preview.exampleUrl}
              alt={`${preview.code} ${preview.format} example render`}
              className="max-h-[64vh] w-full rounded-lg border border-border bg-muted object-contain"
              loading="lazy"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No example render available yet.</p>
          )}
          {preview?.internalUrl && (
            <Link
              to={preview.internalUrl}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open badge template <ArrowRight size={14} />
            </Link>
          )}
          {preview?.canvaUrl && (
            <a
              href={preview.canvaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open in Canva <ExternalLink size={14} />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Hero({
  division,
  total,
  onSelect,
}: {
  division: NextDivision;
  total: number;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="full-bleed relative -mt-8 overflow-hidden border-b border-white/10 bg-[#03002C] py-10 text-white sm:-mt-12 sm:py-16 lg:py-20">
      <NextAurora division={division} />
      <NextWatermark accent={division.accent} />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75 backdrop-blur">
            <Sparkles size={12} style={{ color: division.accent }} /> {NEXT_EVENT.subBrandLine}
          </span>
          <span className="hidden text-[11px] text-white/50 sm:inline">
            {NEXT_DIVISIONS.length} divisions · 56 formats · {total || 616} master designs
          </span>
        </div>

        {/* Division tabs — same interaction model as the homepage mode picker */}
        <div className="mt-6">
          <div
            role="tablist"
            aria-label="Choose a NEXT division"
            className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur"
          >
            {NEXT_DIVISIONS.map((d) => {
              const active = d.id === division.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelect(d.id)}
                  className={`group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-300 ${
                    active
                      ? "bg-white text-[#03002C] shadow-lg shadow-black/20"
                      : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: d.accent }}
                  />
                  {d.eventName}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute -bottom-[7px] left-1/2 h-1 w-8 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: d.accent }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          key={division.id}
          className="mt-8 grid animate-fade-in gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end"
        >
          <div className="min-w-0">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.32em]"
              style={{ color: division.accent }}
            >
              {division.eventName} · {NEXT_EVENT.datesLabel}
            </div>
            <h1 className="mt-3 text-[42px] font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              {NEXT_EVENT.name}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
              One system, {NEXT_DIVISIONS.length} divisions, {total || 616} master designs. Every
              division inherits the same layout grid and swaps only its accent, lockup and headline
              suffix.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <a
                href="#registry"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#03002C] shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Search size={14} style={{ color: division.accent }} /> Browse the registry
              </a>
              <a
                href="#generate"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/[0.12]"
              >
                <Sparkles size={14} /> Generate a kit
              </a>
              <Link
                to="/events/next/badges"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/[0.12]"
              >
                Attendee badges
              </Link>
              <a
                href={NEXT_EVENT.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white/65 transition hover:text-white"
              >
                Master reference <ExternalLink size={13} />
              </a>

            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-white/85 sm:grid-cols-4">
              <Fact icon={CalendarDays} label="Dates" value={NEXT_EVENT.datesLabel} />
              <Fact icon={MapPin} label="Venue" value={`${NEXT_EVENT.venue} · ${NEXT_EVENT.city}`} />
              <Fact icon={Globe2} label="Naming" value={NEXT_EVENT.namePattern} />
              <Fact icon={Sparkles} label="CTA" value={NEXT_EVENT.ctaLabel} />
            </dl>
          </div>

          {/* Lockup + stat strip */}
          <div className="flex flex-col gap-3">
            <LockupPlate division={division} />
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: String(NEXT_DIVISIONS.length), v: "Divisions" },
                { k: "56", v: "Formats" },
                { k: String(total || 616), v: "Designs" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center backdrop-blur"
                >
                  <p className="text-xl font-semibold text-white">{s.k}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/50">
                    {s.v}
                  </p>
                </div>
              ))}
            </div>
            <a
              href="#cities"
              className="group flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white/80 backdrop-blur transition hover:bg-white/[0.08] hover:text-white"
            >
              <span>
                <span className="font-medium">{NEXT_CITY_SERIES.name}</span> ·{" "}
                {NEXT_CITY_SERIES.stops.length} stops
              </span>
              <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
            </a>
            <Link
              to={"/knowledge/brand-guides/next-2026" as never}
              className="group flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white/80 backdrop-blur transition hover:bg-white/[0.08] hover:text-white"
            >
              <span>
                <span className="font-medium">Master brand guide</span> · lockups, palette, rules
              </span>
              <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
            </Link>

          </div>
        </div>
      </div>

      {/* accent rail */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 flex h-1.5">
        {NEXT_DIVISIONS.map((d) => (
          <span
            key={d.id}
            className="flex-1 transition-opacity duration-500"
            style={{ background: d.accent, opacity: d.id === division.id ? 1 : 0.3 }}
          />
        ))}
      </div>
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
function LockupPlate({
  division,
  className = "",
}: {
  division: NextDivision;
  className?: string;
}) {
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
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/50">
        <Icon size={14} /> {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}


/** Role-based entry points into the NEXT system. */
const NEXT_PATHWAYS: {
  id: string;
  title: string;
  who: string;
  detail: string;
  group: NextFormatGroupId;
  cta: string;
}[] = [
  {
    id: "sponsorship",
    title: "Sponsorship & deck",
    who: "Sales / partnerships",
    detail: "Digital sponsorship packet, sponsors grid and the 16:9 PowerPoint template.",
    group: "sponsorship-deck",
    cta: "Open packet & deck",
  },
  {
    id: "social",
    title: "Campaign & social",
    who: "Marketing / demand gen",
    detail: "Paid + organic ads, content banners, email headers, advocacy squares and speaker cards.",
    group: "asset-subsection",
    cta: "Open digital formats",
  },
  {
    id: "signage",
    title: "On-site signage",
    who: "Event producers",
    detail: "G-series printable posters in US Letter and A4 for wayfinding, rooms and registration.",
    group: "event-signage",
    cta: "Open signage set",
  },
  {
    id: "screens",
    title: "Screens & stage",
    who: "AV / production",
    detail: "S-series digital screen designs for stage, foyer and breakout displays.",
    group: "event-screens",
    cta: "Open screen set",
  },
  {
    id: "pillars",
    title: "Large format",
    who: "Fabrication partners",
    detail: "P-series pillar wraps at 15.75×78.7 in (40×200 cm), print-ready.",
    group: "pillar-signage",
    cta: "Open pillar set",
  },
];

function Pathways({
  accent,
  onPick,
}: {
  accent: string;
  onPick: (g: NextFormatGroupId) => void;
}) {
  return (
    <section className="mt-10" aria-labelledby="next-pathways">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="next-pathways" className="text-xl font-semibold tracking-tight">
          Start where you work
        </h2>
        <a href="#generate" className="text-sm font-medium text-primary hover:underline">
          Or generate a kit →
        </a>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NEXT_PATHWAYS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.group)}
            className="group relative overflow-hidden rounded-2xl border border-border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: accent }}
            />
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {p.who}
            </p>
            <h3 className="mt-1 text-sm font-semibold tracking-tight">{p.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.detail}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
              {p.cta}
              <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DivisionDetail({ division, count }: { division: NextDivision; count: number }) {
  return (
    <section className="mt-6 grid gap-6 rounded-2xl border border-border p-6 md:grid-cols-[240px_1fr]">
      <LockupPlate division={division} className="self-start" />

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{nextHeadline(division)}</h2>
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
            {count} designs
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
          <span className="text-xs text-muted-foreground">
            Front + back, print-ready at 4.58″ × 6.55″ bleed.
          </span>
        </div>

      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active ? "border-transparent bg-foreground text-background" : "border-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** Page-by-page viewer for a division's multi-page deck (packet or PowerPoint). */
function DeckPages({ pages, label }: { pages: string[]; label: string }) {

  const [index, setIndex] = useState(0);
  const total = pages.length;
  const go = (delta: number) => setIndex((i) => (i + delta + total) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Page {index + 1} of {total} — exported from the Canva master. Use ← / → to flip.
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous page"
            className="inline-flex size-8 items-center justify-center rounded-full border border-border text-icon transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next page"
            className="inline-flex size-8 items-center justify-center rounded-full border border-border text-icon transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-center rounded-lg border border-border bg-muted p-2">
        <img
          key={pages[index]}
          src={pages[index]}
          alt={`${label} page ${index + 1} of ${total}`}
          className="max-h-[60vh] w-auto max-w-full object-contain"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={`${label} pages`}>

        {pages.map((src, i) => (
          <button
            key={src}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to page ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`overflow-hidden rounded-md border transition ${
              i === index
                ? "border-primary ring-2 ring-primary/30"
                : "border-border opacity-70 hover:opacity-100"
            }`}
          >
            <img src={src} alt="" className="h-14 w-auto object-contain" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

function RegistryCard({

  row,
  accent,
  onPreview,
}: {
  row: NextRegistryRow;
  accent: string;
  onPreview: () => void;
}) {
  const packetPages = deckPagesFor(row);
  const isDeck = isPowerpointDeck(row);

  const thumb = packetPages?.[0] ?? row.exampleUrl;
  const badgeDivision = row.badgeSide ? badgeDivisionFor(row.divisionId) : undefined;
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <button
        onClick={onPreview}
        className="group relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-lg bg-muted"
        aria-label={
          packetPages
            ? `Preview all ${packetPages.length} pages of ${row.format}`
            : `Preview ${row.code} ${row.format}`
        }
      >
        {badgeDivision && row.badgeSide ? (
          <div className="flex size-full items-center justify-center bg-[#03002C] py-2 transition group-hover:scale-[1.02]">
            <NextBadge
              division={badgeDivision}
              attendee={SAMPLE_ATTENDEE}
              side={row.badgeSide}
              ppi={22}
              style={{ borderRadius: 4 }}
            />
          </div>
        ) : thumb ? (
          <img
            src={thumb}
            alt={`${row.code} ${row.format}`}
            className="size-full object-contain transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <ImageIcon size={20} className="text-icon-muted" />
        )}
        {packetPages ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
            {packetPages.length} {isDeck ? "slides" : "pages"}

          </span>
        ) : null}
      </button>

      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: `${accent}22`, color: "inherit" }}
        >
          {row.code}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.format}</p>
          <p className="text-xs text-muted-foreground">{row.size}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-3 text-xs">
        {row.internalUrl ? (
          <Link
            to={row.internalUrl}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Open badge template <ArrowRight size={12} />
          </Link>
        ) : row.canvaUrl ? (
          <a
            href={row.canvaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Open in Canva <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-muted-foreground">Coming soon</span>
        )}
        {row.secondaryUrl && (
          <a
            href={row.secondaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
          >
            {row.secondaryLabel ?? "Download"}
          </a>
        )}
      </div>
    </article>
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
        Both kits render live through the existing engine — pick a division, and accents, lockups and
        headline suffixes are applied automatically.
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
