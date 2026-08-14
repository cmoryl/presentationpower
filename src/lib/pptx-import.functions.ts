import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ParsedDeck } from "./pptx-import";

const InputSchema = z.object({
  filename: z.string().min(1).max(300),
  data: z.string().min(1).max(140_000_000),
});

export const importPowerpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => InputSchema.parse(v))
  .handler(async ({ data }): Promise<ParsedDeck> => {
    const { parsePptxBuffer } = await import("./pptx-import");
    try {
      const buf = Buffer.from(data.data, "base64");
      return await parsePptxBuffer(buf, data.filename);
    } catch (e) {
      const msg = (e as Error)?.message ?? "Unknown error";
      console.error("[pptx-import] parse failed:", msg);
      throw new Error(
        /Not a PowerPoint|not a PowerPoint|too large|too many entries|zip bomb|empty or invalid|diagram recovery|97–2003|safety checks|unsafe|outside the package/i.test(
          msg,
        )
          ? msg
          : "This PowerPoint file could not be parsed. It may be corrupted or use an unsupported format.",
      );
    }
  });
