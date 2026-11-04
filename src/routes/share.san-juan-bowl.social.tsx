// Public Bowl Canva collection gallery in the menu-free share frame.
import { createFileRoute } from "@tanstack/react-router";
import { SjbSocialStudio } from "@/components/events/sjb-pages/SocialStudioPage";
import { SjbShareProvider } from "@/components/events/SjbShare";

export const Route = createFileRoute("/share/san-juan-bowl/social")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl shared social collection · TransPerfect Element" },
      {
        name: "description",
        content:
          "Explore the shared San Juan Bowl social collection: Canva artwork previews across styles and sizes, with draft status clearly identified.",
      },
      { property: "og:title", content: "San Juan Bowl shared social collection · TransPerfect Element" },
      {
        property: "og:description",
        content: "Shared Bowl social artwork across the Canva collections, with size-specific previews and clearly identified draft revisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SjbShareProvider>
      <SjbSocialStudio />
    </SjbShareProvider>
  ),
});
