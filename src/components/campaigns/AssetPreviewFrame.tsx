// AssetPreviewFrame — measures its own grid cell and hands the renderers a
// display size that always fits. Without this, wide formats (e.g. 1200×628)
// render at a fixed short-edge size, overflow their column and paint over the
// neighbouring card in the review grid. Applies to every renderer equally.

import { useEffect, useRef, useState, type ReactNode } from "react";

export type AssetPreviewFrameProps = {
  /** Native asset dimensions. */
  width: number;
  height: number;
  /** Upper bound for the short edge when there is plenty of room. */
  maxShortEdge?: number;
  children: (displayShortEdge: number) => ReactNode;
};

export function AssetPreviewFrame({
  width,
  height,
  maxShortEdge = 260,
  children,
}: AssetPreviewFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const short = Math.min(width, height);
  // Fit the rendered width inside the measured cell; fall back to the cap
  // until the first measurement lands.
  const widthLimited = available > 0 ? (available * short) / width : maxShortEdge;
  const displayShortEdge = Math.max(120, Math.min(maxShortEdge, widthLimited));


  return (
    <div ref={ref} className="w-full min-w-0">
      {available > 0 ? children(displayShortEdge) : null}
    </div>
  );
}
