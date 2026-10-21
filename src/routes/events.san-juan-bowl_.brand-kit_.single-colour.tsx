// /events/san-juan-bowl/brand-kit/single-colour — one-colour usage by process
// (embroidery, foil, etching, one-ink print) with event-colour ink choices.
// Sizes are recommended starting points; the vendor's proof decides.
import { createFileRoute } from "@tanstack/react-router";
import { SingleColourPage } from "@/components/events/sjb-pages/SingleColourPage";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit_/single-colour")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl single-colour logo usage · TransPerfect Element" },
      { name: "description", content: "How to use the San Juan Bowl one-colour logo for embroidery, foil, etching and one-ink print, with sizes and event-colour inks." },
      { property: "og:title", content: "San Juan Bowl single-colour usage" },
      { property: "og:description", content: "Embroidery, foil, etching and one-ink print sizes and inks for the San Juan Bowl logo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SingleColourPage,
});
