/**
 * OPC-safe repackaging for .pptx blobs.
 *
 * PowerPoint (unlike LibreOffice or schema validators) enforces two packaging
 * rules that JSZip's default `generateAsync` violates when we re-emit a zip we
 * loaded and patched:
 *
 *  1. `[Content_Types].xml` MUST be the first entry in the archive.
 *  2. Directory entries (`ppt/media/`) are not parts and confuse the OPC reader.
 *
 * Both produce the generic "PowerPoint found a problem with content" repair
 * prompt on import, even though the XML itself is perfectly valid. Every code
 * path that rewrites a generated .pptx should finish through `repackPptx`.
 */
import type JSZip from "jszip";

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Rebuild `zip` into a PowerPoint-safe archive blob. */
export async function repackPptx(zip: JSZip): Promise<Blob> {
  const JSZipCtor = (await import("jszip")).default;
  const out = new JSZipCtor();

  const files = Object.values(zip.files).filter((f) => !f.dir);
  const contentTypes = files.find((f) => f.name === "[Content_Types].xml");

  // [Content_Types].xml first, then everything else in stable order.
  if (contentTypes) {
    out.file("[Content_Types].xml", await contentTypes.async("uint8array"), {
      createFolders: false,
    });
  }
  for (const f of files) {
    if (f.name === "[Content_Types].xml") continue;
    out.file(f.name, await f.async("uint8array"), { createFolders: false });
  }

  return await out.generateAsync({
    type: "blob",
    mimeType: PPTX_MIME,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/** Load a blob, run `mutate`, and emit an OPC-safe .pptx blob. */
export async function repackPptxBlob(
  blob: Blob,
  mutate?: (zip: JSZip) => void | Promise<void>,
): Promise<Blob> {
  const JSZipCtor = (await import("jszip")).default;
  const zip = await JSZipCtor.loadAsync(await blob.arrayBuffer());
  await mutate?.(zip);
  return await repackPptx(zip);
}
