// Left rail for the Open Canvas Studio: draggable preset modules plus the
// primitive blocks (text, stat, imagery, surface). Everything is dragged onto
// the stage with the HTML5 drag-and-drop payload `application/x-tp-canvas`.

import { useMemo, useState } from "react";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, variantsForSection, type BrandMode } from "@/lib/taxonomy";
import { LazyMount } from "@/components/LazyMount";
import { ModuleItemView } from "./CanvasItemView";
import type { CanvasItemType, ModuleItem } from "@/lib/canvas-studio";
import { presetsForCategory, type PresetCategory } from "@/lib/canvas-block-presets";
import { PresetThumb } from "./PresetThumb";

export const DRAG_MIME = "application/x-tp-canvas";

export type DragPayload =
  | { kind: "module"; variantId: string }
  | { kind: "block"; type: Exclude<CanvasItemType, "module"> }
  | { kind: "preset"; presetId: string };

function setDrag(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copy";
}

const BLOCKS: Array<{ type: Exclude<CanvasItemType, "module">; label: string; hint: string }> = [
  { type: "text", label: "Text field", hint: "Headline, body or caption copy" },
  { type: "stat", label: "Stat block", hint: "Big number + supporting label" },
  { type: "image", label: "Imagery", hint: "Drop a file or paste a URL" },
  { type: "surface", label: "Surface", hint: "Colour plate behind content" },
];

const PRESET_TABS: Array<{ id: PresetCategory; label: string }> = [
  { id: "text", label: "Text" },
  { id: "stat", label: "Stats" },
  { id: "image", label: "Imagery" },
  { id: "surface", label: "Surface" },
];

export function StudioPalette({
  brand,
  mode,
  onAdd,
}: {
  brand: BrandMode;
  mode: "light" | "dark";
  onAdd: (payload: DragPayload) => void;
}) {
  const [tab, setTab] = useState<"modules" | "blocks">("modules");
  const [q, setQ] = useState("");
  const [sectionId, setSectionId] = useState(SECTION_FRAMEWORKS[0]?.id ?? "");
  const [advanced, setAdvanced] = useState(true);
  const [presetCat, setPresetCat] = useState<PresetCategory>("text");

  const variants = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term
      ? MODULE_VARIANTS.filter((v) =>
          `${v.id} ${v.name} ${v.description}`.toLowerCase().includes(term),
        )
      : sectionId === "*"
        ? MODULE_VARIANTS
        : variantsForSection(sectionId);
    return pool.slice(0, 200);
  }, [q, sectionId]);

  return (
    <div className="flex h-full min-h-0 w-[320px] shrink-0 flex-col rounded-2xl border border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex gap-1 border-b border-black/10 p-2 dark:border-white/10">
        {(["modules", "blocks"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              tab === t
                ? "bg-[#03002C] text-white"
                : "text-black/60 hover:bg-black/5 dark:text-white/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "blocks" ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {BLOCKS.map((b) => (
            <button
              key={b.type}
              type="button"
              draggable
              onDragStart={(e) => setDrag(e, { kind: "block", type: b.type })}
              onClick={() => onAdd({ kind: "block", type: b.type })}
              className="w-full cursor-grab rounded-xl border border-black/10 bg-white p-3 text-left transition hover:border-[#003FC7] hover:shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
            >
              <div className="text-sm font-semibold text-black/85 dark:text-white/90">{b.label}</div>
              <div className="mt-0.5 text-[11px] text-black/50 dark:text-white/50">{b.hint}</div>
            </button>
          ))}
          <p className="pt-2 text-[11px] leading-relaxed text-black/45 dark:text-white/45">
            Drag onto the canvas to place, or click to drop it in the centre. Mix any number of
            blocks with full preset modules on the same slide.
          </p>

          {/* Advanced: multi-block preset layouts, picked visually. */}
          <div className="border-t border-black/10 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              aria-expanded={advanced}
              className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60 dark:text-white/60">
                Advanced layouts
              </span>
              <span className="text-xs text-black/45 dark:text-white/45">{advanced ? "Hide" : "Show"}</span>
            </button>

            {advanced && (
              <div className="mt-2 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {PRESET_TABS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPresetCat(c.id)}
                      aria-pressed={presetCat === c.id}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                        presetCat === c.id
                          ? "bg-[#003FC7] text-white"
                          : "border border-black/10 text-black/60 hover:border-[#003FC7] dark:border-white/15 dark:text-white/60"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {presetsForCategory(presetCat).map((p) => (
                    <div
                      key={p.id}
                      draggable
                      role="button"
                      tabIndex={0}
                      title={p.hint}
                      onDragStart={(e) => setDrag(e, { kind: "preset", presetId: p.id })}
                      onClick={() => onAdd({ kind: "preset", presetId: p.id })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onAdd({ kind: "preset", presetId: p.id });
                      }}
                      className="cursor-grab rounded-xl border border-black/10 bg-white p-1.5 transition hover:border-[#003FC7] hover:shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
                    >
                      <PresetThumb preset={p} />
                      <div className="mt-1 truncate px-0.5 text-[11px] font-semibold text-black/80 dark:text-white/85">
                        {p.label}
                      </div>
                      <div className="truncate px-0.5 text-[10px] text-black/45 dark:text-white/45">
                        {p.hint}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-black/45 dark:text-white/45">
                  Presets drop as a group of editable layers — every text field, stat, frame and
                  plate stays individually selectable.
                </p>
              </div>
            )}
          </div>
        </div>

      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-2 border-b border-black/10 p-3 dark:border-white/10">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search all ${MODULE_VARIANTS.length} modules…`}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/[0.06]"
            />
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!!q.trim()}
              className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.06]"
            >
              <option value="*">All modules ({MODULE_VARIANTS.length})</option>
              {SECTION_FRAMEWORKS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {variants.map((v) => (
              <div
                key={v.id}
                draggable
                onDragStart={(e) => setDrag(e, { kind: "module", variantId: v.id })}
                onClick={() => onAdd({ kind: "module", variantId: v.id })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onAdd({ kind: "module", variantId: v.id });
                }}
                className="cursor-grab overflow-hidden rounded-xl border border-black/10 bg-white transition hover:border-[#003FC7] hover:shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/5">
                  <LazyMount
                    className="absolute inset-0"
                    placeholder={<div className="h-full w-full animate-pulse bg-black/5" />}
                  >
                    <div className="pointer-events-none h-full w-full">
                      <ModuleItemView
                        item={
                          {
                            id: `pal-${v.id}`,
                            type: "module",
                            variantId: v.id,
                            fit: "contain",
                            x: 0,
                            y: 0,
                            w: 288,
                            h: 162,
                            z: 1,
                          } as ModuleItem
                        }
                        brand={brand}
                        mode={mode}
                      />
                    </div>
                  </LazyMount>
                </div>
                <div className="p-2">
                  <div className="truncate text-xs font-semibold text-black/85 dark:text-white/90">
                    {v.name}
                  </div>
                  <div className="truncate text-[10px] uppercase tracking-[0.16em] text-black/40 dark:text-white/40">
                    {v.id}
                  </div>
                </div>
              </div>
            ))}
            {variants.length === 0 && (
              <p className="text-xs text-black/50 dark:text-white/50">No modules match that search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
