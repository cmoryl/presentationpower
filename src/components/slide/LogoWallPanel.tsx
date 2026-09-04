// Editor controls for the acquisitions logo wall on the growth-proof split
// module: how many logos are shown, how large the marks sit inside their tiles
// and how much air separates the tiles.

import {
  DEFAULT_LOGO_WALL,
  MAX_WALL_COLUMNS,
  MAX_WALL_GAP,
  MAX_WALL_LOGOS,
  MAX_WALL_SCALE,
  MIN_WALL_COLUMNS,
  MIN_WALL_GAP,
  MIN_WALL_SCALE,
  patchLogoWall,
  resolveLogoWall,
  type LogoWall,
} from "@/lib/logo-wall";
import { canMoveDown, canMoveUp } from "@/lib/reorder";
import { ReorderHandle, ReorderNudge, useReorder } from "./ReorderRow";

type Row = Record<string, unknown>;

const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function LogoWallPanel({
  items,
  wall,
  onChangeItems,
  onChangeWall,
}: {
  items: unknown;
  wall: unknown;
  onChangeItems: (items: Row[]) => void;
  onChangeWall: (wall: LogoWall) => void;
}) {
  const list = rows(items);
  const w = resolveLogoWall(wall);
  const set = (patch: Partial<LogoWall>) => onChangeWall(patchLogoWall(wall, patch));
  const reorder = useReorder(list, onChangeItems);

  const addLogo = () => {
    if (list.length >= MAX_WALL_LOGOS) return;
    onChangeItems([...list, { name: `Company ${list.length + 1}` }]);
  };
  const removeLogo = () => {
    if (list.length === 0) return;
    onChangeItems(list.slice(0, -1));
  };

  const isDefault =
    w.columns === DEFAULT_LOGO_WALL.columns &&
    w.scale === DEFAULT_LOGO_WALL.scale &&
    w.gap === DEFAULT_LOGO_WALL.gap;

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[#03002C]">Logo wall</h3>
          <p className="text-[11px] text-black/55">
            Number of logos, their size inside each tile, and the spacing between tiles.
          </p>
        </div>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChangeWall({ ...DEFAULT_LOGO_WALL })}
            className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-medium text-black/60 transition hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            ⟲ Reset
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Logos
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={removeLogo}
            disabled={list.length === 0}
            aria-label="Remove last logo"
            className="h-7 w-7 rounded-full border border-black/10 text-[13px] font-semibold text-black/70 transition enabled:hover:border-[#003FC7] enabled:hover:text-[#003FC7] disabled:opacity-40"
          >
            −
          </button>
          <span className="w-14 text-center text-[12px] font-semibold tabular-nums text-[#03002C]">
            {list.length} / {MAX_WALL_LOGOS}
          </span>
          <button
            type="button"
            onClick={addLogo}
            disabled={list.length >= MAX_WALL_LOGOS}
            aria-label="Add a logo"
            className="h-7 w-7 rounded-full border border-black/10 text-[13px] font-semibold text-black/70 transition enabled:hover:border-[#003FC7] enabled:hover:text-[#003FC7] disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <label className="mt-4 flex flex-col gap-1">
        <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Per row
          <span className="tabular-nums text-black/60">{w.columns}</span>
        </span>
        <input
          type="range"
          min={MIN_WALL_COLUMNS}
          max={MAX_WALL_COLUMNS}
          step={1}
          value={w.columns}
          onChange={(e) => set({ columns: Number(e.target.value) })}
          aria-label="Logos per row"
          className="w-full accent-[#003FC7]"
        />
      </label>

      <label className="mt-3 flex flex-col gap-1">
        <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Logo size
          <span className="tabular-nums text-black/60">{Math.round(w.scale * 100)}%</span>
        </span>
        <input
          type="range"
          min={Math.round(MIN_WALL_SCALE * 100)}
          max={Math.round(MAX_WALL_SCALE * 100)}
          step={5}
          value={Math.round(w.scale * 100)}
          onChange={(e) => set({ scale: Number(e.target.value) / 100 })}
          aria-label="Logo size"
          className="w-full accent-[#003FC7]"
        />
      </label>

      <label className="mt-3 flex flex-col gap-1">
        <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Spacing
          <span className="tabular-nums text-black/60">{w.gap}px</span>
        </span>
        <input
          type="range"
          min={MIN_WALL_GAP}
          max={MAX_WALL_GAP}
          step={2}
          value={w.gap}
          onChange={(e) => set({ gap: Number(e.target.value) })}
          aria-label="Spacing between logo tiles"
          className="w-full accent-[#003FC7]"
        />
      </label>
    </section>
  );
}
