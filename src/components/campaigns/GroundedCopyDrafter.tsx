// Grounded copy drafting control shared by both kit builders.
//
// Wraps `draftCampaignCopy` (division-scoped knowledge retrieval + write) and
// surfaces the exact documents behind the draft, so campaign copy is sourced
// rather than improvised.

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";

import { BRAND_MODES } from "@/lib/taxonomy";
import { draftCampaignCopy } from "@/lib/campaign-copy.functions";
import type { GroundingCitation } from "@/lib/grounding-citations";
import { GroundingCitations } from "@/components/GroundingCitations";

export type DraftedCopy = {
  title: string;
  summary?: string;
  cta?: string;
  stat?: { value: string; label: string };
};

export type DraftEventContext = {
  name?: string;
  city?: string;
  venue?: string;
  startDate?: string;
  registrationUrl?: string;
  hashtag?: string;
};

export function GroundedCopyDrafter({
  brandId,
  event,
  fallbackTopic,
  onDraft,
  className = "",
}: {
  brandId: string;
  event?: DraftEventContext;
  /** Used when the topic box is empty — usually the current headline. */
  fallbackTopic?: string;
  onDraft: (copy: DraftedCopy) => void;
  className?: string;
}) {
  const [topic, setTopic] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingCitation[]>([]);
  const run = useServerFn(draftCampaignCopy);

  async function handleDraft() {
    const prompt = topic.trim() || (fallbackTopic ?? "").trim();
    if (!prompt) {
      toast.error("Describe the campaign first — a sentence is enough.");
      return;
    }
    setDrafting(true);
    try {
      const res = await run({
        data: {
          topic: prompt,
          divisionId: brandId,
          brandName: BRAND_MODES.find((b) => b.id === brandId)?.name,
          event,
        },
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      onDraft({ title: res.title, summary: res.summary, cta: res.cta, stat: res.stat });
      setSources(res.sources ?? []);
      setNote(res.note ?? null);
      toast.success(
        res.sources?.length
          ? `Drafted from ${res.sources.length} knowledge source${res.sources.length > 1 ? "s" : ""}`
          : "Drafted copy — no knowledge base matches, so it's unsourced.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Copy drafting failed");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-[#003FC7]/20 bg-[#003FC7]/[0.04] p-4 ${className}`}>
      <label
        htmlFor="grounded-copy-topic"
        className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#003FC7]"
      >
        Draft from the knowledge base
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="grounded-copy-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What's this campaign about? e.g. clinical trial readiness for EU MDR"
          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]"
        />
        <button
          type="button"
          onClick={handleDraft}
          disabled={drafting}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0033a3] disabled:opacity-60"
        >
          {drafting ? (
            <RefreshCw size={13} className="animate-spin" aria-hidden />
          ) : (
            <Sparkles size={13} aria-hidden />
          )}
          {drafting ? "Drafting…" : "Draft copy"}
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-black/60">{note}</p>}
      {(sources.length > 0 || note) && (
        <GroundingCitations citations={sources} tone="light" label="Grounded in" className="mt-3" />
      )}
    </div>
  );
}
