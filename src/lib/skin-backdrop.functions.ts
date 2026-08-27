// -----------------------------------------------------------------------------
// AI SKIN BACKDROPS — server functions
//
// `generateSkinBackdrop` renders one art-directed backdrop for a skin × scene
// through the Lovable AI Gateway, stores the PNG in the private
// `skin-backdrops` bucket and records it in `public.skin_backdrops`. The image
// is served publicly through /api/public/skin-backdrop so unauthenticated
// present/share surfaces can paint it.
//
// `listSkinBackdrops` is a public read of the catalog.
// -----------------------------------------------------------------------------

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SKIN_SCENES, type SkinScene } from "@/lib/skin-backgrounds";
import { backdropPromptForCode } from "@/lib/skin-backdrop-prompt";

/**
 * A scene is either one of the authored skin scenes or a MODULE-SCOPED scene
 * `mod:<VARIANT-ID>` written when an admin replaces the background for a single
 * module inside a look. Both live in the same table/bucket, so nothing else
 * about persistence, the public proxy or cache-busting changes.
 */
function normalizeScene(scene: string): string {
  if ((SKIN_SCENES as string[]).includes(scene)) return scene;
  if (/^mod:[A-Za-z0-9_-]{2,64}$/.test(scene)) return `mod:${scene.slice(4).toUpperCase()}`;
  return "cover";
}

/** Storage keys can't carry the `mod:` colon. */
function scenePathSegment(scene: string): string {
  return scene.replace(/[^A-Za-z0-9_-]+/g, "_");
}

/** Authored scene the AI prompt is written from (module scenes have none). */
function promptSceneFor(scene: string, basis?: string | null): SkinScene {
  if ((SKIN_SCENES as string[]).includes(scene)) return scene as SkinScene;
  if (basis && (SKIN_SCENES as string[]).includes(basis)) return basis as SkinScene;
  return "cover";
}

const GenerateInput = z.object({
  skinCode: z.string().min(2).max(8),
  scene: z.string().min(2).max(72),
  /** 0–3: alternate takes of the same skin × scene. */
  take: z.number().int().min(0).max(3).default(0),
  /** Optional extra art direction from the user. */
  note: z.string().max(400).optional().nullable(),
  /** Authored scene to base the prompt on when `scene` is module-scoped. */
  basisScene: z.string().max(24).optional().nullable(),
});

export interface SkinBackdropRow {
  skinCode: string;
  scene: string;
  take: number;
  imageUrl: string;
  prompt: string;
}

/**
 * Public proxy URL for a stored backdrop.
 *
 * Replacements upsert to the SAME storage path, so the URL alone is stable and
 * every browser, thumbnail and CDN edge happily keeps serving the OLD artwork
 * after an admin replaces a cover. The `v` stamp is the content version: it
 * changes on every upload/re-render, which is what actually retires the old
 * bytes everywhere they were cached.
 */
function publicUrlFor(path: string, version: number = Date.now()): string {
  return `/api/public/skin-backdrop?path=${encodeURIComponent(path)}&v=${version}`;
}

/** Guarantee a version stamp on rows written before versioning existed. */
function versionedUrl(url: string, createdAt?: string | null): string {
  if (/[?&]v=/.test(url)) return url;
  const stamp = createdAt ? Date.parse(createdAt) || 0 : 0;
  return `${url}${url.includes("?") ? "&" : "?"}v=${stamp}`;
}


