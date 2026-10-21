// /events/san-juan-bowl/brand-kit/designers — the technical half of the brand
// kit, kept off the front page so most people find the logo and colours fast.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConstructionSection, LargeFormatSection } from "@/components/events/SjbDesignerSections";
import { SJB_EVENT } from "@/lib/san-juan-bowl";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit_/designers")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl logo — for designers · TransPerfect Element" },
      { name: "description", content: "Construction grid, measurements, dissected 3D logo, separated shapes and large-format signage specs for the TransPerfect San Juan Bowl." },
      { property: "og:title", content: "San Juan Bowl logo — for designers" },
      { property: "og:description", content: "Exact construction, measurements and production specs for the San Juan Bowl badge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DesignersPage,
});

function DesignersPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 text-[#03002C]">
        <Link to="/events/san-juan-bowl/brand-kit" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]">
          <ArrowLeft className="h-4 w-4" /> {SJB_EVENT.name} brand kit
        </Link>
        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#666666]">For designers and print vendors</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">Logo construction &amp; production</h1>
          <p className="mt-1 text-[14px] text-[#666666]">The exact build of the badge. For logo files, colours and rules, use the main brand kit.</p>
        </header>
        <ConstructionSection />
        <LargeFormatSection />
      </div>
    </AppShell>
  );
}
