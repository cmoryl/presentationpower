// Shared TransPerfect Canva account (Canva Connect API). Tokens live only in
// canva_shared_connection (service-role only, no RLS policies).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const API = "https://api.canva.com/rest/v1";
export const CANVA_SCOPES = "design:content:write design:meta:read asset:write";

function creds() {
  const id = process.env["CANVA_CLIENT_ID"];
  const secret = process.env["CANVA_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("Canva is not set up yet (missing app ID or secret).");
  return { id, secret };
}

export function callbackUrl(origin: string) {
  return `${origin}/api/public/canva/callback`;
}

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function buildAuthorizeUrl(userId: string, origin: string, returnTo: string) {
  const { id } = creds();
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const { error } = await supabaseAdmin
    .from("canva_oauth_states")
    .insert({ state, verifier, user_id: userId, return_to: returnTo });
  if (error) throw new Error(error.message);
  const q = new URLSearchParams({
    code_challenge_method: "s256",
    response_type: "code",
    client_id: id,
    redirect_uri: callbackUrl(origin),
    scope: CANVA_SCOPES,
    code_challenge: challenge,
    state,
  });
  return `https://www.canva.com/api/oauth/authorize?${q}`;
}

async function tokenRequest(body: Record<string, string>) {
  const { id, secret } = creds();
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Canva sign-in failed [${res.status}]: ${text}`);
  return JSON.parse(text) as { access_token: string; refresh_token: string; expires_in: number };
}

async function store(t: { access_token: string; refresh_token: string; expires_in: number }, by?: string) {
  const row = {
    id: 1,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    ...(by ? { connected_by: by } : {}),
  };
  const { error } = await supabaseAdmin.from("canva_shared_connection").upsert(row);
  if (error) throw new Error(error.message);
}

export async function completeAuthorization(state: string, code: string, origin: string) {
  const { data: st } = await supabaseAdmin
    .from("canva_oauth_states")
    .select("*")
    .eq("state", state)
    .maybeSingle();
  if (!st) throw new Error("This Canva sign-in link expired. Start again.");
  await supabaseAdmin.from("canva_oauth_states").delete().eq("state", state);
  if (Date.now() - new Date(st.created_at).getTime() > 15 * 60_000)
    throw new Error("This Canva sign-in link expired. Start again.");
  const t = await tokenRequest({
    grant_type: "authorization_code",
    code,
    code_verifier: st.verifier,
    redirect_uri: callbackUrl(origin),
  });
  await store(t, st.user_id);
  return st.return_to || "/admin/canva";
}

export async function connectionStatus() {
  const { data } = await supabaseAdmin
    .from("canva_shared_connection")
    .select("updated_at, connected_by")
    .eq("id", 1)
    .maybeSingle();
  return {
    configured: Boolean(process.env["CANVA_CLIENT_ID"] && process.env["CANVA_CLIENT_SECRET"]),
    connected: Boolean(data),
    updatedAt: data?.updated_at ?? null,
  };
}

async function accessToken() {
  const { data } = await supabaseAdmin.from("canva_shared_connection").select("*").eq("id", 1).maybeSingle();
  if (!data) throw new Error("The shared Canva account isn't connected yet. An admin connects it on Admin → Canva.");
  if (new Date(data.expires_at).getTime() > Date.now()) return data.access_token;
  // Canva refresh tokens are single-use: store the new pair immediately.
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: data.refresh_token });
  await store(t);
  return t.access_token;
}

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Imports a .pptx into the shared Canva account and returns the edit link. */
export async function importPptx(bytes: ArrayBuffer, title: string) {
  const token = await accessToken();
  const safeTitle = title.slice(0, 50) || "TransPerfect deck";
  const res = await fetch(`${API}/imports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Import-Metadata": JSON.stringify({
        title_base64: btoa(String.fromCharCode(...new TextEncoder().encode(safeTitle))),
        mime_type: PPTX_MIME,
      }),
    },
    body: bytes,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Canva refused the file [${res.status}]: ${text}`);
  let job = (JSON.parse(text) as { job: ImportJob }).job;
  for (let i = 0; i < 40 && job.status === "in_progress"; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const p = await fetch(`${API}/imports/${job.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const pt = await p.text();
    if (!p.ok) throw new Error(`Canva import check failed [${p.status}]: ${pt}`);
    job = (JSON.parse(pt) as { job: ImportJob }).job;
  }
  if (job.status === "failed") throw new Error(`Canva could not import the deck: ${job.error?.message ?? "unknown reason"}`);
  if (job.status !== "success") throw new Error("Canva is still importing — check the shared Canva account in a minute.");
  const design = job.result?.designs?.[0];
  if (!design) throw new Error("Canva finished but returned no design.");
  return { designId: design.id, editUrl: design.urls?.edit_url ?? null, title: design.title ?? safeTitle };
}

type ImportJob = {
  id: string;
  status: "in_progress" | "success" | "failed";
  error?: { code: string; message: string };
  result?: { designs: Array<{ id: string; title?: string; urls?: { edit_url?: string; view_url?: string } }> };
};
