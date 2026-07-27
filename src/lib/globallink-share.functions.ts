// GlobalLink Share integration — Tier 2 API scaffold + admin surface.
//
// GlobalLink Share (https://share.transperfect.com) is TransPerfect's secure
// file-transfer product. Its REST API is internal and not publicly documented,
// so this module is a thin, isolated adapter: one config object at the top
// pins the endpoint paths and payload shape, and a single `shareApiRequest`
// helper handles auth. When credentials are missing, functions degrade
// gracefully — they never throw in a way that breaks the export flow.
//
// Native deck sharing (share tokens, getSharedDeck) is unrelated and untouched.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// TODO: confirm against internal GlobalLink Share API docs.
// All Share-API surface area lives here so it's trivial to correct once
// TransPerfect provides the real contract.
const SHARE_API = {
  // Lightweight endpoint used for the admin "Test connection" button.
  pingPath: "/api/v1/ping",
  // Endpoint that accepts a file upload and returns a shareable link.
  uploadPath: "/api/v1/files",
  // JSON payload shape sent to `uploadPath`. Includes the admin settings so
  // Share can honor expiry, password protection, notifications, and folder
  // routing per organization defaults.
  buildUploadPayload: (input: {
    fileName: string;
    contentBase64: string;
    mimeType: string;
    // TODO: confirm against internal GlobalLink Share API docs — field names
    // below are the adapter's best-guess mapping.
    settings?: {
      defaultLinkExpiryDays: number;
      passwordProtect: boolean;
      notifyRecipients: boolean;
      defaultFolder: string | null;
    };
    deckId?: string | null;
    deckTitle?: string | null;
  }) => ({
    filename: input.fileName,
    mime_type: input.mimeType,
    content_base64: input.contentBase64,
    ...(input.settings
      ? {
          link_expiry_days: input.settings.defaultLinkExpiryDays,
          password_protect: input.settings.passwordProtect,
          notify_recipients: input.settings.notifyRecipients,
          folder: input.settings.defaultFolder ?? undefined,
        }
      : {}),
    ...(input.deckId ? { source_deck_id: input.deckId } : {}),
    ...(input.deckTitle ? { source_deck_title: input.deckTitle } : {}),
  }),
  // Field on the JSON response that holds the shareable URL.
  extractShareUrl: (body: unknown): string | null => {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    for (const key of ["share_url", "shareUrl", "url", "download_url", "link"]) {
      const v = b[key];
      if (typeof v === "string" && v.startsWith("http")) return v;
    }
    return null;
  },
} as const;

// 90MB cap on the decoded payload — base64 inflates ~33%, so guard against
// the encoded string too.
const MAX_BASE64_BYTES = Math.floor(90 * 1024 * 1024 * 1.4); // ~126MB encoded

function shareCredsConfigured() {
  return !!process.env.GLOBALLINK_SHARE_API_BASE_URL && !!process.env.GLOBALLINK_SHARE_API_KEY;
}

async function shareApiRequest(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<{ ok: boolean; status: number; body: unknown; text: string }> {
  const base = process.env.GLOBALLINK_SHARE_API_BASE_URL!.replace(/\/$/, "");
  const key = process.env.GLOBALLINK_SHARE_API_KEY!;
  const res = await fetch(`${base}${path}`, {
    method: init.method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      "x-gl-api-key": key,
    },
    body: init.body != null ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text().catch(() => "");
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body, text };
}

export type GlobalLinkShareStatus = {
  configured: boolean;
  baseUrlConfigured: boolean;
  apiKeyConfigured: boolean;
};

/** Public status probe — booleans only, never the secret values. */
export const getGlobalLinkShareStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<GlobalLinkShareStatus> => {
    const baseUrlConfigured = !!process.env.GLOBALLINK_SHARE_API_BASE_URL;
    const apiKeyConfigured = !!process.env.GLOBALLINK_SHARE_API_KEY;
    return {
      configured: baseUrlConfigured && apiKeyConfigured,
      baseUrlConfigured,
      apiKeyConfigured,
    };
  },
);

export type GlobalLinkShareTestResult =
  | { configured: false; ok: false; message: string }
  | { configured: true; ok: true; status: number; latencyMs: number; message: string }
  | { configured: true; ok: false; status: number; latencyMs: number; message: string };

