/**
 * ALTERNATE-LOOK INTAKE — server-only helpers behind the intake server
 * functions. Kept out of `template-intake.functions.ts` because server-function
 * modules are thin wrappers: only imports, types and the declarations survive
 * client-bundle splitting, so any runtime sibling there would vanish.
 */

import { z } from "zod";
import {
  slotById,
  type IntakeAsset,
  type IntakeSlotId,
  type IntakeStage,
  type TemplateIntake,
} from "./template-intake";

export const BUCKET = "template-intake";
export const SIGNED_TTL = 60 * 60 * 8;

export type SbClient = {
  from: (t: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  storage: {
    from: (b: string) => {
      upload: (
        path: string,
        body: ArrayBuffer | Uint8Array | Blob,
        opts?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
      remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
      createSignedUrl: (
        path: string,
        expires: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

export async function assertAdmin(s: SbClient, userId: string) {
  const { data } = await s.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admin access required.");
}

export type Row = Record<string, unknown>;

export function toIntake(r: Row): TemplateIntake {
  return {
    id: String(r.id),
    code: String(r.code ?? "").toUpperCase(),
    name: String(r.name ?? ""),
    brief: String(r.brief ?? ""),
    baseSkinCode: String(r.base_skin_code ?? "S01").toUpperCase(),
    modeIntent:
      r.mode_intent === "light" || r.mode_intent === "dark"
        ? (r.mode_intent as "light" | "dark")
        : "auto",
    stage: (["assets", "derive", "review", "tests", "published"] as IntakeStage[]).includes(
      r.stage as IntakeStage,
    )
      ? (r.stage as IntakeStage)
      : "assets",
    assets: Array.isArray(r.assets) ? (r.assets as IntakeAsset[]) : [],
    approvals: Array.isArray(r.approvals) ? (r.approvals as TemplateIntake["approvals"]) : [],
    templateId: (r.template_id as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? undefined,
    createdAt: r.created_at ? String(r.created_at) : undefined,
    updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  };
}

export async function loadIntake(s: SbClient, id: string): Promise<TemplateIntake> {
  const { data, error } = await s.from("template_intakes").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return toIntake(data as Row);
}

export async function persist(s: SbClient, intake: TemplateIntake): Promise<TemplateIntake> {
  const { data, error } = await s
    .from("template_intakes")
    .update({
      stage: intake.stage,
      assets: intake.assets,
      approvals: intake.approvals,
      brief: intake.brief,
      template_id: intake.templateId,
    })
    .eq("id", intake.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toIntake(data as Row);
}

/** Sign every stored asset so the wizard can show real previews. */
export async function signAssets(
  s: SbClient,
  intakes: TemplateIntake[],
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  const paths = intakes.flatMap((i) => i.assets.map((a) => a.path)).filter(Boolean);
  await Promise.all(
    paths.map(async (p) => {
      const { data } = await s.storage.from(BUCKET).createSignedUrl(p, SIGNED_TTL);
      if (data?.signedUrl) urls[p] = data.signedUrl;
    }),
  );
  return urls;
}


export const CreateInput = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only"),
  name: z.string().trim().min(2).max(80),
  brief: z.string().trim().max(2000).default(""),
  baseSkinCode: z.string().trim().min(2).max(8).default("S01"),
  modeIntent: z.enum(["auto", "light", "dark"]).default("auto"),
});

export const UpdateInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  brief: z.string().trim().max(2000).optional(),
  baseSkinCode: z.string().trim().min(2).max(8).optional(),
  modeIntent: z.enum(["auto", "light", "dark"]).optional(),
});

export const SLOT_IDS = [
  "logo-primary",
  "logo-reverse",
  "palette-source",
  "cover-image",
  "texture-plate",
  "type-spec",
  "icon-set",
  "reference-deck",
] as const;

export const UploadInput = z.object({
  id: z.string().uuid(),
  slot: z.enum(SLOT_IDS),
  filename: z.string().trim().min(1).max(300),
  contentType: z.string().trim().min(1).max(160),
  /** data URL or bare base64, ~80MB binary ceiling. */
  data: z.string().min(8).max(110_000_000),
  swatches: z.array(z.string().trim().max(32)).max(24).default([]),
  width: z.number().int().positive().max(20000).nullable().optional(),
  height: z.number().int().positive().max(20000).nullable().optional(),
});

export function decodeBase64Payload(payload: string): Buffer {
  const b64 = payload.startsWith("data:") ? (payload.split(",", 2)[1] ?? "") : payload;
  return Buffer.from(b64, "base64");
}

export function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-120);
}

