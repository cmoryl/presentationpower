// -----------------------------------------------------------------------------
// ALTERNATE-LOOK INTAKE — server functions.
//
// Every function here is admin-only: the handler verifies
// `has_role(auth.uid(), 'admin')` through the caller's own client before it
// touches a row or a file, and the RLS policies on `template_intakes` and the
// private `template-intake` bucket enforce the same rule underneath.
//
// The gate logic itself lives in `template-intake.ts` and is imported here, so
// the wizard and the server agree on what "ready to advance" means — the server
// re-runs the check rather than trusting the client's word for it.
// -----------------------------------------------------------------------------

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  approveStage,
  canAdvance,
  deriveTemplateFromIntake,
  extensionOf,
  requestChanges,
  slotById,
  type IntakeAsset,
  type IntakeSlotId,
  type TemplateIntake,
} from "./template-intake";
import {
  assertAdmin,
  BUCKET,
  CreateInput,
  decodeBase64Payload,
  loadIntake,
  persist,
  safeName,
  signAssets,
  SIGNED_TTL,
  SLOT_IDS,
  toIntake,
  UpdateInput,
  UploadInput,
  type Row,
  type SbClient,
} from "./template-intake.server";
import type { CustomTemplate } from "./custom-templates";

// -----------------------------------------------------------------------------

export const listIntakes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ intakes: TemplateIntake[]; urls: Record<string, string> }> => {
      const s = context.supabase as unknown as SbClient;
      await assertAdmin(s, context.userId);
      const { data, error } = await s
        .from("template_intakes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      const intakes = ((data as Row[]) ?? []).map(toIntake);
      return { intakes, urls: await signAssets(s, intakes) };
    },
  );

export const createIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }): Promise<TemplateIntake> => {
    const s = context.supabase as unknown as SbClient;
    await assertAdmin(s, context.userId);
    const { data: row, error } = await s
      .from("template_intakes")
      .insert({
        code: data.code.toUpperCase(),
        name: data.name,
        brief: data.brief,
        base_skin_code: data.baseSkinCode.toUpperCase(),
        mode_intent: data.modeIntent,
        stage: "assets",
        assets: [],
        approvals: [],
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) {
      if (/duplicate key/i.test(error.message)) {
        throw new Error(`Intake code ${data.code.toUpperCase()} is already in use.`);
      }
      throw new Error(error.message);
    }
    return toIntake(row as Row);
  });

export const updateIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }): Promise<TemplateIntake> => {
    const s = context.supabase as unknown as SbClient;
    await assertAdmin(s, context.userId);
    const patch: Row = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.brief !== undefined) patch.brief = data.brief;
    if (data.baseSkinCode !== undefined) patch.base_skin_code = data.baseSkinCode.toUpperCase();
    if (data.modeIntent !== undefined) patch.mode_intent = data.modeIntent;
    const { data: row, error } = await s
      .from("template_intakes")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toIntake(row as Row);
  });

/**
 * Store one asset against its slot. The slot's own format and size rules are
 * enforced here — the browser checks them for a fast message, but the server is
 * where they actually hold.
 */
export const uploadIntakeAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadInput.parse(input))
  .handler(async ({ data, context }): Promise<TemplateIntake> => {
    const s = context.supabase as unknown as SbClient;
    await assertAdmin(s, context.userId);

    const slot = slotById(data.slot);
    if (!slot) throw new Error(`Unknown upload slot "${data.slot}".`);
    const ext = extensionOf(data.filename);
    if (!slot.formats.includes(ext)) {
      throw new Error(
        `${slot.label} accepts ${slot.formats.map((f) => `.${f}`).join(", ")} — got ${
          ext ? `.${ext}` : "a file with no extension"
        }.`,
      );
    }
    const buf = decodeBase64Payload(data.data);
    if (buf.byteLength === 0) throw new Error(`${slot.label}: the uploaded file is empty.`);
    if (buf.byteLength > slot.maxBytes) {
      throw new Error(
        `${slot.label} is capped at ${Math.round(slot.maxBytes / (1024 * 1024))} MB.`,
      );
    }

    const intake = await loadIntake(s, data.id);
    if (intake.stage === "published") {
      throw new Error("This look is published — reopen it before replacing assets.");
    }

    const path = `${intake.id}/${data.slot}-${Date.now()}-${safeName(data.filename)}`;
    const up = await s.storage.from(BUCKET).upload(path, buf, {
      contentType: data.contentType,
      upsert: true,
    });
    if (up.error) throw new Error(up.error.message ?? "Upload failed.");

    // Replacing a slot removes the previous binary so the bucket never grows
    // an orphan for every re-upload.
    const previous = intake.assets.find((a) => a.slot === data.slot);
    if (previous?.path) await s.storage.from(BUCKET).remove([previous.path]);

    const asset: IntakeAsset = {
      slot: data.slot as IntakeSlotId,
      filename: data.filename,
      contentType: data.contentType,
      bytes: buf.byteLength,
      path,
      swatches: data.swatches.filter(Boolean),
      width: data.width ?? null,
      height: data.height ?? null,
      uploadedAt: new Date().toISOString(),
      uploadedBy: context.userId,
    };
    return persist(s, {
      ...intake,
      assets: [...intake.assets.filter((a) => a.slot !== data.slot), asset],
    });
  });

