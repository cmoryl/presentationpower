// Chat surface for the PowerPoint agent: streaming messages, visible tool
// activity, and an always-focused composer.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { findDeckIdInMessages } from "@/lib/agent/threads";

const STARTERS = [
  "Build a 10-slide GlobalLink pitch for a global retail prospect moving to continuous localization.",
  "Create a QBR deck for a life-sciences client: SLA performance, cost savings, roadmap.",
  "I need an event keynote deck introducing TransPerfect NEXT 2026 to enterprise marketing leaders.",
];

export function AgentChat({
  threadId,
  initialMessages,
  onDeckDetected,
  onActivity,
  onFirstUserMessage,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onDeckDetected: (deckId: string) => void;
  onActivity: () => void;
  onFirstUserMessage: (text: string) => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent-chat",
        body: { threadId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "The agent hit an error."),
    onFinish: () => onActivity(),
  });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const seenDeck = useRef<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    const deckId = findDeckIdInMessages(messages);
    if (deckId && seenDeck.current !== deckId) {
      seenDeck.current = deckId;
      onDeckDetected(deckId);
    }
  }, [messages, onDeckDetected]);

  // Tool calls mutate the deck mid-stream; refresh the preview as they land.
  const toolSignature = messages
    .flatMap((m) => m.parts.map((p) => `${p.type}:${(p as { state?: string }).state ?? ""}`))
    .join("|");
  useEffect(() => {
    if (toolSignature) onActivity();
  }, [toolSignature, onActivity]);

  const submit = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      if (messages.length === 0) onFirstUserMessage(value);
      setInput("");
      void sendMessage({ text: value });
    },
    [busy, messages.length, onFirstUserMessage, sendMessage],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Build a presentation by talking it through
            </h1>
            <p className="text-sm text-foreground/55">
              Describe the audience, the story and the length. The agent picks the division, the
              narrative archetype and brand-approved modules, writes the copy and speaker notes, and
              hands back a deck you can open in the editor or export to PowerPoint.
            </p>
            <div className="space-y-2 pt-2 text-left">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="block w-full rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-xs text-foreground/75 transition hover:border-[#003FC7] hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {status === "submitted" && (
          <div className="flex items-center gap-2 text-xs text-foreground/50">
            <span className="inline-flex gap-1">
              <Dot /> <Dot delay="120ms" /> <Dot delay="240ms" />
            </span>
            Thinking…
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error.message}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-border/60 bg-background/80 p-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 focus-within:border-[#003FC7]">
          <textarea
            ref={inputRef}
            value={input}
            rows={2}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder="Describe the deck you need, or ask for an edit…"
            aria-label="Message the presentation agent"
            className="max-h-40 flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/35"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-xl bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40 hover:brightness-110"
          >
            {busy ? "Working…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#003FC7]"
      style={{ animationDelay: delay }}
    />
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#003FC7] text-white"
            : "border border-border/60 bg-background/70 text-foreground/85"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <RichText key={i} text={part.text} />;
          }
          if (part.type === "reasoning") return null;
          if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
            const p = part as { toolName?: string; state?: string; output?: unknown };
            const name = p.toolName ?? part.type.replace(/^tool-/, "");
            const done = p.state === "output-available";
            const failed = typeof p.output === "string" && p.output.startsWith("ERROR:");
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-foreground/[0.05] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground/55"
              >
                <span>{failed ? "✕" : done ? "✓" : "⏳"}</span>
                <span className="truncate">{name}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
