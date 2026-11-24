import { createFileRoute } from "@tanstack/react-router";
import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
import { SjbBadgesPage } from "@/components/events/sjb-merch/SjbMerchPages";

export const Route = createFileRoute("/events/san-juan-bowl_/badges")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl attendee badges · TransPerfect Element" },
      { name: "description", content: "The working final TransPerfect San Juan Bowl attendee badge: one double-sided design from Canva, with PNG and JPG downloads." },
      { property: "og:title", content: "San Juan Bowl attendee badge" },
      { property: "og:description", content: "The working final TransPerfect San Juan Bowl attendee badge: one double-sided design from Canva, with PNG and JPG downloads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(SjbBadgesPage),
});
