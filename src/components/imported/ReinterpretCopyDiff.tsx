// Copy diff for the AI reinterpretation review.
//
// The visual compare panes answer "does the new layout look right"; this answers
// "did my words survive it". Left = the copy as imported. Right = the copy the
// designed slide actually renders, with every source line labelled: kept on the
// slide, reworded/trimmed to fit, moved to speaker notes, or dropped.

import { useMemo } from "react";
import { ArrowRight, Check, FileText, Scissors, X } from "lucide-react";
import { collectStrings, isCovered, norm } from "@/lib/reinterpret-design";
import type { MappedSlide } from "@/lib/pptx-mapping";

type Fate = "kept" | "reworded" | "notes" | "dropped";

const FATE_META: Record<Fate, { label: string; className: string; Icon: typeof Check }> = {
  kept: { label: "On slide", className: "text-[#0B7A3B]", Icon: Check },
  reworded: { label: "Trimmed to fit", className: "text-[#8A6A00]", Icon: Scissors },
  notes: { label: "Moved to notes", className: "text-[#003FC7]", Icon: FileText },
  dropped: { label: "Not shown", className: "text-[#C22E1F]", Icon: X },
};

/** Longest common token overlap ratio — a cheap "is this the same sentence" test. */
function overlap(a: string, b: string): number {
  const at = norm(a).split(" ").filter(Boolean);
  const bt = new Set(norm(b).split(" ").filter(Boolean));
  if (at.length === 0) return 0;
  let hit = 0;
  for (const t of at) if (bt.has(t)) hit += 1;
  return hit / at.length;
}

function classify(line: string, slideText: string, notesText: string): Fate {
  if (isCovered(line, slideText)) return "kept";
  if (overlap(line, slideText) >= 0.5) return "reworded";
  if (notesText && (isCovered(line, notesText) || overlap(line, notesText) >= 0.6)) return "notes";
  return "dropped";
}

export function ReinterpretCopyDiff({
  designed,
  source,
}: {
  /** The designed slide the approved plan produces, if one was built. */
  designed?: MappedSlide;
  source: { title?: string; bullets?: string[]; notes?: string };
}) {
  const diff = useMemo(() => {
    const lines = [
      ...(source.title ? [source.title] : []),
      ...(source.bullets ?? []).filter(Boolean),
    ];
    const slideText = designed ? collectStrings(designed.content).join(" \n ") : "";
    const notesText = designed?.source.notes ?? source.notes ?? "";
    const rows = lines.map((line) => ({ line, fate: classify(line, slideText, notesText) }));
    const onSlide = collectStrings(designed?.content ?? {}).filter((s) => s.trim().length > 1);
    // Copy the design added or rewrote: nothing in the source is close to it.
    const added = onSlide.filter((s) => !lines.some((l) => overlap(s, l) >= 0.5));
    const counts = rows.reduce<Record<Fate, number>>(
      (acc, r) => ({ ...acc, [r.fate]: (acc[r.fate] ?? 0) + 1 }),
      { kept: 0, reworded: 0, notes: 0, dropped: 0 },
    );
    return { rows, onSlide, added, counts };
  }, [designed, source.title, source.bullets, source.notes]);

  if (diff.rows.length === 0) {
    return (
      <p className="mt-3 text-xs text-black/40">This slide has no text copy to compare.</p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-white/70 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="uppercase tracking-wider text-black/35">Copy changes</span>
        {(["kept", "reworded", "notes", "dropped"] as Fate[])
          .filter((f) => diff.counts[f] > 0)
          .map((f) => {
            const { label, className, Icon } = FATE_META[f];
            return (
              <span key={f} className={`inline-flex items-center gap-1 ${className}`}>
                <Icon size={11} />
                {diff.counts[f]} {label.toLowerCase()}
              </span>
            );
          })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wider text-black/35">
            Original copy
          </p>
          <ul className="space-y-1">
            {diff.rows.map((r, i) => {
              const { label, className, Icon } = FATE_META[r.fate];
              return (
                <li key={i} className="flex items-start gap-1.5 text-xs leading-snug">
                  <Icon size={12} className={`mt-0.5 shrink-0 ${className}`} />
                  <span
                    className={
                      r.fate === "dropped"
                        ? "text-black/40 line-through decoration-black/25"
                        : "text-black/70"
                    }
                  >
                    {r.line}
                    <span className={`ml-1.5 text-[10px] uppercase tracking-wider ${className}`}>
                      {label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#003FC7]/70">
            <ArrowRight size={11} />
            Copy on the new layout
          </p>
          {diff.onSlide.length > 0 ? (
            <ul className="space-y-1">
              {diff.onSlide.map((s, i) => (
                <li key={i} className="text-xs leading-snug text-black/70">
                  {s}
                  {diff.added.includes(s) && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wider text-[#8A6A00]">
                      new wording
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-black/40">No design built for this slide yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
