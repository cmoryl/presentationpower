// Certified .pptx layer preview.
//
// The old "Preview in PowerPoint" canvas only painted the background plan, so
// authors saw a blank gradient and assumed the export had lost their content.
// This component runs the REAL export capture (`rasterizeObjectPlate` — the same
// call pptx-export.ts makes for the default editable path) and repaints every
// emitted layer at 1:1 slide scale: the CSS-only decor plate, each native
// shape/picture/vector, and each native text run. What you see here is the
// object list PowerPoint receives.

import { useEffect, useMemo, useState } from "react";

import { STAGE_H, STAGE_W } from "@/lib/export-quality";
import type { DomShape } from "@/lib/export-dom-decompose";
import type { TextRun } from "@/lib/export-text-layer";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
import type { StylePack } from "@/lib/style-packs";

export interface CertifiedCapture {
  plate: string;
  shapes: DomShape[];
  runs: TextRun[];
}

/**
 * Signature of everything about a slide that changes the emitted object list.
 * The layers panel (hide / lock / export-scope / reorder) mutates
 * `canvasBlocks`, so those flags are folded in here: flipping a layer's eye
 * changes the signature and the certified preview re-captures immediately.
 */
export function certifiedCaptureSignature(slide: DeckSlide): string {
  const blocks = (slide.canvasBlocks ?? []) as ReadonlyArray<Record<string, unknown>>;
  const layers = blocks
    .map((b, i) =>
      [
        i,
        b.id ?? "",
        b.z ?? "",
        b.hidden ? "h" : "-",
        b.locked ? "l" : "-",
        b.exportExcluded ? "x" : "-",
        b.suppressed ? "s" : "-",
        b.groupId ?? "",
        Math.round(Number(b.x ?? 0)),
        Math.round(Number(b.y ?? 0)),
        Math.round(Number(b.w ?? 0)),
        Math.round(Number(b.h ?? 0)),
      ].join(":"),
    )
    .join("|");
  return `${slide.id}|${slide.variantId}|${slide.position}|${layers}|${JSON.stringify(slide.content ?? {})}`;
}

export function useCertifiedCapture({
  open,
  slide,
  variant,
  brand,
  mode,
  pack,
}: {
  open: boolean;
  slide: DeckSlide;
  variant: ModuleVariant | undefined;
  brand: BrandMode;
  mode: "light" | "dark";
  pack: StylePack | null;
}) {
  const [capture, setCapture] = useState<CertifiedCapture | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signature = certifiedCaptureSignature(slide);

  useEffect(() => {
    if (!open || !variant || typeof document === "undefined") return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    // Keep the previous capture on screen while the new one is measured: a
    // layer toggle should look like a live edit, not a blank re-load.
    setStale(true);
    // Coalesce rapid layer toggles / drags into a single capture pass.
    const timer = window.setTimeout(() => {
      (async () => {
        const { rasterizeObjectPlate } = await import("@/lib/slide-exact-raster");
        const res = await rasterizeObjectPlate({
          slide,
          variant,
          brand,
          mode,
          pack,
          pageNumber: slide.position + 1,
          quality: null,
        });
        if (cancelled) return;
        if (!res) {
          setError("Could not capture this slide's export layers.");
          return;
        }
        setCapture({ plate: res.plate, shapes: res.shapes, runs: res.runs });
      })()
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Capture failed");
        })
        .finally(() => {
          if (!cancelled) {
            setBusy(false);
            setStale(false);
          }
        });
    }, 90);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // `slide` is re-created on every store write; the signature is what
    // actually decides whether the export object list would differ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signature, variant, brand, mode, pack]);

  return { capture, busy, stale, error };
}

