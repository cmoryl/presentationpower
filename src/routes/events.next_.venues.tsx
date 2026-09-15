// /events/next/venues — the venue plan format every city in the series fills in.
//
// London settled the sheets; this page is what stops London being the only venue
// that can be drawn. A new city gets a record here — floors, room rectangles,
// doors, orientation, and honest provenance — and inherits every sheet, key,
// card and export unchanged. Nothing is invented: a blank venue starts empty and
// its sheets print the not-to-scale line until a real plan is traced in.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, Check, Copy, Plus, Save, Trash2, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { DEFAULT_MAP_DESIGN } from "@/lib/next-london-floormap-design";
import { floorMapSvg } from "@/lib/next-london-floormap-svg";
import type { LondonFloorId } from "@/lib/next-london-signage";
import {
  VENUE_FLOOR_SLOTS,
  VENUE_ZONE_KINDS,
  blankVenueFloor,
  blankVenuePlan,
  londonVenuePlan,
  newVenueZone,
  planCaveat,
  venuePlanFromLondon,
  venuePlanGaps,
  type VenueFloorPlan,
  type VenuePlanRecord,
  type VenueZone,
} from "@/lib/venue-plan";
import { deleteVenuePlan, listVenuePlans, saveVenuePlan } from "@/lib/venue-plan.functions";

