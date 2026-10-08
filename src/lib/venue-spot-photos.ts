// Reference photos of a submitted venue spot, shown beside its live file in the
// editor so designers can picture the artwork in place. Never printed.
// Key: `<spot id first 8>`. Source: Metro stairs (SF) photo set, 8 Oct 2026.
// Photos are labelled by the section names supplied; which photo shows which
// artboard is not stated in the files, so none is claimed here.
import s1 from "@/assets/venue-spots/metro-stairs-section-1.jpg.asset.json";
import s2 from "@/assets/venue-spots/metro-stairs-section-2.jpg.asset.json";
import s3 from "@/assets/venue-spots/metro-stairs-section-3.jpg.asset.json";
import s4 from "@/assets/venue-spots/metro-stairs-section-4.jpg.asset.json";
import liveFile from "@/assets/venue-spots/metro-stairs-stair-clings-2.ai.asset.json";

export type SpotPhoto = { url: string; label: string };

export const VENUE_SPOT_PHOTOS: Record<string, SpotPhoto[]> = {
  "76c01b5b": [
    { url: s1.url, label: "Section 1" },
    { url: s2.url, label: "Section 2" },
    { url: s3.url, label: "Section 3" },
    { url: s4.url, label: "Section 4" },
  ],
};

/** Latest supplied live file per spot (download only; step guides match it). */
export const VENUE_SPOT_LIVE_FILES: Record<string, { url: string; name: string }> = {
  "76c01b5b": { url: liveFile.url, name: "Stair_Clings-2.ai" },
};

/** Photo per artboard (1-based), from the designer's annotated layout (8 Oct 2026):
 *  AB1 = Section 1 (bottom 3 steps), AB2 = "1b" (upper flight in Section 1),
 *  AB3 = Section 2, AB4 = Section 3, AB5 = Section 4. Value = index into the spot list. */
export const VENUE_SPOT_ARTBOARD_PHOTO: Record<string, number[]> = {
  "76c01b5b": [0, 0, 1, 2, 3],
};

export function spotPhotosFor(spotIdOrLayoutId: string | null | undefined): SpotPhoto[] {
  if (!spotIdOrLayoutId) return [];
  const ab = spotIdOrLayoutId.match(/\.([0-9a-f]{8})-(\d+)of\d+/);
  if (ab) {
    const all = VENUE_SPOT_PHOTOS[ab[1]!] || [];
    const idx = VENUE_SPOT_ARTBOARD_PHOTO[ab[1]!]?.[Number(ab[2]) - 1];
    if (idx != null && all[idx]) {
      const ph = all[idx]!;
      return [{ ...ph, label: Number(ab[2]) === 2 ? `${ph.label} (1b — upper flight)` : ph.label }];
    }
    return all;
  }
  const m = spotIdOrLayoutId.match(/([0-9a-f]{8})(?:-|\b)/);
  return (m && VENUE_SPOT_PHOTOS[m[1]!]) || [];
}
