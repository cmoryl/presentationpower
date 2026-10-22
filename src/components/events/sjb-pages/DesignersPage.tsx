// /events/san-juan-bowl/brand-kit/designers — the technical half of the brand
// kit, kept off the front page so most people find the logo and colours fast.
import { ArrowLeft } from "lucide-react";
import { SjbLink, SjbShell } from "@/components/events/SjbShare";
import { ConstructionSection, LargeFormatSection } from "@/components/events/SjbDesignerSections";
import { SjbGuideSections } from "@/components/events/SjbGuideSections";
import { SjbBrandKitBody } from "@/components/events/sjb-pages/BrandKitPage";
import { SJB_EVENT } from "@/lib/san-juan-bowl";


export function DesignersPage() {
  return (
    <SjbShell>
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 text-[#03002C]">
        <SjbLink page="kit" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]">
          <ArrowLeft className="h-4 w-4" /> {SJB_EVENT.name} brand kit
        </SjbLink>
        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#666666]">For designers and print vendors</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">Brand guide, construction &amp; production</h1>
          <p className="mt-1 text-[14px] text-[#666666]">{SJB_EVENT.venue}, {SJB_EVENT.city}. The full brand guide and every brand-kit section, then the exact build of the badge and production specs.</p>
        </header>
        <SjbGuideSections withSingleColour={false} />
        <SjbBrandKitBody embedded />
        <ConstructionSection />
        <LargeFormatSection />
      </div>
    </SjbShell>
  );
}
