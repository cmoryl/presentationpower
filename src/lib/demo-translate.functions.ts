import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Ephemeral translation for demo content.
 *
 * Demo surfaces render generated content that is never persisted, so the
 * DB-backed deck translation pipeline (slide_translations / deck_translations)
 * does not apply. This function walks arbitrary content JSON, protects
 * non-translatable values with the shared glossary helpers, runs the configured
 * engine, and returns the translated JSON. Nothing is written to the database.
 *
 * It is intentionally unauthenticated (demos are public marketing surfaces) and
 * hard-capped so it cannot be used as a general-purpose translation endpoint.
 */

const MAX_ITEMS = 40;
const MAX_JSON_CHARS = 240_000;

const Input = z.object({
  /** JSON-encoded content blobs, one per demo slide / page / post. */
  itemsJson: z.array(z.string().max(MAX_JSON_CHARS)).min(1).max(MAX_ITEMS),
  targetLang: z.string().min(2).max(10),
  engine: z.enum(["globallink", "ai"]).optional(),
});

export const translateDemoContent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const { extractStrings, protectStrings, unprotectStrings, applyGlossaryOverrides } =
      await import("@/lib/translation-glossary");
    const { runTranslationBatched, resolveEngine } = await import(
      "@/lib/translation-engine.server"
    );

    const engine = resolveEngine(data.engine);

    // Parse every item first so a malformed blob fails fast and loudly.
    const parsed = data.itemsJson.map((raw) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        throw new Error("Demo content was not valid JSON");
      }
    });

    // One pooled request across all items keeps segment counts (and cost) low.
    const walkers = parsed.map((content) => extractStrings(content));
    const flat: string[] = [];
    const spans: Array<{ start: number; len: number }> = [];
    for (const w of walkers) {
      spans.push({ start: flat.length, len: w.strings.length });
      flat.push(...w.strings);
    }

    if (flat.length === 0) {
      return { itemsJson: data.itemsJson, targetLang: data.targetLang, engine, segments: 0 };
    }

    const protectedSrc = protectStrings(flat, []);
    const { translated } = await runTranslationBatched(engine, {
      strings: protectedSrc,
      targetLang: data.targetLang,
      sourceLang: "en",
      humanReview: false,
    });
    const finalStrings = applyGlossaryOverrides(
      unprotectStrings(translated),
      [],
      data.targetLang,
    );

    const itemsJson = walkers.map((w, i) => {
      const { start, len } = spans[i]!;
      return JSON.stringify(w.replace(finalStrings.slice(start, start + len)) ?? null);
    });

    return { itemsJson, targetLang: data.targetLang, engine, segments: flat.length };
  });