/** Admin "Test connection" — makes a lightweight authenticated GET. */
export const testGlobalLinkShareConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<GlobalLinkShareTestResult> => {
    if (!shareCredsConfigured()) {
      return {
        configured: false,
        ok: false,
        message:
          "Add GLOBALLINK_SHARE_API_BASE_URL and GLOBALLINK_SHARE_API_KEY in Settings → Secrets to enable connection tests.",
      };
    }
    const started = Date.now();
    try {
      const res = await shareApiRequest(SHARE_API.pingPath, { method: "GET" });
      const latencyMs = Date.now() - started;
      return {
        configured: true,
        ok: res.ok,
        status: res.status,
        latencyMs,
        message: res.ok
          ? `Reached ${SHARE_API.pingPath} — HTTP ${res.status}.`
          : `HTTP ${res.status}: ${res.text.slice(0, 240) || "no response body"}`,
      };
    } catch (e) {
      return {
        configured: true,
        ok: false,
        status: 0,
        latencyMs: Date.now() - started,
        message: `Request error: ${(e as Error).message}`,
      };
    }
  });

// ── Settings ────────────────────────────────────────────────────────────

export type GlobalLinkShareSettings = {
  defaultLinkExpiryDays: number;
  passwordProtect: boolean;
  notifyRecipients: boolean;
  defaultFolder: string | null;
  autoShareOnExport: boolean;
  updatedAt: string | null;
};

const DEFAULT_SETTINGS: GlobalLinkShareSettings = {
  defaultLinkExpiryDays: 30,
  passwordProtect: false,
  notifyRecipients: true,
  defaultFolder: null,
  autoShareOnExport: false,
  updatedAt: null,
};

type SettingsRow = {
  default_link_expiry_days: number;
  password_protect: boolean;
  notify_recipients: boolean;
  default_folder: string | null;
  auto_share_on_export: boolean;
  updated_at: string | null;
};

function rowToSettings(r: SettingsRow | null | undefined): GlobalLinkShareSettings {
  if (!r) return DEFAULT_SETTINGS;
  return {
    defaultLinkExpiryDays: r.default_link_expiry_days,
    passwordProtect: r.password_protect,
    notifyRecipients: r.notify_recipients,
    defaultFolder: r.default_folder,
    autoShareOnExport: r.auto_share_on_export,
    updatedAt: r.updated_at,
  };
}

/** Any signed-in user may read defaults; admins gate writes via RLS. */
export const getGlobalLinkShareSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GlobalLinkShareSettings> => {
    const { data } = await context.supabase
      .from("globallink_share_settings")
      .select(
        "default_link_expiry_days, password_protect, notify_recipients, default_folder, auto_share_on_export, updated_at",
      )
      .eq("id", true)
      .maybeSingle();
    return rowToSettings(data as SettingsRow | null);
  });

const settingsSchema = z.object({
  defaultLinkExpiryDays: z.number().int().min(1).max(3650),
  passwordProtect: z.boolean(),
  notifyRecipients: z.boolean(),
  defaultFolder: z.string().max(200).nullable().optional(),
  autoShareOnExport: z.boolean(),
});

export const upsertGlobalLinkShareSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingsSchema.parse(input))
  .handler(async ({ data, context }): Promise<GlobalLinkShareSettings> => {
    const payload = {
      id: true,
      default_link_expiry_days: data.defaultLinkExpiryDays,
      password_protect: data.passwordProtect,
      notify_recipients: data.notifyRecipients,
      default_folder: data.defaultFolder ?? null,
      auto_share_on_export: data.autoShareOnExport,
      updated_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("globallink_share_settings")
      .upsert(payload, { onConflict: "id" })
      .select(
        "default_link_expiry_days, password_protect, notify_recipients, default_folder, auto_share_on_export, updated_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return rowToSettings(row as SettingsRow);
  });

// ── Upload + activity log ────────────────────────────────────────────────

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentBase64: z.string().min(1).max(MAX_BASE64_BYTES),
  mimeType: z.string().min(1).max(200),
  deckId: z.string().max(64).nullable().optional(),
  deckTitle: z.string().max(300).nullable().optional(),
});

export type GlobalLinkShareUploadResult =
  | { configured: false; ok: false; message: string }
  | { configured: true; ok: true; shareUrl: string }
  | { configured: true; ok: false; status: number; message: string };

async function recordActivity(
  supabase: { from: (t: string) => any },
  userId: string,
  row: {
    deckId?: string | null;
    deckTitle?: string | null;
    fileName: string;
    shareUrl?: string | null;
    fileSizeBytes?: number | null;
    status: "success" | "failed";
    errorMessage?: string | null;
  },
) {
  try {
    await supabase.from("globallink_share_activity").insert({
      user_id: userId,
      deck_id: row.deckId ?? null,
      deck_title: row.deckTitle ?? null,
      file_name: row.fileName,
      share_url: row.shareUrl ?? null,
      file_size_bytes: row.fileSizeBytes ?? null,
      status: row.status,
      error_message: row.errorMessage ?? null,
    });
  } catch {
    /* logging must never break the upload */
  }
}

