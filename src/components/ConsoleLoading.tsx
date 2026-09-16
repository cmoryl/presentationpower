// Shared opening state for the client-rendered consoles (deck / print / social /
// events agents, admin). These routes are `ssr: false`, so without a pending
// component the browser shows nothing — or an anonymous grey block — for the few
// seconds the console takes to load. Say what is opening instead.

import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export interface ConsoleLoadingProps {
  /** What is opening, in the user's words, e.g. "presentation agent". */
  label: string;
  /** Optional second line explaining the wait. */
  hint?: string;
}

export function ConsoleLoading({ label, hint }: ConsoleLoadingProps) {
  return (
    <AppShell>
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center"
        aria-busy="true"
        aria-live="polite"
      >
        <Loader2 size={20} className="animate-spin text-foreground/40" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground/70">Opening your {label}…</p>
        <p className="max-w-sm text-xs text-foreground/45">
          {hint ?? "This takes a few seconds the first time — everything loads in your browser."}
        </p>
      </div>
    </AppShell>
  );
}
