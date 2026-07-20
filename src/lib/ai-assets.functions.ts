// Phase E · Semantic Asset Suggestions.
// One Claude call recommends curated/pack icons for a slide + an optional
// LogoHub search query. Reuses shared `ai-core` plumbing.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  ANTHROPIC_SETUP_MESSAGE,
  callAnthropic,
  extractJsonObject,
  governanceBlock,
  hasAnthropicKey,
  serializeBrandGuide,
} from "@/lib/ai-core";
import { ICON_LIBRARY, parseIconRef } from "@/lib/icon-library";
import { BRAND_MODES } from "@/lib/taxonomy";
import manifest from "../../public/icon-library/manifest.json" with { type: "json" };

const Input = z.object({
  brandModeId: z.string(),
  slideContent: z.record(z.string(), z.unknown()).default({}),
  sectionName: z.string().default(""),
  clientIndustry: z.string().optional().nullable(),
});

const Suggestion = z.object({
  ref: z.string(),
  rationale: z.string(),
  confidence: z.number().min(1).max(5),
});
const OutputSchema = z.object({
  iconSuggestions: z.array(Suggestion).max(6).default([]),
  clientLogoQuery: z.string().optional().nullable(),
});

export type AssetSuggestions = {
  iconSuggestions: Array<{ ref: string; rationale: string; confidence: number }>;
  clientLogoQuery: string | null;
};

type PackMeta = { id: string; name: string; categories?: Record<string, number> };
const PACKS: PackMeta[] = (() => {
  const raw = (manifest as { packs?: unknown }).packs;
  if (!Array.isArray(raw)) return [];
  return (raw as PackMeta[]).map((p) => ({ id: p.id, name: p.name, categories: p.categories }));
})();
const PACK_IDS = new Set(PACKS.map((p) => p.id));
const CURATED_NAMES = new Set(ICON_LIBRARY.map((e) => e.name));

function resolveDivisionId(brandModeId: string): string | null {
  const bm = BRAND_MODES.find((m) => m.id === brandModeId);
  return bm?.id ?? null;
}

export const suggestAssetsForSlide = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; setup?: boolean; note?: string; suggestions: AssetSuggestions }
      | { ok: false; error: string }
    > => {
      const empty: AssetSuggestions = { iconSuggestions: [], clientLogoQuery: null };
      if (!hasAnthropicKey()) {
        return { ok: true, setup: true, note: ANTHROPIC_SETUP_MESSAGE, suggestions: empty };
      }

      const divisionId = resolveDivisionId(data.brandModeId) ?? "bm-enterprise";
      const guideBlock = serializeBrandGuide(divisionId);
      const gov = governanceBlock();
      const curated = ICON_LIBRARY.map((e) => `- ${e.name} · ${e.group} · ${e.label}`).join("\n");
      const packList = PACKS.map(
        (p) => `- ${p.id} · ${p.name}${p.categories ? ` (${Object.keys(p.categories).slice(0, 8).join(",")})` : ""}`,
      ).join("\n");

      const system = [
        `${guideBlock}\n\n${gov}\n\n# Curated Icon Library (use these names for "ref")\n${curated}\n\n# Extended Icon Packs (use "pack_id:name" — pick names that plausibly exist)\n${packList}`,
        [
          "You are the TransPerfect Asset Curator.",
          "Return STRICT JSON with keys: iconSuggestions (array, max 6), clientLogoQuery (string or null).",
          "Each iconSuggestion: { ref, rationale (≤120 chars), confidence (1-5) }.",
          "ref must be either a curated name from the library above, OR the form pack_id:icon-name where pack_id matches one listed.",
          "Prefer curated icons when they fit. Only propose pack refs for concepts the curated set doesn't cover.",
          "clientLogoQuery: 1-4 words describing the client's industry/category for a logo search (or null).",
          "No prose outside the JSON.",
        ].join(" "),
      ];

      const user = [
        `Section: ${data.sectionName || "(unspecified)"}`,
        data.clientIndustry ? `Client industry: ${data.clientIndustry}` : "",
        "Slide content:",
        "```json",
        JSON.stringify(data.slideContent, null, 2).slice(0, 4000),
        "```",
        "Return JSON only.",
      ]
        .filter(Boolean)
        .join("\n");

      const runOnce = async () => callAnthropic(system, user, { maxTokens: 1200, temperature: 0.3 });
      let res = await runOnce();
      if (!res.ok) res = await runOnce();
      if (!res.ok) return { ok: false, error: `Claude ${res.status}` };

      const parsed = extractJsonObject(res.text);
      const validated = OutputSchema.safeParse(parsed);
      if (!validated.success) return { ok: false, error: "Malformed response" };

      const cleaned = validated.data.iconSuggestions.filter((s) => {
        if (CURATED_NAMES.has(s.ref)) return true;
        const p = parseIconRef(s.ref);
        return !!(p && PACK_IDS.has(p.packId));
      });

      return {
        ok: true,
        suggestions: {
          iconSuggestions: cleaned.slice(0, 6),
          clientLogoQuery: validated.data.clientLogoQuery?.trim() || null,
        },
      };
    },
  );
