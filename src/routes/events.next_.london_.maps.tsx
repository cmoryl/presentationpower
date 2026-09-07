// /events/next/london/maps — top-down location maps for the London kit.
//
// One schematic install plan per floor with every asset pinned in its scheduled
// zone, plus a per-asset location card the crew can pack with the print. Pin
// positions are correctable and persist per browser, and every download reads
// the corrected set.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Download,
  FileDown,
  Image as ImageIcon,
  Map as MapIcon,
  Maximize2,
  X,
  Package,
  Palette,
  RotateCcw,
  SquareDashed,
  Table2,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LondonFloorMap, londonKindsPresent } from "@/components/events/LondonFloorMap";
import { LondonMapDesignPanel } from "@/components/events/LondonMapDesignPanel";
import { LondonMapAreasPanel } from "@/components/events/LondonMapAreasPanel";
import { useSessionUser } from "@/hooks/use-session-user";
import { runWithExportFeedback } from "@/lib/export-feedback";
import {
  LONDON_ASSET_KIND_LABEL,
  LONDON_FACE_LABEL,
  londonAssetKind,
  londonFloorPlan,
  londonMappedFloors,
  londonMarkerFor,
  type LondonAssetKind,
  type LondonMarkerOverrides,
} from "@/lib/next-london-floorplan";
import {
  downloadAssetMapPack,
  downloadAssetMapPng,
  downloadAssetMapSvg,
  downloadAttendeeMapPdf,
  downloadFloorMapPdf,
  downloadFloorMapPng,
  downloadFloorMapSvg,
  downloadMapCsv,
} from "@/lib/next-london-floormap-export";
import {
  DEFAULT_MAP_DESIGN,
  type MapAreaKind,
  type MapDesign,
} from "@/lib/next-london-floormap-design";
import {
  areasOnFloor,
  clampArea,
  newLondonArea,
  parseStoredAreas,
  planWithAreas,
  type LondonCustomArea,
} from "@/lib/next-london-floormap-areas";
import { areaKindLabel } from "@/lib/next-london-floormap-icons";
import { effectiveLondonPanels } from "@/lib/next-london-revise";
import { listLondonRevisions } from "@/lib/next-london-revise.functions";
import {
  LONDON_PANELS,
  LONDON_VENUE,
  type LondonFloorId,
  type LondonPanel,
} from "@/lib/next-london-signage";

/** Next free name for a kind on this floor: "Stage", "Stage 2", "Stage 3"… */
function areaLabelFor(kind: MapAreaKind, existing: readonly LondonCustomArea[]): string {
  const base = areaKindLabel(kind);
  const used = existing.filter((a) => a.kind === kind).length;
  return used ? `${base} ${used + 1}` : base;
}

const STORE_KEY = "next-london-map-positions-v1";
const DESIGN_KEY = "next-london-map-design-v1";
const AREAS_KEY = "next-london-map-areas-v1";

