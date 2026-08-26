// Typed RPC surface for the AI data-visualisation pass. Thin wrapper only —
// all runtime logic lives in ./viz-ai.server.ts and the schemas in
// ./viz-ai.schema.ts, so this module stays safe for the client graph.

import { createServerFn } from "@tanstack/react-start";
import { critiqueVizInput, interpretVizInput } from "@/lib/viz-ai.schema";
import type { InterpretVizResult, VizCritique } from "@/lib/viz-ai.schema";

export const interpretVizData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => interpretVizInput.parse(data))
  .handler(async ({ data }): Promise<InterpretVizResult> => {
    const { interpretVizDataOnServer } = await import("@/lib/viz-ai.server");
    return interpretVizDataOnServer(data);
  });

export const critiqueVizSpec = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => critiqueVizInput.parse(data))
  .handler(async ({ data }): Promise<VizCritique> => {
    const { critiqueVizSpecOnServer } = await import("@/lib/viz-ai.server");
    return critiqueVizSpecOnServer(data);
  });