export const deleteIntakeAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), slot: z.enum(SLOT_IDS) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<TemplateIntake> => {
    const s = context.supabase as unknown as SbClient;
    await assertAdmin(s, context.userId);
    const intake = await loadIntake(s, data.id);
    const gone = intake.assets.find((a) => a.slot === data.slot);
    if (gone?.path) await s.storage.from(BUCKET).remove([gone.path]);
    return persist(s, {
      ...intake,
      assets: intake.assets.filter((a) => a.slot !== data.slot),
    });
  });

/** Signed URL for one stored asset — used by previews and the derive step. */
export const signIntakeAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().trim().min(3).max(400) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const s = context.supabase as unknown as SbClient;
    await assertAdmin(s, context.userId);
    const { data: signed, error } = await s.storage
      .from(BUCKET)
      .createSignedUrl(data.path, SIGNED_TTL);
    if (error || !signed?.signedUrl) throw new Error("Could not sign that asset.");
    return { url: signed.signedUrl };
  });

/**
 * Approve the current gate and advance. Re-runs `canAdvance` server-side, so a
 * client that skips a step is refused with the same sentence the wizard shows.
 */
export const approveIntakeStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        note: z.string().trim().max(600).default(""),
        testsPassing: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<TemplateIntake> => {
    const s = context.supabase as unknown as SbClient;
    await assertAdmin(s, context.userId);
    const intake = await loadIntake(s, data.id);

    // approveStage throws with the first blocker when the gate is not clear.
    const advanced = approveStage(
      intake,
      { by: context.userId, note: data.note || undefined },
      { testsPassing: data.testsPassing },
    );

    // Crossing into "published" is what actually creates/updates the catalog
    // template, inside the same call that records the final approval.
    if (advanced.stage === "published") {
      const derived = deriveTemplateFromIntake(advanced);
      const payload = {
        code: derived.template.code,
        name: derived.template.name,
        reference: derived.template.reference,
        description: derived.template.description,
        best_fit: derived.template.bestFit,
        mode: derived.template.mode,
        palette: derived.template.palette,
        typography: derived.template.typography,
        surface_note: derived.template.surfaceNote,
        imagery: derived.template.imagery,
        density: derived.template.density,
        base_skin_code: derived.template.baseSkinCode,
        spec: derived.template.spec,
        status: "published",
        notes: derived.template.notes,
        created_by: context.userId,
      };
      const q = advanced.templateId
        ? s
            .from("custom_templates")
            .update(payload)
            .eq("id", advanced.templateId)
            .select("id")
            .single()
        : s.from("custom_templates").insert(payload).select("id").single();
      const { data: row, error } = await q;
      if (error) {
        if (/duplicate key/i.test(error.message)) {
          throw new Error(`Template code ${payload.code} is already in the catalog.`);
        }
        throw new Error(error.message);
      }
      advanced.templateId = String((row as Row).id);

      // The supplied plate becomes the background of every scene of the look.
      const plate = advanced.assets.find((a) => a.slot === "texture-plate");
      if (plate?.path) {
        const { data: signed } = await s.storage
          .from(BUCKET)
          .createSignedUrl(plate.path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) {
          await s.from("template_background_overrides").upsert(
            {
              skin_code: payload.code,
              scene: "*",
              intensity: 1,
              tint: null,
              tint_strength: 0,
              scene_swap: null,
              image_url: signed.signedUrl,
              note: `Plate supplied with intake ${payload.code}`,
            },
            { onConflict: "skin_code,scene" },
          );
        }
      }
    }

    return persist(s, advanced);
  });

/** Send an intake back a stage with a reason — the reject half of the gate. */
export const requestIntakeChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(600) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<TemplateIntake> => {
    const s = context.supabase as unknown as SbClient;
    await assertAdmin(s, context.userId);
    const intake = await loadIntake(s, data.id);
    return persist(s, requestChanges(intake, data.reason));
  });

export const deleteIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const s = context.supabase as unknown as SbClient;
    await assertAdmin(s, context.userId);
    const intake = await loadIntake(s, data.id);
    const paths = intake.assets.map((a) => a.path).filter(Boolean);
    if (paths.length) await s.storage.from(BUCKET).remove(paths);
    const { error } = await s.from("template_intakes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Server-side gate read, so a reviewer sees the same blockers the server holds. */
export const intakeGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), testsPassing: z.boolean().optional() }).parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; blockers: string[]; template: CustomTemplate }> => {
      const s = context.supabase as unknown as SbClient;
      await assertAdmin(s, context.userId);
      const intake = await loadIntake(s, data.id);
      const check = canAdvance(intake, { testsPassing: data.testsPassing });
      return {
        ok: check.ok,
        blockers: check.blockers,
        template: deriveTemplateFromIntake(intake).template,
      };
    },
  );
