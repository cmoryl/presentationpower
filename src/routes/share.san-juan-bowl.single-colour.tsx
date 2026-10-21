// Public share view (no sign-in, no Element menu): San Juan Bowl single-colour logo usage.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { SingleColourPage } from "@/components/events/sjb-pages/SingleColourPage";

export const Route = createFileRoute("/share/san-juan-bowl/single-colour")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl single-colour logo usage" },
      { name: "description", content: "Embroidery, foil, etching and one-ink print guidance for the San Juan Bowl logo." },
      { property: "og:title", content: "San Juan Bowl single-colour logo usage" },
      { property: "og:description", content: "Embroidery, foil, etching and one-ink print guidance for the San Juan Bowl logo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SjbShareProvider>
      <SingleColourPage />
    </SjbShareProvider>
  ),
});
