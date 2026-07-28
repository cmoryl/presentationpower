// Rich collateral grid — groups a playbook's deliverables by category and
// renders each as a card with a status ribbon. "Live" pieces show a green
// dot; "Coming soon" pieces show a soft neutral ribbon so users know the
// full scope without pretending each piece is rendered today.

import { useState } from "react";
import { createPortal } from "react-dom";
import { CircleCheck, Clock, Maximize2, X } from "lucide-react";
import {
  CollateralArtwork,
  artKindFor,
  artSize,
  type CollateralContext,
} from "@/components/events/CollateralArtwork";
import type { PlaybookDeliverable } from "@/lib/event-playbooks";
import { COLLATERAL_CATEGORY_ORDER } from "@/lib/event-playbooks";

const SURFACE_STYLE: Record<string, { bg: string; ink: string; label: string }> = {
  digital: { bg: "#003FC71a", ink: "#003FC7", label: "Digital" },
  signage: { bg: "#FF9B7022", ink: "#B04A20", label: "Signage" },
  print: { bg: "#03002C10", ink: "#03002C", label: "Print" },
  video: { bg: "#EC388a22", ink: "#B01E60", label: "Video" },
  email: { bg: "#A1FBF933", ink: "#0A6666", label: "Email" },
  wearable: { bg: "#C2A3FF33", ink: "#5B3AB0", label: "Wearable" },
  merch: { bg: "#A6FA8733", ink: "#2F6D1B", label: "Merch" },
};

function SurfacePill({ surface }: { surface: string }) {
  const s = SURFACE_STYLE[surface] ?? SURFACE_STYLE.digital;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
      style={{ backgroundColor: s.bg, color: s.ink }}
    >
      {s.label}
    </span>
  );
}

function StatusRibbon({ status }: { status?: "live" | "coming-soon" }) {
  if (status === "coming-soon") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-black/55">
        <Clock size={12} /> Coming soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#A6FA87]/40 bg-[#A6FA8722] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#2F6D1B]">
      <CircleCheck size={12} /> Live
    </span>
  );
}

/** Preview tile — renders the piece's demo artwork inside the card. */
function ArtworkThumb({
  item,
  ctx,
  onOpen,
}: {
  item: PlaybookDeliverable;
  ctx: CollateralContext;
  onOpen: () => void;
}) {
  const kind = artKindFor(item.label, item.surface);
  const size = artSize(kind);
  // Fit the trim inside the tile on both axes so tall pieces (banners, towers,
  // badges) are scaled down rather than cropped.
  const box = { w: 200, h: 150 };
  const width = Math.min(box.w, (box.h * size.w) / size.h);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Enlarge ${item.label} preview`}
      className="group/thumb relative flex h-44 w-full items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-[#0B1020] p-3"
    >
      <div className="pointer-events-none flex items-center justify-center">
        <CollateralArtwork kind={kind} ctx={ctx} label={item.label} displayWidth={width} />
      </div>
      <span className="absolute right-2 top-2 rounded-full bg-white/85 p-1 text-[#03002C] opacity-0 transition group-hover/thumb:opacity-100">
        <Maximize2 size={12} strokeWidth={1.75} />
      </span>
    </button>
  );
}

function ArtworkLightbox({
  item,
  ctx,
  onClose,
}: {
  item: PlaybookDeliverable;
  ctx: CollateralContext;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  const kind = artKindFor(item.label, item.surface);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.label} preview`}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03002C]/80 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-3xl overflow-auto rounded-3xl border border-white/15 bg-white/95 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-[#03002C]">{item.label}</div>
            <p className="text-xs text-black/55">{item.detail}</p>
            {item.spec ? (
              <div className="mt-1 text-[10px] font-medium uppercase tracking-widest text-black/45">
                {item.spec}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-full border border-black/10 p-2 text-[#03002C] hover:bg-black/5"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex justify-center rounded-2xl bg-[#0B1020] p-8">
          <CollateralArtwork
            kind={kind}
            ctx={ctx}
            label={item.label}
            displayWidth={Math.min(560, (620 * artSize(kind).w) / artSize(kind).h)}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CollateralGrid({
  items,
  artworkCtx,
}: {
  items: PlaybookDeliverable[];
  /** When supplied, every piece renders a demo artwork preview. */
  artworkCtx?: CollateralContext;
}) {
  const [open, setOpen] = useState<PlaybookDeliverable | null>(null);
  const liveItems = items.filter((d) => (d.status ?? "live") === "live");
  const soonItems = items.filter((d) => (d.status ?? "live") === "coming-soon");

  const renderGroups = (rows: PlaybookDeliverable[], soon: boolean) => {
    const byCat = new Map<string, PlaybookDeliverable[]>();
    for (const d of rows) {
      const key = d.category ?? "Digital & Web";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(d);
    }
    const ordered: string[] = [
      ...COLLATERAL_CATEGORY_ORDER.filter((c) => byCat.has(c)),
      ...Array.from(byCat.keys()).filter((c) => !COLLATERAL_CATEGORY_ORDER.includes(c as never)),
    ];
    return ordered.map((cat) => {
      const list = byCat.get(cat)!;
      return (
        <div key={cat}>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#03002C]">
              {cat}
            </h3>
            <span className="text-[11px] text-black/45">{list.length} pieces</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d, i) => (
              <div
                key={`${d.label}-${i}`}
                className={`relative flex flex-col gap-2 rounded-2xl border p-4 transition ${
                  soon
                    ? "border-dashed border-black/15 bg-white/55"
                    : "border-black/10 bg-white/90 shadow-sm"
                }`}
              >
                {artworkCtx ? (
                  <ArtworkThumb item={d} ctx={artworkCtx} onOpen={() => setOpen(d)} />
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <SurfacePill surface={d.surface} />
                  <StatusRibbon status={d.status} />
                </div>
                <div className="mt-1">
                  <div
                    className={`text-sm font-semibold ${soon ? "text-black/70" : "text-[#03002C]"}`}
                  >
                    {d.label}
                  </div>
                  <p className="mt-0.5 text-xs text-black/55">{d.detail}</p>
                </div>
                {d.spec ? (
                  <div className="mt-auto text-[10px] font-medium uppercase tracking-widest text-black/45">
                    {d.spec}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-10">
      {open && artworkCtx ? (
        <ArtworkLightbox item={open} ctx={artworkCtx} onClose={() => setOpen(null)} />
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-black/55">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#A6FA87]/40 bg-[#A6FA8722] px-2 py-0.5 font-semibold uppercase tracking-widest text-[#2F6D1B]">
          <CircleCheck size={12} /> {liveItems.length} live
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/85 px-2 py-0.5 font-semibold uppercase tracking-widest text-black/55">
          <Clock size={12} /> {soonItems.length} coming soon
        </span>
        <span className="text-black/40">
          · {items.length} total collateral pieces in the full kit scope
        </span>
      </div>

      {liveItems.length > 0 ? (
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#A6FA87]/40 bg-[#A6FA8722] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#2F6D1B]">
              <CircleCheck size={12} /> Rendering live now
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>
          {renderGroups(liveItems, false)}
        </div>
      ) : null}

      {soonItems.length > 0 ? (
        <div className="space-y-8 border-t border-dashed border-black/15 pt-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-black/55">
              <Clock size={12} /> Coming soon · roadmap
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>
          {renderGroups(soonItems, true)}
        </div>
      ) : null}
    </div>
  );
}
