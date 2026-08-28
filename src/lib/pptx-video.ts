// -----------------------------------------------------------------------------
// NATIVE VIDEO IN PPTX
//
// A slide (or a section whose background runs an approved brand clip) exports as
// a real embedded PowerPoint media object — `p:pic` with `a:videoFile` plus the
// media part under `ppt/media/` — so the presenter can press play inside
// PowerPoint instead of following a link in the notes.
//
// The clip is embedded as bytes (never a path/URL reference): PowerPoint only
// plays LINKED media when the file travels next to the deck, so a hosted URL
// yields a dead play button. Embedding keeps a single portable .pptx.
//
// Guard rails:
//   • MP4/H.264 only — the format every PowerPoint build (Win, Mac, Web) plays.
//   • Hard byte cap: an oversized clip is skipped and the slide keeps its poster
//     still, because PowerPoint refuses to open very large packages reliably.
//   • A poster frame is always passed as the media `cover`, so the slide looks
//     right in thumbnails, print, and PDF conversion where nothing plays.
// -----------------------------------------------------------------------------

/** Above this the package becomes unreliable in PowerPoint; keep the still. */
export const MAX_PPTX_VIDEO_BYTES = 60 * 1024 * 1024;

/** Container types PowerPoint plays natively on Windows AND macOS. */
const NATIVE_VIDEO_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
};

export type PptxVideoAsset = {
  /** base64 payload in pptxgenjs `data` form: "video/mp4;base64,...." */
  data: string;
  /** File extension without the dot — drives the content-type override. */
  extn: string;
  /** Poster still as an image data URL, used as the media cover. */
  cover: string | null;
  bytes: number;
  url: string;
};

function extnFromUrl(url: string): string | null {
  const m = /\.(mp4|mov|m4v)(?:[?#]|$)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Fetch a clip and turn it into an embeddable pptxgenjs media payload.
 * Returns null (and logs why) whenever the clip cannot be embedded safely —
 * callers then fall back to the poster still, never to a broken play button.
 */
export async function fetchPptxVideo(
  url: string,
  opts?: { cover?: string | null; label?: string; maxBytes?: number },
): Promise<PptxVideoAsset | null> {
  const label = opts?.label ?? "slide video";
  const maxBytes = opts?.maxBytes ?? MAX_PPTX_VIDEO_BYTES;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) {
      console.warn(`[pptx-video] ${label} fetch ${res.status}: ${url}`);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) {
      console.warn(`[pptx-video] ${label} came back empty: ${url}`);
      return null;
    }
    if (buf.byteLength > maxBytes) {
      console.warn(
        `[pptx-video] ${label} is ${(buf.byteLength / 1048576).toFixed(1)}MB — over the ` +
          `${(maxBytes / 1048576).toFixed(0)}MB embed cap; exporting the poster still instead.`,
      );
      return null;
    }
    const headerType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const extn = NATIVE_VIDEO_MIME[headerType] ?? extnFromUrl(url);
    if (!extn) {
      console.warn(`[pptx-video] ${label} is not a PowerPoint-native container (${headerType || "unknown"}): ${url}`);
      return null;
    }
    const mime = extn === "mov" ? "video/quicktime" : extn === "m4v" ? "video/x-m4v" : "video/mp4";
    return {
      data: `${mime};base64,${bytesToBase64(buf)}`,
      extn,
      cover: opts?.cover ?? null,
      bytes: buf.byteLength,
      url,
    };
  } catch (err) {
    console.warn(`[pptx-video] ${label} could not be embedded:`, err);
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked so a multi-MB clip does not blow the argument limit of String.fromCharCode.
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof btoa === "function") return btoa(out);
  // Node/server export path.
  return Buffer.from(bytes).toString("base64");
}

type MediaSlide = {
  addMedia: (opts: Record<string, unknown>) => unknown;
};

/**
 * Place an embedded clip edge-to-edge behind the slide's copy. Called right
 * after the background/plate so PowerPoint's z-order keeps every text box,
 * chart and shape above the movie and everything stays individually editable.
 */
export function placeSlideVideo(
  slide: MediaSlide,
  video: PptxVideoAsset,
  geom: { x: number; y: number; w: number; h: number },
  objectName = "TP Motion ground",
): void {
  slide.addMedia({
    type: "video",
    data: video.data,
    extn: video.extn,
    ...(video.cover ? { cover: video.cover } : {}),
    x: geom.x,
    y: geom.y,
    w: geom.w,
    h: geom.h,
    objectName,
  });
}
