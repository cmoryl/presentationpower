// Bridge the app's MCP tool definitions into AI SDK tools so the in-app
// PowerPoint agent runs exactly the same authoring surface as external MCP
// clients (no duplicated deck logic).
import { z } from "zod";
import { dynamicTool, jsonSchema, type ToolSet } from "ai";
import type { ToolContext } from "@lovable.dev/mcp-js";

import listDecks from "@/lib/mcp/tools/list-decks";
import getDeck from "@/lib/mcp/tools/get-deck";
import getTaxonomy from "@/lib/mcp/tools/get-taxonomy";
import listVariants from "@/lib/mcp/tools/list-variants";
import listSectionVariants from "@/lib/mcp/tools/list-section-variants";
import createDeck from "@/lib/mcp/tools/create-deck";
import generateDeck from "@/lib/mcp/tools/generate-deck";
import insertSlide from "@/lib/mcp/tools/insert-slide";
import deleteSlide from "@/lib/mcp/tools/delete-slide";
import reorderSlides from "@/lib/mcp/tools/reorder-slides";
import updateSlideContent from "@/lib/mcp/tools/update-slide-content";
import updateSlideNotes from "@/lib/mcp/tools/update-slide-notes";
import changeSlideVariant from "@/lib/mcp/tools/change-slide-variant";
import setSlideIcon from "@/lib/mcp/tools/set-slide-icon";
import searchIcons from "@/lib/mcp/tools/search-icons";
import searchKnowledge from "@/lib/mcp/tools/search-knowledge";
import createShareLink from "@/lib/mcp/tools/create-share-link";

type AnyToolDef = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  handler: (input: never, ctx: ToolContext) => unknown;
};

const AGENT_TOOLS: AnyToolDef[] = [
  listDecks,
  getDeck,
  getTaxonomy,
  listVariants,
  listSectionVariants,
  createDeck,
  generateDeck,
  insertSlide,
  deleteSlide,
  reorderSlides,
  updateSlideContent,
  updateSlideNotes,
  changeSlideVariant,
  setSlideIcon,
  searchIcons,
  searchKnowledge,
  createShareLink,
] as unknown as AnyToolDef[];

/** Duck-typed ToolContext backed by the caller's Supabase bearer token. */
export function toolContextForToken(token: string, userId: string): ToolContext {
  return {
    isAuthenticated: () => Boolean(token),
    getToken: () => token,
    getUserId: () => userId,
    getUserEmail: () => null,
    getClientId: () => "in-app-agent",
    getClaims: () => ({ sub: userId }),
  } as unknown as ToolContext;
}

function flattenResult(result: unknown): string {
  const r = result as { content?: Array<{ type: string; text?: string }>; isError?: boolean };
  const text = (r?.content ?? [])
    .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
    .join("\n")
    .trim();
  if (r?.isError) return `ERROR: ${text || "tool failed"}`;
  return text || "ok";
}

/** Every deck-authoring MCP tool, as an AI SDK ToolSet for the given user. */
export function buildAgentToolSet(ctx: ToolContext): ToolSet {
  const tools: ToolSet = {};
  for (const def of AGENT_TOOLS) {
    const shape = (def.inputSchema ?? {}) as z.ZodRawShape;
    // The gateway rejects oversized/constrained schemas, so strip bounds by
    // going through a plain JSON schema rather than re-deriving the zod object.
    const schema = z.object(shape);
    const json = z.toJSONSchema(schema, { io: "input", target: "draft-7" }) as Record<
      string,
      unknown
    >;
    tools[def.name] = dynamicTool({
      description: def.description ?? def.name,
      inputSchema: jsonSchema(json),
      execute: async (input) => {
        try {
          const parsed = schema.parse(input ?? {});
          return flattenResult(await def.handler(parsed as never, ctx));
        } catch (err) {
          return `ERROR: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });
  }
  return tools;
}

export const AGENT_TOOL_NAMES = AGENT_TOOLS.map((t) => t.name);
