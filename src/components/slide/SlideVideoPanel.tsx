// Slide-level video control. Sibling of SlideImageryPanel — drives
// `content.videoUrl` and `content.videoPosterUrl`. Videos live in the
// private `slide-videos` bucket (mp4/webm, ≤ 100 MB). A poster frame is
// auto-captured client-side after upload; the user can also upload a
// custom poster image (which flows through the existing slide-media
// bucket, same as other slide imagery).

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  VIDEO_ALLOWED_MIME,
  VIDEO_MAX_BYTES,
  captureVideoPoster,
  deleteSlideVideo,
  listSlideVideos,
  uploadSlideVideo,
  type SlideVideoListEntry,
} from "@/lib/slide-videos";
import { uploadDataUrl, uploadSlideMedia } from "@/lib/slide-media";

const POSTER_MAX_BYTES = 4 * 1024 * 1024;
const POSTER_MIME = ["image/jpeg", "image/png", "image/webp"];

export function SlideVideoPanel({
  videoUrl,
  posterUrl,
  onChange,
}: {
  videoUrl?: string;
  posterUrl?: string;
  onChange: (next: {
    videoUrl: string | null;
    videoPath?: string | null;
    videoPosterUrl?: string | null;
    videoPosterPath?: string | null;
  }) => void;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [libOpen, setLibOpen] = useState(false);
  const [libQuery, setLibQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const libQ = useQuery({
    queryKey: ["slide-videos", signedIn],
    queryFn: () => listSlideVideos(),
    enabled: signedIn === true && libOpen,
    retry: false,
    staleTime: 30_000,
  });
  const libResults = useMemo(() => {
    const rows: SlideVideoListEntry[] = libQ.data ?? [];
    const q = libQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [libQ.data, libQuery]);

  async function handleVideoFile(file: File) {
    setError(null);
    if (!VIDEO_ALLOWED_MIME.includes(file.type as "video/mp4" | "video/webm")) {
      setError("Only MP4 or WebM video is supported.");
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      setError(`Video is too large. Max ${Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setBusy(true);
    try {
      // Capture poster BEFORE uploading — file is still on disk, faster.
      const posterDataUrl = await captureVideoPoster(file).catch(() => null);
      const uploaded = await uploadSlideVideo(file);
      let posterFinalUrl: string | null = null;
      let posterFinalPath: string | null = null;
      if (posterDataUrl) {
        try {
          const stored = await uploadDataUrl(posterDataUrl, `${file.name.replace(/\.[^.]+$/, "")}-poster.png`);
          posterFinalUrl = stored.signedUrl;
          posterFinalPath = stored.path;
        } catch {
          // Poster capture is best-effort — video still uploads.
        }
      }
      onChange({
        videoUrl: uploaded.signedUrl,
        videoPath: uploaded.path,
        videoPosterUrl: posterFinalUrl ?? undefined,
        videoPosterPath: posterFinalPath ?? undefined,
      });
      if (libQ.data) void libQ.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePosterFile(file: File) {
    setError(null);
    if (!POSTER_MIME.includes(file.type)) {
      setError("Poster must be JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > POSTER_MAX_BYTES) {
      setError(`Poster too large. Max ${Math.round(POSTER_MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setBusy(true);
    try {
      const up = await uploadSlideMedia(file);
      onChange({ videoUrl: videoUrl ?? null, videoPosterUrl: up.signedUrl, videoPosterPath: up.path });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poster upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function commitUrl() {
    const v = urlDraft.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) {
      setError("Enter an https:// URL to an .mp4 or .webm file.");
      return;
    }
    setError(null);
    // Pasted external URL: no path — clear any prior storage-path so refresh
    // doesn't overwrite the pasted URL with a stale re-sign.
    onChange({ videoUrl: v, videoPath: null });
    setUrlDraft("");
  }

  const hasVideo = Boolean(videoUrl);

  return (
    <div className="mt-4 rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-black/50">Slide video</div>
        {hasVideo && (
          <button
            type="button"
            onClick={() => onChange({ videoUrl: null, videoPath: null, videoPosterUrl: null, videoPosterPath: null })}
            className="rounded-full border border-black/15 px-2.5 py-0.5 text-[11px] uppercase tracking-widest hover:bg-black/5"
          >
            Remove
          </button>
        )}
      </div>

      <div className="mt-3 flex items-stretch gap-3">
        <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black/80">
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterUrl} alt="Video poster" className="h-full w-full object-cover opacity-80" />
          ) : null}
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow">▶</div>
            </div>
          )}
          {!hasVideo && (
            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-white/60">
              No video
            </div>
          )}
        </div>
        <div className="min-w-0 text-xs text-black/60">
          {hasVideo ? (
            <>
              <div className="text-black">Custom video</div>
              <div className="mt-0.5 truncate text-black/50" title={videoUrl}>{videoUrl}</div>
              <div className="mt-1 text-black/50">
                Plays in Present and shared views. PDF/PPTX exports embed the poster with a play glyph.
              </div>
            </>
          ) : (
            <div className="text-black/60">Upload a background video or paste an .mp4 / .webm URL. Video overrides the still image when both are set.</div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-black/50">Upload video</div>
          <div className="mt-1 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={VIDEO_ALLOWED_MIME.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleVideoFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy || signedIn === false}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-black px-3 py-1.5 text-[11px] uppercase tracking-widest text-white transition disabled:opacity-40"
            >
              {busy ? "Working…" : "Choose video"}
            </button>
            <span className="text-[11px] text-black/50">
              {signedIn === false ? "Sign in to upload videos" : "MP4 or WebM · up to 100 MB · poster auto-captured"}
            </span>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-black/50">Paste video URL</div>
          <div className="mt-1 flex gap-2">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://…/video.mp4"
              spellCheck={false}
              className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/30"
            />
            <button
              type="button"
              onClick={commitUrl}
              disabled={!urlDraft.trim()}
              className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-black/5 disabled:opacity-40"
            >
              Use URL
            </button>
          </div>
        </div>

        {hasVideo && (
          <div>
            <div className="text-[11px] uppercase tracking-widest text-black/50">Poster frame</div>
            <div className="mt-1 flex items-center gap-2">
              <input
                ref={posterInputRef}
                type="file"
                accept={POSTER_MIME.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handlePosterFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={busy || signedIn === false}
                onClick={() => posterInputRef.current?.click()}
                className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-black/5 disabled:opacity-40"
              >
                Upload poster
              </button>
              {posterUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ videoUrl: videoUrl ?? null, videoPosterUrl: null, videoPosterPath: null })}
                  className="text-[11px] text-black/50 hover:text-black underline"
                >
                  Clear poster
                </button>
              )}
              <span className="text-[11px] text-black/50">JPEG/PNG/WebP · up to 4 MB. Exports use this as the still.</span>
            </div>
          </div>
        )}

        {signedIn && (
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-black/50">
                Your videos {libQ.data ? `· ${libResults.length}` : ""}
              </div>
              <button
                type="button"
                onClick={() => setLibOpen((v) => !v)}
                className="rounded-full border border-black/15 px-2.5 py-0.5 text-[10px] uppercase tracking-widest hover:bg-black/5"
              >
                {libOpen ? "Hide" : "Browse"}
              </button>
            </div>
            {libOpen && (
              <div className="mt-2 space-y-2">
                <input
                  type="search"
                  value={libQuery}
                  onChange={(e) => setLibQuery(e.target.value)}
                  placeholder="Search by filename…"
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/30"
                />
                {libQ.isLoading ? (
                  <div className="text-[11px] text-black/40">Loading…</div>
                ) : libQ.isError ? (
                  <div className="text-[11px] text-red-600">Could not load library.</div>
                ) : libResults.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-black/10 px-3 py-4 text-center text-[11px] text-black/50">
                    No videos yet. Upload one above.
                  </div>
                ) : (
                  <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                    {libResults.map((r) => (
                      <li key={r.path} className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => r.signedUrl && onChange({ videoUrl: r.signedUrl, videoPath: r.path })}
                          disabled={!r.signedUrl}
                          className="flex-1 truncate text-left text-[11px] text-black hover:underline"
                          title={r.name}
                        >
                          ▶ {r.name}
                        </button>
                        <span className="text-[10px] text-black/40">
                          {r.size ? `${(r.size / 1024 / 1024).toFixed(1)} MB` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Delete ${r.name}?`)) return;
                            try {
                              await deleteSlideVideo(r.path);
                              await libQ.refetch();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Delete failed.");
                            }
                          }}
                          className="text-[10px] text-black/40 hover:text-red-600"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
