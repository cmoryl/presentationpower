import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// /events/san-juan-bowl/stadium — the BoothHUB interactive stadium, embedded.
// BoothHUB owns the model; Element only frames its public showcase page.
import { createFileRoute } from "@tanstack/react-router";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/events/san-juan-bowl_/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium & aerial concept · TransPerfect Element" },
      { name: "description", content: "Illustrated three-mile stadium-area concept and BoothHUB's 3D view of Hiram Bithorn Stadium for the San Juan Bowl. The illustration is not to scale." },
      { property: "og:title", content: "San Juan Bowl stadium & aerial concept" },
      { property: "og:description", content: "View the illustrative three-mile area concept and explore the stadium in 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(StadiumPage),
});
