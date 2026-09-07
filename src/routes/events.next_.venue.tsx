// /events/next/venue — the next NEXT venue, built on the same apparatus as the
// London kit: one schematic plan per floor, the Bespoke scenic build carried over
// as draggable areas, and the London signage kit reissued at a single scale with
// the print consequences reported rather than absorbed.
//
// The layout is PROVISIONAL until the venue is contracted and surveyed: every
// sheet says so, and nothing here is orderable print.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Image as ImageIcon, MapIcon, Palette, SquareDashed, Table2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LondonFloorMap } from "@/components/events/LondonFloorMap";
import { LondonMapAreasPanel } from "@/components/events/LondonMapAreasPanel";
import { LondonMapDesignPanel } from "@/components/events/LondonMapDesignPanel";
import { useSessionUser } from "@/hooks/use-session-user";
import { runWithExportFeedback } from "@/lib/export-feedback";
import {
  downloadAttendeeMapPdf,
  downloadFloorMapPng,
  downloadFloorMapSvg,
} from "@/lib/next-london-floormap-export";
import {
  DEFAULT_MAP_DESIGN,
  type MapAreaKind,
  type MapDesign,
} from "@/lib/next-london-floormap-design";
import {
  areasOnFloor,
  clampArea,
  londonAreaCsv,
  newLondonArea,
  parseStoredAreas,
  planWithAreas,
  type LondonCustomArea,
} from "@/lib/next-london-floormap-areas";
import { areaKindLabel } from "@/lib/next-london-floormap-icons";
import type { LondonFloorId } from "@/lib/next-london-signage";
import {
  NEXT_VENUE,
  NEXT_VENUE_FLOORS,
  NEXT_VENUE_FLOOR_PLANS,
  nextVenueFloorPlan,
  nextVenueScenicAreas,
  nextVenueSignageCsv,
  nextVenueSignageSchedule,
} from "@/lib/next-venue-plan";

const AREAS_KEY = "next-venue-map-areas-v1";
const DESIGN_KEY = "next-venue-map-design-v1";

function areaLabelFor(kind: MapAreaKind, existing: readonly LondonCustomArea[]): string {
  const base = areaKindLabel(kind);
  const used = existing.filter((a) => a.kind === kind).length;
  return used ? `${base} ${used + 1}` : base;
}

/** Toast labels for a download of `what`. */
function labels(what: string, file: string) {
  return {
    pending: `Building the ${what}…`,
    success: `${file} downloaded`,
    failure: `${what} failed`,
  };
}