function gradientCss(g: NonNullable<DomShape["gradient"]>): string {
  const stops = g.stops
    .map((s) => `rgba(${hexToRgb(s.color.hex)},${s.color.alpha}) ${Math.round(s.pos * 100)}%`)
    .join(", ");
  return `linear-gradient(${g.angleDeg}deg, ${stops})`;
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Repaint the exact object list the exporter emits, scaled into the preview. */
export function PptxCertifiedCanvas({
  capture,
  width,
  showLayerOutlines = false,
}: {
  capture: CertifiedCapture | null;
  width: number;
  showLayerOutlines?: boolean;
}) {
  const s = width / STAGE_W;
  const height = STAGE_H * s;

  if (!capture) {
    return (
      <div
        className="flex items-center justify-center bg-white text-[11px] uppercase tracking-widest text-black/40"
        style={{ width, height }}
      >
        Capturing export layers…
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden" data-cert-canvas style={{ width, height }}>
      <img
        src={capture.plate}
        alt=""
        data-cert-layer="plate"
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: "fill" }}
      />

      {capture.shapes.map((sh, i) => {
        const common: React.CSSProperties = {
          position: "absolute",
          left: sh.x * s,
          top: sh.y * s,
          width: sh.w * s,
          height: sh.h * s,
          borderRadius:
            sh.kind === "ellipse" ? "50%" : sh.radiusPx ? `${sh.radiusPx * s}px` : undefined,
          transform: sh.rotationDeg ? `rotate(${sh.rotationDeg}deg)` : undefined,
          outline: showLayerOutlines ? "1px solid rgba(0,63,199,0.5)" : undefined,
        };
        if (sh.kind === "image" && sh.src) {
          return (
            <img
              key={`sh-${i}`}
              src={sh.src}
              alt=""
              data-cert-layer="image"
              data-cert-index={i}
              style={{ ...common, objectFit: sh.fit ?? "contain" }}
            />
          );
        }
        return (
          <div
            key={`sh-${i}`}
            data-cert-layer="shape"
            data-cert-index={i}
            data-cert-kind={sh.kind}
            style={{
              ...common,
              background: sh.gradient
                ? gradientCss(sh.gradient)
                : sh.fill
                  ? `rgba(${hexToRgb(sh.fill.hex)},${sh.fill.alpha})`
                  : undefined,
              border: sh.line
                ? `${Math.max(1, sh.line.widthPx * s)}px solid rgba(${hexToRgb(sh.line.hex)},${sh.line.alpha})`
                : undefined,
              boxShadow: sh.shadow
                ? `0 ${sh.shadow.offsetPx * s}px ${sh.shadow.blurPx * s}px rgba(${hexToRgb(sh.shadow.color.hex)},${sh.shadow.color.alpha})`
                : undefined,
            }}
          />
        );
      })}
      {capture.runs.map((r, i) => {
        const text = r.lines?.length ? r.lines.map((l) => l.text).join("\n") : r.text;
        return (
          <div
            key={`tx-${i}`}
            data-cert-layer="text"
            data-cert-index={i}
            style={{
              position: "absolute",
              left: r.x * s,
              top: r.y * s,
              width: r.w * s,
              height: r.h * s,
              display: "flex",
              flexDirection: "column",
              justifyContent: r.valign === "middle" ? "center" : "flex-start",
              color: `#${r.color}`,
              opacity: 1 - r.transparency / 100,
              fontFamily: r.fontFamily,
              fontSize: r.fontSizePx * s,
              fontWeight: r.bold ? 700 : 400,
              fontStyle: r.italic ? "italic" : "normal",
              textDecoration: r.underline ? "underline" : "none",
              lineHeight: r.lineHeightPx ? `${r.lineHeightPx * s}px` : 1.2,
              letterSpacing: r.letterSpacingPx ? `${r.letterSpacingPx * s}px` : undefined,
              textAlign: r.align === "justify" ? "left" : r.align,
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              outline: showLayerOutlines ? "1px solid rgba(236,56,138,0.55)" : undefined,
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}

/** Inventory of what the export will contain, for the validation column. */
export function useCertifiedInventory(capture: CertifiedCapture | null) {
  return useMemo(() => {
    if (!capture) return null;
    const pictures = capture.shapes.filter((s) => s.kind === "image").length;
    const boxes = capture.shapes.length - pictures;
    const words = capture.runs.reduce((n, r) => n + r.text.trim().split(/\s+/).filter(Boolean).length, 0);
    return { pictures, boxes, runs: capture.runs.length, words };
  }, [capture]);
}
