// Public line under the Bowl calendar: when the pictures shown here last changed.
// Visible to everyone, signed in or not — dates only, never design names or problems.
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCanvaSyncStamp } from "@/lib/canva-sync.functions";
import { describePictureStamp, type CanvaPictureStamp } from "@/lib/canva-sync-messages";

export function SjbPictureStamp() {
  const stamp = useServerFn(getCanvaSyncStamp);
  const { data, error } = useQuery({
    queryKey: ["canva-picture-stamp"],
    queryFn: () => stamp(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  if (error) return <p className="mt-3 text-xs text-muted-foreground">Couldn't load the picture update date.</p>;
  const line = describePictureStamp(data ?? ({ picturesUpdated: null, source: null, lastCheckedAt: null } satisfies CanvaPictureStamp));
  return <p data-debug>{JSON.stringify({ d: data ?? null, e: error ? String(error.message) : null, line })}</p>;
}
