// /events/next/start — start a new event in one step: an empty map set waiting on
// the venue's floor plans, the venue intake checklist, and (optionally) an online
// search for what the venue already publishes. Nothing is invented.

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Rocket } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { listStartedEvents, startEvent } from "@/lib/event-intake.functions";
import { linkEventVenue, listVenues, saveVenue } from "@/lib/venues.functions";

export const Route = createFileRoute("/events/next_/start")({
  head: () => ({
    meta: [
      { title: "Start a new event — venue intake and maps" },
      {
        name: "description",
        content:
          "Set up a new NEXT event in one step: an empty map set, the venue intake checklist and an online search for what the venue publishes.",
      },
      { property: "og:title", content: "Start a new NEXT event" },
      {
        property: "og:description",
        content: "One step sets up the map set, intake checklist and venue research for the next city.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StartEventPage,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";
const field =
  "mt-1 w-full rounded-lg border border-[#03002C]/20 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]";
const primary =
  "inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#03002C] disabled:opacity-50";

function StartEventPage() {
  const navigate = useNavigate();
  const start = useServerFn(startEvent);
  const list = useServerFn(listStartedEvents);
  const events = useQuery({ queryKey: ["started-events"], queryFn: () => list() });
  const [form, setForm] = useState({ name: "", city: "", venue: "", dates: "", research: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const venuesFn = useServerFn(listVenues);
  const venues = useQuery({ queryKey: ["venues"], queryFn: () => venuesFn() });
  const createVenue = useServerFn(saveVenue);
  const link = useServerFn(linkEventVenue);
  // "" = add as a new venue from the fields below; otherwise an existing venue slug.
  const [venueSlug, setVenueSlug] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await start({ data: form });
      // Link the event to a venue in the library, adding the venue when new.
      let slug = venueSlug;
      if (!slug) {
        const made = await createVenue({
          data: {
            slug: `${form.venue} ${form.city}`.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80),
            name: form.venue.trim(),
            city: form.city.trim(),
            country: "",
            address: "",
            timezone: "",
            sourceNote: "Added when the event was started. Waiting on the venue's floor sheets.",
          },
        });
        slug = made.slug;
      }
      await link({ data: { eventId: res.eventId, slug } });
      navigate({ to: "/events/next/intake/$eventId", params: { eventId: res.eventId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the event.");
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === "research" ? e.target.checked : e.target.value }));

  return (
    <AppShell>
      <div className="mx-auto max-w-[900px] px-5 pb-24 pt-8 sm:px-8">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]"
        >
          <ArrowLeft className="h-4 w-4" /> NEXT events
        </Link>
        <h1 className="mt-5 text-3xl font-bold leading-tight text-[#03002C]">Start a new event</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[#03002C]/75">
          This sets up an empty map set waiting on the venue's floor plans, a checklist of what
          the venue and organisers need to send, and an optional web search for what the venue
          already publishes. Anything found online is a suggestion until you confirm it.
        </p>

        <form onSubmit={submit} className={`${card} mt-6 grid gap-4 sm:grid-cols-2`}>
          <label className="text-[13px] font-semibold text-[#03002C]">
            Event name
            <input className={field} required value={form.name} onChange={set("name")} placeholder="NEXT 2027" />
          </label>
          <label className="text-[13px] font-semibold text-[#03002C]">
            City
            <input className={field} required value={form.city} onChange={set("city")} placeholder="San Francisco" />
          </label>
          <label className="text-[13px] font-semibold text-[#03002C] sm:col-span-2">
            Venue library
            <select
              className={field}
              value={venueSlug}
              onChange={(e) => {
                const slug = e.target.value;
                setVenueSlug(slug);
                const v = venues.data?.find((x) => x.slug === slug);
                if (v) setForm((f) => ({ ...f, venue: v.name, city: f.city || v.city }));
              }}
            >
              <option value="">Add as a new venue</option>
              {(venues.data ?? []).map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name} · {v.city} · {v.floorCount} {v.floorCount === 1 ? "floor" : "floors"}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[12px] font-normal text-[#666666]">
              Pick a saved venue to reuse its floors, or leave it on "Add as a new venue".
            </span>
          </label>
          <label className="text-[13px] font-semibold text-[#03002C]">
            Venue
            <input className={field} required value={form.venue} onChange={set("venue")} placeholder="Venue name" />
          </label>
          <label className="text-[13px] font-semibold text-[#03002C]">
            Dates
            <input className={field} value={form.dates} onChange={set("dates")} placeholder="e.g. 14–15 April 2027" />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[#03002C] sm:col-span-2">
            <input type="checkbox" checked={form.research} onChange={set("research")} />
            Search the web for the venue's floor plans, rooms and address (takes up to a minute)
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={primary} disabled={busy}>
              <Rocket className="h-4 w-4" /> {busy ? "Setting up…" : "Start this event"}
            </button>
            {error && <p className="mt-3 text-sm font-semibold text-[#E53D2E]">{error}</p>}
          </div>
        </form>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-[#03002C]">Events already started</h2>
          {events.isError && (
            <p className="mt-2 text-sm text-[#03002C]/70">Sign in to see started events.</p>
          )}
          <ul className="mt-3 grid gap-2">
            {(events.data?.events ?? []).map((ev) => (
              <li key={ev.slug}>
                <Link
                  to="/events/next/intake/$eventId"
                  params={{ eventId: ev.event_id }}
                  className={`${card} block hover:border-[#003FC7]`}
                >
                  <span className="font-semibold text-[#03002C]">{ev.name}</span>
                  <span className="ml-2 text-sm text-[#03002C]/65">
                    {[ev.venue, ev.city, ev.dates_label].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
            {events.data && !events.data.events.length && (
              <li className="text-sm text-[#03002C]/65">None yet.</li>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
