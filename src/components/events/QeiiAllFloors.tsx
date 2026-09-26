// Every rebuilt QEII floor together, at one shared scale and one shared look.
//
// The point of this view is comparison: each plan is drawn with identical tones,
// wall weight, name size and lockup setting, and sized against the widest sheet
// in the set, so a real difference between floors is visible instead of being
// hidden by a different zoom. Clicking a floor opens it for editing.

import { useMemo } from "react";

import { QeiiFloorPlan } from "@/components/events/QeiiFloorPlan";
import {
  qeiiAllFloors,
  qeiiCohesionNotes,
  qeiiCohesionSummary,
  qeiiFloorProfile,
} from "@/lib/next-london-qeii-cohesion";
import type { QeiiMarkVariant, QeiiPlanFace } from "@/lib/next-london-qeii-plan";
import type { QeiiRoomColours } from "@/lib/next-london-qeii-rooms";
import type { QeiiMapEdits } from "@/lib/qeii-map-edits";

export type QeiiAllFloorsProps = {
  face: QeiiPlanFace;
  labelScale: number;
  showLabels: boolean;
  showUse: boolean;
  showMarks: boolean;
  markVariant: QeiiMarkVariant;
  markScale: number;
  wallWeight: number;
  showAllSymbols: boolean;
  /** Floor id → saved colours, so the comparison shows what the crew saved. */
  roomColourMap: Record<string, QeiiRoomColours>;
  keyLabelMap: Record<string, Record<string, string>>;
  editsMap: Record<string, QeiiMapEdits>;
  /** Open one floor on its own. */
  onOpenFloor: (floorId: string) => void;
};

export function QeiiAllFloors({
  face,
  labelScale,
  showLabels,
  showUse,
  showMarks,
  markVariant,
  markScale,
  wallWeight,
  showAllSymbols,
  roomColourMap,
  keyLabelMap,
  editsMap,
  onOpenFloor,
}: QeiiAllFloorsProps) {
  const floors = useMemo(() => qeiiAllFloors(), []);
  const notes = useMemo(() => qeiiCohesionNotes(), []);
  const summary = useMemo(() => qeiiCohesionSummary(notes), [notes]);
  // Every plan is sized against the widest and tallest sheet in the set, so the
  // floors compare at true relative size rather than each filling its own card.
  const maxW = Math.max(...floors.map((f) => f.w));
  const maxH = Math.max(...floors.map((f) => f.h));

  return (
    <section className="mt-5">
      <div className="rounded-2xl border border-[#003FC7]/25 bg-secondary px-4 py-3">
        <p className="text-[13px] font-semibold leading-relaxed text-[#03002C]">{summary}</p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {floors.map((floor) => {
          const profile = qeiiFloorProfile(floor);
          const floorNotes = notes.filter((n) => n.floorId === floor.id);
          return (
            <figure
              key={floor.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_12pt_24pt_rgba(3,0,44,0.07)]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
                <span className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#03002C] font-mono text-[12px] font-semibold text-white dark:bg-card">
                    {floor.marker}
                  </span>
                  <span className="text-[13px] font-semibold tracking-tight text-[#03002C]">
                    {floor.title}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenFloor(floor.id)}
                  className="rounded-full border border-[#03002C]/20 px-3 py-1 text-[11.5px] font-semibold text-[#003FC7] transition-colors hover:bg-[#F2F2F2]"
                >
                  Open &amp; edit
                </button>
              </div>

              <div className="bg-muted px-4 py-4">
                {/* A fixed box the size of the largest sheet: each plan sits inside
                    it at its own share of that width, centred. */}
                <div
                  className="relative mx-auto flex w-full items-center justify-center"
                  style={{ aspectRatio: `${maxW} / ${maxH}` }}
                >
                  <QeiiFloorPlan
                    floor={floor}
                    face={face}
                    labelScale={labelScale}
                    showLabels={showLabels}
                    showUse={showUse}
                    showMarks={showMarks}
                    markVariant={markVariant}
                    markScale={markScale}
                    roomColours={roomColourMap[floor.id] ?? {}}
                    keyLabels={keyLabelMap[floor.id] ?? {}}
                    showKey={false}
                    wallWeight={wallWeight}
                    showAllSymbols={showAllSymbols}
                    edits={editsMap[floor.id]}
                    className="block rounded-xl bg-muted"
                    style={{ width: `${(floor.w / maxW) * 100}%` }}
                  />
                </div>
              </div>

              <figcaption className="mt-auto space-y-2 border-t border-black/10 px-4 py-3 text-[11.5px] leading-relaxed text-[#03002C]/70">
                <span className="block">
                  Page {floor.page} · {profile.shapes} shapes · {profile.labels} names ·{" "}
                  {Math.round(floor.w)} × {Math.round(floor.h)} units
                </span>
                {floorNotes.map((note) => (
                  <span key={note.note} className="block text-[#03002C]/80">
                    {note.note}
                  </span>
                ))}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
