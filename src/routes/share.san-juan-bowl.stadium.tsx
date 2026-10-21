// Public share view (no sign-in, no Element menu): San Juan Bowl stadium in 3D.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { StadiumPage } from "@/components/events/sjb-pages/StadiumPage";

export const Route = createFileRoute("/share/san-juan-bowl/stadium")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl stadium in 3D" },
      { name: "description", content: "Explore Hiram Bithorn Stadium, San Juan, in 3D for the TransPerfect San Juan Bowl." },
      ...
      { property: "og:description", content: "Explore Hiram Bithorn Stadium, San Juan, in 3D for the TransPerfect San Juan Bowl." },
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
