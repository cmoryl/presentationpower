// Public share view (no sign-in, no Element menu): San Juan Bowl stadium in 3D.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/share/san-juan-bowl/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium & aerial concept · Public view" },
      { name: "description", content: "Public view of proposed Bowl pre-game plaza, stage, vendors and outdoor lounge, illustrative three-mile overview and Hiram Bithorn Stadium in 3D. Venue approval required." },
      { property: "og:title", content: "San Juan Bowl stadium & aerial concept · Public view" },
      { property: "og:description", content: "Explore the illustrative pre-game precinct and stadium-area concepts. Proposed locations are not a confirmed event or site plan." },
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
