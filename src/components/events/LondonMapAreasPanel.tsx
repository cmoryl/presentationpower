// Area editor — section off the spaces a floor is actually being used as.
//
// The venue plan is the building; these are the areas an event lays over it: a
// stage footprint, a coffee run, a demo bay, a press corner, a storage bay. Each
// one carries a name, a kind (which decides its symbol and colour) and a
// rectangle in plan metres, and prints through every sheet, card and PDF.

import { Copy, Plus, Trash2 } from "lucide-react";

import {
  AREA_KIND_CHOICES,
  MIN_AREA_M,
  clampArea,
  type LondonCustomArea,
} from "@/lib/next-london-floormap-areas";
import { AREA_ICONS, areaKindLabel } from "@/lib/next-london-floormap-icons";
import {
  DEFAULT_MAP_DESIGN,
  zoneStyleFor,
  type MapAreaKind,
  type MapDesign,
} from "@/lib/next-london-floormap-design";
import type { LondonFloorPlan } from "@/lib/next-london-floorplan";

export type LondonMapAreasPanelProps = {
  plan: LondonFloorPlan;
  areas: LondonCustomArea[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (kind: MapAreaKind) => void;
  onChange: (area: LondonCustomArea) => void;
  onDuplicate: (area: LondonCustomArea) => void;
  onRemove: (id: string) => void;
  design?: MapDesign;
};

const num =
  "w-full rounded-md border border-[#03002C]/15 bg-white px-1.5 py-1 text-right font-mono text-[11.5px] tabular-nums text-[#03002C] focus:border-[#003FC7] focus:outline-none";
const tag = "font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#03002C]/50";

function KindMark({ kind, ink }: { kind: MapAreaKind; ink: string }) {
  const icon = AREA_ICONS[kind] ?? AREA_ICONS.room;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      style={{ color: ink }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icon.path} />
    </svg>
  );
}

export function LondonMapAreasPanel({
  plan,
  areas,
  selectedId,
  onSelect,
  onAdd,
  onChange,
  onDuplicate,
  onRemove,
  design = DEFAULT_MAP_DESIGN,
}: LondonMapAreasPanelProps) {
  const inkFor = (kind: MapAreaKind) => zoneStyleFor(kind, design).accent;

  return (
    <div className="rounded-2xl border border-[#C9D5EA] bg-[#F5F8FD] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-[#03002C]">
          Your areas on {plan.label.toLowerCase()}
        </h3>
        <span className={tag}>{areas.length} area(s)</span>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-[#03002C]/60">
        Add a space, drag it on the plan and pull its corner to size it. Areas print with their own
        symbol on every map, card and PDF.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {AREA_KIND_CHOICES.slice(0, 6).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onAdd(k)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/20 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
          >
            <Plus className="h-3 w-3" />
            <KindMark kind={k} ink={inkFor(k)} />
            {areaKindLabel(k)}
          </button>
        ))}
      </div>

      {areas.length ? (
        <ul className="mt-3 space-y-2.5">
          {areas.map((a) => {
            const active = a.id === selectedId;
            return (
              <li
                key={a.id}
                className={`rounded-xl border bg-white p-2.5 ${
                  active ? "border-[#003FC7] ring-2 ring-[#003FC7]/15" : "border-[#03002C]/12"
                }`}
              >
                <div className="flex items-center gap-2">
                  <KindMark kind={a.kind} ink={inkFor(a.kind)} />
                  <input
                    aria-label="Area name"
                    value={a.label}
                    onFocus={() => onSelect(a.id)}
                    onChange={(e) => onChange({ ...a, label: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] font-semibold text-[#03002C] hover:border-[#03002C]/15 focus:border-[#003FC7] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onDuplicate(a)}
                    aria-label={`Duplicate ${a.label}`}
                    title="Duplicate"
                    className="rounded-md border border-[#03002C]/15 p-1 text-[#03002C]/70 hover:bg-[#F2F2F2]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    aria-label={`Delete ${a.label}`}
                    title="Delete"
                    className="rounded-md border border-[#03002C]/15 p-1 text-[#C4306E] hover:bg-[#FDECF3]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={tag}>Kind</span>
                    <select
                      value={a.kind}
                      onChange={(e) => onChange({ ...a, kind: e.target.value as MapAreaKind })}
                      className="mt-0.5 w-full rounded-md border border-[#03002C]/15 bg-white px-1.5 py-1 text-[12px] text-[#03002C] focus:border-[#003FC7] focus:outline-none"
                    >
                      {AREA_KIND_CHOICES.map((k) => (
                        <option key={k} value={k}>
                          {areaKindLabel(k)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={tag}>Note on the key</span>
                    <input
                      value={a.note ?? ""}
                      onChange={(e) => onChange({ ...a, note: e.target.value })}
                      placeholder="Optional"
                      className="mt-0.5 w-full rounded-md border border-[#03002C]/15 bg-white px-1.5 py-1 text-[12px] text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ["x", "X m", 0, plan.w],
                      ["y", "Y m", 0, plan.h],
                      ["w", "W m", MIN_AREA_M, plan.w],
                      ["h", "H m", MIN_AREA_M, plan.h],
                    ] as [keyof LondonCustomArea & ("x" | "y" | "w" | "h"), string, number, number][]
                  ).map(([key, title, min, max]) => (
                    <label key={key} className="block">
                      <span className={tag}>{title}</span>
                      <input
                        type="number"
                        step={0.5}
                        min={min}
                        max={max}
                        value={a[key]}
                        onChange={(e) =>
                          onChange(clampArea({ ...a, [key]: Number(e.target.value) }, plan))
                        }
                        className={`mt-0.5 ${num}`}
                      />
                    </label>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-[#03002C]/20 bg-white/70 p-3 text-[12px] text-[#03002C]/60">
          No areas sectioned off on this floor yet. Pick a kind above to drop one in the middle of
          the plan.
        </p>
      )}
    </div>
  );
}
