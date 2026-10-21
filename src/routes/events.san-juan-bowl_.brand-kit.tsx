// /events/san-juan-bowl/brand-kit — the San Juan Bowl brand kit: supplied
// logo variants with background previews, clear space, minimum sizes,
// approved backgrounds, misuse gallery and badge anatomy, plus the palette,
// type and usage rules, with downloads. Event facts stay "to be confirmed"
// until issued.
import { createFileRoute } from "@tanstack/react-router";
import { SjbBrandKit } from "@/components/events/sjb-pages/BrandKitPage";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl brand kit · TransPerfect Element" },
      {
        name: "description",
        content:
          "The TransPerfect San Juan Bowl brand kit — logo variants, clear space, sizing, approved backgrounds, misuse rules, palette and typography, with downloads.",
      },
      { property: "og:title", content: "San Juan Bowl brand kit" },
      { property: "og:description", content: "Logo, palette, typography and rules for the TransPerfect San Juan Bowl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SjbBrandKit,
});