export const uploadToGlobalLinkShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => uploadSchema.parse(input))
  .handler(async ({ data, context }): Promise<GlobalLinkShareUploadResult> => {
    // Approx decoded byte size from base64 length.
    const approxBytes = Math.floor((data.contentBase64.length * 3) / 4);

    if (!shareCredsConfigured()) {
      return {
        configured: false,
        ok: false,
        message:
          "GlobalLink Share API credentials are not configured. Add GLOBALLINK_SHARE_API_BASE_URL and GLOBALLINK_SHARE_API_KEY in Project Settings → Secrets.",
      };
    }

    // Load admin settings so the payload honors org defaults.
    const { data: settingsRow } = await context.supabase
      .from("globallink_share_settings")
      .select(
        "default_link_expiry_days, password_protect, notify_recipients, default_folder, auto_share_on_export, updated_at",
      )
      .eq("id", true)
      .maybeSingle();
    const settings = rowToSettings(settingsRow as SettingsRow | null);

    try {
      const res = await shareApiRequest(SHARE_API.uploadPath, {
        method: "POST",
        body: SHARE_API.buildUploadPayload({
          fileName: data.fileName,
          contentBase64: data.contentBase64,
          mimeType: data.mimeType,
          deckId: data.deckId ?? null,
          deckTitle: data.deckTitle ?? null,
          settings: {
            defaultLinkExpiryDays: settings.defaultLinkExpiryDays,
            passwordProtect: settings.passwordProtect,
            notifyRecipients: settings.notifyRecipients,
            defaultFolder: settings.defaultFolder,
          },
        }),
      });

      if (!res.ok) {
        const msg = `GlobalLink Share upload failed (${res.status}): ${res.text.slice(0, 300)}`;
        await recordActivity(context.supabase as any, context.userId, {
          deckId: data.deckId ?? null,
          deckTitle: data.deckTitle ?? null,
          fileName: data.fileName,
          fileSizeBytes: approxBytes,
          status: "failed",
          errorMessage: msg,
        });
        return { configured: true, ok: false, status: res.status, message: msg };
      }

      const shareUrl = SHARE_API.extractShareUrl(res.body);
      if (!shareUrl) {
        const msg =
          "GlobalLink Share accepted the upload but no share URL was returned. Confirm the API response shape.";
        await recordActivity(context.supabase as any, context.userId, {
          deckId: data.deckId ?? null,
          deckTitle: data.deckTitle ?? null,
          fileName: data.fileName,
          fileSizeBytes: approxBytes,
          status: "failed",
          errorMessage: msg,
        });
        return { configured: true, ok: false, status: res.status, message: msg };
      }

      await recordActivity(context.supabase as any, context.userId, {
        deckId: data.deckId ?? null,
        deckTitle: data.deckTitle ?? null,
        fileName: data.fileName,
        shareUrl,
        fileSizeBytes: approxBytes,
        status: "success",
      });
      return { configured: true, ok: true, shareUrl };
    } catch (e) {
      const msg = `GlobalLink Share request error: ${(e as Error).message}`;
      await recordActivity(context.supabase as any, context.userId, {
        deckId: data.deckId ?? null,
        deckTitle: data.deckTitle ?? null,
        fileName: data.fileName,
        fileSizeBytes: approxBytes,
        status: "failed",
        errorMessage: msg,
      });
      return { configured: true, ok: false, status: 0, message: msg };
    }
  });

// ── Activity log reader ─────────────────────────────────────────────────

export type GlobalLinkShareActivityRow = {
  id: string;
  deckId: string | null;
  deckTitle: string | null;
  fileName: string;
  shareUrl: string | null;
  fileSizeBytes: number | null;
  status: "success" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

export const listGlobalLinkShareActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GlobalLinkShareActivityRow[]> => {
    const { data } = await context.supabase
      .from("globallink_share_activity")
      .select(
        "id, deck_id, deck_title, file_name, share_url, file_size_bytes, status, error_message, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    return (
      (data ?? []) as Array<{
        id: string;
        deck_id: string | null;
        deck_title: string | null;
        file_name: string;
        share_url: string | null;
        file_size_bytes: number | null;
        status: "success" | "failed";
        error_message: string | null;
        created_at: string;
      }>
    ).map((r) => ({
      id: r.id,
      deckId: r.deck_id,
      deckTitle: r.deck_title,
      fileName: r.file_name,
      shareUrl: r.share_url,
      fileSizeBytes: r.file_size_bytes,
      status: r.status,
      errorMessage: r.error_message,
      createdAt: r.created_at,
    }));
  });
