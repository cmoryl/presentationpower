// Drag handle overlay for the print asset canvas. Lets the user pull the
// hero band up/down to resize it — snaps to `heroMedia.heightPct` (or the
// non-media hero fallback field `heroHeightPct` if the layout supports it).
//
// The grip is content-aware: it clamps against the effective module budget
// so users can't drag the hero taller than the page has room for. Passing
// `usedModuleUnits` + `kind` unlocks the ceiling computation via
// maxHeroHeightPct(); when omitted, it falls back to the hard [MIN, MAX]
// clamp only.
import { useEffect, useMemo, useRef, useState } from "react";
import type { PrintHeroMedia } from "@/lib/print-assets.types";
import {
  HERO_HEIGHT_HARD_MAX,
  HERO_HEIGHT_HARD_MIN,
  maxHeroHeightPct,
  type PrintTemplateKind,
} from "@/lib/print-capacity";

type Props = {
  // Ref to the canvas element so we can measure vertical space in px.
  canvasRef: React.RefObject<HTMLDivElement | null>;
  media: PrintHeroMedia | undefined;
  onChange: (next: PrintHeroMedia) => void;
  // Only shown when heroMedia exists; hero band without a photo uses layout
  // padding, not heightPct. Show a subtle hint in that case.
  disabledHint?: string;
  // Hero-aware capacity clamp inputs. When provided, the grip refuses to
  // cross the ceiling where modules would overflow the page.
  kind?: PrintTemplateKind;
  usedModuleUnits?: number;
  hasTitle?: boolean;
  hasSummary?: boolean;
};

const MIN_PCT = HERO_HEIGHT_HARD_MIN;
const MAX_PCT = HERO_HEIGHT_HARD_MAX;

export function HeroResizeHandle({
  canvasRef,
  media,
  onChange,
  disabledHint,
  kind,
  usedModuleUnits,
  hasTitle,
  hasSummary,
}: Props) {
  const heightPct = media?.heightPct ?? 46;
  // Enabled whenever a hero image is set — the grip drives `heightPct`, which
  // every aspect variant respects.
  const enabled = !!media?.imageUrl;
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const startRef = useRef<{ y: number; startPct: number; height: number } | null>(null);

  // Content-aware ceiling — the tallest heightPct the modules can afford.
  // When kind/used aren't supplied, the ceiling is just MAX_PCT.
  const ceiling = useMemo(() => {
    if (!kind || typeof usedModuleUnits !== "number") return MAX_PCT;
    return maxHeroHeightPct(kind, usedModuleUnits, media, {
      hasTitle: !!hasTitle,
      hasSummary: !!hasSummary,
    });
  }, [kind, usedModuleUnits, media, hasTitle, hasSummary]);
  const capped = heightPct >= ceiling;
  const nearCap = heightPct >= ceiling - 3 && !capped;

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const s = startRef.current;
      if (!s) return;
      const deltaPct = ((e.clientY - s.y) / s.height) * 100;
      const next = Math.max(MIN_PCT, Math.min(ceiling, s.startPct + deltaPct));
      onChange({ ...(media ?? {} as PrintHeroMedia), heightPct: Math.round(next) });
    };
    const onUp = () => {
      setDragging(false);
      startRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, media, onChange, ceiling]);

  const handleDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    startRef.current = { y: e.clientY, startPct: heightPct, height: rect.height };
    setDragging(true);
  };

  const nudge = (delta: number) => {
    const next = Math.max(MIN_PCT, Math.min(ceiling, heightPct + delta));
    onChange({ ...(media ?? {} as PrintHeroMedia), heightPct: next });
  };

  const rimColor = capped
    ? "#E53D2E"
    : nearCap
      ? "#FFB020"
      : dragging || hover
        ? "#003FC7"
        : "rgba(0,63,199,0.35)";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30"
      style={{ top: `${heightPct}%`, transform: "translateY(-50%)" }}
      aria-hidden={!enabled}
    >
      {/* Guide line — shows where the hero band ends */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "50%",
          height: 1,
          background: enabled ? (dragging || hover ? "#003FC7" : "rgba(0,63,199,0.35)") : "transparent",
          transition: "background 120ms ease",
        }}
      />
      {/* Grip pill — centered, draggable */}
      <div
        role="slider"
        aria-label="Hero height"
        aria-valuemin={MIN_PCT}
        aria-valuemax={MAX_PCT}
        aria-valuenow={Math.round(heightPct)}
        tabIndex={enabled ? 0 : -1}
        onPointerDown={handleDown}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onKeyDown={(e) => {
          if (!enabled) return;
          if (e.key === "ArrowUp") { e.preventDefault(); nudge(-1); }
          if (e.key === "ArrowDown") { e.preventDefault(); nudge(1); }
          if (e.key === "PageUp") { e.preventDefault(); nudge(-5); }
          if (e.key === "PageDown") { e.preventDefault(); nudge(5); }
        }}
        className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border shadow-sm transition ${
          enabled ? "cursor-ns-resize hover:shadow-md" : "cursor-not-allowed"
        }`}
        style={{
          top: "50%",
          transform: "translate(-50%, -50%)",
          padding: "6px 14px",
          background: enabled ? "#FFFFFF" : "rgba(255,255,255,0.6)",
          borderColor: dragging || hover ? "#003FC7" : "rgba(0,0,0,0.15)",
          opacity: enabled ? 1 : 0.55,
          userSelect: "none",
          touchAction: "none",
        }}
        title={enabled ? "Drag to resize the hero band" : (disabledHint ?? "Add hero media to resize the band")}
      >
        <GripDots />
        <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: "#03002C", letterSpacing: "0.04em" }}>
          Hero · {Math.round(heightPct)}%
        </span>
      </div>
    </div>
  );
}

function GripDots() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden>
      <circle cx="3" cy="3" r="1.2" fill="#003FC7" />
      <circle cx="7" cy="3" r="1.2" fill="#003FC7" />
      <circle cx="11" cy="3" r="1.2" fill="#003FC7" />
      <circle cx="3" cy="7" r="1.2" fill="#003FC7" />
      <circle cx="7" cy="7" r="1.2" fill="#003FC7" />
      <circle cx="11" cy="7" r="1.2" fill="#003FC7" />
    </svg>
  );
}
