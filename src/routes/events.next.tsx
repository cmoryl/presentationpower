// /events/next — TransPerfect NEXT 2026 hub.
//
// Indexes the full NEXT design system: 11 divisions × 56 formats (616 Canva
// designs), the City Series roadshow, and the two generatable playbooks that
// feed the existing kit engine.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
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
  loadNextRegistry,
  nextHeadline,
  type NextDivision,
  type NextFormatGroupId,
  type NextRegistryRow,
} from "@/lib/next-event";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
      <Hero division={division} total={rows?.length ?? 0} />

      <DivisionPicker selected={divisionId} onSelect={setDivisionId} />

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
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogTitle className="text-sm font-semibold">
            {preview ? `${preview.code} — ${preview.format}` : ""}
          </DialogTitle>
          {preview?.exampleUrl ? (
            <img
              src={preview.exampleUrl}
              alt={`${preview.code} ${preview.format} example render`}
              className="max-h-[64vh] w-full rounded-lg border border-border bg-muted object-contain"
              loading="lazy"
            />

          ) : (
            <p className="text-sm text-muted-foreground">No example render available yet.</p>
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

function Hero({ division, total }: { division: NextDivision; total: number }) {
  return (
    <header
      className="relative overflow-hidden rounded-3xl border border-border"
      style={{
        background: `radial-gradient(120% 140% at 12% 0%, ${division.accent}26 0%, transparent 55%), linear-gradient(140deg, #03002C 0%, #050436 48%, #03002C 100%)`,
      }}
    >
      {/* accent orbs */}
      <div
        aria-hidden
        className="absolute -right-24 -top-32 size-[26rem] rounded-full blur-[110px] transition-colors duration-700"
        style={{ background: division.accent, opacity: 0.3 }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 left-1/3 size-80 rounded-full blur-[120px]"
        style={{ background: "#003FC7", opacity: 0.45 }}
      />
      {/* concentric line motif */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-1/2 hidden size-[30rem] -translate-y-1/2 rounded-full border opacity-20 lg:block"
        style={{ borderColor: division.accent }}
      >
        <div
          className="absolute inset-12 rounded-full border"
          style={{ borderColor: division.accent }}
        />
        <div
          className="absolute inset-24 rounded-full border"
          style={{ borderColor: division.accent }}
        />
      </div>

      <div className="relative grid gap-8 p-8 lg:grid-cols-[1fr_320px] lg:p-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ background: `${division.accent}26`, color: division.accent }}
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: division.accent }}
              />
              {division.eventName}
            </span>
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">
              {NEXT_EVENT.subBrandLine}
            </span>
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl">
            {NEXT_EVENT.name}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            One system, eleven divisions, {total || 616} master designs. Every division inherits the
            same layout grid and swaps only its accent, lockup and headline suffix.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#registry"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#03002C] transition hover:bg-white/90"
            >
              Browse the registry <ArrowRight size={16} />
            </a>
            <a
              href="#generate"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Sparkles size={16} /> Generate a kit
            </a>
            <a
              href={NEXT_EVENT.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
            >
              Master reference <ExternalLink size={14} />
            </a>
          </div>

          <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-white/85 sm:grid-cols-4">
            <Fact icon={CalendarDays} label="Dates" value={NEXT_EVENT.datesLabel} />
            <Fact icon={MapPin} label="Venue" value={`${NEXT_EVENT.venue} · ${NEXT_EVENT.city}`} />
            <Fact icon={Globe2} label="Naming" value={NEXT_EVENT.namePattern} />
            <Fact icon={Sparkles} label="CTA" value={NEXT_EVENT.ctaLabel} />
          </dl>
        </div>

        {/* Lockup card — light plate so the navy wordmark stays legible */}
        <aside className="relative flex flex-col gap-3 self-start rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-sm">
          <LockupPlate division={division} />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: "11", v: "Divisions" },
              { k: "56", v: "Formats" },
              { k: String(total || 616), v: "Designs" },
            ].map((s) => (
              <div key={s.v} className="rounded-lg bg-white/8 px-2 py-2">
                <p className="text-lg font-semibold text-white">{s.k}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/55">{s.v}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* accent rail */}
      <div aria-hidden className="flex h-1.5 w-full">
        {NEXT_DIVISIONS.map((d) => (
          <span
            key={d.id}
            className="flex-1 transition-opacity"
            style={{ background: d.accent, opacity: d.id === division.id ? 1 : 0.35 }}
          />
        ))}
      </div>
    </header>
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

function DivisionPicker({

  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="NEXT divisions">
      {NEXT_DIVISIONS.map((d) => {
        const active = d.id === selected;
        return (
          <button
            key={d.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(d.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? "border-transparent bg-foreground text-background"
                : "border-border hover:bg-muted"
            }`}
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: d.accent }}
            />
            {d.eventName}
          </button>
        );
      })}
    </div>
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

function RegistryCard({
  row,
  accent,
  onPreview,
}: {
  row: NextRegistryRow;
  accent: string;
  onPreview: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <button
        onClick={onPreview}
        className="group relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-lg bg-muted"
        aria-label={`Preview ${row.code} ${row.format}`}
      >
        {row.exampleUrl ? (
          <img
            src={row.exampleUrl}
            alt={`${row.code} ${row.format}`}
            className="size-full object-contain transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <ImageIcon size={20} className="text-icon-muted" />
        )}
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
        {row.canvaUrl ? (
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
