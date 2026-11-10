import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// Bowl Canva collection gallery; artwork remains editable in Canva.
import { createFileRoute } from "@tanstack/react-router";
import { SjbSocialStudio } from "@/components/events/sjb-pages/SocialStudioPage";

export const Route = createFileRoute("/events/san-juan-bowl_/social")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl social designs · TransPerfect Element" },
      {
        name: "description",
        content:
          "Browse the TransPerfect San Juan Bowl Canva social collection, with design previews by style, ad type and actual artboard size.",
      },
      { property: "og:title", content: "San Juan Bowl social designs · TransPerfect Element" },
      {
        property: "og:description",
        content: "Canva Bowl social design previews by collection and size, with clearly labelled draft revisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: withSjbTrail(SjbSocialStudio),
});
