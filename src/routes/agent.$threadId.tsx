// One agent conversation: threads rail, chat, and a live deck preview.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UIMessage } from "ai";
import {
  Sparkles,
  Bot,
  Wand2,
  Download,
  MessageSquare,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AgentChat } from "@/components/agent/AgentChat";
import { AgentDeckPreview } from "@/components/agent/AgentDeckPreview";
import { AgentQuickStart } from "@/components/agent/AgentQuickStart";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  createAgentThread,
  deleteAgentThread,
  listAgentThreads,
  loadAgentThread,
  renameAgentThread,
  setAgentThreadDeck,
  type AgentThread,
} from "@/lib/agent/threads";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const AGENT_ACCENT = "#003FC7";
const AGENT_GLOW = "#A1FBF9";

const AGENT_CAPABILITIES: Array<{ label: string; icon: LucideIcon; color: string }> = [
  { label: "Build from a brief", icon: Bot, color: "#003FC7" },
  { label: "Apply brand layouts", icon: Wand2, color: "#EC388A" },
  { label: "Export editable PPTX", icon: Download, color: "#A6FA87" },
  { label: "Iterate in the chat", icon: MessageSquare, color: "#FF9B70" },
];

const STARTER_BRIEFS = [
  {
    label: "Q1 board review",
    text: "Build a Q1 board review deck for TransPerfect that highlights revenue growth, major client wins, and our AI-enabled language platform roadmap.",
  },
  {
    label: "Product launch",
    text: "Create a product launch deck for GlobalLink Now, our real-time translation solution, aimed at enterprise marketing teams. Include a hero, problem/solution, demo, and pricing.",
  },
  {
    label: "Sales pitch",
    text: "Make a sales pitch for a life sciences prospect evaluating translation management systems. Focus on compliance, speed, and cost savings with GlobalLink.",
  },
  {
    label: "Event keynote",
    text: "Draft an event keynote intro for TransPerfect NEXT 2026. Cover the future of AI localization, customer momentum, and a bold vision close.",
  },
];

function ParallaxAgentWatermark() {
  const reducedMotion = useReducedMotion();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const y = reducedMotion ? 0 : Math.min(scrollY, 800);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-6 select-none text-center font-semibold leading-none tracking-[-0.04em] will-change-transform"
      style={{
        fontSize: "clamp(120px, 22vw, 320px)",
        background: "linear-gradient(180deg, rgba(3,0,44,0) 0%, rgba(3,0,44,0.04) 35%, rgba(3,0,44,0.02) 75%, transparent 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        transform: `translate3d(0, ${y * 0.45}px, 0)`,
        opacity: Math.max(0, 1 - y / 700),
        WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 100%)",
        maskImage: "linear-gradient(180deg, transparent 0%, black 25%, black 100%)",
      }}
    >
      AGENT
    </div>
  );
}

