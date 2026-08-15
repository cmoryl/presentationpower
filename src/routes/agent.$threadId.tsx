// One agent conversation: threads rail, chat, and a live deck preview.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { UIMessage } from "ai";
import {
  Sparkles,
  Bot,
  Wand2,
  Download,
  MessageSquare,
  ArrowRight,
  Zap,
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

const AGENT_CAPABILITIES: Array<{ label: string; icon: LucideIcon; color: string }> = [
  { label: "Build from a brief", icon: Bot, color: "#003FC7" },
  { label: "Apply brand layouts", icon: Wand2, color: "#EC388A" },
  { label: "Export editable PPTX", icon: Download, color: "#A6FA87" },
  { label: "Iterate in the chat", icon: MessageSquare, color: "#FF9B70" },
];

function AgentHero({
  showQuickStart,
  busy,
  onStart,
  onNewDeck,
}: {
  showQuickStart: boolean;
  busy: boolean;
  onStart: (prompt: string) => void;
  onNewDeck: () => void;
}) {
  return (
    <section className="full-bleed relative -mt-6 overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#003FC70a] via-white/70 to-[#A1FBF922] py-6 sm:-mt-10 sm:py-8 lg:py-10 dark:from-white/[0.03] dark:via-white/[0.02] dark:to-white/[0.04] dark:border-white/10">
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl dark:opacity-20"
        style={{ background: "radial-gradient(circle, #A1FBF9 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-25 blur-3xl dark:opacity-15"
        style={{ background: "radial-gradient(circle, #003FC7 0%, transparent 70%)" }}
      />

      {/* Watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 select-none text-8xl font-semibold tracking-tighter text-[#003FC7]/[0.04] dark:text-white/[0.04] sm:text-9xl"
      >
        AGENT
      </div>

      <div className="relative">
        {/* Eyebrow */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#03002C]/70 backdrop-blur dark:border-white/15 dark:bg-white/[0.06] dark:text-white/75">
            <Sparkles size={12} className="text-[#003FC7] dark:text-[#A1FBF9]" />
            AI-powered deck builder
          </span>
          <span className="hidden text-[11px] text-black/45 dark:text-white/45 sm:inline">
            Generates in seconds · exports layered, editable PPTX
          </span>
        </div>

        {/* Headline block */}
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#03002C] dark:text-[#E0E8F5] sm:text-4xl lg:text-5xl">
              Presentation Agent
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#03002C]/65 dark:text-[#E0E8F5]/65">
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
                  className="rounded-xl border border-black/5 bg-white/50 p-2.5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <div
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${cap.color}18`, color: cap.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold leading-tight text-[#03002C] dark:text-[#E0E8F5]">
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
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-[#0B0A2A]/60">
              <div className="mb-2 flex items-center gap-2">
                <Zap size={14} className="text-[#003FC7] dark:text-[#A1FBF9]" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#03002C]/55 dark:text-[#E0E8F5]/55">
                  Quick start
                </span>
              </div>
              <AgentQuickStart
                disabled={busy}
                onStart={onStart}
                className="border-0 bg-transparent p-0"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={onNewDeck}
              className="group inline-flex items-center gap-2 rounded-xl border border-[#003FC7]/30 bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#003FC7] shadow-sm transition hover:bg-white hover:shadow-md dark:bg-[#0B0A2A]/60 dark:text-[#A1FBF9]"
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
      <div className="flex h-[calc(100vh-8rem)] min-h-[560px] flex-col gap-3 px-3 pb-3">
        <AgentHero
          showQuickStart={messages !== null && liveCount === 0}
          busy={pendingPrompt !== null}
          onStart={startFromBrief}
          onNewDeck={() => void newThread()}
        />
        <div className="flex min-h-0 flex-1 gap-3">
          {/* Conversations */}
          <aside className="flex w-60 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/60">
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/45">
                Conversations
              </span>
              <button
                type="button"
                onClick={() => void newThread()}
                className="ml-auto rounded-lg bg-[#003FC7] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:brightness-110"
              >
                + New
              </button>
            </div>
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
