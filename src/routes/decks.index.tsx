import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Rocket, Search, X, Eye, Share2, LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSignedIn } from "@/components/CloudDeckControls";
import { useDeckStore, type Deck } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { getLibraryAnalytics, type DeckAnalyticsSummary } from "@/lib/deck-analytics.functions";
import { deleteCloudDeck, listMyCloudDecks } from "@/lib/cloud-decks.functions";
import { ReviewStatusBadge, type ReviewStatus } from "@/components/ReviewStatusControl";

export const Route = createFileRoute("/decks/")({
  head: () => ({
    meta: [
      { title: "All decks · TransPerfect Modular" },
      { name: "description", content: "Search, sort, and organize every deck in your workspace." },
    ],
  }),
  component: DecksIndex,
});

type SortKey = "recent" | "created" | "alpha" | "views";
type Kind = "all" | "decks" | "templates";
type Reach = "all" | "unseen" | "shared";

function DecksIndex() {
  const decksMap = useDeckStore((s) => s.decks);
  const briefs = useDeckStore((s) => s.briefs);
  const signedIn = useSignedIn();
  const fetchAnalytics = useServerFn(getLibraryAnalytics);
  const fetchCloud = useServerFn(listMyCloudDecks);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [kind, setKind] = useState<Kind>("all");
  const [reach, setReach] = useState<Reach>("all");
  const [analytics, setAnalytics] = useState<DeckAnalyticsSummary | null>(null);
  const [cloudDecks, setCloudDecks] = useState<Array<{ title: string; review_status: string | null }>>([]);

  useEffect(() => {
    if (!signedIn) { setAnalytics(null); setCloudDecks([]); return; }
    fetchAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
    fetchCloud()
      .then((rows) => setCloudDecks(rows.map((r) => ({ title: r.title, review_status: r.review_status ?? null }))))
      .catch(() => setCloudDecks([]));
  }, [signedIn, fetchAnalytics, fetchCloud]);

  const reviewByTitle = useMemo(() => {
    const m = new Map<string, ReviewStatus>();
    const order: ReviewStatus[] = ["approved", "in_review", "changes_requested", "draft"];
    for (const r of cloudDecks) {
      const key = r.title.trim().toLowerCase();
      const rs = (r.review_status ?? "draft") as ReviewStatus;
      const prev = m.get(key);
      if (!prev || order.indexOf(rs) < order.indexOf(prev)) m.set(key, rs);
    }
    return m;
  }, [cloudDecks]);

  // Map local decks to view/share data via title match (best-effort — local
  // deck IDs are nanoids while analytics keys by DB uuid). Multiple same-title
  // decks accumulate views to the max value.
  const statsByTitle = useMemo(() => {
    const m = new Map<string, { views: number; shared: boolean; lastViewedAt: string | null }>();
    for (const s of analytics?.deckStats ?? []) {
      const key = s.title.trim().toLowerCase();
      const prev = m.get(key);
      m.set(key, {
        views: Math.max(prev?.views ?? 0, s.views),
        shared: (prev?.shared ?? false) || Boolean(s.shareToken),
        lastViewedAt: s.lastViewedAt ?? prev?.lastViewedAt ?? null,
      });
    }
    return m;
  }, [analytics]);

  const allDecks = useMemo<Deck[]>(() => Object.values(decksMap), [decksMap]);

  const enriched = useMemo(() => {
    return allDecks.map((d) => {
      const key = d.title.trim().toLowerCase();
      const s = statsByTitle.get(key);
      const brief = briefs[d.briefId];
      return {
        deck: d,
        views: s?.views ?? 0,
        shared: s?.shared ?? false,
        client: brief?.prospect ?? "",
        industry: brief?.industry ?? "",
        reviewStatus: reviewByTitle.get(key) ?? null,
      };
    });
  }, [allDecks, statsByTitle, briefs, reviewByTitle]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = enriched.filter((r) => {
      if (kind === "decks" && r.deck.isTemplate) return false;
      if (kind === "templates" && !r.deck.isTemplate) return false;
      if (reach === "unseen" && r.views > 0) return false;
      if (reach === "shared" && !r.shared) return false;
      if (!needle) return true;
      return (
        r.deck.title.toLowerCase().includes(needle) ||
        r.client.toLowerCase().includes(needle) ||
        r.industry.toLowerCase().includes(needle)
      );
    });
    switch (sort) {
      case "alpha":
        out = out.sort((a, b) => a.deck.title.localeCompare(b.deck.title));
        break;
      case "views":
        out = out.sort((a, b) => b.views - a.views || b.deck.createdAt.localeCompare(a.deck.createdAt));
        break;
      case "created":
        out = out.sort((a, b) => b.deck.createdAt.localeCompare(a.deck.createdAt));
        break;
      case "recent":
      default:
        // "Recent" = createdAt desc; local store has no updatedAt.
        out = out.sort((a, b) => b.deck.createdAt.localeCompare(a.deck.createdAt));
    }
    return out;
  }, [enriched, q, kind, reach, sort]);

  const active = q.trim() !== "" || kind !== "all" || reach !== "all" || sort !== "recent";
  const totalDecks = enriched.filter((r) => !r.deck.isTemplate).length;
  const totalTemplates = enriched.length - totalDecks;
  const totalShared = enriched.filter((r) => r.shared).length;
  const totalUnseen = enriched.filter((r) => r.views === 0 && !r.deck.isTemplate).length;

  const clearAll = () => { setQ(""); setKind("all"); setReach("all"); setSort("recent"); };

  return (
    <AppShell>
      {/* Header */}
      <header className="full-bleed relative -mt-6 mb-8 overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#003FC70a] via-white/70 to-[#C2A3FF22] py-14 sm:-mt-10 lg:py-20 dark:from-white/[0.03] dark:via-white/[0.02] dark:to-white/[0.04] dark:border-white/10">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#003FC7] dark:text-[#A1FBF9]">
                Workspace
              </div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">All decks</h1>
              <p className="mt-2 max-w-xl text-sm text-black/60 dark:text-white/60">
                Every deck and template in your workspace — search by title, client, or industry.
              </p>
            </div>
            <Link
              to="/brief/new"
              className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 dark:bg-[#A1FBF9] dark:text-[#03002C]"
            >
              <Rocket size={14} /> New deck
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatChip label="Decks" value={totalDecks} accent="#003FC7" />
            <StatChip label="Templates" value={totalTemplates} accent="#C2A3FF" />
            <StatChip label="Shared" value={totalShared} accent="#A6FA87" icon={<Share2 size={12} />} />
            <StatChip label="Never viewed" value={totalUnseen} accent="#FFEB66" icon={<Eye size={12} />} />
          </div>
        </div>
      </header>


      {/* Filter bar */}
      <div className="mt-8 rounded-3xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 dark:text-primary-foreground/40" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, client, or industry…"
              className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-9 text-sm outline-none transition placeholder:text-black/35 focus:border-[#003FC7] dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-white/35 dark:focus:border-[#A1FBF9]"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium outline-none dark:border-white/10 dark:bg-white/[0.04]"
            >
              <option value="recent">Recently edited</option>
              <option value="created">Recently created</option>
              <option value="alpha">Alphabetical</option>
              <option value="views">Most viewed</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ChipGroup label="Type">
            <Chip active={kind === "all"} onClick={() => setKind("all")}>All</Chip>
            <Chip active={kind === "decks"} onClick={() => setKind("decks")}>Decks</Chip>
            <Chip active={kind === "templates"} onClick={() => setKind("templates")}>Templates</Chip>
          </ChipGroup>
          <ChipGroup label="Reach">
            <Chip active={reach === "all"} onClick={() => setReach("all")}>All</Chip>
            <Chip active={reach === "unseen"} onClick={() => setReach("unseen")} disabled={!signedIn} title={signedIn ? undefined : "Sign in to sync analytics"}>Never viewed</Chip>
            <Chip active={reach === "shared"} onClick={() => setReach("shared")} disabled={!signedIn} title={signedIn ? undefined : "Sign in to sync analytics"}>Shared</Chip>
          </ChipGroup>
          {active && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/70 hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/10"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-widest text-black/45 dark:text-white/45">
          <LayoutGrid size={12} />
          {filtered.length} of {enriched.length} {enriched.length === 1 ? "deck" : "decks"}
          {!signedIn && <span className="text-black/35 dark:text-white/35">· sign in to enable view analytics</span>}
        </div>
      </div>

      {/* Grid */}
      {enriched.length === 0 ? (
        <EmptyNew />
      ) : filtered.length === 0 ? (
        <EmptyNoMatches onClear={clearAll} />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <DeckTile
              key={r.deck.id}
              deck={r.deck}
              industry={r.industry}
              client={r.client}
              views={r.views}
              shared={r.shared}
              reviewStatus={r.reviewStatus}
            />

          ))}
        </div>
      )}
    </AppShell>
  );
}

