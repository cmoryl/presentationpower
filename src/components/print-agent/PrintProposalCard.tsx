// Renders the print agent's structured proposal (type + division + ordered
// section modules) as a readable card instead of raw JSON.
import { FileText } from "lucide-react";
import { BRAND_MODES } from "@/lib/taxonomy";

export type PrintProposal = {
  kind: string;
  title: string;
  divisionId: string;
  rationale?: string;
  sections: { moduleId?: string; label: string; note?: string }[];
};

export function printProposalFromTool(part: unknown): PrintProposal | null {
  const p = part as { input?: unknown; output?: unknown } | null;
  const raw =
    (p?.output as { proposal?: unknown } | undefined)?.proposal ?? p?.input ?? null;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PrintProposal>;
  if (!r.title || !Array.isArray(r.sections)) return null;
  return {
    kind: String(r.kind ?? "print"),
    title: String(r.title),
    divisionId: String(r.divisionId ?? ""),
    rationale: r.rationale,
    sections: r.sections.filter((s) => s && typeof s.label === "string"),
  };
}

export function PrintProposalCard({ proposal }: { proposal: PrintProposal }) {
  const division = BRAND_MODES.find((m) => m.id === proposal.divisionId);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{proposal.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {proposal.kind.replace(/-/g, " ")}
            {division ? ` · ${division.name}` : ""}
          </p>
        </div>
      </div>
      {proposal.rationale ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{proposal.rationale}</p>
      ) : null}
      <ol className="mt-3 space-y-1.5">
        {proposal.sections.map((s, i) => (
          <li key={`${s.label}-${i}`} className="flex gap-2 text-xs">
            <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="font-medium">{s.label}</span>
              {s.note ? <span className="text-muted-foreground"> — {s.note}</span> : null}
              {s.moduleId ? (
                <code className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                  {s.moduleId}
                </code>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
