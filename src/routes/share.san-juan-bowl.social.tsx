// /share/san-juan-bowl/social — the Bowl social template studio on the public
// share link (menu-free frame, works signed out).
import { createFileRoute } from "@tanstack/react-router";
import { SjbSocialStudio } from "@/components/events/sjb-pages/SocialStudioPage";
import { SjbShareProvider } from "@/components/events/SjbShare";

export const Route = createFileRoute("/share/san-juan-bowl/social")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl social templates" },
      {
        name: "description",
        content:
          "Live social media templates for the TransPerfect San Juan Bowl — pick a design, edit the words, download PNGs at exact native sizes for every channel.",
      },
      { property: "og:title", content: "San Juan Bowl social templates" },
      {
        property: "og:description",
        content: "On-brand Bowl social designs, editable and downloadable at native sizes for every channel.",
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
