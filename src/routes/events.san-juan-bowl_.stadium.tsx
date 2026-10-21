// /events/san-juan-bowl/stadium — the BoothHUB interactive stadium, embedded.
// BoothHUB owns the model; Element only frames its public showcase page.
import { createFileRoute } from "@tanstack/react-router";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/events/san-juan-bowl_/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium 3D view · TransPerfect Element" },
      { name: "description", content: "Interactive 3D view of Hiram Bithorn Stadium in San Juan for the TransPerfect San Juan Bowl, from BoothHUB." },
      { property: "og:title", content: "San Juan Bowl stadium 3D view" },
      { property: "og:description", content: "Explore the San Juan Bowl stadium and field in 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StadiumPage,
});
