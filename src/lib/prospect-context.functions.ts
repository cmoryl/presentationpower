import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Looks up what we already know / already built for a named prospect, so the
// brief page can tell the user what is reusable before anything is generated.

const Input = z.object({
  prospect: z.string().trim().min(2).max(120),
  industry: z.string().trim().max(120).optional().default(""),
});

export type ProspectRelevance = {
  prospect: string;
  briefs: Array<{ id: string; title: string; industry: string | null; createdAt: string }>;
  decks: Array<{ id: string; title: string; updatedAt: string | null; brandModeId: string | null }>;
  logo: { id: string; clientName: string; industry: string | null; primaryPath: string } | null;
  knowledge: Array<{ id: string; title: string; kind: string; tags: string[]; snippet: string }>;
  industrySignals: string[];
};

export const lookupProspectContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }): Promise<ProspectRelevance> => {
    const { supabase, userId } = context;
    const name = data.prospect.trim();
    const like = `%${name.replace(/[%_]/g, "")}%`;
    const industry = data.industry.trim();

    const [briefsRes, decksRes, logoRes, kbRes] = await Promise.all([
      supabase
        .from("briefs")
        .select("id, title, prospect, industry, created_at")
        .eq("owner_id", userId)
        .ilike("prospect", like)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("decks")
        .select("id, title, updated_at, brand_mode_id")
        .eq("owner_id", userId)
        .ilike("title", like)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("client_logos")
        .select("id, client_name, industry, primary_path")
        .ilike("client_name", like)
        .eq("is_active", true)
        .limit(1),
      supabase
        .from("knowledge_entries")
        .select("id, title, kind, tags, body")
        .or(`title.ilike.${like},body.ilike.${like}`)
        .limit(4),
    ]);

    const knowledge = (kbRes.data ?? []).map((k) => ({
      id: k.id as string,
      title: k.title as string,
      kind: String(k.kind),
      tags: (k.tags as string[]) ?? [],
      snippet: String(k.body ?? "").slice(0, 220),
    }));

    // Industry-level fallback: if we know nothing about this company by name,
    // surface knowledge tagged to the industry so generation still has ground truth.
    let industrySignals: string[] = [];
    if (industry) {
      const { data: byIndustry } = await supabase
        .from("knowledge_entries")
        .select("title")
        .or(`title.ilike.%${industry}%,tags.cs.{${industry}}`)
        .limit(5);
      industrySignals = (byIndustry ?? []).map((r) => r.title as string);
    }

    const logoRow = logoRes.data?.[0];

    return {
      prospect: name,
      briefs: (briefsRes.data ?? []).map((b) => ({
        id: b.id as string,
        title: (b.title as string) || (b.prospect as string) || "Untitled brief",
        industry: (b.industry as string) ?? null,
        createdAt: b.created_at as string,
      })),
      decks: (decksRes.data ?? []).map((d) => ({
        id: d.id as string,
        title: d.title as string,
        updatedAt: (d.updated_at as string) ?? null,
        brandModeId: (d.brand_mode_id as string) ?? null,
      })),
      logo: logoRow
        ? {
            id: logoRow.id as string,
            clientName: logoRow.client_name as string,
            industry: (logoRow.industry as string) ?? null,
            primaryPath: logoRow.primary_path as string,
          }
        : null,
      knowledge,
      industrySignals,
    };
  });
