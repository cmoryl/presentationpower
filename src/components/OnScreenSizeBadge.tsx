import { useEffect, useRef, useState } from "react";

/**
 * Grid-mode on-screen size audit.
 *
 * Slide content is authored on a 1920×1080 stage and scaled to the card size
 * by ScaledSlide. On-screen text px = stage font-size × (cardWidth / 1920).
 * When that product drops below the readable threshold (~8px), we surface
 * an amber warning chip so reviewers can catch cards that visually collapse.
 */
const READABLE_ON_SCREEN_FLOOR_PX = 8;

export function OnScreenSizeBadge({
  targetRef,
  compact = true,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  compact?: boolean;
}) {
  const [state, setState] = useState<{
    minStagePx: number;
    minOnScreenPx: number;
    scale: number;
    warn: boolean;
    sampled: number;
  } | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const id = ++runId.current;

    const measure = () => {
      if (id !== runId.current) return;
      const cardW = el.getBoundingClientRect().width;
      if (!cardW) return;
      const scale = cardW / 1920;
      let minStagePx = Infinity;
      let sampled = 0;
      el.querySelectorAll<HTMLElement>("*").forEach((node) => {
        if (node instanceof SVGElement) return;
        const ownText = Array.from(node.childNodes).some(
          (n) => n.nodeType === 3 && (n.textContent ?? "").trim(),
        );
        if (!ownText) return;
        const cs = getComputedStyle(node);
        if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1)
          return;
        const px = parseFloat(cs.fontSize);
        if (!Number.isFinite(px) || px <= 0) return;
        sampled++;
        if (px < minStagePx) minStagePx = px;
      });
      if (!Number.isFinite(minStagePx)) return;
      const minOnScreenPx = minStagePx * scale;
      setState({
        minStagePx: Math.round(minStagePx),
        minOnScreenPx: Math.round(minOnScreenPx * 10) / 10,
        scale: Math.round(scale * 1000) / 1000,
        warn: minOnScreenPx < READABLE_ON_SCREEN_FLOOR_PX,
        sampled,
      });
    };

    // Poll after type-fix + WCAG passes have settled.
    const timers = [700, 1600, 2600].map((delay) => window.setTimeout(measure, delay));
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      ro.disconnect();
    };
  }, [targetRef]);

  if (!state || state.sampled === 0) return null;
  if (!state.warn) return null;

  return (
    <div
      className={`pointer-events-auto absolute ${compact ? "top-1.5 right-1.5" : "top-3 right-3"} z-10 flex items-center gap-1`}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-950 shadow ring-1 ring-amber-100 backdrop-blur"
        title={`Smallest text renders at ${state.minOnScreenPx}px on-screen (${state.minStagePx}px stage × ${state.scale}). Below ${READABLE_ON_SCREEN_FLOOR_PX}px is hard to read at grid size.`}
      >
        ⚠ {state.minOnScreenPx}px
      </span>
    </div>
  );
}
