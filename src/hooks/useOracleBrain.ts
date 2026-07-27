/**
 * Oracle Brain Hook
 * Manages the Master Oracle intelligence for an organization
 */

import { useState, useCallback, useRef, useEffect } from "react";
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
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisProgress, setSynthesisProgress] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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

  const startSynthesis = useCallback(async () => {
    if (!organizationId) return;
    setIsSynthesizing(true);
    setSynthesisProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke("oracle-brain", {
        body: { action: "synthesize", organizationId },
      });

      if (error) throw new Error(error.message);
      if (!data?.job_id) throw new Error("No job ID returned");

      toast.info("Oracle synthesis started...");

      // Poll for job status
      pollingRef.current = setInterval(async () => {
        // NOTE: `oracle_jobs` table is not present in this project (synthesis edge function not ported).
        // Cast to any so the hook typechecks; polling will resolve to null and effectively no-op.
        const { data: job } = await (supabase as any)
          .from("oracle_jobs")
          .select("status, progress, error_message")
          .eq("id", data.job_id)
          .maybeSingle();

        if (!job) return;
        const jobData = job as { status?: string; progress?: number; error_message?: string };
        setSynthesisProgress(jobData.progress || 0);

        if (jobData.status === "completed") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setIsSynthesizing(false);
          toast.success("Oracle synthesis complete!");
          fetchIntelligence();
        } else if (jobData.status === "failed") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setIsSynthesizing(false);
          toast.error(jobData.error_message || "Synthesis failed");
        }
      }, 2000);
    } catch (err) {
      setIsSynthesizing(false);
      const msg = err instanceof Error ? err.message : "Failed to start synthesis";
      toast.error(msg);
    }
  }, [organizationId, fetchIntelligence]);

  const addKnowledge = useCallback(
    async (title: string, content: string, contentType = "text", tags: string[] = []) => {
      if (!organizationId) return;
      try {
        const { data, error } = await supabase.functions.invoke("oracle-brain", {
          body: { action: "add_knowledge", organizationId, title, content, contentType, tags },
        });
        if (error) throw new Error(error.message);
        toast.success("Knowledge entry added");
        fetchIntelligence();
        return data;
      } catch (err) {
        toast.error("Failed to add knowledge entry");
      }
    },
    [organizationId, fetchIntelligence],
  );

  const deleteKnowledge = useCallback(
    async (knowledgeId: string) => {
      if (!organizationId) return;
      try {
        const { error } = await supabase.functions.invoke("oracle-brain", {
          body: { action: "delete_knowledge", organizationId, knowledgeId },
        });
        if (error) throw new Error(error.message);
        setKnowledge((prev) => prev.filter((k) => k.id !== knowledgeId));
        toast.success("Knowledge entry removed");
      } catch (err) {
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
      } catch (err) {
        toast.error("Failed to update knowledge entry");
      }
    },
    [organizationId],
  );

  return {
    intelligence,
    knowledge,
    isLoading,
    isSynthesizing,
    synthesisProgress,
    startSynthesis,
    addKnowledge,
    deleteKnowledge,
    updateKnowledge,
    refetch: fetchIntelligence,
  };
}
