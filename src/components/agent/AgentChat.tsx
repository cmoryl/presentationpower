// Chat surface for the PowerPoint agent: streaming messages, visible tool
// activity, and an always-focused composer.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { findDeckIdInMessages, appendAgentMessages, setAgentThreadDeck } from "@/lib/agent/threads";
import {
  DEMO_FAST_BUILD_TRIGGER,
  GLOBALLINK_Q3_QBR_DECK,
  demoBuildSteps,
  demoFinalAssistantText,
  isDemoFastBuildPrompt,
  type DemoToolPart,
} from "@/lib/agent/demo-fast-build";
import { setDeckBuildState } from "@/lib/agent/build-progress";
import { useDeckStore } from "@/lib/deck-store";
import { sanitizeAgentReply } from "@/lib/agent/sanitize-reply";
import { readStoredDesignDna } from "@/lib/agent/design-dna";
import { AgentDesignDnaImport } from "@/components/agent/AgentDesignDnaImport";
import { AgentDesignOverrides } from "@/components/agent/AgentDesignOverrides";
import { readStoredDesignOverrides } from "@/lib/agent/design-overrides";
import { AgentDocumentUpload, useAgentDocuments } from "@/components/agent/AgentDocumentUpload";
import { withDocumentContext } from "@/lib/agent/doc-intake";

import { AgentStatusTimeline } from "@/components/agent/AgentStatusTimeline";
import { AgentOutlinePreview, outlineFromToolInput } from "@/components/agent/AgentOutlinePreview";
import { OUTLINE_TOOL_NAME } from "@/lib/agent/outline-tool";
import { VISUAL_PLAN_TOOL_NAME } from "@/lib/agent/design-knowledge";
import { AgentVisualPlan, planFromToolOutput } from "./AgentVisualPlan";
import { AgentVisualPreview, visualPreviewFromToolOutput } from "./AgentVisualPreview";
import { AgentVisualOptions, visualOptionsFromToolOutput } from "./AgentVisualOptions";
import { AgentStatsMapping, statsMappingFromToolOutput } from "./AgentStatsMapping";
import { STATS_MAPPING_TOOL_NAME } from "@/lib/agent/stats-mapping";
import {
  DATA_VISUAL_PREVIEW_TOOL_NAME,
  DATA_VISUAL_OPTIONS_TOOL_NAME,
} from "@/lib/agent/data-visuals";

const STARTERS = [
  DEMO_FAST_BUILD_TRIGGER,
  "Build a 10-slide GlobalLink pitch for a global retail prospect moving to continuous localization.",
  "Create a QBR deck for a life-sciences client: SLA performance, cost savings, roadmap.",
  "I need an event keynote deck introducing TransPerfect NEXT 2026 to enterprise marketing leaders.",
];

type DeckAppearance = "light" | "dark" | "mixed";

const APPEARANCE_OPTIONS: Array<{ id: DeckAppearance; label: string; description: string }> = [
  { id: "light", label: "Light", description: "Enterprise Light" },
  { id: "dark", label: "Dark", description: "Enterprise Dark" },
  { id: "mixed", label: "Mixed", description: "Dark bookends, light body" },
];

function creationAppearanceLine(appearance: DeckAppearance) {
  if (appearance === "mixed") {
    return "Deck appearance: mixed — use a dark cover and closing slide, with light working slides between.";
  }
  if (appearance === "dark") {
    return "Deck appearance: dark — use Enterprise Dark across the whole deck.";
  }
  return "Deck appearance: light — use Enterprise Light across the whole deck.";
}

