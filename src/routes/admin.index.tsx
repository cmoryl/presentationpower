import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ArrowRight, FilePlus2, Printer, Share2, CalendarPlus, AlertTriangle } from "lucide-react";
import { getAdminOverview } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { ADMIN_NAV_GROUPS } from "@/lib/admin-nav";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Command center · Admin · TransPerfect Element" },
      {
        name: "description",
        content:
          "Admin command center for TransPerfect Element: what needs attention, recent work, content inventory and system health.",
      },
      { property: "og:title", content: "Command center · Admin · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Admin command center for TransPerfect Element: what needs attention, recent work, content inventory and system health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OverviewView,
});

// Where each build surface lives in the app. Keys mirror
// getAdminOverview().buildSurfaces; omit a key to render a non-clickable row.
const SURFACE_LINKS: Record<string, string | undefined> = {
  decks: "/atlas",
  briefs: "/brief/new",
  printAssets: "/library/print",
  campaignKits: "/social",
  surfaces: "/social",
  savedModules: "/library/my",
  slideModules: "/library",
  importedDecks: "/library/imported",
  divisionImagery: "/imagery",
  clientLogos: "/logohub",
  knowledge: "/knowledge",
  translations: "/admin/translation",
};

const QUICK_ACTIONS = [
  { to: "/brief/new", label: "New brief", icon: FilePlus2 },
  { to: "/asset/new", label: "New print piece", icon: Printer },
  { to: "/social/new", label: "New social kit", icon: Share2 },
  { to: "/events/new", label: "New event kit", icon: CalendarPlus },
] as const;

