import { useRef, useState } from "react";
import type { Deck } from "@/lib/deck-store";
import { byId, MODULE_VARIANTS, NARRATIVE_ARCHETYPES, SECTION_FRAMEWORKS } from "@/lib/taxonomy";

type Msg = { role: "user" | "assistant"; content: string };

export function DeckChat({
  deck,
  brief,
}: {
  deck: Deck;
  brief?: { prospect: string; industry: string; audience: string; archetypeId: string };
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const deckContext = {
      title: deck.title,
      prospect: brief?.prospect,
      industry: brief?.industry,
      audience: brief?.audience,
      archetype: brief ? byId(NARRATIVE_ARCHETYPES, brief.archetypeId)?.name : undefined,
      slides: deck.slides.map((s) => ({
        position: s.position,
        section: byId(SECTION_FRAMEWORKS, s.sectionId)?.name ?? s.sectionId,
        variant: byId(MODULE_VARIANTS, s.variantId)?.name ?? s.variantId,
        title: typeof s.content.title === "string" ? (s.content.title as string) : undefined,
      })),
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, deckContext }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${res.status} ${t.slice(0, 200)}` },
        ]);
        setStreaming(false);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant")
            copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${(e as Error).message}` },
        ]);
      }
    } finally {
      setStreaming(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-[#0B2A4A] px-5 py-3 text-sm font-medium text-white shadow-lg hover:opacity-90"
      >
        Ask about this deck
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[560px] w-[400px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-black/50">Deck assistant</div>
          <div className="text-sm font-medium">{deck.title}</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md px-2 py-1 text-sm text-black/60 hover:bg-black/5"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
        {messages.length === 0 && (
          <div className="text-black/50">
            Ask about narrative, pacing, or where the story is weak. I read the deck outline — not
            the slide bodies — so keep questions strategic.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-[#0B2A4A] text-white" : "bg-black/5"}`}
            >
              <div className="whitespace-pre-wrap">
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-black/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Is our story tight enough for an exec audience?"
          className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm focus:border-[#0B2A4A] focus:outline-none"
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-[#0B2A4A] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