function AgentAuroraHero() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [scrollY, setScrollY] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const el = rootRef.current?.parentElement;
    if (!el) return;
    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      if (Math.abs(targetX - curX) < 0.001 && Math.abs(targetY - curY) < 0.001) {
        raf = 0;
        setPointer({ x: curX, y: curY });
        return;
      }
      setPointer({ x: curX, y: curY });
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
      targetY = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const y = reducedMotion ? 0 : Math.min(scrollY, 800);
  const pxA = pointer.x * 22;
  const pyA = pointer.y * 16;
  const pxB = pointer.x * -18;
  const pyB = pointer.y * -12;
  const washX = pointer.x * 6;
  const washY = pointer.y * 4;

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft, airy washes on a light ground — accent colors read as pastels. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60% 55% at ${20 + washX}% ${30 + washY}%, ${AGENT_GLOW}40 0%, transparent 60%), radial-gradient(55% 50% at ${85 + washX}% ${75 + washY}%, ${AGENT_ACCENT}18 0%, transparent 65%), radial-gradient(50% 45% at ${50 + washX}% ${90 + washY}%, #C2A3FF26 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute h-[520px] w-[520px] rounded-full blur-[120px] will-change-transform"
        style={{
          backgroundColor: AGENT_GLOW,
          opacity: 0.55,
          top: "-160px",
          left: "-120px",
          transform: `translate3d(${y * 0.08 + pxA}px, ${y * -0.35 + pyA}px, 0) scale(1)`,
          transition: "transform 1600ms cubic-bezier(.4,0,.2,1)",
        }}
      />
      <div
        className="absolute h-[460px] w-[460px] rounded-full blur-[140px] will-change-transform"
        style={{
          backgroundColor: AGENT_ACCENT,
          opacity: 0.16,
          bottom: "-100px",
          right: "-80px",
          transform: `translate3d(${y * -0.1 + pxB}px, ${y * 0.22 + pyB}px, 0) scale(1)`,
          transition: "transform 1600ms cubic-bezier(.4,0,.2,1)",
        }}
      />
      {/* Top-left highlight to keep the light ground from feeling flat. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.95),rgba(255,255,255,0)_80%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(240,242,247,0.6) 100%)]" />
    </div>
  );
}

function AgentHero({
  showQuickStart,
  busy,
  onStart,
  onNewDeck,
  threadId,
  seedBrief,
  onSeedBrief,
  flush = true,
}: {
  showQuickStart: boolean;
  busy: boolean;
  onStart: (prompt: string) => void;
  onNewDeck: () => void;
  threadId: string;
  seedBrief: string;
  onSeedBrief: (text: string) => void;
  flush?: boolean;
}) {
  return (
    <section
      className={`full-bleed relative overflow-hidden border-b border-black/5 bg-white py-8 sm:py-10 lg:py-12 ${
        flush ? "-mt-6 sm:-mt-10" : ""
      }`}
    >
      <AgentAuroraHero />
      <ParallaxAgentWatermark />

      <div className="relative px-6 sm:px-8">

        {/* Eyebrow */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/20 bg-[#003FC7]/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#003FC7] backdrop-blur">
            <Sparkles size={12} className="text-[#003FC7]" />
            AI-powered deck builder
          </span>
          <span className="hidden text-[11px] text-[#666] sm:inline">
            Generates in seconds · exports layered, editable PPTX
          </span>
        </div>

        {/* Headline block */}
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#03002C] sm:text-4xl lg:text-5xl">
              Presentation Agent
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#666]">
              Describe the presentation you need in plain language. The agent picks the right
              archetype, brand-approved modules, and copy — then delivers an editable PowerPoint
              file inside one conversation.
            </p>
          </div>

          {/* Capability cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {AGENT_CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.label}
                  className="rounded-xl border border-black/[0.06] bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-black/[0.12] hover:shadow-md"
                >
                  <div
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${cap.color}18`, color: cap.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold leading-tight text-[#03002C]">
                    {cap.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick-start or new-deck CTA */}
        <div className="relative mt-5">
          {showQuickStart ? (
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Wand2 size={14} className="text-[#003FC7]" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#666]">
                  Quick start
                </span>
              </div>
              <AgentQuickStart
                disabled={busy}
                onStart={onStart}
                threadId={threadId}
                seedBrief={seedBrief}
                variant="light"
                className="border-0 bg-transparent p-0"
              />

              {/* Interactive starters */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]/70">
                  Try an example:
                </span>
                {STARTER_BRIEFS.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => onSeedBrief(b.text)}
                    className="rounded-full border border-[#003FC7]/15 bg-[#003FC7]/5 px-2.5 py-1 text-[11px] font-medium text-[#003FC7] transition hover:border-[#003FC7]/40 hover:bg-[#003FC7]/10"
                  >
                    {b.label}
                  </button>
                ))}
                {seedBrief && (
                  <button
                    type="button"
                    onClick={() => onSeedBrief("")}
                    className="text-[11px] font-medium text-[#666] underline-offset-2 hover:text-[#03002C] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onNewDeck}
              className="group inline-flex items-center gap-2 rounded-xl border border-[#003FC7]/30 bg-[#003FC7]/5 px-4 py-2.5 text-sm font-semibold text-[#003FC7] shadow-sm transition hover:bg-[#003FC7]/10 hover:shadow-md"
            >
              <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              Start a new deck from a brief
            </button>
          )}
        </div>
      </div>
    </section>
  );
}