/* -------- pieces -------- */

function StatChip({ label, value, accent, icon }: { label: string; value: number; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accent }} />
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
        {icon}<span>{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active, onClick, children, disabled, title,
}: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium transition " +
        (active
          ? "border-[#05041A] bg-[#05041A] text-white dark:border-[#A1FBF9] dark:bg-[#A1FBF9] dark:text-[#03002C]"
          : "border-black/10 bg-white text-black/70 hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/10") +
        (disabled ? " cursor-not-allowed opacity-40" : "")
      }
    >
      {children}
    </button>
  );
}

function DeckTile({
  deck: d, industry, client, views, shared, reviewStatus,
}: { deck: Deck; industry: string; client: string; views: number; shared: boolean; reviewStatus: ReviewStatus | null }) {
  const brand = resolveBrandMode(d.brandModeId, d.subCompany);
  const cover = d.slides[0];
  const coverVariant = cover ? byId(MODULE_VARIANTS, cover.variantId) : undefined;
  const duplicateDeck = useDeckStore((s) => s.duplicateDeck);
  const deleteDeck = useDeckStore((s) => s.deleteDeck);
  const removeCloud = useServerFn(deleteCloudDeck);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${d.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try { await removeCloud({ data: { deckId: d.id } }); } catch { /* local-only */ }
    deleteDeck(d.id);
  };
  if (deleting) return null;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
      <Link to="/decks/$deckId" params={{ deckId: d.id }} className="block">
        <div className="aspect-[16/9] bg-white">
          {cover && coverVariant && (
            <ScaledSlide>
              <VariantRenderer slide={cover} variant={coverVariant} brand={brand} pageNumber={1} />
            </ScaledSlide>
          )}
        </div>
        <div className="border-t border-black/10 p-5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: brand.tokens.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">{brand.name}</span>
            {d.isTemplate && (
              <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">Template</span>
            )}
            {shared && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#A6FA87]/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#155e2b] dark:bg-[#A6FA87]/15 dark:text-[#A6FA87]">
                <Share2 size={12} /> Shared
              </span>
            )}
            {reviewStatus && reviewStatus !== "draft" && <ReviewStatusBadge status={reviewStatus} />}
          </div>
          <div className="mt-3 line-clamp-2 text-lg font-semibold">{d.title}</div>
          <div className="mt-1 text-sm text-black/60 dark:text-white/60">
            {d.slides.length} slides · {client || industry || "—"}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-widest text-black/40 dark:text-white/40">
            <span>{relative(d.createdAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye size={12} /> {views}
            </span>
          </div>
        </div>
      </Link>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-red-700 shadow ring-1 ring-red-200 hover:bg-red-50"
        >Delete</button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); const id = duplicateDeck(d.id); if (id) navigate({ to: "/decks/$deckId", params: { deckId: id } }); }}
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-black shadow ring-1 ring-black/10 hover:bg-white"
        >Duplicate</button>
        <Link
          to="/decks/$deckId/present"
          params={{ deckId: d.id }}
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-black shadow ring-1 ring-black/10 hover:bg-white"
        >Present</Link>
        <Link
          to="/decks/$deckId"
          params={{ deckId: d.id }}
          className="rounded-full bg-[#03002C] px-3 py-1 text-xs font-medium text-white shadow"
        >Open</Link>
      </div>
    </div>
  );
}

function EmptyNew() {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003FC7]/10 text-2xl text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">✦</div>
        <h3 className="mt-4 text-xl font-semibold">No decks yet</h3>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Start with a brief. In under a minute you'll have a governed, on-brand deck ready to personalize.
        </p>
        <Link to="/brief/new" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
          <Rocket size={14} /> Create your first brief
        </Link>
      </div>
    </div>
  );
}

function EmptyNoMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5 text-black/40 dark:bg-white/10 dark:text-white/50">
          <Search size={20} />
        </div>
        <h3 className="mt-4 text-xl font-semibold">No matches</h3>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Nothing in your workspace matches these filters. Try a different search term or clear the filters.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 dark:bg-[#A1FBF9] dark:text-[#03002C]"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
