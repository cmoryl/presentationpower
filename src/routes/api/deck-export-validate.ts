// Server-side validation gate for generated .pptx downloads.
//
// The browser builds the package, then POSTs it here *before* the download is
// enabled. The handler opens the real bytes and confirms slide count, the
// expected slide identities in order, and that every referenced media part
// exists. Nothing in the package is executed — it is only unzipped and read.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MAX_VALIDATE_BYTES, validatePptxBytes } from "@/lib/pptx-validate";

const manifestSchema = z.object({
  slideCount: z.number().int().min(0).max(500),
  minMedia: z.number().int().min(0).max(5000).optional(),
  expectTextRuns: z.boolean().optional(),
  slides: z
    .array(
      z.object({
        slideId: z.string().min(1).max(200),
        variantId: z.string().min(1).max(200),
        probes: z.array(z.string().max(400)).max(8),
      }),
    )
    .max(500),
});

export const Route = createFileRoute("/api/deck-export-validate")({
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
          return Response.json({ error: "File is empty or too large to validate." }, { status: 413 });
        }

        let manifest: z.infer<typeof manifestSchema>;
        try {
          manifest = manifestSchema.parse(JSON.parse(rawManifest));
        } catch {
          return Response.json({ error: "Invalid manifest." }, { status: 400 });
        }

        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const report = await validatePptxBytes(bytes, manifest);
          return Response.json(report);
        } catch (err) {
          console.error("[deck-export-validate] failed:", err);
          return Response.json({ error: "Validation failed to run." }, { status: 500 });
        }
      },
    },
  },
});
