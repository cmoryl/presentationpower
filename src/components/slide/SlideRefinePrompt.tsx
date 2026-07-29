import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, RotateCcw, Wand2 } from "lucide-react";
import { useDeckStore } from "@/lib/deck-store";
import { refineSlideWithInstruction } from "@/lib/refine-slide.functions";

const QUICK_INSTRUCTIONS = [
  "Make it shorter and punchier",
  "More technical for a procurement audience",
  "Lead with the business outcome",
  "Rewrite in a warmer, human tone",
  "Tighten the title to under 6 words",
];

export type RefineContext = {
  prospect?: string;
  industry?: string;
  audience?: string;
  meetingObjective?: string;
  brandName?: string;
  assetRequest?: string;
};

/**
 * Inline prompt box in the editor inspector: type exact fine-tuning
 * instructions and re-run the agent on the selected slide only.
 */
export function SlideRefinePrompt({
  deckId,
  slide,
  sectionName,
  divisionId,
  context,
}: {
  deckId: string;
  slide: { id: string; variantId: string; content: Record<string, unknown> };
  sectionName?: string;
  divisionId?: string | null;
  context?: RefineContext;
}) {
  const run = useServerFn(refineSlideWithInstruction);
  const applyAiContent = useDeckStore((s) => s.applyAiContent);

  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<Record<string, unknown> | null>(null);
  const [lastInstruction, setLastInstruction] = useState("");

  async function submit(text?: string) {
    const prompt = (text ?? instruction).trim();
    if (!prompt || busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    const before = slide.content;
    try {
      const result = await run({
        data: {
          instruction: prompt,
          slide: {
            id: slide.id,
            variantId: slide.variantId,
            sectionName: sectionName ?? "",
            content: slide.content as Record<string, unknown>,
          },
          divisionId: divisionId ?? null,
          context,
        },
      });
      if (result.error) {
        setError(result.error);
        toast.error("Fine-tune failed", { description: result.error });
        return;
      }
      applyAiContent(deckId, [{ id: slide.id, content: result.content as never }]);
      setPrevious(before);
      setLastInstruction(prompt);
      setNote(result.note ?? "Slide updated.");
      setInstruction("");
      toast.success("Slide fine-tuned", { description: result.note ?? prompt });
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      toast.error("Fine-tune failed", { description: message });
    } finally {
      setBusy(false);
    }
  }

  function undo() {
    if (!previous) return;
    applyAiContent(deckId, [{ id: slide.id, content: previous as never }]);
    setPrevious(null);
    setNote(null);
    toast.success("Reverted to the previous copy");
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-black/55">
        Tell the agent exactly what to change on this slide. Structure and numbers stay put — only
        the copy is rewritten.
      </p>

      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        rows={3}
        disabled={busy}
        placeholder="e.g. Reframe the headline around risk reduction and name the regulator"
        aria-label="Fine-tuning instructions for this slide"
        className="w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] placeholder:text-black/35 focus:border-[#003FC7]/60 focus:outline-none disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !instruction.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#03002C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#003FC7] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Wand2 className="size-3.5" aria-hidden />
          )}
          {busy ? "Re-running…" : "Re-run agent"}
        </button>

        {lastInstruction && !busy ? (
          <button
            type="button"
            onClick={() => void submit(lastInstruction)}
            className="rounded-lg border border-black/15 px-3 py-2 text-xs font-medium text-black/60 transition hover:border-[#003FC7]/40 hover:text-[#003FC7]"
          >
            Run again
          </button>
        ) : null}

        {previous ? (
          <button
            type="button"
            onClick={undo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-medium text-black/60 transition hover:border-black/30 hover:text-black"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Undo
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_INSTRUCTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => setInstruction(q)}
            className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/60 transition hover:border-[#003FC7]/40 hover:text-[#003FC7] disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="min-h-[1rem]">
        {error ? (
          <p className="text-[11px] text-[#E53D2E]">{error}</p>
        ) : note ? (
          <p className="text-[11px] text-black/55">{note}</p>
        ) : null}
      </div>
    </div>
  );
}