export const generateSkinBackdrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }): Promise<SkinBackdropRow> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY on the server.");

    const scene = normalizeScene(data.scene);
    const spec = backdropPromptForCode(data.skinCode, promptSceneFor(scene, data.basisScene));
    if (!spec) throw new Error(`Unknown skin ${data.skinCode}`);

    const takeNote = [
      "",
      " Alternate take: shift the focal mass to the opposite edge.",
      " Alternate take: tighter crop, larger single form, more contrast.",
      " Alternate take: quieter, wider, more negative space.",
    ][data.take];
    const prompt = `${spec.prompt}${takeNote}${data.note ? ` ${data.note}` : ""}`;

    // Nano Banana 2: fast, pro-level quality. Chat-shape body + modalities.
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI is rate limited right now — try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`Backdrop generation failed (${res.status}): ${body.slice(0, 240)}`);
    }
    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string }>;
      error?: { message?: string };
    };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error(json.error?.message ?? "Backdrop generation returned no image.");

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${data.skinCode}/${scenePathSegment(scene)}-${data.take}-${Date.now()}.png`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const up = await supabaseAdmin.storage
      .from("skin-backdrops")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (up.error) throw new Error(`Storing the backdrop failed: ${up.error.message}`);

    const row = {
      skin_code: data.skinCode,
      scene,
      take: data.take,
      prompt,
      storage_path: path,
      image_url: publicUrlFor(path),
      created_by: context.userId,
    };
    const saved = await context.supabase
      .from("skin_backdrops")
      .upsert(row, { onConflict: "skin_code,scene,take" })
      .select("skin_code, scene, take, image_url, prompt")
      .single();
    if (saved.error) throw new Error(`Saving the backdrop failed: ${saved.error.message}`);

    return {
      skinCode: saved.data.skin_code,
      scene: saved.data.scene,
      take: saved.data.take,
      imageUrl: saved.data.image_url,
      prompt: saved.data.prompt,
    };
  });

export const listSkinBackdrops = createServerFn({ method: "GET" }).handler(
  async (): Promise<SkinBackdropRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("skin_backdrops")
      .select("skin_code, scene, take, image_url, prompt, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return [];
    return (data ?? []).map((r) => ({
      skinCode: r.skin_code,
      scene: r.scene,
      take: r.take,
      imageUrl: versionedUrl(r.image_url, r.created_at),
      prompt: r.prompt,
    }));
  },
);

/* --------------------------------------------------------------- upload path */

const UploadInput = z.object({
  skinCode: z.string().min(2).max(8),
  scene: z.string().min(2).max(72),
  take: z.number().int().min(0).max(3).default(0),
  /** Base64 payload WITHOUT the data: prefix. */
  base64: z.string().min(32),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/avif"]),
  filename: z.string().max(160).optional().nullable(),
});

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Replace one skin × scene × take backdrop with an uploaded image. Same table
 * and same public proxy as the AI path, so the template editor, the stage and
 * every exporter pick the new art up with no further wiring.
 */
export const uploadSkinBackdrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadInput.parse(input))
  .handler(async ({ data, context }): Promise<SkinBackdropRow> => {
    const scene = normalizeScene(data.scene);
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 12 * 1024 * 1024) throw new Error("Image is larger than 12 MB.");

    const code = data.skinCode.toUpperCase();
    const ext = EXT[data.contentType] ?? "png";
    const path = `${code}/${scenePathSegment(scene)}-${data.take}-upload-${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const up = await supabaseAdmin.storage
      .from("skin-backdrops")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (up.error) throw new Error(`Storing the background failed: ${up.error.message}`);

    const saved = await context.supabase
      .from("skin_backdrops")
      .upsert(
        {
          skin_code: code,
          scene,
          take: data.take,
          prompt: `Uploaded replacement${data.filename ? ` · ${data.filename}` : ""}`,
          storage_path: path,
          image_url: publicUrlFor(path),
          created_by: context.userId,
        },
        { onConflict: "skin_code,scene,take" },
      )
      .select("skin_code, scene, take, image_url, prompt")
      .single();
    if (saved.error) throw new Error(`Saving the background failed: ${saved.error.message}`);

    return {
      skinCode: saved.data.skin_code,
      scene: saved.data.scene,
      take: saved.data.take,
      imageUrl: saved.data.image_url,
      prompt: saved.data.prompt,
    };
  });

const DeleteInput = z.object({ skinCode: z.string(), scene: z.string(), take: z.number().int() });

export const deleteSkinBackdrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await context.supabase
      .from("skin_backdrops")
      .delete()
      .eq("skin_code", data.skinCode)
      .eq("scene", data.scene)
      .eq("take", data.take);
    return { ok: true };
  });
