import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useOracleBrain, type OracleKnowledgeEntry } from "@/hooks/useOracleBrain";

// Organization id of the imported BrandHub snapshot. The seed rows are scoped to this org.
const IMPORTED_ORG_ID = "ec180296-dfe8-4345-869e-66b524e0a12c";

type BrandIntelRow = {
  id: string;
  organization_id: string | null;
  entity_type: string;
  entity_id: string;
  brand_summary: string | null;
  market_position: string | null;
  target_audience: Record<string, unknown> | null;
  competitive_advantages: unknown;
  competitive_landscape: unknown;
  brand_voice_profile: Record<string, unknown> | null;
  growth_recommendations: unknown;
  cultural_insights: Record<string, unknown> | null;
  knowledge_entries: unknown;
  updated_at: string;
};

export const Route = createFileRoute("/knowledge/oracle")({
  head: () => ({
    meta: [
      { title: "Oracle intelligence · TransPerfect Element" },
      {
        name: "description",
        content:
          "Imported BrandHub Oracle synthesis: org strategy, unified voice, cultural readiness, and per-entity brand intelligence.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell>
      <div
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
      >
        {error.message}
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="text-sm text-black/60">Oracle data not found.</div>
    </AppShell>
  ),
  component: OracleView,
});

type Tab = "overview" | "knowledge" | "brands";

function OracleView() {
  const { intelligence, knowledge, isLoading } = useOracleBrain(IMPORTED_ORG_ID);
  const [tab, setTab] = useState<Tab>("overview");
  const [q, setQ] = useState("");

  const brands = useQuery({
    queryKey: ["brand_intelligence", IMPORTED_ORG_ID],
    queryFn: async () => {
      const { data, error } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (
                k: string,
                v: string,
              ) => {
                order: (
                  c: string,
                  o: { ascending: boolean },
                ) => Promise<{ data: BrandIntelRow[] | null; error: Error | null }>;
              };
            };
          };
        }
      )
        .from("brand_intelligence")
        .select("*")
        .eq("organization_id", IMPORTED_ORG_ID)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BrandIntelRow[];
    },
  });

  const filteredKnowledge = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return knowledge;
    return knowledge.filter(
      (k) =>
        k.title.toLowerCase().includes(s) ||
        k.content.toLowerCase().includes(s) ||
        k.tags.some((t) => t.toLowerCase().includes(s)),
    );
  }, [knowledge, q]);

  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">
            Oracle intelligence
          </div>
          <h1 className="mt-3 text-4xl font-semibold">Imported BrandHub synthesis</h1>
          <p className="mt-3 max-w-2xl text-black/60">
            Read-only snapshot of the organization-level Oracle: strategic recommendations, unified
            voice, cultural readiness, {knowledge.length} knowledge entries, and{" "}
            {brands.data?.length ?? 0} per-entity brand intelligence records.
          </p>
        </div>
        <Link
          to="/knowledge"
          className="rounded-full border border-black/15 px-4 py-2.5 text-sm text-black/70 hover:border-black/40"
        >
          ← Division knowledge
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["knowledge", `Knowledge base · ${knowledge.length}`],
            ["brands", `Brand intelligence · ${brands.data?.length ?? 0}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              tab === id
                ? "border-[#05041A] bg-[#05041A] text-white"
                : "border-black/15 bg-white text-black/70 hover:border-black/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <div className="mt-8 text-sm text-black/60">Loading Oracle synthesis…</div>}

      {tab === "overview" && intelligence && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Organization summary" accent="#0B2A4A">
            <p className="text-sm leading-relaxed text-black/80">{intelligence.org_summary}</p>
          </Panel>

          <Panel title="Strategic recommendations" accent="#E85A2C">
            <ul className="space-y-3">
              {(
                intelligence.strategic_recommendations as Array<Record<string, unknown>> | null
              )?.map((r, i) => (
                <li key={i} className="rounded-lg border border-black/10 p-3">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em]">
                    <span className="text-black/50">
                      {String(r.recommendation ?? r.title ?? `Rec ${i + 1}`)}
                    </span>
                    <span className={priorityCls(String(r.priority ?? "medium"))}>
                      {String(r.priority ?? "medium")}
                    </span>
                  </div>
                  {r.rationale ? (
                    <div className="mt-2 text-xs text-black/60">{String(r.rationale)}</div>
                  ) : null}
                  {r.impact ? (
                    <div className="mt-1 text-xs text-emerald-800">Impact: {String(r.impact)}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Unified voice profile" accent="#2C7A5A">
            <KVList data={intelligence.unified_voice_profile as Record<string, unknown> | null} />
          </Panel>

          <Panel title="Unified audience map" accent="#7A2C5A">
            <KVList data={intelligence.unified_audience_map as Record<string, unknown> | null} />
          </Panel>

          <Panel title="Cultural readiness" accent="#5A2C7A">
            <KVList
              data={intelligence.cultural_readiness as Record<string, unknown> | null}
              only={["overall_score", "strongest_markets", "expansion_opportunities"]}
            />
          </Panel>

          <Panel title="Portfolio analysis" accent="#B36A00">
            <KVList data={intelligence.portfolio_analysis as Record<string, unknown> | null} />
          </Panel>

          <Panel title="Market landscape" accent="#0B4A2A">
            <KVList data={intelligence.market_landscape as Record<string, unknown> | null} />
          </Panel>

          <Panel title="Competitive overview" accent="#4A0B2A">
            <KVList data={intelligence.competitive_overview as Record<string, unknown> | null} />
          </Panel>
        </div>
      )}

      {tab === "knowledge" && (
        <div className="mt-6">
          <input
            type="search"
            placeholder="Search knowledge entries…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/40"
          />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredKnowledge.map((k) => (
              <KnowledgeCard key={k.id} entry={k} />
            ))}
            {!isLoading && filteredKnowledge.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/40">
                No matching entries.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "brands" && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {brands.isLoading && <div className="text-sm text-black/60">Loading…</div>}
          {(brands.data ?? []).map((b) => (
            <BrandCard key={b.id} row={b} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Panel({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="text-xs uppercase tracking-[0.25em]" style={{ color: accent }}>
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function KVList({ data, only }: { data: Record<string, unknown> | null; only?: string[] }) {
  if (!data) return <div className="text-xs text-black/40">—</div>;
  const entries = Object.entries(data).filter(([k]) => (only ? only.includes(k) : true));
  return (
    <dl className="space-y-2 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[140px_1fr] gap-3">
          <dt className="text-[11px] uppercase tracking-widest text-black/50">
            {k.replace(/_/g, " ")}
          </dt>
          <dd className="text-black/80">{renderValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderValue(v: unknown): React.ReactNode {
  if (v == null) return <span className="text-black/30">—</span>;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return (
      <ul className="list-disc space-y-0.5 pl-4">
        {v.map((item, i) => (
          <li key={i} className="text-black/80">
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <pre className="whitespace-pre-wrap rounded bg-black/[0.04] p-2 text-[11px] text-black/70">
      {JSON.stringify(v, null, 2)}
    </pre>
  );
}

function priorityCls(p: string) {
  const s = p.toLowerCase();
  if (s === "high") return "text-red-700";
  if (s === "medium") return "text-amber-700";
  return "text-black/50";
}

function KnowledgeCard({ entry }: { entry: OracleKnowledgeEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em]">
        <span className="text-[#0B2A4A]">{entry.content_type}</span>
        <span className="text-black/40">{entry.source_type}</span>
      </div>
      <div className="mt-2 text-base font-semibold text-black">{entry.title}</div>
      <div className={`mt-1 text-xs text-black/70 ${open ? "" : "line-clamp-3"}`}>
        {entry.content}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {entry.tags.slice(0, 6).map((t) => (
          <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/60">
            #{t}
          </span>
        ))}
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 text-xs font-medium text-[#003FC7] hover:underline"
      >
        {open ? "Collapse" : "Expand"}
      </button>
    </div>
  );
}

function BrandCard({ row }: { row: BrandIntelRow }) {
  const [open, setOpen] = useState(false);
  const voice = row.brand_voice_profile ?? {};
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em]">
        <span className="text-[#0B2A4A]">{row.entity_type}</span>
        <span className="text-black/40">{row.entity_id.slice(0, 8)}</span>
      </div>
      {row.brand_summary && <p className="mt-2 text-sm text-black/80">{row.brand_summary}</p>}
      {row.market_position && (
        <p className="mt-2 text-xs text-black/60">
          <span className="font-semibold text-black/70">Market position: </span>
          {row.market_position}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(voice).map(([k, v]) =>
          typeof v === "string" ? (
            <span key={k} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/60">
              {k}: {v}
            </span>
          ) : null,
        )}
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-black/10 pt-3">
          <KVList
            data={{
              target_audience: row.target_audience,
              competitive_advantages: row.competitive_advantages,
              competitive_landscape: row.competitive_landscape,
              growth_recommendations: row.growth_recommendations,
              cultural_insights: row.cultural_insights,
            }}
          />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 text-xs font-medium text-[#003FC7] hover:underline"
      >
        {open ? "Hide details" : "Show details"}
      </button>
    </div>
  );
}
