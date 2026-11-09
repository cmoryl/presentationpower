// Editable Illustrator packages for Bowl socials, rebuilt from each saved
// Canva design's PowerPoint export: one named group per Canva object, live
// text, the supplied vector Bowl shield swapped in for its picture, and the
// original Canva images embedded. Canva originals are never modified.
// Packages are snapshots — re-run the rebuild after Canva edits (manual).
const POINTERS = import.meta.glob<{ url: string }>('../assets/sjb-illustrator/*.asset.json', { eager: true, import: 'default' });

export const SJB_ILLUSTRATOR_SNAPSHOT_DATE = '2026-11-09';

const BY_ID: Record<string, string> = {};
for (const [path, pointer] of Object.entries(POINTERS)) {
  const m = path.match(/sjb-(.+)-illustrator\.zip\.asset\.json$/);
  if (m && pointer?.url) BY_ID[m[1]] = pointer.url;
}

/** Download URL of the editable Illustrator package for a Canva design, if one was built. */
export function sjbIllustratorMaster(designId: string): string | null {
  return BY_ID[designId] ?? null;
}

export function sjbIllustratorMasterIds(): string[] {
  return Object.keys(BY_ID);
}
