// Public share view (no sign-in, no Element menu): San Juan Bowl stadium in 3D.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/share/san-juan-bowl/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl 3D stadium & football field · Public view" },
      { name: "description", content: "Public interactive stadium and football-field concept from the illustrated aerial map and supplied paint artwork, with game-day schedules. Geometry is provisional." },
      { property: "og:title", content: "San Juan Bowl 3D stadium & football field · Public view" },
      { property: "og:description", content: "Explore the source-based stadium in 3D, overhead and field views. Supplied artwork is preserved; geometry is not surveyed or venue-approved." },
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
