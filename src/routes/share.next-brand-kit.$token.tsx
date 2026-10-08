import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NextBrandKitView } from "@/components/events/NextBrandKitView";

const TITLE = "TransPerfect NEXT brand kit — partner view";
const DESC = "Shared TransPerfect NEXT event logos, colours, type and print masters for agencies and printers.";

export const Route = createFileRoute("/share/next-brand-kit/$token")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SharedKit,
});

function SharedKit() {
  const { token } = Route.useParams();
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    supabase
      .rpc("get_next_brand_kit_share", { _token: token })
      .then(({ data, error }) => setStatus(error ? "invalid" : ((data as { status?: string })?.status ?? "invalid")));
  }, [token]);

  if (status === null) return <p className="p-10 text-sm text-muted-foreground">Checking link…</p>;
  if (status !== "valid")
    return (
      <main className="mx-auto max-w-lg p-10">
        <h1 className="text-xl font-semibold">This link isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === "expired" ? "It has expired." : status === "revoked" ? "It was switched off." : "It isn't a valid link."} Ask your TransPerfect contact for a new one.
        </p>
      </main>
    );
  return (
    <main>
      <NextBrandKitView shared />
    </main>
  );
}
