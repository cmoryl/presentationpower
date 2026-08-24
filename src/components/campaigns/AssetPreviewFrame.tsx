// AssetPreviewFrame — measures its own box (width *and* height) and hands the
// renderers a display size that always fits inside it, centred. Without the
// height measurement, tall formats (1080×1920 stories) blew the grid row open
// and painted over neighbouring cards; wide formats (1200×628) overflowed the
// column. Every renderer is treated the same way.

import { useEffect, useRef, useState, type ReactNode } from "react";

export type AssetPreviewFrameProps = {
  /** Native asset dimensions. */
  width: number;
  height: number;
  /** Upper bound for the short edge when there is plenty of room. */
  maxShortEdge?: number;
  /** Optional hard cap on the rendered height (used when the box is unbounded). */
  maxHeight?: number;
  children: (displayShortEdge: number) => ReactNode;
};

export function AssetPreviewFrame({
  width,
  height,
  maxShortEdge = 260,
  maxHeight,
  children,
}: AssetPreviewFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const short = Math.min(width, height);
  const widthLimited = box.w > 0 ? (box.w * short) / width : maxShortEdge;
  const boxHeight = box.h > 0 ? box.h : maxHeight;
  const heightLimited = boxHeight ? (boxHeight * short) / height : Number.POSITIVE_INFINITY;
  const displayShortEdge = Math.max(80, Math.min(maxShortEdge, widthLimited, heightLimited));

  return (
    <div
      ref={ref}
      className="flex h-full w-full min-w-0 items-center justify-center overflow-hidden"
    >
      {box.w > 0 ? children(displayShortEdge) : null}
    </div>
  );
}
