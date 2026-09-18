// -----------------------------------------------------------------------------
// NEXT venue pages — one editable record of the real place, per location.
//
// The delegate guide, the signage schedules and the floor plans all used to
// carry their own copy of the venue's address and opening hours, so a change in
// one never reached the others. This module owns that record instead: address,
// where it sits on the map, when each area opens, how to get there, and the
// photograph of the building. The guide reads from it rather than holding its
// own transcription.
//
// Nothing here is invented. A blank venue starts empty and says what is still
// missing; the London 2026 seed is the contracted venue's own detail, carried
// from NEXT_EVENT / LONDON_VENUE rather than retyped.
// -----------------------------------------------------------------------------

import { NEXT_EVENT } from "@/lib/next-event";

/** When one area of the venue is open. Free text, because venues phrase it. */
export type VenueHours = { id: string; label: string; hours: string; note: string };

/** How to reach the venue — one note per mode of travel. */
export type VenueTravelNote = { id: string; label: string; body: string };

export type VenuePage = {
  slug: string;
  eventId: string;
  city: string;
  venue: string;
  address: string;
  postcode: string;
  country: string;
  /** Map position. Null until someone has actually placed it. */
  lat: number | null;
  lng: number | null;
  mapZoom: number;
  /** What the map cannot say — which entrance to use, where the drop-off is. */
  mapNote: string;
  /** Overrides the generated directions link when the venue publishes its own. */
  directionsUrl: string;
  openingTimes: VenueHours[];
  travel: VenueTravelNote[];
  /** Photograph from the guide library. */
  photoId: string;
  /** Uploaded photograph, stored privately. Wins over the library choice. */
  photoPath: string;
  photoCredit: string;
  wifi: string;
  supportEmail: string;
  siteUrl: string;
  notes: string;
};

