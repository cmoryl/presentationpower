/**
 * CANVAS SLIDE STRIP — the deck view of the Open Canvas Studio.
 *
 * Compositions in the studio are slides of the deck being built, so they belong
 * on screen together: the active one on the big stage, every other one in a
 * filmstrip underneath that can be clicked straight into editing. Thumbnails are
 * drawn from each composition's own layer geometry (no offscreen render), so the
 * strip stays cheap even with a long deck.
 */
import { Plus, Copy, Trash2 } from "lucide-react";
import { STAGE_W, STAGE_H, type CanvasComposition } from "@/lib/canvas-studio";

const TILE_W = 168;
const TILE_H = Math.round((TILE_W * STAGE_H) / STAGE_W);

function Thumb({ comp }: { comp: CanvasComposition }) {
  const dark = comp.mode === "dark";
  const items = [...comp.items].sort((a, b) => a.z - b.z).slice(0, 40);
  return (
    <div
      className={`relative overflow-hidden rounded-md ${dark ? "bg-[#03002C]" : "bg-[#E0E8F5]"}`}
      style={{ width: TILE_W, height: TILE_H }}
      aria-hidden
    >
      {items.map((it) => (
        <span
          key={it.id}
          className={`absolute rounded-[2px] ${
            it.type === "image"
              ? dark
                ? "bg-white/45"
                : "bg-[#003FC7]/45"
              : it.type === "text" || it.type === "stat"
                ? dark
                  ? "bg-white/70"
                  : "bg-[#03002C]/70"
                : dark
                  ? "bg-white/15"
                  : "bg-[#003FC7]/15"
          }`}
          style={{
            left: `${(it.x / STAGE_W) * 100}%`,
            top: `${(it.y / STAGE_H) * 100}%`,
            width: `${(it.w / STAGE_W) * 100}%`,
            height: `${(it.h / STAGE_H) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

export function CanvasSlideStrip({
  compositions,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
}: {
  compositions: CanvasComposition[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section
      aria-label="Slides in this canvas deck"
      className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">
          Slides · {compositions.length}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#003FC7]/90"
        >
          <Plus className="h-3.5 w-3.5" /> Add slide
        </button>
      </div>
      <ul className="flex snap-x gap-3 overflow-x-auto pb-1">
        {compositions.map((c, i) => {
          const active = c.id === activeId;
          return (
            <li key={c.id} className="shrink-0 snap-start">
              <div
                className={`rounded-xl border p-2 transition ${
                  active
                    ? "border-[#003FC7] bg-[#003FC7]/[0.06]"
                    : "border-black/10 hover:border-black/25 dark:border-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-current={active ? "true" : undefined}
                  className="block text-left"
                >
                  <Thumb comp={c} />
                  <span className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-[10px] font-semibold text-black/40 dark:text-white/40">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="max-w-[120px] truncate text-[11px] font-medium text-black/75 dark:text-white/75"
                      title={c.name}
                    >
                      {c.name || "Untitled slide"}
                    </span>
                  </span>
                </button>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-black/40 dark:text-white/40">
                    {c.items.length} layer{c.items.length === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`Duplicate ${c.name || "slide"}`}
                      title="Duplicate slide"
                      onClick={() => onDuplicate(c.id)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-black/45 transition hover:bg-black/[0.05] hover:text-primary dark:text-white/45"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${c.name || "slide"}`}
                      title="Delete slide"
                      onClick={() => onDelete(c.id)}
                      disabled={compositions.length <= 1}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-50 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
