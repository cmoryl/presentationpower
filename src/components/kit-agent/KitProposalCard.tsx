// Renders the events / social agent's structured kit proposal (division, mode,
// formats, copy) as a readable card instead of raw JSON.
import { Megaphone } from "lucide-react";
import { BRAND_MODES } from "@/lib/taxonomy";
import { SOCIAL_FORMATS_BY_ID } from "@/lib/social-formats";

export type KitProposal = {
  name: string;
  divisionId: string;
  mode: string;
  profileId: string;
  formatIds: string[];
  copy?: {
    title?: string;
    summary?: string;
    cta?: string;
    statValue?: string;
    statLabel?: string;
  };
  rationale?: string;
};

export function kitProposalFromTool(part: unknown): KitProposal | null {
  const p = part as { input?: unknown; output?: unknown } | null;
  const raw = (p?.output as { proposal?: unknown } | undefined)?.proposal ?? p?.input ?? null;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<KitProposal>;
  if (!r.name || !Array.isArray(r.formatIds)) return null;
  return {
    name: String(r.name),
    divisionId: String(r.divisionId ?? ""),
    mode: String(r.mode ?? "light"),
    profileId: String(r.profileId ?? ""),
    formatIds: r.formatIds.filter((f) => typeof f === "string"),
    copy: r.copy,
    rationale: r.rationale,
  };
}

export function KitProposalCard({ proposal }: { proposal: KitProposal }) {
  const division = BRAND_MODES.find((m) => m.id === proposal.divisionId);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Megaphone className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{proposal.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {division ? division.name : proposal.divisionId} · {proposal.mode} mode
            {proposal.profileId ? ` · ${proposal.profileId.replace(/-/g, " ")}` : ""}
          </p>
        </div>
      </div>

      {proposal.rationale ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{proposal.rationale}</p>
      ) : null}

      {proposal.copy?.title ? (
        <div className="mt-3 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium leading-snug">{proposal.copy.title}</p>
          {proposal.copy.summary ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {proposal.copy.summary}
            </p>
          ) : null}
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            {proposal.copy.cta ? <span>CTA: {proposal.copy.cta}</span> : null}
            {proposal.copy.statValue ? (
              <span>
                Stat: {proposal.copy.statValue} {proposal.copy.statLabel ?? ""}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {proposal.formatIds.map((id) => {
          const f = SOCIAL_FORMATS_BY_ID[id];
          return (
            <li
              key={id}
              className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground"
            >
              {f ? `${f.label} · ${f.width}×${f.height}` : id}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
