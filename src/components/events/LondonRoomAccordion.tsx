// Rooms and breakouts on a floor, each expandable to what is actually in it.
//
// The plain list only named a room. This opens each one to show its footprint,
// the room names the print schedule uses for it, and every signage or marketing
// item scheduled inside it — so a visitor knows what a space is, and the crew
// knows what hangs there.

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  LONDON_ASSET_KIND_LABEL,
  londonAssetKind,
  londonZoneFor,
  londonZoneSummary,
  type LondonFloorPlan,
  type LondonZone,
} from "@/lib/next-london-floorplan";

import { bespokeSizeLabel, bespokeUnitsOnFloor } from "@/lib/next-london-bespoke";
import type { LondonPanel } from "@/lib/next-london-signage";
import { areaKindLabel } from "@/lib/next-london-floormap-icons";

type Props = {
  plan: LondonFloorPlan;
  /** Every asset scheduled on this floor. */
  panels: LondonPanel[];
  /** Called when a listed item is picked, so the plan can select its pin. */
  onSelectAsset?: (panelId: string) => void;
  /** Currently selected asset, highlighted in its room. */
  selectedId?: string | null;
};

const HIDDEN_KINDS = new Set(["circulation", "core"]);

export function LondonRoomAccordion({ plan, panels, onSelectAsset, selectedId }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const zones = plan.zones.filter((z) => !HIDDEN_KINDS.has(z.kind));
  const builds = bespokeUnitsOnFloor(plan.floor);

  return (
    <ul className="mt-2 max-h-[34rem] divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/10 bg-white">
      {zones.map((z) => {
        const mine = panels.filter((p) => londonZoneFor(plan, p).id === z.id);
        const zoneBuilds = builds.filter((u) => zoneOf(plan, u.room)?.id === z.id);
        const isOpen = open === z.id;
        return (
          <li key={z.id} className="text-[13px] text-[#03002C]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : z.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#EEF1F7]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-[#003FC7] transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  aria-hidden
                />
                <span className="truncate font-medium">{z.label}</span>
                {mine.length + zoneBuilds.length ? (
                  <span className="shrink-0 rounded-full bg-[#003FC7]/10 px-1.5 py-px font-mono text-[10px] text-[#003FC7]">
                    {mine.length + zoneBuilds.length}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
                {kindLabel(z.kind)}
              </span>
            </button>

            {isOpen ? (
              <div className="space-y-3 border-t border-black/5 bg-[#F7F9FC] px-3 py-3">
                <p className="text-[12px] text-[#03002C]/70">
                  Footprint about {z.w.toFixed(1)} × {z.h.toFixed(1)} m
                  {z.note ? ` — ${z.note}` : ""}
                </p>
                {z.rooms.length ? (
                  <p className="text-[12px] text-[#03002C]/70">
                    Named in the schedule as {z.rooms.join(", ").toLowerCase()}.
                  </p>
                ) : null}

                {(() => {
                  const sum = londonZoneSummary(plan, z, panels);
                  if (!sum.count) return null;
                  return (
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { k: "Items here", v: String(sum.count) },
                        { k: "Printed face", v: `${sum.printAreaM2.toFixed(1)} m²` },
                        { k: "Widest trim", v: `${sum.widestMm} mm` },
                        { k: "Tallest trim", v: `${sum.tallestMm} mm` },
                      ].map((s) => (
                        <div key={s.k} className="rounded-lg border border-black/10 bg-white px-2 py-1.5">
                          <dd className="text-[13px] font-semibold text-[#03002C]">{s.v}</dd>
                          <dt className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
                            {s.k}
                          </dt>
                        </div>
                      ))}
                      {sum.largest ? (
                        <div className="col-span-2 rounded-lg border border-black/10 bg-white px-2 py-1.5 sm:col-span-4">
                          <dd className="text-[12px] font-medium text-[#03002C]">
                            {sum.largest.name} — {sum.largest.trimW} × {sum.largest.trimH} mm
                          </dd>
                          <dt className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
                            Largest single piece
                          </dt>
                        </div>
                      ) : null}
                    </dl>
                  );
                })()}



                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
                    Signage and marketing here
                  </p>
                  {mine.length ? (
                    <ul className="mt-1.5 space-y-1">
                      {mine.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => onSelectAsset?.(p.id)}
                            className={`flex w-full items-start justify-between gap-3 rounded-lg border px-2 py-1.5 text-left ${
                              selectedId === p.id
                                ? "border-[#003FC7] bg-white"
                                : "border-black/10 bg-white hover:border-[#003FC7]/50"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{p.name}</span>
                              <span className="block truncate text-[11.5px] text-[#03002C]/60">
                                {LONDON_ASSET_KIND_LABEL[londonAssetKind(p)]} · {p.ground}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono text-[10.5px] text-[#03002C]/55">
                              {p.trimW} × {p.trimH} mm
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[12px] text-[#03002C]/60">
                      No signage or marketing scheduled in this space.
                    </p>
                  )}
                </div>

                {zoneBuilds.length ? (
                  <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
                      Scenic build
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {zoneBuilds.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-black/10 bg-white px-2 py-1.5"
                        >
                          <span className="min-w-0 truncate font-medium">{u.name}</span>
                          <span className="shrink-0 font-mono text-[10.5px] text-[#03002C]/55">
                            {bespokeSizeLabel(u.widthMm, u.heightMm)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** The zone a room name belongs to, using the same matching as the asset pins. */
function zoneOf(plan: LondonFloorPlan, room: string): LondonZone | null {
  const norm = room.trim().toUpperCase();
  return (
    plan.zones.find((z) => z.rooms.some((r) => r.trim().toUpperCase() === norm)) ??
    plan.zones.find((z) => z.rooms.some((r) => norm.includes(r.trim().toUpperCase()))) ??
    null
  );
}

function kindLabel(kind: string): string {
  try {
    return areaKindLabel(kind as never);
  } catch {
    return kind;
  }
}
