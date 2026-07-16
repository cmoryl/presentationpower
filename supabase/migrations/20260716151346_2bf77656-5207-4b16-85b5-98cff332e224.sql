
CREATE TABLE public.oracle_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  org_summary TEXT,
  portfolio_analysis JSONB,
  market_landscape JSONB,
  strategic_recommendations JSONB,
  cross_entity_patterns JSONB,
  unified_voice_profile JSONB,
  unified_audience_map JSONB,
  competitive_overview JSONB,
  cultural_readiness JSONB,
  knowledge_entry_count INTEGER DEFAULT 0,
  entity_brain_count INTEGER DEFAULT 0,
  last_synthesis_at TIMESTAMPTZ,
  synthesis_count INTEGER DEFAULT 0,
  confidence_scores JSONB DEFAULT '{}'::jsonb,
  synthesis_history JSONB DEFAULT '[]'::jsonb,
  bias_awareness_insights JSONB DEFAULT '{}'::jsonb,
  longitudinal_trends JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.oracle_intelligence TO authenticated;
GRANT ALL ON public.oracle_intelligence TO service_role;
ALTER TABLE public.oracle_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read oracle_intelligence" ON public.oracle_intelligence FOR SELECT TO authenticated USING (true);

CREATE TABLE public.oracle_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  source_type TEXT,
  source_entity_id UUID,
  source_entity_type TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  category TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX oracle_kb_org_idx ON public.oracle_knowledge_base (organization_id);
CREATE INDEX oracle_kb_active_idx ON public.oracle_knowledge_base (is_active);
GRANT SELECT ON public.oracle_knowledge_base TO authenticated;
GRANT ALL ON public.oracle_knowledge_base TO service_role;
ALTER TABLE public.oracle_knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read oracle_knowledge_base" ON public.oracle_knowledge_base FOR SELECT TO authenticated USING (true);

CREATE TABLE public.brand_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  brand_summary TEXT,
  market_position TEXT,
  target_audience JSONB,
  competitive_advantages JSONB,
  competitive_landscape JSONB,
  brand_voice_profile JSONB,
  growth_recommendations JSONB,
  cultural_insights JSONB,
  knowledge_entries JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX brand_intel_org_idx ON public.brand_intelligence (organization_id);
CREATE INDEX brand_intel_entity_idx ON public.brand_intelligence (entity_type, entity_id);
GRANT SELECT ON public.brand_intelligence TO authenticated;
GRANT ALL ON public.brand_intelligence TO service_role;
ALTER TABLE public.brand_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read brand_intelligence" ON public.brand_intelligence FOR SELECT TO authenticated USING (true);

CREATE TRIGGER oracle_intel_set_updated_at BEFORE UPDATE ON public.oracle_intelligence FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER oracle_kb_set_updated_at BEFORE UPDATE ON public.oracle_knowledge_base FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER brand_intel_set_updated_at BEFORE UPDATE ON public.brand_intelligence FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
