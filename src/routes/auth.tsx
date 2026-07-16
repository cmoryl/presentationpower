import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in · TransPerfect Modular" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Hydrate remembered email after mount (avoids SSR/localStorage mismatch).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("tp.rememberedEmail");
      if (saved) {
        setEmail(saved);
        setRemember(true);
      } else {
        setRemember(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // If already signed in, punt to /admin (or home). Skip the redirect for
  // the "forgot password" mode so a signed-in user can still request a reset
  // (rare, but the page shouldn't bounce them mid-flow).
  useEffect(() => {
    if (mode === "forgot") return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) navigate({ to: "/admin", replace: true });
    });
    return () => {
      mounted = false;
    };
  }, [navigate, pathname, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: name ? { display_name: name } : undefined,
          },
        });
        if (error) throw error;
        // Try immediate sign-in in case email confirmation is off.
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr || !data.session) {
          setInfo("Account created. Check your inbox to confirm the email, then sign in.");
          setMode("signin");
        } else {
          navigate({ to: "/admin", replace: true });
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo(
          "If an account exists for that email, we've sent a password reset link. Check your inbox (and spam folder).",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        try {
          if (remember) window.localStorage.setItem("tp.rememberedEmail", email);
          else window.localStorage.removeItem("tp.rememberedEmail");
        } catch { /* ignore */ }
        navigate({ to: "/admin", replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#0A0F1C] flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 w-8 bg-[#E85A2C]" />
          <div className="text-sm font-semibold tracking-[0.25em]">TRANSPERFECT · MODULAR</div>
        </div>
        <div className="glass rounded-[20px] p-7">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Reset password"}
          </h1>
          <p className="mt-1 text-sm text-black/60">
            {mode === "signin"
              ? "Access the modular deck system and admin console."
              : mode === "signup"
                ? "Sign up with your TransPerfect email to get access."
                : "Enter your email and we'll send you a link to set a new password."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-black/60">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#03002C]"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-black/60">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@transperfect.com"
                className="mt-1 w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#03002C]"
              />
            </label>
            {mode !== "forgot" && (
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-black/60">Password</span>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
                      className="text-xs text-[#03002C] underline underline-offset-2 hover:opacity-80"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-1 w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#03002C]"
                />
              </label>
            )}

            {mode === "signin" && (
              <label className="flex items-center gap-2 text-sm text-black/70 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-black/25 accent-[#03002C]"
                />
                Remember me on this device
              </label>
            )}



            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-black/60">
            {mode === "signin" && (
              <>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
                  className="font-medium text-[#03002C] underline underline-offset-2"
                >
                  Create one
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
                  className="font-medium text-[#03002C] underline underline-offset-2"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
                className="font-medium text-[#03002C] underline underline-offset-2"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-black/50">
          Verified <span className="font-mono">@transperfect.com</span> accounts are auto-granted admin access.
        </p>
      </div>
    </div>
  );
}
