// NEXT MART — city/stop templating panel.
//
// The London kit is the reference build. Adding a stop is a short data form:
// city, event name, venue, dates, shop URL, hashtag and the local currency.
// Everything else — footprints, trims, quantities, substrates, layered vector
// export — is cloned from London untouched.

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Copy, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  LONDON_STOP,
  deleteMartStop,
  listMartStops,
  martStopDraft,
  martStopPanels,
  saveMartStop,
  type MartStop,
} from "@/lib/next-mart-stops";

const field =
  "w-full rounded-md border border-black/15 px-2.5 py-1.5 text-[13px] text-[#03002C] outline-none focus:border-[#003FC7]";
const label = "text-xs font-medium text-black/60";

export function MartStopManager() {
  const [stops, setStops] = useState<MartStop[]>(() => listMartStops());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MartStop>(() => martStopDraft());
  const bands = useMemo(() => draft.priceBands.join(", "), [draft.priceBands]);

  const set = <K extends keyof MartStop>(key: K, value: MartStop[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function create() {
    if (!draft.city.trim()) {
      toast.error("Give the stop a city.");
      return;
    }
    try {
      const stop = saveMartStop({
        city: draft.city.trim(),
        eventName: draft.eventName.trim() || LONDON_STOP.eventName,
        venue: draft.venue.trim(),
        dates: draft.dates.trim(),
        shopUrl: draft.shopUrl.trim() || LONDON_STOP.shopUrl,
        hashtag: draft.hashtag.trim() || LONDON_STOP.hashtag,
        currency: draft.currency.trim() || "£",
        priceBands: draft.priceBands.length ? draft.priceBands : LONDON_STOP.priceBands,
        notes: draft.notes.trim(),
      });
      setStops(listMartStops());
      setOpen(false);
      setDraft(martStopDraft());
      toast.success(`${stop.city} mart created`, {
        description: `${martStopPanels(stop)} panels cloned from the London kit.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this stop.");
    }
  }

  return (
    <section className="mt-12 rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#03002C]">
            <MapPin size={17} /> City stops · duplicate the mart for a new event
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
            London is the reference kit. A new stop is a data record — city, event, venue, dates,
            shop URL, hashtag and local currency. Pillar footprints, flat trims, quantities,
            substrates and the layered PDF/X-4 + Illustrator export path all clone across unchanged,
            so a new city needs no new artwork.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus size={14} className="mr-1.5" /> {open ? "Close" : "New stop"}
        </Button>
      </div>

      {open ? (
        <div className="mt-5 grid gap-3 rounded-xl border border-black/10 bg-[#F7F8FB] p-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className={label}>City</span>
            <input
              className={`${field} mt-1`}
              placeholder="Berlin"
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Event name</span>
            <input
              className={`${field} mt-1`}
              value={draft.eventName}
              onChange={(e) => set("eventName", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Venue</span>
            <input
              className={`${field} mt-1`}
              placeholder="Station Berlin"
              value={draft.venue}
              onChange={(e) => set("venue", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Dates</span>
            <input
              className={`${field} mt-1`}
              placeholder="14–15 October 2026"
              value={draft.dates}
              onChange={(e) => set("dates", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Shop URL (entrance QR)</span>
            <input
              className={`${field} mt-1`}
              value={draft.shopUrl}
              onChange={(e) => set("shopUrl", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Hashtag</span>
            <input
              className={`${field} mt-1`}
              value={draft.hashtag}
              onChange={(e) => set("hashtag", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Currency symbol</span>
            <input
              className={`${field} mt-1`}
              value={draft.currency}
              onChange={(e) => set("currency", e.target.value)}
            />
          </label>
          <label className="block">
            <span className={label}>Price bands (price strips)</span>
            <input
              className={`${field} mt-1`}
              placeholder="15, 25, 45"
              value={bands}
              onChange={(e) =>
                set(
                  "priceBands",
                  e.target.value
                    .split(/[,\s]+/)
                    .map((v) => Number(v.replace(/[^0-9.]/g, "")))
                    .filter((n) => Number.isFinite(n) && n > 0),
                )
              }
            />
          </label>
          <label className="block">
            <span className={label}>Production notes</span>
            <input
              className={`${field} mt-1`}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
          <div className="sm:col-span-2 xl:col-span-3">
            <Button size="sm" onClick={create}>
              <Copy size={14} className="mr-1.5" /> Clone the London kit
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stops.map((s) => (
          <article key={s.id} className="rounded-xl border border-black/10 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-[#03002C]">
                  {s.city} {s.id === LONDON_STOP.id ? "· reference" : ""}
                </div>
                <div className="mt-0.5 text-[12px] text-black/55">{s.eventName}</div>
              </div>
              {s.id === LONDON_STOP.id ? null : (
                <button
                  type="button"
                  aria-label={`Delete the ${s.city} mart stop`}
                  className="rounded-md p-1 text-black/40 hover:bg-black/5 hover:text-[#E53D2E]"
                  onClick={() => {
                    deleteMartStop(s.id);
                    setStops(listMartStops());
                    toast.success(`${s.city} stop removed`);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <ul className="mt-2 space-y-0.5 text-[11px] tabular-nums text-black/55">
              <li>{[s.venue, s.dates].filter(Boolean).join(" · ") || "Venue TBC"}</li>
              <li>
                {martStopPanels(s)} panels · {s.currency}
                {s.priceBands[0] ?? 15}+ price bands · {s.hashtag}
              </li>
            </ul>
            <Link
              to="/events/next/mart/$stopId"
              params={{ stopId: s.id }}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#003FC7] hover:underline"
            >
              Open the {s.city} kit <ArrowRight size={13} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
