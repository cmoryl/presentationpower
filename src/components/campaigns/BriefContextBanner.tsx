// Shown on an event / social kit that was opened from a master brief, so the
// user always knows which brief the kit belongs to and can get back to the hub.
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileSignature } from "lucide-react";
import type { BriefCampaignSearch } from "@/lib/brief-campaign-context";

export function BriefContextBanner({ search }: { search: BriefCampaignSearch }) {
  if (!search.prospect && !search.objective && !search.briefId) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#003FC7]/25 bg-[#003FC7]/[0.05] px-4 py-3">
      <span className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[#003FC7]">
        <FileSignature size={13} strokeWidth={1.75} aria-hidden />
        From this brief
      </span>
      <span className="min-w-0 text-[13px] leading-snug text-[#03002C]">
        {search.prospect ? <strong className="font-semibold">{search.prospect}</strong> : null}
        {search.prospect && search.objective ? " — " : null}
        {search.objective}
      </span>
      {search.briefId ? (
        <Link
          to="/brief/$deckId"
          params={{ deckId: search.briefId }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-[12px] font-medium text-[#03002C] hover:border-[#003FC7]/50"
        >
          <ArrowLeft size={13} strokeWidth={1.75} aria-hidden /> Back to brief
        </Link>
      ) : null}
    </div>
  );
}
