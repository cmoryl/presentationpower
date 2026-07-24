import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, Brain, MessageSquare, ShieldCheck, ImageIcon, Compass,
  BookOpen, Palette, Shapes, ArrowRight, ArrowUpRight, Rocket, Cloud, Clock,
  Presentation, Printer, CalendarDays, Share2, Wand2, Search, CornerDownLeft,
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
import { resolveBrandMode } from "@/lib/brand-profiles";
import { BRAND_GUIDES } from "@/lib/brand-guides";
import { hasAiKey } from "@/lib/ai-status.functions";
import { listMyCloudDecks, deleteCloudDeck } from "@/lib/cloud-decks.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransPerfect Modular · Command Center" },
      { name: "description", content: "Governed brand engine for TransPerfect. Assemble presentations, print, event, and social — from one modular library, powered by the Oracle." },
      { property: "og:title", content: "TransPerfect Modular · Command Center" },
      { property: "og:description", content: "Governed brand engine for TransPerfect. Assemble presentations, print, event, and social — from one modular library, powered by the Oracle." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Dashboard,
});

/* ---------- mode registry (drives the animated hero) ---------- */

type ModeId = "presentation" | "print" | "event" | "social";
type ModeAction = { label: string; to: string; hint?: string; primary?: boolean };
type ModeDef = {
  id: ModeId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
  glow: string;
  eyebrow: string;
  headline: string;
  copy: string;
  actions: ModeAction[];
  suggest: string[];
};

const MODES: ModeDef[] = [
  {
    id: "presentation",
    label: "Presentation",
    icon: Presentation,
    accent: "#003FC7",
    glow: "#A1FBF9",
    eyebrow: "Modular decks · governed",
    headline: "Snap together a deck the brand already approves.",
    copy: "Brief the system. It picks the archetype, sections, and approved modules from the full TransPerfect brand library — you review, personalize, and ship.",
    actions: [
      { label: "New deck from brief", to: "/brief/new", primary: true, hint: "≈ 60s" },
      { label: "Open library", to: "/library" },
      { label: "Import PowerPoint", to: "/decks/import" },
    ],
    suggest: [
      "Q3 executive review for Life Sciences",
      "GlobalLink Digital pitch — enterprise retail",
      "Trial Interactive site-selection deck",
    ],
  },
  {
    id: "print",
    label: "Print",
    icon: Printer,
    accent: "#EC388A",
    glow: "#FFEB66",
    eyebrow: "Modular print · PDF/X-4",
    headline: "Modular case studies, eBrochures, spotlights — press-ready.",
    copy: "The same aurora + liquid-glass engine, fitted to 816×1056 portrait canvases and exported as true 300 DPI PDF/X-4 for print production.",
    actions: [
      { label: "Open Print Studio", to: "/library/print", primary: true },
      { label: "Generate a print asset", to: "/asset/new" },
    ],
    suggest: [
      "Client spotlight — Legal eDiscovery",
      "eBrochure — GlobalLink AI",
      "One-pager — Trial Interactive",
    ],
  },
  {
    id: "event",
    label: "Event",
    icon: CalendarDays,
    accent: "#A6FA87",
    glow: "#C2A3FF",
    eyebrow: "Modular playbooks · phased",
    headline: "Every event kit, modular and pre-mapped by phase.",
    copy: "Product launches, flagship conferences, webinars, exec briefings — each with cadenced deliverables, KPI benchmarks, and rendered live demos.",
    actions: [
      { label: "Open Events hub", to: "/events", primary: true },
      { label: "Product launch demo", to: "/events/demo/$playbookId", hint: "live" },
    ],
    suggest: [
      "Product launch — GlobalLink AI",
      "Flagship conference — GlobalLink NEXT",
      "Executive briefing — Fortune 500",
    ],
  },
  {
    id: "social",
    label: "Social",
    icon: Share2,
    accent: "#FF9B70",
    glow: "#EC388A",
    eyebrow: "Modular campaigns · division-scoped",
    headline: "Turn one module into a full social kit.",
    copy: "Division-scoped playbooks — brand anthems, product teases, milestones, case spotlights — each seeded from a real module and rendered live in your palette.",
    actions: [
      { label: "Open Social hub", to: "/social", primary: true },
      { label: "Brand anthem demo", to: "/social/demo/$playbookId", hint: "live" },
    ],
    suggest: [
      "Media localization spotlight",
      "GlobalLink product tease · pre-launch",
      "Life Sciences milestone announcement",
    ],
  },
];

