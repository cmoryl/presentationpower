import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, X, ArrowUp, Loader2, Wand2, BookOpen } from "lucide-react";
import { copilotTurn, type CopilotResult } from "@/lib/ai-copilot.functions";
import { snapshotDeckVersion } from "@/lib/deck-versions.functions";
import { useDeckStore } from "@/lib/deck-store";
import { byId, MODULE_VARIANTS, SECTION_FRAMEWORKS } from "@/lib/taxonomy";

type Msg = { role: "user" | "assistant"; content: string };

export function CopilotPanel({ deckId, onHighlight }: { deckId: string; onHighlight?: (indices: number[]) => void }) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const applyCopilotUpdates = useDeckStore((s) => s.applyCopilotUpdates);
  const call = useServerFn(copilotTurn);
  const snapshot = useServerFn(snapshotDeckVersion);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  if (!deck) return null;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setBusy(true);
    try {
      const strategy = deck.context?.strategy
        ? {
            narrativeArc: deck.context.strategy.narrativeArc,
            openingHook: deck.context.strategy.openingHook,
            closingAsk: deck.context.strategy.closingAsk,
          }
        : undefined;
      const result = (await call({
        data: {
          brandModeId: deck.brandModeId,
          subCompany: deck.subCompany,
          brief: brief
            ? {
                prospect: brief.prospect,
                industry: brief.industry,
                audience: brief.audience,
                meetingObjective: brief.meetingObjective,
              }
            : undefined,
          strategy,
          slides: deck.slides.map((s) => ({
            index: s.position,
            sectionId: s.sectionId,
            sectionName: byId(SECTION_FRAMEWORKS, s.sectionId)?.name,
            variantId: s.variantId,
            layoutId: s.layoutId,
            content: s.content as Record<string, unknown>,
            notes: s.notes,
          })),

          messages: messages.slice(-10),
          userMessage: text,
        },
      })) as CopilotResult;

      if (!result.ok) {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${result.error}` }]);
      } else {
        if (result.updatedSlides.length > 0) {
          applyCopilotUpdates(
            deckId,
            result.updatedSlides.map((u) => ({
              index: u.index,
              variantId: u.variantId,
              layoutId: u.layoutId,
              content: u.content,
              notes: u.notes,
            })),

          );
          onHighlight?.(result.changedIndices);
          setTimeout(() => onHighlight?.([]), 2400);
          // Best-effort version snapshot after Copilot batch edits.
          const n = result.changedIndices.length;
          void snapshot({
            data: {
              deckId,
              changeSummary: `Copilot: edited ${n} slide${n === 1 ? "" : "s"}`,
            },
          }).catch(() => {});
        }
        const summary = result.changedIndices.length
          ? `\n\n_Updated slide${result.changedIndices.length === 1 ? "" : "s"} ${result.changedIndices.map((i) => i + 1).join(", ")}._`
          : "";
        setMessages((m) => [...m, { role: "assistant", content: result.reply + summary }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = [
    "Make slide 1 more executive",
    "Tighten every headline",
    "Swap the icon on slide 2 for something about speed",
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-br from-[#0B2A4A] via-[#0B2A4A] to-[#052033] px-5 py-3 text-sm font-medium text-white shadow-[0_20px_60px_-20px_rgba(11,42,74,0.6)] transition hover:scale-[1.02]"
      >
        <Sparkles className="h-4 w-4 text-[#A1FBF9]" />
        Copilot
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#050B18]/95 text-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-[440px] sm:rounded-2xl">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#0B2A4A]/80 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#A1FBF9] to-[#003FC7]">
            <Sparkles className="h-4 w-4 text-[#050B18]" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Deck Copilot</div>
            <div className="text-sm font-medium">{deck.title}</div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Close copilot"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-white/70">
              I can edit this deck directly. Tell me what to change and I'll make the smallest edit that gets it right.
            </div>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-white/70 hover:border-[#A1FBF9]/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#003FC7] to-[#0B2A4A] px-3.5 py-2 text-white"
                  : "max-w-[92%] whitespace-pre-wrap text-white/85"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A1FBF9]" />
            Copilot is editing the deck…
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-white/10 bg-white/[0.02] p-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#0A1424] px-3 py-2 focus-within:border-[#A1FBF9]/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Edit any slide — e.g. tighten headline on slide 3"
            rows={1}
            disabled={busy}
            className="max-h-32 flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A1FBF9] text-[#050B18] disabled:opacity-30"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-white/40">
          <span>Shift+Enter for newline · edits apply to the live deck</span>
          <span>{input.length}/2000</span>
        </div>
      </form>
    </div>
  );
}

// Slide index tracker for flash-highlight; consumers pass the ID array into
// the ScaledSlide wrapper via className.
export function useCopilotFlash() {
  const [changed, setChanged] = useState<number[]>([]);
  return { changed, setChanged };
}

// Keep the legacy inline chat export so existing imports still resolve.
export { CopilotPanel as default };

// Compatibility named export for the earlier DeckChat surface.
export function DeckCopilot(props: { deckId: string; onHighlight?: (indices: number[]) => void }) {
  return <CopilotPanel {...props} />;
}

// Re-export legacy MODULE_VARIANTS reference — no-op to satisfy unused warning
// in tree-shaken environments (keeps import cost zero in production).
void MODULE_VARIANTS;
