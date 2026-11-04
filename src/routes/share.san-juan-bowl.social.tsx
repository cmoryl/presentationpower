// /share/san-juan-bowl/social — the Bowl social template studio on the public
// share link (menu-free frame, works signed out).
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
          "Browse the TransPerfect San Juan Bowl Canva social collection, with design previews by style, ad type and actual artboard size.",
      },
      { property: "og:title", content: "San Juan Bowl social templates" },
      {
        property: "og:description",
        content: "Canva Bowl social design previews by collection and size, with clearly labelled draft revisions.",
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
