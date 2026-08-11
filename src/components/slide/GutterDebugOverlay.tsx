import { useEffect, useMemo, useRef, useState } from "react";
import {
  ASSET_SELECTOR,
  CONNECTOR_SELECTOR,
  TILE_SELECTOR,
  bootLayoutDebug,
  isLayoutDebug,
  subscribeLayoutDebug,
} from "@/lib/layout-debug";

export function useLayoutDebug(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    bootLayoutDebug();
    setOn(isLayoutDebug());
    return subscribeLayoutDebug(setOn);
  }, []);
  return on;
}

type Box = { left: number; top: number; width: number; height: number };
type Hit = Box & { label: string };

const rel = (r: DOMRect, base: DOMRect, scale: number): Box => ({
  left: (r.left - base.left) / scale,
  top: (r.top - base.top) / scale,
  width: r.width / scale,
  height: r.height / scale,
});

function overlap(a: DOMRect, b: DOMRect) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0.5 && h > 0.5 ? { w, h } : null;
}

/**
 * Gutter debug overlay. Renders inside the slide frame (absolute, inset-0,
 * pointer-events-none) and paints:
 *   - tile boxes (cyan outline)
 *   - the gutter band between horizontally adjacent tiles (green wash)
 *   - decorative connectors / rails (magenta)
 *   - RED boxes wherever a connector intersects a protected asset (numeral
 *     well, copy block, media) or spills outside a gutter band
 * plus a live violation counter badge.
 */
export function GutterDebugOverlay({ scope }: { scope: HTMLElement | null }) {
  const on = useLayoutDebug();
  const [tiles, setTiles] = useState<Box[]>([]);
  const [gutters, setGutters] = useState<Box[]>([]);
  const [connectors, setConnectors] = useState<Box[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!on || !scope) {
      setTiles([]);
      setGutters([]);
      setConnectors([]);
      setHits([]);
      return;
    }
    const measure = () => {
      const base = scope.getBoundingClientRect();
      if (base.width <= 0) return;
      // Slides render inside a CSS `scale()` wrapper — normalise back to the
      // frame's own coordinate space so overlay boxes land on the art.
      const scale = base.width / (scope.offsetWidth || base.width);

      const tileEls = Array.from(scope.querySelectorAll<HTMLElement>(TILE_SELECTOR));
      const tileRects = tileEls.map((el) => el.getBoundingClientRect());
      const connEls = Array.from(scope.querySelectorAll<HTMLElement>(CONNECTOR_SELECTOR));
      const connRects = connEls.map((el) => el.getBoundingClientRect());
      const assetEls = Array.from(scope.querySelectorAll<HTMLElement>(ASSET_SELECTOR));
      const assetRects = assetEls
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 2 && r.height > 2);

      // Gutter bands: horizontal space between tiles that share a row.
      const bands: DOMRect[] = [];
      const sorted = [...tileRects].sort((a, b) => a.top - b.top || a.left - b.left);
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];
          const sameRow = Math.abs(a.top - b.top) < Math.max(8, a.height * 0.35);
          if (!sameRow) continue;
          const left = Math.min(a.right, b.right);
          const right = Math.max(a.left, b.left);
          if (right - left <= 0.5) continue;
          // Only the immediate neighbour: skip if another tile sits between.
          const between = sorted.some(
            (t) => t !== a && t !== b && t.left >= left - 1 && t.right <= right + 1,
          );
          if (between) continue;
          const top = Math.max(a.top, b.top);
          const bottom = Math.min(a.bottom, b.bottom);
          bands.push(new DOMRect(left, top, right - left, Math.max(1, bottom - top)));
        }
      }

      const found: Hit[] = [];
      connRects.forEach((cr, i) => {
        // 1. Connector crossing a protected asset.
        for (const { el, r } of assetRects) {
          const ov = overlap(cr, r);
          if (!ov) continue;
          const label =
            el.dataset.iconWell !== undefined
              ? "rail × numeral/icon"
              : el.dataset.stepCopy !== undefined
                ? "rail × copy"
                : "rail × asset";
          found.push({
            ...rel(
              new DOMRect(
                Math.max(cr.left, r.left),
                Math.max(cr.top, r.top),
                ov.w,
                ov.h,
              ),
              base,
              scale,
            ),
            label,
          });
        }
        // 2. Connector escaping every gutter band (only meaningful when the
        //    slide actually declares tiles).
        if (bands.length > 0) {
          const inBand = bands.some(
            (band) => cr.left >= band.left - 1.5 && cr.right <= band.right + 1.5,
          );
          if (!inBand) {
            found.push({ ...rel(cr, base, scale), label: `rail ${i + 1} outside gutter` });
          }
        }
      });

      setTiles(tileRects.map((r) => rel(r, base, scale)));
      setGutters(bands.map((r) => rel(r, base, scale)));
      setConnectors(connRects.map((r) => rel(r, base, scale)));
      setHits(found);
    };

    const schedule = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(scope);
    const mo = new MutationObserver(schedule);
    mo.observe(scope, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style", "class", "src"],
    });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [on, scope]);

  const summary = useMemo(
    () => `${tiles.length} tiles · ${gutters.length} gutters · ${connectors.length} rails`,
    [tiles.length, gutters.length, connectors.length],
  );

  if (!on) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[60]">
      {gutters.map((b, i) => (
        <div
          key={`g${i}`}
          className="absolute"
          style={{
            left: b.left,
            top: b.top,
            width: b.width,
            height: b.height,
            background:
              "repeating-linear-gradient(45deg, rgba(166,250,135,0.30) 0 6px, rgba(166,250,135,0.10) 6px 12px)",
            outline: "1px solid rgba(166,250,135,0.75)",
          }}
        />
      ))}
      {tiles.map((b, i) => (
        <div
          key={`t${i}`}
          className="absolute"
          style={{
            left: b.left,
            top: b.top,
            width: b.width,
            height: b.height,
            outline: "1px dashed rgba(161,251,249,0.9)",
          }}
        />
      ))}
      {connectors.map((b, i) => (
        <div
          key={`c${i}`}
          className="absolute"
          style={{
            left: b.left,
            top: b.top - 3,
            width: b.width,
            height: Math.max(b.height, 6),
            background: "rgba(236,56,138,0.55)",
            outline: "1px solid rgba(236,56,138,0.95)",
          }}
        />
      ))}
      {hits.map((b, i) => (
        <div
          key={`h${i}`}
          className="absolute"
          style={{
            left: b.left - 2,
            top: b.top - 2,
            width: b.width + 4,
            height: Math.max(b.height + 4, 10),
            background: "rgba(229,61,46,0.35)",
            outline: "2px solid #E53D2E",
          }}
        >
          <span
            className="absolute whitespace-nowrap rounded px-1 text-[10px] font-semibold"
            style={{ top: -14, left: 0, background: "#E53D2E", color: "#fff" }}
          >
            {b.label}
          </span>
        </div>
      ))}
      <div
        className="absolute rounded px-2 py-1 text-[11px] font-semibold tabular-nums"
        style={{
          left: 12,
          bottom: 12,
          background: hits.length ? "#E53D2E" : "#03002C",
          color: "#fff",
        }}
      >
        GUTTER DEBUG · {summary} ·{" "}
        {hits.length ? `${hits.length} collision${hits.length > 1 ? "s" : ""}` : "clean"}
      </div>
    </div>
  );
}
