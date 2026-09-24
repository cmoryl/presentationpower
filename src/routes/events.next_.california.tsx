// /events/next/california — partner KIOSKS for the California NEXT event.
//
// The California stand build supplies a TV kiosk instead of a trade-booth wall:
// a 45 × 96 in front face with a monitor keep-clear plus two 4 × 96 in return
// strips. The London walls are 1830 × 2440 mm, so scaling one into the kiosk
// loses about 38 % of its width and cuts the lockup and headline in half. Each
// partner is therefore RE-LAID at kiosk size from its own native template, and
// every face here is editable and downloadable as .svg / .ai / print PDF.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Monitor, Ruler } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CaliforniaKioskBrowser } from "@/components/events/CaliforniaKioskBrowser";
import {
  CALIFORNIA_KIOSK_SCREEN_MM,
  CALIFORNIA_KIOSK_TEMPLATE,
  londonWallCropIntoKiosk,
} from "@/lib/next-california-kiosks";
import { SF_VENUE } from "@/lib/next-sf-event";

export const Route = createFileRoute("/events/next_/california")({
  head: () => ({
    meta: [
      { title: "NEXT California partner kiosks · 45 × 96 in TV kiosk templates" },
      {
        name: "description",
        content:
          "Every TransPerfect NEXT partner booth re-laid on the supplied California TV kiosk template: 45 × 96 in front face with the monitor keep-clear plus both 4 × 96 in returns, editable and exportable.",
      },
      { property: "og:title", content: "NEXT California partner kiosks" },
      {
        property: "og:description",
        content:
          "Partner stands rebuilt at California kiosk size — front face and both return strips, editable copy, live Illustrator and print-PDF downloads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaliforniaKiosksPage,
});

const card = "rounded-md border border-[#03002C]/12 bg-white p-5";
const tag =
  "inline-flex items-center gap-1.5 rounded-sm border border-[#03002C]/15 bg-[#F2F2F2] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/75";

function CaliforniaKiosksPage() {
  const crop = londonWallCropIntoKiosk();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <Link
            to="/events/next"
            className="inline-flex items-center gap-1.5 text-[#03002C]/65 hover:text-[#03002C]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            NEXT events
          </Link>
          <Link
            to="/events/next/san-francisco"
            className="inline-flex items-center gap-1.5 text-[#003FC7] hover:underline"
          >
            San Francisco edition
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <h1 className="mt-4 text-3xl font-semibold text-[#03002C]">
          California partner kiosks
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#03002C]/70">
          Every partner stand re-laid on the supplied kiosk template: a{" "}
          <strong>45 × 96 in front face</strong> with the monitor keep-clear, plus both{" "}
          <strong>4 × 96 in return strips</strong>, at 1/8 in bleed per edge.
        </p>

        <div className={`${card} mt-6`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={tag}>
              <Monitor className="h-3 w-3" aria-hidden />
              TV keep-clear {Math.round(CALIFORNIA_KIOSK_SCREEN_MM.w)} ×{" "}
              {Math.round(CALIFORNIA_KIOSK_SCREEN_MM.h)} mm
            </span>
            <span className={tag}>
              <Ruler className="h-3 w-3" aria-hidden />
              {CALIFORNIA_KIOSK_TEMPLATE.file}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#03002C]/70">
            <strong>Why these are rebuilt, not stretched.</strong> The London walls are
            1830 × 2440 mm. Scaled to fill the kiosk front they lose{" "}
            <strong>{crop.lostWidthPct}% of their width</strong>, which cuts through the lockup and
            the headline on every stand. So each kiosk is built from the partner&rsquo;s own
            template — brand ground, headline, subhead, body, lockup and code laid out from the
            kiosk trim — with the words carried over unchanged. The London masters stay untouched on
            the London kit.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#03002C]/70">
            These kiosks are the partner stands for{" "}
            <Link
              to="/events/next/san-francisco"
              className="font-semibold text-[#003FC7] hover:underline"
            >
              {SF_VENUE.locationLine} · {SF_VENUE.venue}
            </Link>
            . No floor plan, room list or programme has been issued for the venue yet, so nothing on
            these boards states them.
          </p>

        </div>

        <div className="mt-6">
          <CaliforniaKioskBrowser />
        </div>
      </div>
    </AppShell>
  );
}
