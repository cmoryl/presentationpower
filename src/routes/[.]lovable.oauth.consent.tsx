import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthAuthorizationData = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string };
} | null;

type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthAuthorizationData; error: Error | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthAuthorizationData; error: Error | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthAuthorizationData; error: Error | null }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen bg-[#F5F1EA] px-6 py-20 text-[#03002C]">
      <div className="mx-auto max-w-[460px] rounded-[20px] border border-black/10 bg-white/70 p-7">
        <h1 className="text-xl font-semibold tracking-tight">Authorization request failed</h1>
        <p className="mt-2 text-sm text-black/60">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as OAuthAuthorizationData;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "this app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-[#F5F1EA] px-6 py-20 text-[#03002C]">
      <div className="mx-auto max-w-[460px] rounded-[20px] border border-black/10 bg-white/70 p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 w-8 bg-[#003FC7]" />
          <div className="text-xs font-semibold tracking-[0.25em]">TRANSPERFECT · ELEMENT</div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Connect {clientName}</h1>
        <p className="mt-2 text-sm leading-relaxed text-black/60">
          {clientName} is asking to use TransPerfect Element as you. It will be able to read your
          decks, print assets and campaign kits, and create new briefs on your behalf.
        </p>
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        <div className="mt-7 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Working…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
