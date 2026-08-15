// Stats mapping confirmation step.
//
// Before the agent writes figures onto slides it declares, per number, which
// slide/field it lands on, where the number came from and what it replaces.
// The chat renders that as a confirmation table with approve / adjust controls,
// and this module also lint-checks the mapping so unsourced or overwritten
// figures can never be saved silently.

import { tool, type ToolSet } from "ai";
import { z } from "zod";

export const STATS_MAPPING_TOOL_NAME = "confirm_stats_mapping";

export const STAT_ORIGINS = ["user", "knowledge", "computed", "placeholder"] as const;
export type StatOrigin = (typeof STAT_ORIGINS)[number];

export type StatMappingEntry = {
  slide_position: number | null;
  slide_title: string;
  field: string;
  label: string;
  value: string;
  previous_value: string | null;
  origin: StatOrigin;
  source: string | null;
  note: string | null;
  overwrites: boolean;
};

export type StatsMapping = {
  mapping: true;
  headline: string;
  deck_id: string | null;
  entries: StatMappingEntry[];
  counts: { total: number; overwrites: number; placeholders: number; unsourced: number };
  warnings: string[];
  needs_numeric_flag: boolean;
};

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

/** Only a real, different prior value counts as an overwrite. */
function isOverwrite(previous: string | null, value: string): boolean {
  const prev = norm(previous);
  if (!prev) return false;
  if (/^(tbd|n\/?a|—|-|xx|placeholder|\[.*\])$/i.test(prev)) return false;
  return prev !== norm(value);
}

export function buildStatsMapping(input: {
  headline: string;
  deck_id?: string | null;
  entries: Array<{
    slide_position?: number | null;
    slide_title?: string | null;
    field: string;
    label?: string | null;
    value: string;
    previous_value?: string | null;
    origin: StatOrigin;
    source?: string | null;
    note?: string | null;
  }>;
}): StatsMapping | { error: string } {
  const raw = Array.isArray(input.entries) ? input.entries : [];
  if (!raw.length)
    return { error: "No figures supplied. List every number you plan to write, one entry per field." };

  const entries: StatMappingEntry[] = raw.map((e) => {
    const value = norm(e.value);
    return {
      slide_position: typeof e.slide_position === "number" ? e.slide_position : null,
      slide_title: norm(e.slide_title) || "Untitled slide",
      field: norm(e.field) || "(unspecified field)",
      label: norm(e.label) || norm(e.field),
      value,
      previous_value: norm(e.previous_value) || null,
      origin: e.origin,
      source: norm(e.source) || null,
      note: norm(e.note) || null,
      overwrites: isOverwrite(e.previous_value ?? null, value),
    };
  });

  const warnings: string[] = [];
  const placeholders = entries.filter((e) => e.origin === "placeholder");
  const overwrites = entries.filter((e) => e.overwrites);
  const unsourced = entries.filter(
    (e) => (e.origin === "knowledge" || e.origin === "computed") && !e.source,
  );
  const missingValue = entries.filter((e) => !e.value);

  if (missingValue.length)
    warnings.push(`${missingValue.length} entr${missingValue.length === 1 ? "y has" : "ies have"} no value — fill or drop them.`);
  if (unsourced.length)
    warnings.push(
      `${unsourced.length} figure${unsourced.length === 1 ? "" : "s"} came from research or a calculation but carry no source — cite them before saving.`,
    );
  if (placeholders.length)
    warnings.push(
      `${placeholders.length} figure${placeholders.length === 1 ? " is a placeholder" : "s are placeholders"} — they will render as visibly unknown until the user supplies real numbers.`,
    );
  if (overwrites.length)
    warnings.push(
      `${overwrites.length} figure${overwrites.length === 1 ? "" : "s"} would replace a number already on a slide — that write needs allow_numeric_edits: true and the user's approval.`,
    );

  // Same field written twice with different values.
  const seen = new Map<string, string>();
  for (const e of entries) {
    const key = `${e.slide_position ?? e.slide_title}::${e.field}`;
    const prior = seen.get(key);
    if (prior && prior !== e.value) warnings.push(`${e.field} is mapped twice with different values (${prior} vs ${e.value}).`);
    seen.set(key, e.value);
  }

  return {
    mapping: true,
    headline: norm(input.headline) || "Figures to write",
    deck_id: input.deck_id ?? null,
    entries,
    counts: {
      total: entries.length,
      overwrites: overwrites.length,
      placeholders: placeholders.length,
      unsourced: unsourced.length,
    },
    warnings,
    needs_numeric_flag: overwrites.length > 0,
  };
}

export function buildStatsMappingToolSet(): ToolSet {
  return {
    [STATS_MAPPING_TOOL_NAME]: tool({
      description:
        "Show the user exactly which numbers you are about to write, where each one lands and where it came from, BEFORE saving anything. Call this whenever a turn will write figures, stats, dates or currency onto one or more slides (including chart/KPI content). One entry per figure: the slide, the field name you will patch, the new value, the value currently on the slide (if any), and its origin — 'user' (they gave it to you), 'knowledge' (from search_knowledge, cite it), 'computed' (derived, say from what) or 'placeholder' (unknown). After calling this, END THE TURN with one short line asking them to confirm or correct the numbers; the table renders with confirm and adjust controls. Only after they confirm, write with update_slide_content (adding allow_numeric_edits: true for any entry that replaces an existing figure). Skip the pause only if the user explicitly told you to build straight through without checking in.",
      inputSchema: z.object({
        headline: z.string().describe("One line on what this batch of figures is for"),
        deck_id: z.string().nullable().describe("Deck the figures will be written to, if known"),
        entries: z
          .array(
            z.object({
              slide_position: z.number().int().nullable().describe("0-based slide position from get_deck"),
              slide_title: z.string().nullable().describe("Plain-language slide title"),
              field: z.string().describe("Content field path you will patch, e.g. stats[0].value"),
              label: z.string().nullable().describe("What the number means, in plain words"),
              value: z.string().describe("The value you will write, exactly as it will appear"),
              previous_value: z
                .string()
                .nullable()
                .describe("What is on the slide today for that field; null or empty if blank/placeholder"),
              origin: z
                .enum(STAT_ORIGINS)
                .describe("'user' | 'knowledge' | 'computed' | 'placeholder'"),
              source: z.string().nullable().describe("Where it came from: the user's message, a knowledge entry title, or the calculation"),
              note: z.string().nullable().describe("Anything the user should sanity-check"),
            }),
          )
          .min(1)
          .describe("Every figure this turn will write, in slide order"),
      }),
      execute: async ({ headline, deck_id, entries }) =>
        buildStatsMapping({ headline, deck_id, entries }),
    }),
  };
}
