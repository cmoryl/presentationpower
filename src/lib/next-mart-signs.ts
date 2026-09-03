// NEXT MART — per-sign admin editing.
//
// Every mart sign (pillar or flat panel) stays a live master. This store lets an
// admin open one sign, edit its plate in the pillar studio and edit its
// production facts (name, role, quantity, placement, substrate, trim, copy),
// then save that back onto the sign itself. Previews, the spec table and the
// layered vector export bundles all read the resolved list, so an edited sign is
// production artwork rather than a one-off in the editor.

import {
  NEXT_MART_FLAT_SIGNS,
  NEXT_MART_PILLARS,
  martPillarConfig,
  type MartFlatSign,
  type MartPillarSign,
} from "@/lib/next-mart";
import { martFlatConfig } from "@/lib/next-mart-placement";
import type { PillarConfig } from "@/lib/next-pillar-masters";

export type MartPillarMeta = Partial<
  Pick<MartPillarSign, "name" | "role" | "quantity" | "placement" | "substrate">
>;

export type MartFlatMeta = Partial<
  Pick<
    MartFlatSign,
    | "name"
    | "role"
    | "trimW"
    | "trimH"
    | "bleed"
    | "quantity"
    | "substrate"
    | "finishing"
    | "copy"
    | "face"
  >
>;

type SignEdit = {
  /** Full plate config saved out of the pillar studio. */
  config?: PillarConfig;
  pillarMeta?: MartPillarMeta;
  flatMeta?: MartFlatMeta;
};

type Store = { edits: Record<string, SignEdit> };

const KEY = "tp.next.mart.signs.v1";
const EMPTY: Store = { edits: {} };

function read(): Store {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { edits: parsed.edits && typeof parsed.edits === "object" ? parsed.edits : {} };
  } catch {
    return EMPTY;
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    throw new Error("This browser cannot store any more sign edits.");
  }
}

/** True when the sign carries local edits. */
export function martSignIsEdited(id: string): boolean {
  const edit = read().edits[id];
  return !!edit && Object.keys(edit).length > 0;
}

/** Saved plate config for a sign, if one was saved. */
export function martSignConfig(id: string): PillarConfig | null {
  return read().edits[id]?.config ?? null;
}

export function saveMartSignConfig(id: string, config: PillarConfig) {
  const store = read();
  write({ edits: { ...store.edits, [id]: { ...(store.edits[id] ?? {}), config } } });
}

export function saveMartPillarMeta(id: string, meta: MartPillarMeta) {
  const store = read();
  const prev = store.edits[id] ?? {};
  write({
    edits: {
      ...store.edits,
      [id]: { ...prev, pillarMeta: { ...(prev.pillarMeta ?? {}), ...meta } },
    },
  });
}

export function saveMartFlatMeta(id: string, meta: MartFlatMeta) {
  const store = read();
  const prev = store.edits[id] ?? {};
  write({
    edits: { ...store.edits, [id]: { ...prev, flatMeta: { ...(prev.flatMeta ?? {}), ...meta } } },
  });
}

/** Drop every local edit on a sign, returning it to the issued master. */
export function resetMartSign(id: string) {
  const store = read();
  const edits = { ...store.edits };
  delete edits[id];
  write({ edits });
}

/* ── resolved production data ─────────────────────────────────────────────── */

/** Pillar signs with admin edits applied, in production order. */
export function listMartPillarSigns(): MartPillarSign[] {
  const { edits } = read();
  return NEXT_MART_PILLARS.map((sign) => {
    const edit = edits[sign.id];
    if (!edit) return sign;
    return { ...sign, ...(edit.pillarMeta ?? {}), config: edit.config ?? sign.config };
  });
}

/** The live plate for a mart pillar, honouring a saved edit. */
export function resolvedMartPillarConfig(sign: MartPillarSign): PillarConfig {
  const saved = martSignConfig(sign.id);
  return saved ?? martPillarConfig(sign);
}

/** Flat signs with admin edits applied. */
export function listMartFlatSigns(): MartFlatSign[] {
  const { edits } = read();
  return NEXT_MART_FLAT_SIGNS.map((sign) => {
    const meta = edits[sign.id]?.flatMeta;
    return meta ? { ...sign, ...meta } : sign;
  });
}

/** Flat signs as live editable masters, honouring saved plate edits. */
export function listMartFlatMasters(): { sign: MartFlatSign; config: PillarConfig }[] {
  return listMartFlatSigns().map((sign) => ({
    sign,
    config: martSignConfig(sign.id) ?? martFlatConfig(sign),
  }));
}