function saveText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const Route = createFileRoute("/events/next_/venue")({
  head: () => ({
    meta: [
      { title: "NEXT next venue — provisional floor plans & reissued signage" },
      {
        name: "description",
        content:
          "Provisional floor plans for the next TransPerfect NEXT venue, with the Bespoke scenic build carried over as editable areas and the London signage kit reissued at any scale with print risks flagged.",
      },
      { property: "og:title", content: "NEXT next venue — provisional plans" },
      {
        property: "og:description",
        content:
          "Per-floor schematic plans, draggable scenic units and a reissued signage schedule for the next NEXT event, exportable as SVG, PNG, PDF and CSV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NextVenuePage,
});

function NextVenuePage() {
  const userId = useSessionUser();
  const [floor, setFloor] = useState<LondonFloorId>(NEXT_VENUE_FLOORS[0]!.id);
  const [design, setDesign] = useState<MapDesign>({
    ...DEFAULT_MAP_DESIGN,
    venueName: NEXT_VENUE.venue,
    eventName: NEXT_VENUE.name,
  });
  const [designOpen, setDesignOpen] = useState(false);
  const [areas, setAreas] = useState<LondonCustomArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [areasOpen, setAreasOpen] = useState(true);
  const [carryBuild, setCarryBuild] = useState(true);
  const [scalePct, setScalePct] = useState(100);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AREAS_KEY);
      if (stored) setAreas(parseStoredAreas(stored));
      const d = localStorage.getItem(DESIGN_KEY);
      if (d) setDesign({ ...DEFAULT_MAP_DESIGN, ...(JSON.parse(d) as MapDesign) });
    } catch {
      /* Private mode — the session still draws the plans. */
    }
  }, []);

  const persistAreas = useCallback((next: LondonCustomArea[]) => {
    setAreas(next);
    try {
      localStorage.setItem(AREAS_KEY, JSON.stringify(next));
    } catch {
      /* Private mode — the session still draws the areas. */
    }
  }, []);

  const applyDesign = useCallback((next: MapDesign) => {
    setDesign(next);
    try {
      localStorage.setItem(DESIGN_KEY, JSON.stringify(next));
    } catch {
      /* Private mode — the session still renders the chosen design. */
    }
  }, []);

  const plan = nextVenueFloorPlan(floor);
  // Carried-over scenic units are generated tiles until someone moves one, at
  // which point the stored row wins — the same contract as the London build.
  const allAreas = useMemo(() => {
    if (!carryBuild) return areas;
    const generated = nextVenueScenicAreas().filter((g) => !areas.some((a) => a.id === g.id));
    return [...generated, ...areas];
  }, [areas, carryBuild]);
  const floorAreas = areasOnFloor(allAreas, floor);
  const planWithMine = plan ? planWithAreas(plan, allAreas) : null;

  const scale = scalePct / 100;
  const schedule = useMemo(() => nextVenueSignageSchedule(scale), [scale]);
  const flagged = schedule.filter((r) => r.flags.length);

  const exportOpts = {
    panels: [],
    roomsOnly: true as const,
    labels: false,
    design,
    areas: allAreas,
    plans: NEXT_VENUE_FLOOR_PLANS,
    slug: "next-venue",
  };

  const changeArea = (next: LondonCustomArea) => {
    const clamped = clampArea(next, plan);
    if (!areas.some((a) => a.id === next.id)) return persistAreas([...areas, clamped]);
    persistAreas(areas.map((a) => (a.id === next.id ? clamped : a)));
  };

  const addArea = (kind: MapAreaKind) => {
    const area = newLondonArea(floor, kind, areaLabelFor(kind, floorAreas));
    persistAreas([...areas, area]);
    setSelectedAreaId(area.id);
  };

  const removeArea = (id: string) => {
    persistAreas(areas.filter((a) => a.id !== id));
    if (selectedAreaId === id) setSelectedAreaId(null);
  };

  const btn =
    "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-white";
  const chip = "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";

  return (
    <AppShell bare={!userId}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          to="/events/next/london/maps"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#003FC7] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> London location maps
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#03002C] sm:text-4xl">
          Next venue — provisional plans
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#03002C]/75">
          The same plan sheets, sectioning tools and signage schedule as the London build, on a
          stand-in layout for the next NEXT venue. {NEXT_VENUE.venue}, {NEXT_VENUE.city} ·{" "}
          {NEXT_VENUE.datesLabel}.
        </p>

        <p className="mt-4 rounded-2xl border border-[#FF9B70] bg-[#FF9B70]/12 px-4 py-3 text-[13px] font-medium leading-relaxed text-[#03002C]">
          {NEXT_VENUE.caveat}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {NEXT_VENUE_FLOORS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFloor(f.id)}
              className={`${chip} ${
                floor === f.id
                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                  : "border-[#03002C]/20 bg-white/70 text-[#03002C] hover:bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCarryBuild((v) => !v)}
            className={`${chip} ${
              carryBuild
                ? "border-[#003FC7] bg-[#003FC7]/10 text-[#03002C]"
                : "border-[#03002C]/20 bg-white/70 text-[#03002C]"
            }`}
          >
            <SquareDashed className="mr-1 inline h-3.5 w-3.5" />
            {carryBuild ? "Scenic build carried over" : "Scenic build hidden"}
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-3xl border border-[#03002C]/12 bg-white/70 p-4">
            <LondonFloorMap
              floor={floor}
              plan={plan}
              panels={[]}
              overrides={{}}
              onMove={() => {}}
              onResetOne={() => {}}
              selectedId={null}
              onSelect={() => {}}
              kinds={[]}
              editable={false}
              areasEditable
              roomsOnly
              design={design}
              areas={floorAreas}
              onAreaChange={changeArea}
              onAreaRemove={removeArea}
              selectedAreaId={selectedAreaId}
              onSelectArea={setSelectedAreaId}
            />
          </div>

          <div className="space-y-3">
            <button type="button" onClick={() => setAreasOpen((v) => !v)} className={btn}>
              <SquareDashed className="h-4 w-4" /> {areasOpen ? "Hide" : "Show"} areas
            </button>
            {areasOpen && planWithMine ? (
              <LondonMapAreasPanel
                plan={planWithMine}
                areas={floorAreas}
                selectedId={selectedAreaId}
                onSelect={setSelectedAreaId}
                onAdd={addArea}
                onChange={changeArea}
                onDuplicate={(a) => {
                  const copy = {
                    ...clampArea({ ...a, x: a.x + 1, y: a.y + 1 }, plan),
                    id: newLondonArea(floor).id,
                    label: `${a.label} copy`,
                  };
                  persistAreas([...areas, copy]);
                  setSelectedAreaId(copy.id);
                }}
                onRemove={removeArea}
                design={design}
              />
            ) : null}

            <button type="button" onClick={() => setDesignOpen((v) => !v)} className={btn}>
              <Palette className="h-4 w-4" /> {designOpen ? "Hide" : "Show"} design
            </button>
            {designOpen ? (
              <LondonMapDesignPanel design={design} onChange={applyDesign} roomsOnly />
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => runWithExportFeedback(labels("floor plan SVG", `next-venue-rooms-${floor.toLowerCase()}.svg`), async () => downloadFloorMapSvg(floor, exportOpts))}
          >
            <MapIcon className="h-4 w-4" /> Floor SVG
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => runWithExportFeedback(labels("floor plan PNG", `next-venue-rooms-${floor.toLowerCase()}.png`), async () => downloadFloorMapPng(floor, exportOpts))}
          >
            <ImageIcon className="h-4 w-4" /> Floor PNG
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => runWithExportFeedback(labels("plan set PDF", "next-venue-floor-guide.pdf"), async () => downloadAttendeeMapPdf(exportOpts))}
          >
            <FileDown className="h-4 w-4" /> Plan set PDF
          </button>
          <button
            type="button"
            className={btn}
            onClick={() =>
              runWithExportFeedback(labels("areas CSV", "next-venue-areas.csv"), async () =>
                saveText(londonAreaCsv(allAreas), "next-venue-areas.csv", "text/csv"),
              )
            }
          >
            <Table2 className="h-4 w-4" /> Areas CSV
          </button>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-[#03002C]">
            London signage reissued
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#03002C]/75">
            Every London panel scaled uniformly, so artwork never crops. What does change is
            effective resolution and whether a piece outgrows the press — both are listed rather
            than absorbed.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-[13px] font-semibold text-[#03002C]" htmlFor="nv-scale">
              Scale
            </label>
            <input
              id="nv-scale"
              type="range"
              min={50}
              max={200}
              step={5}
              value={scalePct}
              onChange={(e) => setScalePct(Number(e.target.value))}
              className="w-56"
            />
            <span className="text-[13px] font-semibold text-[#03002C]">{scalePct}%</span>
            <button
              type="button"
              className={btn}
              onClick={() =>
                runWithExportFeedback(labels("signage schedule", `next-venue-signage-${scalePct}pct.csv`), async () =>
                  saveText(
                    nextVenueSignageCsv(schedule),
                    `next-venue-signage-${scalePct}pct.csv`,
                    "text/csv",
                  ),
                )
              }
            >
              <Table2 className="h-4 w-4" /> Schedule CSV
            </button>
          </div>

          <p className="mt-3 text-[13px] font-medium text-[#03002C]/75">
            {flagged.length
              ? `${flagged.length} of ${schedule.length} panels need attention at this scale.`
              : `All ${schedule.length} panels are clean at this scale.`}
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-[#03002C]/12 bg-white/70">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-[#EEF1F7] text-[12px] uppercase tracking-wide text-[#03002C]/70">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Panel</th>
                  <th className="px-4 py-2.5 font-semibold">Room</th>
                  <th className="px-4 py-2.5 font-semibold">London trim</th>
                  <th className="px-4 py-2.5 font-semibold">New trim</th>
                  <th className="px-4 py-2.5 font-semibold">ppi</th>
                  <th className="px-4 py-2.5 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((r) => (
                  <tr key={r.panel.id} className="border-t border-[#03002C]/8">
                    <td className="px-4 py-2.5 font-medium text-[#03002C]">{r.panel.name}</td>
                    <td className="px-4 py-2.5 text-[#03002C]/75">{r.panel.room}</td>
                    <td className="px-4 py-2.5 text-[#03002C]/75">
                      {r.panel.trimW} × {r.panel.trimH} mm
                    </td>
                    <td className="px-4 py-2.5 text-[#03002C]">
                      {r.trimW} × {r.trimH} mm
                    </td>
                    <td className="px-4 py-2.5 text-[#03002C]/75">{r.ppi}</td>
                    <td className="px-4 py-2.5 text-[#03002C]/75">
                      {r.flags.length ? r.flags.join(" · ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
