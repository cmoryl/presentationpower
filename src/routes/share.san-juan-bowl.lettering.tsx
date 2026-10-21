// Public share view (no sign-in, no Element menu): SAN JUAN BOWL lettering specification.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { LetteringSpecPage } from "@/components/events/sjb-pages/LetteringSpecPage";

export const Route = createFileRoute("/share/san-juan-bowl/lettering")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl lettering specification" },
      { name: "description", content: "Exact construction spec for the SAN JUAN BOWL lettering: proportions, strokes, shadow, letter dimensions and minimum sizes." },
      { property: "og:title", content: "San Juan Bowl lettering specification" },
      { property: "og:description", content: "Exact construction spec for the SAN JUAN BOWL lettering." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SjbShareProvider>
      <LetteringSpecPage />
    </SjbShareProvider>
  ),
});
