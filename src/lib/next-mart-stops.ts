// NEXT MART — city/stop templating.
//
// London 2026 is the reference build. Every further stop reuses the exact same
// signage kit — pillar footprints, flat trims, quantities, substrates, layered
// vector export path — with only the stop-specific facts swapped: city, event
// name, venue, dates, shop URL, hashtag and the local currency on price strips.
//
// Nothing about the approved geometry or palette is templated, so a new city is
// a data record rather than a second set of artwork to maintain.

import { NEXT_EVENT } from "@/lib/next-event";
import {
  NEXT_MART,
  NEXT_MART_FLAT_SIGNS,
  NEXT_MART_PILLARS,
  type MartFlatSign,
  type MartPillarSign,
} from "@/lib/next-mart";
import { martFlatConfig } from "@/lib/next-mart-placement";
import { pillarSize, type PillarConfig } from "@/lib/next-pillar-masters";

export type MartStop = {
  id: string;
  /** City the mart runs in, e.g. "Berlin". */
  city: string;
  /** Event name the mart sits inside, e.g. "TransPerfect NEXT 2026". */
  eventName: string;
  venue: string;
  dates: string;
  /** Shop URL encoded into the entrance QR. */
  shopUrl: string;
  /** Event hashtag used on wall panels and the logo column. */
  hashtag: string;
  /** Currency symbol used on the price strips. */
  currency: string;
  /** Price bands printed on the strips, without the symbol. */
  priceBands: number[];
  notes: string;
  createdAt: string;
};

export const LONDON_PRICE_BANDS = [15, 25, 45];

/** The reference build every new stop is cloned from. */
export const LONDON_STOP: MartStop = {
  id: "london",
  city: NEXT_EVENT.city,
  eventName: NEXT_EVENT.name,
  venue: NEXT_EVENT.venue,
  dates: NEXT_EVENT.datesLabel,
  shopUrl: NEXT_MART.shopUrl,
  hashtag: NEXT_EVENT.hashtag,
  currency: "£",
  priceBands: LONDON_PRICE_BANDS,
  notes: "Reference build — the kit every other stop is cloned from.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

/** Event label printed on every sign for this stop. */
export function martStopEventLabel(stop: MartStop): string {
  return `${stop.eventName} — ${stop.city}`;
}

export function martStopSlug(stop: MartStop): string {
  return (stop.city || stop.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A blank stop pre-filled from London, ready for the create form. */
export function martStopDraft(): MartStop {
  return {
    ...LONDON_STOP,
    id: "",
    city: "",
    venue: "",
    dates: "",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

/* ── kit cloning ──────────────────────────────────────────────────────────── */

/** Pillar config for a stop, resolved onto its production footprint. */
export function martStopPillarConfig(stop: MartStop, sign: MartPillarSign): PillarConfig {
  const size = pillarSize(sign.sizeId);
  const config: PillarConfig = {
    ...sign.config,
    eventLabel: martStopEventLabel(stop),
    sizeId: size.id,
    trimW: size.trimW,
    trimH: size.trimH,
  };
  if (config.qrData) config.qrData = stop.shopUrl;
  if (config.logoUrl) config.logoUrl = stop.shopUrl.replace(/^https?:\/\//, "");
  if (config.logoSocial) config.logoSocial = stop.hashtag;
  return config;
}

/** Every mart pillar as a live editable file for this stop. */
export function martStopPillars(stop: MartStop): MartPillarSign[] {
  return NEXT_MART_PILLARS.map((sign) => ({
    ...sign,
    config: martStopPillarConfig(stop, sign),
  }));
}

/** Swap the stop-specific facts inside a printed copy line. */
function stopCopy(stop: MartStop, line: string): string {
  if (/^FROM /i.test(line)) return line;
  return line
    .replace(NEXT_EVENT.hashtag, stop.hashtag)
    .replace(NEXT_EVENT.name, stop.eventName)
    .replace(NEXT_EVENT.city, stop.city);
}

/** Every flat sign with the stop's copy, currency and price bands applied. */
export function martStopFlats(stop: MartStop): MartFlatSign[] {
  return NEXT_MART_FLAT_SIGNS.map((sign) => {
    if (sign.id === "mart-price-strip" && stop.priceBands.length > 0) {
      return {
        ...sign,
        copy: stop.priceBands.map((n) => `FROM ${stop.currency}${n}`),
      };
    }
    return { ...sign, copy: sign.copy.map((line) => stopCopy(stop, line)) };
  });
}

/** Flat signs as editable masters for this stop. */
export function martStopFlatMasters(stop: MartStop): {
  sign: MartFlatSign;
  config: PillarConfig;
}[] {
  return martStopFlats(stop).map((sign) => ({
    sign,
    config: { ...martFlatConfig(sign), eventLabel: martStopEventLabel(stop) },
  }));
}

/** Panel count for the whole stop kit. */
export function martStopPanels(stop: MartStop): number {
  return (
    martStopPillars(stop).reduce((n, p) => n + p.quantity, 0) +
    martStopFlats(stop).reduce((n, s) => n + s.quantity, 0)
  );
}

/* ── persistence (local, per browser) ─────────────────────────────────────── */

const KEY = "tp.next.mart.stops.v1";

function read(): MartStop[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as MartStop[]) : [];
    return Array.isArray(list) ? list.filter((s) => s && s.id && s.id !== LONDON_STOP.id) : [];
  } catch {
    return [];
  }
}

function write(list: MartStop[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60)));
  } catch {
    /* storage full or blocked — the London reference kit still works */
  }
}

/** London plus every saved stop, London first. */
export function listMartStops(): MartStop[] {
  return [LONDON_STOP, ...read()];
}

export function martStopById(id: string): MartStop | null {
  return listMartStops().find((s) => s.id === id) ?? null;
}

/** Create or update a stop. Returns the stored record. */
export function saveMartStop(
  input: Omit<MartStop, "id" | "createdAt"> & { id?: string },
): MartStop {
  const id = input.id?.trim() || martStopSlug(input as MartStop) || `stop-${Date.now()}`;
  if (id === LONDON_STOP.id) throw new Error("London is the reference kit and cannot be replaced.");
  const stop: MartStop = {
    ...input,
    id,
    createdAt: martStopById(id)?.createdAt ?? new Date().toISOString(),
  };
  const rest = read().filter((s) => s.id !== id);
  write([stop, ...rest]);
  return stop;
}

export function deleteMartStop(id: string) {
  write(read().filter((s) => s.id !== id));
}
