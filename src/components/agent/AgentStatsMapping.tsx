/**
 * Confirmation table for the figures the agent is about to write onto slides.
 * Shows, per number: the slide, the field, the new value, what it replaces and
 * where it came from — with approve / adjust controls so nothing numeric is
 * saved before the user has seen its source.
 */
import { useMemo } from "react";
import type { StatMappingEntry, StatsMapping } from "@/lib/agent/stats-mapping";

/** Narrow a confirm_stats_mapping tool output into a renderable mapping. */
export function statsMappingFromToolOutput(output: unknown): StatsMapping | null {
  if (!output || typeof output !== "object") return null;
  const o = output as StatsMapping & { error?: string };
  if (o.error) return null;
  if (!o.mapping || !Array.isArray(o.entries)) return null;
  return o;
}

const ORIGIN_STYLE: Record<string, { label: string; className: string }> = {
  user: { label: "You supplied", className: "bg-[#A6FA87]/35 text-[#2c6a1c]" },
  knowledge: { label: "Knowledge", className: "bg-[#A1FBF9]/40 text-[#0c6470]" },
  computed: { label: "Calculated", className: "bg-[#C2A3FF]/35 text-[#4a2c8f]" },
  placeholder: { label: "Placeholder", className: "bg-[#FFEB66]/50 text-[#6b5600]" },
};

function OriginBadge({ origin }: { origin: string }) {
  const s = ORIGIN_STYLE[origin] ?? {
    label: origin,
    className: "bg-foreground/[0.07] text-foreground/60",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${s.className}`}>
      {s.label}
    </span>
  );
}

export function AgentStatsMapping({
  mapping,
  actionable = false,
  busy = false,
  onSubmit,
}: {
  mapping: StatsMapping;
  actionable?: boolean;
  busy?: boolean;
  onSubmit?: (text: string) => void;
}) {
  const groups = useMemo(() => {
    const out: Array<{ key: string; title: string; position: number | null; rows: StatMappingEntry[] }> = [];
    for (const e of mapping.entries) {
      const key = `${e.slide_position ?? "?"}::${e.slide_title}`;
      const hit = out.find((g) => g.key === key);
      if (hit) hit.rows.push(e);
      else out.push({ key, title: e.slide_title, position: e.slide_position, rows: [e] });
    }
    return out;
  }, [mapping.entries]);

  const { total, overwrites, placeholders, unsourced } = mapping.counts ?? {
    total: mapping.entries.length,
    overwrites: 0,
    placeholders: 0,
    unsourced: 0,
  };

  return (
    <section className="w-full space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-xl">
      <header className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/45">
          Figures to write · confirm
        </p>
        <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-widest text-foreground/55">
          {total} figure{total === 1 ? "" : "s"}
        </span>
        {overwrites ? (
          <span className="rounded-full bg-[#E53D2E]/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#a02a20]">
            {overwrites} replace existing
          </span>
        ) : null}
        {placeholders ? (
          <span className="rounded-full bg-[#FFEB66]/50 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#6b5600]">
            {placeholders} placeholder{placeholders === 1 ? "" : "s"}
          </span>
        ) : null}
        {unsourced ? (
          <span className="rounded-full bg-[#FF9B70]/35 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#8a3d18]">
            {unsourced} unsourced
          </span>
        ) : null}
      </header>

      <p className="text-xs leading-relaxed text-foreground/70">{mapping.headline}</p>

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.key} className="overflow-hidden rounded-xl border border-border/50">
            <div className="flex items-center gap-2 bg-foreground/[0.04] px-3 py-1.5">
              {g.position != null ? (
                <span className="font-mono text-[10px] text-foreground/45">
                  {String(g.position + 1).padStart(2, "0")}
                </span>
              ) : null}
              <span className="text-xs font-semibold text-foreground/80">{g.title}</span>
            </div>
            <table className="w-full text-left text-[11px]">
              <thead className="font-mono text-[9px] uppercase tracking-widest text-foreground/40">
                <tr className="border-b border-border/40">
                  <th className="px-3 py-1.5">What</th>
                  <th className="px-3 py-1.5">New value</th>
                  <th className="px-3 py-1.5">Currently</th>
                  <th className="px-3 py-1.5">Source</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((e, i) => (
                  <tr key={`${e.field}-${i}`} className="border-t border-border/30 align-top">
                    <td className="px-3 py-1.5 text-foreground/75">
                      <span className="block">{e.label}</span>
                      <span className="font-mono text-[9px] text-foreground/40">{e.field}</span>
                    </td>
                    <td className="px-3 py-1.5 font-semibold tabular-nums text-foreground">
                      {e.value || <span className="text-[#a02a20]">missing</span>}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-foreground/55">
                      {e.previous_value ? (
                        <span className={e.overwrites ? "text-[#a02a20] line-through" : ""}>
                          {e.previous_value}
                        </span>
                      ) : (
                        <span className="text-foreground/35">empty</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <OriginBadge origin={e.origin} />
                      {e.source ? (
                        <span className="mt-1 block leading-snug text-foreground/55">{e.source}</span>
                      ) : null}
                      {e.note ? (
                        <span className="mt-0.5 block leading-snug text-foreground/45">{e.note}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {mapping.warnings?.length ? (
        <ul className="space-y-1 text-[11px] leading-snug">
          {mapping.warnings.map((w) => (
            <li key={w} className="flex gap-1.5 text-[#a02a20]">
              <span aria-hidden>!</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {actionable && onSubmit ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onSubmit(
                mapping.needs_numeric_flag
                  ? "The figures are correct — write them to the slides as mapped, and yes, replace the existing numbers (allow_numeric_edits)."
                  : "The figures are correct — write them to the slides exactly as mapped.",
              )
            }
            className="rounded-lg bg-[#003FC7] px-3 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-40 hover:brightness-110"
          >
            Confirm and write
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onSubmit("Some of those numbers are wrong — show me the mapping again with these corrections: ")
            }
            className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground/70 transition disabled:opacity-40 hover:bg-foreground/[0.05]"
          >
            Adjust numbers
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSubmit("Only write the figures I supplied — leave the placeholders and unsourced ones off the slides.")}
            className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground/70 transition disabled:opacity-40 hover:bg-foreground/[0.05]"
          >
            Skip unsourced
          </button>
        </div>
      ) : null}
    </section>
  );
}
