import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import { oracleChat, type OracleSource } from "@/lib/ai-oracle.functions";

export const Route = createFileRoute("/knowledge/ask")({
  head: () => ({
    meta: [
      { title: "Ask Oracle · TransPerfect Modular" },
      { name: "description", content: "Chat with the TransPerfect knowledge base — cited answers from Oracle, KB, and brand assets." },
    ],
  }),
  component: OracleAskView,
});

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  sources?: OracleSource[];
  fallbackNote?: string;
  setup?: boolean;
};

const STARTERS = [
  "What is GlobalLink?",
  "What's our WCAG guidance?",
  "Which divisions serve life sciences?",
  "How should we describe TransPerfect's voice?",
  "What are our sub-brand governance rules?",
];

function OracleAskView() {
  const ask = useServerFn(oracleChat);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [divisionId, setDivisionId] = useState<string>("master");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setErr(null);
    const nextHistory = messages.map((m) => ({ role: m.role, content: m.content }));
    const optimistic: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(optimistic);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({
        data: {
          messages: nextHistory,
          userMessage: q,
          divisionId: divisionId === "master" ? null : divisionId,
        },
      });
      if (!res.ok) {
        setErr(res.error);
        setMessages([...optimistic, { role: "assistant", content: `Sorry — ${res.error}` }]);
      } else {
        setMessages([...optimistic, { role: "assistant", content: res.reply, sources: res.sources, fallbackNote: res.fallbackNote }]);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 dark:text-white/50">Knowledge</div>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#03002C] dark:text-white">
              <Sparkles size={22} className="text-[#003FC7] dark:text-[#A1FBF9]" />
              Ask Oracle
            </h1>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Cited answers from Oracle KB, knowledge entries, and brand asset chunks.
            </p>
          </div>
          <label className="flex flex-col text-[10px] uppercase tracking-widest text-black/50 dark:text-white/60">
            Division
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="mt-1 rounded-md border border-black/15 bg-white px-2 py-1 text-xs text-black focus:border-[#003FC7] focus:outline-none dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="master">All divisions</option>
              {BRAND_MODES.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>

        {messages.length === 0 && (
          <div className="mb-6 rounded-2xl border border-black/10 bg-white/60 p-5 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-3 text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">Try a starter</div>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/80 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:bg-white/[0.05] dark:text-white/80 dark:hover:border-[#A1FBF9] dark:hover:text-[#A1FBF9]"
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#003FC7] dark:bg-[#A1FBF9]" />
              Thinking…
            </div>
          )}
          {err && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{err}</div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="sticky bottom-6 mt-6 flex items-end gap-2 rounded-2xl border border-black/10 bg-white/80 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#07061F]/70"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Ask about brand voice, divisions, capabilities…"
            className="flex-1 resize-none bg-transparent text-sm text-black outline-none placeholder:text-black/40 dark:text-white dark:placeholder:text-white/40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#003FC7] px-4 text-xs font-medium uppercase tracking-widest text-white hover:bg-[#0033a8] disabled:opacity-40 dark:bg-[#A1FBF9] dark:text-[#03002C]"
          >
            <Send size={14} /> Send
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-[#003FC7] px-4 py-2.5 text-sm text-white dark:bg-[#0057FF]"
            : "max-w-[92%] rounded-2xl rounded-tl-sm border border-black/10 bg-white px-4 py-3 text-sm text-black shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
        }
      >
        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
        {!isUser && msg.fallbackNote && (
          <div className="mt-3 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            ⚠︎ {msg.fallbackNote}
          </div>
        )}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-black/[0.06] pt-2 dark:border-white/10">
            {msg.sources.map((s) => (
              <SourceChip key={`${s.n}-${s.id}`} src={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceChip({ src }: { src: OracleSource }) {
  const label = `[${src.n}] ${src.title}`;
  const cls =
    "inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[10px] text-black/70 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:bg-white/[0.05] dark:text-white/70 dark:hover:border-[#A1FBF9] dark:hover:text-[#A1FBF9]";
  if (src.href) {
    return <a href={src.href} className={cls}>{label}</a>;
  }
  return <span className={cls} title={src.id}>{label}</span>;
}
