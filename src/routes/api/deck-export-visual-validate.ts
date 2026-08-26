// Server-side VISUAL validation gate for generated .pptx downloads.
//
// The browser rasterizes every slide from the live renderer twice — light and
// dark — and posts those references with the generated package. The handler
// opens the real bytes, pulls each slide's embedded design plate, and compares
// it to the editor render for the appearance the deck asked for. Nothing is
// executed: the package is only unzipped, and the images are decoded in pure
// TypeScript.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  MAX_VISUAL_REFERENCE_BYTES,
  validatePptxVisuals,
  type VisualReferenceSlide,
} from "@/lib/pptx-visual-validate";
import { MAX_VALIDATE_BYTES } from "@/lib/pptx-validate";

const manifestSchema = z.object({
  threshold: z.number().min(0).max(1).optional(),
  slides: z
    .array(
      z.object({
        slideId: z.string().min(1).max(200),
        variantId: z.string().min(1).max(200),
        expectedMode: z.enum(["light", "dark"]),
      }),
    )
    .max(200),
});

async function refBytes(form: FormData, key: string): Promise<Uint8Array | null> {
  const value = form.get(key);
  if (!(value instanceof Blob)) return null;
  if (value.size === 0 || value.size > MAX_VISUAL_REFERENCE_BYTES) return null;
  return new Uint8Array(await value.arrayBuffer());
}

export const Route = createFileRoute("/api/deck-export-visual-validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Expected multipart form data." }, { status: 400 });
        }

        const file = form.get("file");
        const rawManifest = form.get("manifest");
        if (!(file instanceof Blob) || typeof rawManifest !== "string") {
          return Response.json({ error: "Missing file or manifest." }, { status: 400 });
        }
        if (file.size === 0 || file.size > MAX_VALIDATE_BYTES) {
          return Response.json(
            { error: "File is empty or too large to validate." },
            { status: 413 },
          );
        }

        let manifest: z.infer<typeof manifestSchema>;
        try {
          manifest = manifestSchema.parse(JSON.parse(rawManifest));
        } catch {
          return Response.json({ error: "Invalid manifest." }, { status: 400 });
        }

        try {
          const slides: VisualReferenceSlide[] = [];
          for (let i = 0; i < manifest.slides.length; i += 1) {
            const s = manifest.slides[i]!;
            slides.push({
              slideId: s.slideId,
              variantId: s.variantId,
              expectedMode: s.expectedMode,
              light: await refBytes(form, `ref-${i}-light`),
              dark: await refBytes(form, `ref-${i}-dark`),
            });
          }
          const bytes = new Uint8Array(await file.arrayBuffer());
          const report = await validatePptxVisuals(bytes, {
            slides,
            ...(manifest.threshold === undefined ? {} : { threshold: manifest.threshold }),
          });
          return Response.json(report);
        } catch (err) {
          console.error("[deck-export-visual-validate] failed:", err);
          return Response.json({ error: "Visual validation failed to run." }, { status: 500 });
        }
      },
    },
  },
});