/** Slim hero shown once the conversation is underway: progress takes centre stage. */
function AgentProgressHero({
  onExpand,
  onNewDeck,
  progressRef,
  expanded = false,
}: {
  onExpand: () => void;
  onNewDeck: () => void;
  progressRef: (el: HTMLDivElement | null) => void;
  expanded?: boolean;
}) {
  return (
    <section className="full-bleed relative overflow-hidden border-y border-black/5 bg-white/40 py-4 sm:py-5">
      <AgentAuroraHero />
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3 px-6 sm:px-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#003FC7] backdrop-blur-md">
            <Sparkles size={11} />
            Presentation Agent
          </span>
        </div>

        {/* Live build progress — the primary hero content while working. */}
        <div ref={progressRef} className="min-w-[280px] flex-1" />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onNewDeck}
            className="rounded-lg border border-white/50 bg-white/25 px-3 py-1.5 text-[11px] font-semibold text-[#003FC7] shadow-sm backdrop-blur-md transition hover:bg-white/40"
          >
            New deck
          </button>
          <button
            type="button"
            onClick={onExpand}
            aria-label="Show agent overview"
            title="Show agent overview"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/40 bg-white/20 text-[#666] backdrop-blur-md transition hover:bg-white/35 hover:text-[#03002C]"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}



export const Route = createFileRoute("/agent/$threadId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Presentation agent · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Talk to the presentation agent to build, refine and deliver a brand-compliant PowerPoint deck without leaving the chat.",
      },
      { property: "og:title", content: "Presentation agent · TransPerfect Modular" },
      {
        property: "og:description",
        content: "Build and refine a PowerPoint deck end to end in one conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentThreadPage,
});

function AgentThreadPage() {
  const { threadId } = Route.useParams();
  const userId = useSessionUser();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<AgentThread[]>([]);
  const [messages, setMessages] = useState<UIMessage[] | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showLeftRail, setShowLeftRail] = useState(true);
  const [seedBrief, setSeedBrief] = useState("");
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [progressEl, setProgressEl] = useState<HTMLDivElement | null>(null);

  // The workspace should always run from wherever it starts on the page down to
  // the bottom of the viewport, so the rails never get cut off. Measuring beats
  // a hardcoded header offset because the hero band collapses and expands.
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [workspaceTop, setWorkspaceTop] = useState(0);
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setWorkspaceTop((prev) => (Math.abs(prev - top) > 1 ? top : prev));
    };
    measure();
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(document.documentElement);
    ro.observe(document.body);
    if (el.previousElementSibling) ro.observe(el.previousElementSibling);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [heroExpanded, liveCount]);

  const reloadThreads = useCallback(async () => {
    try {
      setThreads(await listAgentThreads());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load conversations.");
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    void reloadThreads();
  }, [userId, reloadThreads]);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    setMessages(null);
    setLiveCount(0);
    setHeroExpanded(false);
    (async () => {
      try {
        const { thread, messages: loaded } = await loadAgentThread(threadId);
        if (!live) return;
        setDeckId(thread.deck_id);
        setMessages(loaded);
        setError(null);
      } catch (err) {
        if (!live) return;
        setMessages([]);
        setError(err instanceof Error ? err.message : "Could not open this conversation.");
      }
    })();
    return () => {
      live = false;
    };
  }, [threadId, userId]);

  const onDeckDetected = useCallback(
    (id: string) => {
      setDeckId(id);
      setRefreshKey((k) => k + 1);
      void setAgentThreadDeck(threadId, id).then(reloadThreads).catch(() => undefined);
    },
    [threadId, reloadThreads],
  );

  const onActivity = useCallback(() => setRefreshKey((k) => k + 1), []);

  const onFirstUserMessage = useCallback(
    (text: string) => {
      const title = text.length > 60 ? `${text.slice(0, 57)}…` : text;
      void renameAgentThread(threadId, title).then(reloadThreads).catch(() => undefined);
    },
    [threadId, reloadThreads],
  );

  const newThread = useCallback(async () => {
    try {
      const t = await createAgentThread();
      await reloadThreads();
      void navigate({ to: "/agent/$threadId", params: { threadId: t.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start a conversation.");
    }
  }, [navigate, reloadThreads]);

  const startFromBrief = useCallback((prompt: string) => setPendingPrompt(prompt), []);
  const clearPendingPrompt = useCallback(() => setPendingPrompt(null), []);

  const removeThread = useCallback(
    async (id: string) => {
      try {
        await deleteAgentThread(id);
        const rest = await listAgentThreads();
        setThreads(rest);
        if (id === threadId) {
          const next = rest[0] ?? (await createAgentThread());
          void navigate({ to: "/agent/$threadId", params: { threadId: next.id }, replace: true });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete the conversation.");
      }
    },
    [navigate, threadId],
  );

  if (userId === null) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-sm text-foreground/60">
          Sign in to use the presentation agent.
          <Link
            to="/auth"
            className="rounded-lg bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 px-3 pb-3 sm:gap-5">
        {liveCount === 0 ? (
          <AgentHero
            showQuickStart={messages !== null}
            busy={pendingPrompt !== null}
            onStart={startFromBrief}
            onNewDeck={() => void newThread()}
            threadId={threadId}
            seedBrief={seedBrief}
            onSeedBrief={setSeedBrief}
          />
        ) : (
          <div className="full-bleed shrink-0 !px-0">
            {/* Animated collapse: grid-rows 1fr → 0fr keeps it GPU-friendly and smooth. */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                heroExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
              aria-hidden={!heroExpanded}
            >
              <div className="relative min-h-0 overflow-hidden">
                <AgentHero
                  showQuickStart={false}
                  busy={pendingPrompt !== null}
                  onStart={startFromBrief}
                  onNewDeck={() => void newThread()}
                  threadId={threadId}
                  seedBrief={seedBrief}
                  onSeedBrief={setSeedBrief}
                  flush={false}
                />
                <button
                  type="button"
                  onClick={() => setHeroExpanded(false)}
                  aria-label="Collapse agent overview"
                  title="Collapse agent overview"
                  tabIndex={heroExpanded ? 0 : -1}
                  className="absolute right-6 top-4 z-10 inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-[#666] backdrop-blur transition hover:text-[#03002C] sm:right-8"
                >
                  <ChevronUp size={14} />
                  Collapse
                </button>
              </div>
            </div>

            <AgentProgressHero
              expanded={heroExpanded}
              onExpand={() => setHeroExpanded((v) => !v)}
              onNewDeck={() => void newThread()}
              progressRef={setProgressEl}
            />
          </div>
        )}



        <div
          ref={workspaceRef}
          className="flex min-h-[420px] gap-3"
          style={{ height: `calc(100dvh - ${Math.round(workspaceTop)}px - 0.75rem)` }}
        >
          {/* Conversations — collapsible rail */}
          <aside
            className={`flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/60 transition-all duration-300 ease-in-out ${
              showLeftRail ? "w-60" : "w-12"
            }`}
          >
            <div
              className={`flex items-center gap-2 border-b border-border/60 ${
                showLeftRail ? "px-3 py-3" : "flex-col px-2 py-2"
              }`}
            >
              {showLeftRail && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/45">
                  Conversations
                </span>
              )}
              <button
                type="button"
                onClick={() => void newThread()}
                className={`rounded-lg bg-[#003FC7] text-[11px] font-semibold text-white transition hover:brightness-110 ${
                  showLeftRail ? "ml-auto px-2.5 py-1" : "grid h-7 w-7 place-items-center p-0"
                }`}
                aria-label="New conversation"
                title="New conversation"
              >
                {showLeftRail ? "+ New" : <Plus size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setShowLeftRail((s) => !s)}
                className={`rounded-lg text-foreground/45 transition hover:bg-foreground/5 hover:text-foreground ${
                  showLeftRail ? "px-1 py-1" : "grid h-7 w-7 place-items-center p-0"
                }`}
                aria-label={showLeftRail ? "Collapse conversations" : "Expand conversations"}
                title={showLeftRail ? "Collapse conversations" : "Expand conversations"}
              >
                {showLeftRail ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
            {showLeftRail && (
              <div className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
                {threads.map((t) => (
                  <div
                    key={t.id}
                    className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition ${
                      t.id === threadId
                        ? "bg-[#003FC7]/10 text-foreground"
                        : "text-foreground/70 hover:bg-foreground/5"
                    }`}
                  >
                    <Link
                      to="/agent/$threadId"
                      params={{ threadId: t.id }}
                      className="min-w-0 flex-1 truncate text-left"
                    >
                      {t.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void removeThread(t.id)}
                      aria-label={`Delete ${t.title}`}
                      className="shrink-0 rounded px-1 text-foreground/30 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {threads.length === 0 && (
                  <p className="px-2 py-3 text-[11px] text-foreground/40">No conversations yet.</p>
                )}
              </div>
            )}
          </aside>

          {/* Chat */}
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/60">
            {error && <p className="px-5 pt-4 text-xs text-red-600">{error}</p>}
            {messages === null ? (
              <div className="flex flex-1 items-center justify-center text-xs text-foreground/45">
                Loading conversation…
              </div>
            ) : (
              <AgentChat
                key={threadId}
                threadId={threadId}
                initialMessages={messages}
                onDeckDetected={onDeckDetected}
                onActivity={onActivity}
                onFirstUserMessage={onFirstUserMessage}
                onMessageCountChange={setLiveCount}
                pendingPrompt={pendingPrompt}
                onPendingPromptConsumed={clearPendingPrompt}
                progressContainer={liveCount > 0 && !heroExpanded ? progressEl : null}
              />
            )}
          </section>

          {/* Live deck preview */}
          <aside className="hidden w-[420px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background/60 xl:flex xl:flex-col">
            <AgentDeckPreview deckId={deckId} refreshKey={refreshKey} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
