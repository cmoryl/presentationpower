// The live layout handles for one Legal bloom ad at one size.
//
// It draws over the artwork at the same coordinate space (the board scales the
// whole plane), so a drag in the preview moves the real frame. Nothing here is
// part of the artwork: every element carries data-export-ignore and the handles
// live outside the node the download reads.

import { useCallback, useEffect, useRef } from "react";
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
  /**
   * In crop mode a drag inside the picture moves the photograph within its
   * frame and the wheel brings it closer, instead of moving the frame itself.
   */
  crop?: boolean;
};

const CORNERS = [
  { id: "nw", x: 0, y: 0 },
  { id: "ne", x: 1, y: 0 },
  { id: "sw", x: 0, y: 1 },
  { id: "se", x: 1, y: 1 },
] as const;

export function BloomLayoutEditor({ layout, w, h, scale, onChange, crop = false }: Props) {
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

  // ---- crop mode: the photograph moves inside the frame
  const cropRef = useRef<HTMLDivElement>(null);
  const cropLive = useRef(layout);
  cropLive.current = layout;

  const zoomOf = (l: BloomAdLayout) => Math.min(4, Math.max(1, l.photoZoom ?? 1));

  const beginCrop = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const from = { ...cropLive.current };
    const box = from.picture;
    const px = e.clientX;
    const py = e.clientY;
    const move = (ev: PointerEvent) => {
      const z = zoomOf(from);
      // dragging right pulls the photograph right, so the held point moves left
      const dx = (ev.clientX - px) / scale / (box.w * w) / z;
      const dy = (ev.clientY - py) / scale / (box.h * h) / z;
      onChange({
        ...cropLive.current,
        photoX: clamp01((from.photoX ?? 0.5) - dx),
        photoY: clamp01((from.photoY ?? 0.5) - dy),
      });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  // the wheel has to be a native, non-passive listener or the page scrolls
  useEffect(() => {
    const el = cropRef.current;
    if (!el || !crop) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const l = cropLive.current;
      const next = Math.min(4, Math.max(1, zoomOf(l) * Math.exp(-dy * 0.0015)));
      onChange({ ...l, photoZoom: next });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [crop, onChange]);

  if (crop) {
    const box = layout.picture;
    return (
      <div
        data-export-ignore="true"
        style={{ position: "absolute", inset: 0, width: w, height: h, zIndex: 40 }}
      >
        <div
          ref={cropRef}
          data-export-ignore="true"
          onPointerDown={beginCrop}
          style={{
            position: "absolute",
            left: box.x * w,
            top: box.y * h,
            width: box.w * w,
            height: box.h * h,
            outline: `${2 / scale}px dashed #A6FA87`,
            background: "#A6FA8712",
            cursor: "grab",
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
              color: "#03002C",
              background: "#A6FA87",
              padding: `${2 / scale}px ${6 / scale}px`,
              borderRadius: 4 / scale,
              whiteSpace: "nowrap",
            }}
          >
            Drag the picture, scroll to come closer — {Math.round(zoomOf(layout) * 100)}%
          </span>
        </div>
      </div>
    );
  }

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

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
