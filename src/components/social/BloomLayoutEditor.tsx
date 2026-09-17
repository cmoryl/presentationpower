// The live layout handles for one Legal bloom ad at one size.
//
// It draws over the artwork at the same coordinate space (the board scales the
// whole plane), so a drag in the preview moves the real frame. Nothing here is
// part of the artwork: every element carries data-export-ignore and the handles
// live outside the node the download reads.

import { useCallback, useRef } from "react";
import { clampBox, type BloomAdLayout, type BloomBox } from "@/lib/social-legal-bloom-layout";

type Part = "picture" | "copy";

type Props = {
  layout: BloomAdLayout;
  /** Trim size in true pixels. */
  w: number;
  h: number;
  /** How much the plane is scaled on screen, so pointer deltas convert back. */
  scale: number;
  onChange: (next: BloomAdLayout) => void;
};

const CORNERS = [
  { id: "nw", x: 0, y: 0 },
  { id: "ne", x: 1, y: 0 },
  { id: "sw", x: 0, y: 1 },
  { id: "se", x: 1, y: 1 },
] as const;

export function BloomLayoutEditor({ layout, w, h, scale, onChange }: Props) {
  const start = useRef<{ box: BloomBox; px: number; py: number } | null>(null);

  const begin = useCallback(
    (part: Part, corner: (typeof CORNERS)[number]["id"] | "move") =>
      (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as Element).setPointerCapture?.(e.pointerId);
        start.current = { box: { ...layout[part] }, px: e.clientX, py: e.clientY };

        const move = (ev: PointerEvent) => {
          const s = start.current;
          if (!s) return;
          const dx = (ev.clientX - s.px) / scale / w;
          const dy = (ev.clientY - s.py) / scale / h;
          let box: BloomBox;
          if (corner === "move") {
            box = { ...s.box, x: s.box.x + dx, y: s.box.y + dy };
          } else {
            const west = corner === "nw" || corner === "sw";
            const north = corner === "nw" || corner === "ne";
            const nw = west ? s.box.w - dx : s.box.w + dx;
            const nh = north ? s.box.h - dy : s.box.h + dy;
            box = {
              w: nw,
              h: nh,
              x: west ? s.box.x + (s.box.w - Math.max(nw, 0.06)) : s.box.x,
              y: north ? s.box.y + (s.box.h - Math.max(nh, 0.06)) : s.box.y,
            };
          }
          onChange({ ...layout, [part]: clampBox(box) });
        };
        const end = () => {
          start.current = null;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", end);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
      },
    [layout, onChange, scale, w, h],
  );

  const handleSize = 14 / scale;

  return (
    <div
      data-export-ignore="true"
      style={{ position: "absolute", inset: 0, width: w, height: h, zIndex: 40 }}
    >
      {(["picture", "copy"] as Part[]).map((part) => {
        const box = layout[part];
        const tint = part === "picture" ? "#003FC7" : "#EC388A";
        return (
          <div
            key={part}
            data-export-ignore="true"
            onPointerDown={begin(part, "move")}
            style={{
              position: "absolute",
              left: box.x * w,
              top: box.y * h,
              width: box.w * w,
              height: box.h * h,
              outline: `${2 / scale}px dashed ${tint}`,
              outlineOffset: 0,
              background: `${tint}0F`,
              cursor: "move",
              touchAction: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: -22 / scale,
                fontSize: 12 / scale,
                fontFamily: "system-ui, sans-serif",
                color: "#fff",
                background: tint,
                padding: `${2 / scale}px ${6 / scale}px`,
                borderRadius: 4 / scale,
                whiteSpace: "nowrap",
              }}
            >
              {part === "picture" ? "Picture" : "Text"}
            </span>
            {CORNERS.map((c) => (
              <div
                key={c.id}
                onPointerDown={begin(part, c.id)}
                style={{
                  position: "absolute",
                  left: c.x * box.w * w - handleSize / 2,
                  top: c.y * box.h * h - handleSize / 2,
                  width: handleSize,
                  height: handleSize,
                  borderRadius: handleSize,
                  background: "#fff",
                  border: `${2 / scale}px solid ${tint}`,
                  cursor: c.id === "nw" || c.id === "se" ? "nwse-resize" : "nesw-resize",
                  touchAction: "none",
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
