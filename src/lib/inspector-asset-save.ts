// Turn Asset Inspector entries into PNGs that can be filed into a division's
// imagery library.
//
// Images (and any media asset we hold a URL for) are saved as their real
// bitmap. Charts, tables, diagrams, media references and shape layers have no
// binary payload in the imported record — for those we rasterise a brand-styled
// reference card built ONLY from the values PPTX extraction actually captured
// (titles, series labels, header cells, node text, frames). Nothing is invented.

const BRAND_INK = "#03002C";
const BRAND_BLUE = "#003FC7";
const BRAND_AQUA = "#A1FBF9";

export type SpecCard = {
  kind: string;
  title: string;
  meta?: string[];
  lines?: string[];
};

const FONT = '600 1px "Geist", system-ui, -apple-system, sans-serif';

/** Re-encode an image URL as a PNG data URL (keeps alpha, normalises format). */
export async function imageUrlToPng(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Could not load image (${res.status}).`);
  const blob = await res.blob();
  if (blob.type === "image/png") return blobToDataUrl(blob);
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");
  ctx.drawImage(bitmap, 0, 0);
  return canvas.toDataURL("image/png");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not read image data."));
    fr.readAsDataURL(blob);
  });
}

/** Rasterise a brand-styled reference card for a non-bitmap asset. */
export function specCardToPng(card: SpecCard, width = 1600, height = 900): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, BRAND_INK);
  g.addColorStop(1, "#0A1F6B");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Accent glow, matching the aurora treatment used on screen.
  const orb = ctx.createRadialGradient(width * 0.86, height * 0.9, 0, width * 0.86, height * 0.9, height * 0.7);
  orb.addColorStop(0, "rgba(161,251,249,0.42)");
  orb.addColorStop(1, "rgba(161,251,249,0)");
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, width, height);

  const pad = 96;
  const setFont = (size: number, weight = 600) => {
    ctx.font = FONT.replace("600 1px", `${weight} ${size}px`);
  };

  setFont(28, 600);
  ctx.fillStyle = BRAND_AQUA;
  ctx.fillText(card.kind.toUpperCase(), pad, pad + 24);

  setFont(72, 700);
  ctx.fillStyle = "#FFFFFF";
  let y = pad + 130;
  for (const line of wrap(ctx, card.title || "Untitled", width - pad * 2).slice(0, 2)) {
    ctx.fillText(line, pad, y);
    y += 84;
  }

  if (card.meta?.length) {
    setFont(30, 500);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(card.meta.join("   ·   ").slice(0, 120), pad, y + 12);
    y += 74;
  }

  if (card.lines?.length) {
    setFont(34, 500);
    for (const line of card.lines.slice(0, 8)) {
      ctx.fillStyle = BRAND_AQUA;
      ctx.fillRect(pad, y + 6, 10, 10);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(wrap(ctx, line, width - pad * 2 - 34)[0] ?? line, pad + 34, y + 22);
      y += 58;
      if (y > height - pad) break;
    }
  }

  setFont(24, 500);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Imported deck reference · TransPerfect", pad, height - pad + 30);
  ctx.fillStyle = BRAND_BLUE;
  ctx.fillRect(0, height - 14, width, 14);

  return canvas.toDataURL("image/png");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export function safeFilename(parts: Array<string | number | undefined>, ext = "png"): string {
  return (
    parts
      .filter(Boolean)
      .join("-")
      .replace(/[^\w.\-]+/g, "-")
      .slice(0, 120) + `.${ext}`
  );
}
