// /social/new — public blank-kit wizard.
//
// Lives outside /admin so the "Start from a blank kit" flow from /social
// stays in the main app shell. Accepts ?kit=<uuid> to reopen a saved kit.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { KitWizard } from "@/components/campaigns/KitWizard";

const SearchSchema = z.object({ kit: z.string().uuid().optional() });

export const Route = createFileRoute("/social/new")({
  validateSearch: (raw) => SearchSchema.parse(raw ?? {}),
  head: () => ({
    meta: [
      { title: "New social kit · TransPerfect Element" },
      {
        name: "description",
        content:
          "Five-step blank kit builder — brand, content, formats, event context, review. Deterministic assets ship as you go.",
      },
      { property: "og:title", content: "New social kit · TransPerfect Element" },
      {
        property: "og:description",
        content: "Build a division-branded social kit from scratch in five guided steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SocialNewPage,
});

function SocialNewPage() {
  const { kit } = Route.useSearch();
  return (
    <AppShell>
      <KitWizard
        surface="social"
        defaultProfileId="social-essentials"
        backHref="/social"
        backLabel="Back to social"
        finishHref="/social"
        kitId={kit}
      />
    </AppShell>
  );
}
