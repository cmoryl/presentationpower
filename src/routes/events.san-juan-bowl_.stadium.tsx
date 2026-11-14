import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// /events/san-juan-bowl/stadium — the BoothHUB interactive stadium, embedded.
// BoothHUB owns the model; Element only frames its public showcase page.
import { createFileRoute } from "@tanstack/react-router";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/events/san-juan-bowl_/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium & aerial concept · TransPerfect Element" },
      { name: "description", content: "Explore Bowl stadium concepts, game-day and fan timelines, and Feed, Story and Flyer schedule demos with announced kickoff and other times marked TBC." },
      { property: "og:title", content: "San Juan Bowl stadium & aerial concept" },
      { property: "og:description", content: "Stadium and pre-game concepts with game-day schedule artwork and fan timelines. Draft timings and proposed areas remain clearly labelled." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(StadiumPage),
});
