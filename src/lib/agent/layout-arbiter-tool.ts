/**
 * Agent access to the layout arbiter.
 *
 * The section-template tools answer "what do we normally use here?". These
 * answer the harder question: "of every legal combination, which one actually
 * lays this content out best on this canvas — and should the canvas or the slide
 * count change?" The model is expected to call `arbitrate_layout` before
 * committing a variant, and to justify a pick using the returned reasons.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { arbitrateLayout, layoutFits, type LayoutBrief } from "../layout-arbiter";

const LevelEnum = z.enum(["headline", "body", "kpi", "process", "appendix"]);

const ContentSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  item_count: z.number().int().min(0).max(60).optional().describe("Repeated blocks: cards, stats, stages, bars, logos"),
  has_image: z.boolean().optional(),
  has_chart: z.boolean().optional(),
});

type ContentInput = z.infer<typeof ContentSchema>;

function toContent(c: ContentInput): LayoutBrief["content"] {
  return {
    title: c.title,
    subtitle: c.subtitle,
    body: c.body,
    bullets: c.bullets,
    items: c.item_count ? Array.from({ length: c.item_count }, (_, i) => ({ i })) : undefined,
    hasImage: c.has_image,
    hasChart: c.has_chart,
  };
}

export function buildLayoutArbiterToolSet(): ToolSet {
  return {
    arbitrate_layout: tool({
      description:
        "Find the BEST layout for one slide, not the most convenient one. Enumerates every legal module variant × permitted layout × reading level for the section, prunes anything the content cannot fit, and ranks the survivors on capacity fit, type headroom, canvas aspect, division design spec, content intent and neighbour rhythm. Returns the winner with reasons, the runners-up, the curated default for comparison, and a canvas/slide-count recommendation. Call this for every slide before choosing a variant id.",
      inputSchema: z.object({
        content: ContentSchema,
        section_id: z.string().optional().describe("Section framework id, e.g. 'SF-08'"),
        level: LevelEnum.optional().describe("Reading level; omitted is inferred from the copy"),
        industry_id: z.string().optional().describe("Industry recipe id, e.g. 'R05'"),
        brand_mode_id: z.string().optional().describe("Brand scope id, e.g. 'bm-dataforce'"),
        canvas: z
          .object({ width: z.number().positive(), height: z.number().positive() })
          .optional()
          .describe("Canvas size in any unit; defaults to 16:9"),
        avoid_variant_ids: z
          .array(z.string())
          .optional()
          .describe("Variants used on neighbouring slides, penalised for rhythm"),
        incumbent_variant_id: z
          .string()
          .optional()
          .describe("Variant currently assigned; reported back with its rank"),
        limit: z.number().int().min(1).max(12).optional(),
      }),
      execute: async (input) => {
        const decision = arbitrateLayout({
          content: toContent(input.content),
          sectionId: input.section_id ?? null,
          level: input.level ?? null,
          industryId: input.industry_id ?? null,
          brandModeId: input.brand_mode_id ?? null,
          canvas: input.canvas,
          avoid: input.avoid_variant_ids,
          incumbentVariantId: input.incumbent_variant_id ?? null,
        });
        const limit = input.limit ?? 5;
        return {
          level: decision.brief.level,
          canvas: decision.canvas,
          load: decision.load,
          considered: decision.consideredCount,
          curated_default: decision.curatedVariantId,
          incumbent: decision.incumbent,
          best: decision.best,
          runners_up: decision.candidates.slice(1, limit + 1).map((c) => ({
            variant_id: c.variantId,
            layout_id: c.layoutId,
            level: c.level,
            score: c.score,
            feasible: c.feasible,
            reasons: c.reasons.slice(0, 3),
          })),
          rationale: decision.rationale,
          how_to_use:
            "Build with best.variantId + best.layoutId. If canvas.splitRecommended is true, split the content across canvas.suggestedSlides slides instead of shrinking type. Quote best.reasons when explaining the layout to the user.",
        };
      },
    }),

    layout_fits: tool({
      description:
        "Feasibility probe for one specific variant: does the supplied content fit its declared capacity budget (title chars, body chars, item min/max)? Use it before forcing a variant the user asked for by name.",
      inputSchema: z.object({
        variant_id: z.string(),
        content: ContentSchema,
      }),
      execute: async ({ variant_id, content }) => ({
        variant_id,
        ...layoutFits(variant_id, { content: toContent(content) }),
      }),
    }),
  };
}
