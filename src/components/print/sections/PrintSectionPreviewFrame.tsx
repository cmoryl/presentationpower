// Print section modules render with `cq()` units (cqw against PAGE_W = 816),
// so they MUST sit inside an inline-size container that is exactly one print
// page wide. Rendering them in a bare card made every cqw resolve against the
// viewport, which is why library previews came out oversized and clipped.
//
// This frame renders the section at true page width and scales the whole thing
// down to the available width with a transform, so typography, columns and
// gutters keep their real print proportions.
import { useEffect, useRef, useState } from "react";

import { PAGE_W } from "@/components/print/print-primitives";
import { PrintSectionRenderer } from "./PrintSectionRenderer";
import type { PrintSection } from "@/lib/print-assets.types";

export function PrintSectionPreviewFrame({
  section,
  mode = "light",
  accent = "#003FC7",
  /** Page-relative padding so the block sits inside the print margin. */
  padX = 56,
  maxScale = 1,
}: {
  section: PrintSection;
  mode?: "light" | "dark";
  accent?: string;
  padX?: number;
  maxScale?: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const w = outer.clientWidth;
      if (w > 0) setScale(Math.min(maxScale, w / PAGE_W));
      setHeight(inner.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [maxScale, section]);

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      <div style={{ height: height * scale }}>
        <div
          ref={innerRef}
          className="[container-type:inline-size]"
          style={{
            width: PAGE_W,
            paddingLeft: padX,
            paddingRight: padX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <PrintSectionRenderer section={section} mode={mode} accent={accent} />
        </div>
      </div>
    </div>
  );
}
