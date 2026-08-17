// Layers panel for the Open Canvas Studio — every item on the stage listed
// top-most first, with select, rename, reorder, hide, lock, duplicate, delete.

import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Unlock, Copy, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import type { CanvasItem } from "@/lib/canvas-studio";

type Props = {
  items: readonly CanvasItem[];
  selectedIds: readonly string[];
  onSelect: (ids: string[]) => void;
  onPatch: (itemId: string, patch: Partial<CanvasItem>) => void;
  onRemove: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  onOrder: (itemId: string, dir: "front" | "back" | "forward" | "backward") => void;
  className?: string;
};

function defaultLabel(item: CanvasItem): string {
  switch (item.type) {
    case "module": {
      const v = MODULE_VARIANTS.find((m) => m.id === item.variantId);
      return v ? `${v.id} · ${v.name}` : "Module";
    }
    case "text":
      return item.text.trim().slice(0, 40) || "Text field";
    case "stat":
      return `${item.value} · ${item.label}`.slice(0, 40) || "Stat block";
    case "image":
      return item.alt?.trim() || "Imagery";
    default:
      return "Surface";
  }
}

const TYPE_TINT: Record<CanvasItem["type"], string> = {
  module: "bg-[#003FC7]",
  text: "bg-[#03002C]",
  stat: "bg-[#EC388A]",
  image: "bg-[#A6FA87]",
  surface: "bg-[#666666]",
};

export function StudioLayers({
  items,
  selectedIds,
  onSelect,
  onPatch,
  onRemove,
  onDuplicate,
  onOrder,
}: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);

  const ordered = useMemo(() => [...items].sort((a, b) => b.z - a.z), [items]);

  return (
    <aside className="w-60 shrink-0 rounded-2xl border border-black/10 bg-white/80 p-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/55 dark:text-white/55">
          Layers
        </h2>
        <span className="text-[11px] text-black/40 dark:text-white/40">{items.length}</span>
      </div>

      {ordered.length === 0 ? (
        <p className="px-1 text-xs text-black/45 dark:text-white/45">
          Nothing on the canvas yet. Drop a block or module to create the first layer.
        </p>
      ) : (
        <ul className="max-h-[62vh] space-y-1 overflow-y-auto pr-0.5">
          {ordered.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <li
                key={item.id}
                className={`rounded-xl border px-2 py-1.5 text-xs transition ${
                  selected
                    ? "border-[#003FC7] bg-[#003FC7]/10"
                    : "border-black/10 bg-white/70 hover:border-black/25 dark:border-white/10 dark:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_TINT[item.type]}`} />
                  {renaming === item.id ? (
                    <input
                      autoFocus
                      defaultValue={item.name ?? defaultLabel(item)}
                      aria-label="Layer name"
                      onBlur={(e) => {
                        onPatch(item.id, { name: e.target.value.trim() || undefined });
                        setRenaming(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="min-w-0 flex-1 rounded border border-black/20 bg-white px-1 py-0.5 text-xs dark:border-white/20 dark:bg-white/10"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) =>
                        onSelect(
                          e.shiftKey
                            ? selectedIds.includes(item.id)
                              ? selectedIds.filter((x) => x !== item.id)
                              : [...selectedIds, item.id]
                            : [item.id],
                        )
                      }
                      onDoubleClick={() => setRenaming(item.id)}
                      title="Click to select · double-click to rename"
                      className={`min-w-0 flex-1 truncate text-left font-medium ${
                        item.hidden ? "text-black/35 line-through dark:text-white/35" : ""
                      }`}
                    >
                      {item.name ?? defaultLabel(item)}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={item.hidden ? "Show layer" : "Hide layer"}
                    title={item.hidden ? "Show layer" : "Hide layer"}
                    onClick={() => onPatch(item.id, { hidden: !item.hidden })}
                    className="rounded p-0.5 text-black/55 hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
                  >
                    {item.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label={item.locked ? "Unlock layer" : "Lock layer"}
                    title={item.locked ? "Unlock layer" : "Lock layer"}
                    onClick={() => onPatch(item.id, { locked: !item.locked })}
                    className="rounded p-0.5 text-black/55 hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
                  >
                    {item.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {selected && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Bring forward"
                      title="Bring forward"
                      onClick={() => onOrder(item.id, "forward")}
                      className="rounded border border-black/15 p-0.5 dark:border-white/15"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Send backward"
                      title="Send backward"
                      onClick={() => onOrder(item.id, "backward")}
                      className="rounded border border-black/15 p-0.5 dark:border-white/15"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOrder(item.id, "front")}
                      className="rounded border border-black/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] dark:border-white/15"
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      onClick={() => onOrder(item.id, "back")}
                      className="rounded border border-black/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] dark:border-white/15"
                    >
                      Back
                    </button>
                    <span className="flex-1" />
                    <button
                      type="button"
                      aria-label="Duplicate layer"
                      title="Duplicate layer"
                      onClick={() => onDuplicate(item.id)}
                      className="rounded border border-black/15 p-0.5 dark:border-white/15"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete layer"
                      title="Delete layer"
                      onClick={() => onRemove(item.id)}
                      className="rounded border border-rose-300 p-0.5 text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-2 px-1 text-[10px] leading-relaxed text-black/40 dark:text-white/40">
        Top of the list sits in front. Double-click a name to rename. Hidden layers stay saved but
        are not drawn.
      </p>
    </aside>
  );
}
