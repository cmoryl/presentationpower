import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import { listClientLogos, type ClientLogoRow } from "@/lib/client-logos.functions";
import { useSessionUser } from "@/hooks/use-session-user";

export const Route = createFileRoute("/logohub")({
  component: LogoHubBrowse,
  head: () => ({
    meta: [
      { title: "LogoHub — TransPerfect client logo repository" },
      {
        name: "description",
        content:
          "Central library of client logos used across TransPerfect decks, case studies and briefs. Search by industry, division or tag.",
      },
      { property: "og:title", content: "LogoHub — Client logo repository" },
      {
        property: "og:description",
        content: "Central library of TransPerfect client logos across all divisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LogoHubBrowse() {
  const listFn = useServerFn(listClientLogos);
  const userId = useSessionUser();
  const q = useQuery({
    queryKey: ["logohub", "public"],
    queryFn: () => listFn().catch(() => []),
    retry: false,
  });
  const signedOut = userId === null;
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState<string>("all");

  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const r of q.data ?? []) if (r.industry) set.add(r.industry);
    return Array.from(set).sort();
  }, [q.data]);
  const [industry, setIndustry] = useState<string>("all");

  const filtered = useMemo(() => {
    const rows = q.data ?? [];
    return rows.filter((r) => {
      if (division !== "all" && (r.division_id ?? "master") !== division) return false;
      if (industry !== "all" && r.industry !== industry) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        const hay = [r.client_name, r.slug, r.industry ?? "", ...(r.tags ?? [])]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [q.data, division, industry, search]);

  return (
    <AppShell>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Repository</div>
        <h1 className="mt-2 text-4xl font-semibold">LogoHub</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          Every client logo we use — primary, on-dark, on-light and mono variants — searchable by
          industry, division and tag.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm md:col-span-2"
        />
        <select
          aria-label="Division"
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All divisions</option>
          <option value="master">TransPerfect (master)</option>
          {BRAND_MODES.filter((b) => b.id !== "master").map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 text-xs text-black/50">
        {q.isLoading ? "Loading…" : `${filtered.length} of ${(q.data ?? []).length} clients`}
      </div>

      {!q.isLoading && filtered.length === 0 ? (
        signedOut ? (
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-8 text-center">
            <div className="text-sm font-semibold text-black/70">Sign in to browse LogoHub</div>
            <p className="mx-auto mt-2 max-w-sm text-sm text-black/50">
              Client logos are only available to signed-in TransPerfect users.
            </p>
            <Link
              to="/auth"
              className="mt-4 inline-flex items-center rounded-lg bg-[#003FC7] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-8 text-center text-sm text-black/50">
            No logos match those filters.{" "}
            <Link to="/admin/logohub" className="underline">
              Add one in the admin console.
            </Link>
          </div>
        )
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r) => (
            <LogoCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

const VARIANT_KEYS = [
  { key: "primary", label: "Primary", urlField: "primaryUrl" },
  { key: "light", label: "Light", urlField: "lightUrl" },
  { key: "dark", label: "Dark", urlField: "darkUrl" },
  { key: "mono", label: "Mono", urlField: "monoUrl" },
] as const;

function LogoCard({ row }: { row: ClientLogoRow }) {
  const available = VARIANT_KEYS.filter((v) => {
    const url = row[v.urlField];
    return typeof url === "string" && url.length > 0;
  });
  const initial = available[0]?.key ?? "primary";
  const [active, setActive] = useState<string>(initial);
  const activeUrl = row[VARIANT_KEYS.find((v) => v.key === active)?.urlField ?? "primaryUrl"];
  const isDark = active === "dark";

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div
        className="flex h-28 w-full items-center justify-center rounded-lg transition-colors"
        style={{ backgroundColor: isDark ? "#03002C" : "#F5F7FB" }}
      >
        {activeUrl ? (
          <img
            src={activeUrl}
            alt={`${row.client_name} logo (${active})`}
            className="max-h-24 max-w-[80%] object-contain"
          />
        ) : (
          <span className="text-xs text-black/40">no preview</span>
        )}
      </div>
      <div className="mt-3 truncate text-sm font-semibold">{row.client_name}</div>
      <div className="mt-0.5 text-[11px] text-black/50">
        {row.industry ?? "—"}
        {row.division_id &&
          ` · ${BRAND_MODES.find((b) => b.id === row.division_id)?.name ?? row.division_id}`}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {VARIANT_KEYS.map((v) => {
          const url = row[v.urlField];
          const has = typeof url === "string" && url.length > 0;
          const isActive = v.key === active;
          return (
            <button
              key={v.key}
              type="button"
              disabled={!has}
              onClick={() => setActive(v.key)}
              className={
                "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest transition " +
                (isActive
                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                  : has
                    ? "border-black/10 text-black/60 hover:border-[#003FC7]/40 hover:text-[#003FC7]"
                    : "cursor-not-allowed border-black/5 text-black/25")
              }
              title={has ? `Preview ${v.label} variant` : `No ${v.label} variant uploaded`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      {activeUrl && (
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[11px] text-[#003FC7] hover:underline"
        >
          Open {active} file ↗
        </a>
      )}
      {row.tags?.length ? (
        <div className="mt-2 line-clamp-2 text-[11px] text-black/50">{row.tags.join(" · ")}</div>
      ) : null}
    </div>
  );
}
