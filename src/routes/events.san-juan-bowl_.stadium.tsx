import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// Source-based interactive stadium concept; separate BoothHUB model retained.
import { createFileRoute } from "@tanstack/react-router";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/events/san-juan-bowl_/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl interactive stadium & football concept · TransPerfect Element" },
      { name: "description", content: "Explore a source-based 3D Hiram Bithorn stadium and football field using supplied artwork, plus aerial concepts and game-day schedules. Geometry remains illustrative." },
      { property: "og:title", content: "San Juan Bowl interactive stadium & football concept" },
      { property: "og:description", content: "Interactive stadium, overhead, field and precinct views with unchanged supplied field artwork. Not a surveyed or approved conversion plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(StadiumPage),
});
