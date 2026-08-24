import { createFileRoute } from "@tanstack/react-router";
import { RoleMarketingPage } from "@/components/marketing/RoleMarketingPage";
import { ROLE_MARKETING } from "@/lib/role-marketing";

const copy = ROLE_MARKETING.admin;

export const Route = createFileRoute("/for/admin")({
  head: () => ({
    meta: [
      { title: copy.seoTitle },
      { name: "description", content: copy.seoDescription },
      { property: "og:title", content: copy.seoTitle },
      { property: "og:description", content: copy.seoDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RoleMarketingPage role="admin" />,
});
