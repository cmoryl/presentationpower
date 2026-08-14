import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { textResult } from "../supabase";
import { SECTION_FRAMEWORKS, byId, variantsForSection } from "@/lib/taxonomy";

export default defineTool({
  name: "list_section_variants",
  title: "List section frameworks and variants",
  description:
    "Browse the deck taxonomy. Without a section_id it lists every section framework; with one it lists the module variants permitted for that section and their allowed layouts.",
  inputSchema: {
    section_id: z
      .string()
      .describe("Section framework id, e.g. 'SF-06'. Omit to list all sections.")
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ section_id }) => {
    if (!section_id) {
      return textResult({
        sections: SECTION_FRAMEWORKS.map((s) => ({
          id: s.id,
          name: s.name,
          purpose: s.purpose,
          variantCount: variantsForSection(s.id).length,
        })),
      });
    }
    const section = byId(SECTION_FRAMEWORKS, section_id);
    if (!section) {
      return {
        content: [{ type: "text" as const, text: `Unknown section_id ${section_id}` }],
        isError: true,
      };
    }
    return textResult({
      sectionId: section.id,
      sectionName: section.name,
      purpose: section.purpose,
      variants: variantsForSection(section.id).map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        permittedLayoutIds: v.permittedLayoutIds,
      })),
    });
  },
});
