import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSessionUser } from "@/hooks/use-session-user";
import { supabase } from "@/integrations/supabase/client";
import { eventWebReferences } from "@/lib/event-web-references";
import { NEXT_HERO_PHOTOS } from "@/lib/next-hero-photos";

export interface EventCardPhotoProps { eventId: string; eventName: string }

export function EventCardPhoto({ eventId, eventName }: EventCardPhotoProps) {
  const user = useSessionUser();
  const next = eventId === "london" || eventId === "san-francisco" ? NEXT_HERO_PHOTOS[eventId] : null;
  const references = eventWebReferences(eventId);
  const reference = eventId === "hackathon-london" ? references[1] ?? references[0] : references[0];
  const path = next?.path ?? reference?.thumbPath;
  const photo = useQuery({
    queryKey: ["event-card-photo", path, user], enabled: !!user && !!path, retry: false, staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from("event-photos").createSignedUrl(path, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
  const [failed, setFailed] = useState<string | null>(null);
  const src = user ? photo.data : null;
  if (!src || failed === src) return null;
  return <div className="absolute inset-0 bg-muted" data-event-card-photo={eventId} data-export-ignore="true">
    <img src={src} alt={`${eventName} · ${reference?.title ?? "2026 event photograph"}`} className="h-full w-full object-cover object-center" onError={() => setFailed(src)} />
    <span className="absolute bottom-2 left-2 rounded-sm bg-background/95 px-2 py-1 text-[10px] font-medium text-foreground">{reference?.kind === "video-cover" ? "Recap cover · Private reference" : "Private event photograph"}</span>
  </div>;
}