export function venueSlugFrom(city: string, venue: string): string {
  const text = `${city} ${venue}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return text.replace(/^-|-$/g, "").slice(0, 60) || "venue";
}

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export function newVenueHours(label = "", hours = ""): VenueHours {
  return { id: rid("h"), label, hours, note: "" };
}

export function newVenueTravelNote(label = "", body = ""): VenueTravelNote {
  return { id: rid("t"), label, body };
}

export function blankVenuePage(city = "", venue = ""): VenuePage {
  return {
    slug: venueSlugFrom(city, venue),
    eventId: "next",
    city,
    venue,
    address: "",
    postcode: "",
    country: "",
    lat: null,
    lng: null,
    mapZoom: 15,
    mapNote: "",
    directionsUrl: "",
    openingTimes: [],
    travel: [],
    photoId: "",
    photoPath: "",
    photoCredit: "",
    wifi: "",
    supportEmail: "",
    siteUrl: "",
    notes: "",
  };
}

/** London 2026 — the contracted venue, as printed in the approved guide. */
export function londonVenuePage(): VenuePage {
  return {
    ...blankVenuePage("London", "QEII Centre"),
    slug: "london-qeii-centre",
    address: "Broad Sanctuary, Westminster, London",
    postcode: "SW1P 3EE",
    country: "United Kingdom",
    lat: 51.4998,
    lng: -0.1295,
    mapZoom: 16,
    mapNote:
      "Delegate entrance is on Broad Sanctuary, facing Westminster Abbey. Vehicle drop-off is on Storey's Gate.",
    openingTimes: [
      { id: "h-doors", label: "Registration", hours: "Thu 10:00–17:00 · Fri 08:30–16:00", note: "" },
      {
        id: "h-brew",
        label: "NEXTbrew cafe · Ground floor",
        hours: "Thu from 11:30 · Fri from 09:00",
        note: "Refreshments served on all floors through the day.",
      },
      {
        id: "h-lunch",
        label: "Lunch · Third and fifth floors",
        hours: "Thu 12:00–13:30 · Fri 11:45–12:45",
        note: "",
      },
      { id: "h-cloak", label: "Cloakroom", hours: "Thu 10:00–18:30 · Fri 08:30–17:00", note: "" },
    ],
    travel: [
      {
        id: "t-tube",
        label: "Underground",
        body: "Westminster (Jubilee, District, Circle) and St James's Park are both a five-minute walk.",
      },
      {
        id: "t-rail",
        label: "National rail",
        body: "London Victoria and London Waterloo are both around fifteen minutes on foot or one stop by tube.",
      },
      {
        id: "t-car",
        label: "By car",
        body: "The venue is inside the Congestion Charge zone and has no delegate parking. Nearest public car park is Abingdon Street.",
      },
    ],
    photoId: "facade",
    wifi: "TransPerfectNEXT (no password)",
    supportEmail: "next@transperfect.com",
    siteUrl: "www.transperfectnext.com/emea",
    notes: `Carried from the ${NEXT_EVENT.datesLabel} build.`,
  };
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A saved row, or anything shaped roughly like one, read back as a record. */
export function normalizeVenuePage(raw: unknown): VenuePage {
  const r = (raw ?? {}) as Record<string, unknown>;
  const pick = (a: string, b: string) => (r[a] !== undefined ? r[a] : r[b]);
  const hours = Array.isArray(pick("opening_times", "openingTimes"))
    ? (pick("opening_times", "openingTimes") as unknown[])
    : [];
  const travel = Array.isArray(r.travel) ? (r.travel as unknown[]) : [];
  const zoom = num(pick("map_zoom", "mapZoom"));
  return {
    slug: str(r.slug) || "venue",
    eventId: str(pick("event_id", "eventId"), "next"),
    city: str(r.city),
    venue: str(r.venue),
    address: str(r.address),
    postcode: str(r.postcode),
    country: str(r.country),
    lat: num(r.lat),
    lng: num(r.lng),
    mapZoom: zoom === null ? 15 : Math.min(19, Math.max(2, Math.round(zoom))),
    mapNote: str(pick("map_note", "mapNote")),
    directionsUrl: str(pick("directions_url", "directionsUrl")),
    openingTimes: hours.map((h, i) => {
      const row = (h ?? {}) as Record<string, unknown>;
      return {
        id: str(row.id) || `h-${i}`,
        label: str(row.label),
        hours: str(row.hours),
        note: str(row.note),
      };
    }),
    travel: travel.map((t, i) => {
      const row = (t ?? {}) as Record<string, unknown>;
      return { id: str(row.id) || `t-${i}`, label: str(row.label), body: str(row.body) };
    }),
    photoId: str(pick("photo_id", "photoId")),
    photoPath: str(pick("photo_path", "photoPath")),
    photoCredit: str(pick("photo_credit", "photoCredit")),
    wifi: str(r.wifi),
    supportEmail: str(pick("support_email", "supportEmail")),
    siteUrl: str(pick("site_url", "siteUrl")),
    notes: str(r.notes),
  };
}

/** The address as one printed line. */
export function venueAddressLine(v: VenuePage): string {
  return [v.address, v.postcode, v.country].map((p) => p.trim()).filter(Boolean).join(", ");
}

/** The venue's own label: "QEII Centre, London". */
export function venueTitle(v: VenuePage): string {
  return [v.venue, v.city].filter(Boolean).join(", ") || v.slug;
}

/** Interactive map for the record's position, for the screen only. */
export function venueMapEmbedUrl(v: VenuePage): string | null {
  if (v.lat === null || v.lng === null) return null;
  // Span shrinks as the zoom rises; 15 is roughly a street view.
  const span = 0.16 / Math.pow(1.6, Math.max(0, v.mapZoom - 12));
  const bbox = [v.lng - span, v.lat - span / 1.7, v.lng + span, v.lat + span / 1.7]
    .map((n) => n.toFixed(5))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${v.lat.toFixed(5)},${v.lng.toFixed(5)}`;
}

/** A link that opens directions in whatever map app the reader uses. */
export function venueDirectionsUrl(v: VenuePage): string {
  if (v.directionsUrl.trim()) return v.directionsUrl.trim();
  const target =
    v.lat !== null && v.lng !== null
      ? `${v.lat},${v.lng}`
      : [venueTitle(v), venueAddressLine(v)].filter(Boolean).join(", ");
  if (!target) return "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
}

/** Opening times as one printed sentence per area. */
export function venueHoursLines(v: VenuePage): string[] {
  return v.openingTimes
    .filter((h) => h.label.trim() || h.hours.trim())
    .map((h) => [h.label, h.hours].filter(Boolean).join(": ") + (h.note ? ` ${h.note}` : ""));
}

/** What is still missing before this venue can be printed from. */
export function venuePageGaps(v: VenuePage): string[] {
  const gaps: string[] = [];
  if (!v.city.trim()) gaps.push("City");
  if (!v.venue.trim()) gaps.push("Venue name");
  if (!v.address.trim()) gaps.push("Address");
  if (v.lat === null || v.lng === null) gaps.push("Map position");
  if (!v.openingTimes.length) gaps.push("Opening times");
  if (!v.photoId && !v.photoPath) gaps.push("Photograph");
  if (!v.supportEmail.trim()) gaps.push("Support email");
  return gaps;
}
