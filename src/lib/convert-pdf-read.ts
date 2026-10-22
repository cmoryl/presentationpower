// -----------------------------------------------------------------------------
// Read a live Illustrator (.ai, PDF-compatible) or PDF file in the browser.
//
// Live .ai files are routinely 50–300 MB, far past what we can post to the
// server, so the heavy lifting happens here: we pull the live text, the
// embedded pictures (the largest becomes the hero) and the layer names, and
// only the text goes to the server for structuring. Browser-only — load with
// a dynamic import.
// -----------------------------------------------------------------------------

export type PdfLayer = { name: string; visible: boolean };
export type PdfPicture = { url: string; width: number; height: number; page: number };

export type PdfReadResult = {
  text: string;
  pages: number;
  pictures: PdfPicture[];
  layers: PdfLayer[];
  /** Page 1 rendered flat — a reference for recreating the layout. */
  preview?: string;
};

/** Live .ai / PDF files are read in the browser, so they can be this big. */
export const CONVERT_PDF_MAX_BYTES = 500 * 1024 * 1024;

const MAX_PAGES = 8;
const MAX_PICTURES = 8;
const MIN_PICTURE_PX = 200;

export async function readPdfLike(file: File): Promise<PdfReadResult> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;

  // Layers (Illustrator saves them as PDF optional-content groups).
  const layers: PdfLayer[] = [];
  try {
    const oc = await doc.getOptionalContentConfig();
    const walk = (items: unknown): void => {
      for (const x of (Array.isArray(items) ? items : []) as unknown[]) {
        if (typeof x === "string") {
          const g = oc.getGroup(x) as { name?: string; visible?: boolean } | null;
          if (g?.name) layers.push({ name: g.name, visible: g.visible !== false });
        } else if (x && typeof x === "object" && "order" in x) walk((x as { order: unknown }).order);
        else if (Array.isArray(x)) walk(x);
      }
    };
    walk(oc.getOrder());
  } catch {
    /* no layers */
  }

  const lines: string[] = [];
  const pictures: PdfPicture[] = [];
  let preview: string | undefined;
  const pageCount = Math.min(doc.numPages, MAX_PAGES);

  for (let p = 1; p <= pageCount; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let line = "";
    for (const item of tc.items as Array<{ str?: string; hasEOL?: boolean }>) {
      line += item.str ?? "";
      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trim());
        line = "";
      } else line += " ";
    }
    if (line.trim()) lines.push(line.trim());

    // Render the page — needed so pdf.js decodes the embedded images, and page
    // 1 doubles as the layout reference.
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1600 / Math.max(base.width, base.height));
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    const ops = await page.getOperatorList();
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    if (p === 1) preview = canvas.toDataURL("image/jpeg", 0.85);

    const imgOps = new Set([pdfjs.OPS.paintImageXObject]);
    for (let i = 0; i < ops.fnArray.length && pictures.length < MAX_PICTURES; i++) {
      if (!imgOps.has(ops.fnArray[i])) continue;
      const id = ops.argsArray[i]?.[0] as string | undefined;
      if (!id) continue;
      const img = await getImageObj(page, id);
      if (!img || img.width < MIN_PICTURE_PX || img.height < MIN_PICTURE_PX) continue;
      const url = imageToDataUrl(img);
      if (url && !pictures.some((x) => x.url === url)) pictures.push({ url, width: img.width, height: img.height, page: p });
    }
    page.cleanup();
  }
  await doc.destroy();

  pictures.sort((a, b) => b.width * b.height - a.width * a.height);
  return { text: lines.join("\n"), pages: doc.numPages, pictures, layers, preview };
}

type ImgObj = { width: number; height: number; data?: Uint8ClampedArray; bitmap?: ImageBitmap; kind?: number };

function getImageObj(page: { objs: { get: (id: string, cb: (o: unknown) => void) => void }; commonObjs: { get: (id: string, cb: (o: unknown) => void) => void } }, id: string): Promise<ImgObj | null> {
  const store = id.startsWith("g_") ? page.commonObjs : page.objs;
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 4000);
    try {
      store.get(id, (o) => {
        clearTimeout(t);
        resolve((o as ImgObj) ?? null);
      });
    } catch {
      clearTimeout(t);
      resolve(null);
    }
  });
}

function imageToDataUrl(img: ImgObj): string | null {
  const scale = Math.min(1, 2400 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0, c.width, c.height);
  } else if (img.data) {
    const src = document.createElement("canvas");
    src.width = img.width;
    src.height = img.height;
    const sctx = src.getContext("2d");
    if (!sctx) return null;
    const px = img.width * img.height;
    const rgba = new Uint8ClampedArray(px * 4);
    const d = img.data;
    const ch = d.length / px;
    for (let i = 0; i < px; i++) {
      if (ch >= 4) {
        rgba.set(d.subarray(i * 4, i * 4 + 4), i * 4);
      } else if (ch >= 3) {
        rgba[i * 4] = d[i * 3]; rgba[i * 4 + 1] = d[i * 3 + 1]; rgba[i * 4 + 2] = d[i * 3 + 2]; rgba[i * 4 + 3] = 255;
      } else {
        rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = d[i] ?? 0; rgba[i * 4 + 3] = 255;
      }
    }
    sctx.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
    ctx.drawImage(src, 0, 0, c.width, c.height);
  } else return null;
  return c.toDataURL("image/jpeg", 0.88);
}
