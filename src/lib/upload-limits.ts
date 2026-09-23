// Shared size ceiling for pictures and artwork chosen from a person's computer.
//
// Half the upload points checked the file size and half did not, so a photo
// straight off a phone or camera (40–60 MB is ordinary) simply hung: the browser
// sat encoding it, nothing said why, and nothing ever appeared. Every upload now
// refuses over-size files up front and says the limit out loud.

import { toast } from "sonner";

/** Logos, photos, artwork placed into a layout. */
export const UPLOAD_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

/** Vector artwork packs (AI/PDF/SVG) which are legitimately heavier. */
export const UPLOAD_ARTWORK_MAX_BYTES = 40 * 1024 * 1024;

function mb(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

/**
 * True when the file is small enough to use. When it is not, the person is told
 * the file name, its size and the limit — and nothing is uploaded.
 */
export function checkUploadSize(
  file: File,
  maxBytes: number = UPLOAD_IMAGE_MAX_BYTES,
): boolean {
  if (file.size === 0) {
    toast.error("That file is empty", {
      description: `"${file.name}" has no content in it, so there is nothing to place.`,
    });
    return false;
  }
  if (file.size > maxBytes) {
    toast.error("That file is too big to use", {
      description: `"${file.name}" is ${mb(file.size)}. The limit is ${mb(maxBytes)} — please save a smaller version and try again.`,
    });
    return false;
  }
  return true;
}
