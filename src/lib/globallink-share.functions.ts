// GlobalLink Share integration — Tier 2 API scaffold.
//
// GlobalLink Share (https://share.transperfect.com) is TransPerfect's secure
// file-transfer product. Its REST API is internal and not publicly documented,
// so this module is a thin, isolated adapter: one config object at the top
// pins the endpoint paths and payload shape, and a single `shareApiRequest`
// helper handles auth. When credentials are missing, functions degrade
// gracefully (return { configured: false }) — they never throw in a way that
// breaks the export flow.
//
// Native deck sharing (share tokens, getSharedDeck) is unrelated and untouched.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// TODO: confirm against internal GlobalLink Share API docs.
// All Share-API surface area lives here so it's trivial to correct once
// TransPerfect provides the real contract.
const SHARE_API = {
  // Endpoint that accepts a file upload and returns a shareable link.
  uploadPath: "/api/v1/files",
  // JSON payload shape sent to `uploadPath`.
  buildUploadPayload: (input: { fileName: string; contentBase64: string; mimeType: string }) => ({
    filename: input.fileName,
    mime_type: input.mimeType,
    content_base64: input.contentBase64,
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

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentBase64: z.string().min(1).max(MAX_BASE64_BYTES),
  mimeType: z.string().min(1).max(200),
});

export type GlobalLinkShareUploadResult =
  | { configured: false; ok: false; message: string }
  | { configured: true; ok: true; shareUrl: string }
  | { configured: true; ok: false; status: number; message: string };

export const uploadToGlobalLinkShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => uploadSchema.parse(input))
  .handler(async ({ data }): Promise<GlobalLinkShareUploadResult> => {
    if (!shareCredsConfigured()) {
      return {
        configured: false,
        ok: false,
        message:
          "GlobalLink Share API credentials are not configured. Add GLOBALLINK_SHARE_API_BASE_URL and GLOBALLINK_SHARE_API_KEY in Project Settings → Secrets.",
      };
    }

    try {
      const res = await shareApiRequest(SHARE_API.uploadPath, {
        method: "POST",
        body: SHARE_API.buildUploadPayload(data),
      });
      if (!res.ok) {
        return {
          configured: true,
          ok: false,
          status: res.status,
          message: `GlobalLink Share upload failed (${res.status}): ${res.text.slice(0, 300)}`,
        };
      }
      const shareUrl = SHARE_API.extractShareUrl(res.body);
      if (!shareUrl) {
        return {
          configured: true,
          ok: false,
          status: res.status,
          message:
            "GlobalLink Share accepted the upload but no share URL was returned. Confirm the API response shape.",
        };
      }
      return { configured: true, ok: true, shareUrl };
    } catch (e) {
      return {
        configured: true,
        ok: false,
        status: 0,
        message: `GlobalLink Share request error: ${(e as Error).message}`,
      };
    }
  });
