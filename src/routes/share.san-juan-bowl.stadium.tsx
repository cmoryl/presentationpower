// Public share view (no sign-in, no Element menu): San Juan Bowl stadium in 3D.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/share/san-juan-bowl/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium & aerial concept · Public view" },
      { name: "description", content: "View an illustrated, not-to-scale three-mile area concept and explore Hiram Bithorn Stadium in 3D for the San Juan Bowl." },
      { property: "og:title", content: "San Juan Bowl stadium & aerial concept · Public view" },
      { property: "og:description", content: "Public view of the illustrative stadium-area concept and the Bowl stadium in 3D." },
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
