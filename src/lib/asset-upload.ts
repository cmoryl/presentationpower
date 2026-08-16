// -----------------------------------------------------------------------------
// Asset uploads for the Studio canvas
// -----------------------------------------------------------------------------
// One entry point for "bring your own artwork": photos (PNG / JPEG / WebP /
// GIF) and vectors (SVG). Every uploaded file becomes the same small record —
// a renderable `src`, its natural aspect and a label — so the canvas can either
// PLACE it as a new object or REPLACE the source of an object that is already
// positioned on the slide (a photo tile, an icon, a logo).
//
// Vectors are sanitised through svg-import (untrusted markup) and stay vector
// all the way into PPTX. Rasters are uploaded to the private `slide-media`
// bucket when the user is signed in, which keeps decks portable and avoids
// carrying multi-megabyte data URLs around in deck JSON; when storage is not
// available we fall back to an inline data URL so the editor still works.
// -----------------------------------------------------------------------------

import { uploadSlideMedia } from "./slide-media";
import { importSvgFile } from "./svg-import";

export type UploadedAsset = {
  id: string;
  /** Renderable source: signed storage URL, or a data URL fallback. */
  src: string;
  /** Natural width / height — lets the canvas size a placement correctly. */
  aspect: number;
  /** Alt text / label, derived from the filename. */
  alt: string;
  kind: "photo" | "vector";
  /** Storage path when the file was persisted, else undefined (inline only). */
  path?: string;
  /** True when the bytes live inline because storage was unavailable. */
  inline: boolean;
  bytes: number;
};

export const ASSET_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg";

/** 12 MB — comfortably above a print-res photo, below anything that would
 *  choke deck JSON or a PPTX package. */
const MAX_BYTES = 12 * 1024 * 1024;

const RASTER_RE = /^image\/(png|jpe?g|webp|gif)$/i;

const labelFrom = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim() || "Uploaded asset";

const newId = () => `ast-${Math.random().toString(36).slice(2, 9)}`;

/** Measure a raster's natural aspect without adding it to the document. */
function measure(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / Math.max(1, img.naturalHeight));
    img.onerror = () => resolve(1);
    img.src = src;
  });
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export type AssetUploadResult =
  | { ok: true; asset: UploadedAsset }
  | { ok: false; name: string; reason: string };

/**
 * Turn one picked file into a canvas-ready asset.
 *
 * Never throws: a bad file comes back as `{ ok: false }` with a sentence the
 * panel can show, so one unreadable file in a multi-select does not abort the
 * rest of the batch.
 */
export async function prepareAsset(file: File): Promise<AssetUploadResult> {
  const name = file.name || "asset";
  if (file.size > MAX_BYTES) {
    return { ok: false, name, reason: "Larger than 12 MB — export a smaller version." };
  }

  const isSvg = /svg/i.test(file.type) || /\.svg$/i.test(name);
  if (isSvg) {
    const art = await importSvgFile(file);
    if (!art) return { ok: false, name, reason: "Not a readable SVG — re-export as plain SVG." };
    return {
      ok: true,
      asset: {
        id: newId(),
        src: art.src,
        aspect: art.aspect,
        alt: art.alt,
        kind: "vector",
        inline: true,
        bytes: file.size,
      },
    };
  }

  if (!RASTER_RE.test(file.type)) {
    return { ok: false, name, reason: "Unsupported format — use PNG, JPEG, WebP, GIF or SVG." };
  }

  // Always read the bytes: we need them to measure, and they are the fallback
  // source if the upload cannot happen.
  const dataUrl = await readDataUrl(file);
  const aspect = await measure(dataUrl);

  let src = dataUrl;
  let path: string | undefined;
  let inline = true;
  try {
    const stored = await uploadSlideMedia(file, name);
    src = stored.signedUrl;
    path = stored.path;
    inline = false;
  } catch {
    // Not signed in, offline, or storage refused the write — inline is fine.
  }

  return {
    ok: true,
    asset: {
      id: newId(),
      src,
      aspect: aspect > 0 ? aspect : 1,
      alt: labelFrom(name),
      kind: "photo",
      path,
      inline,
      bytes: file.size,
    },
  };
}

/** Prepare a whole picked batch, preserving order. */
export async function prepareAssets(
  files: FileList | readonly File[] | null,
): Promise<AssetUploadResult[]> {
  const list = [...(files ?? [])];
  const out: AssetUploadResult[] = [];
  for (const file of list) out.push(await prepareAsset(file));
  return out;
}
