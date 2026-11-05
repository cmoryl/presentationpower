import { createFileRoute } from "@tanstack/react-router";
import { BillboardsPage } from "@/components/events/sjb-pages/BillboardsPage";

export const Route = createFileRoute("/events/san-juan-bowl_/billboards")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl digital billboards · TransPerfect Element" },
      { name: "description", content: "High-impact English and Spanish digital billboards for the TransPerfect San Juan Bowl, with in-scene mockups and design research." },
      { property: "og:title", content: "San Juan Bowl digital billboards" },
      { property: "og:description", content: "Bright, 7-word digital billboards directing fans to SANJUANBOWL.COM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillboardsPage,
});
