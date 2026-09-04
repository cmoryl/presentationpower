/**
 * OrbitLayoutPanel — direct-manipulation placement for the growth-proof orbit
 * stats (MV-PROOF-GROWTH-ORBITS).
 *
 * The mini stage mirrors the module's right-hand area: drag a figure anywhere
 * inside it, resize it with the slider, nudge it with the arrow keys, or send it
 * back to its staggered default. Every mutation runs through the pure ops in
 * `@/lib/orbit-layout` so the panel, the renderer and the PowerPoint export
 * agree on the same coordinates.
 */
import * as React from "react";
import {
  MAX_ORBIT_SIZE,
  MIN_ORBIT_SIZE,
  patchOrbitPos,
  resetOrbitPos,
  resolveOrbitLayout,
} from "@/lib/orbit-layout";

type Props = {
  orbits: unknown;
  onChange: (orbits: Record<string, unknown>[]) => void;
};

const btnCls =
  "inline-flex items-center gap-1 rounded-lg border border-black/15 px-2 py-1 text-xs text-black/70 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30";

export function OrbitLayoutPanel({ orbits, onChange }: Props) {
  const items = React.useMemo(
    () => (Array.isArray(orbits) ? (orbits as unknown[]) : []).slice(0, 3),
    [orbits],
  );
  const positions = React.useMemo(() => resolveOrbitLayout(items), [items]);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [active, setActive] = React.useState(0);
  const dragging = React.useRef<number | null>(null);

  const moveTo = React.useCallback(
    (index: number, clientX: number, clientY: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      onChange(
        patchOrbitPos(items, index, {
          x: ((clientX - rect.left) / rect.width) * 100,
          y: ((clientY - rect.top) / rect.height) * 100,
        }),
      );
    },
    [items, onChange],
  );

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current === null) return;
      e.preventDefault();
      moveTo(dragging.current, e.clientX, e.clientY);
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [moveTo]);

  if (items.length === 0) return null;

  const nudge = (index: number, dx: number, dy: number) => {
    const p = positions[index]!;
    onChange(patchOrbitPos(items, index, { x: p.x + dx, y: p.y + dy }));
  };

  return (
    <section
      aria-label="Stat placement"
      className="rounded-2xl border border-black/10 bg-white p-6"
    >
      <header>
        <h3 className="text-xs uppercase tracking-widest text-black/50">Stat placement</h3>
        <p className="mt-1 text-xs text-black/50">
          Drag a figure to move it, or select one and use the arrow keys.
        </p>
      </header>

      <div
        ref={stageRef}
        className="relative mt-4 w-full overflow-hidden rounded-xl border border-black/10 bg-[#F5F7FB]"
        style={{ aspectRatio: "5 / 6" }}
      >
        {items.map((it, i) => {
          const p = positions[i]!;
          const label = String(
            (it as Record<string, unknown>)?.value ?? `#${i + 1}`,
          );
          const on = active === i;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Figure ${i + 1} — ${label}. Drag or use arrow keys to position.`}
              onPointerDown={(e) => {
                e.preventDefault();
                setActive(i);
                dragging.current = i;
              }}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 5 : 1;
                if (e.key === "ArrowLeft") nudge(i, -step, 0);
                else if (e.key === "ArrowRight") nudge(i, step, 0);
                else if (e.key === "ArrowUp") nudge(i, 0, -step);
                else if (e.key === "ArrowDown") nudge(i, 0, step);
                else return;
                e.preventDefault();
              }}
              onFocus={() => setActive(i)}
              className="absolute flex touch-none items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition focus-visible:outline-none"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${28 * p.size}%`,
                aspectRatio: "1 / 1",
                transform: "translate(-50%, -50%)",
                border: `2px solid ${on ? "#003FC7" : "rgba(3,0,44,0.35)"}`,
                background: on ? "rgba(0,63,199,0.10)" : "rgba(255,255,255,0.85)",
                color: on ? "#003FC7" : "#03002C",
                cursor: "grab",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {items.map((it, i) => {
          const p = positions[i]!;
          return (
            <div key={i} className="flex flex-wrap items-center gap-3 text-xs text-black/60">
              <button
                type="button"
                className={`${btnCls} ${active === i ? "border-[#003FC7] text-[#003FC7]" : ""}`}
                onClick={() => setActive(i)}
              >
                Figure {i + 1}
                <span className="font-semibold">
                  {String((it as Record<string, unknown>)?.value ?? "")}
                </span>
              </button>
              <label className="flex items-center gap-2">
                <span>Size</span>
                <input
                  type="range"
                  min={MIN_ORBIT_SIZE * 100}
                  max={MAX_ORBIT_SIZE * 100}
                  step={5}
                  value={Math.round(p.size * 100)}
                  aria-label={`Figure ${i + 1} size`}
                  onChange={(e) =>
                    onChange(patchOrbitPos(items, i, { size: Number(e.target.value) / 100 }))
                  }
                  className="w-28 accent-[#003FC7]"
                />
                <span className="tabular-nums">{Math.round(p.size * 100)}%</span>
              </label>
              <span className="tabular-nums text-black/40">
                x {Math.round(p.x)}% · y {Math.round(p.y)}%
              </span>
              <button type="button" className={btnCls} onClick={() => onChange(resetOrbitPos(items, i))}>
                Reset
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
