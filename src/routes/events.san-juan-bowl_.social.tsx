// /events/san-juan-bowl/social — live social media template studio for the
// Bowl: on-brand designs in every channel size, editable copy, PNG downloads.
import { createFileRoute } from "@tanstack/react-router";
import { SjbSocialStudio } from "@/components/events/sjb-pages/SocialStudioPage";

export const Route = createFileRoute("/events/san-juan-bowl_/social")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl social templates · TransPerfect Element" },
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
  component: SjbSocialStudio,
});