export const Route = createFileRoute("/events/next_/london_/maps")({
  head: () => ({
    meta: [
      { title: "NEXT 2026 London install maps · QEII Centre floor plans" },
      {
        name: "description",
        content:
          "Top-down location maps for every TransPerfect NEXT 2026 London asset — pillars, door vinyls, walls, booths and step & repeats pinned per QEII Centre floor, with per-asset install cards and PDF plan sets.",
      },
      { property: "og:title", content: "NEXT 2026 London install maps" },
      {
        property: "og:description",
        content:
          "Per-floor top-down plans with every signage asset pinned in its zone, correctable on screen and exportable as SVG, PNG, PDF or a per-asset card pack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LondonMapsPage,
});

function LondonMapsPage() {
  const userId = useSessionUser();
  const fetchRevisions = useServerFn(listLondonRevisions);
  const [panels, setPanels] = useState<LondonPanel[]>(LONDON_PANELS);
  const [overrides, setOverrides] = useState<LondonMarkerOverrides>({});
  const [floor, setFloor] = useState<LondonFloorId>("GF");
  const [kinds, setKinds] = useState<LondonAssetKind[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /** Attendee mode draws rooms and breakouts only — no signage pins. */
  const [attendee, setAttendee] = useState(false);
  /** Live map design — previewed on screen and read by every download. */
  const [design, setDesign] = useState<MapDesign>(DEFAULT_MAP_DESIGN);
  const [designOpen, setDesignOpen] = useState(false);
  /** Areas the team sectioned off themselves, across every floor. */
  const [areas, setAreas] = useState<LondonCustomArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [areasOpen, setAreasOpen] = useState(false);
  /** Large window: the same live editor, given the whole screen. */
  const [expanded, setExpanded] = useState(false);

  // Corrections live per browser: the location team marks up positions on site
  // and the same browser keeps producing corrected maps.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setOverrides(JSON.parse(raw) as LondonMarkerOverrides);
      const rawDesign = localStorage.getItem(DESIGN_KEY);
      // Merge over the defaults so a design saved before a new control existed
      // still opens with every field populated.
      if (rawDesign) setDesign({ ...DEFAULT_MAP_DESIGN, ...(JSON.parse(rawDesign) as MapDesign) });
      const rawAreas = localStorage.getItem(AREAS_KEY);
      if (rawAreas) setAreas(parseStoredAreas(rawAreas));
    } catch {
      /* Corrupt or unavailable storage — schematic positions stand. */
    }
  }, []);

  const persist = useCallback((next: LondonMarkerOverrides) => {
    setOverrides(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* Private mode — the session still shows the corrected map. */
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    fetchRevisions({})
      .then((res) => {
        if (!live) return;
        const inForce = effectiveLondonPanels(res.revisions);
        if (inForce.length) setPanels(inForce);
      })
      .catch(() => {
        /* Issued pack stands. */
      });
    return () => {
      live = false;
    };
  }, [fetchRevisions, userId]);

  const floors = useMemo(() => londonMappedFloors(panels), [panels]);
  const plan = londonFloorPlan(floor);
  const kindsOnFloor = useMemo(() => londonKindsPresent(panels, floor), [panels, floor]);
  const floorPanels = useMemo(() => panels.filter((p) => p.floor === floor), [panels, floor]);
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return floorPanels.filter(
      (p) =>
        (!kinds.length || kinds.includes(londonAssetKind(p))) &&
        (!q ||
          `${p.name} ${p.room} ${p.trimW}x${p.trimH} ${LONDON_ASSET_KIND_LABEL[londonAssetKind(p)]}`
            .toLowerCase()
            .includes(q)),
    );
  }, [floorPanels, kinds, query]);
  const selected = floorPanels.find((p) => p.id === selectedId) ?? null;
  const selectedMarker = selected ? londonMarkerFor(selected, panels, overrides) : null;
  const installOpts = { panels, overrides, kinds, labels: true, design, areas };
  const exportOpts = attendee
    ? { panels, overrides, roomsOnly: true, labels: false, design, areas }
    : installOpts;
  const floorAreas = areasOnFloor(areas, floor);
  const planWithMine = plan ? planWithAreas(plan, areas) : null;

  const changeArea = (next: LondonCustomArea) =>
    persistAreas(areas.map((a) => (a.id === next.id ? clampArea(next, plan) : a)));
  const addArea = (kind: MapAreaKind) => {
    const area = newLondonArea(floor, kind, areaLabelFor(kind, floorAreas));
    persistAreas([...areas, area]);
    setSelectedAreaId(area.id);
  };

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

  const correctedCount = Object.keys(overrides).length;

  useEffect(() => {
    if (floors.length && !floors.some((f) => f.id === floor)) setFloor(floors[0]!.id);
  }, [floors, floor]);

  const toggleKind = (k: LondonAssetKind) =>
    setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const move = useCallback(
    (panelId: string, x: number, y: number) => {
      persist({ ...overrides, [panelId]: { x, y } });
    },
    [overrides, persist],
  );

  const resetOne = useCallback(
    (panelId: string) => {
      const next = { ...overrides };
      delete next[panelId];
      persist(next);
    },
    [overrides, persist],
  );

  // The large window is a modal surface: Escape closes it and the page behind
  // stops scrolling so the plan owns the screen.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const chip = "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";
  const btn =
    "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-white";

  const floorMap = (
    <LondonFloorMap
      floor={floor}
      panels={panels}
      overrides={overrides}
      onMove={move}
      onResetOne={resetOne}
      kinds={kinds}
      selectedId={selectedId}
      onSelect={setSelectedId}
      editable={!attendee}
      // Sectioned areas belong to the team, so they stay draggable even in the
      // attendee guide where the signage pins are locked.
      areasEditable
      roomsOnly={attendee}
      design={design}
      areas={floorAreas}
      onAreaChange={changeArea}
      onAreaRemove={(id) => {
        persistAreas(areas.filter((a) => a.id !== id));
        if (selectedAreaId === id) setSelectedAreaId(null);
      }}
      selectedAreaId={selectedAreaId}
      onSelectArea={setSelectedAreaId}
    />
  );

  const designPanel = (
    <LondonMapDesignPanel design={design} onChange={applyDesign} roomsOnly={attendee} />
  );

  const areasPanel = planWithMine ? (
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
      onRemove={(id) => {
        persistAreas(areas.filter((a) => a.id !== id));
        if (selectedAreaId === id) setSelectedAreaId(null);
      }}
      design={design}
    />
  ) : null;

  return (
    <AppShell bare={!userId}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          to="/events/next/london"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#003FC7] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> London scenic panel kit
        </Link>

        <header className="mt-5 overflow-hidden rounded-2xl border border-black/10">
          <div
            className="px-6 py-9 sm:px-10 sm:py-11"
            style={{
              background:
                "radial-gradient(58% 88% at 10% 92%, #8C82F0 0%, transparent 62%), radial-gradient(52% 80% at 66% 14%, #CFF6F7 0%, transparent 62%), #B7EEF3",
            }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#03002C]/70">
              Location maps · Job {LONDON_VENUE.job}
            </p>
            <h1 className="mt-3 max-w-[26ch] text-3xl font-bold leading-[1.05] tracking-tight text-[#03002C] sm:text-[2.6rem]">
              Top-down install maps, floor by floor
            </h1>
            <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-[#03002C]/75 sm:text-base">
              {LONDON_VENUE.venue}, {LONDON_VENUE.city}. Every asset in the kit is pinned in its
              scheduled floor and zone on the face it installs against, so a pillar wrap, door vinyl
              or booth wall can be packed with its own location card. Plans are schematic — drag any
              pin to the real position and every download follows.
            </p>
            <dl className="mt-7 flex flex-wrap gap-x-9 gap-y-4">
              {[
                { k: "Floors mapped", v: String(floors.length) },
                {
                  k: "Assets pinned",
                  v: String(panels.filter((p) => londonFloorPlan(p.floor)).length),
                },
                { k: "Positions confirmed", v: String(correctedCount) },
              ].map((s) => (
                <div key={s.k}>
                  <dd className="text-2xl font-semibold tracking-tight text-[#03002C]">{s.v}</dd>
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
                    {s.k}
                  </dt>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                onClick={() =>
                  runWithExportFeedback(
                    {
                      pending: "Building the install plan set…",
                      success: "next-london-install-maps.pdf downloaded",
                      failure: "Install plan set failed",
                    },
                    () => downloadFloorMapPdf(installOpts),
                  )
                }
              >
                <FileDown className="h-4 w-4" /> Install plan set (PDF)
              </button>
              <button
                type="button"
                className={btn}
                onClick={() =>
                  runWithExportFeedback(
                    {
                      pending: "Building the attendee floor guide…",
                      success: "next-london-floor-guide.pdf downloaded",
                      failure: "Attendee floor guide failed",
                    },
                    () => downloadAttendeeMapPdf({ panels, overrides }),
                  )
                }
              >
                <FileDown className="h-4 w-4" /> Attendee floor guide (PDF)
              </button>
              <button
                type="button"
                className={btn}
                onClick={() =>
                  runWithExportFeedback(
                    {
                      pending: "Building one location card per asset…",
                      success: "next-london-location-maps.zip downloaded",
                      failure: "Location card pack failed",
                    },
                    () => downloadAssetMapPack(installOpts),
                  )
                }
              >
                <Package className="h-4 w-4" /> Per-asset cards (ZIP)
              </button>
              <button type="button" className={btn} onClick={() => downloadMapCsv(installOpts)}>
                <Table2 className="h-4 w-4" /> Install positions (CSV)
              </button>
              {correctedCount ? (
                <button
                  type="button"
                  className={btn}
                  onClick={() => persist({})}
                  title="Return every pin to its schematic position"
                >
                  <RotateCcw className="h-4 w-4" /> Reset {correctedCount} correction
                  {correctedCount === 1 ? "" : "s"}
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {/* Floor picker */}
        <section className="mt-9">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#03002C]">
            <MapIcon className="h-4.5 w-4.5 text-[#003FC7]" /> Floor plan
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {floors.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFloor(f.id);
                  setSelectedId(null);
                }}
                aria-pressed={floor === f.id}
                className={`${chip} ${
                  floor === f.id
                    ? "border-[#03002C] bg-[#03002C] text-white"
                    : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
                }`}
              >
                {f.label} · {f.count}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(
              [
                { id: false, label: "Install plan · signage pinned" },
                { id: true, label: "Attendee guide · rooms only" },
              ] as const
            ).map((m) => (
              <button
                key={String(m.id)}
                type="button"
                onClick={() => {
                  setAttendee(m.id);
                  setSelectedId(null);
                }}
                aria-pressed={attendee === m.id}
                className={`${chip} ${
                  attendee === m.id
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {attendee ? null : (
            <div className="mt-3 flex flex-wrap gap-2">
              {kindsOnFloor.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  aria-pressed={kinds.includes(k)}
                  className={`${chip} ${
                    kinds.includes(k)
                      ? "border-[#003FC7] bg-[#E0E8F5] text-[#03002C]"
                      : "border-[#03002C]/15 bg-white text-[#03002C]/70 hover:bg-[#F2F2F2]"
                  }`}
                >
                  {LONDON_ASSET_KIND_LABEL[k]}
                </button>
              ))}
              {kinds.length ? (
                <button
                  type="button"
                  onClick={() => setKinds([])}
                  className={`${chip} border-[#03002C]/15 bg-white text-[#03002C]/70 hover:bg-[#F2F2F2]`}
                >
                  Show all kinds
                </button>
              ) : null}
            </div>
          )}

          <p className="mt-3 text-[12.5px] leading-relaxed text-[#03002C]/65">
            {attendee
              ? "Attendee floor guide: rooms and breakout spaces named, signage hidden. Print or share these sheets with delegates."
              : "Schematic layout drawn from the venue room list — sizes are for orientation, not measurement."}
          </p>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            {expanded ? (
              <div className="flex min-h-[16rem] flex-col items-start justify-center gap-2 rounded-2xl border border-dashed border-[#03002C]/20 bg-[#F5F8FD] p-6">
                <p className="text-[13px] font-semibold text-[#03002C]">
                  This plan is open in the large window.
                </p>
                <button type="button" className={btn} onClick={() => setExpanded(true)}>
                  <Maximize2 className="h-4 w-4" /> Back to the large window
                </button>
              </div>
            ) : (
              <div>
                {floorMap}
                <button
                  type="button"
                  className={`${btn} mt-2.5`}
                  onClick={() => setExpanded(true)}
                >
                  <Maximize2 className="h-4 w-4" /> Open large editor
                </button>
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btn}
                  onClick={() => downloadFloorMapSvg(floor, exportOpts)}
                >
                  <Download className="h-4 w-4" />{" "}
                  {attendee ? "Floor guide (SVG)" : "Floor map (SVG)"}
                </button>
                <button
                  type="button"
                  className={btn}
                  onClick={() =>
                    runWithExportFeedback(
                      {
                        pending: "Rasterising the floor map…",
                        success: "Floor map PNG downloaded",
                        failure: "Floor map PNG failed",
                      },
                      () => downloadFloorMapPng(floor, exportOpts),
                    )
                  }
                >
                  <ImageIcon className="h-4 w-4" />{" "}
                  {attendee ? "Floor guide (PNG)" : "Floor map (PNG)"}
                </button>
                <button
                  type="button"
                  className={btn}
                  aria-expanded={designOpen}
                  onClick={() => setDesignOpen((v) => !v)}
                >
                  <Palette className="h-4 w-4" /> {designOpen ? "Hide design" : "Design the map"}
                </button>
                <button
                  type="button"
                  className={btn}
                  aria-expanded={areasOpen}
                  onClick={() => setAreasOpen((v) => !v)}
                >
                  <SquareDashed className="h-4 w-4" />{" "}
                  {areasOpen
                    ? "Hide areas"
                    : `Section off areas${floorAreas.length ? ` · ${floorAreas.length}` : ""}`}
                </button>
              </div>

              {designOpen ? <div className="mt-3">{designPanel}</div> : null}

              {areasOpen && areasPanel ? <div className="mt-3">{areasPanel}</div> : null}

              {attendee ? (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-[#03002C]">
                    Rooms and breakouts on this floor
                  </h3>
                  <ul className="mt-2 max-h-[30rem] divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/10 bg-white">
                    {(planWithMine?.zones ?? [])
                      .filter((z) => z.kind !== "circulation" && z.kind !== "core")
                      .map((z) => (
                        <li
                          key={z.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-[13px] text-[#03002C]"
                        >
                          <span className="truncate font-medium">{z.label}</span>
                          <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
                            {z.kind}
                          </span>
                        </li>
                      ))}
                  </ul>
                </>
              ) : (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-[#03002C]">
                    Assets on this floor ({listed.length}
                    {listed.length === floorPanels.length ? "" : ` of ${floorPanels.length}`})
                  </h3>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find an asset, room or size…"
                    aria-label="Search assets on this floor"
                    className="mt-2 w-full rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] text-[#03002C] outline-none placeholder:text-[#03002C]/40 focus:border-[#003FC7]"
                  />
                  <ul className="mt-2 max-h-[30rem] divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/10 bg-white">
                    {listed.length ? (
                      listed.map((p) => {
                        const active = p.id === selectedId;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(active ? null : p.id)}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                                active ? "bg-[#E0E8F5]" : "hover:bg-[#F7F9FC]"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-medium text-[#03002C]">
                                  {p.name}
                                </span>
                                <span className="block truncate font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
                                  {LONDON_ASSET_KIND_LABEL[londonAssetKind(p)]} · {p.room}
                                  {overrides[p.id] ? " · confirmed" : ""}
                                </span>
                              </span>
                              <span className="shrink-0 font-mono text-[10.5px] text-[#03002C]/50">
                                {p.trimW}×{p.trimH}
                              </span>
                            </button>
                          </li>
                        );
                      })
                    ) : (
                      <li className="px-3 py-4 text-[12.5px] text-[#03002C]/60">
                        No asset on this floor matches the current filters.
                      </li>
                    )}
                  </ul>
                </>
              )}

              {selected && !attendee ? (
                <div className="mt-4 rounded-xl border border-[#003FC7]/25 bg-[#E0E8F5] p-4">
                  <p className="text-[13px] font-semibold text-[#03002C]">{selected.name}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#03002C]/75">
                    {LONDON_ASSET_KIND_LABEL[londonAssetKind(selected)]} · {selected.room} ·{" "}
                    {selected.trimW} × {selected.trimH} mm trim, {selected.bleedEdge} mm bleed per
                    edge.
                  </p>
                  <p className="mt-1 text-[12px] text-[#03002C]/65">
                    {selectedMarker
                      ? `${LONDON_FACE_LABEL[selectedMarker.face]} · x ${selectedMarker.x.toFixed(
                          1,
                        )} m / y ${selectedMarker.y.toFixed(1)} m · ${
                          selectedMarker.corrected ? "position confirmed" : "schematic position"
                        }`
                      : "Not pinned on this plan."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                      onClick={() => downloadAssetMapSvg(selected, exportOpts)}
                    >
                      <Download className="h-4 w-4" /> Location card (SVG)
                    </button>
                    <button
                      type="button"
                      className={btn}
                      onClick={() =>
                        runWithExportFeedback(
                          {
                            pending: "Rasterising the location card…",
                            success: "Location card PNG downloaded",
                            failure: "Location card PNG failed",
                          },
                          () => downloadAssetMapPng(selected, exportOpts),
                        )
                      }
                    >
                      <ImageIcon className="h-4 w-4" /> Location card (PNG)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-black/10 bg-white p-4 text-[12.5px] leading-relaxed text-[#03002C]/70">
                  Pick an asset to see its spec and download a location card. Pins can be dragged,
                  or nudged with the arrow keys once focused.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Large window — the same live editor, given the whole screen, with the
          design and area controls beside it. State is shared, so anything moved
          here is already moved on the page behind. */}
      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${plan?.label ?? "Floor"} live plan editor`}
          className="fixed inset-0 z-50 flex flex-col bg-[#03002C]/70 p-3 backdrop-blur-sm sm:p-5"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#F7F9FC] shadow-2xl">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold text-[#03002C]">
                  {plan?.label ?? "Floor plan"} — live editor
                </h2>
                <p className="mt-0.5 text-[11.5px] text-[#03002C]/60">
                  Drag an area to move it, pull its corner to size it. Scroll to zoom, drag the plan
                  to pan. Press Escape to close.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
              >
                <X className="h-4 w-4" /> Close
              </button>
            </header>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[minmax(0,1fr)_23rem] xl:overflow-hidden">
              <div className="min-w-0 xl:overflow-y-auto">{floorMap}</div>
              <div className="min-w-0 space-y-3 xl:overflow-y-auto">
                {areasPanel}
                {designPanel}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
