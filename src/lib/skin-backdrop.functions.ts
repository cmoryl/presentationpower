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

const GenerateInput = z.object({
  skinCode: z.string().min(2).max(8),
  scene: z.string().min(2).max(24),
  /** 0–3: alternate takes of the same skin × scene. */
  take: z.number().int().min(0).max(3).default(0),
  /** Optional extra art direction from the user. */
  note: z.string().max(400).optional().nullable(),
});

export interface SkinBackdropRow {
  skinCode: string;
  scene: string;
  take: number;
  imageUrl: string;
  prompt: string;
}

function publicUrlFor(path: string): string {
  return `/api/public/skin-backdrop?path=${encodeURIComponent(path)}`;
}

export const generateSkinBackdrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }): Promise<SkinBackdropRow> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY on the server.");

    const scene = (SKIN_SCENES as string[]).includes(data.scene)
      ? (data.scene as SkinScene)
      : "cover";
    const spec = backdropPromptForCode(data.skinCode, scene);
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
    const path = `${data.skinCode}/${scene}-${data.take}-${Date.now()}.png`;

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
      .select("skin_code, scene, take, image_url, prompt")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return [];
    return (data ?? []).map((r) => ({
      skinCode: r.skin_code,
      scene: r.scene,
      take: r.take,
      imageUrl: r.image_url,
      prompt: r.prompt,
    }));
  },
);

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