export function AgentChat({
  threadId,
  initialMessages,
  onDeckDetected,
  onActivity,
  onFirstUserMessage,
  onMessageCountChange,
  pendingPrompt,
  onPendingPromptConsumed,
  progressContainer,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onDeckDetected: (deckId: string) => void;
  onActivity: () => void;
  onFirstUserMessage: (text: string) => void;
  onMessageCountChange?: (count: number) => void;
  /** Prompt handed over from the hero quick-start form; auto-sent once. */
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
  /** When provided, the generation timeline renders here (e.g. the page hero). */
  progressContainer?: HTMLElement | null;
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

  const { messages, sendMessage, setMessages, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "The agent hit an error."),
    onFinish: () => onActivity(),
  });

  const [input, setInput] = useState("");
  const [appearance, setAppearance] = useState<DeckAppearance>("mixed");
  const { docs, setDocs } = useAgentDocuments();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasUserBrief = useMemo(() => messages.some((m) => m.role === "user"), [messages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const streamBusy = status === "submitted" || status === "streaming";
  const [demoBusy, setDemoBusy] = useState(false);
  const busy = streamBusy || demoBusy;
  const seenDeck = useRef<string | null>(null);
  // Incremented to cancel an in-flight demo build (thread switch / unmount).
  const demoRunId = useRef(0);
  useEffect(() => {
    return () => {
      demoRunId.current += 1;
    };
  }, [threadId]);

  /**
   * Demo fast-path: when the brief matches the demo trigger, skip the server
   * round-trip and play a staged build against a pre-authored, QA-clean deck
   * snapshot. The same message parts and tool states the live stream produces
   * drive the UI, so the timeline, tool chips and preview all behave normally.
   */
  const runDemoBuild = useCallback(
    async (briefText: string, isFirstCreationTurn: boolean) => {
      const runId = (demoRunId.current += 1);
      const alive = () => demoRunId.current === runId;
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      setDemoBusy(true);
      setInput("");
      if (isFirstCreationTurn) onFirstUserMessage(briefText);

      const userMsg: UIMessage = {
        id: `demo-u-${runId}-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: briefText }],
      };
      const asstId = `demo-a-${runId}-${Date.now()}`;
      const render = (text: string, tools: DemoToolPart[]): UIMessage => ({
        id: asstId,
        role: "assistant",
        parts: [{ type: "text", text }, ...(tools as unknown as UIMessage["parts"])],
      });
      const push = (msg: UIMessage) =>
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === msg.id);
          if (idx === -1) return [...prev, msg];
          const next = prev.slice();
          next[idx] = msg;
          return next;
        });

      let deckId: string | null = null;
      // Restores every authored slide; runs if the staged build is interrupted
      // (thread switch, unmount, navigating straight to the editor) so the deck
      // is never left truncated mid-reveal.
      let restoreFullDeck: (() => void) | null = null;
      try {
        // Create the deck up front (fast, local) so the mid-build createDeck
        // tool part can carry the real id and the preview can pop live.
        deckId = useDeckStore.getState().createDeckFromSnapshot(GLOBALLINK_Q3_QBR_DECK).deckId;
        const completeDeck = useDeckStore.getState().decks[deckId];
        const completeSlides = completeDeck?.slides ?? [];
        const totalSlides = completeSlides.length;

        const slideLabel = (index: number) => {
          const content = completeSlides[index]?.content as
            | { title?: unknown; heading?: unknown }
            | undefined;
          const label = content?.title ?? content?.heading;
          return typeof label === "string" && label.trim() ? label.trim() : `Slide ${index + 1}`;
        };
        const revealSlides = (count: number) => {
          const visibleSlides = completeSlides.slice(0, count).map((slide, index) => ({
            ...slide,
            position: index,
          }));
          useDeckStore.setState((state) => {
            const deck = state.decks[deckId!];
            if (!deck) return state;
            return {
              decks: {
                ...state.decks,
                [deckId!]: { ...deck, slides: visibleSlides },
              },
            };
          });
          // Publish slide-by-slide progress for the live preview indicator.
          setDeckBuildState(deckId!, {
            total: totalSlides,
            done: count,
            currentLabel: count < totalSlides ? slideLabel(count) : null,
            building: count < totalSlides,
          });
          onActivity();
        };
        restoreFullDeck = () => revealSlides(totalSlides);
        setDeckBuildState(deckId, {
          total: totalSlides,

          done: 0,
          currentLabel: slideLabel(0),
          building: true,
        });
        revealSlides(0);
        // Local snapshot decks use short nanoids, not the UUIDs the message
        // scanner expects — hand the id to the preview directly.
        seenDeck.current = deckId;
        onDeckDetected(deckId);
        const steps = demoBuildSteps(deckId);
        push(userMsg);
        for (const step of steps) {
          if (!alive()) return;
          push(render(step.text, step.tools));
          if (typeof step.revealSlides === "number") revealSlides(step.revealSlides);
          onActivity();
          await sleep(step.holdMs);
        }
        if (!alive()) return;
        revealSlides(completeSlides.length);
        setDeckBuildState(deckId, null);
        const lastStep = steps.at(-1);
        const finalMsg = render(demoFinalAssistantText(), lastStep?.tools ?? []);
        push(finalMsg);
        onActivity();
        // Persist so a reload shows the same conversation and linked deck.
        void appendAgentMessages(threadId, [userMsg, finalMsg]).catch(() => {});
        void setAgentThreadDeck(threadId, deckId).catch(() => {});
        toast.success("Deck ready — open it in the editor or export to PowerPoint.");
      } finally {
        // An interrupted reveal must still leave a complete, editable deck.
        if (!alive()) restoreFullDeck?.();
        if (deckId) setDeckBuildState(deckId, null);
        if (alive()) setDemoBusy(false);
      }
    },
    [onActivity, onDeckDetected, onFirstUserMessage, setMessages, threadId],
  );

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
      const isFirstCreationTurn = !hasUserBrief;
      // Demo fast-path: pre-authored QA-clean deck, staged like a live build.
      if (isDemoFastBuildPrompt(value)) {
        void runDemoBuild(value, isFirstCreationTurn);
        return;
      }
      if (isFirstCreationTurn) onFirstUserMessage(value);
      setInput("");
      // An imported knowledge map + one-off overrides travel with every turn.
      const dna = readStoredDesignDna(threadId);
      const designOverrides = readStoredDesignOverrides(threadId);
      const body = {
        ...(dna ? { designDna: dna } : {}),
        ...(designOverrides ? { designOverrides } : {}),
      };
      const agentText = isFirstCreationTurn
        ? `${value}\n\n${creationAppearanceLine(appearance)}`
        : value;
      const withDocs = withDocumentContext(agentText, docs);
      void sendMessage({ text: withDocs }, Object.keys(body).length ? { body } : undefined);
    },
    [appearance, busy, docs, hasUserBrief, onFirstUserMessage, runDemoBuild, sendMessage, threadId],
  );

  // The newest outline proposal is the only one that still offers actions.
  const lastOutlineMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const hit = messages[i]?.parts.some(
        (p) =>
          p.type === `tool-${OUTLINE_TOOL_NAME}` ||
          (p.type === "dynamic-tool" &&
            (p as { toolName?: string }).toolName === OUTLINE_TOOL_NAME),
      );
      if (hit) return i;
    }
    return -1;
  }, [messages]);

  // Same for the newest visual preview: only it keeps save / try-another.
  const lastVisualPreviewMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const hit = messages[i]?.parts.some(
        (p) =>
          p.type === `tool-${DATA_VISUAL_PREVIEW_TOOL_NAME}` ||
          p.type === `tool-${DATA_VISUAL_OPTIONS_TOOL_NAME}` ||
          p.type === `tool-${STATS_MAPPING_TOOL_NAME}` ||
          (p.type === "dynamic-tool" &&
            [
              DATA_VISUAL_PREVIEW_TOOL_NAME,
              DATA_VISUAL_OPTIONS_TOOL_NAME,
              STATS_MAPPING_TOOL_NAME,
            ].includes((p as { toolName?: string }).toolName ?? "")),
      );
      if (hit) return i;
    }
    return -1;
  }, [messages]);

  useEffect(() => {
    onMessageCountChange?.(messages.length);
  }, [messages.length, onMessageCountChange]);

  // Quick-start brief from the hero: send it as the first turn, then clear it.
  useEffect(() => {
    const value = pendingPrompt?.trim();
    if (!value || busy) return;
    submit(value);
    onPendingPromptConsumed?.();
  }, [pendingPrompt, busy, submit, onPendingPromptConsumed]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-6">
        {!hasUserBrief && (
          <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Build a presentation by talking it through
            </h1>
            <p className="text-sm text-foreground/55">
              Describe the audience, the story and the length. The agent picks the division, the
              narrative archetype and brand-approved modules, writes the copy and speaker notes, and
              hands back a deck you can open in the editor or export to PowerPoint.
            </p>
            <fieldset className="rounded-2xl border border-border/70 bg-background/70 p-3 text-left">
              <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
                Deck appearance
              </legend>
              <div className="mt-1 grid gap-2 sm:grid-cols-3">
                {APPEARANCE_OPTIONS.map((option) => {
                  const active = appearance === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAppearance(option.id)}
                      aria-pressed={active}
                      className={
                        "rounded-xl border px-3 py-2 text-left transition " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background text-foreground/70 hover:border-primary hover:text-foreground")
                      }
                    >
                      <span className="block text-xs font-semibold">{option.label}</span>
                      <span className="block text-[10px] opacity-70">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
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

        {messages.map((m, mi) => (
          <MessageBubble
            key={m.id}
            message={m}
            latestOutline={mi === lastOutlineMessage}
            latestVisualPreview={mi === lastVisualPreviewMessage}
            busy={busy}
            onSubmit={submit}
          />
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

      {progressContainer ? (
        createPortal(
          <AgentStatusTimeline
            messages={messages}
            status={demoBusy ? "streaming" : status}
            hasDeck={Boolean(seenDeck.current)}
            variant="hero"
          />,
          progressContainer,
        )
      ) : (
        <AgentStatusTimeline
          messages={messages}
          status={demoBusy ? "streaming" : status}
          hasDeck={Boolean(seenDeck.current)}
        />
      )}

      <div className="border-t border-border/60 bg-background/60 px-3 pt-2">
        <AgentDesignDnaImport threadId={threadId} />
        <AgentDesignOverrides threadId={threadId} />
        <div className="pb-2 pt-1">
          <AgentDocumentUpload docs={docs} onChange={setDocs} disabled={busy} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="bg-background/80 p-3"
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

/** Pull a human-readable failure message out of a tool result, if it failed. */
function toolErrorText(output: unknown): string | null {
  if (typeof output === "string") {
    const t = output.trim();
    if (/^(ERROR:|Rejected:)/i.test(t)) return t.replace(/^ERROR:\s*/i, "");
    return null;
  }
  if (!output || typeof output !== "object") return null;
  const o = output as { error?: unknown; isError?: boolean; content?: unknown; ok?: boolean };
  if (typeof o.error === "string" && o.error.trim()) return o.error.trim();
  if (o.isError && Array.isArray(o.content)) {
    const text = (o.content as Array<{ text?: unknown }>)
      .map((c) => (typeof c?.text === "string" ? c.text : ""))
      .filter(Boolean)
      .join(" ")
      .trim();
    if (text) return text.replace(/^ERROR:\s*/i, "");
  }
  // MCP tools return their payload as JSON text; surface an embedded error too.
  if (Array.isArray(o.content)) {
    for (const c of o.content as Array<{ text?: unknown }>) {
      if (typeof c?.text !== "string") continue;
      try {
        const parsed = JSON.parse(c.text) as { error?: unknown; ok?: boolean };
        if (typeof parsed?.error === "string" && parsed.error.trim()) return parsed.error.trim();
      } catch {
        if (/^(ERROR:|Rejected:)/i.test(c.text.trim()))
          return c.text.trim().replace(/^ERROR:\s*/i, "");
      }
    }
  }
  return null;
}

function MessageBubble({
  message,
  latestOutline = false,
  latestVisualPreview = false,
  busy = false,
  onSubmit,
}: {
  message: UIMessage;
  latestOutline?: boolean;
  latestVisualPreview?: boolean;
  busy?: boolean;
  onSubmit?: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const hasWide = message.parts.some(
    (p) =>
      p.type === `tool-${VISUAL_PLAN_TOOL_NAME}` ||
      p.type === `tool-${DATA_VISUAL_PREVIEW_TOOL_NAME}` ||
      p.type === `tool-${DATA_VISUAL_OPTIONS_TOOL_NAME}` ||
      p.type === `tool-${STATS_MAPPING_TOOL_NAME}` ||
      (p.type === "dynamic-tool" &&
        [
          VISUAL_PLAN_TOOL_NAME,
          DATA_VISUAL_PREVIEW_TOOL_NAME,
          DATA_VISUAL_OPTIONS_TOOL_NAME,
          STATS_MAPPING_TOOL_NAME,
        ].includes((p as { toolName?: string }).toolName ?? "")),
  );
  const hasOutline = message.parts.some(
    (p) =>
      p.type === `tool-${OUTLINE_TOOL_NAME}` ||
      (p.type === "dynamic-tool" && (p as { toolName?: string }).toolName === OUTLINE_TOOL_NAME),
  );
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`${hasOutline || hasWide ? "w-full max-w-full" : "max-w-[85%]"} space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#003FC7] text-white"
            : "border border-border/60 bg-background/70 text-foreground/85"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <RichText key={i} text={isUser ? part.text : sanitizeAgentReply(part.text)} />;
          }

          if (part.type === "reasoning") return null;
          if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
            const p = part as {
              toolName?: string;
              state?: string;
              output?: unknown;
              input?: unknown;
            };
            const name = p.toolName ?? part.type.replace(/^tool-/, "");
            if (name === OUTLINE_TOOL_NAME) {
              const outline = outlineFromToolInput(p.input);
              if (!outline) {
                return (
                  <p key={i} className="text-xs text-foreground/50">
                    Drafting the outline…
                  </p>
                );
              }
              return (
                <AgentOutlinePreview
                  key={i}
                  outline={outline}
                  actionable={latestOutline && Boolean(onSubmit)}
                  busy={busy}
                  onSubmit={(text) => onSubmit?.(text)}
                />
              );
            }
            if (name === VISUAL_PLAN_TOOL_NAME) {
              const plan = planFromToolOutput(p.output);
              if (!plan)
                return (
                  <p key={i} className="text-xs text-foreground/50">
                    Mapping the visual direction…
                  </p>
                );
              return <AgentVisualPlan key={i} plan={plan} />;
            }
            if (name === DATA_VISUAL_OPTIONS_TOOL_NAME) {
              const optionSet = visualOptionsFromToolOutput(p.output);
              if (!optionSet)
                return (
                  <p key={i} className="text-xs text-foreground/50">
                    Rendering visualisation options…
                  </p>
                );
              return (
                <AgentVisualOptions
                  key={i}
                  optionSet={optionSet}
                  actionable={latestVisualPreview && Boolean(onSubmit)}
                  busy={busy}
                  onSubmit={(text) => onSubmit?.(text)}
                />
              );
            }
            if (name === STATS_MAPPING_TOOL_NAME) {
              const mapping = statsMappingFromToolOutput(p.output);
              if (!mapping)
                return (
                  <p key={i} className="text-xs text-foreground/50">
                    Mapping the figures…
                  </p>
                );
              return (
                <AgentStatsMapping
                  key={i}
                  mapping={mapping}
                  actionable={latestVisualPreview && Boolean(onSubmit)}
                  busy={busy}
                  onSubmit={(text) => onSubmit?.(text)}
                />
              );
            }
            if (name === DATA_VISUAL_PREVIEW_TOOL_NAME) {
              const preview = visualPreviewFromToolOutput(p.output);
              if (!preview)
                return (
                  <p key={i} className="text-xs text-foreground/50">
                    Rendering the visual…
                  </p>
                );
              return (
                <AgentVisualPreview
                  key={i}
                  preview={preview}
                  actionable={latestVisualPreview && Boolean(onSubmit)}
                  busy={busy}
                  onSubmit={(text) => onSubmit?.(text)}
                />
              );
            }
            const done = p.state === "output-available";
            const errText = toolErrorText(p.output);
            const failed = Boolean(errText) || p.state === "output-error";
            return (
              <div
                key={i}
                className={`rounded-lg px-2.5 py-1.5 ${
                  failed ? "bg-[#E53D2E]/[0.08]" : "bg-foreground/[0.05]"
                }`}
              >
                <div
                  className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${
                    failed ? "text-[#a02a20]" : "text-foreground/55"
                  }`}
                >
                  <span>{failed ? "✕" : done ? "✓" : "⏳"}</span>
                  <span className="truncate">{name}</span>
                  {failed ? (
                    <span className="ml-auto normal-case tracking-normal">not applied</span>
                  ) : null}
                </div>
                {errText ? (
                  <p className="mt-1 text-[11px] normal-case leading-snug text-[#a02a20]">
                    {errText}
                  </p>
                ) : null}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

/** Minimal markdown: headings, bullets, numbered steps and **bold** inline. */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((raw, i) => {
        const line = raw.replace(/^#{1,6}\s*/, "");
        const heading = /^#{1,6}\s/.test(raw);
        if (!line.trim()) return <div key={i} className="h-1" />;
        const bullet = /^\s*[-*]\s+/.test(line);
        const body = line.replace(/^\s*[-*]\s+/, "");
        return (
          <p
            key={i}
            className={`${heading ? "pt-1 text-[13px] font-semibold" : ""} ${bullet ? "pl-4 -indent-3" : ""}`}
          >
            {bullet && (
              <span aria-hidden className="mr-1.5 opacity-50">
                •
              </span>
            )}
            {inlineBold(body)}
          </p>
        );
      })}
    </div>
  );
}

function inlineBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((chunk, i) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return <strong key={i}>{chunk.slice(2, -2)}</strong>;
    }
    if (chunk.startsWith("`") && chunk.endsWith("`") && chunk.length > 2) {
      return (
        <code key={i} className="rounded bg-foreground/10 px-1 font-mono text-[11px]">
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{chunk}</span>;
  });
}
