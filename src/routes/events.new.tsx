// /events/new — public blank-kit wizard tuned for event playbooks.
//
// Same wizard as /social/new but pre-seeds the event kit profile and defaults
// the "attach event facts" toggle on. Renders outside admin so the flow
// remains in the main app shell. Accepts ?kit=<uuid> to reopen a saved kit.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { KitWizard } from "@/components/campaigns/KitWizard";

const SearchSchema = z.object({ kit: z.string().uuid().optional() });

export const Route = createFileRoute("/events/new")({
  validateSearch: (raw) => SearchSchema.parse(raw ?? {}),
  head: () => ({
    meta: [
      { title: "New event kit · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Five-step blank kit builder for events — brand, content, formats, event facts, review.",
      },
      { property: "og:title", content: "New event kit · TransPerfect Modular" },
      {
        property: "og:description",
        content: "Build a division-branded event kit from scratch in five guided steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsNewPage,
});

function EventsNewPage() {
  const { kit } = Route.useSearch();
  return (
    <AppShell>
      <KitWizard
        surface="event"
        defaultProfileId="event-kit"
        backHref="/events"
        backLabel="Back to events"
        finishHref="/events"
        kitId={kit}
      />
    </AppShell>
  );
}
