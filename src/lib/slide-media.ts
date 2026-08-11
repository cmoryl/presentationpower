// Client helpers for the private `slide-media` Supabase Storage bucket.
// Users can upload backgrounds / imagery scoped to their own auth.uid()
// folder; access is enforced by RLS on storage.objects.

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "slide-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96);
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to upload slide media.");
  return data.user.id;
}

export type SlideMediaUpload = {
  path: string;
  signedUrl: string;
};

/** Upload a file (or Blob) to the current user's folder and return a
 *  long-lived signed URL. */
export async function uploadSlideMedia(
  file: File | Blob,
  filenameHint?: string,
): Promise<SlideMediaUpload> {
  const uid = await currentUserId();
  const name = sanitizeName(filenameHint ?? (file instanceof File ? file.name : "upload.png"));
  const path = `${uid}/${Date.now()}-${name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType:
      file instanceof File ? file.type || "application/octet-stream" : "application/octet-stream",
  });
  if (error) throw error;
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    throw signed.error ?? new Error("Failed to sign uploaded media URL.");
  }
  return { path, signedUrl: signed.data.signedUrl };
}

/** Persist a base64 data URL (e.g. from AI generation) into the bucket. */
export async function uploadDataUrl(
  dataUrl: string,
  filenameHint = "generated.png",
): Promise<SlideMediaUpload> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], filenameHint, { type: blob.type || "image/png" });
  return uploadSlideMedia(file, filenameHint);
}

/** Refresh the signed URL for a stored asset. Signed URLs expire, so the
 *  editor should re-sign on load if a stored value 404s. */
export async function refreshSlideMediaUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export type SlideMediaItem = {
  path: string;
  name: string;
  url: string;
  size: number;
  createdAt: string;
};

const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

/** List the signed-in user's previously uploaded slide imagery, newest first.
 *  Used by the media picker so curators can re-select an existing asset
 *  instead of re-uploading it. */
export async function listSlideMedia(limit = 60): Promise<SlideMediaItem[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase.storage.from(BUCKET).list(uid, {
    limit,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;
  const files = (data ?? []).filter((f) => f.name && IMAGE_RE.test(f.name));
  if (!files.length) return [];
  const paths = files.map((f) => `${uid}/${f.name}`);
  const signed = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (signed.error) throw signed.error;
  const urlByPath = new Map(
    (signed.data ?? []).map((s) => [s.path ?? "", s.signedUrl ?? ""]),
  );
  return files
    .map((f, i) => ({
      path: paths[i]!,
      name: f.name,
      url: urlByPath.get(paths[i]!) ?? "",
      size: Number((f.metadata as Record<string, unknown> | null)?.size ?? 0),
      createdAt: String(f.created_at ?? ""),
    }))
    .filter((f) => f.url);
}
