// Client helpers for the private `slide-videos` Supabase Storage bucket.
// Mirrors slide-media.ts but for video files. Videos are capped at 100 MB
// server-side (bucket file_size_limit). Direct upload via supabase-js works
// for that range in browsers; no resumable/multipart is needed here.

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "slide-videos";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB
export const VIDEO_ALLOWED_MIME = ["video/mp4", "video/webm"] as const;

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96);
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to upload videos.");
  return data.user.id;
}

export type SlideVideoUpload = {
  path: string;
  signedUrl: string;
};

export async function uploadSlideVideo(
  file: File,
  filenameHint?: string,
): Promise<SlideVideoUpload> {
  if (!VIDEO_ALLOWED_MIME.includes(file.type as (typeof VIDEO_ALLOWED_MIME)[number])) {
    throw new Error("Only MP4 or WebM video is supported.");
  }
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error(`Video is too large. Max ${Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} MB.`);
  }
  const uid = await currentUserId();
  const name = sanitizeName(filenameHint ?? file.name ?? "video.mp4");
  const path = `${uid}/${Date.now()}-${name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    throw signed.error ?? new Error("Failed to sign uploaded video URL.");
  }
  return { path, signedUrl: signed.data.signedUrl };
}

export async function refreshSlideVideoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export type SlideVideoListEntry = {
  path: string;
  name: string;
  size: number | null;
  contentType: string | null;
  createdAt: string | null;
  signedUrl: string | null;
};

export async function listSlideVideos(): Promise<SlideVideoListEntry[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase.storage.from(BUCKET).list(uid, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;
  const items = (data ?? []).filter((f) => f.name && !f.name.startsWith("."));
  const paths = items.map((f) => `${uid}/${f.name}`);
  let signedMap = new Map<string, string>();
  if (paths.length > 0) {
    const signedResp = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (!signedResp.error && signedResp.data) {
      signedMap = new Map(signedResp.data.map((r) => [r.path ?? "", r.signedUrl ?? ""]));
    }
  }
  return items.map((f) => {
    const path = `${uid}/${f.name}`;
    const meta = (f.metadata ?? {}) as Record<string, unknown>;
    return {
      path,
      name: f.name,
      size: typeof meta.size === "number" ? (meta.size as number) : null,
      contentType: typeof meta.mimetype === "string" ? (meta.mimetype as string) : null,
      createdAt: f.created_at ?? null,
      signedUrl: signedMap.get(path) ?? null,
    };
  });
}

export async function deleteSlideVideo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/** Grab a poster frame from a local video File using an offscreen video +
 *  canvas. Returns a PNG data URL, or null if capture fails (e.g. browser
 *  refuses to decode). Used by SlideVideoPanel to auto-generate a poster
 *  right after upload — no server round trip. */
export async function captureVideoPoster(file: File, seekSeconds = 0.1): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    let done = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const fail = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve(null);
    };
    video.onloadedmetadata = () => {
      const target = Math.min(seekSeconds, Math.max(0, (video.duration || 1) - 0.05));
      try {
        video.currentTime = target;
      } catch {
        fail();
      }
    };
    video.onseeked = () => {
      if (done) return;
      try {
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return fail();
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/png");
        done = true;
        cleanup();
        resolve(dataUrl);
      } catch {
        fail();
      }
    };
    video.onerror = fail;
    setTimeout(fail, 15000);
    video.src = url;
  });
}
