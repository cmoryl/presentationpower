import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { textResult } from "../supabase";
import { ICON_LIBRARY } from "@/lib/icon-library";

export default defineTool({
  name: "search_icons",
  title: "Search icon library",
  description:
    "Fuzzy-search the curated brand icon library. Returns icon names usable with set_slide_icon.",
  inputSchema: {
    query: z.string().describe("What the icon should depict, e.g. 'security' or 'growth'."),
    limit: z.number().int().min(1).max(25).describe("Max matches to return (default 10).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, limit }) => {
    const q = query.trim().toLowerCase();
    if (!q) return textResult({ results: [] });
    const results = ICON_LIBRARY.filter(
      (i) => i.name.toLowerCase().includes(q) || i.label.toLowerCase().includes(q),
    )
      .slice(0, limit ?? 10)
      .map((i) => ({ name: i.name, label: i.label, group: i.group }));
    return textResult({ results });
  },
});
