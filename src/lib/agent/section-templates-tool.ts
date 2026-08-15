/**
 * Agent access to the per-level / per-section template library.
 *
 * Lets the model ask: "for this industry and this section, at this level of the
 * story, which layout treatment do we use?" and get a concrete module variant,
 * scene, geometry, type scale and density budget back.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { INDUSTRY_RECIPES } from "../design-skins";
import {
  LEVEL_ROLE,
  TEMPLATE_LEVELS,
  describeTreatment,
  inferLevel,
  levelsForSection,
  sectionTemplate,
  templateLibraryForIndustry,
  templateLibrarySize,
  type TemplateLevel,
} from "../section-templates";
import { SECTION_FRAMEWORKS } from "../taxonomy";

const LevelEnum = z.enum(["headline", "body", "kpi", "process", "appendix"]);

export function buildSectionTemplateToolSet(): ToolSet {
  return {
    list_template_levels: tool({
      description:
        "Read the per-level template library map: the five reading levels (headline, body, kpi, process, appendix) with their type scales and density budgets, and which levels each section framework supports. Call this before assigning layouts so each slide gets the right register.",
      inputSchema: z.object({}),
      execute: async () => ({
        library_size: templateLibrarySize(),
        levels: TEMPLATE_LEVELS.map((level) => ({ level, ...LEVEL_ROLE[level] })),
        sections: SECTION_FRAMEWORKS.map((s) => ({
          section_id: s.id,
          name: s.name,
          purpose: s.purpose,
          levels: levelsForSection(s.id),
        })),
        how_to_use:
          "Pick the industry (R01–R30), then for each slide choose its section framework and level, and call section_layout_template to get the module variant, scene, geometry and density budget to build with.",
      }),
    }),

    section_layout_template: tool({
      description:
        "Resolve the curated layout treatment for one industry + section + level: preferred module variant plus alternates, backdrop scene, geometry signature (card shape, scaffold, margin device, sheet fill), type scale and content budget. Use its variant id when inserting or changing a slide.",
      inputSchema: z.object({
        industry_id: z.string().describe("Industry recipe id, e.g. 'R05'"),
        section_id: z.string().describe("Section framework id, e.g. 'SF-08'"),
        level: LevelEnum.optional().describe("Reading level; omitted uses the section's primary level"),
        slide_job: z
          .string()
          .optional()
          .describe("Free text about the slide's job, used to infer the level when none is given"),
      }),
      execute: async ({ industry_id, section_id, level, slide_job }) => {
        const inferred: TemplateLevel | undefined =
          level ?? (slide_job ? inferLevel(slide_job, section_id) : undefined);
        const treatment = sectionTemplate({ industryId: industry_id, sectionId: section_id, level: inferred });
        if (!treatment)
          return {
            error: `No treatment for industry "${industry_id}" + section "${section_id}". Valid industries: ${INDUSTRY_RECIPES.map((r) => r.id).join(", ")}. Valid sections: ${SECTION_FRAMEWORKS.map((s) => s.id).join(", ")}.`,
          };
        return { ...treatment, summary: describeTreatment(treatment) };
      },
    }),

    industry_template_library: tool({
      description:
        "List every curated section × level treatment for one industry, in deck order — the industry's full template sheet. Use it to lay out a whole deck consistently.",
      inputSchema: z.object({
        industry_id: z.string().describe("Industry recipe id, e.g. 'R12'"),
        level: LevelEnum.optional().describe("Filter to one reading level"),
      }),
      execute: async ({ industry_id, level }) => {
        const all = templateLibraryForIndustry(industry_id);
        if (!all.length)
          return {
            error: `Unknown industry "${industry_id}". Valid ids: ${INDUSTRY_RECIPES.map((r) => r.id).join(", ")}.`,
          };
        const rows = level ? all.filter((t) => t.level === level) : all;
        return {
          industry_id,
          industry_name: all[0]!.industryName,
          count: rows.length,
          treatments: rows.map(describeTreatment),
        };
      },
    }),
  };
}
