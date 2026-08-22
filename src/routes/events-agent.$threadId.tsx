// Events agent workspace — conversation + live link to the event kit.
import { createFileRoute } from "@tanstack/react-router";
import { KitAgentWorkspace } from "@/components/kit-agent/KitAgentWorkspace";

export const Route = createFileRoute("/events-agent/$threadId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Events agent · TransPerfect Element" },
      {
        name: "description",
        content:
          "Build event kits — booth graphics, signage, screens, badges and event social — with the Element events agent.",
      },
      { property: "og:title", content: "Events agent · TransPerfect Element" },
      {
        property: "og:description",
        content: "Build brand-compliant event kits end to end in one conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsAgentThreadPage,
});

function EventsAgentThreadPage() {
  const { threadId } = Route.useParams();
  return <KitAgentWorkspace surface="event" threadId={threadId} />;
}
