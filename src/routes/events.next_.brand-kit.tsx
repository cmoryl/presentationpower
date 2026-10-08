import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NextBrandKitView } from "@/components/events/NextBrandKitView";
import { BrandKitShares } from "@/components/events/BrandKitShares";

const TITLE = "Master NEXT event brand kit — TransPerfect Element";
const DESC = "Logos, division colours, type, sign templates and digital formats every TransPerfect NEXT city starts from.";

export const Route = createFileRoute("/events/next_/brand-kit")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandKitPage,
});

function BrandKitPage() {
  return (
    <AppShell>
      <NextBrandKitView />
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <BrandKitShares />
      </div>
    </AppShell>
  );
}