export const Route = createFileRoute("/events/next_/venues")({
  head: () => ({
    meta: [
      { title: "NEXT venue plans — one format for every city" },
      {
        name: "description",
        content:
          "Fill in any NEXT venue once — floors, rooms, doors and orientation — and it inherits the whole London sheet set: install plans, attendee guides, per-asset location cards and print exports.",
      },
      { property: "og:title", content: "NEXT venue plans" },
      {
        property: "og:description",
        content:
          "The shared venue-plan format for the TransPerfect NEXT series: one record per city, with stated provenance and signed-off sign positions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VenuePlansPage,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";
const field =
  "mt-1 w-full rounded-lg border border-[#03002C]/20 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]";
const btn =
  "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-[#F2F2F2]";
const primary =
  "inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "venue"
  );
}

function VenuePlansPage() {
  const userId = useSessionUser();
  const fetchPlans = useServerFn(listVenuePlans);
  const writePlan = useServerFn(saveVenuePlan);
  const removePlan = useServerFn(deleteVenuePlan);

  const [plans, setPlans] = useState<VenuePlanRecord[]>([]);
  const [draft, setDraft] = useState<VenuePlanRecord>(() => londonVenuePlan());
  const [floorId, setFloorId] = useState<LondonFloorId>("GF");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    fetchPlans({})
      .then((res) => {
        if (!live) return;
        setPlans(res.plans);
        if (res.plans[0]) setDraft(res.plans[0]);
      })
      .catch(() => setStatus("Could not load saved venue plans."));
    return () => {
      live = false;
    };
  }, [fetchPlans, userId]);

  const floor = useMemo(
    () => draft.floors.find((f) => f.floor === floorId) ?? draft.floors[0] ?? null,
    [draft.floors, floorId],
  );
  const gaps = useMemo(() => venuePlanGaps(draft), [draft]);

  const preview = useMemo(() => {
    if (!floor) return "";
    try {
      return floorMapSvg(floor.floor, {
        plan: floor,
        panels: [],
        roomsOnly: true,
        labels: false,
        design: DEFAULT_MAP_DESIGN,
        footerNote: draft.venue || draft.name,
      });
    } catch {
      return "";
    }
  }, [draft.name, draft.venue, floor]);

  const setFloorPlan = useCallback(
    (next: VenueFloorPlan) => {
      setDraft((cur) => ({
        ...cur,
        floors: cur.floors.map((f) => (f.floor === next.floor ? next : f)),
      }));
    },
    [],
  );

  const setZone = (next: VenueZone) => {
    if (!floor) return;
    setFloorPlan({ ...floor, zones: floor.zones.map((z) => (z.id === next.id ? next : z)) });
  };

  const save = () => {
    if (!userId) return;
    setBusy(true);
    setStatus("Saving…");
    writePlan({
      data: {
        slug: draft.slug,
        eventId: draft.eventId,
        name: draft.name,
        city: draft.city,
        venue: draft.venue,
        datesLabel: draft.datesLabel,
        producer: draft.producer,
        surveyed: draft.surveyed,
        surveySource: draft.surveySource,
        surveyDate: draft.surveyDate,
        caveat: draft.caveat,
        floors: draft.floors,
      },
    })
      .then((res) => {
        setDraft(res.plan);
        setPlans((cur) => [res.plan, ...cur.filter((p) => p.slug !== res.plan.slug)]);
        setStatus(`Saved ${res.plan.name}.`);
      })
      .catch((e: unknown) => setStatus(e instanceof Error ? e.message : "Save failed."))
      .finally(() => setBusy(false));
  };

  const startBlank = () => {
    setDraft(blankVenuePlan("new-venue", "New NEXT venue"));
    setFloorId("GF");
    setStatus("Blank venue — nothing is filled in yet.");
  };

  const startFromLondon = () => {
    setDraft(venuePlanFromLondon("new-venue", "New NEXT venue"));
    setFloorId("GF");
    setStatus("Started from the London build — replace each floor as the real plans arrive.");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-8">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]"
        >
          <ArrowLeft className="h-4 w-4" /> NEXT events
        </Link>

        <header className="mt-5 overflow-hidden rounded-3xl border border-[#03002C]/10">
          <div
            className="px-6 py-9 sm:px-10 sm:py-11"
            style={{
              background:
                "radial-gradient(58% 88% at 8% 90%, #8C82F0 0%, transparent 62%), radial-gradient(52% 80% at 70% 12%, #CFF6F7 0%, transparent 62%), #B7EEF3",
            }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#03002C]/70">
              Venue plans · NEXT series
            </p>
            <h1 className="mt-3 max-w-[30ch] text-3xl font-bold leading-[1.05] tracking-tight text-[#03002C] sm:text-[2.6rem]">
              One venue format, every city
            </h1>
            <p className="mt-4 max-w-[64ch] text-sm leading-relaxed text-[#03002C]/75 sm:text-base">
              Fill a venue in once — floors, rooms, doors and which way the plan faces — and it
              inherits the whole London sheet set: install plans, attendee guides, per-asset location
              cards and print exports. Sign positions are saved against the venue, so next year
              starts from the crew&apos;s real spots instead of a fresh guess.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" className={primary} onClick={startFromLondon}>
                <Copy className="h-4 w-4" /> Start from the London build
              </button>
              <button type="button" className={btn} onClick={startBlank}>
                <Plus className="h-4 w-4" /> Start a blank venue
              </button>
              <Link to="/events/next/london/maps" className={btn}>
                <Building2 className="h-4 w-4" /> London maps
              </Link>
            </div>
          </div>
        </header>

        {!userId ? (
          <p className="mt-6 rounded-2xl border border-[#003FC7]/25 bg-[#E0E8F5] p-4 text-sm text-[#03002C]">
            Sign in to save a venue plan so the rest of the crew works from it.
          </p>
        ) : null}

        {plans.length ? (
          <section className="mt-9">
            <h2 className="text-lg font-semibold text-[#03002C]">Saved venues</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <div key={p.slug} className={card}>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                    {p.city || "City to be confirmed"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#03002C]">{p.name}</p>
                  <p className="mt-1 text-xs text-[#03002C]/65">
                    {p.venue || "Venue to be confirmed"} · {p.floors.length} floor
                    {p.floors.length === 1 ? "" : "s"} ·{" "}
                    {p.surveyed ? "to scale" : "not to scale"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btn}
                      onClick={() => {
                        setDraft(p);
                        setFloorId(p.floors[0]?.floor ?? "GF");
                      }}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className={btn}
                      onClick={() => {
                        removePlan({ data: { slug: p.slug } })
                          .then(() => {
                            setPlans((cur) => cur.filter((x) => x.slug !== p.slug));
                            setStatus(`Removed ${p.name}.`);
                          })
                          .catch(() => setStatus("Only the person who added it, or an admin, can remove a venue."));
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Venue details */}
        <section className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className={card}>
            <h2 className="text-lg font-semibold text-[#03002C]">Venue</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#03002C]/70">
                Name in the build
                <input
                  className={field}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      name: e.target.value,
                      slug: c.slug === "new-venue" ? slugify(e.target.value) : c.slug,
                    }))
                  }
                />
              </label>
              <label className="text-xs font-semibold text-[#03002C]/70">
                Short key (used in file names)
                <input
                  className={field}
                  value={draft.slug}
                  onChange={(e) => setDraft((c) => ({ ...c, slug: slugify(e.target.value) }))}
                />
              </label>
              <label className="text-xs font-semibold text-[#03002C]/70">
                City
                <input
                  className={field}
                  value={draft.city}
                  onChange={(e) => setDraft((c) => ({ ...c, city: e.target.value }))}
                />
              </label>
              <label className="text-xs font-semibold text-[#03002C]/70">
                Venue
                <input
                  className={field}
                  value={draft.venue}
                  onChange={(e) => setDraft((c) => ({ ...c, venue: e.target.value }))}
                />
              </label>
              <label className="text-xs font-semibold text-[#03002C]/70">
                Dates line
                <input
                  className={field}
                  value={draft.datesLabel}
                  onChange={(e) => setDraft((c) => ({ ...c, datesLabel: e.target.value }))}
                />
              </label>
              <label className="text-xs font-semibold text-[#03002C]/70">
                Production partner
                <input
                  className={field}
                  value={draft.producer}
                  onChange={(e) => setDraft((c) => ({ ...c, producer: e.target.value }))}
                />
              </label>
            </div>

            <h3 className="mt-6 text-sm font-semibold text-[#03002C]">Where the plan came from</h3>
            <label className="mt-3 flex items-start gap-3 text-sm text-[#03002C]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={draft.surveyed}
                onChange={(e) => setDraft((c) => ({ ...c, surveyed: e.target.checked }))}
              />
              <span>
                Traced from a real drawing — rooms are to scale.
                <span className="block text-xs text-[#03002C]/60">
                  Leave unticked until the venue&apos;s CAD or a scaled PDF has been traced in. Every
                  sheet prints the not-to-scale line meanwhile.
                </span>
              </span>
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[#03002C]/70">
                Traced from
                <input
                  className={field}
                  placeholder="Venue CAD, scaled PDF, survey report…"
                  value={draft.surveySource}
                  onChange={(e) => setDraft((c) => ({ ...c, surveySource: e.target.value }))}
                />
              </label>
              <label className="text-xs font-semibold text-[#03002C]/70">
                Date traced
                <input
                  type="date"
                  className={field}
                  value={draft.surveyDate ?? ""}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, surveyDate: e.target.value || null }))
                  }
                />
              </label>
            </div>
            <label className="mt-3 block text-xs font-semibold text-[#03002C]/70">
              Extra line to print on every sheet
              <input
                className={field}
                value={draft.caveat}
                onChange={(e) => setDraft((c) => ({ ...c, caveat: e.target.value }))}
              />
            </label>
            <p className="mt-3 rounded-lg bg-[#F2F2F2] p-3 text-[11.5px] leading-relaxed text-[#03002C]/75">
              {planCaveat(draft)}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" className={primary} onClick={save} disabled={!userId || busy}>
                <Save className="h-4 w-4" /> Save venue plan
              </button>
              {status ? <span className="text-xs text-[#03002C]/70">{status}</span> : null}
            </div>

            <div className="mt-5 rounded-xl border border-[#03002C]/12 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
                {gaps.length ? (
                  <>
                    <TriangleAlert className="h-4 w-4 text-[#FF9B70]" /> {gaps.length} thing
                    {gaps.length === 1 ? "" : "s"} still to fill in
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-[#003FC7]" /> Nothing outstanding
                  </>
                )}
              </p>
              {gaps.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-[#03002C]/75">
                  {gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Floors */}
          <div className={card}>
            <h2 className="text-lg font-semibold text-[#03002C]">Floors</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.floors.map((f) => (
                <button
                  key={f.floor}
                  type="button"
                  onClick={() => setFloorId(f.floor)}
                  aria-pressed={floor?.floor === f.floor}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    floor?.floor === f.floor
                      ? "border-[#03002C] bg-[#03002C] text-white"
                      : "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
                  }`}
                >
                  {f.label} · {f.zones.length}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {VENUE_FLOOR_SLOTS.filter((s) => !draft.floors.some((f) => f.floor === s.id)).map(
                (s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={btn}
                    onClick={() => {
                      setDraft((c) => ({ ...c, floors: [...c.floors, blankVenueFloor(s.id)] }));
                      setFloorId(s.id);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add {s.label}
                  </button>
                ),
              )}
            </div>

            {floor ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-[#03002C]/70">
                    Floor name
                    <input
                      className={field}
                      value={floor.label}
                      onChange={(e) => setFloorPlan({ ...floor, label: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#03002C]/70">
                    Width (m)
                    <input
                      type="number"
                      className={field}
                      value={floor.w}
                      onChange={(e) =>
                        setFloorPlan({ ...floor, w: Math.max(4, Number(e.target.value) || 4) })
                      }
                    />
                  </label>
                  <label className="text-xs font-semibold text-[#03002C]/70">
                    Depth (m)
                    <input
                      type="number"
                      className={field}
                      value={floor.h}
                      onChange={(e) =>
                        setFloorPlan({ ...floor, h: Math.max(4, Number(e.target.value) || 4) })
                      }
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-semibold text-[#03002C]/70">
                  How the plan reads (printed on the sheet)
                  <input
                    className={field}
                    value={floor.orientation}
                    onChange={(e) => setFloorPlan({ ...floor, orientation: e.target.value })}
                  />
                </label>

                <div className="mt-5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#03002C]">Rooms on this floor</h3>
                  <button
                    type="button"
                    className={btn}
                    onClick={() =>
                      setFloorPlan({ ...floor, zones: [...floor.zones, newVenueZone(floor)] })
                    }
                  >
                    <Plus className="h-4 w-4" /> Add room
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {floor.zones.length ? (
                    floor.zones.map((z) => (
                      <div key={z.id} className="rounded-xl border border-[#03002C]/12 p-3">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                          <input
                            className={field}
                            value={z.label}
                            onChange={(e) =>
                              setZone({ ...z, label: e.target.value, rooms: [e.target.value] })
                            }
                          />
                          <select
                            className={field}
                            value={z.kind}
                            onChange={(e) =>
                              setZone({ ...z, kind: e.target.value as VenueZone["kind"] })
                            }
                          >
                            {VENUE_ZONE_KINDS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {(
                            [
                              ["x", "Across"],
                              ["y", "Down"],
                              ["w", "Width"],
                              ["h", "Depth"],
                            ] as const
                          ).map(([key, label]) => (
                            <label
                              key={key}
                              className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#03002C]/55"
                            >
                              {label}
                              <input
                                type="number"
                                className={field}
                                value={z[key]}
                                onChange={(e) =>
                                  setZone({ ...z, [key]: Number(e.target.value) || 0 })
                                }
                              />
                            </label>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="mt-2 text-xs font-semibold text-[#E53D2E] hover:underline"
                          onClick={() =>
                            setFloorPlan({
                              ...floor,
                              zones: floor.zones.filter((x) => x.id !== z.id),
                            })
                          }
                        >
                          Remove room
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#03002C]/65">
                      No rooms on this floor yet. Add the rooms from the venue&apos;s own plan — name,
                      what it is used for and where it sits.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#03002C]">Doors and arrival points</h3>
                  <button
                    type="button"
                    className={btn}
                    onClick={() =>
                      setFloorPlan({
                        ...floor,
                        entries: [
                          ...floor.entries,
                          { label: "Entrance", x: floor.w / 2, y: floor.h },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4" /> Add door
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {floor.entries.map((e, i) => (
                    <div key={`${e.label}-${i}`} className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                      <input
                        className={field}
                        value={e.label}
                        onChange={(ev) =>
                          setFloorPlan({
                            ...floor,
                            entries: floor.entries.map((x, j) =>
                              j === i ? { ...x, label: ev.target.value } : x,
                            ),
                          })
                        }
                      />
                      <input
                        type="number"
                        className={`${field} w-20`}
                        value={e.x}
                        onChange={(ev) =>
                          setFloorPlan({
                            ...floor,
                            entries: floor.entries.map((x, j) =>
                              j === i ? { ...x, x: Number(ev.target.value) || 0 } : x,
                            ),
                          })
                        }
                      />
                      <input
                        type="number"
                        className={`${field} w-20`}
                        value={e.y}
                        onChange={(ev) =>
                          setFloorPlan({
                            ...floor,
                            entries: floor.entries.map((x, j) =>
                              j === i ? { ...x, y: Number(ev.target.value) || 0 } : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#E53D2E] hover:underline"
                        onClick={() =>
                          setFloorPlan({
                            ...floor,
                            entries: floor.entries.filter((_, j) => j !== i),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {preview ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-[#03002C]">Sheet preview</h3>
                    <div
                      className="mt-2 overflow-auto rounded-xl border border-[#03002C]/12 bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
                      // The sheet is generated by our own renderer from the record above.
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-sm text-[#03002C]/70">Add a floor to start the plan.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
