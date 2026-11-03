/**
 * Released brand-kit PDFs: full-section exports built from the live kit, checked page by
 * page, then served unchanged from /downloads/brand-kits/. Re-release by exporting again,
 * re-checking, and updating the row (date = release day, never a future or guessed date).
 */
export interface KitRelease { file: string; version: string; released: string; pages: number }

export const KIT_RELEASES: Record<string, KitRelease> = {};

export function kitRelease(id?: string): KitRelease | undefined {
  return id ? KIT_RELEASES[id] : undefined;
}
