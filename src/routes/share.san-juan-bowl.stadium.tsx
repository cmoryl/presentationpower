// Public share view (no sign-in, no Element menu): San Juan Bowl stadium in 3D.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/share/san-juan-bowl/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium & aerial concept · Public view" },
      { name: "description", content: "Public Bowl stadium concepts, game-day and fan timelines, plus Feed, Story and Flyer schedule demos with announced kickoff and unconfirmed times marked TBC." },
      { property: "og:title", content: "San Juan Bowl stadium & aerial concept · Public view" },
      { property: "og:description", content: "Explore stadium concepts and draft game-day schedule artwork. Unconfirmed times are TBC; proposed locations require venue approval." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SjbShareProvider>
      <StadiumPage />
    </SjbShareProvider>
  ),
});
