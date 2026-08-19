import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password · TransPerfect Element" }] }),
  component: ResetPasswordPage,
});

type Phase = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase's browser client auto-parses the recovery hash and fires a
  // PASSWORD_RECOVERY event. If we already have a session by then, this is
  // a valid recovery flow. If neither ever happens, the link is bad/expired.
  useEffect(() => {
    let settled = false;
    const settle = (p: Phase) => {
      if (settled) return;
      settled = true;
      setPhase(p);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && !settled)) settle("ready");
    });

    // If the URL has no recovery hash and no session already exists, mark
    // the link invalid so the user isn't stuck on a loading spinner.
    supabase.auth.getSession().then(({ data }) => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const looksLikeRecovery = /type=recovery|access_token=/.test(hash);
      if (data.session) return settle("ready");
      if (!looksLikeRecovery) return settle("invalid");
      // Recovery hash present but not yet processed — give Supabase a moment.
      setTimeout(() => {
        supabase.auth.getSession().then(({ data: d2 }) => {
          settle(d2.session ? "ready" : "invalid");
        });
      }, 1200);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPhase("done");
      // Give the success message a beat, then send them to the app.
      setTimeout(() => navigate({ to: "/admin", replace: true }), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update password. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#03002C] flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 w-8 bg-[#E85A2C]" />
          <div className="text-sm font-semibold tracking-[0.25em]">TRANSPERFECT · ELEMENT</div>
        </div>
        <div className="glass rounded-[20px] p-7">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-black/60">
            Enter a new password for your TransPerfect Element account.
          </p>

          {phase === "checking" && (
            <div className="mt-6 text-sm text-black/60">Verifying reset link…</div>
          )}

          {phase === "invalid" && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/auth", replace: true })}
                className="w-full rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white"
              >
                Back to sign in
              </button>
            </div>
          )}

          {phase === "done" && (
            <div className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Password updated. Redirecting you to the admin console…
            </div>
          )}

          {phase === "ready" && (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-black/60">New password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-1 w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#03002C]"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-black/60">
                  Confirm password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="mt-1 w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#03002C]"
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
