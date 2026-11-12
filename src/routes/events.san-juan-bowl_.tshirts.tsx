import { createFileRoute } from "@tanstack/react-router";
import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
import { SjbShirtsPage } from "@/components/events/sjb-merch/SjbMerchPages";

export const Route = createFileRoute("/events/san-juan-bowl_/tshirts")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl marketing T-shirts · TransPerfect Element" },
      { name: "description", content: "Front and back T-shirt comps for staff, volunteers, fans, VIP and media at the TransPerfect San Juan Bowl." },
      { property: "og:title", content: "San Juan Bowl marketing T-shirts" },
      { property: "og:description", content: "Front and back T-shirt comps for staff, volunteers, fans, VIP and media at the TransPerfect San Juan Bowl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(SjbShirtsPage),
});
