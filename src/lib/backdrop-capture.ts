// Shared rendering helpers for inherited PPTX backdrops.
//
// The master-background audit shows the backdrop layer each imported slide
// resolves to. These helpers turn that abstract value (gradient / solid /
// image) into (a) a CSS style for on-screen preview, (b) a human label, and
// (c) a rasterised PNG data URL so a backdrop can be downloaded or filed into
// a division's approved imagery library.

import type { ImportedBackdrop } from "./imported-backdrop";

export const backdropBasename = (p?: string) => (p ? (p.split("/").pop() ?? p) : "—");

export function backdropCss(b: ImportedBackdrop | null): React.CSSProperties {
  if (!b) return { background: "hsl(var(--muted))" };
  if (b.kind === "gradient" && b.color && b.colorB) {
    return { background: `linear-gradient(${b.angle ?? 135}deg, ${b.color}, ${b.colorB})` };
  }
  if (b.kind === "color" && b.color) return { background: b.color };
  if (b.url) {
    return {
      backgroundImage: `url(${b.url})`,
      backgroundSize: b.fit === "contain" ? "contain" : "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return { background: "hsl(var(--muted))" };
}

export function backdropLabel(b: ImportedBackdrop | null): string {
  if (!b) return "No inherited backdrop";
  if (b.kind === "gradient") return `Gradient ${b.color} → ${b.colorB}`;
  if (b.kind === "color") return `Solid ${b.color}`;
  return `Image · ${backdropBasename(b.path)}`;
}

export function backdropCssText(b: ImportedBackdrop | null): string {
  if (!b) return "";
  if (b.kind === "gradient" && b.color && b.colorB) {
    return `background: linear-gradient(${b.angle ?? 135}deg, ${b.color}, ${b.colorB});`;
  }
  if (b.kind === "color" && b.color) return `background: ${b.color};`;
  if (b.url) return `background: url("${b.url}") center / ${b.fit === "contain" ? "contain" : "cover"} no-repeat;`;
  return "";
}

/** Rasterise a backdrop to a PNG data URL at deck resolution. */
export async function backdropToPngDataUrl(
  b: ImportedBackdrop | null,
  width = 1920,
  height = 1080,
): Promise<string> {
  if (!b) throw new Error("No backdrop to capture.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");

  if (b.kind === "gradient" && b.color && b.colorB) {
    // CSS gradient angles run clockwise from "to top"; convert to canvas axis.
    const rad = (((b.angle ?? 135) - 90) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
    const g = ctx.createLinearGradient(
      cx - (Math.cos(rad) * len) / 2,
      cy - (Math.sin(rad) * len) / 2,
      cx + (Math.cos(rad) * len) / 2,
      cy + (Math.sin(rad) * len) / 2,
    );
    g.addColorStop(0, b.color);
    g.addColorStop(1, b.colorB);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL("image/png");
  }

  if (b.kind === "color" && b.color) {
    ctx.fillStyle = b.color;
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL("image/png");
  }

  if (b.url) {
    const res = await fetch(b.url, { mode: "cors" });
    if (!res.ok) throw new Error(`Could not load backdrop image (${res.status}).`);
    const bitmap = await createImageBitmap(await res.blob());
    const contain = b.fit === "contain";
    const scale = contain
      ? Math.min(width / bitmap.width, height / bitmap.height)
      : Math.max(width / bitmap.width, height / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
    return canvas.toDataURL("image/png");
  }

  throw new Error("This backdrop has no capturable layer.");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function backdropFilename(b: ImportedBackdrop | null, slideIndex: number): string {
  const base = b?.path ? backdropBasename(b.path).replace(/\.[a-z0-9]+$/i, "") : (b?.kind ?? "backdrop");
  return `backdrop-slide-${slideIndex + 1}-${base}`.replace(/[^\w.\-]+/g, "-").slice(0, 120) + ".png";
}