/* ---------- dashboard ---------- */

function Dashboard() {
  const decksMap = useDeckStore((s) => s.decks);
  const briefs = useDeckStore((s) => s.briefs);
  const signedIn = useSignedIn();
  const checkAi = useServerFn(hasAiKey);
  const listCloud = useServerFn(listMyCloudDecks);
  const navigate = useNavigate();

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [modeId, setModeId] = useState<ModeId>("presentation");
  const [autoRotate, setAutoRotate] = useState(true);
  const mode = MODES.find((m) => m.id === modeId) ?? MODES[0];

  // Auto-rotate through modes every 5s until the user picks one or hovers the picker.
  useEffect(() => {
    if (!autoRotate) return;
    const id = window.setInterval(() => {
      setModeId((cur) => {
        const idx = MODES.findIndex((m) => m.id === cur);
        return MODES[(idx + 1) % MODES.length].id;
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoRotate]);

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

  /* Agent bar handoff */
  const sendToOracle = (prompt: string) => {
    const q = prompt.trim();
    if (!q) return;
    try { window.sessionStorage.setItem("oracle:seed", q); } catch { /* ignore */ }
    navigate({ to: "/knowledge/ask" });
  };

  return (
    <AppShell>
      {/* ================= HERO ================= */}
      <section
        className="full-bleed relative -mt-6 overflow-hidden border-b border-white/10 bg-[#03002C] py-8 text-white sm:-mt-10 sm:py-14 lg:py-20"
      >
        {/* animated aurora blobs — reactive to selected mode + scroll parallax */}
        <AuroraHero mode={mode} />

        {/* Oversized MODULAR watermark — brand signature behind the hero */}
        <ParallaxWatermark accent={mode.accent} />


        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75 backdrop-blur">
              <Sparkles size={11} className="text-[#A1FBF9]" /> Modular · Command Center
            </span>
            <span className="hidden text-[11px] text-white/50 sm:inline">
              {allDecks.length} decks · {totalSlides} slides · {MODULE_VARIANTS.length} modules
            </span>
          </div>

          {/* Mode picker */}
          <div className="mt-6">
            <div
              role="tablist"
              aria-label="What are you building?"
              onMouseEnter={() => setAutoRotate(false)}
              onFocus={() => setAutoRotate(false)}
              className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur sm:inline-flex"
            >
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = m.id === modeId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setAutoRotate(false); setModeId(m.id); }}
                    className={`group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      active
                        ? "bg-white text-[#03002C] shadow-lg shadow-black/20"
                        : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md transition"
                      style={
                        active
                          ? { backgroundColor: `${m.accent}22`, color: m.accent }
                          : { color: "currentColor" }
                      }
                    >
                      <Icon size={13} />
                    </span>
                    {m.label}
                    {active && (
                      <span
                        aria-hidden
                        className="absolute -bottom-[7px] left-1/2 h-1 w-8 -translate-x-1/2 rounded-full"
                        style={{ backgroundColor: m.accent }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode content — remounts on change for a soft fade-in */}
          <div key={mode.id} className="mt-6 grid animate-fade-in gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end">
            <div>
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.32em]"
                style={{ color: mode.accent }}
              >
                {mode.eyebrow}
              </div>
              <h1 className="mt-3 text-[42px] font-semibold leading-[1.04] tracking-tight sm:text-5xl">
                {mode.headline}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
                {mode.copy}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {mode.actions.map((a) => (
                  <ModeActionButton key={a.label} action={a} accent={mode.accent} />
                ))}
              </div>
            </div>

            {/* Stat + suggest strip */}
            <div className="flex flex-col gap-3">
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
                  sub={lastExport ? relative(lastExport.at) : "—"}
                  icon={<Clock size={12} />}
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                  Try
                </div>
                <ul className="mt-2 space-y-1">
                  {mode.suggest.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => sendToOracle(`Help me start a ${mode.label.toLowerCase()}: ${s}`)}
                        className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <ArrowUpRight size={12} className="shrink-0 text-white/40 group-hover:text-white" />
                        <span className="truncate">{s}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Agent prompt bar */}
          <div className="relative mt-8">
            <AgentBar onSubmit={sendToOracle} onDeck={(q) => {
              try { window.sessionStorage.setItem("oracle:seed", q); } catch { /* ignore */ }
              navigate({ to: "/brief/new" });
            }} accent={mode.accent} />
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

      {/* ================= FAST LANES ================= */}
      <section className="mt-10">
        <SectionHeader kicker="Fast lanes" title="Jump into a surface" hint="Every command in the build" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.id}
                to={m.actions[0]?.to ?? "/library"}
                className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60"
                  style={{ backgroundColor: m.accent }}
                />
                <span
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${m.accent}22`, color: m.accent }}
                >
                  <Icon size={16} />
                </span>
                <div className="relative mt-3 text-sm font-semibold">{m.label}</div>
                <div className="relative mt-1 text-xs text-black/55 dark:text-white/55">
                  {m.eyebrow}
                </div>
                <div className="relative mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-[#003FC7] dark:text-[#A1FBF9]">
                  Open <ArrowRight size={11} className="transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= RECENT DECKS ================= */}
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
                Start with a brief, or ask the Oracle above. In under a minute you'll have a governed, on-brand deck.
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

      {/* ================= AI SUITE ================= */}
      <section className="mt-12">
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

      {/* ================= KNOWLEDGE & BRAND ================= */}
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

/* ---------- aurora hero backdrop ---------- */

function ParallaxWatermark({ accent }: { accent: string }) {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => { raf = 0; setScrollY(window.scrollY); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const y = Math.min(scrollY, 800);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-6 select-none text-center font-semibold leading-none tracking-[-0.04em] will-change-transform"
      style={{
        fontSize: "clamp(120px, 22vw, 320px)",
        // Softer 4-stop fade — no visible edge where the letter tops begin.
        background: `linear-gradient(180deg, ${accent}00 0%, ${accent}14 35%, ${accent}05 75%, transparent 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        mixBlendMode: "screen",
        transform: `translate3d(0, ${y * 0.45}px, 0)`,
        opacity: Math.max(0, 1 - y / 700),
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 100%)",
        maskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 100%)",
      }}
    >
      MODULAR
    </div>
  );
}

function AuroraHero({ mode }: { mode: ModeDef }) {



  // Scroll-driven parallax: blobs and vignette drift at different rates as the
  // hero scrolls out of view. rAF-throttled to stay smooth and cheap.
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Cap the effective scroll so blobs don't fly off screen once past hero.
  const y = Math.min(scrollY, 800);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base wash — always present, keeps hero from feeling flat between transitions. */}
      <div
        className="absolute inset-0 opacity-70 transition-[background] duration-[1200ms] ease-out"
        style={{
          background: `radial-gradient(60% 55% at 20% 30%, ${mode.accent}22 0%, transparent 60%), radial-gradient(55% 50% at 85% 75%, ${mode.glow}1c 0%, transparent 65%)`,
        }}
      />
      {/* Keyed layer re-mounts per mode → each rotation gets a full fade+scale entrance. */}
      <div key={mode.id} className="absolute inset-0 animate-hero-mode-in">
        <div
          className="absolute h-[520px] w-[520px] rounded-full blur-[120px] will-change-transform"
          style={{
            backgroundColor: mode.accent,
            opacity: 0.42,
            top: mode.id === "presentation" ? "-160px" : mode.id === "print" ? "38%" : mode.id === "event" ? "-40px" : "48%",
            left: mode.id === "presentation" ? "-120px" : mode.id === "print" ? "58%" : mode.id === "event" ? "38%" : "-100px",
            transform: `translate3d(${y * 0.08}px, ${y * -0.35}px, 0)`,
          }}
        />
        <div
          className="absolute h-[460px] w-[460px] rounded-full blur-[140px] will-change-transform"
          style={{
            backgroundColor: mode.glow,
            opacity: 0.32,
            bottom: mode.id === "presentation" ? "-100px" : mode.id === "print" ? "-40px" : mode.id === "event" ? "38%" : "-160px",
            right: mode.id === "presentation" ? "-80px" : mode.id === "print" ? "-120px" : mode.id === "event" ? "-80px" : "48%",
            transform: `translate3d(${y * -0.1}px, ${y * 0.22}px, 0)`,
          }}
        />
      </div>
      {/* Soft top-to-bottom vignette — no hard cutoff, no visible band. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),rgba(255,255,255,0)_90%)]" />
    </div>
  );
}

function ModeActionButton({ action, accent }: { action: ModeAction; accent: string }) {
  const shared = "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition";
  if (action.primary) {
    return (
      <Link
        to={action.to}
        className={`${shared} bg-white text-[#03002C] shadow-lg shadow-black/25 hover:shadow-xl hover:-translate-y-0.5`}
      >
        <Rocket size={14} style={{ color: accent }} />
        {action.label}
        {action.hint && <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">· {action.hint}</span>}
      </Link>
    );
  }
  return (
    <Link
      to={action.to}
      className={`${shared} border border-white/20 bg-white/[0.05] text-white/85 backdrop-blur hover:border-white/40 hover:bg-white/[0.1]`}
    >
      {action.label}
      {action.hint && <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">· {action.hint}</span>}
    </Link>
  );
}

/* ---------- agent prompt bar ---------- */

function AgentBar({
  onSubmit,
  onDeck,
  accent,
}: {
  onSubmit: (q: string) => void;
  onDeck: (q: string) => void;
  accent: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const submit = () => {
    const q = value.trim();
    if (!q) return;
    onSubmit(q);
  };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-1.5 backdrop-blur transition focus-within:border-white/40 focus-within:bg-white/[0.09]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-8 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full opacity-40 blur-2xl transition"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex flex-col gap-2 rounded-xl bg-[#03002C]/40 p-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 items-start gap-3">
          <span
            className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#03002C]"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            <Wand2 size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <label htmlFor="agent-prompt" className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">
              Ask the Oracle · or describe what you need
            </label>
            <textarea
              id="agent-prompt"
              ref={ref}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="e.g. Build a Life Sciences submission-milestone deck with a 3-KPI hero and a case-study spotlight"
              className="mt-1 block w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
              style={{ maxHeight: 120 }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-end">
          <button
            type="button"
            onClick={() => onDeck(value.trim() || "New deck from Oracle prompt")}
            disabled={!value.trim()}
            className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/85 backdrop-blur transition hover:border-white/40 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
          >
            <Rocket size={12} /> Turn into deck
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#03002C] transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Search size={12} /> Ask
            <span className="hidden items-center gap-0.5 text-[9px] font-semibold uppercase tracking-widest text-black/40 sm:inline-flex">
              <CornerDownLeft size={9} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */

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
    const ok = window.confirm(`Delete "${d.title}"? This can't be undone.`);
    if (!ok) return;
    setDeleting(true);
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
