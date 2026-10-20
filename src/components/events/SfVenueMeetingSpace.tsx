// InterContinental San Francisco meeting space: the hotel's floor plans and
// capacity chart, plus a one-click copy into the event's room list as a draft
// (admins / brand leads publish it on the Event assets page).

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ListPlus } from "lucide-react";
import { toast } from "sonner";

import { saveRoomsVersion, useEventAssets, useRefreshEventAssets } from "@/lib/event-assets-data";
import { SF_VENUE_FACT_SHEET, SF_VENUE_FLOORS, SF_VENUE_ROOMS, sfVenueRoomList } from "@/lib/next-sf-venue-rooms";
import { SF_VENUE_ZONES } from "@/lib/next-sf-venue-zones";
import { PlanZoomFrame } from "@/components/events/PlanZoomFrame";

const n = (v: number | null) => (v == null ? "–" : v.toLocaleString("en-US"));

export function SfVenueMeetingSpace() {
  const [floor, setFloor] = useState<number>(3);
  const [busy, setBusy] = useState(false);
  const assets = useEventAssets("san-francisco");
  const refresh = useRefreshEventAssets("san-francisco");
  const plan = SF_VENUE_FLOORS.find((f) => f.floor === floor)!;
  const rooms = SF_VENUE_ROOMS.filter((r) => r.floor === floor);

  async function copyToRoomList() {
    setBusy(true);
    try {
      const versions = assets.data?.rooms ?? [];
      const draft = versions.find((v) => v.status === "draft");
      const next = (versions[0]?.version ?? 0) + 1;
      await saveRoomsVersion({
        eventId: "san-francisco", status: "draft", rooms: sfVenueRoomList(),
        sourceFile: SF_VENUE_FACT_SHEET.filename, draftId: draft?.id ?? null, nextVersion: next,
      });
      await refresh();
      toast.success("Room list draft saved. An admin or brand lead can check and publish it on the Event assets page.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The room list didn't save.");
    } finally { setBusy(false); }
  }

  return (
    <section id="sf-meeting-space" className="mt-12 scroll-mt-24" aria-labelledby="sf-space-h">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#03002C]/10 pb-3">
        <div>
          <h2 id="sf-space-h" className="text-lg font-semibold text-[#03002C]">Venue meeting space</h2>
          <p className="mt-1 text-[13px] text-[#666666]">{SF_VENUE_FACT_SHEET.caution}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={SF_VENUE_FACT_SHEET.url} download={SF_VENUE_FACT_SHEET.filename} className="inline-flex items-center gap-1.5 rounded-md border border-[#03002C]/20 px-3 py-1.5 text-[13px] font-semibold text-[#03002C] hover:bg-[#F2F2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]">
            <Download className="h-4 w-4" aria-hidden /> Hotel fact sheet (PDF)
          </a>
          {assets.data?.signedIn && (
            <button type="button" onClick={copyToRoomList} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-[#003FC7] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#0034a6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] focus-visible:ring-offset-2 disabled:opacity-50">
              <ListPlus className="h-4 w-4" aria-hidden /> {busy ? "Saving…" : "Use as room list draft"}
            </button>
          )}
          <Link to="/events/next/intake/$eventId" params={{ eventId: "san-francisco" }} className="self-center text-[13px] font-semibold text-[#003FC7] hover:underline">Event assets</Link>
        </div>
      </div>

      <div role="tablist" aria-label="Floor" className="mt-4 flex gap-1">
        {SF_VENUE_FLOORS.map((f) => (
          <button key={f.floor} role="tab" type="button" aria-selected={f.floor === floor} onClick={() => setFloor(f.floor)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] ${f.floor === floor ? "bg-[#03002C] text-white" : "text-[#03002C] hover:bg-[#F2F2F2]"}`}>
            {f.title}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <div className="rounded-md border border-[#03002C]/10 bg-white p-2">
            <PlanZoomFrame key={floor} label={plan.title}>
            <div className="relative">
              <a href={plan.vectorUrl} target="_blank" rel="noreferrer" className="block">
                <img src={plan.vectorUrl} alt={`InterContinental San Francisco ${plan.title.toLowerCase()} plan`} className="h-auto w-full" loading="lazy" />
              </a>
              {(SF_VENUE_ZONES[plan.floor] ?? []).map((z) => (
                <div
                  key={`${z.label}-${z.x}-${z.y}`}
                  title={z.space ? `${z.label} — ${z.space}` : z.label}
                  className="pointer-events-none absolute flex items-center justify-center rounded-[2px] border-2"
                  style={{
                    left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%`,
                    borderColor: z.color, backgroundColor: `${z.color}59`,
                  }}
                >
                  {z.chip !== false && (
                    <span className="rounded-sm bg-white/85 px-1 py-px text-center text-[10px] font-bold leading-tight text-[#03002C]">
                      {z.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            </PlanZoomFrame>
          </div>
          {(SF_VENUE_ZONES[plan.floor] ?? []).length > 0 && (
            <ul aria-label={`${plan.title} event zones`} className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#03002C]">
              {(SF_VENUE_ZONES[plan.floor] ?? []).filter((z) => z.legend !== false).map((z) => (
                <li key={z.label} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-3 w-3 rounded-[2px] border" style={{ backgroundColor: z.color, borderColor: z.color }} />
                  <span className="font-semibold">{z.label}</span>
                  {z.space && <span className="text-[#666666]">— {z.space}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
            <a href={plan.vectorUrl} download={`InterContinental-SF-floor-${plan.floor}-vector.svg`} className="font-semibold text-[#003FC7] hover:underline">Download vector plan (SVG)</a>
            <span className="text-[#666666]">Drawn paths from the hotel&rsquo;s 2017 sheet — confirm with the hotel before printing.</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] text-[#03002C]">
            <caption className="sr-only">{plan.title} room capacities</caption>
            <thead className="border-b border-[#03002C]/15 text-[11px] font-semibold text-[#666666]">
              <tr>
                <th scope="col" className="py-1.5 pr-2">Room</th>
                <th scope="col" className="px-1 text-right">Theatre</th>
                <th scope="col" className="px-1 text-right">Class</th>
                <th scope="col" className="px-1 text-right">Reception</th>
                <th scope="col" className="px-1 text-right">Banquet</th>
                <th scope="col" className="px-1 text-right">U-shape</th>
                <th scope="col" className="px-1 text-right">Sq ft</th>
                <th scope="col" className="px-1 text-right">L × W ft</th>
                <th scope="col" className="pl-1 text-right">Height</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.name} className="border-b border-[#03002C]/5">
                  <th scope="row" className="py-1.5 pr-2 font-medium min-w-[9rem]">{r.name}</th>
                  <td className="px-1 text-right tabular-nums">{n(r.theater)}</td>
                  <td className="px-1 text-right tabular-nums">{n(r.classroom)}</td>
                  <td className="px-1 text-right tabular-nums">{n(r.reception)}</td>
                  <td className="px-1 text-right tabular-nums">{n(r.banquet)}</td>
                  <td className="px-1 text-right tabular-nums">{n(r.uShape)}</td>
                  <td className="px-1 text-right tabular-nums">{n(r.sqft)}</td>
                  <td className="whitespace-nowrap px-1 text-right tabular-nums">{r.dims ?? "–"}</td>
                  <td className="pl-1 text-right tabular-nums">{r.heightFt == null ? "–" : `${r.heightFt}′`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-[#666666]">Source: {SF_VENUE_FACT_SHEET.source}. Hollow-square figures are in the PDF.</p>
        </div>
      </div>
    </section>
  );
}
