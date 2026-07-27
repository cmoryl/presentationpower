import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  listKnowledgeEntries,
  KNOWLEDGE_KIND_META,
  type KnowledgeEntry,
  type KnowledgeKind,
} from "@/lib/knowledge.functions";

export const Route = createFileRoute("/knowledge/")({
  head: () => ({
    meta: [
      { title: "Knowledge · TransPerfect Modular" },
      { name: "description", content: "Per-division knowledge with cross-division sharing." },
    ],
  }),
  component: KnowledgeView,
});

function KnowledgeView() {
  const list = useServerFn(listKnowledgeEntries);
  const navigate = useNavigate();
  const [divisionId, setDivisionId] = useState<string>(BRAND_MODES[0]?.id ?? "bm-enterprise");
  const [includeShared, setIncludeShared] = useState(true);
  const [includeGlobal, setIncludeGlobal] = useState(true);
  const [kind, setKind] = useState<KnowledgeKind | "all">("all");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");

  const entries = useQuery({
    queryKey: ["knowledge", divisionId, includeShared, includeGlobal, kind, search, tag],
    queryFn: () =>
      list({
        data: {
          divisionId,
          includeShared,
          includeGlobal,
          kind: kind === "all" ? undefined : kind,
          search: search || undefined,
          tag: tag || undefined,
        },
      }),
  });

  const rows: KnowledgeEntry[] = entries.data ?? [];
  const owned = rows.filter((r) => r.owner_division_id === divisionId);
  const shared = rows.filter(
    (r) => r.owner_division_id !== divisionId && r.visibility === "shared",
  );
  const global_ = rows.filter(
    (r) => r.owner_division_id !== divisionId && r.visibility === "global",
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [rows]);

  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">Knowledge</div>
          <h1 className="mt-3 text-4xl font-semibold">Division knowledge base</h1>
          <p className="mt-3 max-w-2xl text-black/60">
            Each division owns its own entries. Mark an entry <em>shared</em> to make it visible to
            specific sibling divisions, or <em>global</em> to publish it across all of TransPerfect.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={"/knowledge/oracle" as never}
            className="rounded-full border border-black/15 px-4 py-2.5 text-sm text-black/70 hover:border-black/40"
          >
            Oracle intelligence
          </Link>
          <button
            onClick={() => navigate({ to: "/knowledge/new" as never })}
            className="rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#03002C]/90"
          >
            + New entry
          </button>
        </div>
      </div>

      {/* Division tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {BRAND_MODES.map((b) => {
          const active = b.id === divisionId;
          const count = rows.filter((r) => r.owner_division_id === b.id).length;
          return (
            <button
              key={b.id}
              onClick={() => setDivisionId(b.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-[#05041A] bg-[#05041A] text-white"
                  : "border-black/15 bg-white text-black/70 hover:border-black/30"
              }`}
              style={active ? { backgroundColor: b.tokens.primary } : undefined}
            >
              {b.name}
              {count > 0 && (
                <span className={`ml-2 text-xs ${active ? "opacity-80" : "opacity-50"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm">
        <input
          type="search"
          aria-label="Search knowledge entries"
          placeholder="Search title + body…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded border border-black/15 px-3 py-1.5"
        />
        <select
          aria-label="Filter by knowledge kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as KnowledgeKind | "all")}
          className="rounded border border-black/15 bg-white px-2 py-1.5"
        >
          <option value="all">All kinds</option>
          {Object.entries(KNOWLEDGE_KIND_META).map(([k, m]) => (
            <option key={k} value={k}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="rounded border border-black/15 bg-white px-2 py-1.5"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-black/70">
          <input
            type="checkbox"
            checked={includeShared}
            onChange={(e) => setIncludeShared(e.target.checked)}
          />
          Shared to this division
        </label>
        <label className="flex items-center gap-1.5 text-xs text-black/70">
          <input
            type="checkbox"
            checked={includeGlobal}
            onChange={(e) => setIncludeGlobal(e.target.checked)}
          />
          Global
        </label>
      </div>

      {entries.isLoading && <div className="mt-8 text-sm text-black/60">Loading…</div>}
      {entries.error && (
        <div className="mt-8 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {(entries.error as Error).message}
        </div>
      )}

      {!entries.isLoading && (
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <EntryColumn
            title="Owned by this division"
            hint="Editable by this division"
            items={owned}
            accent="#0B2A4A"
          />
          <EntryColumn
            title="Shared into this division"
            hint="Owned elsewhere · shared here"
            items={shared}
            accent="#E85A2C"
          />
          <EntryColumn
            title="Global"
            hint="Available company-wide"
            items={global_}
            accent="#2C7A5A"
          />
        </div>
      )}
    </AppShell>
  );
}

function EntryColumn({
  title,
  hint,
  items,
  accent,
}: {
  title: string;
  hint: string;
  items: KnowledgeEntry[];
  accent: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em]" style={{ color: accent }}>
            {title}
          </div>
          <div className="text-xs text-black/50">{hint}</div>
        </div>
        <div className="text-xs text-black/50">{items.length}</div>
      </div>
      <div className="mt-3 space-y-3">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-xs text-black/40">
            No entries.
          </div>
        )}
        {items.map((entry) => (
          <EntryCard key={entry.id} entry={entry} accent={accent} />
        ))}
      </div>
    </div>
  );
}

function EntryCard({ entry, accent }: { entry: KnowledgeEntry; accent: string }) {
  const owner = BRAND_MODES.find((b) => b.id === entry.owner_division_id);
  const kindMeta = KNOWLEDGE_KIND_META[entry.kind];
  const expired = entry.expires_at ? new Date(entry.expires_at) < new Date() : false;
  const isSource = entry.kind === "source_deck" || entry.kind === "source_pdf";

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em]">
        <span style={{ color: accent }}>{kindMeta.label}</span>
        <span className="text-black/40">{owner?.name}</span>
      </div>
      <div className="mt-2 text-base font-semibold text-black">{entry.title}</div>
      {entry.body && <div className="mt-1 line-clamp-2 text-xs text-black/60">{entry.body}</div>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {entry.tags.slice(0, 4).map((t) => (
          <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/60">
            #{t}
          </span>
        ))}
        {entry.visibility === "global" && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">
            Global
          </span>
        )}
        {entry.visibility === "shared" && entry.shared_with_division_ids.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
            Shared · {entry.shared_with_division_ids.length}
          </span>
        )}
        {expired && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-800">
            Expired
          </span>
        )}
        {isSource && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800">
            Uploaded source
          </span>
        )}
      </div>
    </>
  );

  if (isSource) {
    return (
      <Link
        to={"/admin/knowledge" as never}
        className="block rounded-xl border border-sky-200 bg-sky-50/40 p-4 hover:border-sky-400"
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link
      to={"/knowledge/$entryId" as never}
      params={{ entryId: entry.id } as never}
      className="block rounded-xl border border-black/10 bg-white p-4 hover:border-black/25"
    >
      {inner}
    </Link>
  );
}
