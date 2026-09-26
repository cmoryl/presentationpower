import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Receipt } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MartPriceListStudio } from "@/components/next/MartPriceListStudio";
import { MART_PRICE_SHEET, MART_PRICE_LIST_SOURCE } from "@/lib/next-mart-price-list";
import { NEXT_MART } from "@/lib/next-mart";

export const Route = createFileRoute("/events/next_/mart_/price-list")({
  head: () => ({
    meta: [
      { title: "NEXT MART price list signage · TransPerfect Element" },
      {
        name: "description",
        content:
          "The NEXT MART price list sheet as a live A4 template: per-city currency, typed local prices, approved NEXT ground, and editable SVG, press PDF, Illustrator, PowerPoint and Word outputs.",
      },
      { property: "og:title", content: "NEXT MART price list signage" },
      {
        property: "og:description",
        content:
          "Rebuilt natively from the issued NEXT MART price list master: editable categories, items and prices per event city, with printer-ready A4 outputs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MartPriceListPage,
});

function MartPriceListPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next/mart"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> {NEXT_MART.name} signage kit
        </Link>

        <div className="mt-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-[#003FC7]">
            <Receipt size={12} /> Price list
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">
            NEXT MART price list
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/65">
            The issued price-list sheet, rebuilt natively as a template every NEXT city can reuse:
            {" "}
            {MART_PRICE_SHEET.trimW} × {MART_PRICE_SHEET.trimH} mm with {MART_PRICE_SHEET.bleed} mm
            bleed, the approved NEXT ground and lockup, and its own currency and typed prices per
            stop. Prices are never converted between currencies — every figure is one somebody typed
            for that city.
          </p>
          <p className="mt-2 text-xs text-black/50">{MART_PRICE_LIST_SOURCE.note}</p>
        </div>

        <div className="mt-8">
          <MartPriceListStudio />
        </div>
      </div>
    </AppShell>
  );
}
