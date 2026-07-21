// Session-level context that keeps signed URLs for slide videos + posters
// fresh. Signed URLs from the private `slide-videos` / `slide-media` buckets
// have a 30-day TTL, so we also store the underlying storage path in slide
// content (`videoPath`, `videoPosterPath`) and re-sign on load. The provider
// walks a deck's slides, fires one refresh per unique path, and exposes a
// Map from path → fresh signed URL. MediaTile prefers the refreshed URL
// when available, and falls back to the stored `videoUrl` / `videoPosterUrl`
// (which is also the correct behaviour for pasted external URLs that have
// no path).
//
// Share view: signed-URL refresh needs auth, which anonymous share viewers
// don't have. The `getSharedDeck` server function re-signs paths server-side
// and injects fresh URLs into the payload, so the share view doesn't need to
// mount this provider.

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { refreshSlideVideoUrl } from "@/lib/slide-videos";
import { refreshSlideMediaUrl } from "@/lib/slide-media";
import type { DeckSlide } from "@/lib/deck-store";

type UrlMap = Map<string, string>;

type Ctx = {
  videoUrls: UrlMap;
  posterUrls: UrlMap;
};

const EMPTY: Ctx = { videoUrls: new Map(), posterUrls: new Map() };

const SlideMediaRefreshContext = createContext<Ctx>(EMPTY);

/** When true, MediaTile must NOT autoplay video (thumbnails / overview
 *  grids). Fixes a wall-of-autoplaying-videos hazard when the surrounding
 *  route has `present-mode` / `share-mode` set on body. */
export const SlideThumbnailContext = createContext<boolean>(false);

/** Optional callback that lets MediaTile turn its ▶ badge into a clickable
 *  preview trigger — only wired on the active editor canvas so thumbnails
 *  stay decorative. */
export const SlideVideoPreviewContext = createContext<null | ((videoUrl: string) => void)>(null);

export function useResolvedVideoUrl(path?: string, fallback?: string): string | undefined {
  const ctx = useContext(SlideMediaRefreshContext);
  if (path && ctx.videoUrls.has(path)) return ctx.videoUrls.get(path);
  return fallback;
}

export function useResolvedPosterUrl(path?: string, fallback?: string): string | undefined {
  const ctx = useContext(SlideMediaRefreshContext);
  if (path && ctx.posterUrls.has(path)) return ctx.posterUrls.get(path);
  return fallback;
}

function collectPaths(slides: ReadonlyArray<Pick<DeckSlide, "content">>): { videos: string[]; posters: string[] } {
  const videos = new Set<string>();
  const posters = new Set<string>();
  for (const sl of slides) {
    const c = sl.content as Record<string, unknown>;
    const vp = c.videoPath;
    const pp = c.videoPosterPath;
    if (typeof vp === "string" && vp.length > 0) videos.add(vp);
    if (typeof pp === "string" && pp.length > 0) posters.add(pp);
  }
  return { videos: [...videos], posters: [...posters] };
}

/** Wrap a deck's rendering with this provider to re-sign any slide video /
 *  poster whose storage path is known. Failures fall through to the stored
 *  URL so external / pasted URLs keep working. */
export function SlideMediaRefreshProvider({
  slides,
  children,
}: {
  slides: ReadonlyArray<Pick<DeckSlide, "content">>;
  children: ReactNode;
}) {
  const [videoUrls, setVideoUrls] = useState<UrlMap>(() => new Map());
  const [posterUrls, setPosterUrls] = useState<UrlMap>(() => new Map());
  const inflight = useRef<Set<string>>(new Set());

  // Snapshot of currently-known paths, stable string join for effect dep.
  const key = useMemo(() => {
    const { videos, posters } = collectPaths(slides);
    return `${videos.sort().join("|")}::${posters.sort().join("|")}`;
  }, [slides]);

  useEffect(() => {
    let cancelled = false;
    const { videos, posters } = collectPaths(slides);
    for (const p of videos) {
      if (inflight.current.has(`v:${p}`)) continue;
      inflight.current.add(`v:${p}`);
      refreshSlideVideoUrl(p)
        .then((url) => {
          if (cancelled || !url) return;
          setVideoUrls((prev) => {
            if (prev.get(p) === url) return prev;
            const next = new Map(prev);
            next.set(p, url);
            return next;
          });
        })
        .catch(() => {})
        .finally(() => inflight.current.delete(`v:${p}`));
    }
    for (const p of posters) {
      if (inflight.current.has(`p:${p}`)) continue;
      inflight.current.add(`p:${p}`);
      refreshSlideMediaUrl(p)
        .then((url) => {
          if (cancelled || !url) return;
          setPosterUrls((prev) => {
            if (prev.get(p) === url) return prev;
            const next = new Map(prev);
            next.set(p, url);
            return next;
          });
        })
        .catch(() => {})
        .finally(() => inflight.current.delete(`p:${p}`));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const value = useMemo<Ctx>(() => ({ videoUrls, posterUrls }), [videoUrls, posterUrls]);
  return <SlideMediaRefreshContext.Provider value={value}>{children}</SlideMediaRefreshContext.Provider>;
}
