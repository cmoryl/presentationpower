// -----------------------------------------------------------------------------
// Slide files — the real .pptx artifact behind "Save to My Files".
//
// Saving a slide writes two things: the editable record in `saved_modules` and
// a genuine single-slide PowerPoint file in the private `slide-files` bucket,
// so "My files" can hand the user an actual file they can open in PowerPoint.
// -----------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BUCKET = "slide-files";
const SIGNED_TTL = 60 * 10;

function sanitizeName(name: string): string {
  const base = name.replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const safe = base || "slide.pptx";
  return safe.toLowerCase().endsWith(".pptx") ? safe : `${safe}.pptx`;
}

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Upload a generated .pptx and attach it to a saved module / slide record. */
export const attachSlideFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        moduleId: z.string().uuid(),
        fileName: z.string().min(1),
        // base64 (with or without a data-URL prefix)
        fileBase64: z.string().min(32),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const bytes = decodeBase64(data.fileBase64);
    if (bytes.byteLength > 40 * 1024 * 1024) throw new Error("Slide file is too large (40MB max)");
    const fileName = sanitizeName(data.fileName);
    const path = `${userId}/${data.moduleId}/${fileName}`;

    const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      upsert: true,
    });
    if (up.error) throw up.error;

    const { error } = await supabase
      .from("saved_modules")
      .update({
        file_path: path,
        file_name: fileName,
        file_size: bytes.byteLength,
      } as never)
      .eq("id", data.moduleId)
      .eq("owner_id", userId);
    if (error) throw error;

    return { path, fileName, size: bytes.byteLength };
  });

/** Short-lived signed URL so the owner can download their saved slide file. */
export const getSlideFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ moduleId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("saved_modules")
      .select("file_path, file_name")
      .eq("id", data.moduleId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw error;
    const path = (row as { file_path?: string | null } | null)?.file_path;
    if (!path) return { url: null as string | null, fileName: null as string | null };
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
    if (signed.error) throw signed.error;
    return {
      url: signed.data?.signedUrl ?? null,
      fileName: (row as { file_name?: string | null }).file_name ?? "slide.pptx",
    };
  });
