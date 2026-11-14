import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// /events/san-juan-bowl/stadium — the BoothHUB interactive stadium, embedded.
// BoothHUB owns the model; Element only frames its public showcase page.
import { createFileRoute } from "@tanstack/react-router";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/events/san-juan-bowl_/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium & aerial concept · TransPerfect Element" },
      { name: "description", content: "Explore proposed outdoor pre-game areas, stage, vendors and lounge, the illustrative three-mile area concept and Hiram Bithorn Stadium in 3D. Concepts require venue approval." },
      { property: "og:title", content: "San Juan Bowl stadium & aerial concept" },
      { property: "og:description", content: "Proposed pre-game plaza, stage, vendors and outdoor lounge, with illustrative area overview and stadium in 3D. Not an approved site plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(StadiumPage),
});
