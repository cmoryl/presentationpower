// Screen proofs for the booklet studio: cover, agenda, map/chart, notes pages,
// plus the trim/safe guides. Proofs follow the press file's fractions but are
// never the press artwork — the builders place picture and type themselves.

import { FileImage, Map as MapIcon, NotebookPen, BarChart3 } from "lucide-react";

import { AgendaSheet } from "@/components/next/AgendaSheet";
import type { AgendaConfig } from "@/lib/next-agenda";
import type { BookletConfig } from "@/lib/next-booklet";
import { bookletCoverArt, bookletCoverLayout } from "@/lib/next-booklet-cover-art";

export type ProofPage =
  | { kind: "cover"; label: string }
  | { kind: "agenda"; label: string; agendaIndex: number }
  | { kind: "map"; label: string; floorId: string; floorLabel: string }
  | { kind: "chart"; label: string; chartId: string }
  | { kind: "notes"; label: string };

export function CoverProof({ cover, trim, compact = false }: { cover: BookletConfig["cover"]; trim: { w: number; h: number }; compact?: boolean }) {
  const art = bookletCoverArt(cover.artId);
  const layout = bookletCoverLayout(cover.treatment ?? "full-bleed");
  const veil = Math.max(0, Math.min(1, layout.scrim.strength * ((cover.scrim ?? 88) / 100)));
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const veilStyle =
    layout.scrim.from === "all"
      ? { background: `rgba(3,0,44,${veil})` }
      : {
          background: `linear-gradient(to ${layout.scrim.from === "bottom" ? "top" : "bottom"}, rgba(3,0,44,${veil}) 0%, rgba(3,0,44,${veil * 0.45}) ${pct(layout.scrim.span * 0.55)}, rgba(3,0,44,0) ${pct(layout.scrim.span)})`,
        };
  // Type scales with the page (container query units), so thumbnails and the
  // canvas read as the same cover.
  return (
    <div
      className="relative w-full overflow-hidden bg-[color:var(--color-foreground)] [container-type:inline-size]"
      style={{ aspectRatio: `${trim.w} / ${trim.h}` }}
    >
      {art ? (
        <div
          className="absolute overflow-hidden"
          style={{ left: pct(layout.photo.x), top: pct(layout.photo.y), width: pct(layout.photo.w), height: pct(layout.photo.h) }}
        >
          <img src={art.src} alt={compact ? "" : art.name} loading="lazy" className="size-full object-cover" />
          <div className="absolute inset-0" style={veilStyle} />
        </div>
      ) : null}
      <div
        className="absolute flex flex-col gap-[3cqw] px-[8cqw]"
        style={{
          left: 0,
          right: 0,
          top: art ? pct(layout.copy.y) : "8%",
          height: art ? pct(layout.copy.h) : "60%",
          justifyContent: art && layout.copy.anchor === "bottom" ? "flex-end" : "flex-start",
          paddingBottom: cover.footnote ? "15%" : undefined,
        }}
      >
        <div className="flex gap-[1cqw]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="block h-[1.4cqw] w-[6cqw]"
              style={{ background: i === 4 ? "var(--color-primary)" : "rgba(255,255,255,0.92)" }}
            />
          ))}
        </div>
        {cover.eyebrow ? (
          <p className="text-[2.6cqw] font-semibold uppercase tracking-[0.18em] text-white/80">{cover.eyebrow}</p>
        ) : null}
        {cover.title ? (
          <p className="text-[8cqw] font-bold uppercase leading-[1.04] text-white">{cover.title}</p>
        ) : null}
        {cover.subtitle ? <p className="text-[3cqw] leading-snug text-white/90">{cover.subtitle}</p> : null}
      </div>
      {cover.footnote ? (
        <p className="absolute inset-x-0 bottom-[4%] px-[8cqw] text-[2.3cqw] leading-snug text-white/70">{cover.footnote}</p>
      ) : null}
    </div>
  );
}

