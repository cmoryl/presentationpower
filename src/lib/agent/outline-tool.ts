// Outline proposal tool: the agent drafts the deck's slide topics and story
// flow first, the UI renders it, and the user confirms before any deck is built.
import { tool, type ToolSet } from "ai";
import { z } from "zod";

export const OutlineSlideSchema = z.object({
  title: z.string().describe("Plain-language slide title the audience would read"),
  purpose: z.string().optional().describe("One short line on what this slide does for the story"),
  points: z.array(z.string()).optional().describe("Up to 3 short talking points"),
});

export const OutlineSchema = z.object({
  title: z.string().describe("Working deck title"),
  audience: z.string().optional(),
  storyFlow: z.string().optional().describe("One or two sentences on how the story moves"),
  slides: z.array(OutlineSlideSchema).describe("Proposed slides in order"),
});

export type DeckOutline = z.infer<typeof OutlineSchema>;

/** Client-facing proposal step. Executing it only records the proposal. */
export function buildOutlineToolSet(): ToolSet {
  return {
    propose_outline: tool({
      description:
        "Propose the deck outline (title, audience, story flow and ordered slide topics) and STOP. Always call this before creating a new deck, then end the turn and wait for the user to confirm or adjust the outline.",
      inputSchema: OutlineSchema,
      execute: async (input) => {
        const outline = OutlineSchema.parse(input);
        return `Outline with ${outline.slides.length} slides shown to the user for confirmation. Do not build the deck until the user confirms.`;
      },
    }),
  };
}

export const OUTLINE_TOOL_NAME = "propose_outline";
