// Unified division-knowledge server function.
//
// The whole system — deck editor, PPTX/PDF export, print assets, AI agents —
// reads a single canonical context object per division so every surface pulls
// from the same well. This is the "shared source of truth" that the plan
// describes.
//
// Consumers pass a division id (a brand_mode_id like `bm-tp-lifesci`) and get
// back one bundle: mode tokens, RAG knowledge, stats, quotes, imagery,
// client logos, and — when useful — approved case-study references.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DivisionStat = {
  id: string;
  label: string;
  value: string;
  unit: string | null;
  caption: string | null;
  source: string | null;
  sort_order: number;
};

export type DivisionQuote = {
  id: string;
  quote: string;
  author: string | null;
  role: string | null;
  company: string | null;
  source: string | null;
  sort_order: number;
};

export type DivisionKnowledgeEntry = {
  id: string;
  title: string;
  body: string;
  kind: string;
  tags: string[];
};

export type DivisionImageryRef = {
  id: string;
  storage_path: string;
  variant: string | null;
};

export type DivisionLogoRef = {
  id: string;
  name: string;
  url: string;
  role: string | null;
};

export type DivisionBrandMode = {
  id: string;
  name: string;
  description: string;
  tokens: Record<string, unknown>;
};

export type DivisionCaseStudy = {
  id: string;
  title: string;
  variant_id: string;
  tags: string[];
};

export type DivisionContext = {
  divisionId: string;
  mode: DivisionBrandMode | null;
  stats: DivisionStat[];
  quotes: DivisionQuote[];
  knowledge: DivisionKnowledgeEntry[];
  imagery: DivisionImageryRef[];
  logos: DivisionLogoRef[];
  caseStudies: DivisionCaseStudy[];
};

const Input = z.object({
  divisionId: z.string().min(1),
  includeKnowledge: z.boolean().optional().default(true),
  includeImagery: z.boolean().optional().default(true),
  knowledgeLimit: z.number().int().positive().max(40).optional().default(20),
});

export const getDivisionContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => Input.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const divisionId = data.divisionId;

    const [modeQ, statsQ, quotesQ, knowledgeQ, imageryQ, logosQ, casesQ] = await Promise.all([
      supabase
        .from("brand_modes")
        .select("id, name, description, tokens")
        .eq("id", divisionId)
        .maybeSingle(),
      supabase
        .from("division_stats")
        .select("id, label, value, unit, caption, source, sort_order")
        .eq("division_id", divisionId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("division_quotes")
        .select("id, quote, author, role, company, source, sort_order")
        .eq("division_id", divisionId)
        .order("sort_order", { ascending: true }),
      data.includeKnowledge
        ? supabase
            .from("knowledge_entries")
            .select("id, title, body, kind, tags")
            .or(`owner_division_id.eq.${divisionId},shared_with_division_ids.cs.{${divisionId}}`)
            .order("updated_at", { ascending: false })
            .limit(data.knowledgeLimit)
        : Promise.resolve({ data: [], error: null } as { data: unknown[]; error: null }),
      data.includeImagery
        ? supabase
            .from("division_imagery")
            .select("id, storage_path, variant")
            .eq("division_id", divisionId)
            .limit(30)
        : Promise.resolve({ data: [], error: null } as { data: unknown[]; error: null }),
      supabase
        .from("client_logos")
        .select("id, name, url, role")
        .eq("division_id", divisionId)
        .limit(60),
      supabase
        .from("library_slide_examples")
        .select("id, title, variant_id, tags")
        .contains("tags", ["case-study"])
        .limit(20),
    ]);

    const result: DivisionContext = {
      divisionId,
      mode: (modeQ.data as DivisionBrandMode | null) ?? null,
      stats: ((statsQ.data ?? []) as DivisionStat[]),
      quotes: ((quotesQ.data ?? []) as DivisionQuote[]),
      knowledge: ((knowledgeQ.data ?? []) as DivisionKnowledgeEntry[]),
      imagery: ((imageryQ.data ?? []) as DivisionImageryRef[]),
      logos: ((logosQ.data ?? []) as DivisionLogoRef[]),
      caseStudies: ((casesQ.data ?? []) as DivisionCaseStudy[]),
    };
    return result;
  });

// Convenience: batch fetch when a caller (e.g. the deck editor) needs the
// context for several divisions in a single round-trip.
export const getDivisionContexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ divisionIds: z.array(z.string().min(1)).min(1).max(20) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [modes, stats, quotes] = await Promise.all([
      supabase.from("brand_modes").select("id, name, description, tokens").in("id", data.divisionIds),
      supabase
        .from("division_stats")
        .select("id, division_id, label, value, unit, caption, source, sort_order")
        .in("division_id", data.divisionIds),
      supabase
        .from("division_quotes")
        .select("id, division_id, quote, author, role, company, source, sort_order")
        .in("division_id", data.divisionIds),
    ]);

    const modeMap = new Map<string, DivisionBrandMode>();
    (modes.data ?? []).forEach((m) => modeMap.set(m.id as string, m as DivisionBrandMode));
    const statMap = new Map<string, DivisionStat[]>();
    (stats.data ?? []).forEach((r: Record<string, unknown>) => {
      const divisionId = r.division_id as string;
      const arr = statMap.get(divisionId) ?? [];
      arr.push({
        id: r.id as string,
        label: r.label as string,
        value: r.value as string,
        unit: (r.unit as string | null) ?? null,
        caption: (r.caption as string | null) ?? null,
        source: (r.source as string | null) ?? null,
        sort_order: (r.sort_order as number) ?? 0,
      });
      statMap.set(divisionId, arr);
    });
    const quoteMap = new Map<string, DivisionQuote[]>();
    (quotes.data ?? []).forEach((r: Record<string, unknown>) => {
      const divisionId = r.division_id as string;
      const arr = quoteMap.get(divisionId) ?? [];
      arr.push({
        id: r.id as string,
        quote: r.quote as string,
        author: (r.author as string | null) ?? null,
        role: (r.role as string | null) ?? null,
        company: (r.company as string | null) ?? null,
        source: (r.source as string | null) ?? null,
        sort_order: (r.sort_order as number) ?? 0,
      });
      quoteMap.set(divisionId, arr);
    });

    return data.divisionIds.map((id) => ({
      divisionId: id,
      mode: modeMap.get(id) ?? null,
      stats: (statMap.get(id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
      quotes: (quoteMap.get(id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    }));
  });
