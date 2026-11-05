// Public share view (no sign-in, no Element menu): San Juan Bowl billboards.
import { createFileRoute } from "@tanstack/react-router";
import { SjbShareProvider } from "@/components/events/SjbShare";
import { BillboardsPage } from "@/components/events/sjb-pages/BillboardsPage";

export const Route = createFileRoute("/share/san-juan-bowl/billboards")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl billboard examples" },
      { name: "description", content: "Review the TransPerfect San Juan Bowl digital billboard direction in English and Spanish, shown in place around San Juan." },
      { property: "og:title", content: "San Juan Bowl billboard examples" },
      { property: "og:description", content: "Digital billboard direction for the TransPerfect San Juan Bowl, with in-scene mockups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <SjbShareProvider>
      <BillboardsPage />
    </SjbShareProvider>
  ),
});
