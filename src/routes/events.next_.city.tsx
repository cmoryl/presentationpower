// /events/next/city — start the playbook for the next NEXT city.
//
// The venue playbook says what London settled. This page turns that into the
// first hour of the NEXT job after it: describe the venue in a few numbers and
// get a starting sign schedule built from the London families — face shape, copy
// slots, ground and print note carried, sizes carried and clearly labelled as
// carried, and the families that still have no build called out as gaps.

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Download, Layers, MapPin } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LONDON_PANELS, LONDON_VENUE, type LondonPanel } from "@/lib/next-london-signage";
import {
  DEFAULT_CITY_BRIEF,
  cityStarter,
  cityStarterCsv,
  type CityBrief,
} from "@/lib/next-city-starter";
import type { VenueTemplateSlot } from "@/lib/next-venue-templates";

const SLOT_LABELS: Record<VenueTemplateSlot, string> = {
  lockup: "Lockup",
  headline: "Headline",
  subhead: "Subhead",
  utility: "Wayfinding line",
  qr: "Scannable code",
  pattern: "Repeat pattern",
};

const GROUND_LABELS: Record<string, string> = {
  "house-gradient": "House gradient",
  "division-gradient": "Division gradient",
  "repeat-white": "Press-wall white",
  supplied: "Supplied artwork",
};

const COUNTS: { key: keyof CityBrief; label: string; hint: string }[] = [
  { key: "floors", label: "Floors in use", hint: "Levels the event occupies" },
  { key: "breakoutRooms", label: "Session rooms", hint: "Rooms needing door branding" },
  { key: "entrances", label: "Entrances", hint: "Street-facing doors" },
  { key: "lifts", label: "Lifts", hint: "Inside the event footprint" },
  { key: "desks", label: "Staffed desks", hint: "Registration, information, support" },
  { key: "divisions", label: "Divisions present", hint: "Each taking branded space" },
  { key: "partnerStands", label: "Partner stands", hint: "Exhibition space" },
];

