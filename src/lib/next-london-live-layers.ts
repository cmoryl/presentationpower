// London signage — LAYERS INSIDE A LIVE FILE.
//
// When a finished file is handed back for a sign (Illustrator .ai, a print PDF,
// an .eps or an .svg), it already carries its own layers: the ground, the NEXT
// lockup, the headline, a code, placed artwork. The kit used to know nothing
// about them, so it painted its own lockup and headline on top of a file that
// already had both — that is the doubled-up preview cards.
//
// This module reads the layer names out of the supplied file and remembers,
// per sign, which of those layers the file itself owns. Anything the file owns
// is NOT regenerated on top. Any layer can be handed back to the editor
// ("rebuild it here"), which switches our own editable layer on again.
//
// Best effort by design: a file with no readable layer names is treated as a
// finished, fully typeset file, which is the safe assumption for a preview.

import { useSyncExternalStore } from "react";

export type LondonLiveLayerKind = "ground" | "lockup" | "copy" | "qr" | "art" | "other";

export interface LondonLiveLayer {
  /** Layer name exactly as it reads in the supplied file. */
  name: string;
  /** What the kit believes the layer is, from its name. */
  kind: LondonLiveLayerKind;
}

export interface LondonLiveLayerState {
  /** Identity of the file these layers were read from (filename@version). */
  file: string;
  layers: LondonLiveLayer[];
  /** Layer names the designer asked the kit to rebuild as editable layers. */
  rebuilt: string[];
}

export type LondonLiveLayerMap = Record<string, LondonLiveLayerState>;

const KEY = "london.live-layers.v1";
const EMPTY: LondonLiveLayerMap = {};

/** Read a layer name and say what it is, so the editor can act on it. */
export function classifyLondonLayerName(name: string): LondonLiveLayerKind {
  const n = name.toLowerCase();
  if (/(qr|code|scan)/.test(n)) return "qr";
  if (/(lockup|logo|mark|wordmark|brand|next\b)/.test(n)) return "lockup";
  if (/(copy|headline|head|type|text|title|sub|body|wording)/.test(n)) return "copy";
  if (/(ground|background|bg|gradient|base|backdrop)/.test(n)) return "ground";
  if (/(art|image|graphic|photo|illustration|icon|pattern|repeat)/.test(n)) return "art";
  return "other";
}

function decodeLatin1(bytes: Uint8Array): string {
  let out = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    out += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return out;
}

function cleanName(raw: string): string {
  return raw
    .replace(/\\([()\\])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function fromHexString(hex: string): string {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (code >= 32 && code < 127) out += String.fromCharCode(code);
  }
  return out;
}

/**
 * Layer names inside a supplied live file.
 *
 * PDF/Illustrator: the optional-content groups (`/Type /OCG`) that Illustrator
 * writes for every named layer, plus the older `%AI5_BeginLayer` records.
 * SVG: group ids and labels. EPS: `%%BeginLayer` comments.
 */
export function parseLondonLiveFileLayers(
  input: Uint8Array | ArrayBuffer | string,
  filename = "",
): LondonLiveLayer[] {
  const text =
    typeof input === "string"
      ? input
      : decodeLatin1(input instanceof ArrayBuffer ? new Uint8Array(input) : input);
  const names: string[] = [];

  const push = (raw: string) => {
    const name = cleanName(raw);
    if (!name) return;
    if (!names.some((n) => n.toLowerCase() === name.toLowerCase())) names.push(name);
  };

  // Optional-content groups — one per Illustrator layer in a PDF-compatible
  // file. The name can sit either side of the /OCG marker, so a window around
  // each marker is scanned.
  for (const match of text.matchAll(/\/OCG\b/g)) {
    const from = Math.max(0, (match.index ?? 0) - 400);
    const chunk = text.slice(from, (match.index ?? 0) + 400);
    for (const name of chunk.matchAll(/\/Name\s*\(((?:\\.|[^)])*)\)/g)) {
      if (name[1]) push(name[1]);
    }
    for (const name of chunk.matchAll(/\/Name\s*<([0-9A-Fa-f\s]+)>/g)) {
      if (name[1]) push(fromHexString(name[1]));
    }
  }
  // Legacy Illustrator layer records.
  for (const m of text.matchAll(/%AI\d?_?BeginLayer[^\n]*\n[^\n]*?\(((?:\\.|[^)])*)\)/g)) {
    if (m[1]) push(m[1]);
  }
  for (const m of text.matchAll(/%%BeginLayer:?\s*([^\n]+)/g)) {
    if (m[1]) push(m[1]);
  }
  // SVG groups: our own masters tag `data-layer`, hand files use id/label.
  if (/<svg[\s>]/i.test(text) || filename.toLowerCase().endsWith(".svg")) {
    for (const m of text.matchAll(
      /<g\b[^>]*?(?:data-layer|inkscape:label|id)\s*=\s*"([^"]+)"/g,
    )) {
      if (m[1]) push(m[1]);
    }
  }

  return names.map((name) => ({ name, kind: classifyLondonLayerName(name) }));
}

