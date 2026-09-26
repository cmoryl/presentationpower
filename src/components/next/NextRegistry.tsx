// Shared NEXT master-template registry pieces: filter chips, registry cards,
// the multi-page deck viewer and the live pillar masters. Used by /events/next/assets.
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import {
  deckPagesFor,
  isPowerpointDeck,
  type NextDivision,
  type NextRegistryRow,
} from "@/lib/next-event";
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

export function FilterChip({
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
export function DeckPages({ pages, label }: { pages: string[]; label: string }) {
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

export function RegistryCard({
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
        {row.badgeSide ? (
          <div className="flex size-full items-center justify-center bg-[#03002C] py-2 transition group-hover:scale-[1.02]">
            <CityBadge
              config={{
                ...CITY_BADGE_DEFAULT,
                divisionId: cityBadgeDivision(row.divisionId).id,
              }}
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
          <span className="text-muted-foreground">Not yet issued</span>
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

/**
 * Live editable pillar masters for the selected division — both approved faces.
 * These are studio configs, not flat Canva artwork, so every card opens the
 * pillar editor seeded on that exact master with full editing + press export.
 */
export function LivePillars({
  division,
  editionId = null,
}: {
  division: NextDivision;
  /** City edition to show saved files for; null = the shared division defaults. */
  editionId?: string | null;
}) {
  const [face, setFace] = useState<"light" | "dark">("light");
  const savedPillars = useSavedPillarFiles();
  const savedAgendas = useSavedAgendaFiles();

  // Saved live files win over the shipped defaults, so an update made in the
  // studio shows on these large-format cards as soon as it is saved.
  const cards = useMemo(
    () =>
      PILLAR_KINDS.map((kind) => {
        const kindId = kind.id as PillarKindId;
        const saved = pickPillarFile(savedPillars.data, division.id, kindId, face, editionId);
        const config: PillarConfig = saved
          ? { ...saved.config, face }
          : { ...pillarDefault(kindId, division.id), face };
        return {
          id: kindId,
          label: kind.name,
          config,
          fileId: saved?.id,
          fileName: saved?.name,
          updatedAt: saved?.updated_at,
        };
      }),
    [division.id, face, savedPillars.data, editionId],
  );

  const savedAgenda = useMemo(
    () => pickAgendaFile(savedAgendas.data, division.id, editionId),
    [savedAgendas.data, division.id, editionId],
  );

  // Every division gets an agenda preview card: the saved live file when there
  // is one, otherwise the editable division default on the selected face.
  const agendaCard = useMemo(() => {
    const config = savedAgenda ? savedAgenda.config : { ...agendaDefault(division.id), face };
    return { config };
  }, [savedAgenda, division.id, face]);

  // Fit the board to the same preview height a pillar sign gets (pillars render
  // at 0.1 px/mm), so the agenda card reads as a peer, not a footnote.
  const pillarPreviewPx = Math.max(...cards.map((c) => c.config.trimH * 0.1));
  const agendaPxPerMm = Math.min(
    pillarPreviewPx / agendaCard.config.trimH,
    220 / agendaCard.config.trimW,
  );

  return (
    <section className="mt-4 scroll-mt-24" aria-labelledby="next-live-pillars">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="next-live-pillars" className="text-xl font-semibold tracking-tight">
            Live pillar masters · {division.name}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Welcome, registration, general logo, directional, the {division.name} profile pillar and
            the blank pillar, on the approved NEXT grounds and carrying the {division.name} lockup.
            Every one is a live studio file — open it to edit the strapline, copy, footprint, QR
            codes and lockup scale, then export layered PDF/X-4 and Illustrator art.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/events/next/agendas"
            search={{
              division: division.id,
              file: savedAgenda?.id,
              edition: editionId ?? undefined,
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <CalendarDays size={13} /> {division.name} agenda
          </Link>
          <div
            role="group"
            aria-label="Pillar face"
            className="inline-flex rounded-full border border-border p-0.5"
          >
            {(["light", "dark"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFace(f)}
                aria-pressed={face === f}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  face === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {f} face
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.id}
            className="group overflow-hidden rounded-2xl border border-border p-3 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex justify-center overflow-hidden rounded-xl bg-muted/40 p-2">
              <PillarSign config={card.config} pxPerMm={0.1} />
            </div>
            <h3 className="mt-3 text-sm font-semibold tracking-tight">{card.label} pillar</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.config.trimW}×{card.config.trimH} mm · {face} face ·{" "}
              {card.fileId ? "saved live file" : "editable master"}
            </p>
            {card.fileId && (
              <p className="mt-0.5 truncate text-[11px] text-primary/80">
                {card.fileName}
                {card.updatedAt ? ` · updated ${new Date(card.updatedAt).toLocaleString()}` : ""}
              </p>
            )}
            <Link
              to="/events/next/pillars"
              search={{
                division: division.id,
                kind: card.id,
                face,
                file: card.fileId,
                edition: editionId ?? undefined,
              }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Edit this pillar
              <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
            </Link>
          </article>
        ))}
        {/* Division agenda board — always listed, saved live file or the editable
            division default. It sits in the same grid as the pillar masters and is
            previewed at the same on-screen height as a pillar sign. */}
        <article className="group overflow-hidden rounded-2xl border border-border p-3 transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex justify-center overflow-hidden rounded-xl bg-muted/40 p-2">
            <AgendaSheet config={agendaCard.config} pxPerMm={agendaPxPerMm} />
          </div>
          <h3 className="mt-3 text-sm font-semibold tracking-tight">
            {savedAgenda ? "Live agenda board" : "Agenda board master"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {agendaCard.config.trimW}×{agendaCard.config.trimH} mm · {agendaCard.config.face} face ·{" "}
            {savedAgenda ? "saved live file" : "editable default"}
          </p>
          {savedAgenda && (
            <p className="mt-0.5 truncate text-[11px] text-primary/80">
              {savedAgenda.name} · updated {new Date(savedAgenda.updated_at).toLocaleString()}
            </p>
          )}
          <Link
            to="/events/next/agendas"
            search={{
              division: division.id,
              file: savedAgenda?.id,
              edition: editionId ?? undefined,
            }}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {savedAgenda ? "Edit this agenda" : "Create this agenda"}
            <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
          </Link>
        </article>
      </div>
    </section>
  );
}
