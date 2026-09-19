/**
 * What this division actually uses — reported from finished slides, print and
 * social. The guide itself stays authored: nothing here edits it, drift is only
 * flagged for a brand lead to confirm.
 *
 * Signed-in only (the counting function requires a session), so the public
 * guide page simply omits the panel for visitors.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGuideUsage } from "@/lib/guide-usage.functions";
import { describeUsageLook, guideUsageDrift, type GuideUsage } from "@/lib/guide-usage";
import type { BrandGuide } from "@/lib/brand-guides";

function when(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function GuideUsagePanel({ guide }: { guide: BrandGuide }) {
  const fetchUsage = useServerFn(getGuideUsage);
  const q = useQuery({
    queryKey: ["guide-usage", guide.divisionId],
    queryFn: () => fetchUsage({ data: { divisionId: guide.divisionId } }) as Promise<GuideUsage>,
    retry: false,
  });

  // No session (or nothing counted yet) → the guide reads exactly as before.
  if (q.isError || !q.data || q.data.total === 0) return null;

  const usage = q.data;
  const looks = usage.looks.slice(0, 8).map(describeUsageLook);
  const drift = guideUsageDrift(usage, guide);

  return (
    <section className="mt-12 rounded-3xl border border-border bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">What this division actually uses</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Counted from finished work — {usage.total} piece{usage.total === 1 ? "" : "s"} across
            slides, print and social, most recent {when(usage.lastUsed)}. This is a report: the
            guide above stays as written until someone edits it.
          </p>
        </div>
        {usage.brandSystem > 0 && (
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
            {usage.brandSystem} built on the approved brand system
          </span>
        )}
      </div>

      {looks.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {looks.map((look) => (
            <li key={look.code} className="rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <span
                  className="h-9 w-9 shrink-0 rounded-lg border border-border"
                  style={{
                    background: look.surface ?? "transparent",
                    boxShadow: look.accent ? `inset 0 -6px 0 ${look.accent}` : undefined,
                  }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{look.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {look.code}
                    {look.mode ? ` · ${look.mode}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm">
                Used {look.count} time{look.count === 1 ? "" : "s"} · last {when(look.lastUsed)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[
                  look.surfaces.decks ? `${look.surfaces.decks} slides` : "",
                  look.surfaces.print ? `${look.surfaces.print} print` : "",
                  look.surfaces.social ? `${look.surfaces.social} social` : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              {look.motif && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Background family: {look.motif.replace(/-/g, " ")}
                </p>
              )}
              {(look.approved > 0 || look.sentBack > 0) && (
                <p className="mt-2 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {look.approved} signed off
                  </span>
                  {look.sentBack > 0 && (
                    <span className="ml-2 text-amber-700 dark:text-amber-400">
                      {look.sentBack} sent back
                    </span>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {drift.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Worth a brand lead's eye
          </p>
          <ul className="mt-2 space-y-2 text-sm text-amber-900 dark:text-amber-100">
            {drift.map((note) => (
              <li key={note.kind + note.text.slice(0, 24)}>{note.text}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
