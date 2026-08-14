import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Design-time guides: draws the slide safe area, every clipping boundary
 * (any overflow-hidden box inside the module) and flags boxes whose content
 * actually overflows, so spacing bugs are visible while authoring instead of
 * only after export.
 */

const STORAGE_KEY = "pp.editor.safeAreaGuides";
const EVENT = "pp:safe-area-guides";

/** Stage safe area, authored against the 1920×1080 stage. */
export const SAFE_AREA = { x: 96, y: 64 };

export function useSafeAreaGuides() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      setOn(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* private mode */
    }
    const sync = (e: Event) => setOn(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(EVENT, sync as EventListener);
    return () => window.removeEventListener(EVENT, sync as EventListener);
  }, []);

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: next }));
      return next;
    });
  }, []);

  return { on, toggle };
}

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
  clipped: boolean;
  overflowPx: number;
};

export function SafeAreaGuidesToggle({
  on,
  onToggle,
  tone = "light",
  className = "",
}: {
  on: boolean;
  onToggle: () => void;
  tone?: "light" | "dark";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition";
  const skin = on
    ? "border-[#EC388A] bg-[#EC388A] text-white"
    : tone === "dark"
      ? "border-white/25 text-white/80 hover:border-white/60 hover:text-white"
      : "border-black/15 text-black/65 hover:border-black/40 hover:text-black";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={on}
      title="Show safe-area and clipping bounds for this module"
      className={`${base} ${skin} ${className}`}
    >
      <span aria-hidden>⊞</span>
      {on ? "Guides on" : "Guides"}
    </button>
  );
}

export function SafeAreaGuides({
  enabled,
  children,
  className = "",
}: {
  enabled: boolean;
  children: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled) {
      setBoxes([]);
      return;
    }
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    const measure = () => {
      const hostRect = host.getBoundingClientRect();
      if (hostRect.width <= 0) return;
      setScale(hostRect.width / 1920);
      const stage = host.querySelector<HTMLElement>("[data-slide-stage]");
      if (!stage) return;

      const minArea = hostRect.width * hostRect.height * 0.012;
      const found: Box[] = [];
      const nodes = stage.querySelectorAll<HTMLElement>("*");
      for (const el of Array.from(nodes).slice(0, 900)) {
        const cs = getComputedStyle(el);
        const clips =
          cs.overflowX !== "visible" ||
          cs.overflowY !== "visible" ||
          cs.containerType === "size" ||
          cs.containerType === "inline-size";
        if (!clips) continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height < minArea) continue;
        const overflowPx = Math.max(
          el.scrollHeight - el.clientHeight,
          el.scrollWidth - el.clientWidth,
          0,
        );
        found.push({
          left: r.left - hostRect.left,
          top: r.top - hostRect.top,
          width: r.width,
          height: r.height,
          clipped: overflowPx > 1 && cs.overflowY !== "visible",
          overflowPx: Math.round(overflowPx),
        });
      }
      setBoxes(found);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(host);
    const mo = new MutationObserver(schedule);
    mo.observe(host, { subtree: true, childList: true, characterData: true, attributes: true });
    const t = window.setInterval(schedule, 1200);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.clearInterval(t);
    };
  }, [enabled, children]);

  const clippedCount = boxes.filter((b) => b.clipped).length;

  return (
    <div ref={hostRef} className={`relative w-full ${className}`}>
      {children}
      {enabled && (
        <div className="pointer-events-none absolute inset-0 z-40">
          {/* Slide safe area */}
          <div
            className="absolute border border-dashed border-[#00E0FF]"
            style={{
              left: SAFE_AREA.x * scale,
              top: SAFE_AREA.y * scale,
              right: SAFE_AREA.x * scale,
              bottom: SAFE_AREA.y * scale,
            }}
          />
          {boxes.map((b, i) => (
            <div
              key={i}
              className={`absolute ${
                b.clipped
                  ? "border-2 border-[#EC388A] bg-[#EC388A]/10"
                  : "border border-[#A1FBF9]/70"
              }`}
              style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
            >
              {b.clipped && (
                <span className="absolute -top-[1px] left-0 bg-[#EC388A] px-1 text-[9px] font-semibold leading-[13px] text-white">
                  clipped +{b.overflowPx}px
                </span>
              )}
            </div>
          ))}
          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white">
            {boxes.length} bounds · {clippedCount} clipped
          </span>
        </div>
      )}
    </div>
  );
}
