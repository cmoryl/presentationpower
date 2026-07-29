import { BookOpen } from "lucide-react";
import { useState } from "react";
import type { GroundingCitation } from "@/lib/grounding-citations";

type Tone = "dark" | "light";

const TONE = {
  dark: {
    shell: "border-white/10 bg-black/20",
    label: "text-white/50",
    title: "text-white/85",
    body: "text-white/45",
    chip: "bg-white/10 text-white/70",
    empty: "text-white/45",
  },
  light: {
    shell: "border-black/10 bg-[#F2F2F2]",
    label: "text-black/40",
    title: "text-black/75",
    body: "text-black/50",
    chip: "bg-black/10 text-black/60",
    empty: "text-black/45",
  },
} as const;

/**
 * Renders the knowledge-base documents behind an AI generation. The `ref`
 * numbers match the [n] markers the model was given, so inline citations in
 * generated copy line up with this list.
 */
export function GroundingCitations({
  citations,
  tone = "dark",
  label = "Knowledge sources",
  emptyHint = "No knowledge base matches — this output is unsourced.",
  className = "",
  collapsible = true,
}: {
  citations: GroundingCitation[] | undefined;
  tone?: Tone;
  label?: string;
  emptyHint?: string;
  className?: string;
  collapsible?: boolean;
}) {
  const t = TONE[tone];
  const [open, setOpen] = useState(!collapsible);
  const list = citations ?? [];

  return (
    <div className={`rounded-xl border p-3 ${t.shell} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] ${t.label}`}>
          <BookOpen className="size-3" strokeWidth={1.75} aria-hidden />
          {label}
          {list.length > 0 && <span className={`rounded px-1 ${t.chip}`}>{list.length}</span>}
        </div>
        {collapsible && list.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`text-[10px] uppercase tracking-[0.18em] ${t.label} transition hover:opacity-80`}
          >
            {open ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className={`mt-1.5 text-[11px] leading-relaxed ${t.empty}`}>{emptyHint}</p>
      ) : open ? (
        <ul className="mt-2 space-y-2">
          {list.map((c) => (
            <li key={c.ref} className="flex gap-2 text-[11px] leading-relaxed">
              <span className={`mt-px shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${t.chip}`}>
                {c.ref}
              </span>
              <span className="min-w-0">
                <span className={t.title}>{c.title}</span>
                <span className={`ml-1.5 text-[10px] uppercase tracking-wide ${t.label}`}>
                  {c.source}
                </span>
                {c.crossDivision && (
                  <span className="ml-1.5 rounded bg-[#FF9B70]/15 px-1 py-px text-[9px] uppercase tracking-wide text-[#FF9B70]">
                    other division
                  </span>
                )}
                <span className={`mt-0.5 block ${t.body}`}>
                  {c.excerpt.slice(0, 180)}
                  {c.excerpt.length > 180 ? "…" : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Compact inline [n] chips for a single note/recommendation. */
export function CitationChips({
  refs,
  citations,
  tone = "dark",
  className = "",
}: {
  refs: number[] | undefined;
  citations: GroundingCitation[] | undefined;
  tone?: Tone;
  className?: string;
}) {
  if (!refs?.length) return null;
  const t = TONE[tone];
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 align-middle ${className}`}>
      {refs.map((ref) => {
        const src = citations?.find((c) => c.ref === ref);
        return (
          <span
            key={ref}
            title={src ? `${src.title} — ${src.excerpt}` : `Source ${ref}`}
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${t.chip}`}
          >
            {ref}
          </span>
        );
      })}
    </span>
  );
}
