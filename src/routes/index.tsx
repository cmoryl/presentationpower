import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, Brain, MessageSquare, ShieldCheck, ImageIcon, Compass,
  BookOpen, Palette, Shapes, ArrowRight, Rocket, Cloud, Clock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSignedIn } from "@/components/CloudDeckControls";
import { useDeckStore, type Deck } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import {
  BRAND_MODES, MODULE_FAMILIES, MODULE_VARIANTS,
  SECTION_FRAMEWORKS, LAYOUT_FRAMEWORKS, byId,
} from "@/lib/taxonomy";
import { BRAND_GUIDES } from "@/lib/brand-guides";
import { hasAiKey } from "@/lib/ai-status.functions";
import { listMyCloudDecks, deleteCloudDeck } from "@/lib/cloud-decks.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransPerfect Modular · Command Center" },
      { name: "description", content: "Governed deck assembly, brand intelligence, and AI-powered enablement for TransPerfect sales teams." },
      { property: "og:title", content: "TransPerfect Modular · Command Center" },
      { property: "og:description", content: "Governed deck assembly, brand intelligence, and AI-powered enablement for TransPerfect sales teams." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const decksMap = useDeckStore((s) => s.decks);
  const briefs = useDeckStore((s) => s.briefs);
  const signedIn = useSignedIn();
  const checkAi = useServerFn(hasAiKey);
  const listCloud = useServerFn(listMyCloudDecks);

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [cloudCount, setCloudCount] = useState<number | null>(null);

  useEffect(() => {
    checkAi().then((r) => setAiConfigured(r.configured)).catch(() => setAiConfigured(true));
  }, [checkAi]);

  useEffect(() => {
    if (!signedIn) { setCloudCount(null); return; }
    listCloud().then((rows) => setCloudCount(Array.isArray(rows) ? rows.length : 0)).catch(() => setCloudCount(0));
  }, [signedIn, listCloud]);

  const allDecks = useMemo<Deck[]>(() => Object.values(decksMap), [decksMap]);
  const recentDecks = useMemo(
    () => [...allDecks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [allDecks],
  );

  const totalSlides = allDecks.reduce((n, d) => n + d.slides.length, 0);
  const lastExport = useMemo(() => {
    let latest: { at: string; kind?: string; title: string } | null = null;
    for (const d of allDecks) {
      const at = d.context?.lastExportedAt;
      if (!at) continue;
      if (!latest || at > latest.at) latest = { at, kind: d.context?.lastExportKind, title: d.title };
    }
    return latest;
  }, [allDecks]);

  return (
    <AppShell>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#03002C] via-[#0B2A4A] to-[#003FC7] p-10 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#A1FBF9]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#C2A3FF]/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-[#A1FBF9]">Command Center</div>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight">
              Assemble a governed deck in minutes.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/70">
              Brief the system. It picks the archetype, sections, and approved modules from the full TransPerfect
              brand library — you review, personalize, and ship.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                to="/brief/new"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#03002C] shadow-lg shadow-[#003FC7]/30 transition hover:bg-[#A1FBF9]"
              >
                <Rocket size={16} /> New deck
              </Link>
              <Link
                to="/decks/import"
                className="rounded-full border border-white/25 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
              >
                Import PowerPoint
              </Link>
              <Link
                to="/atlas"
                className="rounded-full border border-transparent px-5 py-3 text-sm font-medium text-white/70 transition hover:text-white"
              >
                Browse Atlas →
              </Link>
            </div>
          </div>

          {/* Compact stat strip */}
          <div className="grid grid-cols-3 gap-3">
            <HeroStat label="Decks" value={allDecks.length} sub={`${totalSlides} slides`} />
            <HeroStat
              label="Cloud saved"
              value={signedIn ? (cloudCount ?? "—") : "—"}
              sub={signedIn ? "in your account" : "sign in to sync"}
              icon={<Cloud size={12} />}
            />
            <HeroStat
              label="Last export"
              value={lastExport ? (lastExport.kind ?? "export").toUpperCase() : "—"}
              sub={lastExport ? relative(lastExport.at) : "no exports yet"}
              icon={<Clock size={12} />}
            />
          </div>
        </div>
      </section>

      {/* AI banner (only when key missing) */}
      {aiConfigured === false && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-50/70 px-5 py-3 text-sm text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/[0.06] dark:text-amber-100">
          <Sparkles size={16} className="shrink-0" />
          <div>
            <span className="font-medium">AI suite ready.</span>{" "}
            Add <code className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] dark:bg-white/10">ANTHROPIC_API_KEY</code> in Project Settings → Secrets to activate strategist, copilot, review, and asset suggestions.
          </div>
        </div>
      )}

      {/* AI SUITE */}
      <section className="mt-10">
        <SectionHeader kicker="Intelligence" title="AI suite" hint="Six agents, one command surface" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AiCard to="/brief/new" icon={<Brain size={16} />} title="Narrative Strategist" desc="Plans deck architecture from your brief before assembly." tint="#A1FBF9" />
          <AiCard to="/knowledge/ask" icon={<BookOpen size={16} />} title="Deep RAG Synthesis" desc="Claude reasoning over the full brand knowledge base." tint="#C2A3FF" />
          <AiCard to="/atlas" icon={<MessageSquare size={16} />} title="Deck Copilot" desc="Natural-language edits from inside the deck editor." tint="#A6FA87" />
          <AiCard to="/atlas" icon={<ShieldCheck size={16} />} title="Brand Reviewer" desc="Scores every deck against its division's guide." tint="#FFEB66" />
          <AiCard to="/atlas" icon={<ImageIcon size={16} />} title="Asset Suggest" desc="Semantic icon and logo recommendations per slide." tint="#FF9B70" />
          <AiCard to="/knowledge/ask" icon={<Compass size={16} />} title="Ask Oracle" desc="Conversational hybrid retrieval over Oracle + KB." tint="#EC388A" />
        </div>
      </section>

      {/* RECENT DECKS */}
      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <SectionHeader kicker="Workspace" title="Recent decks" hint={`${allDecks.length} total`} inline />
          <Link to="/decks" className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
            View all →
          </Link>
        </div>

        {recentDecks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
            <div className="mx-auto max-w-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003FC7]/10 text-2xl text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">✦</div>
              <h3 className="mt-4 text-xl font-semibold">No decks yet</h3>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Start with a brief. In under a minute you'll have a governed, on-brand deck ready to personalize.
              </p>
              <Link
                to="/brief/new"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                <Rocket size={14} /> Create your first brief
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {recentDecks.map((d) => (
              <DeckCard key={d.id} deck={d} industry={briefs[d.briefId]?.industry} />
            ))}
          </div>
        )}
      </section>

      {/* KNOWLEDGE & BRAND */}
      <section className="mt-12">
        <SectionHeader kicker="Library" title="Knowledge & brand" hint="Everything the deck engine draws from" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ResourceTile to="/knowledge/brand-guides" icon={<Palette size={16} />} title="Brand Guides" count={BRAND_GUIDES.length} caption="Master + divisions" />
          <ResourceTile to="/logohub" icon={<Shapes size={16} />} title="LogoHub" count="400+" caption="Client + division logos" />
          <ResourceTile to="/admin/icon-studio" icon={<ImageIcon size={16} />} title="Icon Studio" count={27} caption="Curated icon packs" />
          <ResourceTile to="/knowledge" icon={<BookOpen size={16} />} title="Knowledge Base" count={MODULE_FAMILIES.length} caption="Modules + Oracle" />
          <ResourceTile to="/knowledge/ask" icon={<Compass size={16} />} title="Ask Oracle" caption="Hybrid retrieval chat" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <MiniStat label="Module variants" value={MODULE_VARIANTS.length} accent="#003FC7" />
          <MiniStat label="Sections" value={SECTION_FRAMEWORKS.length} accent="#A1FBF9" />
          <MiniStat label="Layouts" value={LAYOUT_FRAMEWORKS.length} accent="#C2A3FF" />
          <MiniStat label="Brand modes" value={BRAND_MODES.length} accent="#FFEB66" />
        </div>
      </section>
    </AppShell>
  );
}