function OverviewView() {
  const fn = useServerFn(getAdminOverview);
  const q = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fn(), retry: false });

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;
  if (q.isLoading) return <LoadingSkeleton />;
  if (!q.data) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
        The command center could not load. Refresh the page; if it keeps failing, check the audit log.
      </div>
    );
  }

  const d = q.data;
  const t = d.totals;
  const aiSuccess = t.aiCalls - t.aiErrors;
  const successRate = t.aiCalls ? (aiSuccess / t.aiCalls) * 100 : null;
  const inReview = (d.decksByStatus ?? [])
    .filter((r) => /review|pending|qa/i.test(r.label))
    .reduce((a, r) => a + r.count, 0);

  const attention: Array<{ label: string; detail: string; to: string }> = [];
  if (inReview > 0)
    attention.push({
      label: `${inReview} deck${inReview === 1 ? "" : "s"} waiting for review`,
      detail: "Open Approvals to approve or send back.",
      to: "/approvals",
    });
  if (t.aiErrors > 0)
    attention.push({
      label: `${t.aiErrors} failed AI request${t.aiErrors === 1 ? "" : "s"} in 30 days`,
      detail: "See which feature failed in AI usage.",
      to: "/admin/ai",
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Command center
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            What needs your attention, the latest work, and the health of the system. Figures
            cover the last 30 days unless marked otherwise.
          </p>
        </div>
        <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a, i) => (
            <Link
              key={a.to}
              to={a.to}
              className={
                i === 0
                  ? "inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  : "inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              }
            >
              <a.icon size={16} aria-hidden />
              {a.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Needs attention */}
      <section aria-labelledby="attention-h">
        <h2 id="attention-h" className="sr-only">
          Needs attention
        </h2>
        {attention.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Nothing needs your attention right now.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {attention.map((a) => (
              <li key={a.label}>
                <Link
                  to={a.to}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <AlertTriangle size={16} className="shrink-0 text-primary" aria-hidden />
                  <span className="text-sm font-medium text-foreground">{a.label}</span>
                  <span className="hidden text-sm text-muted-foreground sm:inline">{a.detail}</span>
                  <ArrowRight size={16} className="ml-auto text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Key figures */}
      <section aria-labelledby="kpi-h">
        <h2 id="kpi-h" className="sr-only">
          Key figures
        </h2>
        <dl className="grid grid-cols-2 divide-border overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-4 lg:divide-x [&>div]:border-border max-lg:[&>div:nth-child(-n+2)]:border-b max-lg:[&>div:nth-child(odd)]:border-r">
          <Kpi label="Decks" value={t.decks} sub={`${t.decksInWindow ?? 0} new in 30 days`} to="/atlas" />
          <Kpi
            label="AI requests"
            value={t.aiCalls}
            sub={successRate === null ? "None recorded" : `${successRate.toFixed(1)}% succeeded`}
            to="/admin/ai"
          />
          <Kpi
            label="Images generated"
            value={t.imagesGenerated}
            sub={t.imageEvents ? `${t.imageEvents} image events` : "None recorded"}
            to="/admin/imagery-analytics"
          />
          <Kpi
            label="Knowledge records"
            value={t.knowledgeEntries + (t.oracleKnowledge ?? 0)}
            sub={`${t.brandIntelligence ?? 0} brand guide records`}
            to="/knowledge"
          />
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Left column */}
        <div className="space-y-8 lg:col-span-8">
          <Panel
            title="Recent decks"
            action={<PanelLink to="/atlas">All decks</PanelLink>}
          >
            {(d.recentDecks ?? []).length === 0 ? (
              <Empty>No decks yet. Start with a new brief.</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">Title</th>
                    <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Brand</th>
                    <th scope="col" className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(d.recentDecks ?? []).map((row) => (
                    <tr key={row.id} className="hover:bg-muted/60">
                      <td className="max-w-0 px-4 py-2.5">
                        <Link
                          to="/decks/$deckId"
                          params={{ deckId: row.id }}
                          className="block truncate font-medium text-foreground hover:text-primary focus-visible:underline focus-visible:outline-none"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                        {row.brandMode}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel
            title="Deck activity"
            description="Decks created per day, last 30 days"
          >
            <BarSeries data={d.decksPerDay ?? []} emptyText="No decks created in the last 30 days." />
          </Panel>

          <div className="grid gap-8 md:grid-cols-2 [&>*]:min-w-0">
            <Panel title="Decks by status">
              <Breakdown rows={d.decksByStatus ?? []} />
            </Panel>
            <Panel title="Decks by brand">
              <Breakdown rows={d.decksByBrandMode ?? []} />
            </Panel>
          </div>

          <Panel
            title="Content inventory"
            description="Everything people have built, with what was added in the last 30 days"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-2 font-medium">Area</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Total</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Last 30 days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(d.buildSurfaces ?? []).map((s) => {
                  const href = SURFACE_LINKS[s.key];
                  return (
                    <tr key={s.key} className="hover:bg-muted/60">
                      <td className="px-4 py-2.5">
                        {href ? (
                          <Link
                            to={href}
                            className="font-medium text-foreground hover:text-primary focus-visible:underline focus-visible:outline-none"
                          >
                            {s.label}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">{s.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                        {s.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {s.window > 0 ? `+${s.window.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Right column */}
        <aside className="space-y-8 lg:col-span-4">
          <Panel title="System health" action={<PanelLink to="/admin/ai">Details</PanelLink>}>
            <dl className="divide-y divide-border text-sm">
              <HealthRow
                label="AI success rate"
                value={successRate === null ? "No requests" : `${successRate.toFixed(1)}%`}
              />
              <HealthRow label="Failed AI requests" value={t.aiErrors.toLocaleString()} />
              <HealthRow
                label="Average response time"
                value={t.aiAvgLatencyMs ? `${(t.aiAvgLatencyMs / 1000).toFixed(1)} s` : "No samples"}
              />
              <HealthRow label="AI spend" value={`${t.aiCost.toFixed(2)} credits`} />
              <HealthRow
                label="Experiments running"
                value={`${t.runningExperiments} of ${t.experiments}`}
              />
            </dl>
          </Panel>

          <Panel title="Admin areas">
            <div className="divide-y divide-border">
              {ADMIN_NAV_GROUPS.filter((g) => g.label !== "Overview" || g.items.length > 1).map(
                (g) => (
                  <div key={g.label} className="px-4 py-3">
                    <h3 className="text-xs font-medium text-muted-foreground">{g.label}</h3>
                    <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                      {g.items
                        .filter((i) => i.to !== "/admin")
                        .map((i) => (
                          <li key={i.to}>
                            <Link
                              to={i.to}
                              className="text-sm text-foreground hover:text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                            >
                              {i.label}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

// ─── Building blocks ─────────────────────────────────────────────

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
    >
      {children}
      <ArrowRight size={12} aria-hidden />
    </Link>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function Kpi({ label, value, sub, to }: { label: string; value: number; sub: string; to: string }) {
  return (
    <div className="p-4">
      <Link to={to} className="group block focus-visible:outline-none">
        <dt className="text-xs font-medium text-muted-foreground group-hover:text-primary group-focus-visible:underline">
          {label}
        </dt>
        <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {value.toLocaleString()}
        </dd>
        <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd>
      </Link>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s.includes("publish") || s.includes("approved") || s.includes("final")
      ? "border-primary/30 bg-primary/10 text-foreground"
      : s.includes("error") || s.includes("reject")
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-foreground";
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-xs capitalize ${cls}`}>
      {status}
    </span>
  );
}

function Breakdown({ rows }: { rows: Array<{ label: string; count: number }> }) {
  if (rows.length === 0) return <Empty>No data yet.</Empty>;
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;
  return (
    <ul className="space-y-3 px-4 py-4">
      {rows.slice(0, 6).map((r) => {
        const pct = (r.count / total) * 100;
        return (
          <li key={r.label}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate capitalize text-foreground">{r.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{r.count}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function BarSeries({
  data,
  emptyText,
}: {
  data: Array<{ date: string; count: number }>;
  emptyText: string;
}) {
  const total = data.reduce((a, x) => a + x.count, 0);
  if (data.length === 0 || total === 0) return <Empty>{emptyText}</Empty>;
  const max = Math.max(1, ...data.map((x) => x.count));
  return (
    <div className="px-4 py-4">
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`${total} in total, peak ${max} per day`}>
        {data.map((x) => (
          <div
            key={x.date}
            title={`${x.date}: ${x.count}`}
            className="flex-1 rounded-t-sm bg-primary/80"
            style={{ height: `${Math.max(2, (x.count / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{total} total · peak {max}/day</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading command center…</span>
      <div className="h-20 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="h-96 animate-pulse rounded-lg bg-muted lg:col-span-8 motion-reduce:animate-none" />
        <div className="h-96 animate-pulse rounded-lg bg-muted lg:col-span-4 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
