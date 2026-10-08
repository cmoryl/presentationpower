// Sign set print checks and the one-zip download. Uses the same trim and
// safe-margin rules as the sign editor's live print checks, and the same
// .ai / outlined-press builders as the editor's own downloads.

import JSZip from "jszip";

import { kioskFaceH, kioskFaceW, kioskFontFaceCss, kioskFontFamily, kioskMarginX, layoutKiosk, rotatedBox, textLineBoxes, type KioskEdits, type LiveLayout, type PlacedText } from "@/lib/next-california-kiosk-live";
import { liveFrontPdf, pressFrontSvg } from "@/lib/next-california-kiosk-live-export";

export type SignCheck = { label: string; issue: string; level: "error" | "warn" };

let fontsReady: Promise<void> | null = null;
function loadFonts(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  fontsReady ??= (async () => {
    const st = document.createElement("style");
    st.textContent = kioskFontFaceCss();
    document.head.appendChild(st);
    await document.fonts.ready;
  })();
  return fontsReady;
}

/** Trim and safe-margin checks for one sign, with its saved edits. */
export async function signPrintChecks(L: LiveLayout, edits: KioskEdits): Promise<SignCheck[]> {
  await loadFonts();
  const W = kioskFaceW(L), H = kioskFaceH(L), M = kioskMarginX(L);
  const ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  const measure = (t: PlacedText) => (s: string) => {
    if (!ctx) return [...s].length * t.ksize * 0.55;
    ctx.font = `${t.ksize}px ${kioskFontFamily(t.font)}`;
    return ctx.measureText(s).width;
  };
  const out: SignCheck[] = [];
  for (const t of layoutKiosk(L, edits).flatMap((p) => p.texts)) {
    if (!t.lines.some((l) => l.trim())) continue;
    const bx = t.fixed ? [{ x: t.kx, w: t.kw, y: t.ky }] : textLineBoxes(t, measure(t));
    const b = rotatedBox({ x0: Math.min(...bx.map((q) => q.x)), x1: Math.max(...bx.map((q) => q.x + q.w)), y0: t.ky - t.ksize * 0.8, y1: bx[bx.length - 1]!.y + t.ksize * 0.2 }, t.rot, t.ax, t.ky);
    const label = `“${t.lines[0] ?? ""}”`;
    if (b.x0 < 0 || b.x1 > W || b.y0 < 0 || b.y1 > H) out.push({ label, issue: "Crosses the trim edge — words will be cut off", level: "error" });
    else if (b.x0 < M || b.x1 > W - M || b.y0 < M || b.y1 > H - M) out.push({ label, issue: "Outside the safe margin", level: "warn" });
  }
  return out;
}

export type ZipItem = { base: string; layout: LiveLayout; edits: KioskEdits };

/** One zip: per sign an .ai master and an outlined press file. Never includes a sign that failed a check. */
export async function signSetZip(eventName: string, items: ZipItem[], skipped: string[]): Promise<Blob> {
  const zip = new JSZip();
  for (const it of items) {
    zip.file(`${it.base}.ai`, await liveFrontPdf(it.layout, it.edits));
    zip.file(`${it.base}-press-outlined.svg`, await pressFrontSvg(it.layout, it.edits));
  }
  zip.file(
    "README.txt",
    `DRAFT — not published. ${eventName} sign set.\n` +
      `${items.length} sign${items.length === 1 ? "" : "s"} included, each at its template's trim size with 1/8 in bleed.\n` +
      `.ai carries live text; -press-outlined.svg has every word outlined.\n` +
      (skipped.length ? `\nNot included (not ready or failed a print check):\n${skipped.map((s) => `- ${s}`).join("\n")}\n` : "") +
      `\nCheck in Illustrator before print.\n`,
  );
  return zip.generateAsync({ type: "blob" });
}
