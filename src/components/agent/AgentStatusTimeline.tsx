// Generation status timeline for the presentation agent: derives queued →
// planning → generating → refining → exporting → ready from the live message
// stream (tool parts) plus the useChat status.
import { useMemo } from "react";
import type { UIMessage } from "ai";

export type AgentStageId = "queued" | "planning" | "generating" | "refining" | "exporting" | "ready";

const STAGES: { id: AgentStageId; label: string; hint: string }[] = [
  { id: "queued", label: "Queued", hint: "Brief received" },
  { id: "planning", label: "Planning", hint: "Picking layouts & brand" },
  { id: "generating", label: "Generating", hint: "Writing slides" },
  { id: "refining", label: "Refining", hint: "Copy, icons, order" },
  { id: "exporting", label: "Exporting", hint: "Packaging the deck" },
  { id: "ready", label: "Ready", hint: "Deck available" },
];

/** Which stage a given agent tool belongs to. */
const TOOL_STAGE: Record<string, AgentStageId> = {
  getTaxonomy: "planning",
  listVariants: "planning",
  listSectionVariants: "planning",
  searchKnowledge: "planning",
  searchIcons: "planning",
  listDecks: "planning",
  getDeck: "planning",
  createDeck: "generating",
  generateDeck: "generating",
  insertSlide: "generating",
  updateSlideContent: "refining",
  updateSlideNotes: "refining",
  changeSlideVariant: "refining",
  setSlideIcon: "refining",
  reorderSlides: "refining",
  deleteSlide: "refining",
  createShareLink: "exporting",
};

const ORDER: AgentStageId[] = STAGES.map((s) => s.id);

function normalizeToolName(raw: string) {
  const name = raw.replace(/^tool-/, "").replace(/^dynamic-tool$/, "");
  // MCP tool names may arrive snake/kebab cased.
  const camel = name.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase());
  return TOOL_STAGE[name] ? name : camel;
}

type Derived = {
  visible: boolean;
  activeIndex: number;
  reachedIndex: number;
  failed: boolean;
  currentTool: string | null;
};

export function deriveAgentProgress(
  messages: UIMessage[],
  status: string,
  hasDeck: boolean,
): Derived {
  const busy = status === "submitted" || status === "streaming";
  let reached = -1;
  let running: AgentStageId | null = null;
  let currentTool: string | null = null;
  let failed = false;

  for (const m of messages) {
    if (m.role === "user") reached = Math.max(reached, 0);
    for (const part of m.parts) {
      if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") continue;
      const p = part as { toolName?: string; state?: string; output?: unknown };
      const name = normalizeToolName(p.toolName ?? part.type);
      const stage = TOOL_STAGE[name];
      if (!stage) continue;
      reached = Math.max(reached, ORDER.indexOf(stage));
      if (typeof p.output === "string" && p.output.startsWith("ERROR:")) failed = true;
      if (p.state !== "output-available" && p.state !== "output-error") {
        running = stage;
        currentTool = name;
      }
    }
  }

  if (!busy && (hasDeck || reached >= ORDER.indexOf("generating"))) {
    reached = ORDER.indexOf("ready");
  }

  const activeIndex = running
    ? ORDER.indexOf(running)
    : busy
      ? Math.max(reached, 0)
      : Math.max(reached, 0);

  return {
    visible: reached >= 0,
    activeIndex,
    reachedIndex: reached,
    failed,
    currentTool,
  };
}

export function AgentStatusTimeline({
  messages,
  status,
  hasDeck,
  variant = "panel",
}: {
  messages: UIMessage[];
  status: string;
  hasDeck: boolean;
  /** "hero" renders a borderless, prominent bar for the page hero. */
  variant?: "panel" | "hero";
}) {
  const busy = status === "submitted" || status === "streaming";
  const { visible, activeIndex, reachedIndex, failed, currentTool } = useMemo(
    () => deriveAgentProgress(messages, status, hasDeck),
    [messages, status, hasDeck],
  );

  if (!visible) return null;

  const done = reachedIndex >= ORDER.length - 1 && !busy;
  const percent = Math.round(((activeIndex + (busy ? 0.5 : 1)) / STAGES.length) * 100);

  return (
    <div
      className={
        variant === "hero"
          ? "w-full rounded-xl border border-[#003FC7]/15 bg-white/80 px-4 py-3 shadow-sm backdrop-blur"
          : "border-t border-border/60 bg-background/70 px-4 py-2.5"
      }
      role="status"
      aria-live="polite"
      aria-label="Deck generation progress"
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`font-semibold uppercase tracking-widest ${
            variant === "hero" ? "text-[11px] text-[#003FC7]" : "text-[10px] text-foreground/45"
          }`}
        >
          {done ? "Deck ready" : failed ? "Needs attention" : "Building your deck"}
        </span>
        {currentTool && busy && (
          <span className="truncate font-mono text-[10px] text-foreground/40">{currentTool}</span>
        )}
        <span className="ml-auto text-[10px] font-medium text-foreground/45">
          {Math.min(100, percent)}%
        </span>
      </div>

      <ol className="flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const complete = i < activeIndex || (done && i <= activeIndex);
          const active = i === activeIndex && !done;
          const state = complete ? "complete" : active ? "active" : "pending";
          return (
            <li key={stage.id} className="flex min-w-0 flex-1 flex-col gap-1" title={stage.hint}>
              <span
                aria-hidden
                className={`h-1 rounded-full transition-colors ${
                  complete
                    ? "bg-[#003FC7]"
                    : active
                      ? failed
                        ? "bg-[#E53D2E]"
                        : "animate-pulse bg-[#003FC7]/70"
                      : "bg-foreground/12"
                }`}
              />
              <span
                data-state={state}
                className={`truncate text-[10px] font-medium ${
                  complete || active ? "text-foreground/70" : "text-foreground/35"
                }`}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
