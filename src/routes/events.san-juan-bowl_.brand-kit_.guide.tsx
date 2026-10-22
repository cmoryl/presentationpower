// /events/san-juan-bowl/brand-kit/guide — San Juan Bowl brand guide page in the
// NeXus guide layout. Every value comes from src/lib/san-juan-bowl.ts: Geist is
// the Bowl's face (not Poppins) and no Pantone is approved, so none is invented.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SJB_COLORS, SJB_EVENT, SJB_LOGOS } from "@/lib/san-juan-bowl";
import masterKit from "@/assets/sjb/master-logo-kit.zip.asset.json";
import { SjbGuideSections } from "@/components/events/SjbGuideSections";

const TITLE = "San Juan Bowl brand guide — TransPerfect Element";
const DESC = "San Juan Bowl badge, variants, clear space, colours with CMYK/RGB/HEX, Geist typography and logo don’ts.";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit_/guide")({
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
  component: SjbGuide,
});

const NAVY = SJB_COLORS[0].hex;
const dark = SJB_LOGOS[1];

function SjbGuide() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/events/san-juan-bowl/brand-kit" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> {SJB_EVENT.name} brand kit
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-lg p-8" style={{ background: NAVY }}>
        <div className="flex items-center gap-6">
          <img src={dark.svg} alt="San Juan Bowl logo" className="h-28 w-auto" />
          <h1 className="text-3xl font-bold leading-tight text-white">Brand guidelines</h1>
        </div>
        <Button asChild variant="secondary">
          <a href="/__l5e/assets-v1/02f9dc41-f898-44a0-9989-b01438b295e6/san-juan-bowl-brand-guide-v1.0.pdf" download><Download className="h-4 w-4" /> Full brand guide v1.0 (PDF)</a>
        </Button>
        <Button asChild variant="secondary">
          <a href={masterKit.url} download="SJB-Master-Logo-Kit-v1.0.zip"><Download className="h-4 w-4" /> Master logo kit v1.0 (ZIP)</a>
        </Button>
      </header>

      <SjbGuideSections />
    </main>
  );
}

