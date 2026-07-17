// Client-side icon library loader.
// Lazy-loads pack JSON files from /public/icon-library/packs/ (or externalized
// CDN URLs for large packs) and caches parsed results in memory.

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

// Packs externalized via lovable-assets (too large for repo).
const EXTERNAL_PACK_URLS: Record<string, string> = {
  fluent: fluentAsset.url,
  twemoji: twemojiAsset.url,
};

function packUrl(id: string): string {
  return EXTERNAL_PACK_URLS[id] ?? `/icon-library/packs/${id}.json`;
}

let manifestPromise: Promise<IconManifest> | null = null;
const packPromises = new Map<string, Promise<IconPack>>();

export function loadManifest(): Promise<IconManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/icon-library/manifest.json").then((r) => {
      if (!r.ok) throw new Error(`manifest ${r.status}`);
      return r.json();
    });
  }
  return manifestPromise;
}

export function loadPack(id: string): Promise<IconPack> {
  let p = packPromises.get(id);
  if (!p) {
    p = fetch(packUrl(id)).then((r) => {
      if (!r.ok) throw new Error(`pack ${id} ${r.status}`);
      return r.json();
    });
    packPromises.set(id, p);
  }
  return p;
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
  opts?: { size?: number; color?: string }
): string {
  const size = opts?.size ?? 24;
  const color = opts?.color ?? "currentColor";
  const vb = iconViewBox(pack, icon);
  const body = opts?.color
    ? icon.body.replace(/currentColor/g, color)
    : icon.body;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
}
