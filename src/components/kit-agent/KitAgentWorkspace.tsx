// Workspace shell shared by /events-agent/$threadId and /social-agent/$threadId:
// conversation list on the left, chat in the middle, live link to the kit.
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import { CalendarDays, Megaphone, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/hooks/use-session-user";
import { consumeAgentPrompt } from "@/lib/agent-seed";
import { KitAgentChat } from "./KitAgentChat";
import {
  createKitThread,
  deleteKitThread,
  listKitThreads,
  loadKitThread,
  renameKitThread,
  setKitThreadKit,
  type KitAgentThread,
  type KitSurface,
} from "@/lib/kit-agent/threads";
import { useKitThreadListSync } from "@/lib/kit-agent/sync";
import { AgentScopeNotice } from "@/components/agent/AgentScopeNotice";
import { AgentSignInGate } from "@/components/AgentSignInGate";

const COPY: Record<
  KitSurface,
  {
    eyebrow: string;
    headline: string;
    blurb: string;
    starters: string[];
    threadRoute: "/events-agent/$threadId" | "/social-agent/$threadId";
    indexRoute: "/events-agent" | "/social-agent";
    builderRoute: "/events/new" | "/social/new";
    newLabel: string;
  }
> = {
  event: {
    eyebrow: "Events agent",
    headline: "Build a full event kit in one conversation",
    blurb:
      "Booth graphics, signage, screens, badges, speaker cards and the social posts around the moment — assembled from approved formats and fully editable afterwards.",
    starters: [
      "Build an event kit for DIA 2026 in Boston — life sciences, booth E42, demo theatre at 2pm daily.",
      "Create a conference sponsorship kit for a legal-tech summit in London with two speaker sessions.",
      "Set up a product launch event kit for GlobalLink with signage, screens and invite formats.",
    ],
    threadRoute: "/events-agent/$threadId",
    indexRoute: "/events-agent",
    builderRoute: "/events/new",
    newLabel: "New event conversation",
  },
  social: {
    eyebrow: "Social agent",
    headline: "Build a full social kit in one conversation",
    blurb:
      "Feed squares, portraits, stories, reels, LinkedIn, X and display banners — sized to every platform preset and fully editable afterwards.",
    starters: [
      "Build a LinkedIn + Instagram launch kit for GlobalLink continuous localization for enterprise marketing leaders.",
      "Create a life-sciences thought-leadership social set on regulated content review speed.",
      "Set up an always-on hiring campaign kit for DataForce with story and square formats.",
    ],
    threadRoute: "/social-agent/$threadId",
    indexRoute: "/social-agent",
    builderRoute: "/social/new",
    newLabel: "New social conversation",
  },
};

export function KitAgentWorkspace({
  surface,
  threadId,
}: {
  surface: KitSurface;
  threadId: string;
}) {
  const copy = COPY[surface];
  const userId = useSessionUser();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<KitAgentThread[]>([]);
  const [messages, setMessages] = useState<UIMessage[] | null>(null);
  const [kitId, setKitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  // Pick up a prompt handed off from a hero / quick-start CTA.
  useEffect(() => {
    const seed = consumeAgentPrompt(surface === "social" ? "social" : "event");
    if (seed) setPending(seed);
  }, []);

  const refreshThreads = useCallback(() => {
    listKitThreads(surface)
      .then(setThreads)
      .catch(() => undefined);
  }, [surface]);

  useEffect(() => {
    if (!userId) return;
    setMessages(null);
    loadKitThread(threadId)
      .then(({ thread, messages: msgs }) => {
        setMessages(msgs);
        setKitId(thread.kit_id);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not open this conversation."),
      );
    refreshThreads();
  }, [threadId, userId, refreshThreads]);

  // Threads started or renamed on another device show up in the rail here.
  useKitThreadListSync({ surface, enabled: Boolean(userId), onThreads: setThreads });

  const onKitDetected = useCallback(
    (id: string) => {
      setKitId(id);
      void setKitThreadKit(threadId, id)
        .then(refreshThreads)
        .catch(() => undefined);
    },
    [threadId, refreshThreads],
  );

  const onFirstUserMessage = useCallback(
    (text: string) => {
      const title = text.length > 60 ? `${text.slice(0, 57)}…` : text;
      void renameKitThread(threadId, title)
        .then(refreshThreads)
        .catch(() => undefined);
    },
    [threadId, refreshThreads],
  );

  const newThread = async () => {
    try {
      const t = await createKitThread(surface);
      void navigate({ to: copy.threadRoute, params: { threadId: t.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start a conversation.");
    }
  };

  const removeThread = async (id: string) => {
    try {
      await deleteKitThread(id);
      const rest = threads.filter((t) => t.id !== id);
      setThreads(rest);
      if (id === threadId) void navigate({ to: copy.indexRoute, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that conversation.");
    }
  };

  if (userId === null)
    return (
      <AppShell>
        <AgentSignInGate label={surface === "social" ? "social agent" : "events agent"} />
      </AppShell>
    );

  const Icon = surface === "social" ? Megaphone : CalendarDays;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-6 sm:px-6">
        <header className="mb-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Icon className="size-3.5" aria-hidden /> {copy.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {copy.headline}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.blurb}</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="order-2 space-y-2 lg:order-1">
            <Button onClick={() => void newThread()} className="h-11 w-full justify-start gap-2">
              <Plus className="size-4" aria-hidden /> {copy.newLabel}
            </Button>
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.id} className="group flex items-center gap-1">
                  <Link
                    to={copy.threadRoute}
                    params={{ threadId: t.id }}
                    className={`min-h-11 flex-1 truncate rounded-lg px-3 py-2.5 text-sm ${
                      t.id === threadId ? "bg-muted font-medium" : "hover:bg-muted/60"
                    }`}
                  >
                    {t.title}
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-muted-foreground"
                    aria-label={`Delete ${t.title}`}
                    onClick={() => void removeThread(t.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="order-1 flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:order-2">
            {error ? (
              <div className="p-8 text-sm text-destructive">{error}</div>
            ) : messages === null ? (
              <div className="p-8 text-sm text-muted-foreground">Loading conversation…</div>
            ) : (
              <>
                {messages.length === 0 ? (
                  <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3 sm:px-6">
                    {copy.starters.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPending(s)}
                        className="min-h-11 rounded-full border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="px-4 pb-3">
                  <AgentScopeNotice
                    surface={surface === "social" ? "social agent" : "events agent"}
                  />
                </div>
                <div className="min-h-0 flex-1">
                  <KitAgentChat
                    surface={surface}
                    threadId={threadId}
                    initialMessages={messages}
                    onKitDetected={onKitDetected}
                    onFirstUserMessage={onFirstUserMessage}
                    pendingPrompt={pending}
                    onPendingPromptConsumed={() => setPending(null)}
                  />
                </div>
              </>
            )}
          </section>
        </div>

        {kitId ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Current kit:{" "}
            <Link to={copy.builderRoute} search={{ kit: kitId }} className="font-medium underline">
              open in the kit builder
            </Link>
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
