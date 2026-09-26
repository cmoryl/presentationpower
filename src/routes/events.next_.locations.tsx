// /events/next/locations — the editable venue page behind every NEXT location.
//
// Address, map position, opening times, how to get there and the photograph of
// the building, held once per location. The delegate guide follows this record
// instead of keeping its own transcription, so correcting a door or a lunch time
// here corrects the printed guide too.
//
// Nothing is invented: a blank location starts empty and lists what is still
// missing, and the map is only placed once a real position has been found.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { writeCityPlanDraft } from "@/lib/city-plan-draft";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Clock,
  Compass,
  Image as ImageIcon,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { supabase } from "@/integrations/supabase/client";
import { GUIDE_IMAGES, guideImage } from "@/lib/next-guide-theme";
import {
  blankVenuePage,
  londonVenuePage,
  newVenueHours,
  newVenueTravelNote,
  venueAddressLine,
  venueDirectionsUrl,
  venueMapEmbedUrl,
  venuePageGaps,
  venueSlugFrom,
  venueTitle,
  type VenuePage,
} from "@/lib/venue-page";
import {
  deleteVenuePage,
  findVenuePosition,
  listVenuePages,
  saveVenuePage,
} from "@/lib/venue-page.functions";

export const Route = createFileRoute("/events/next_/locations")({
  head: () => ({
    meta: [
      { title: "NEXT venue pages — real address, map, opening times and photo" },
      {
        name: "description",
        content:
          "One editable venue record per NEXT location: address, map position, opening times, how to get there and the venue photograph. The delegate guide reads its practical page straight from here.",
      },
      { property: "og:title", content: "NEXT venue pages" },
      {
        property: "og:description",
        content:
          "Keep every NEXT location's real details in one place — address, map, opening times, travel notes and photograph — and let the printed guide follow them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VenuePagesRoute,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";
const field =
  "mt-1 w-full rounded-lg border border-[#03002C]/20 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]";
const label = "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#666]";
const btn =
  "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-[#F2F2F2] disabled:opacity-40";
const primary =
  "inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40";

const PHOTO_BUCKET = "venue-photos";

function VenuePagesRoute() {
  const userId = useSessionUser();
  const fetchVenues = useServerFn(listVenuePages);
  const writeVenue = useServerFn(saveVenuePage);
  const removeVenue = useServerFn(deleteVenuePage);
  const locate = useServerFn(findVenuePosition);

  const [venues, setVenues] = useState<VenuePage[]>([]);
  const [draft, setDraft] = useState<VenuePage>(() => londonVenuePage());
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    fetchVenues({})
      .then((res) => {
        if (!live) return;
        setVenues(res.venues);
        if (res.venues[0]) setDraft(res.venues[0]);
      })
      .catch(() => setStatus("Could not load the saved venue pages."));
    return () => {
      live = false;
    };
  }, [fetchVenues, userId]);

  // Signed link for an uploaded photograph — the store is private.
  useEffect(() => {
    let live = true;
    setPhotoUrl(null);
    if (!draft.photoPath) return;
    supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(draft.photoPath, 60 * 60)
      .then(({ data }) => {
        if (live) setPhotoUrl(data?.signedUrl ?? null);
      })
      .catch(() => {
        if (live) setPhotoUrl(null);
      });
    return () => {
      live = false;
    };
  }, [draft.photoPath]);

  const gaps = useMemo(() => venuePageGaps(draft), [draft]);
  const mapUrl = useMemo(() => venueMapEmbedUrl(draft), [draft]);
  const directions = useMemo(() => venueDirectionsUrl(draft), [draft]);
  const libraryPhoto = guideImage(draft.photoId);

  const patch = useCallback((next: Partial<VenuePage>) => {
    setDraft((cur) => ({ ...cur, ...next }));
    // Carry the city and venue forward to the floor-plan and sign-schedule steps.
    if (next.city !== undefined || next.venue !== undefined) {
      writeCityPlanDraft({
        ...(next.city !== undefined ? { city: next.city } : {}),
        ...(next.venue !== undefined ? { venue: next.venue } : {}),
      });
    }
  }, []);

  const save = async () => {
    if (!userId) return;
    setBusy(true);
    setStatus("Saving…");
    try {
      const res = await writeVenue({ data: { ...draft } });
      setDraft(res.venue);
      writeCityPlanDraft({ city: res.venue.city, venue: res.venue.venue });
      setVenues((cur) => {
        const rest = cur.filter((v) => v.slug !== res.venue.slug);
        return [res.venue, ...rest];
      });
      setStatus(`Saved ${venueTitle(res.venue)}.`);
    } catch (err) {
      setStatus(err instanceof Error ? `Could not save: ${err.message}` : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await removeVenue({ data: { slug: draft.slug } });
      const rest = venues.filter((v) => v.slug !== draft.slug);
      setVenues(rest);
      setDraft(rest[0] ?? blankVenuePage());
      setStatus("Removed.");
    } catch (err) {
      setStatus(err instanceof Error ? `Could not remove: ${err.message}` : "Could not remove.");
    } finally {
      setBusy(false);
    }
  };

  const findPosition = async () => {
    const query = [venueTitle(draft), venueAddressLine(draft)].filter(Boolean).join(", ");
    if (query.trim().length < 3) {
      setStatus("Type the venue name and address first.");
      return;
    }
    setBusy(true);
    setStatus("Looking the address up…");
    try {
      const res = await locate({ data: { query } });
      if (!res.found) {
        setStatus("That address was not found, so the map is left unplaced. Enter the position by hand.");
        return;
      }
      patch({ lat: res.lat, lng: res.lng });
      setStatus(`Placed on ${res.label || "the map"}.`);
    } catch (err) {
      setStatus(err instanceof Error ? `Lookup failed: ${err.message}` : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    if (!userId) return;
    setBusy(true);
    setStatus("Uploading the photograph…");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${draft.slug || "venue"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw new Error(error.message);
      patch({ photoPath: path });
      setStatus("Photograph uploaded. Save the page to keep it.");
    } catch (err) {
      setStatus(err instanceof Error ? `Upload failed: ${err.message}` : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#666] hover:text-[#03002C]"
        >
          <ArrowLeft className="h-4 w-4" /> Events
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#03002C]">Venues &amp; floor-plan standards</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#666]">
          One record per location: address, where it sits on the map, when each area opens, how to
          get there and the photograph of the building. The delegate guide reads its practical page
          from here, so a correction made once reaches the printed guide.
        </p>

        {!userId && (
          <p className="mt-4 rounded-xl bg-[#FFEB66]/40 px-4 py-3 text-sm text-[#03002C]">
            Sign in to load and save venue pages.
          </p>
        )}

        {/* locations */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {venues.map((v) => (
            <button
              key={v.slug}
              type="button"
              onClick={() => setDraft(v)}
              className={
                v.slug === draft.slug
                  ? "rounded-full bg-[#03002C] px-4 py-2 text-[13px] font-semibold text-white"
                  : btn
              }
            >
              {venueTitle(v)}
            </button>
          ))}
          <button type="button" className={btn} onClick={() => setDraft(blankVenuePage())}>
            <Plus className="h-4 w-4" /> New location
          </button>
          {!venues.some((v) => v.slug === "london-qeii-centre") && (
            <button type="button" className={btn} onClick={() => setDraft(londonVenuePage())}>
              Start from London 2026
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* ── the record ─────────────────────────────────────────────── */}
          <div className="space-y-5">
            <section className={card}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
                <MapPin className="h-4 w-4 text-[#003FC7]" /> Where it is
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>City</span>
                  <input
                    className={field}
                    value={draft.city}
                    onChange={(e) => {
                      const city = e.target.value;
                      patch({
                        city,
                        slug: draft.slug ? draft.slug : venueSlugFrom(city, draft.venue),
                      });
                    }}
                    placeholder="London"
                  />
                </label>
                <label className="block">
                  <span className={label}>Venue</span>
                  <input
                    className={field}
                    value={draft.venue}
                    onChange={(e) => patch({ venue: e.target.value })}
                    placeholder="QEII Centre"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className={label}>Street address</span>
                  <input
                    className={field}
                    value={draft.address}
                    onChange={(e) => patch({ address: e.target.value })}
                    placeholder="Broad Sanctuary, Westminster, London"
                  />
                </label>
                <label className="block">
                  <span className={label}>Postcode</span>
                  <input
                    className={field}
                    value={draft.postcode}
                    onChange={(e) => patch({ postcode: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className={label}>Country</span>
                  <input
                    className={field}
                    value={draft.country}
                    onChange={(e) => patch({ country: e.target.value })}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className={label}>Short name used in file names</span>
                  <input
                    className={field}
                    value={draft.slug}
                    onChange={(e) => patch({ slug: venueSlugFrom(e.target.value, "") })}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className={label}>What the map cannot say</span>
                  <textarea
                    className={field}
                    rows={2}
                    value={draft.mapNote}
                    onChange={(e) => patch({ mapNote: e.target.value })}
                    placeholder="Delegate entrance, drop-off, which door to use"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className={label}>Latitude</span>
                  <input
                    className={field}
                    value={draft.lat === null ? "" : String(draft.lat)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      patch({ lat: e.target.value.trim() && Number.isFinite(n) ? n : null });
                    }}
                  />
                </label>
                <label className="block">
                  <span className={label}>Longitude</span>
                  <input
                    className={field}
                    value={draft.lng === null ? "" : String(draft.lng)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      patch({ lng: e.target.value.trim() && Number.isFinite(n) ? n : null });
                    }}
                  />
                </label>
                <label className="block">
                  <span className={label}>Map closeness</span>
                  <input
                    type="range"
                    min={10}
                    max={19}
                    value={draft.mapZoom}
                    onChange={(e) => patch({ mapZoom: Number(e.target.value) })}
                    className="mt-3 w-full accent-[#003FC7]"
                  />
                </label>
              </div>
              <button type="button" className={`${btn} mt-3`} disabled={busy} onClick={findPosition}>
                <Search className="h-4 w-4" /> Find this address on the map
              </button>
            </section>

            <section className={card}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
                <Clock className="h-4 w-4 text-[#003FC7]" /> Opening times
              </h2>
              <div className="mt-4 space-y-3">
                {draft.openingTimes.map((row) => (
                  <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      className={field}
                      value={row.label}
                      placeholder="Registration"
                      onChange={(e) =>
                        patch({
                          openingTimes: draft.openingTimes.map((r) =>
                            r.id === row.id ? { ...r, label: e.target.value } : r,
                          ),
                        })
                      }
                    />
                    <input
                      className={field}
                      value={row.hours}
                      placeholder="Thu 10:00–17:00 · Fri 08:30–16:00"
                      onChange={(e) =>
                        patch({
                          openingTimes: draft.openingTimes.map((r) =>
                            r.id === row.id ? { ...r, hours: e.target.value } : r,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className={btn}
                      onClick={() =>
                        patch({ openingTimes: draft.openingTimes.filter((r) => r.id !== row.id) })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btn}
                  onClick={() => patch({ openingTimes: [...draft.openingTimes, newVenueHours()] })}
                >
                  <Plus className="h-4 w-4" /> Add an area
                </button>
              </div>
            </section>

            <section className={card}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
                <Compass className="h-4 w-4 text-[#003FC7]" /> Getting here
              </h2>
              <div className="mt-4 space-y-3">
                {draft.travel.map((row) => (
                  <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <input
                      className={field}
                      value={row.label}
                      placeholder="Underground"
                      onChange={(e) =>
                        patch({
                          travel: draft.travel.map((r) =>
                            r.id === row.id ? { ...r, label: e.target.value } : r,
                          ),
                        })
                      }
                    />
                    <textarea
                      className={field}
                      rows={2}
                      value={row.body}
                      onChange={(e) =>
                        patch({
                          travel: draft.travel.map((r) =>
                            r.id === row.id ? { ...r, body: e.target.value } : r,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className={btn}
                      onClick={() => patch({ travel: draft.travel.filter((r) => r.id !== row.id) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btn}
                  onClick={() => patch({ travel: [...draft.travel, newVenueTravelNote()] })}
                >
                  <Plus className="h-4 w-4" /> Add a way in
                </button>
              </div>
              <label className="mt-4 block">
                <span className={label}>Directions link (leave empty to generate one)</span>
                <input
                  className={field}
                  value={draft.directionsUrl}
                  onChange={(e) => patch({ directionsUrl: e.target.value })}
                  placeholder="https://…"
                />
              </label>
            </section>

            <section className={card}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
                <ImageIcon className="h-4 w-4 text-[#003FC7]" /> Photograph
              </h2>
              <p className="mt-2 text-[13px] text-[#666]">
                Pick one from the set, or upload your own — an uploaded photograph is used instead.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {GUIDE_IMAGES.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => patch({ photoId: img.id })}
                    className={
                      draft.photoId === img.id
                        ? "rounded-full bg-[#03002C] px-3 py-1.5 text-[12px] font-semibold text-white"
                        : "rounded-full border border-[#03002C]/20 px-3 py-1.5 text-[12px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
                    }
                  >
                    {img.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className={btn}
                  disabled={busy || !userId}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> Upload a photograph
                </button>
                {draft.photoPath && (
                  <button type="button" className={btn} onClick={() => patch({ photoPath: "" })}>
                    Use the set instead
                  </button>
                )}
              </div>
              <label className="mt-3 block">
                <span className={label}>Photograph credit</span>
                <input
                  className={field}
                  value={draft.photoCredit}
                  onChange={(e) => patch({ photoCredit: e.target.value })}
                />
              </label>
            </section>

            <section className={card}>
              <h2 className="text-sm font-semibold text-[#03002C]">Delegate details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>Event Wi-Fi</span>
                  <input
                    className={field}
                    value={draft.wifi}
                    onChange={(e) => patch({ wifi: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className={label}>Support email</span>
                  <input
                    className={field}
                    value={draft.supportEmail}
                    onChange={(e) => patch({ supportEmail: e.target.value })}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className={label}>Event site</span>
                  <input
                    className={field}
                    value={draft.siteUrl}
                    onChange={(e) => patch({ siteUrl: e.target.value })}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className={label}>Internal notes</span>
                  <textarea
                    className={field}
                    rows={2}
                    value={draft.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                  />
                </label>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={primary} disabled={busy || !userId} onClick={save}>
                <Save className="h-4 w-4" /> Save this location
              </button>
              {venues.some((v) => v.slug === draft.slug) && (
                <button type="button" className={btn} disabled={busy} onClick={remove}>
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
              <Link to="/events/next/guide" className={btn}>
                Open the guide builder
              </Link>
              {status && <span className="text-[13px] text-[#666]">{status}</span>}
            </div>
          </div>

          {/* ── what the guide will read ───────────────────────────────── */}
          <div className="space-y-5">
            <section className={card}>
              <h2 className="text-sm font-semibold text-[#03002C]">On the map</h2>
              {mapUrl ? (
                <iframe
                  title={`Map of ${venueTitle(draft)}`}
                  src={mapUrl}
                  className="mt-3 h-64 w-full rounded-xl border border-[#03002C]/12"
                  loading="lazy"
                />
              ) : (
                <p className="mt-3 rounded-xl bg-[#F2F2F2] px-4 py-6 text-center text-[13px] text-[#666]">
                  No position yet — type the address and press “Find this address on the map”.
                </p>
              )}
              {directions && (
                <a
                  href={directions}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-[13px] font-semibold text-primary underline"
                >
                  Open directions
                </a>
              )}
              <p className="mt-2 text-[11px] text-[#666]">
                Map data © OpenStreetMap contributors. The printed guide carries a scan code to
                directions, not this map picture.
              </p>
            </section>

            <section className={card}>
              <h2 className="text-sm font-semibold text-[#03002C]">Photograph in use</h2>
              {photoUrl || libraryPhoto ? (
                <img
                  src={photoUrl ?? libraryPhoto?.url ?? ""}
                  alt={`${venueTitle(draft)} photograph`}
                  className="mt-3 h-48 w-full rounded-xl object-cover"
                />
              ) : (
                <p className="mt-3 rounded-xl bg-[#F2F2F2] px-4 py-6 text-center text-[13px] text-[#666]">
                  No photograph chosen yet.
                </p>
              )}
              {draft.photoCredit && (
                <p className="mt-2 text-[11px] text-[#666]">{draft.photoCredit}</p>
              )}
            </section>

            <section className={card}>
              <h2 className="text-sm font-semibold text-[#03002C]">Still missing</h2>
              {gaps.length ? (
                <ul className="mt-3 space-y-2">
                  {gaps.map((g) => (
                    <li key={g} className="flex items-center gap-2 text-[13px] text-[#03002C]">
                      <TriangleAlert className="h-4 w-4 text-[#EC388A]" /> {g}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] text-[#666]">
                  Nothing missing — this location is ready for the guide.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
