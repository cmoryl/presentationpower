// Chat surface shared by the Events Agent and the Social Agent: streaming
// replies, visible tool activity, kit proposal cards and a link straight into
// the kit builder.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Loader2, Send, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { findKitIdInMessages, type KitSurface } from "@/lib/kit-agent/threads";
import { sanitizeAgentReply } from "@/lib/agent/sanitize-reply";
import { KIT_PROPOSAL_TOOL_NAME } from "@/lib/kit-agent/tools";
import { KitProposalCard, kitProposalFromTool } from "./KitProposalCard";
import { messagesFingerprint, useKitThreadMessageSync } from "@/lib/kit-agent/sync";

const TOOL_LABELS: Record<string, string> = {
  list_divisions: "Checking divisions",
  list_kit_profiles: "Checking kit profiles",
  list_kit_formats: "Checking formats",
  search_playbooks: "Searching the playbook library",
  [KIT_PROPOSAL_TOOL_NAME]: "Drafting a proposal",
  list_my_kits: "Reading your kits",
  read_kit: "Reading the kit",
  create_kit: "Creating the kit",
  update_kit: "Updating the kit",
  read_brief: "Recalling the brief",
  save_brief: "Saving the brief",
  list_looks: "Reviewing art directions",
  set_kit_look: "Locking the art direction",
  audit_kit: "Checking the kit for gaps",
  create_companion_kit: "Building the companion kit",
};

function toolNameOf(type: string) {
  return type.startsWith("tool-") ? type.slice(5) : type;
}

export function KitAgentChat({
  surface,
  threadId,
  initialMessages,
  onKitDetected,
  onFirstUserMessage,
  pendingPrompt,
  onPendingPromptConsumed,
}: {
  surface: KitSurface;
  threadId: string;
  initialMessages: UIMessage[];
  onKitDetected?: (kitId: string) => void;
  onFirstUserMessage?: (text: string) => void;
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/kit-agent-chat",
        body: { threadId, surface },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId, surface],
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "The agent hit an error."),
  });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenKit = useRef<string | null>(null);
  const busy = status === "submitted" || status === "streaming";

  // The stored history is the source of truth, so a conversation continued on
  // another device (or tab) catches up here on focus / idle poll. Never while a
  // local turn is streaming — that reply is not in the database yet.
  const localPrint = messagesFingerprint(messages);
  const printRef = useRef(localPrint);
  printRef.current = localPrint;
  useKitThreadMessageSync({
    threadId,
    enabled: true,
    paused: busy,
    onRemoteMessages: (remote) => {
      const next = messagesFingerprint(remote);
      if (next === printRef.current) return;
      // Only adopt the remote snapshot when it is at least as complete, so a
      // slow read can never roll the visible conversation backwards.
      if (remote.length === 0) return;
      setMessages(remote);
    },
  });

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    const kitId = findKitIdInMessages(messages);
    if (kitId && seenKit.current !== kitId) {
      seenKit.current = kitId;
      onKitDetected?.(kitId);
    }
  }, [messages, onKitDetected]);

  const submit = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      if (messages.length === 0) onFirstUserMessage?.(value);
      setInput("");
      void sendMessage({ text: value });
    },
    [busy, messages.length, onFirstUserMessage, sendMessage],
  );

  const sentPending = useRef(false);
  useEffect(() => {
    if (!pendingPrompt || sentPending.current || busy) return;
    sentPending.current = true;
    submit(pendingPrompt);
    onPendingPromptConsumed?.();
  }, [pendingPrompt, busy, submit, onPendingPromptConsumed]);

  const latestKit = findKitIdInMessages(messages);
  const builderTo = surface === "social" ? "/social/new" : "/events/new";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
            {surface === "social"
              ? "Tell me the campaign you need — the message, the audience, and the division it is for."
              : "Tell me the event — name, city, dates and the division it is for — and what you need on site."}
          </p>
        ) : null}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
              <div className={`w-full max-w-2xl space-y-3 ${isUser ? "sm:max-w-lg" : ""}`}>
                {m.parts.map((part, i) => {
                  const key = `${m.id}-${i}`;
                  if (part.type === "text") {
                    const text = isUser ? part.text : sanitizeAgentReply(part.text);
                    if (!text.trim()) return null;
                    return (
                      <div
                        key={key}
                        className={
                          isUser
                            ? "rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                            : "whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                        }
                      >
                        {text}
                      </div>
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    const name = toolNameOf(part.type);
                    if (name === KIT_PROPOSAL_TOOL_NAME) {
                      const proposal = kitProposalFromTool(part);
                      if (proposal) return <KitProposalCard key={key} proposal={proposal} />;
                    }
                    const state = (part as { state?: string }).state ?? "";
                    const done = state === "output-available" || state === "output-error";
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        {done ? (
                          <Wrench className="size-3.5" aria-hidden />
                        ) : (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        )}
                        <span>{TOOL_LABELS[name] ?? name.replace(/_/g, " ")}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        })}

        {busy ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Working…
          </div>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error.message}</p> : null}
      </div>

      {latestKit ? (
        <div className="border-t border-border bg-muted/40 px-4 py-2 text-xs sm:px-6">
          <Link to={builderTo} search={{ kit: latestKit }} className="font-medium underline">
            Open the kit in the builder
          </Link>
        </div>
      ) : null}

      <div className="border-t border-border bg-background px-4 pt-2 sm:px-6">
        <AgentDocumentUpload docs={docs} onChange={setDocs} disabled={busy} />
      </div>


      <form
        className="flex items-end gap-2 border-t border-border bg-background px-4 py-3 sm:px-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={2}
          placeholder={
            surface === "social"
              ? "e.g. Build a LinkedIn + IG launch kit for GlobalLink continuous localization"
              : "e.g. Build an event kit for DIA 2026 in Boston, life sciences, booth E42"
          }
          aria-label={
            surface === "social" ? "Message the social agent" : "Message the events agent"
          }
          className="min-h-[56px] resize-none"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0"
          disabled={busy || !input.trim()}
          aria-label="Send"
        >
          <Send className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
