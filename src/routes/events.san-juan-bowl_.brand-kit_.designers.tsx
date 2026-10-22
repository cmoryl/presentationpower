// /events/san-juan-bowl/brand-kit/designers — the technical half of the brand
// kit, kept off the front page so most people find the logo and colours fast.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DesignersPage } from "@/components/events/sjb-pages/DesignersPage";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit_/designers")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl logo — for designers · TransPerfect Element" },
      { name: "description", content: "Construction grid, measurements, dissected 3D logo, separated shapes and large-format signage specs for the TransPerfect San Juan Bowl." },
      { property: "og:title", content: "San Juan Bowl logo — for designers" },
      { property: "og:description", content: "Exact construction, measurements and production specs for the San Juan Bowl badge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // Merged into the main brand kit by request; old links land there.
  beforeLoad: () => { throw redirect({ to: "/events/san-juan-bowl/brand-kit" }); },
  component: DesignersPage,
});
