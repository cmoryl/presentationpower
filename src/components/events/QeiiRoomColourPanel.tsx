// Colour each room on a rebuilt QEII plan, and name the colours in a key.
//
// Only the approved palette is offered. Rooms the issued artwork draws as one
// shape are marked plainly, because their colour shows as a tag behind the room
// name instead of filling the space.

import { useMemo } from "react";
import { RotateCcw, Wand2 } from "lucide-react";

import {
  QEII_ROOM_PALETTE,
  qeiiColourByFunction,
  qeiiColourKey,
  qeiiRoomDivisionAccent,
  qeiiRoomDivisionName,
  qeiiRoomFunction,
  qeiiRoomIsExclusive,
  qeiiRoomShapes,
  type QeiiRoomColours,
} from "@/lib/next-london-qeii-rooms";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

export type QeiiRoomColourPanelProps = {
  floor: QeiiFloorVector;
  colours: QeiiRoomColours;
  onColours: (next: QeiiRoomColours) => void;
  keyLabels: Record<string, string>;
  onKeyLabels: (next: Record<string, string>) => void;
  /** Fill every room with its division's accent and switch the lockups to all white. */
  onColourByDivision?: () => void;
};

export function QeiiRoomColourPanel({
  floor,
  colours,
  onColours,
  keyLabels,
  onKeyLabels,
  onColourByDivision,
}: QeiiRoomColourPanelProps) {
  const rooms = useMemo(() => qeiiRoomShapes(floor), [floor]);
  const keyRows = useMemo(() => qeiiColourKey(floor, colours, keyLabels), [floor, colours, keyLabels]);

  function set(room: string, hex?: string) {
    const next = { ...colours };
    if (hex) next[room] = hex;
    else delete next[room];
    onColours(next);
  }

  return (
    <div className="mt-5 grid gap-5 rounded-2xl border border-black/10 bg-white p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[13px] font-semibold tracking-tight text-[#03002C]">Room colours</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onColours(qeiiColourByFunction(floor))}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/20 px-3 py-1.5 text-[12px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
            >
              <Wand2 className="h-3.5 w-3.5" /> Colour by function
            </button>
            <button
              type="button"
              onClick={() => {
                onColours({});
                onKeyLabels({});
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/20 px-3 py-1.5 text-[12px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear all
            </button>
          </div>
        </div>

        <ul className="mt-3 divide-y divide-black/5">
          {rooms.map((entry) => {
            const fn = qeiiRoomFunction(entry.room, floor.id);
            const chosen = colours[entry.room];
            return (
              <li key={`${entry.room}-${entry.shapeIndex}`} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-[9rem] text-[12.5px] font-semibold text-[#03002C]">
                  {entry.room}
                </span>
                <span className="min-w-[7rem] text-[11.5px] text-[#03002C]/60">
                  {fn ?? (qeiiRoomIsExclusive(entry) ? "—" : "colours as a name tag")}
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  {QEII_ROOM_PALETTE.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      aria-label={`${entry.room} in ${swatch.label}`}
                      aria-pressed={chosen === swatch.hex}
                      onClick={() => set(entry.room, swatch.hex)}
                      style={{ backgroundColor: swatch.hex }}
                      className={`h-5 w-5 rounded-md border ${
                        chosen === swatch.hex
                          ? "border-[#03002C] ring-2 ring-[#003FC7]/40"
                          : "border-black/15"
                      }`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => set(entry.room)}
                    className="ml-1 rounded-md border border-black/15 px-2 py-0.5 text-[11px] font-semibold text-[#03002C]/70 hover:bg-[#F2F2F2]"
                  >
                    None
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h4 className="text-[13px] font-semibold tracking-tight text-[#03002C]">Colour key</h4>
        {keyRows.length ? (
          <>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#03002C]/60">
              Name each colour — the key prints beneath the plan and travels with the editable
              download.
            </p>
            <ul className="mt-3 space-y-2">
              {keyRows.map((row) => (
                <li key={row.hex} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    style={{ backgroundColor: row.hex }}
                    className="h-5 w-5 shrink-0 rounded-md border border-black/15"
                  />
                  <input
                    value={keyLabels[row.hex] ?? ""}
                    placeholder={row.label}
                    onChange={(e) => onKeyLabels({ ...keyLabels, [row.hex]: e.target.value })}
                    aria-label={`Name for the ${row.hex} colour`}
                    className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-[12.5px] text-[#03002C] focus:border-[#003FC7] focus:outline-none"
                  />
                </li>
              ))}
            </ul>
            <ul className="mt-3 space-y-1 text-[11.5px] text-[#03002C]/60">
              {keyRows.map((row) => (
                <li key={`${row.hex}-rooms`}>
                  <strong className="font-semibold text-[#03002C]/80">
                    {keyLabels[row.hex]?.trim() || row.label}
                  </strong>{" "}
                  · {row.rooms.join(", ")}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-[12px] leading-relaxed text-[#03002C]/60">
            No colours set yet. Pick a colour for a room, or use “Colour by function” to start from
            what each space holds at the event.
          </p>
        )}
      </div>
    </div>
  );
}
