// /events/next/california — partner KIOSKS for the California NEXT event.
//
// The California stand build supplies a TV kiosk instead of a trade-booth wall:
// a 45 × 96 in front face with a monitor keep-clear plus two 4 × 96 in return
// strips. The London walls are 1830 × 2440 mm, so scaling one into the kiosk
// loses about 38 % of its width and cuts the lockup and headline in half. Each
// partner is therefore RE-LAID at kiosk size from its own native template, and
// every face here is editable and downloadable as .svg / .ai / print PDF.

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Monitor, Pencil, Ruler, Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LondonPanelLiveEditor } from "@/components/events/LondonPanelLiveEditor";
import { LondonPanelThumb } from "@/components/events/LondonPanelThumb";
import {
  CALIFORNIA_KIOSK_SCREEN_MM,
  CALIFORNIA_KIOSK_TEMPLATE,
  londonWallCropIntoKiosk,
} from "@/lib/next-california-kiosks";
import { CALIFORNIA_KIOSK_PANELS, londonBoothPanelMeta } from "@/lib/next-london-signage";
import type { LondonPanel } from "@/lib/next-london-signage";

export const Route = createFileRoute("/events/next_/california")({
  head: () => ({
    meta: [
      { title: "NEXT California partner kiosks · 45 × 96 in TV kiosk templates" },
      {
        name: "description",
        content:
          "Every TransPerfect NEXT partner booth re-laid on the supplied California TV kiosk template: 45 × 96 in front face with the monitor keep-clear plus both 4 × 96 in returns, editable and exportable.",
      },
      { property: "og:title", content: "NEXT California partner kiosks" },
      {
        property: "og:description",
        content:
          "Partner stands rebuilt at California kiosk size — front face and both return strips, editable copy, live Illustrator and print-PDF downloads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaliforniaKiosksPage,
});

const card =
  "rounded-2xl border border-[#03002C]/12 bg-white p-5 shadow-[0_12px_28px_-24px_rgba(3,0,44,0.35)]";
const pill =
  "inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/15 bg-[#F2F2F2] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/70";

type KioskGroup = {
  boothId: string;
  vendor: string;
  panels: LondonPanel[];
};

function CaliforniaKiosksPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const groups = useMemo<KioskGroup[]>(() => {
    const out: KioskGroup[] = [];
    for (const panel of CALIFORNIA_KIOSK_PANELS) {
      const meta = londonBoothPanelMeta(panel);
      if (!meta) continue;
      const existing = out.find((g) => g.boothId === meta.booth.id);
      if (existing) existing.panels.push(panel);
      else out.push({ boothId: meta.booth.id, vendor: meta.booth.vendor, panels: [panel] });
    }
    return out;
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => `${g.vendor} ${g.boothId}`.toLowerCase().includes(q));
  }, [groups, query]);

  const crop = londonWallCropIntoKiosk();
  const openPanel = openId
    ? (CALIFORNIA_KIOSK_PANELS.find((p) => p.id === openId) ?? null)
    : null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#03002C]/60 hover:text-[#03002C]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          NEXT events
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[#03002C]">
          California partner kiosks
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#03002C]/70">
          Every partner stand re-laid on the supplied kiosk template: a{" "}
          <strong>45 × 96 in front face</strong> with the monitor keep-clear, plus both{" "}
          <strong>4 × 96 in return strips</strong>, at 1/8 in bleed per edge.
        </p>

        <div className={`${card} mt-6`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={pill}>
              <Monitor className="h-3 w-3" />
              TV keep-clear {Math.round(CALIFORNIA_KIOSK_SCREEN_MM.w)} ×{" "}
              {Math.round(CALIFORNIA_KIOSK_SCREEN_MM.h)} mm
            </span>
            <span className={pill}>
              <Ruler className="h-3 w-3" />
              {CALIFORNIA_KIOSK_TEMPLATE.file} · {CALIFORNIA_KIOSK_TEMPLATE.pages} artboards
            </span>
            <span className={pill}>{groups.length} partners · {CALIFORNIA_KIOSK_PANELS.length} faces</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#03002C]/70">
            <strong>Why these are rebuilt, not stretched.</strong> The London walls are
            1830 × 2440 mm. Scaled to fill the kiosk front they lose{" "}
            <strong>{crop.lostWidthPct}% of their width</strong>, which cuts through the lockup and
            the headline on every stand. So each kiosk is built from the partner&rsquo;s own
            template — brand ground, headline, subhead, body, lockup and code laid out from the
            kiosk trim — with the words carried over unchanged. The London masters stay untouched on
            the London kit.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#03002C]/70">
            These kiosks are the partner stands for{" "}
            <Link
              to="/events/next/san-francisco"
              className="font-semibold text-[#003FC7] hover:underline"
            >
              {SF_VENUE.locationLine} · {SF_VENUE.venue}
            </Link>
            . No floor plan, room list or programme has been issued for the venue yet, so nothing on
            these boards states them.
          </p>

        </div>

        <label className="mt-6 flex items-center gap-2 rounded-xl border border-[#03002C]/15 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[#03002C]/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a partner"
            className="w-full bg-transparent text-sm text-[#03002C] outline-none"
          />
        </label>

        <div className="mt-6 space-y-4">
          {shown.map((group) => (
            <section key={group.boothId} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#03002C]">
                    {group.vendor}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#03002C]/50">
                    {group.panels.length} faces · re-laid from {group.boothId}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {group.panels.map((panel) => {
                  const meta = londonBoothPanelMeta(panel);
                  return (
                    <div
                      key={panel.id}
                      className="rounded-xl border border-[#03002C]/10 bg-[#F7F8FB] p-3"
                    >
                      <div className="flex items-start gap-3">
                        <LondonPanelThumb panel={panel} size={96} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#03002C]">
                            {meta?.artboard.label ?? panel.name}
                          </p>
                          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#03002C]/50">
                            {panel.trimW} × {panel.trimH} mm
                          </p>
                          <p className="mt-1 text-[11px] text-[#03002C]/55">
                            {meta?.shell.hasScreen ? "Monitor keep-clear" : "Fully live face"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === panel.id ? null : panel.id)}
                        aria-expanded={openId === panel.id}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#03002C] px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90"
                      >
                        <Pencil className="h-3 w-3" />
                        {openId === panel.id ? "Close" : "Edit & download"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {openPanel && group.panels.some((p) => p.id === openPanel.id) ? (
                <div className="mt-4 rounded-xl border border-[#03002C]/10 p-4">
                  <LondonPanelLiveEditor
                    panel={openPanel}
                    revisionLabel="draft"
                    siblingIds={group.panels.filter((p) => p.id !== openPanel.id).map((p) => p.id)}
                  />
                </div>
              ) : null}
            </section>
          ))}
          {shown.length === 0 ? (
            <p className="text-sm text-[#03002C]/60">No partner matches that search.</p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
