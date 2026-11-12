// Builds sequence ZIP/PDF downloads in the browser from the exact pictures the
// site shows (newest Canva sync, or the bundled original), so packs never lag
// behind the live pictures.
export type SjbPackPage = { url: string; name: string };

function isPng(b: Uint8Array) { return b[0] === 0x89 && b[1] === 0x50; }

export async function buildSjbSequencePack(kind: "zip" | "pdf", pages: SjbPackPage[], width: number, height: number): Promise<Blob> {
  const bytes = await Promise.all(pages.map(async (p) => {
    const r = await fetch(p.url, { cache: "no-store" });
    if (!r.ok) throw new Error("A picture could not be downloaded.");
    return new Uint8Array(await r.arrayBuffer());
  }));
  if (kind === "zip") {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    bytes.forEach((d, i) => {
      const base = pages[i]!.name.replace(/\.(jpe?g|png)$/i, "");
      zip.file(`${base}.${isPng(d) ? "png" : "jpg"}`, d);
    });
    return zip.generateAsync({ type: "blob", compression: "STORE" });
  }
  const { jsPDF } = await import("jspdf");
  const orientation = width > height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: [width, height], compress: true });
  bytes.forEach((d, i) => {
    if (i) pdf.addPage([width, height], orientation);
    pdf.addImage(d, isPng(d) ? "PNG" : "JPEG", 0, 0, width, height, undefined, "NONE");
  });
  return pdf.output("blob");
}

export function saveSjbBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
