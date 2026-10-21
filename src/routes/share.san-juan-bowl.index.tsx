// Public share view (no sign-in, no Element menu): TransPerfect San Juan Bowl brand kit.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { SjbBrandKit } from "@/components/events/sjb-pages/BrandKitPage";

export const Route = createFileRoute("/share/san-juan-bowl/")({
  head: () => ({
    meta: [
      { title: "TransPerfect San Juan Bowl brand kit" },
      { name: "description", content: "Logo files, colours, type, clear space and usage rules for the TransPerfect San Juan Bowl." },
      { property: "og:title", content: "TransPerfect San Juan Bowl brand kit" },
      { property: "og:description", content: "Logo files, colours, type, clear space and usage rules for the TransPerfect San Juan Bowl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SjbShareProvider>
      <SjbBrandKit />
    </SjbShareProvider>
  ),
});