/* ---------- pieces ---------- */

function SectionHeader({
  kicker, title, hint, inline,
}: { kicker: string; title: string; hint?: string; inline?: boolean }) {
  return (
    <div className={inline ? "" : "mb-1"}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#003FC7] dark:text-[#A1FBF9]">{kicker}</div>
      <div className="mt-1 flex items-baseline gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {hint && <span className="text-xs text-black/45 dark:text-white/45">{hint}</span>}
      </div>
    </div>
  );
}

function HeroStat({ label, value, sub, icon }: { label: string; value: number | string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/60">
        {icon}<span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-white/50">{sub}</div>}
    </div>
  );
}

function AiCard({
  to, icon, title, desc, tint,
}: { to: string; icon: React.ReactNode; title: string; desc: string; tint: string }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25"
    >
      <span
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60"
        style={{ backgroundColor: tint }}
      />
      <div className="relative flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${tint}33`, color: "#03002C" }}
        >
          {icon}
        </span>
        <div className="text-sm font-semibold tracking-tight">{title}</div>
      </div>
      <p className="relative mt-3 text-sm text-black/60 dark:text-white/60">{desc}</p>
      <div className="relative mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#003FC7] dark:text-[#A1FBF9]">
        Open <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function DeckCard({ deck: d, industry }: { deck: Deck; industry?: string }) {
  const brand = byId(BRAND_MODES, d.brandModeId) ?? BRAND_MODES[0];
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
    const ok = window.confirm(`Delete "${d.title}"? This can't be undone.`);
    if (!ok) return;
    setDeleting(true);
    // Best-effort: remove the cloud copy if it exists, then always drop the local record.
    try {
      await removeCloud({ data: { deckId: d.id } });
    } catch {
      // Deck may only exist locally, or the user may be signed out — ignore.
    }
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
          </div>
          <div className="mt-3 line-clamp-2 text-lg font-semibold">{d.title}</div>
          <div className="mt-1 text-sm text-black/60 dark:text-white/60">
            {d.slides.length} slides · {industry ?? "—"}
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-widest text-black/40 dark:text-white/40">
            {relative(d.createdAt)}
          </div>
        </div>
      </Link>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-end gap-1.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-red-700 shadow ring-1 ring-red-200 hover:bg-red-50"
          aria-label={`Delete ${d.title}`}
        >
          Delete
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const id = duplicateDeck(d.id);
            if (id) navigate({ to: "/decks/$deckId", params: { deckId: id } });
          }}
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-black shadow ring-1 ring-black/10 hover:bg-white"
        >
          Duplicate
        </button>
        <Link
          to="/decks/$deckId/present"
          params={{ deckId: d.id }}
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-black shadow ring-1 ring-black/10 hover:bg-white"
        >
          Present
        </Link>
        <Link
          to="/decks/$deckId"
          params={{ deckId: d.id }}
          className="rounded-full bg-[#03002C] px-3 py-1 text-xs font-medium text-white shadow"
        >
          Open
        </Link>
      </div>
    </div>
  );
}


function ResourceTile({
  to, icon, title, count, caption,
}: { to: string; icon: React.ReactNode; title: string; count?: number | string; caption: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25"
    >
      <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#003FC7]/10 text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="truncate text-sm font-semibold">{title}</div>
          {count !== undefined && (
            <span className="text-xs tabular-nums text-black/50 dark:text-white/50">{count}</span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-black/55 dark:text-white/55">{caption}</div>
      </div>
      <ArrowRight size={14} className="mt-1 shrink-0 text-black/30 transition group-hover:translate-x-0.5 group-hover:text-black/60 dark:text-white/30 dark:group-hover:text-white/60" />
    </Link>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accent }} />
      <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
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
