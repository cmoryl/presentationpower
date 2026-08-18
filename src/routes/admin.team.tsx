import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getTeamOverview, type TeamFileKind } from "@/lib/admin-team.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { AdminPageHeader, AdminLoading } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/team")({
  component: TeamView,
  head: () => ({
    meta: [
      { title: "Team workspace · Admin" },
      {
        name: "description",
        content:
          "Super-admin roll-up of every deck, slide, module, print asset, and surface created across the team.",
      },
      { property: "og:title", content: "Team workspace · Admin" },
      {
        property: "og:description",
        content: "See what every teammate has created and saved across the workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const KINDS: { key: TeamFileKind | "all"; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "deck", label: "Decks" },
  { key: "slide", label: "Slides" },
  { key: "module", label: "Modules" },
  { key: "print", label: "Print" },
  { key: "surface", label: "Surfaces" },
];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function TeamView() {
  const fn = useServerFn(getTeamOverview);
  const q = useQuery({ queryKey: ["admin", "team"], queryFn: () => fn(), retry: false });
  const [kind, setKind] = useState<TeamFileKind | "all">("all");
  const [owner, setOwner] = useState<string>("all");
  const [search, setSearch] = useState("");

  const labelFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of q.data?.members ?? []) {
      map.set(m.userId, m.displayName || m.email || m.userId.slice(0, 8));
    }
    return map;
  }, [q.data]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (q.data?.files ?? []).filter((f) => {
      if (kind !== "all" && f.kind !== kind) return false;
      if (owner !== "all" && f.ownerId !== owner) return false;
      if (!needle) return true;
      const who = f.ownerId ? (labelFor.get(f.ownerId) ?? "") : "";
      return `${f.title} ${f.subtitle ?? ""} ${who}`.toLowerCase().includes(needle);
    });
  }, [q.data, kind, owner, search, labelFor]);

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;
  if (q.isLoading) return <AdminLoading />;
  if (q.error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Governance" title="Team workspace" />
        <p className="text-sm text-destructive">{(q.error as Error).message}</p>
      </div>
    );
  }

  const data = q.data!;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Governance"
        title="Team workspace"
        description="Every deck, slide, module, print asset, and surface created by your team — grouped by owner."
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur">
          <div className="text-2xl font-semibold">{data.members.length}</div>
          <div className="text-xs uppercase tracking-wide text-black/50">Members</div>
        </div>
        {KINDS.filter((k) => k.key !== "all").map((k) => (
          <div
            key={k.key}
            className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur"
          >
            <div className="text-2xl font-semibold">{data.totals[k.key as TeamFileKind]}</div>
            <div className="text-xs uppercase tracking-wide text-black/50">{k.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white/70 p-6 backdrop-blur">
        <h2 className="text-lg font-semibold">People</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-black/50">
              <tr>
                <th className="py-2">Member</th>
                <th className="py-2">Roles</th>
                <th className="py-2">Last sign-in</th>
                {KINDS.filter((k) => k.key !== "all").map((k) => (
                  <th key={k.key} className="py-2 text-right">
                    {k.label}
                  </th>
                ))}
                <th className="py-2 text-right">Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.userId} className="border-t border-black/5">
                  <td className="py-2">
                    <div className="font-medium">{m.displayName || m.email || m.userId}</div>
                    {m.displayName && m.email ? (
                      <div className="text-xs text-black/50">{m.email}</div>
                    ) : null}
                  </td>
                  <td className="py-2 text-xs text-black/60">{m.roles.join(", ") || "user"}</td>
                  <td className="py-2 text-xs text-black/60">
                    {m.lastSignInAt ? fmtDate(m.lastSignInAt) : "—"}
                  </td>
                  {KINDS.filter((k) => k.key !== "all").map((k) => (
                    <td key={k.key} className="py-2 text-right tabular-nums">
                      {m.counts[k.key as TeamFileKind]}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold tabular-nums">{m.total}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setOwner(m.userId);
                        setKind("all");
                      }}
                      className="rounded-lg border border-black/15 px-2 py-1 text-xs hover:bg-black/5"
                    >
                      View files
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white/70 p-6 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">All creations</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All members</option>
              {data.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName || m.email || m.userId.slice(0, 8)}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder="Search titles or people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[220px] rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              aria-pressed={kind === k.key}
              className={`rounded-full border px-3 py-1 text-xs ${
                kind === k.key
                  ? "border-transparent bg-black text-white"
                  : "border-black/15 hover:bg-black/5"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-black/50">
              <tr>
                <th className="py-2">Title</th>
                <th className="py-2">Type</th>
                <th className="py-2">Owner</th>
                <th className="py-2">Status</th>
                <th className="py-2">Updated</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={`${f.kind}-${f.id}`} className="border-t border-black/5">
                  <td className="py-2">
                    <div className="font-medium">{f.title}</div>
                    {f.subtitle ? <div className="text-xs text-black/50">{f.subtitle}</div> : null}
                  </td>
                  <td className="py-2 text-xs uppercase tracking-wide text-black/60">{f.kind}</td>
                  <td className="py-2 text-xs text-black/70">
                    {f.ownerId ? (labelFor.get(f.ownerId) ?? f.ownerId.slice(0, 8)) : "—"}
                  </td>
                  <td className="py-2 text-xs text-black/60">{f.status ?? "—"}</td>
                  <td className="py-2 text-xs text-black/60">{fmtDate(f.updatedAt)}</td>
                  <td className="py-2 text-right">
                    <Link
                      to={f.href}
                      className="rounded-lg border border-black/15 px-2 py-1 text-xs hover:bg-black/5"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-black/50">
                    Nothing matches those filters yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
