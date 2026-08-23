/**
 * Oracle Brain Hook
 * Reads the Master Oracle intelligence for an organization and edits its
 * knowledge base directly through the database (RLS applies).
 *
 * There is no Oracle "synthesis" backend in this project — the earlier version
 * of this hook invoked an `oracle-brain` edge function and polled an
 * `oracle_jobs` table, neither of which exists here, so every write silently
 * failed. Synthesis was removed rather than left as a dead button; knowledge
 * add / update / delete now write to `oracle_knowledge_base` for real.
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PortfolioAnalysis {
  entity_count?: number;
  brand_count?: number;
  product_count?: number;
  event_count?: number;
  themes?: string[];
  gaps?: string[];
  [key: string]: unknown;
}

export interface MarketLandscape {
  industry?: string;
  trends?: string[];
  opportunities?: string[];
  threats?: string[];
  [key: string]: unknown;
}

export interface VoiceProfile {
  tone?: string;
  personality?: string[];
  language_style?: string;
  [key: string]: unknown;
}

export interface AudienceMap {
  segments?: Array<{ name: string; description?: string }>;
  demographics?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CompetitiveOverview {
  competitors?: Array<{ name: string; strengths?: string[]; weaknesses?: string[] }>;
  market_position?: string;
  [key: string]: unknown;
}

export interface CulturalReadiness {
  overall_score?: number;
  regions?: Array<{ code: string; readiness: number }>;
  recommendations?: string[];
  [key: string]: unknown;
}

export interface OracleIntelligence {
  id: string;
  organization_id: string;
  org_summary: string | null;
  portfolio_analysis: PortfolioAnalysis | null;
  market_landscape: MarketLandscape | null;
  strategic_recommendations: Array<{ title: string; description: string; priority?: string }>;
  cross_entity_patterns: Record<string, unknown> | null;
  unified_voice_profile: VoiceProfile | null;
  unified_audience_map: AudienceMap | null;
  competitive_overview: CompetitiveOverview | null;
  cultural_readiness: CulturalReadiness | null;
  knowledge_entry_count: number;
  entity_brain_count: number;
  last_synthesis_at: string | null;
  synthesis_count: number;
  created_at: string;
  updated_at: string;
}

export interface OracleKnowledgeEntry {
  id: string;
  title: string;
  content: string;
  content_type: string;
  source_type: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useOracleBrain(organizationId: string | null | undefined) {
  const [intelligence, setIntelligence] = useState<OracleIntelligence | null>(null);
  const [knowledge, setKnowledge] = useState<OracleKnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchIntelligence = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [{ data: intel }, { data: kb }] = await Promise.all([
        supabase
          .from("oracle_intelligence")
          .select("*")
          .eq("organization_id", organizationId)
          .maybeSingle(),
        supabase
          .from("oracle_knowledge_base")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (intel) setIntelligence(intel as unknown as OracleIntelligence);
      if (kb) setKnowledge(kb as unknown as OracleKnowledgeEntry[]);
    } catch (err) {
      console.error("[OracleBrain] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  const addKnowledge = useCallback(
    async (title: string, content: string, contentType = "text", tags: string[] = []) => {
      if (!organizationId) return;
      try {
        const { data, error } = await supabase
          .from("oracle_knowledge_base")
          .insert({
            organization_id: organizationId,
            title,
            content,
            content_type: contentType,
            source_type: "manual",
            tags,
            is_active: true,
          })
          .select()
          .single();
        if (error) throw error;
        setKnowledge((prev) => [data as unknown as OracleKnowledgeEntry, ...prev]);
        toast.success("Knowledge entry added");
        return data;
      } catch {
        toast.error("Failed to add knowledge entry");
      }
    },
    [organizationId],
  );

  const deleteKnowledge = useCallback(
    async (knowledgeId: string) => {
      if (!organizationId) return;
      try {
        // Soft delete — the reader filters on is_active, and keeping the row
        // preserves provenance for anything that referenced it.
        const { error } = await supabase
          .from("oracle_knowledge_base")
          .update({ is_active: false })
          .eq("id", knowledgeId)
          .eq("organization_id", organizationId);
        if (error) throw error;
        setKnowledge((prev) => prev.filter((k) => k.id !== knowledgeId));
        toast.success("Knowledge entry removed");
      } catch {
        toast.error("Failed to delete knowledge entry");
      }
    },
    [organizationId],
  );

  const updateKnowledge = useCallback(
    async (
      knowledgeId: string,
      updates: { title?: string; content?: string; tags?: string[]; category?: string },
    ) => {
      if (!organizationId) return;
      try {
        const { data, error } = await supabase
          .from("oracle_knowledge_base")
          .update(updates)
          .eq("id", knowledgeId)
          .eq("organization_id", organizationId)
          .select()
          .single();
        if (error) throw error;
        setKnowledge((prev) => prev.map((k) => (k.id === knowledgeId ? { ...k, ...updates } : k)));
        toast.success("Knowledge entry updated");
        return data;
      } catch {
        toast.error("Failed to update knowledge entry");
      }
    },
    [organizationId],
  );

  return {
    intelligence,
    knowledge,
    isLoading,
    addKnowledge,
    deleteKnowledge,
    updateKnowledge,
    refetch: fetchIntelligence,
  };
}
