// Public share view (no sign-in, no Element menu): San Juan Bowl logo construction — for designers.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { DesignersPage } from "@/components/events/sjb-pages/DesignersPage";

export const Route = createFileRoute("/share/san-juan-bowl/designers")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl logo construction — for designers" },
      { name: "description", content: "Exact construction grid, measurements and large-format specs for the San Juan Bowl badge." },
      { property: "og:title", content: "San Juan Bowl logo construction — for designers" },
      { property: "og:description", content: "Exact construction grid, measurements and large-format specs for the San Juan Bowl badge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SjbShareProvider>
      <DesignersPage />
    </SjbShareProvider>
  ),
});
