// Print agent workspace: conversation list on the left, chat in the middle,
// and a live link to whatever print piece the agent is building.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import { Plus, Printer, Trash2 } from "lucide-react";
import { consumeAgentPrompt } from "@/lib/agent-seed";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/hooks/use-session-user";
import { PrintAgentChat } from "@/components/print-agent/PrintAgentChat";
import { AgentScopeNotice } from "@/components/agent/AgentScopeNotice";
import { AgentSignInGate } from "@/components/AgentSignInGate";
import {
  createPrintThread,
  deletePrintThread,
  listPrintThreads,
  loadPrintThread,
  renamePrintThread,
  setPrintThreadAsset,
  type PrintAgentThread,
} from "@/lib/print-agent/threads";

const STARTERS = [
  "Build a life-sciences case study for a top-20 pharma on clinical document localization.",
  "Create a GlobalLink e-brochure for enterprise marketing leaders moving to continuous localization.",
  "Draft a legal division solution proposal for an eDiscovery review across 12 languages.",
];

export const Route = createFileRoute("/print-agent/$threadId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Print agent · TransPerfect Element" },
      {
        name: "description",
        content:
          "Build case studies, spotlights, e-brochures and solution proposals with the Element print agent.",
      },
      { property: "og:title", content: "Print agent · TransPerfect Element" },
      {
        property: "og:description",
        content: "Build brand-compliant print pieces end to end in one conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrintAgentThreadPage,
});

function PrintAgentThreadPage() {
  const { threadId } = Route.useParams();
  const userId = useSessionUser();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<PrintAgentThread[]>([]);
  const [messages, setMessages] = useState<UIMessage[] | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  // Pick up a prompt handed off from a hero / quick-start CTA.
  useEffect(() => {
    const seed = consumeAgentPrompt("print");
    if (seed) setPending(seed);
  }, []);

  const refreshThreads = useCallback(() => {
    listPrintThreads()
      .then(setThreads)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setMessages(null);
    loadPrintThread(threadId)
      .then(({ thread, messages: msgs }) => {
        setMessages(msgs);
        setAssetId(thread.print_asset_id);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not open this conversation."),
      );
    refreshThreads();
  }, [threadId, userId, refreshThreads]);

  const onAssetDetected = useCallback(
    (id: string) => {
      setAssetId(id);
      void setPrintThreadAsset(threadId, id)
        .then(refreshThreads)
        .catch(() => undefined);
    },
    [threadId, refreshThreads],
  );

  const onFirstUserMessage = useCallback(
    (text: string) => {
      const title = text.length > 60 ? `${text.slice(0, 57)}…` : text;
      void renamePrintThread(threadId, title)
        .then(refreshThreads)
        .catch(() => undefined);
    },
    [threadId, refreshThreads],
  );

  const newThread = async () => {
    try {
      const t = await createPrintThread();
      void navigate({ to: "/print-agent/$threadId", params: { threadId: t.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start a conversation.");
    }
  };

  const removeThread = async (id: string) => {
    try {
      await deletePrintThread(id);
      const rest = threads.filter((t) => t.id !== id);
      setThreads(rest);
      if (id === threadId) void navigate({ to: "/print-agent", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that conversation.");
    }
  };

  if (userId === null)
    return (
      <AppShell>
        <AgentSignInGate label="print agent" />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-6 sm:px-6">
        <header className="mb-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Printer className="size-3.5" aria-hidden /> Print agent
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Build any print piece in one conversation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Case studies, client spotlights, e-brochures, MSA one-pagers and solution proposals —
            assembled from the approved print module library and fully editable afterwards.
          </p>
        </header>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="order-2 min-w-0 space-y-2 lg:order-1">
            <Button onClick={() => void newThread()} className="h-11 w-full justify-start gap-2">
              <Plus className="size-4" aria-hidden /> New print conversation
            </Button>
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.id} className="group flex items-center gap-1">
                  <Link
                    to="/print-agent/$threadId"
                    params={{ threadId: t.id }}
                    className={`min-h-11 min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-sm ${
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

          <section className="order-1 flex min-h-[70vh] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:order-2">
            {error ? (
              <div className="p-8 text-sm text-destructive">{error}</div>
            ) : messages === null ? (
              <div className="p-8 text-sm text-muted-foreground">Loading conversation…</div>
            ) : (
              <>
                {messages.length === 0 ? (
                  <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3 sm:px-6">
                    {STARTERS.map((s) => (
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
                  <AgentScopeNotice surface="print agent" />
                </div>
                <div className="min-h-0 flex-1">
                  <PrintAgentChat
                    threadId={threadId}
                    initialMessages={messages}
                    onAssetDetected={onAssetDetected}
                    onFirstUserMessage={onFirstUserMessage}
                    pendingPrompt={pending}
                    onPendingPromptConsumed={() => setPending(null)}
                  />
                </div>
              </>
            )}
          </section>
        </div>

        {assetId ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Current piece:{" "}
            <Link to="/asset/$assetId" params={{ assetId }} className="font-medium underline">
              open in the print editor
            </Link>
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
