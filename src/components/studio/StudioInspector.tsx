// Right rail for the Open Canvas Studio — properties for the selected item.

import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { STAGE_H, STAGE_W, type CanvasItem } from "@/lib/canvas-studio";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

const input =
  "w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/[0.06]";

export function StudioInspector({
  item,
  onPatch,
  onRemove,
  onDuplicate,
  onOrder,
  onExplode,
  className = "",
}: {
  item: CanvasItem | null;
  onPatch: (patch: Partial<CanvasItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onOrder: (dir: "front" | "back" | "forward" | "backward") => void;
  /** Present for module items: explode the module into editable layers. */
  onExplode?: () => void;
  className?: string;
}) {
  if (!item)
    return (
      <div className={`w-[300px] shrink-0 rounded-2xl border border-black/10 bg-white/80 p-4 text-xs leading-relaxed text-black/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50 ${className}`}>
        Select an item on the canvas to edit it. Drag to move, use the corner handle to resize, and
        press Delete to remove.
      </div>
    );

  return (
    <div className={`flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-black/10 bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60 dark:text-white/60">
          {item.type}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onDuplicate} className="rounded px-2 py-1 text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/10">
            Duplicate
          </button>
          <button type="button" onClick={onRemove} className="rounded px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {(
          [
            ["front", "Front"],
            ["forward", "Up"],
            ["backward", "Down"],
            ["back", "Back"],
          ] as const
        ).map(([dir, label]) => (
          <button
            key={dir}
            type="button"
            onClick={() => onOrder(dir)}
            className="rounded-lg border border-black/10 px-1 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["x", "y", "w", "h"] as const).map((k) => (
          <Row key={k} label={k.toUpperCase()}>
            <input
              type="number"
              className={input}
              value={Math.round(item[k])}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                const max = k === "x" || k === "w" ? STAGE_W : STAGE_H;
                onPatch({ [k]: Math.max(k === "w" || k === "h" ? 40 : 0, Math.min(max, v)) } as Partial<CanvasItem>);
              }}
            />
          </Row>
        ))}
      </div>

      {item.type === "module" && (
        <>
          {onExplode && (
            <div className="rounded-xl border border-[#003FC7]/25 bg-[#003FC7]/[0.06] p-3">
              <button
                type="button"
                onClick={onExplode}
                className="w-full rounded-lg bg-[#003FC7] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-[#0033a6]"
              >
                Make editable
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-black/55 dark:text-white/55">
                Breaks this module into your own layers — every headline, plate, icon and photo
                becomes editable and stays exactly where it sits. You can also double-click the
                module on the canvas.
              </p>
            </div>
          )}

          <Row label="Module">
            <select
              className={input}
              value={item.variantId}
              onChange={(e) => onPatch({ variantId: e.target.value } as Partial<CanvasItem>)}
            >
              {MODULE_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Fit">
            <select
              className={input}
              value={item.fit}
              onChange={(e) => onPatch({ fit: e.target.value as "cover" | "contain" } as Partial<CanvasItem>)}
            >
              <option value="cover">Cover (crop to box)</option>
              <option value="contain">Contain (fit whole module)</option>
            </select>
          </Row>
          <Row label="Mode override">
            <select
              className={input}
              value={item.mode ?? ""}
              onChange={(e) =>
                onPatch({ mode: (e.target.value || undefined) as "light" | "dark" | undefined } as Partial<CanvasItem>)
              }
            >
              <option value="">Inherit slide</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Offset X">
              <input
                type="number"
                className={input}
                value={item.offsetX ?? 0}
                onChange={(e) => onPatch({ offsetX: Number(e.target.value) || 0 } as Partial<CanvasItem>)}
              />
            </Row>
            <Row label="Offset Y">
              <input
                type="number"
                className={input}
                value={item.offsetY ?? 0}
                onChange={(e) => onPatch({ offsetY: Number(e.target.value) || 0 } as Partial<CanvasItem>)}
              />
            </Row>
          </div>
        </>
      )}

      {item.type === "text" && (
        <>
          <Row label="Text">
            <textarea
              className={`${input} min-h-24`}
              value={item.text}
              onChange={(e) => onPatch({ text: e.target.value } as Partial<CanvasItem>)}
            />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Size">
              <input
                type="number"
                className={input}
                value={item.size}
                onChange={(e) => onPatch({ size: Math.max(12, Number(e.target.value) || 12) } as Partial<CanvasItem>)}
              />
            </Row>
            <Row label="Weight">
              <select
                className={input}
                value={item.weight}
                onChange={(e) => onPatch({ weight: Number(e.target.value) as 400 } as Partial<CanvasItem>)}
              >
                {[400, 500, 600, 700].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Row>
          </div>
          <Row label="Align">
            <select
              className={input}
              value={item.align}
              onChange={(e) => onPatch({ align: e.target.value as "left" } as Partial<CanvasItem>)}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </Row>
          <Row label="Colour">
            <input
              type="color"
              className="h-9 w-full rounded-lg border border-black/15"
              value={item.color ?? "#03002C"}
              onChange={(e) => onPatch({ color: e.target.value } as Partial<CanvasItem>)}
            />
          </Row>
          <label className="flex items-center gap-2 text-xs text-black/70 dark:text-white/70">
            <input
              type="checkbox"
              checked={!!item.uppercase}
              onChange={(e) => onPatch({ uppercase: e.target.checked } as Partial<CanvasItem>)}
            />
            Uppercase (kicker style)
          </label>
        </>
      )}

      {item.type === "image" && (
        <>
          <Row label="Image URL">
            <input
              className={input}
              value={item.url}
              placeholder="https://…"
              onChange={(e) => onPatch({ url: e.target.value } as Partial<CanvasItem>)}
            />
          </Row>
          <Row label="Alt text">
            <input
              className={input}
              value={item.alt ?? ""}
              onChange={(e) => onPatch({ alt: e.target.value } as Partial<CanvasItem>)}
            />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Fit">
              <select
                className={input}
                value={item.fit}
                onChange={(e) => onPatch({ fit: e.target.value as "cover" } as Partial<CanvasItem>)}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </Row>
            <Row label="Radius">
              <input
                type="number"
                className={input}
                value={item.radius}
                onChange={(e) => onPatch({ radius: Math.max(0, Number(e.target.value) || 0) } as Partial<CanvasItem>)}
              />
            </Row>
          </div>
        </>
      )}

      {item.type === "stat" && (
        <>
          <Row label="Value">
            <input
              className={input}
              value={item.value}
              onChange={(e) => onPatch({ value: e.target.value } as Partial<CanvasItem>)}
            />
          </Row>
          <Row label="Label">
            <textarea
              className={`${input} min-h-20`}
              value={item.label}
              onChange={(e) => onPatch({ label: e.target.value } as Partial<CanvasItem>)}
            />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Accent">
              <input
                type="color"
                className="h-9 w-full rounded-lg border border-black/15"
                value={item.accent ?? "#003FC7"}
                onChange={(e) => onPatch({ accent: e.target.value } as Partial<CanvasItem>)}
              />
            </Row>
            <Row label="Surface">
              <select
                className={input}
                value={item.surface}
                onChange={(e) => onPatch({ surface: e.target.value as "plate" } as Partial<CanvasItem>)}
              >
                <option value="plate">Plate</option>
                <option value="bare">Bare</option>
              </select>
            </Row>
          </div>
        </>
      )}

      {item.type === "surface" && (
        <>
          <Row label="Fill type">
            <select
              className={input}
              value={item.fillKind ?? "solid"}
              onChange={(e) => {
                const kind = e.target.value as "solid" | "gradient" | "image";
                onPatch({
                  fillKind: kind,
                  ...(kind === "gradient" && !item.gradient
                    ? { gradient: DEFAULT_CANVAS_GRADIENT }
                    : {}),
                } as Partial<CanvasItem>);
              }}
            >
              <option value="solid">Solid colour</option>
              <option value="gradient">Gradient</option>
              <option value="image">Background image</option>
            </select>
          </Row>

          {(item.fillKind ?? "solid") === "solid" && (
            <Row label="Fill">
              <input
                type="color"
                className="h-9 w-full rounded-lg border border-black/15"
                value={item.fill}
                onChange={(e) => onPatch({ fill: e.target.value } as Partial<CanvasItem>)}
              />
            </Row>
          )}

          {item.fillKind === "gradient" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Row label="From">
                  <input
                    type="color"
                    className="h-9 w-full rounded-lg border border-black/15"
                    value={grad(item).from}
                    onChange={(e) =>
                      onPatch({ gradient: { ...grad(item), from: e.target.value } } as Partial<CanvasItem>)
                    }
                  />
                </Row>
                <Row label="To">
                  <input
                    type="color"
                    className="h-9 w-full rounded-lg border border-black/15"
                    value={grad(item).to}
                    onChange={(e) =>
                      onPatch({ gradient: { ...grad(item), to: e.target.value } } as Partial<CanvasItem>)
                    }
                  />
                </Row>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Row label="Style">
                  <select
                    className={input}
                    value={grad(item).kind}
                    onChange={(e) =>
                      onPatch({
                        gradient: { ...grad(item), kind: e.target.value as "linear" | "radial" },
                      } as Partial<CanvasItem>)
                    }
                  >
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                  </select>
                </Row>
                <Row label="Angle">
                  <input
                    type="number"
                    step="15"
                    className={input}
                    value={grad(item).angleDeg}
                    disabled={grad(item).kind === "radial"}
                    onChange={(e) =>
                      onPatch({
                        gradient: { ...grad(item), angleDeg: Number(e.target.value) || 0 },
                      } as Partial<CanvasItem>)
                    }
                  />
                </Row>
              </div>
              <div
                className="h-10 rounded-lg border border-black/10"
                style={{ background: canvasFillCss(item, item.fill) }}
              />
            </>
          )}

          {item.fillKind === "image" && (
            <>
              <Row label="Image URL">
                <input
                  className={input}
                  placeholder="https://… or paste a data URL"
                  value={item.imageUrl ?? ""}
                  onChange={(e) => onPatch({ imageUrl: e.target.value } as Partial<CanvasItem>)}
                />
              </Row>
              <div className="grid grid-cols-2 gap-2">
                <Row label="Fit">
                  <select
                    className={input}
                    value={item.imageFit ?? "cover"}
                    onChange={(e) =>
                      onPatch({ imageFit: e.target.value as "cover" | "contain" } as Partial<CanvasItem>)
                    }
                  >
                    <option value="cover">Cover (crop)</option>
                    <option value="contain">Contain</option>
                  </select>
                </Row>
                <Row label="Behind colour">
                  <input
                    type="color"
                    className="h-9 w-full rounded-lg border border-black/15"
                    value={item.fill}
                    onChange={(e) => onPatch({ fill: e.target.value } as Partial<CanvasItem>)}
                  />
                </Row>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Row label="Radius">
              <input
                type="number"
                className={input}
                value={item.radius}
                onChange={(e) => onPatch({ radius: Math.max(0, Number(e.target.value) || 0) } as Partial<CanvasItem>)}
              />
            </Row>
            <Row label="Opacity">
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                className={input}
                value={item.opacity}
                onChange={(e) =>
                  onPatch({ opacity: Math.max(0, Math.min(1, Number(e.target.value) || 0)) } as Partial<CanvasItem>)
                }
              />
            </Row>
          </div>
        </>
      )}
    </div>
  );
}
