// /events/san-juan-bowl/brand-kit/lettering — construction spec for the exact
// SAN JUAN BOWL lettering master: horizon lines, proportions, stroke and shadow
// geometry, per-letter dimensions and anchor coordinates, sizes and verification.
import { createFileRoute } from "@tanstack/react-router";
import { LetteringSpecPage } from "@/components/events/sjb-pages/LetteringSpecPage";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit_/lettering")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl lettering specification · TransPerfect Element" },
      { name: "description", content: "Exact construction spec for the SAN JUAN BOWL lettering: horizon lines, proportions, strokes, shadow, per-letter dimensions, coordinates and minimum sizes." },
      { property: "og:title", content: "San Juan Bowl lettering specification" },
      { property: "og:description", content: "Horizon lines, proportions, stroke and shadow geometry, letter dimensions and minimum sizes for the SAN JUAN BOWL lettering." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LetteringSpecPage,
});
