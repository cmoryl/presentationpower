// BrandHub-sourced brand intelligence, distilled per guide slug.
// Generated from public/knowledge-export/database-seed.json.
import data from "./brandhub-intel.json";

export type VoiceProfile = {
  tone?: string | string[];
  style?: string | string[];
  personality?: string | string[];
  communication_style?: string | string[];
  [k: string]: unknown;
};

export type GrowthRecommendation = {
  recommendation?: string;
  priority?: string;
  rationale?: string;
  confidence?: number;
  source?: string;
};

export type CompetitiveLandscape = {
  competitors?: string[];
  competitive_gaps?: string[];
  reports_count?: number;
  last_synced?: string;
};

export type CulturalInsights = {
  primary_markets?: string[];
  cultural_considerations?: string[];
  localization_priorities?: string[];
  global_readiness_score?: number;
  imagery_guidelines?: string[];
  color_cultural_notes?: string[];
};

export type BrandhubIntel = {
  summary: string;
  marketPosition: string;
  targetAudience: string;
  competitiveAdvantages: string[];
  voiceProfile: VoiceProfile;
  growthRecommendations: GrowthRecommendation[];
  competitiveLandscape: CompetitiveLandscape;
  culturalInsights: CulturalInsights;
  knowledgeEntries: string[];
};

const INTEL = data as Record<string, BrandhubIntel>;

export function getBrandhubIntel(slug: string): BrandhubIntel | undefined {
  return INTEL[slug];
}

export function normalizeVoiceValue(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}