/** Trim edge + safe area. Screen-only; never part of an export. */
export function ProofGuides({ trim, safeInset }: { trim: { w: number; h: number }; safeInset: number }) {
  const x = (safeInset / trim.w) * 100;
  const y = (safeInset / trim.h) * 100;
  return (
    <div data-export-ignore="true" aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 outline outline-1 -outline-offset-1 outline-[color:var(--color-destructive)]/70" />
      <div
        className="absolute border border-dashed border-[color:var(--color-primary)]"
        style={{ left: `${x}%`, right: `${x}%`, top: `${y}%`, bottom: `${y}%` }}
      />
    </div>
  );
}

function Placeholder({ icon, title, note, compact = false }: { icon: React.ReactNode; title: string; note: string; compact?: boolean }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-[3cqw] bg-[color:var(--color-muted)] p-[8cqw] text-center [container-type:inline-size]">
      <span className={`text-[color:var(--color-muted-foreground)] ${compact ? "[&_svg]:size-[28cqw]" : "[&_svg]:size-[12cqw]"}`}>{icon}</span>
      <p className={`${compact ? "text-[11cqw]" : "text-[6cqw]"} font-semibold leading-tight text-[color:var(--color-foreground)]`}>{title}</p>
      {compact ? null : <p className="text-[3.6cqw] leading-snug text-[color:var(--color-muted-foreground)]">{note}</p>}
    </div>
  );
}

export function PageProof({
  page,
  config,
  agenda,
  trim,
  bleed,
  widthPx,
  renderedSrc,
  compact = false,
}: {
  page: ProofPage;
  config: BookletConfig;
  agenda: AgendaConfig;
  trim: { w: number; h: number };
  bleed: { w: number; h: number };
  widthPx: number;
  /** A rendered proof (maps/charts) when the operator asked for one. */
  renderedSrc?: string;
  compact?: boolean;
}) {
  const box = { aspectRatio: `${trim.w} / ${trim.h}` };
  if (page.kind === "cover") return <CoverProof cover={config.cover} trim={trim} compact={compact} />;
  if (page.kind === "agenda") {
    if (page.agendaIndex > 0 || compact) {
      return (
        <div className="w-full" style={box}>
          <Placeholder
            icon={<FileImage />}
            title={page.label}
            note="The press file prints every agenda page; the proof shows page 1."
            compact={compact}
          />
        </div>
      );
    }
    const pxPerMm = widthPx / bleed.w;
    return (
      <div className="w-full overflow-hidden bg-white" style={box}>
        <div style={{ transform: `translate(${-((bleed.w - trim.w) / 2) * pxPerMm}px, ${-((bleed.h - trim.h) / 2) * pxPerMm}px)` }}>
          <AgendaSheet config={agenda} pxPerMm={pxPerMm} />
        </div>
      </div>
    );
  }
  if (page.kind === "notes") {
    return (
      <div className="relative w-full bg-white p-[8%] [container-type:inline-size]" style={box}>
        <p className="text-[5cqw] font-bold text-[color:var(--color-foreground)]">NOTES</p>
        <div className="mt-[4cqw] space-y-[4.3cqw]">
          {Array.from({ length: compact ? 10 : 24 }).map((_, i) => (
            <div key={i} className="h-px bg-[color:var(--color-foreground)]/20" />
          ))}
        </div>
        {compact ? null : (
          <NotebookPen className="absolute bottom-3 right-3 size-4 text-[color:var(--color-muted-foreground)]" aria-hidden />
        )}
      </div>
    );
  }
  if (renderedSrc) {
    return (
      <div className="flex w-full items-center justify-center bg-white" style={box}>
        <img src={renderedSrc} alt={`${page.label} proof`} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-full" style={box}>
      <Placeholder
        icon={page.kind === "map" ? <MapIcon /> : <BarChart3 />}
        title={page.kind === "map" ? page.floorLabel : page.label}
        note="Rendered at 300 ppi when the file is built. Use Render proof to see it now."
        compact={compact}
      />
    </div>
  );
}
