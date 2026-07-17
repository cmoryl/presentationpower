// Client-side icon pack loader for the local Iconify-format icon collection
// (public/icon-library/). Lazy-loads pack JSON on demand and caches parsed
// results in memory. This module owns the 111k+ icons imported from BrandHUB;
// the smaller curated Lucide set lives in ./icon-library.ts.

import fluentAsset from "../../public/icon-library/packs/fluent.json.asset.json";
import twemojiAsset from "../../public/icon-library/packs/twemoji.json.asset.json";

export interface IconManifestPack {
  id: string;
  name: string;
  license: string;
  author?: string;
  url?: string;
  priority?: number;
  multicolor?: boolean;
  count: number;
  categories: Record<string, number>;
  defaultViewBox?: string;
}

export interface IconManifest {
  packs: IconManifestPack[];
}

export interface IconifyIcon {
  body: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

export interface IconPack {
  prefix: string;
  info?: {
    name?: string;
    total?: number;
    author?: { name?: string; url?: string };
    license?: { title?: string; spdx?: string; url?: string };
    samples?: string[];
    height?: number;
    category?: string;
    palette?: boolean;
  };
  icons: Record<string, IconifyIcon>;
  aliases?: Record<string, { parent: string }>;
  width?: number;
  height?: number;
}

export interface SearchHit {
  packId: string;
  name: string;
}

// Packs externalized via lovable-assets (too large for repo). The .asset.json
// pointer file is committed; at runtime we fetch the CDN URL transparently.
const EXTERNAL_PACK_URLS: Record<string, string> = {
  fluent: fluentAsset.url,
  twemoji: twemojiAsset.url,
};

function packUrl(id: string): string {
  return EXTERNAL_PACK_URLS[id] ?? `/icon-library/packs/${id}.json`;
}

let manifestPromise: Promise<IconManifest> | null = null;
const packPromises = new Map<string, Promise<IconPack>>();
const packMem = new Map<string, IconPack>();

export function loadManifest(): Promise<IconManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/icon-library/manifest.json").then((r) => {
      if (!r.ok) throw new Error(`manifest ${r.status}`);
      return r.json() as Promise<IconManifest>;
    });
  }
  return manifestPromise;
}

export async function listPacks(): Promise<IconManifestPack[]> {
  const m = await loadManifest();
  return [...m.packs].sort(
    (a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name),
  );
}

export function loadPack(id: string): Promise<IconPack> {
  let p = packPromises.get(id);
  if (!p) {
    p = fetch(packUrl(id))
      .then((r) => {
        if (!r.ok) throw new Error(`pack ${id} ${r.status}`);
        return r.json() as Promise<IconPack>;
      })
      .then((data) => {
        packMem.set(id, data);
        return data;
      });
    packPromises.set(id, p);
  }
  return p;
}

export function getLoadedPack(id: string): IconPack | undefined {
  return packMem.get(id);
}

export function resolveIcon(pack: IconPack, name: string): IconifyIcon | null {
  if (pack.icons[name]) return pack.icons[name];
  const alias = pack.aliases?.[name];
  if (alias) return pack.icons[alias.parent] ?? null;
  return null;
}

export function iconViewBox(pack: IconPack, icon: IconifyIcon): string {
  const w = icon.width ?? pack.width ?? pack.info?.height ?? 24;
  const h = icon.height ?? pack.height ?? pack.info?.height ?? 24;
  const x = icon.left ?? 0;
  const y = icon.top ?? 0;
  return `${x} ${y} ${w} ${h}`;
}

export function iconSvgMarkup(
  pack: IconPack,
  icon: IconifyIcon,
  opts?: { size?: number; color?: string },
): string {
  const size = opts?.size ?? 24;
  const color = opts?.color ?? "currentColor";
  const vb = iconViewBox(pack, icon);
  const body = opts?.color
    ? icon.body.replace(/currentColor/g, color)
    : icon.body;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
}

/**
 * Cross-pack fuzzy search. Only iterates through already-loaded packs unless
 * `packIds` is provided, in which case those packs are loaded (bounded
 * concurrency) before scanning. This prevents an accidental "load all 111k
 * icons" from a global search.
 */
export async function searchIcons(
  query: string,
  opts?: { packIds?: string[]; limit?: number; concurrency?: number },
): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const limit = opts?.limit ?? 200;
  const concurrency = opts?.concurrency ?? 4;

  const targetIds = opts?.packIds;
  if (targetIds && targetIds.length) {
    // Bounded-concurrency loader.
    const queue = [...targetIds];
    const runners: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      runners.push(
        (async () => {
          while (queue.length) {
            const id = queue.shift();
            if (!id) return;
            try {
              await loadPack(id);
            } catch {
              /* ignore */
            }
          }
        })(),
      );
    }
    await Promise.all(runners);
  }

  const hits: SearchHit[] = [];
  const scan = (packId: string, pack: IconPack) => {
    for (const name of Object.keys(pack.icons)) {
      if (name.toLowerCase().includes(q)) {
        hits.push({ packId, name });
        if (hits.length >= limit) return true;
      }
    }
    return false;
  };

  const ids = targetIds ?? Array.from(packMem.keys());
  for (const id of ids) {
    const pack = packMem.get(id);
    if (!pack) continue;
    if (scan(id, pack)) break;
  }
  return hits;
}
