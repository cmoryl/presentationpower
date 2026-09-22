// Live editing panel for a rebuilt QEII floor plan.
//
// Each room the venue printed is listed with the name it carries on the plan and
// the line beneath it. Typing here changes the plan and the editable download at
// once; nothing is saved for the crew until "Save for everyone" is pressed, and
// "As issued" puts a room back to exactly what the venue drew.

import { RotateCcw } from "lucide-react";

import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { spaceUseLine, spaceUseMarkChoices, spaceUseMarks } from "@/lib/next-london-space-use";
import { QEII_ROOM_PALETTE, type QeiiRoomColours } from "@/lib/next-london-qeii-rooms";
import {
  qeiiApplyRoomEdit,
  qeiiClearRoomEdit,
  qeiiRoomEdit,
  type QeiiMapEdits,
} from "@/lib/qeii-map-edits";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

export type QeiiMapEditPanelProps = {
  floor: QeiiFloorVector;
  edits: QeiiMapEdits;
  onEdits: (next: QeiiMapEdits) => void;
  /** The room whose fields are open, set by picking a name on the plan. */
  picked?: string;
  onPick: (room: string | undefined) => void;
  /** Room name → approved fill colour, so a colour can be set on the room itself. */
  roomColours?: QeiiRoomColours;
  onRoomColours?: (next: QeiiRoomColours) => void;
};

const field =
  "w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-[12.5px] text-[#03002C] focus:border-[#003FC7] focus:outline-none";

export function QeiiMapEditPanel({
  floor,
  edits,
  onEdits,
  picked,
  onPick,
  roomColours,
  onRoomColours,
}: QeiiMapEditPanelProps) {
  // Every division with an approved lockup, so nothing unpublished can be placed.
  const markChoices = spaceUseMarkChoices();

  /** Set or clear this room's fill without leaving the room's own fields. */
  function setColour(room: string, hex?: string) {
    if (!onRoomColours) return;
    const next = { ...(roomColours ?? {}) };
    if (hex) next[room] = hex;
    else delete next[room];
    onRoomColours(next);
  }

  // The layout is read without edits so every room is listed under the name the
  // venue issued, whatever it has been renamed to.
  const rooms = qeiiPlanLayout(floor, { showUse: false, showMarks: false })
    .blocks.map((b) => b.room)
    .filter((room, i, all) => all.indexOf(room) === i)
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="mt-4 rounded-2xl border border-[#003FC7]/30 bg-white p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/60">
        Live editing · {floor.title}
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#03002C]/75">
        Drag any name on the plan to move it. Pick a room below to rename it,
        change the line beneath it, choose its division logo or set its colour —
        the plan, the key and every download follow at once.
      </p>
      <ul className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
        {rooms.map((room) => {
          const edit = qeiiRoomEdit(edits, room);
          const issuedUse = spaceUseLine(room, floor.id) ?? "";
          const issuedMarks = spaceUseMarks(room, floor.id).map((m) => m.divisionId);
          const changed = !!edit && Object.keys(edit).length > 0;
          const open = picked === room;
          return (
            <li
              key={room}
              className={`rounded-xl border px-3 py-2 ${
                open ? "border-[#003FC7] bg-[#E0E8F5]/50" : "border-black/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onPick(open ? undefined : room)}
                  className="text-left text-[13px] font-semibold text-[#03002C]"
                >
                  {room}
                  {changed ? (
                    <span className="ml-2 rounded-full bg-[#003FC7] px-2 py-0.5 text-[10px] font-semibold text-white">
                      edited
                    </span>
                  ) : null}
                </button>
                {changed ? (
                  <button
                    type="button"
                    onClick={() => onEdits(qeiiClearRoomEdit(edits, room))}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#003FC7]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> As issued
                  </button>
                ) : null}
              </div>
              {open ? (
                <div className="mt-2 grid gap-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#03002C]/60">
                    Name on the plan
                    <input
                      className={`${field} mt-1 normal-case`}
                      value={edit?.name ?? room}
                      onChange={(e) =>
                        onEdits(qeiiApplyRoomEdit(edits, room, { name: e.target.value }))
                      }
                    />
                  </label>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#03002C]/60">
                    Line beneath the name
                    <input
                      className={`${field} mt-1 normal-case`}
                      value={edit?.use ?? issuedUse}
                      placeholder={issuedUse || "Nothing recorded for this space"}
                      onChange={(e) =>
                        onEdits(qeiiApplyRoomEdit(edits, room, { use: e.target.value }))
                      }
                    />
                  </label>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#03002C]/60">
                      Division logo beside the name
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {markChoices.map((mark) => {
                        const on = (edit?.marks ?? issuedMarks).includes(mark.divisionId);
                        return (
                          <button
                            key={mark.divisionId}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              const now = edit?.marks ?? issuedMarks;
                              const next = on
                                ? now.filter((id) => id !== mark.divisionId)
                                : [...now, mark.divisionId];
                              onEdits(qeiiApplyRoomEdit(edits, room, { marks: next }));
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11.5px] font-semibold ${
                              on
                                ? "border-[#003FC7] bg-[#E0E8F5] text-[#03002C]"
                                : "border-black/15 text-[#03002C]/70"
                            }`}
                          >
                            <img src={mark.url} alt="" className="h-4 w-auto" />
                            {mark.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-[#03002C]/65">
                      {(edit?.marks ?? issuedMarks).length
                        ? "Approved lockups only — they go into every download as grouped artwork."
                        : "No logo prints on this room."}
                      {edit?.marks ? (
                        <button
                          type="button"
                          onClick={() =>
                            onEdits(qeiiApplyRoomEdit(edits, room, { marks: undefined }))
                          }
                          className="ml-1 font-semibold text-[#003FC7] underline"
                        >
                          Back to the schedule's own reading
                        </button>
                      ) : null}
                    </p>
                  </div>
                  {onRoomColours ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#03002C]/60">
                        Room colour
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {QEII_ROOM_PALETTE.map((swatch) => {
                          const on = (roomColours ?? {})[room] === swatch.hex;
                          return (
                            <button
                              key={swatch.id}
                              type="button"
                              aria-pressed={on}
                              title={swatch.label}
                              aria-label={swatch.label}
                              onClick={() => setColour(room, on ? undefined : swatch.hex)}
                              className={`h-6 w-6 rounded-md border-2 ${
                                on ? "border-[#003FC7]" : "border-black/15"
                              }`}
                              style={{ background: swatch.hex }}
                            />
                          );
                        })}
                        {(roomColours ?? {})[room] ? (
                          <button
                            type="button"
                            onClick={() => setColour(room, undefined)}
                            className="text-[11.5px] font-semibold text-[#003FC7] underline"
                          >
                            No colour
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {edit?.dx || edit?.dy ? (
                    <button
                      type="button"
                      onClick={() => onEdits(qeiiApplyRoomEdit(edits, room, { dx: 0, dy: 0 }))}
                      className="justify-self-start text-[11.5px] font-semibold text-[#003FC7] underline"
                    >
                      Put this name back where the venue printed it
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
