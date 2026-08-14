// Phase C · Deep RAG Synthesis — thin server-fn wrapper.
//
// The retrieval + synthesis pipeline lives in `@/lib/ai-rag.core` as a plain
// async function so MCP tools and scripts can call the identical code path
// with their own Supabase client.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SynthesisInput, synthesizeKnowledgeForBriefCore } from "@/lib/ai-rag.core";

export type {
  KnowledgeSource,
  SynthesizedSnippet,
  SynthesisCoreResult,
} from "@/lib/ai-rag.core";

export const synthesizeKnowledgeForBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SynthesisInput.parse(raw))
  .handler(async ({ data, context }) => synthesizeKnowledgeForBriefCore(context.supabase, data));
