import { createFileRoute } from "@tanstack/react-router";
import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
import { SjbBadgesPage } from "@/components/events/sjb-merch/SjbMerchPages";

export const Route = createFileRoute("/events/san-juan-bowl_/badges")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl attendee badges · TransPerfect Element" },
      { name: "description", content: "Front and back badge comps for Guest, VIP, Media and Staff at the TransPerfect San Juan Bowl." },
      { property: "og:title", content: "San Juan Bowl attendee badges" },
      { property: "og:description", content: "Front and back badge comps for Guest, VIP, Media and Staff at the TransPerfect San Juan Bowl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(SjbBadgesPage),
});
