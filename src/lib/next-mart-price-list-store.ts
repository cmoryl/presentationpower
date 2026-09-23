// NEXT MART price list — per-stop edit store.
//
// Each mart stop (city) keeps its own price list: its own currency, its own
// typed prices, its own categories and its own approved ground. The issued
// London sheet is the master; a stop with no saved edit resolves to that master
// with the stop's currency swapped in, and the editor flags every price that has
// not yet been typed for the new market so nothing is printed on a guess.

import { LONDON_STOP, martStopById, type MartStop } from "@/lib/next-mart-stops";
import {
  martPriceListForStop,
  type MartPriceListConfig,
  type MartPriceCategory,
} from "@/lib/next-mart-price-list";

const KEY = "tp.next.mart.pricelist.v1";

type Store = Record<string, MartPriceListConfig>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked — the sheet still renders from the master */
  }
}

function sane(config: MartPriceListConfig): MartPriceListConfig {
  const categories: MartPriceCategory[] = (config.categories ?? [])
    .slice(0, 12)
    .map((c, ci) => ({
      id: (c.id || `cat-${ci}`).slice(0, 60),
      title: (c.title ?? "").slice(0, 60),
      column: c.column === 2 ? 2 : 1,
      items: (c.items ?? []).slice(0, 24).map((i, ii) => ({
        id: (i.id || `item-${ci}-${ii}`).slice(0, 60),
        name: (i.name ?? "").slice(0, 60),
        price:
          i.price === null || i.price === undefined || !Number.isFinite(Number(i.price))
            ? null
            : Math.max(0, Math.round(Number(i.price) * 100) / 100),
      })),
    }));
  return {
    ...config,
    eyebrow: (config.eyebrow ?? "").slice(0, 80),
    heading: (config.heading ?? "PRICE LIST").slice(0, 60),
    footer: (config.footer ?? "").slice(0, 120),
    categories,
  };
}

/** The sheet in force for a stop: the saved edit, or the issued master. */
export function martPriceList(stopId: string): MartPriceListConfig {
  const saved = read()[stopId];
  const stop = martStopById(stopId) ?? LONDON_STOP;
  return saved ? sane({ ...saved, stopId }) : martPriceListForStop(stop);
}

export function martPriceListIsEdited(stopId: string): boolean {
  return Boolean(read()[stopId]);
}

export function saveMartPriceList(stopId: string, config: MartPriceListConfig) {
  const store = read();
  store[stopId] = sane({ ...config, stopId });
  write(store);
}

export function resetMartPriceList(stopId: string) {
  const store = read();
  delete store[stopId];
  write(store);
}

/** Convenience for pages that already hold the stop. */
export function martPriceListFor(stop: MartStop): MartPriceListConfig {
  return martPriceList(stop.id);
}
