// Shown to sales-enablement / viewer accounts on authoring surfaces: they can
// look, present and export, but the editing controls are locked.

import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

export function CreateOnlyNotice({
  what = "This editor",
  className = "",
}: {
  what?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm ${className}`}
    >
      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 text-muted-foreground">
        <span className="font-medium text-foreground">{what} is read-only for your role.</span>{" "}
        Sales builds from pre-approved templates and modules — start a new piece from an approved
        set instead.
      </p>
      <Link
        to="/dashboard"
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
      >
        Create from approved
      </Link>
    </div>
  );
}
