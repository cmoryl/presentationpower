// Shared sign-in gate for agent surfaces.
// Previously each agent route rendered a bare sentence ("Sign in to use the …
// agent.") with no way to actually sign in — a dead end for the user.
import { Link } from "@tanstack/react-router";

export function AgentSignInGate({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center text-sm text-foreground/60">
      <p>Sign in to use the {label}.</p>
      <Link
        to="/auth"
        className="rounded-lg bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0033a3]"
      >
        Sign in
      </Link>
    </div>
  );
}
