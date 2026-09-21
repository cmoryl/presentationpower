// Live edits made to a rebuilt venue floor plan, saved for the whole crew.
//
// The plan geometry and the issued room names stay exactly as the venue drew
// them. Everything editable lives here as a patch on top: a corrected room
// name, the line beneath it, a nudged position, and the room colours and key
// names. A floor with no patch renders precisely as it did before.

/** One room's corrections. Absent fields mean "as issued". */
export type QeiiRoomEdit = {
  /** Replacement room name printed on the plan. */
  name?: string;
  /** Replacement line beneath the name; an empty string hides it. */
  use?: string;
  /** Nudge off the printed anchor, in plan units. */
  dx?: number;
  dy?: number;
};

export type QeiiMapEdits = {
  rooms: Record<string, QeiiRoomEdit>;
  /** Room name → approved fill colour. */
  colours: Record<string, string>;
  /** Colour → the name typed for the key. */
  keyLabels: Record<string, string>;
};

export const EMPTY_QEII_MAP_EDITS: QeiiMapEdits = { rooms: {}, colours: {}, keyLabels: {} };

/** Rooms are matched by name, case and spacing ignored. */
export function qeiiRoomKey(room: string): string {
  return room.trim().toLowerCase().replace(/\s+/g, " ");
}

const MAX_NAME = 80;
const MAX_USE = 120;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  return clean;
}

function num(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  // A nudge is a correction, not a relocation to another floor.
  return Math.round(Math.max(-400, Math.min(400, value)) * 100) / 100;
}

/** Read a stored patch defensively: anything unrecognised is dropped, not guessed. */
export function sanitizeQeiiMapEdits(raw: unknown): QeiiMapEdits {
  const out: QeiiMapEdits = { rooms: {}, colours: {}, keyLabels: {} };
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;

  const rooms = src['rooms'];
  if (rooms && typeof rooms === "object") {
    for (const [key, value] of Object.entries(rooms as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const edit: QeiiRoomEdit = {};
      const name = text(v['name'], MAX_NAME);
      if (name) edit.name = name;
      const use = text(v['use'], MAX_USE);
      if (use !== undefined) edit.use = use;
      const dx = num(v['dx']);
      if (dx !== undefined && dx !== 0) edit.dx = dx;
      const dy = num(v['dy']);
      if (dy !== undefined && dy !== 0) edit.dy = dy;
      if (Object.keys(edit).length) out.rooms[qeiiRoomKey(key)] = edit;
    }
  }

  const colours = src['colours'];
  if (colours && typeof colours === "object") {
    for (const [key, value] of Object.entries(colours as Record<string, unknown>)) {
      if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
        out.colours[key] = value.toUpperCase();
      }
    }
  }

  const keyLabels = src['keyLabels'];
  if (keyLabels && typeof keyLabels === "object") {
    for (const [key, value] of Object.entries(keyLabels as Record<string, unknown>)) {
      const label = text(value, MAX_USE);
      if (label) out.keyLabels[key] = label;
    }
  }

  return out;
}

/** True when a patch would change nothing, so an empty record is never saved. */
export function qeiiMapEditsEmpty(edits: QeiiMapEdits): boolean {
  return (
    Object.keys(edits.rooms).length === 0 &&
    Object.keys(edits.colours).length === 0 &&
    Object.keys(edits.keyLabels).length === 0
  );
}

export function qeiiRoomEdit(
  edits: QeiiMapEdits | undefined,
  room: string,
): QeiiRoomEdit | undefined {
  return edits?.rooms[qeiiRoomKey(room)];
}

/** The name printed for a room: the correction if one is recorded, else as issued. */
export function qeiiEditedRoomName(edits: QeiiMapEdits | undefined, room: string): string {
  return qeiiRoomEdit(edits, room)?.name ?? room;
}

/** How far a room's block has been moved off its printed anchor. */
export function qeiiRoomOffset(
  edits: QeiiMapEdits | undefined,
  room: string,
): { dx: number; dy: number } {
  const edit = qeiiRoomEdit(edits, room);
  return { dx: edit?.dx ?? 0, dy: edit?.dy ?? 0 };
}

/** Apply one room's change, dropping the entry when it is back to as-issued. */
export function qeiiApplyRoomEdit(
  edits: QeiiMapEdits,
  room: string,
  patch: QeiiRoomEdit,
): QeiiMapEdits {
  const key = qeiiRoomKey(room);
  const next: QeiiRoomEdit = { ...(edits.rooms[key] ?? {}), ...patch };
  if (next.name !== undefined && (next.name === "" || next.name === room)) delete next.name;
  if (next.dx === 0) delete next.dx;
  if (next.dy === 0) delete next.dy;
  const rooms = { ...edits.rooms };
  if (Object.keys(next).length === 0) delete rooms[key];
  else rooms[key] = next;
  return { ...edits, rooms };
}

/** Put one room back to exactly what the venue issued. */
export function qeiiClearRoomEdit(edits: QeiiMapEdits, room: string): QeiiMapEdits {
  const rooms = { ...edits.rooms };
  delete rooms[qeiiRoomKey(room)];
  return { ...edits, rooms };
}
