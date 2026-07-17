import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MyCloudDecks } from "@/components/CloudDeckControls";
import { useDeckStore, type Deck } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";

import { BRAND_MODES, MODULE_FAMILIES, MODULE_VARIANTS, SECTION_FRAMEWORKS, LAYOUT_FRAMEWORKS, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransPerfect Modular · On-Demand Enablement" },
      { name: "description", content: "Modular slide directory and AI deck assembly for TransPerfect sales enablement." },
      { property: "og:title", content: "TransPerfect Modular · On-Demand Enablement" },
      { property: "og:description", content: "Modular slide directory and AI deck assembly for TransPerfect sales enablement." },
    ],
  }),
  component: Dashboard,
});

type SortKey = "recent" | "title" | "size";
type ViewMode = "grid" | "list";

function Dashboard() {
  const decksMap = useDeckStore((s) => s.decks);
  const briefs = useDeckStore((s) => s.briefs);
  const deleteDeck = useDeckStore((s) => s.deleteDeck);

  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<ViewMode>("grid");

  const allDecks = useMemo<Deck[]>(
    () => Object.values(decksMap),
    [decksMap],
  );

  const decks = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = allDecks.filter((d) => {
      if (brandFilter !== "all" && d.brandModeId !== brandFilter) return false;
      if (!q) return true;
      const b = briefs[d.briefId];
      const hay = `${d.title} ${b?.prospect ?? ""} ${b?.industry ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    out = out.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "size") return b.slides.length - a.slides.length;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return out;
  }, [allDecks, briefs, query, brandFilter, sort]);

  // Insights
  const brandBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of allDecks) map.set(d.brandModeId, (map.get(d.brandModeId) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([id, count]) => ({ brand: byId(BRAND_MODES, id) ?? BRAND_MODES[0], count }))
      .sort((a, b) => b.count - a.count);
  }, [allDecks]);

  const totalSlides = useMemo(() => allDecks.reduce((n, d) => n + d.slides.length, 0), [allDecks]);
  const last7 = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return allDecks.filter((d) => new Date(d.createdAt).getTime() >= cutoff).length;
  }, [allDecks]);
  const avgSlides = allDecks.length ? Math.round(totalSlides / allDecks.length) : 0;

  return (
    <AppShell>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[32px] border border-black/10 bg-gradient-to-br from-[#03002C] via-[#0B2A4A] to-[#003FC7] p-10 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#A1FBF9]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#C2A3FF]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.35em] text-[#A1FBF9]">On-Demand Enablement</div>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight">
              Assemble a governed deck in minutes.
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Answer a short brief. The system picks the narrative archetype, the section frameworks, and approved
              module variants — you review, personalize, and export.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/decks/import"
              className="rounded-full border border-white/25 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
            >
              Import PowerPoint
            </Link>
            <Link
              to="/brief/new"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#03002C] shadow-lg shadow-[#003FC7]/30 transition hover:bg-[#A1FBF9]"
            >
              New brief →
            </Link>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Your decks" value={allDecks.length} accent="#003FC7" hint={`${last7} in last 7 days`} />
        <Kpi label="Slides produced" value={totalSlides} accent="#A1FBF9" hint={`${avgSlides} avg per deck`} />
        <Kpi label="Module variants" value={MODULE_VARIANTS.length} accent="#C2A3FF" hint={`${MODULE_FAMILIES.length} families`} />
        <Kpi label="Frameworks" value={SECTION_FRAMEWORKS.length} accent="#FFEB66" hint={`${LAYOUT_FRAMEWORKS.length} layouts`} />
      </div>

      {/* Two-column: Quick actions + Brand distribution */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-black/10 bg-white p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-black/50">Jump in</h3>
            <span className="text-xs text-black/40">Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <QuickTile to="/brief/new" title="Start brief" caption="Guided intake" tone="primary" />
            <QuickTile to="/atlas" title="Atlas" caption="Explore modules" />
            <QuickTile to="/knowledge" title="Knowledge" caption="Oracle + KB" />
            <QuickTile to="/logohub" title="LogoHub" caption="Client logos" />
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-black/50">Brand mix</h3>
            <span className="text-xs text-black/40">{allDecks.length} decks</span>
          </div>
          {brandBreakdown.length === 0 ? (
            <p className="text-sm text-black/50">No decks yet — your brand mix will show here.</p>
          ) : (
            <ul className="space-y-3">
              {brandBreakdown.slice(0, 5).map(({ brand, count }) => {
                const pct = Math.round((count / allDecks.length) * 100);
                return (
                  <li key={brand.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-black/80">{brand.name}</span>
                      <span className="tabular-nums text-black/50">{count} · {pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: brand.tokens.accent }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Decks section */}
      <div className="mt-12">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Your decks</h2>
            <p className="mt-1 text-sm text-black/50">
              {decks.length} of {allDecks.length} shown
            </p>
          </div>
          <Link to="/atlas" className="text-sm text-black/60 hover:text-black">Browse the atlas →</Link>
        </div>

        {/* Toolbar */}
        {allDecks.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/70 p-2 backdrop-blur">
            <div className="relative flex-1 min-w-[220px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search decks, prospects, industries…"
                className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#003FC7]"
              />
            </div>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All brand modes</option>
              {BRAND_MODES.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            >
              <option value="recent">Most recent</option>
              <option value="title">Title A–Z</option>
              <option value="size">Most slides</option>
            </select>
            <div className="flex rounded-xl border border-black/10 bg-white p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === "grid" ? "bg-[#03002C] text-white" : "text-black/60"}`}
              >Grid</button>
              <button
                onClick={() => setView("list")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === "list" ? "bg-[#03002C] text-white" : "text-black/60"}`}
              >List</button>
            </div>
          </div>
        )}

        {allDecks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003FC7]/10 text-2xl">✦</div>
              <h3 className="mt-4 text-xl font-semibold">No decks yet</h3>
              <p className="mt-2 text-sm text-black/60">
                Start with a brief. In under a minute you'll have a governed, on-brand deck ready to personalize.
              </p>
              <Link
                to="/brief/new"
                className="mt-5 inline-flex rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Create your first brief →
              </Link>
            </div>
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-black/60">
            No decks match your filters.
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {decks.map((d) => (
              <DeckCard key={d.id} deck={d} briefIndustry={briefs[d.briefId]?.industry} onDelete={deleteDeck} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            {decks.map((d, i) => {
              const b = briefs[d.briefId];
              const brand = byId(BRAND_MODES, d.brandModeId) ?? BRAND_MODES[0];
              return (
                <div key={d.id} className={`group flex items-center gap-4 p-4 transition hover:bg-black/[0.02] ${i > 0 ? "border-t border-black/5" : ""}`}>
                  <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: brand.tokens.accent }} />
                  <Link to="/decks/$deckId" params={{ deckId: d.id }} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.title}</div>
                    <div className="mt-0.5 truncate text-xs text-black/50">
                      {brand.name} · {d.slides.length} slides · {b?.industry ?? "—"}
                    </div>
                  </Link>
                  <span className="hidden text-xs text-black/40 md:inline">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => { if (confirm(`Delete "${d.title}"?`)) deleteDeck(d.id); }}
                    className="rounded-lg border border-transparent px-2 py-1 text-xs text-black/50 opacity-0 hover:border-red-200 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                  >Delete</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MyCloudDecks />
    </AppShell>
  );
}

function DeckCard({ deck: d, briefIndustry, onDelete }: { deck: Deck; briefIndustry?: string; onDelete: (id: string) => void }) {
  const brand = byId(BRAND_MODES, d.brandModeId) ?? BRAND_MODES[0];
  const cover = d.slides[0];
  const coverVariant = cover ? byId(MODULE_VARIANTS, cover.variantId) : undefined;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-lg">
      <Link to="/decks/$deckId" params={{ deckId: d.id }} className="block">
        <div className="aspect-[16/9] bg-white">
          {cover && coverVariant && (
            <ScaledSlide>
              <VariantRenderer slide={cover} variant={coverVariant} brand={brand} pageNumber={1} />
            </ScaledSlide>
          )}
        </div>
        <div className="border-t border-black/10 p-5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: brand.tokens.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">{brand.name}</span>
          </div>
          <div className="mt-3 line-clamp-2 text-lg font-semibold">{d.title}</div>
          <div className="mt-1 text-sm text-black/60">
            {d.slides.length} slides · {briefIndustry ?? "—"}
          </div>
          <div className="mt-5 text-xs uppercase tracking-widest text-black/40">
            {new Date(d.createdAt).toLocaleString()}
          </div>
        </div>
      </Link>
      <button
        onClick={() => { if (confirm(`Delete "${d.title}"?`)) onDelete(d.id); }}
        className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs text-black/60 opacity-0 shadow ring-1 ring-black/10 transition hover:text-red-700 group-hover:opacity-100"
      >
        Delete
      </button>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: number | string; hint?: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6">
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accent }} />
      <div className="text-[11px] font-semibold uppercase tracking-widest text-black/50">{label}</div>
      <div className="mt-2 text-4xl font-semibold text-[#0B2A4A] tabular-nums">{value}</div>
      {hint && <div className="mt-2 text-xs text-black/45">{hint}</div>}
    </div>
  );
}

function QuickTile({ to, title, caption, tone }: { to: string; title: string; caption: string; tone?: "primary" }) {
  const primary = tone === "primary";
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-xl border p-4 transition ${
        primary
          ? "border-[#003FC7]/30 bg-gradient-to-br from-[#003FC7] to-[#03002C] text-white hover:shadow-lg"
          : "border-black/10 bg-white text-black hover:border-black/25 hover:bg-black/[0.02]"
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className={`mt-1 text-xs ${primary ? "text-white/70" : "text-black/50"}`}>{caption}</div>
      <span className={`absolute right-3 top-3 text-lg transition group-hover:translate-x-0.5 ${primary ? "text-white/70" : "text-black/30"}`}>→</span>
    </Link>
  );
}
