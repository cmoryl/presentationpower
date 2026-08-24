// Chat surface for the Print Agent: streaming replies, visible tool activity,
// proposal cards and a link straight into the print editor.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Loader2, Send, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { findPrintAssetIdInMessages } from "@/lib/print-agent/threads";
import { sanitizeAgentReply } from "@/lib/agent/sanitize-reply";
import {
  PRINT_PROPOSAL_TOOL_NAME,
  PRINT_SUGGEST_TOOL_NAME,
  PRINT_LOOK_TOOL_NAME,
  PRINT_MODULES_TOOL_NAME,
  PRINT_PREVIEW_TOOL_NAME,
} from "@/lib/print-agent/tools";
import { PrintProposalCard, printProposalFromTool } from "./PrintProposalCard";
import { PrintSuggestionCards, printSuggestionsFromTool } from "./PrintSuggestionCards";
import { PrintLookCard, printLookFromTool } from "./PrintLookCard";
import { PrintModulePaletteCard, printModulePaletteFromTool } from "./PrintModulePaletteCard";
import { PrintLivePreviewCard, printLivePreviewFromTool } from "./PrintLivePreviewCard";

import {
  AgentDocumentUpload,
  useAgentDocuments,
} from "@/components/agent/AgentDocumentUpload";
import { withDocumentContext } from "@/lib/agent/doc-intake";


const TOOL_LABELS: Record<string, string> = {
  list_print_types: "Checking print types",
  list_print_divisions: "Checking divisions",
  search_print_library: "Searching the print library",
  search_print_modules: "Searching section modules",
  list_my_print_assets: "Reading your print pieces",
  read_print_asset: "Reading the piece",
  [PRINT_PROPOSAL_TOOL_NAME]: "Drafting a proposal",
  create_print_asset_from_template: "Creating from a template",
  create_print_asset_from_brief: "Creating the piece",
  add_print_module: "Adding a section",
  remove_print_module: "Removing a section",
  write_print_copy: "Writing copy",
  [PRINT_SUGGEST_TOOL_NAME]: "Looking for pieces you can reuse",
  [PRINT_LOOK_TOOL_NAME]: "Proposing the look & feel",
  [PRINT_MODULES_TOOL_NAME]: "Listing supported sections",
  [PRINT_PREVIEW_TOOL_NAME]: "Rendering a live preview",
  list_hero_imagery: "Finding approved hero imagery",
  set_print_look: "Applying the look & feel",
};


function toolNameOf(type: string) {
  return type.startsWith("tool-") ? type.slice(5) : type;
}

export function PrintAgentChat({
  threadId,
  initialMessages,
  onAssetDetected,
  onFirstUserMessage,
  pendingPrompt,
  onPendingPromptConsumed,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onAssetDetected?: (assetId: string) => void;
  onFirstUserMessage?: (text: string) => void;
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/print-agent-chat",
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
    onError: (err) => toast.error(err.message || "The print agent hit an error."),
  });

  const [input, setInput] = useState("");
  const { docs, setDocs } = useAgentDocuments();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenAsset = useRef<string | null>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    const assetId = findPrintAssetIdInMessages(messages);
    if (assetId && seenAsset.current !== assetId) {
      seenAsset.current = assetId;
      onAssetDetected?.(assetId);
    }
  }, [messages, onAssetDetected]);

  const submit = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      if (messages.length === 0) onFirstUserMessage?.(value);
      setInput("");
      void sendMessage({ text: withDocumentContext(value, docs) });
    },
    [busy, docs, messages.length, onFirstUserMessage, sendMessage],
  );


  const sentPending = useRef(false);
  useEffect(() => {
    if (!pendingPrompt || sentPending.current || busy) return;
    sentPending.current = true;
    submit(pendingPrompt);
    onPendingPromptConsumed?.();
  }, [pendingPrompt, busy, submit, onPendingPromptConsumed]);

  const latestAsset = findPrintAssetIdInMessages(messages);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
            Tell me the print piece you need — type, client or product, and the division it is for.
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
                    if (name === PRINT_PROPOSAL_TOOL_NAME) {
                      const proposal = printProposalFromTool(part);
                      if (proposal) return <PrintProposalCard key={key} proposal={proposal} />;
                    }
                    if (name === PRINT_SUGGEST_TOOL_NAME) {
                      const s = printSuggestionsFromTool(part);
                      if (s)
                        return <PrintSuggestionCards key={key} suggestions={s} onPick={submit} />;
                    }
                    if (name === PRINT_LOOK_TOOL_NAME) {
                      const look = printLookFromTool(part);
                      if (look) return <PrintLookCard key={key} look={look} onPick={submit} />;
                    }
                    if (name === PRINT_MODULES_TOOL_NAME) {
                      const palette = printModulePaletteFromTool(part);
                      if (palette)
                        return (
                          <PrintModulePaletteCard key={key} palette={palette} onPick={submit} />
                        );
                    }
                    if (name === PRINT_PREVIEW_TOOL_NAME) {
                      const preview = printLivePreviewFromTool(part);
                      if (preview) return <PrintLivePreviewCard key={key} preview={preview} />;
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

      {latestAsset ? (
        <div className="border-t border-border bg-muted/40 px-4 py-2 text-xs sm:px-6">
          <Link
            to="/asset/$assetId"
            params={{ assetId: latestAsset }}
            className="font-medium underline"
          >
            Open the print piece in the editor
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
          placeholder="e.g. Build a life-sciences case study for Novartis on clinical trial document localization"
          aria-label="Message the print agent"
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
