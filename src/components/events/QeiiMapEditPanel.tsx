// Live editing panel for a rebuilt QEII floor plan.
//
// Each room the venue printed is listed with the name it carries on the plan and
// the line beneath it. Typing here changes the plan and the editable download at
// once; nothing is saved for the crew until "Save for everyone" is pressed, and
// "As issued" puts a room back to exactly what the venue drew.

import { RotateCcw } from "lucide-react";

import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { spaceUseLine } from "@/lib/next-london-space-use";
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
};

const field =
  "w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-[12.5px] text-[#03002C] focus:border-[#003FC7] focus:outline-none";

export function QeiiMapEditPanel({
  floor,
  edits,
  onEdits,
  picked,
  onPick,
}: QeiiMapEditPanelProps) {
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
        Drag any name on the plan to move it. Rename a room or change the line
        beneath it here — the plan, the key and the downloads follow.
      </p>
      <ul className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
        {rooms.map((room) => {
          const edit = qeiiRoomEdit(edits, room);
          const issuedUse = spaceUseLine(room, floor.id) ?? "";
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
