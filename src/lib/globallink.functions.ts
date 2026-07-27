// GlobalLink admin server functions — read connection status (secret
// presence, never values) and read/write non-secret configuration.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GlobalLinkStatus = {
  connected: boolean;
  secrets: Array<{
    name: string;
    label: string;
    required: boolean;
    configured: boolean;
    description: string;
  }>;
  endpoint: string | null;
};

export const getGlobalLinkStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GlobalLinkStatus> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const secrets = [
      {
        name: "GLOBALLINK_API_BASE_URL",
        label: "API Base URL",
        required: true,
        configured: !!process.env.GLOBALLINK_API_BASE_URL,
        description:
          "Root URL of your GlobalLink / GLNOW REST tenant (e.g. https://gl-connect.transperfect.com).",
      },
      {
        name: "GLOBALLINK_API_KEY",
        label: "API Key",
        required: true,
        configured: !!process.env.GLOBALLINK_API_KEY,
        description: "Bearer token issued by TransPerfect for your GlobalLink workspace.",
      },
      {
        name: "GLOBALLINK_SUBMITTER",
        label: "Default Submitter",
        required: false,
        configured: !!process.env.GLOBALLINK_SUBMITTER,
        description: "Optional. Email address recorded as the requester on new jobs.",
      },
      {
        name: "GLOBALLINK_WEBHOOK_SECRET",
        label: "Webhook Signing Secret",
        required: false,
        configured: !!process.env.GLOBALLINK_WEBHOOK_SECRET,
        description: "Shared secret used to verify GlobalLink job-status callbacks (HMAC-SHA256).",
      },
    ];

    const required = secrets.filter((s) => s.required);
    const connected = required.every((s) => s.configured);

    return {
      connected,
      secrets,
      endpoint: process.env.GLOBALLINK_API_BASE_URL
        ? `${process.env.GLOBALLINK_API_BASE_URL.replace(/\/$/, "")}/api/v3/translate`
        : null,
    };
  });

const configSchema = z.object({
  project_code: z.string().max(64).nullable().optional(),
  workflow: z.enum(["mt", "mt_pe", "human"]).optional(),
  default_source_lang: z.string().min(2).max(10).optional(),
  submitter_override: z.string().email().max(200).nullable().optional(),
  human_review_default: z.boolean().optional(),
  use_translation_memory: z.boolean().optional(),
  enforce_glossary: z.boolean().optional(),
  callback_url: z.string().url().max(500).nullable().optional(),
  batch_size: z.number().int().min(1).max(500).optional(),
  request_timeout_ms: z.number().int().min(5000).max(600000).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type GlobalLinkConfig = {
  project_code: string | null;
  workflow: "mt" | "mt_pe" | "human";
  default_source_lang: string;
  submitter_override: string | null;
  human_review_default: boolean;
  use_translation_memory: boolean;
  enforce_glossary: boolean;
  callback_url: string | null;
  batch_size: number;
  request_timeout_ms: number;
  notes: string | null;
  updated_at: string;
};

export const getGlobalLinkConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GlobalLinkConfig | null> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("globallink_config")
      .select(
        "project_code, workflow, default_source_lang, submitter_override, human_review_default, use_translation_memory, enforce_glossary, callback_url, batch_size, request_timeout_ms, notes, updated_at",
      )
      .eq("id", true)
      .maybeSingle();
    if (error) throw error;
    return (data as GlobalLinkConfig | null) ?? null;
  });

export const upsertGlobalLinkConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("globallink_config")
      .upsert({ id: true, ...data, updated_by: context.userId });
    if (error) throw error;
    return { ok: true };
  });

// Probe the GlobalLink endpoint with a tiny "ping" translation to prove the
// credentials are live. Only admins can call it.
export const testGlobalLinkConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const base = process.env.GLOBALLINK_API_BASE_URL;
    const key = process.env.GLOBALLINK_API_KEY;
    if (!base || !key) {
      return {
        ok: false,
        status: 0,
        message: "Missing GLOBALLINK_API_BASE_URL or GLOBALLINK_API_KEY.",
      };
    }
    const started = Date.now();
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/api/v3/translate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
          "x-gl-api-key": key,
        },
        body: JSON.stringify({
          source: "en",
          target: "es",
          segments: ["ping"],
          human: false,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const latency = Date.now() - started;
      const body = await res.text().catch(() => "");
      return {
        ok: res.ok,
        status: res.status,
        latencyMs: latency,
        message: res.ok
          ? "GlobalLink accepted the request."
          : `GlobalLink ${res.status}: ${body.slice(0, 300)}`,
      };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        latencyMs: Date.now() - started,
        message: (e as Error).message,
      };
    }
  });
