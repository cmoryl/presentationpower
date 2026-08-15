// One agent conversation: threads rail, chat, and a live deck preview.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { UIMessage } from "ai";
import { AppShell } from "@/components/AppShell";
import { AgentChat } from "@/components/agent/AgentChat";
import { AgentDeckPreview } from "@/components/agent/AgentDeckPreview";
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

const AGENT_CAPABILITIES = [
  "Build slides from a brief",
  "Apply brand layouts",
  "Export editable PPTX",
  "Iterate in the chat",
] as const;

function AgentHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/50 px-6 py-5 dark:border-white/[0.08] dark:bg-[#0B0A2A]/50">
      {/* Aurora sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-60"
        style={{
          background:
            "radial-gradient(120% 100% at 0% 0%, rgba(0,63,199,0.14) 0%, transparent 55%), radial-gradient(100% 100% at 100% 100%, rgba(161,251,249,0.12) 0%, transparent 55%)",
        }}
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-xl font-semibold tracking-tight text-[#03002C] dark:text-[#E0E8F5] sm:text-2xl">
            Presentation Agent
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-[#03002C]/70 dark:text-[#E0E8F5]/70">
            Describe the presentation you need in plain language. The agent builds a brand-compliant deck,
            picks the right modules, applies your colors, and delivers an editable PowerPoint file — all
            inside one conversation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end sm:gap-1.5">
          {AGENT_CAPABILITIES.map((c) => (
            <span
              key={c}
              className="inline-flex items-center rounded-full bg-[#003FC7]/10 px-2.5 py-1 text-[11px] font-medium text-[#003FC7] dark:bg-[#003FC7]/20 dark:text-[#A1FBF9]"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
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
        <AgentHero />
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
