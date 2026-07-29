import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const CHECKER =
  "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 16px 16px";

/**
 * Large zoomable preview with a draggable before/after split:
 * left half sits on a transparency checkerboard, right half on a flat plate.
 * If the seam is invisible the image has no alpha; if the plate shows through
 * only on one side, transparency survived the import.
 */
export function ImageAlphaInspector({
  open,
  onOpenChange,
  src,
  filename,
  caption,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  src?: string | null;
  filename: string;
  caption?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [split, setSplit] = useState(50);
  const [plate, setPlate] = useState<"light" | "dark">("dark");
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setSplit(50);
    }
  }, [open, src]);

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(100, Math.max(0, pct)));
  }, []);

  useEffect(() => {
    if (!open) return;
    const move = (e: PointerEvent) => {
      if (dragging.current) setFromClientX(e.clientX);
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [open, setFromClientX]);

  const plateStyle =
    plate === "dark"
      ? { background: "hsl(var(--foreground))" }
      : { background: "hsl(var(--background))" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="truncate">{filename}</DialogTitle>
          <DialogDescription>
            {caption ? `${caption} · ` : ""}Drag the divider: checkerboard on the left, flat plate
            on the right. Transparent pixels change with the backdrop.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={frameRef}
          className="relative h-[58vh] select-none overflow-hidden rounded-xl border border-border"
        >
          {/* Right side plate */}
          <div className="absolute inset-0" style={plateStyle} />
          {/* Left side checkerboard, clipped to the split */}
          <div
            className="absolute inset-0"
            style={{ background: CHECKER, clipPath: `inset(0 ${100 - split}% 0 0)` }}
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            {src ? (
              <img
                src={src}
                alt={filename}
                draggable={false}
                style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                className="max-h-full max-w-full object-contain transition-transform duration-100"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Preview unavailable</p>
            )}
          </div>

          {/* Divider handle */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Transparency comparison divider"
            aria-valuenow={Math.round(split)}
            tabIndex={0}
            onPointerDown={(e) => {
              dragging.current = true;
              setFromClientX(e.clientX);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setSplit((s) => Math.max(0, s - 4));
              if (e.key === "ArrowRight") setSplit((s) => Math.min(100, s + 4));
            }}
            className="absolute inset-y-0 z-10 w-4 -translate-x-1/2 cursor-col-resize focus:outline-none"
            style={{ left: `${split}%` }}
          >
            <div className="mx-auto h-full w-px bg-primary" />
            <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-background shadow" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
            >
              <Minus className="h-4 w-4" strokeWidth={1.75} />
            </Button>
            <Slider
              value={[zoom]}
              min={0.25}
              max={5}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="w-48"
              aria-label="Zoom level"
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)))}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            </Button>
            <span className="w-14 text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => {
              setZoom(1);
              setSplit(50);
            }}
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setPlate((p) => (p === "dark" ? "light" : "dark"))}
          >
            Plate: {plate === "dark" ? "Dark" : "Light"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
