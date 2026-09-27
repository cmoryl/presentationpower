// /admin/usage — who is building what, with which tools, and where the
// records have gaps. Admin-only; counts come from real records only.

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { AdminLoading, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { getUsageReport, USAGE_SOURCES, type UsageReport } from "@/lib/usage-report.functions";

const TITLE = "Usage report · Admin · TransPerfect Element";
const DESC =
  "See who builds decks, print, social, kiosks and modules, which tools they use, and where usage records are missing.";

export const Route = createFileRoute("/admin/usage")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsageView,
});

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
];

function csv(report: UsageReport) {
  const head = ["Email", "Name", "Roles", "Last sign-in", "Last active", ...USAGE_SOURCES.map((s) => s.label), "Total"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = report.people.map((p) => [
    p.email,
    p.name,
    p.roles.join(" "),
    p.lastSignIn,
    p.lastActive,
    ...USAGE_SOURCES.map((s) => p.counts[s.key]),
    p.total,
  ]);
  const text = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `element-usage-${report.days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function UsageView() {
  const [days, setDays] = useState(30);
  const [role, setRole] = useState("all");
  const [showIdle, setShowIdle] = useState(false);
  const load = useServerFn(getUsageReport);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "usage", days],
    queryFn: () => load({ data: { days } }),
    retry: false,
  });

  const people = useMemo(
    () =>
      (data?.people ?? []).filter(
        (p) => (role === "all" || p.roles.includes(role) || (role === "no role" && !p.roles.length)) && (showIdle || p.total > 0),
      ),
    [data, role, showIdle],
  );

  if (error && isForbidden(error)) return <AdminForbidden />;

  const activeCount = (data?.people ?? []).filter((p) => p.total > 0).length;
  const gaps = (data?.sources ?? []).filter((s) => s.total === 0);
  const unattributed = (data?.sources ?? []).filter((s) => s.unattributed > 0);
  const maxDay = Math.max(1, ...(data?.perDay ?? []).map((d) => d.count));

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <AdminPageHeader
        eyebrow="Governance"
        title="Usage report"
        description="Who builds what, with which tools. Every figure comes from a saved record."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                aria-pressed={days === r.days}
                onClick={() => setDays(r.days)}
                className={`rounded-md px-3 py-1.5 text-xs ${
                  days === r.days ? "bg-primary text-primary-foreground" : "border border-black/15 text-black/70 hover:bg-black/5"
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              disabled={!data}
              onClick={() => data && csv(data)}
              className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-xs text-black/80 hover:bg-black/5 disabled:opacity-50"
            >
              <Download size={13} /> Download spreadsheet
            </button>
          </div>
        }
      />

      {isLoading || !data ? (
        <AdminLoading label="Building the report…" />
      ) : (
        <div className="space-y-8">
          <dl className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "People with access", value: data.people.length },
              { label: "Active in period", value: activeCount },
              { label: "Records in period", value: data.sources.reduce((n, s) => n + s.total, 0) },
              { label: "Sources with no records", value: gaps.length },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-black/10 bg-white p-4">
                <dt className="text-xs font-medium text-black/60">{s.label}</dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>

          <AdminSection eyebrow="Activity" title="Records per day">
            <div className="flex h-28 items-end gap-px" role="img" aria-label="Records saved per day">
              {data.perDay.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.count}`}
                  className="flex-1 rounded-t-sm bg-primary"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 2 : 0 }}
                />
              ))}
            </div>
          </AdminSection>

          <AdminSection eyebrow="Tools" title="What gets used">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs text-black/60">
                  <th className="py-2">Tool</th>
                  <th className="py-2 text-right">Records</th>
                  <th className="py-2 text-right">No person attached</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={s.key} className="border-b border-black/5">
                    <td className="py-2">{s.label}</td>
                    <td className="py-2 text-right tabular-nums">{s.total || "None recorded"}</td>
                    <td className="py-2 text-right tabular-nums text-black/60">{s.unattributed || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminSection>

          <AdminSection eyebrow="Roles" title="Usage by role">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs text-black/60">
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3 text-right">People</th>
                    <th className="py-2 pr-3 text-right">Active</th>
                    {USAGE_SOURCES.map((s) => (
                      <th key={s.key} className="py-2 pr-3 text-right whitespace-nowrap">{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.byRole.map((r) => (
                    <tr key={r.role} className="border-b border-black/5">
                      <td className="py-2 pr-3 font-medium">{r.role.replace("_", " ")}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.people}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.active}</td>
                      {USAGE_SOURCES.map((s) => (
                        <td key={s.key} className="py-2 pr-3 text-right tabular-nums">{r.counts[s.key] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSection>

          <AdminSection eyebrow="People" title="Usage by person">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-black/70">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                >
                  <option value="all">All roles</option>
                  {data.byRole.map((r) => (
                    <option key={r.role} value={r.role}>{r.role.replace("_", " ")}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showIdle} onChange={(e) => setShowIdle(e.target.checked)} />
                <span className="text-black/70">Include people with no activity</span>
              </label>
              <span className="ml-auto text-xs text-black/60">{people.length} shown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs text-black/60">
                    <th className="py-2 pr-3">Person</th>
                    <th className="py-2 pr-3">Roles</th>
                    <th className="py-2 pr-3">Last active</th>
                    {USAGE_SOURCES.map((s) => (
                      <th key={s.key} className="py-2 pr-3 text-right whitespace-nowrap">{s.label}</th>
                    ))}
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id} className="border-b border-black/5 align-top">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{p.name || p.email}</div>
                        {p.name && <div className="text-xs text-black/60">{p.email}</div>}
                      </td>
                      <td className="py-2 pr-3 text-xs text-black/70">{p.roles.join(", ") || "none"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-black/70">
                        {p.lastActive ? new Date(p.lastActive).toLocaleDateString() : "—"}
                      </td>
                      {USAGE_SOURCES.map((s) => (
                        <td key={s.key} className="py-2 pr-3 text-right tabular-nums">{p.counts[s.key] || "—"}</td>
                      ))}
                      <td className="py-2 text-right font-semibold tabular-nums">{p.total}</td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr>
                      <td colSpan={USAGE_SOURCES.length + 4} className="py-6 text-center text-black/60">
                        No one matches this filter in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </AdminSection>

          <AdminSection eyebrow="Audit" title="Gaps in the records">
            <ul className="list-disc space-y-1 pl-5 text-sm text-black/80">
              {gaps.map((g) => (
                <li key={g.key}>{g.label}: nothing recorded in this period.</li>
              ))}
              {unattributed.map((s) => (
                <li key={s.key}>
                  {s.label}: {s.unattributed} of {s.total} records have no person attached.
                </li>
              ))}
              <li>AI requests only started recording on 27 Sept 2026; earlier requests are not counted.</li>
              <li>Opening a page is not recorded, so time spent in each editor can't be shown.</li>
              {gaps.length === 0 && unattributed.length === 0 && <li>Every tool recorded activity with a person attached.</li>}
            </ul>
          </AdminSection>
        </div>
      )}
    </div>
  );
}
