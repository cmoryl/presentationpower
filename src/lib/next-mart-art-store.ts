// NEXT MART artwork — editable slots plus an importer.
//
// The six supplied London masters stay the shipped reference. This store lets a
// producer edit every field on any slot, drop a replacement file (upload or
// link) onto an existing slot, or register a brand-new slot for a design that
// arrives later. Everything downstream — previews, placed artwork on the live
// pillar/flat masters and the layered vector exports — reads the resolved list,
// so an imported file is production artwork, not a mock-up.

import {
  MART_ART_TRIM_H,
  MART_ART_TRIM_W,
  NEXT_MART_ARTWORK,
  type MartArtwork,
} from "@/lib/next-mart";

export type MartArtEdit = Partial<
  Pick<
    MartArtwork,
    | "code"
    | "category"
    | "headline"
    | "face"
    | "die"
    | "trimW"
    | "trimH"
    | "bleed"
    | "quantity"
    | "substrate"
    | "finishing"
    | "url"
    | "previewUrl"
    | "filename"
  >
>;

type Store = {
  /** Field edits keyed by artwork id (supplied slots and custom slots alike). */
  edits: Record<string, MartArtEdit>;
  /** Slots added locally for artwork that arrives after the shipped pack. */
  custom: MartArtwork[];
};

const KEY = "tp.next.mart.artwork.v1";
const EMPTY: Store = { edits: {}, custom: [] };

/** Editable fields, in the order the studio shows them. */
export const MART_ART_FIELDS = [
  "code",
  "category",
  "headline",
  "die",
  "substrate",
  "finishing",
] as const;

function read(): Store {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      edits: parsed.edits && typeof parsed.edits === "object" ? parsed.edits : {},
      custom: Array.isArray(parsed.custom) ? parsed.custom.filter((a) => a && a.id) : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    throw new Error(
      "This browser cannot store a file that large. Import the artwork by link instead.",
    );
  }
}

/** A blank slot ready for the importer, on the supplied board geometry. */
export function martArtDraft(): MartArtwork {
  return {
    id: "",
    code: "",
    category: "Travel",
    headline: "",
    url: "",
    filename: "",
    previewUrl: "",
    face: "light",
    die: "Rounded panel with notched corner and punched hang hole",
    trimW: MART_ART_TRIM_W,
    trimH: MART_ART_TRIM_H,
    bleed: 6,
    quantity: 2,
    substrate: "5 mm Foamex, matte laminate",
    finishing: "Cut to CutContour path, hang hole reinforced",
  };
}

function apply(base: MartArtwork, edit: MartArtEdit | undefined): MartArtwork {
  if (!edit) return base;
  const merged = { ...base, ...edit } as MartArtwork;
  // A replacement file without its own preview previews from the file itself.
  if (edit.url && !edit.previewUrl) merged.previewUrl = edit.url;
  return merged;
}

/** Every artwork slot with edits and imports applied, in production order. */
export function listMartArtwork(): MartArtwork[] {
  const store = read();
  const supplied = NEXT_MART_ARTWORK.map((a) => apply(a, store.edits[a.id]));
  const custom = store.custom.map((a) => apply(a, store.edits[a.id]));
  return [...supplied, ...custom];
}

export function martArtworkById(id: string): MartArtwork | null {
  return listMartArtwork().find((a) => a.id === id) ?? null;
}

/** True when the slot carries local edits or an imported file. */
export function martArtIsEdited(id: string): boolean {
  const edit = read().edits[id];
  return !!edit && Object.keys(edit).length > 0;
}

/** True when the slot was added locally rather than shipped in the pack. */
export function martArtIsCustom(id: string): boolean {
  return read().custom.some((a) => a.id === id);
}

export function saveMartArtEdit(id: string, edit: MartArtEdit) {
  const store = read();
  const next = { ...(store.edits[id] ?? {}), ...edit };
  write({ ...store, edits: { ...store.edits, [id]: next } });
}

/** Drop every local edit on a slot, returning it to the supplied master. */
export function resetMartArtEdit(id: string) {
  const store = read();
  const edits = { ...store.edits };
  delete edits[id];
  write({ ...store, edits });
}

export function martArtSlug(headline: string): string {
  return (
    headline
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `slot-${Date.now()}`
  );
}

/** Register a new artwork slot. Returns the stored record. */
export function addMartArtwork(input: MartArtwork): MartArtwork {
  const store = read();
  const id = input.id?.trim() || `mart-art-${martArtSlug(input.headline)}`;
  if (NEXT_MART_ARTWORK.some((a) => a.id === id)) {
    throw new Error("That id belongs to a supplied master — edit that slot instead.");
  }
  const record: MartArtwork = { ...input, id, previewUrl: input.previewUrl || input.url };
  write({ ...store, custom: [...store.custom.filter((a) => a.id !== id), record] });
  return record;
}

/** Remove a locally added slot. Supplied masters cannot be deleted. */
export function deleteMartArtwork(id: string) {
  const store = read();
  const edits = { ...store.edits };
  delete edits[id];
  write({ edits, custom: store.custom.filter((a) => a.id !== id) });
}

/* ── file intake ──────────────────────────────────────────────────────────── */

export const MART_ART_ACCEPT = ".svg,.png,.jpg,.jpeg,.pdf,.ai,.eps";
/** localStorage is the store, so keep an imported file inside a safe budget. */
export const MART_ART_MAX_BYTES = 3_500_000;

/** Read an uploaded master into a data URL we can store, preview and export. */
export function readMartArtFile(file: File): Promise<{ url: string; filename: string }> {
  if (file.size > MART_ART_MAX_BYTES) {
    return Promise.reject(
      new Error(
        `${file.name} is ${(file.size / 1e6).toFixed(1)} MB — over the ${(
          MART_ART_MAX_BYTES / 1e6
        ).toFixed(1)} MB import limit. Host it and import by link instead.`,
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () =>
      resolve({ url: String(reader.result ?? ""), filename: file.name });
    reader.readAsDataURL(file);
  });
}

/** Validate a pasted artwork link. */
export function normalizeMartArtLink(raw: string): { url: string; filename: string } {
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("Paste a full https link to the artwork file.");
  const name = decodeURIComponent(url.split("?")[0]!.split("/").pop() || "artwork");
  return { url, filename: name };
}
