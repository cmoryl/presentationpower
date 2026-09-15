// TEMPORARY one-off ingest route — delete after the 15 Sept 2026 Dropbox issue
// is loaded. Token-guarded, local-manifest only, never linked from the app.
import { readFileSync } from "node:fs";

import { createFileRoute } from "@tanstack/react-router";

const TOKEN = "ldn-ingest-2026-09-15-4f7a2c91d8e";

type Entry = {
  panelId: string;
  masterAbs: string;
  masterFilename: string;
  printAbs: string | null;
  printFilename: string | null;
  proofAbs: string | null;
  colour: string;
  issued: string;
  note: string;
};

function slug(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export const Route = createFileRoute("/api/public/tmp-london-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-ingest-token") !== TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const entries: Entry[] = JSON.parse(readFileSync("/tmp/dbx/manifest.json", "utf8"));
        const log: string[] = [];

        for (const e of entries) {
          const { data: latest } = await supabaseAdmin
            .from("london_live_files")
            .select("id, version")
            .eq("panel_id", e.panelId)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();
          const version = (latest?.version ?? 0) + 1;
          const dir = `${e.panelId}/v${version}`;

          const put = async (abs: string, name: string, type: string) => {
            const path = `${dir}/${slug(name)}`;
            const { error } = await supabaseAdmin.storage
              .from("london-live-files")
              .upload(path, readFileSync(abs), { contentType: type, upsert: true });
            if (error) throw new Error(`${path}: ${error.message}`);
            return path;
          };

          try {
            const masterPath = await put(
              e.masterAbs,
              e.masterFilename,
              "application/postscript",
            );
            const printPath = e.printAbs
              ? await put(e.printAbs, e.printFilename!, "application/pdf")
              : null;
            const proofPath = e.proofAbs
              ? await put(
                  e.proofAbs,
                  `${e.masterFilename.replace(/\.ai$/i, "")}-proof.jpg`,
                  "image/jpeg",
                )
              : null;

            const { error } = await supabaseAdmin.from("london_live_files").insert({
              panel_id: e.panelId,
              version,
              master_path: masterPath,
              master_filename: e.masterFilename,
              master_content_type: "application/postscript",
              print_path: printPath,
              print_filename: e.printFilename,
              proof_path: proofPath,
              note: e.note,
              issued: e.issued,
            });
            if (error) throw new Error(error.message);
            if (latest?.id) {
              await supabaseAdmin
                .from("london_live_files")
                .update({ is_active: false })
                .eq("id", latest.id);
            }
            log.push(`${e.panelId} v${version} ok (${e.colour})`);
          } catch (err) {
            log.push(`${e.panelId} FAILED: ${(err as Error).message}`);
          }
        }
        return new Response(log.join("\n"), { status: 200 });
      },
    },
  },
});
