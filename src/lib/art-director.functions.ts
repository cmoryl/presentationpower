// Move D — Art Director agent.
// Holistic pacing / rhythm / composition critique for a deck, distinct from
// the Brand Reviewer (which polices terminology, voice, claims, structure,
// branding). Art Director looks at the deck AS A DECK: variant mix,
// visual cadence, chapter balance, hero moments, quiet moments, and the
// arc from opening to close.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ANTHROPIC_SETUP_MESSAGE,
  callAnthropic,
  hasAnthropicKey,
  serializeBrandGuide,
} from "@/lib/ai-core";
import { MODULE_VARIANTS } from "@/lib/taxonomy";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const Note = z.object({
  slideIndex: z.number().int().nonnegative().optional(),
  kind: z.enum(["pacing", "rhythm", "composition", "hero", "chapter", "variety"]),
  severity: z.enum(["critical", "warning", "suggestion"]),
  headline: z.string(),
  detail: z.string(),
  // Optional actionable suggestions:
  suggestedVariantId: z.string().optional(),
  swapFromVariantId: z.string().optional(),
});

const Rhythm = z.object({
  overallScore: z.number().min(0).max(100),
  arcSummary: z.string(),
  chapterBalance: z.array(
    z.object({
      chapter: z.enum(["opening", "context", "solution", "proof", "close"]),
      slideCount: z.number().int().nonnegative(),
      verdict: z.enum(["light", "balanced", "heavy"]),
      note: z.string(),
    }),
  ),
  cadence: z.string(),
  heroMoments: z.array(z.number().int().nonnegative()),
  quietMoments: z.array(z.number().int().nonnegative()),
  notes: z.array(Note),
});

export type ArtDirectorReport = z.infer<typeof Rhythm>;
export type ArtDirectorNote = z.infer<typeof Note>;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const SlideInput = z.object({
  index: z.number().int().nonnegative(),
  variantId: z.string().optional(),
  sectionId: z.string().optional(),
  title: z.string().optional(),
  wordCount: z.number().int().nonnegative().optional(),
});

const Input = z.object({
  deckTitle: z.string(),
  brandModeId: z.string(),
  slides: z.array(SlideInput).min(1).max(80),
});

export type ArtDirectorInput = z.infer<typeof Input>;

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const critiqueDeckRhythm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; report: ArtDirectorReport } | { ok: false; error: string; setup?: boolean }
    > => {
      if (!hasAnthropicKey()) {
        return { ok: false, setup: true, error: ANTHROPIC_SETUP_MESSAGE };
      }

      // Compact variant catalog — id + category + intent — so the model can
      // suggest concrete swaps without hallucinating variant IDs.
      const catalog = MODULE_VARIANTS.map((v) => ({
        id: v.id,
        family: v.familyId,
        name: v.name,
        description: v.description,
      }));

      const stableSystem = [
        "You are the TransPerfect Art Director — a senior editorial/presentation designer.",
        "Your remit is RHYTHM, PACING, COMPOSITION, and VARIETY across a deck.",
        "You do NOT audit brand terminology, voice, or claims — a separate Brand Reviewer covers that.",
        "You DO care about:",
        "  · variety of variant categories (are we stacking 5 grids in a row?)",
        "  · density oscillation (dense → breathable → dense keeps attention)",
        "  · hero moments (bleeds, big-stat, quote, XL divider) placed with intent",
        "  · quiet moments (dividers, section breaks) that give the audience room",
        "  · chapter balance (Opening / Context / Solution / Proof / Close)",
        "  · openings that land (hero/orb/bleed variants) and closes that stick",
        "Return STRICT JSON only — no prose, no markdown fences.",
        "",
        serializeBrandGuide(data.brandModeId),
        "",
        "Available module variants (use these exact IDs when suggesting swaps):",
        JSON.stringify(catalog, null, 0),
      ].join("\n");

      const variableUser = [
        `Deck title: ${data.deckTitle}`,
        `Brand mode: ${data.brandModeId}`,
        `Slide count: ${data.slides.length}`,
        "",
        "Slides in order (JSON):",
        JSON.stringify(data.slides, null, 0),
        "",
        "Return JSON of the shape:",
        `{
  "overallScore": number 0-100,
  "arcSummary": string (<= 400 chars, describe the deck's narrative arc as you read it),
  "chapterBalance": [
    { "chapter": "opening"|"context"|"solution"|"proof"|"close", "slideCount": number, "verdict": "light"|"balanced"|"heavy", "note": string }
  ],
  "cadence": string (<= 300 chars, describe the density oscillation),
  "heroMoments": [slideIndex...],  // slides that ARE landing as hero beats
  "quietMoments": [slideIndex...], // slides that give the audience a breath
  "notes": [
    {
      "slideIndex": number?,
      "kind": "pacing"|"rhythm"|"composition"|"hero"|"chapter"|"variety",
      "severity": "critical"|"warning"|"suggestion",
      "headline": string,
      "detail": string,
      "suggestedVariantId": string?, // must be an ID from the catalog above
      "swapFromVariantId": string?
    }
  ]
}`,
        "",
        "Aim for 6-12 notes total. Be specific — cite slide indices whenever possible.",
        "When you suggest a swap, prefer variants from the SAME category as the current slide's role unless the point is deliberate variety.",
      ].join("\n");

      async function attempt(extra?: string) {
        const res = await callAnthropic(
          [stableSystem],
          extra ? `${variableUser}\n\n${extra}` : variableUser,
          { maxTokens: 3500 },
        );
        if (!res.ok) return { rawError: `Anthropic ${res.status}: ${res.body}` } as const;
        const text = res.text;
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start < 0 || end < 0) return { rawError: "Model did not return JSON" } as const;
        try {
          const parsed = Rhythm.safeParse(JSON.parse(text.slice(start, end + 1)));
          if (parsed.success) return { report: parsed.data } as const;
          return { rawError: `Schema mismatch: ${parsed.error.message.slice(0, 200)}` } as const;
        } catch (e) {
          return { rawError: `JSON parse failed: ${(e as Error).message}` } as const;
        }
      }

      let result = await attempt();
      if (!("report" in result) || !result.report) {
        result = await attempt(
          "Your previous response was not valid JSON matching the schema. Return ONLY the JSON object — no prose, no markdown fences.",
        );
      }
      if (!("report" in result) || !result.report) {
        return {
          ok: false,
          error: ("rawError" in result && result.rawError) || "Art Director failed",
        };
      }
      return { ok: true, report: result.report };
    },
  );