export const Route = createFileRoute("/events/next_/city")({
  head: () => ({
    meta: [
      { title: "Start the next NEXT city · sign schedule from the London families" },
      {
        name: "description",
        content:
          "Describe the next NEXT venue in a few numbers and get a starting sign schedule built from the London 2026 families: face shapes, copy slots, grounds, print notes and carried sizes ready to survey.",
      },
      { property: "og:title", content: "Start the next NEXT city" },
      {
        property: "og:description",
        content:
          "The London signage families, re-pointed at a new venue: a starting schedule with carried sizes, print notes and the gaps that still need a first build.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NextCityPage,
});

function mm(n: number | null) {
  return n === null ? "—" : `${Math.round(n).toLocaleString()} mm`;
}

function NextCityPage() {
  const [brief, setBrief] = useState<CityBrief>(DEFAULT_CITY_BRIEF);
  const starter = useMemo(() => cityStarter<LondonPanel>(brief, LONDON_PANELS), [brief]);

  const setCount = (key: keyof CityBrief, raw: string) => {
    const n = Number.parseInt(raw, 10);
    setBrief((b) => ({ ...b, [key]: Number.isFinite(n) ? Math.max(0, Math.min(200, n)) : 0 }));
  };

  const downloadCsv = () => {
    const blob = new Blob([cityStarterCsv(starter)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `next-${(brief.city || "city").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-sign-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next/playbook"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> Venue playbook
        </Link>

        <div className="mt-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E0E8F5] px-2.5 py-1 text-[11px] font-medium text-[#003FC7]">
            <MapPin size={12} /> Next city
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">
            Start the next city from the London families
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-[1.5] text-black/70">
            Describe the venue in a few numbers and the schedule below builds itself from the{" "}
            {LONDON_VENUE.name} families. Every line carries its face shape, copy slots, ground and
            print note. Sizes are carried from the London build as a starting point — they are a
            head start, not a measurement of the new venue, so each one is replaced by the site
            survey before anything prints.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-black/10 bg-white p-5">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#03002C]">
              <Building2 size={13} /> The venue
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[11px] font-medium text-black/60">City</span>
                <input
                  value={brief.city}
                  onChange={(e) => setBrief((b) => ({ ...b, city: e.target.value }))}
                  placeholder="Singapore"
                  className="mt-1 w-full rounded-md border border-black/15 px-2.5 py-1.5 text-[13px] outline-none focus:border-[#003FC7] focus:ring-2 focus:ring-[#003FC7]/20"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-black/60">Venue</span>
                <input
                  value={brief.venue}
                  onChange={(e) => setBrief((b) => ({ ...b, venue: e.target.value }))}
                  placeholder="Marina Bay Sands Expo"
                  className="mt-1 w-full rounded-md border border-black/15 px-2.5 py-1.5 text-[13px] outline-none focus:border-[#003FC7] focus:ring-2 focus:ring-[#003FC7]/20"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-black/60">Dates</span>
                <input
                  value={brief.dates}
                  onChange={(e) => setBrief((b) => ({ ...b, dates: e.target.value }))}
                  placeholder="12–13 May 2027"
                  className="mt-1 w-full rounded-md border border-black/15 px-2.5 py-1.5 text-[13px] outline-none focus:border-[#003FC7] focus:ring-2 focus:ring-[#003FC7]/20"
                />
              </label>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {COUNTS.map((c) => (
                  <label key={c.key} className="block">
                    <span className="text-[11px] font-medium text-black/60">{c.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={String(brief[c.key] as number)}
                      onChange={(e) => setCount(c.key, e.target.value)}
                      className="mt-1 w-full rounded-md border border-black/15 px-2.5 py-1.5 text-[13px] outline-none focus:border-[#003FC7] focus:ring-2 focus:ring-[#003FC7]/20"
                    />
                    <span className="mt-0.5 block text-[10px] text-black/45">{c.hint}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-2xl font-semibold tracking-tight text-[#03002C]">
                  {starter.items.length}
                </div>
                <div className="mt-1 text-[12px] text-black/60">Sign families in the schedule</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-2xl font-semibold tracking-tight text-[#03002C]">
                  {starter.pieces.toLocaleString()}
                </div>
                <div className="mt-1 text-[12px] text-black/60">Pieces the brief implies</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-2xl font-semibold tracking-tight text-[#03002C]">
                  {starter.carried}
                </div>
                <div className="mt-1 text-[12px] text-black/60">Start from a carried size</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-2xl font-semibold tracking-tight text-[#03002C]">
                  {starter.gaps.length}
                </div>
                <div className="mt-1 text-[12px] text-black/60">Still need a first build</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-[12px] text-black/55">
                Schedule reference prefix{" "}
                <span className="font-mono text-[#03002C]">{starter.prefix}</span>
              </div>
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#003FC7] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#0034a6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]/40"
              >
                <Download size={13} /> Download schedule (CSV)
              </button>
            </div>

            <div className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-white">
              <table className="w-full min-w-[900px] text-left text-[12px]">
                <caption className="sr-only">
                  Starting sign schedule for the next NEXT city, built from the London families
                </caption>
                <thead className="bg-[#F2F2F2] text-[11px] uppercase tracking-wide text-black/55">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Ref</th>
                    <th scope="col" className="px-3 py-2 font-medium">Family</th>
                    <th scope="col" className="px-3 py-2 font-medium">Where</th>
                    <th scope="col" className="px-3 py-2 font-medium">Qty</th>
                    <th scope="col" className="px-3 py-2 font-medium">Carried size</th>
                    <th scope="col" className="px-3 py-2 font-medium">Ground</th>
                    <th scope="col" className="px-3 py-2 font-medium">Copy it carries</th>
                  </tr>
                </thead>
                <tbody>
                  {starter.items.map((item) => (
                    <tr key={item.ref} className="border-t border-black/8 align-top">
                      <td className="px-3 py-2 font-mono text-[11px] text-black/60">{item.ref}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[#03002C]">{item.family.name}</div>
                        <div className="mt-0.5 text-[11px] text-black/55">
                          {item.family.substrate}
                        </div>
                        <div className="mt-1 text-[11px] text-black/45">{item.family.printNote}</div>
                      </td>
                      <td className="px-3 py-2 text-black/70">{item.area}</td>
                      <td className="px-3 py-2 text-black/70">{item.qty}</td>
                      <td className="px-3 py-2">
                        {item.sizeSource === "carried" ? (
                          <>
                            <div className="font-mono text-[11px] text-[#03002C]">
                              {mm(item.trimW)} × {mm(item.trimH)}
                            </div>
                            <div className="mt-0.5 text-[10px] text-black/45">
                              {mm(item.bleedEdge)} bleed · carried from London, survey to confirm
                            </div>
                          </>
                        ) : (
                          <span className="inline-flex rounded bg-[#FFEB66] px-1.5 py-0.5 text-[10px] font-medium text-[#03002C]">
                            Needs a survey size
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-black/70">
                        {GROUND_LABELS[item.family.ground] ?? item.family.ground}
                      </td>
                      <td className="px-3 py-2 text-black/70">
                        {item.family.slots.map((s) => SLOT_LABELS[s]).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-xl border border-black/10 bg-white p-5">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#03002C]">
                <Layers size={13} /> What still needs deciding on site
              </div>
              <ul className="mt-2 space-y-1.5 text-[13px] text-black/70">
                <li>
                  Every carried size is a London size. Walk the venue, measure each surface, and
                  replace the trim before any file is built — a carried size is a head start, never
                  a measurement of this venue.
                </li>
                <li>
                  Grounds, lighting and in-scene views all carry across unchanged, so views of the
                  new venue stay consistent with London once its surfaces are measured.
                </li>
                {starter.gaps.length > 0 ? (
                  <li>
                    No London build to carry from:{" "}
                    {starter.gaps.map((g) => g.name).join(", ")} — these need a first build at this
                    venue.
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
