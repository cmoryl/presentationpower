// Public line under the Bowl calendar: when the pictures shown here last changed.
// Visible to everyone, signed in or not — dates only, never design names or problems.
// The date is fetched in the route loader, so it is already in the page's HTML.
import { describePictureStamp, type CanvaPictureStamp } from "@/lib/canva-sync-messages";

export function SjbPictureStamp({ stamp }: { stamp: CanvaPictureStamp | null }) {
  const line = describePictureStamp(stamp ?? { picturesUpdated: null, source: null, lastCheckedAt: null });
  if (!line) return null;
  return <p aria-live="polite" className="mt-3 text-xs text-muted-foreground">{line}</p>;
}
