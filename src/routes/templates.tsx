import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bookmark, Download, Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listTeamTemplates, getTemplateDeck } from "@/lib/cloud-decks.functions";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { useDeckStore, type TemplatePayload } from "@/lib/deck-store";
import { COMMUNITY_EVENT_TEMPLATE } from "@/lib/imported-templates/community-event";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Team templates · TransPerfect Modular" }] }),
  component: TemplatesGallery,
});

type TemplateRow = {
  id: string;
  title: string;
  brand_mode_id: string;
  archetype_id: string;
  updated_at: string | null;
  slide_count: number;
};

function TemplatesGallery() {
  const list = useServerFn(listTeamTemplates);
  const q = useQuery({ queryKey: ["team-templates"], queryFn: () => list() as Promise<TemplateRow[]> });

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-black/50 dark:text-white/50">Library</div>
          <h1 className="mt-1 text-3xl font-semibold">Team templates</h1>
          <p className="mt-2 max-w-xl text-sm text-black/60 dark:text-white/60">
            Shared starting points from your team. Clone one to spin up a fresh deck without rebuilding the story.
          </p>
        </div>
        <Link
          to="/brief/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <Sparkles size={14} /> New from brief
        </Link>
      </div>

      <StarterKits />

      <div className="mt-10">

        {q.isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03]" />
            ))}
          </div>
        ) : q.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            Could not load templates. Sign in to browse the team library.
          </div>
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {q.data.map((t) => (
              <TemplateCard key={t.id} row={t} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TemplateCard({ row }: { row: TemplateRow }) {
  const brand = resolveBrandMode(row.brand_mode_id);
  const create = useServerFn(getTemplateDeck);
  const createDeckFromTemplate = useDeckStore((s) => s.createDeckFromTemplate);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onUse() {
    setBusy(true);
    setErr(null);
    try {
      const res = (await create({ data: { deckId: row.id } })) as {
        deck:
          | ({
              title: string;
              brand_mode_id: string;
              archetype_id: string;
              sub_company?: string | null;
              context?: Record<string, unknown> | null;
              slides: Array<{ section_id: string; variant_id: string; layout_id: string; content: Record<string, unknown>; position?: number; notes?: string | null }>;
              brief?: Record<string, unknown> | null;
            })
          | null;
      };
      if (!res.deck) throw new Error("Template not available");
      const payload: TemplatePayload = {
        title: res.deck.title,
        brandModeId: res.deck.brand_mode_id,
        archetypeId: res.deck.archetype_id,
        subCompany: res.deck.sub_company ?? null,
        context: res.deck.context ?? null,
        slides: res.deck.slides.map((s) => ({
          sectionId: s.section_id,
          variantId: s.variant_id,
          layoutId: s.layout_id,
          content: (s.content as Record<string, unknown>) ?? {},
          notes: typeof s.notes === "string" ? s.notes : null,
        })),

        brief: res.deck.brief
          ? {
              prospect: (res.deck.brief as Record<string, unknown>).prospect as string | undefined,
              industry: (res.deck.brief as Record<string, unknown>).industry as string | undefined,
              audience: (res.deck.brief as Record<string, unknown>).audience as string | undefined,
              meetingObjective: (res.deck.brief as Record<string, unknown>).meeting_objective as string | undefined,
              lengthTarget: (res.deck.brief as Record<string, unknown>).length_target as number | undefined,
              clientFacts: (res.deck.brief as Record<string, unknown>).known_facts as string | undefined,
            }
          : null,
      };
      const { deckId } = createDeckFromTemplate(payload);
      navigate({ to: "/decks/$deckId", params: { deckId } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not clone template");
      setBusy(false);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${brand.tokens.primary} 0%, ${brand.tokens.accent} 100%)` }}
      >
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(120% 100% at 10% 0%, rgba(255,255,255,0.4) 0%, transparent 55%)" }} />
        <div className="absolute inset-0 flex flex-col justify-between p-5 text-white">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest">
            <Bookmark size={12} className="fill-current" /> Template
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-80">{brand.name}</div>
            <div className="mt-1 line-clamp-2 text-lg font-semibold leading-tight">{row.title}</div>
          </div>
        </div>
      </div>
      <div className="border-t border-black/10 p-4 dark:border-white/10">
        <div className="flex items-center justify-between text-xs text-black/60 dark:text-white/60">
          <span>{row.slide_count} slides</span>
          <span>{row.updated_at ? new Date(row.updated_at).toLocaleDateString() : ""}</span>
        </div>
        <button
          type="button"
          onClick={onUse}
          disabled={busy}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? "Cloning…" : "Use template"}
        </button>
        {err && <div className="mt-2 text-[10px] text-red-600 dark:text-red-400">{err}</div>}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-12 text-center dark:border-white/15 dark:bg-white/[0.02]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#003FC7]/10 text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">
        <Bookmark size={20} />
      </div>
      <div className="mt-4 text-lg font-semibold">No team templates yet</div>
      <p className="mx-auto mt-2 max-w-md text-sm text-black/60 dark:text-white/60">
        Mark any deck as a template to share it with the team. Templates become reusable starting points for everyone in your workspace.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Browse your decks
      </Link>
    </div>
  );
}

function StarterKits() {
  const createDeckFromTemplate = useDeckStore((s) => s.createDeckFromTemplate);
  const setDeckTemplateFlag = useDeckStore((s) => s.setDeckTemplateFlag);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  function importKit(kit: TemplatePayload, key: string) {
    setBusy(key);
    // layoutId fallback is now enforced inside createDeckFromTemplate.
    const { deckId } = createDeckFromTemplate(kit);
    setDeckTemplateFlag(deckId, true);
    navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  const kits: Array<{ key: string; title: string; blurb: string; payload: TemplatePayload }> = [
    {
      key: "community-event",
      title: "Pulse Fest · Community Event Kit",
      blurb: "20 editable slides mapped onto our modular variants — cover, agenda, program, stats, pricing, venue, register.",
      payload: COMMUNITY_EVENT_TEMPLATE,
    },
  ];

  return (
    <div className="mt-8 rounded-3xl border border-black/10 bg-gradient-to-br from-[#03002C] to-[#003FC7] p-6 text-white dark:border-white/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/60">Starter kits</div>
          <div className="mt-1 text-lg font-semibold">Import a sample team template</div>
          <p className="mt-1 max-w-2xl text-sm text-white/70">
            Kick-start a deck from one of our modular starter kits. Import, tweak, and save as a team template.
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {kits.map((k) => (
          <div
            key={k.key}
            className="flex flex-col justify-between rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm"
          >
            <div>
              <div className="text-sm font-semibold">{k.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{k.blurb}</p>
            </div>
            <button
              type="button"
              onClick={() => importKit(k.payload, k.key)}
              disabled={busy !== null}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-[#03002C] hover:opacity-90 disabled:opacity-60"
            >
              {busy === k.key ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {busy === k.key ? "Importing…" : "Import kit"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

