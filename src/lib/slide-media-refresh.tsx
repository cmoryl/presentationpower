// Session-level context that keeps signed URLs for slide videos, posters,
// slide imagery, and per-item client logos fresh. Signed URLs from the
// private `slide-videos` (30d), `slide-media` (30d), and `client-logos`
// (1h) buckets all expire, so we also store the underlying storage path
// in slide content (`videoPath`, `videoPosterPath`, `mediaPath`,
// `logoPath` / `logoPaths`) and re-sign on load. The provider walks a
// deck's slides, fires one refresh per unique path, and exposes maps
// from path → fresh signed URL. Renderers prefer the refreshed URL when
// available, and fall back to the stored URL (which is also the correct
// behaviour for pasted external URLs that have no path).
//
// Share view: signed-URL refresh needs auth, which anonymous share
// viewers don't have. The `getSharedDeck` server function re-signs paths
// server-side and injects fresh URLs into the payload, so the share view
// doesn't need to mount this provider.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { refreshSlideVideoUrl } from "@/lib/slide-videos";
import { refreshSlideMediaUrl } from "@/lib/slide-media";
import { signClientLogoPaths } from "@/lib/client-logos.functions";
import type { DeckSlide } from "@/lib/deck-store";

type UrlMap = Map<string, string>;

type Ctx = {
  videoUrls: UrlMap;
  posterUrls: UrlMap;
  imageUrls: UrlMap;
  logoUrls: UrlMap;
};

const EMPTY: Ctx = {
  videoUrls: new Map(),
  posterUrls: new Map(),
  imageUrls: new Map(),
  logoUrls: new Map(),
};

const SlideMediaRefreshContext = createContext<Ctx>(EMPTY);

/** When true, MediaTile must NOT autoplay video (thumbnails / overview
 *  grids). Fixes a wall-of-autoplaying-videos hazard when the surrounding
 *  route has `present-mode` / `share-mode` set on body. */
export const SlideThumbnailContext = createContext<boolean>(false);

/** Optional callback that lets MediaTile turn its ▶ badge into a clickable
 *  preview trigger — only wired on the active editor canvas so thumbnails
 *  stay decorative. */
export const SlideVideoPreviewContext = createContext<null | ((videoUrl: string) => void)>(null);

/** When true, MediaTile SHOULD autoplay video even inside a thumbnail —
 *  used for the library's "video demo" cards where playback IS the point. */
export const SlideForceVideoAutoplayContext = createContext<boolean>(false);

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

export function useResolvedImageUrl(path?: string, fallback?: string): string | undefined {
  const ctx = useContext(SlideMediaRefreshContext);
  if (path && ctx.imageUrls.has(path)) return ctx.imageUrls.get(path);
  return fallback;
}

export function useResolvedLogoUrl(path?: string, fallback?: string): string | undefined {
  const ctx = useContext(SlideMediaRefreshContext);
  if (path && ctx.logoUrls.has(path)) return ctx.logoUrls.get(path);
  return fallback;
}

type Paths = { videos: string[]; posters: string[]; images: string[]; logos: string[] };

function collectPaths(slides: ReadonlyArray<Pick<DeckSlide, "content">>): Paths {
  const videos = new Set<string>();
  const posters = new Set<string>();
  const images = new Set<string>();
  const logos = new Set<string>();
  for (const sl of slides) {
    const c = sl.content as Record<string, unknown>;
    if (typeof c.videoPath === "string" && c.videoPath) videos.add(c.videoPath);
    if (typeof c.videoPosterPath === "string" && c.videoPosterPath) posters.add(c.videoPosterPath);
    if (typeof c.mediaPath === "string" && c.mediaPath) images.add(c.mediaPath);
    // Imported master/layout backdrops keep their storage path alongside the
    // signed URL so the backdrop re-signs like any other slide image.
    const bg = c.background as Record<string, unknown> | undefined;
    if (bg && typeof bg === "object" && typeof bg.path === "string" && bg.path)
      images.add(bg.path);

    const items = Array.isArray(c.items) ? (c.items as Array<Record<string, unknown>>) : [];
    for (const it of items) {
      if (typeof it.logoPath === "string" && it.logoPath) logos.add(it.logoPath);
      const lp = it.logoPaths;
      if (lp && typeof lp === "object") {
        for (const v of Object.values(lp as Record<string, unknown>)) {
          if (typeof v === "string" && v) logos.add(v);
        }
      }
    }
  }
  return {
    videos: [...videos],
    posters: [...posters],
    images: [...images],
    logos: [...logos],
  };
}

/** Wrap a deck's rendering with this provider to re-sign any slide video /
 *  poster / imagery / item logo whose storage path is known. Failures fall
 *  through to the stored URL so external / pasted URLs keep working. */
export function SlideMediaRefreshProvider({
  slides,
  children,
}: {
  slides: ReadonlyArray<Pick<DeckSlide, "content">>;
  children: ReactNode;
}) {
  const [videoUrls, setVideoUrls] = useState<UrlMap>(() => new Map());
  const [posterUrls, setPosterUrls] = useState<UrlMap>(() => new Map());
  const [imageUrls, setImageUrls] = useState<UrlMap>(() => new Map());
  const [logoUrls, setLogoUrls] = useState<UrlMap>(() => new Map());
  const inflight = useRef<Set<string>>(new Set());

  const key = useMemo(() => {
    const { videos, posters, images, logos } = collectPaths(slides);
    return [
      videos.sort().join("|"),
      posters.sort().join("|"),
      images.sort().join("|"),
      logos.sort().join("|"),
    ].join("::");
  }, [slides]);

  useEffect(() => {
    let cancelled = false;
    const { videos, posters, images, logos } = collectPaths(slides);

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
    for (const p of images) {
      if (inflight.current.has(`i:${p}`)) continue;
      inflight.current.add(`i:${p}`);
      refreshSlideMediaUrl(p)
        .then((url) => {
          if (cancelled || !url) return;
          setImageUrls((prev) => {
            if (prev.get(p) === url) return prev;
            const next = new Map(prev);
            next.set(p, url);
            return next;
          });
        })
        .catch(() => {})
        .finally(() => inflight.current.delete(`i:${p}`));
    }
    // Batch-sign client logo paths (bucket has 1h TTL). Skip already-known
    // paths and any currently-inflight ones.
    const pendingLogos = logos.filter((p) => !inflight.current.has(`l:${p}`) && !logoUrls.has(p));
    if (pendingLogos.length > 0) {
      for (const p of pendingLogos) inflight.current.add(`l:${p}`);
      signClientLogoPaths({ data: { paths: pendingLogos } })
        .then((res) => {
          if (cancelled || !res?.urls) return;
          setLogoUrls((prev) => {
            let changed = false;
            const next = new Map(prev);
            for (const [path, url] of Object.entries(res.urls)) {
              if (next.get(path) !== url) {
                next.set(path, url);
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        })
        .catch(() => {})
        .finally(() => {
          for (const p of pendingLogos) inflight.current.delete(`l:${p}`);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const value = useMemo<Ctx>(
    () => ({ videoUrls, posterUrls, imageUrls, logoUrls }),
    [videoUrls, posterUrls, imageUrls, logoUrls],
  );
  return (
    <SlideMediaRefreshContext.Provider value={value}>{children}</SlideMediaRefreshContext.Provider>
  );
}
