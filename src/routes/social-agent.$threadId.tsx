// Social agent workspace — conversation + live link to the social kit.
import { createFileRoute } from "@tanstack/react-router";
import { KitAgentWorkspace } from "@/components/kit-agent/KitAgentWorkspace";

export const Route = createFileRoute("/social-agent/$threadId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Social agent · TransPerfect Element" },
      {
        name: "description",
        content:
          "Build platform-sized social kits — feed, story, reel, LinkedIn and banner formats — with the Element social agent.",
      },
      { property: "og:title", content: "Social agent · TransPerfect Element" },
      {
        property: "og:description",
        content: "Build brand-compliant social kits end to end in one conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SocialAgentThreadPage,
});

function SocialAgentThreadPage() {
  const { threadId } = Route.useParams();
  return <KitAgentWorkspace surface="social" threadId={threadId} />;
}
