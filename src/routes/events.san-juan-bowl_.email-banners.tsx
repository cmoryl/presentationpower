import { createFileRoute } from "@tanstack/react-router";
import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
import { EmailBannersPage } from "@/components/events/sjb-pages/EmailBannersPage";

export const Route = createFileRoute("/events/san-juan-bowl_/email-banners")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl email banners · TransPerfect Element" },
      { name: "description", content: "Six approved San Juan Bowl email banners live in Canva: three artwork looks in English and Spanish, 800 × 350 px, with PNG downloads." },
      { property: "og:title", content: "San Juan Bowl email banners" },
      { property: "og:description", content: "Six approved San Juan Bowl email banners live in Canva: three artwork looks in English and Spanish, 800 × 350 px, with PNG downloads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(EmailBannersPage),
});