let store: LondonLiveLayerMap = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* a private window still works for this session */
  }
}

function hydrate() {
  if (typeof window === "undefined" || store !== EMPTY) return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as LondonLiveLayerMap;
    if (parsed && typeof parsed === "object") store = parsed;
  } catch {
    /* ignore an unreadable store */
  }
}

export function londonLiveLayerMap(): LondonLiveLayerMap {
  hydrate();
  return store;
}

export function londonLiveLayers(panelId: string): LondonLiveLayerState | null {
  return londonLiveLayerMap()[panelId] ?? null;
}

/** Record the layers read out of the file now in force for a sign. */
export function setLondonLiveLayers(
  panelId: string,
  file: string,
  layers: readonly LondonLiveLayer[],
): void {
  hydrate();
  const previous = store[panelId];
  // A new file starts fresh: last file's rebuild choices do not carry over.
  const rebuilt = previous && previous.file === file ? previous.rebuilt : [];
  store = { ...store, [panelId]: { file, layers: [...layers], rebuilt } };
  persist();
  emit();
}

/** Hand one layer back to the kit's editor, or return it to the file. */
export function setLondonLayerRebuilt(panelId: string, name: string, rebuilt: boolean): void {
  hydrate();
  const current = store[panelId];
  if (!current) return;
  const next = rebuilt
    ? [...new Set([...current.rebuilt, name])]
    : current.rebuilt.filter((n) => n !== name);
  store = { ...store, [panelId]: { ...current, rebuilt: next } };
  persist();
  emit();
}

export function clearLondonLiveLayers(panelId: string): void {
  hydrate();
  if (!store[panelId]) return;
  const next = { ...store };
  delete next[panelId];
  store = next;
  persist();
  emit();
}

/**
 * The layer kinds the supplied file itself carries, so the kit does not paint
 * its own copy of them on top. `null` = nothing is known about this sign's file,
 * and a finished file is assumed to be fully typeset.
 */
export function londonFinishedLayerClaims(panelId: string): Set<LondonLiveLayerKind> | null {
  const state = londonLiveLayers(panelId);
  if (!state || state.layers.length === 0) return null;
  const claims = new Set<LondonLiveLayerKind>();
  for (const layer of state.layers) {
    if (state.rebuilt.includes(layer.name)) continue;
    claims.add(layer.kind);
  }
  return claims;
}

/** True when the supplied file owns this kind of layer already. */
export function londonFileOwnsLayer(panelId: string, kind: LondonLiveLayerKind): boolean {
  const claims = londonFinishedLayerClaims(panelId);
  // Unknown layers: a hand-finished file is assumed to carry its own lockup and
  // typesetting, which is what stops a card doubling up.
  if (!claims) return kind === "lockup" || kind === "copy" || kind === "ground";
  return claims.has(kind);
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLondonLiveLayerMap(): LondonLiveLayerMap {
  return useSyncExternalStore(
    subscribe,
    () => londonLiveLayerMap(),
    () => EMPTY,
  );
}
