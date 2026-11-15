import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useSessionUser } from "@/hooks/use-session-user";
import { supabase } from "@/integrations/supabase/client";
import { listNextGuidePhotos } from "@/lib/next-guide-photos.functions";
import { NEXT_HERO_PHOTOS } from "@/lib/next-hero-photos";

export interface NextHeroPhotoProps { location: keyof typeof NEXT_HERO_PHOTOS }

export function NextHeroPhoto({ location }: NextHeroPhotoProps) {
  const user = useSessionUser();
  const approvedFn = useServerFn(listNextGuidePhotos);
  const approved = useQuery({ queryKey: ["next-guide-photos"], queryFn: () => approvedFn(), staleTime: 3600000, retry: false });
  const reference = NEXT_HERO_PHOTOS[location];
  const privatePhoto = useQuery({
    queryKey: ["next-hero-private-photo", location, user], enabled: !!user, retry: false, staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("event-photos").createSignedUrl(reference.path, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
  const publicPhoto = approved.data?.find(photo => photo.event === reference.event && photo.width && photo.height && photo.width > photo.height);
  const src = publicPhoto?.fullUrl || (user ? privatePhoto.data : null);
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return null;
  return <div className="next-hero-photo absolute inset-0" data-next-hero-photo={location} data-export-ignore="true">
    <img src={src} alt="" aria-hidden className="h-full w-full object-cover" onError={() => setFailed(src)} />
    <div className="next-hero-photo-shade absolute inset-0" />
    {!publicPhoto && <span className="next-hero-photo-credit absolute bottom-3 right-4 text-[11px]">{reference.event} · Private event photograph</span>}
  </div>;
}