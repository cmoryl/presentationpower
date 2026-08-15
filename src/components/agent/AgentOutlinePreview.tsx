// Renders a proposed deck outline (slide topics + story flow) with confirm /
// adjust controls, so the user approves the sections before the deck is built.
import { useState } from "react";
import type { DeckOutline } from "@/lib/agent/outline-tool";

export function AgentOutlinePreview({
  outline,
  actionable,
  busy,
  onSubmit,
}: {
  outline: DeckOutline;
  /** Only the most recent proposal offers confirm / adjust actions. */
  actionable: boolean;
  busy: boolean;
  onSubmit: (text: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const slides = Array.isArray(outline.slides) ? outline.slides : [];

  return (
    <div className="not-prose w-full overflow-hidden rounded-2xl border border-[#003FC7]/25 bg-[#E0E8F5]/40">
      <div className="border-b border-[#003FC7]/15 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#003FC7]">
          Proposed outline · {slides.length} slides
        </p>
        <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-foreground">
          {outline.title || "Untitled deck"}
        </h3>
        {outline.audience && (
          <p className="mt-0.5 text-xs text-foreground/60">For {outline.audience}</p>
        )}
        {outline.storyFlow && (
          <p className="mt-2 text-xs leading-relaxed text-foreground/70">{outline.storyFlow}</p>
        )}
      </div>

      <ol className="divide-y divide-[#003FC7]/10">
        {slides.map((s, i) => (
          <li key={`${i}-${s.title}`} className="flex gap-3 px-4 py-2.5">
            <span className="mt-0.5 font-mono text-[11px] text-[#003FC7]/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">{s.title}</p>
              {s.purpose && <p className="text-xs text-foreground/60">{s.purpose}</p>}
              {s.points && s.points.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {s.points.map((p, j) => (
                    <li key={j} className="pl-3 -indent-3 text-xs text-foreground/55">
                      <span aria-hidden className="mr-1.5 opacity-50">
                        •
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>

      {actionable && (
        <div className="space-y-2 border-t border-[#003FC7]/15 bg-background/60 px-4 py-3">
          {editing ? (
            <>
              <label htmlFor="outline-notes" className="sr-only">
                What should change in the outline?
              </label>
              <textarea
                id="outline-notes"
                rows={3}
                autoFocus
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. drop the pricing slide, add a competitive landscape section, keep it to 8 slides"
                className="w-full resize-none rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-[#003FC7]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !notes.trim()}
                  onClick={() => onSubmit(`Adjust the outline: ${notes.trim()}`)}
                  className="rounded-xl bg-[#003FC7] px-3.5 py-2 text-xs font-semibold text-white transition disabled:opacity-40 hover:brightness-110"
                >
                  Send changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-border/70 px-3.5 py-2 text-xs font-medium text-foreground/70 transition hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onSubmit("The outline looks good — build the full presentation from it now.")
                }
                className="rounded-xl bg-[#003FC7] px-3.5 py-2 text-xs font-semibold text-white transition disabled:opacity-40 hover:brightness-110"
              >
                Approve &amp; build deck
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(true)}
                className="rounded-xl border border-border/70 px-3.5 py-2 text-xs font-medium text-foreground/70 transition hover:border-[#003FC7] hover:text-foreground disabled:opacity-40"
              >
                Adjust sections
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Best-effort read of a propose_outline tool part's input. */
export function outlineFromToolInput(input: unknown): DeckOutline | null {
  const o = input as DeckOutline | undefined;
  if (!o || typeof o !== "object") return null;
  if (!Array.isArray(o.slides) || o.slides.length === 0) return null;
  return o;
}
