import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/design-system/element";
import { getCanvaStatus, startCanvaConnect } from "@/lib/canva.functions";

export const Route = createFileRoute("/admin/canva")({
  validateSearch: z.object({ canva: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Canva connection · Admin · TransPerfect Element" },
      { name: "description", content: "Connect the shared TransPerfect Canva account that decks are sent to." },
      { property: "og:title", content: "Canva connection · Admin · TransPerfect Element" },
      { property: "og:description", content: "Shared team Canva account for Send to Canva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CanvaAdmin,
});

function CanvaAdmin() {
  const { canva } = Route.useSearch();
  const statusFn = useServerFn(getCanvaStatus);
  const startFn = useServerFn(startCanvaConnect);
  const status = useQuery({ queryKey: ["canva-status"], queryFn: () => statusFn() });
  const [err, setErr] = useState<string | null>(null);
  const s = status.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Canva connection</h1>
      <p className="text-sm text-muted-foreground">
        Decks sent from the export page land in one shared TransPerfect Canva account as editable designs.
      </p>
      {canva && (
        <p role="status" className="rounded-md border p-3 text-sm">
          {canva === "connected" ? "Shared Canva account connected." : canva}
        </p>
      )}
      {status.isLoading ? (
        <p className="text-sm">Checking…</p>
      ) : !s?.configured ? (
        <p className="text-sm">Canva app ID and secret haven't been added yet.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            {s.connected
              ? `Connected · last refreshed ${new Date(s.updatedAt!).toLocaleString()}`
              : "Not connected yet."}
          </p>
          <Button
            onClick={async () => {
              setErr(null);
              try {
                const { url } = await startFn({ data: { origin: window.location.origin } });
                window.location.href = url;
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          >
            {s.connected ? "Reconnect shared Canva" : "Connect shared Canva"}
          </Button>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}
    </div>
  );
}
