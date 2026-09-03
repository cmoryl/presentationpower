// NEXT MART — a single city stop, cloned from the London reference kit.

import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, MapPin, Ruler } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MartBundleExport } from "@/components/next/MartBundleExport";
import { PillarSign } from "@/components/next/PillarSign";
import { martArtwork, martFlatArtworkId } from "@/lib/next-mart-placement";
import {
  LONDON_STOP,
  martStopById,
  martStopEventLabel,
  martStopFlatMasters,
  martStopPanels,
  martStopPillarConfig,
  martStopPillars,
} from "@/lib/next-mart-stops";

export const Route = createFileRoute("/events/next_/mart_/$stopId")({
  head: ({ params }) => {
    const stop = martStopById(params.stopId) ?? LONDON_STOP;
    const title = `NEXT MART ${stop.city} · signage kit`;
    const description = `Merch shop signage for ${martStopEventLabel(stop)} — editable pillars, flat masters and layered PDF/X-4 print exports cloned from the London reference kit.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: MartStopPage,
});

function MartStopPage() {
  const { stopId } = useParams({ from: "/events/next_/mart_/$stopId" });
  const stop = martStopById(stopId);

  if (!stop) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-xl font-semibold text-[#03002C]">Stop not found</h1>
          <p className="mt-2 text-sm text-black/60">
            This mart stop is not saved in this browser. Create it from the London kit.
          </p>
          <Link
            to="/events/next/mart"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#003FC7] hover:underline"
          >
            <ArrowLeft size={14} /> Back to NEXT MART
          </Link>
        </div>
      </AppShell>
    );
  }

  const pillars = martStopPillars(stop);
  const flats = martStopFlatMasters(stop);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next/mart"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#003FC7] hover:underline"
        >
          <ArrowLeft size={13} /> NEXT MART · London reference kit
        </Link>

        <header className="mt-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#03002C]">
            <MapPin size={20} /> NEXT MART · {stop.city}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/60">
            {martStopEventLabel(stop)}
            {stop.venue ? ` · ${stop.venue}` : ""}
            {stop.dates ? ` · ${stop.dates}` : ""}. Cloned from the London kit: identical pillar
            footprints, flat trims, quantities and substrates, with this stop's shop URL, hashtag
            and local currency swapped through the copy, QR codes and print specs.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] tabular-nums text-black/55">
            <li>{martStopPanels(stop)} panels</li>
            <li>{pillars.length} pillar sets</li>
            <li>{flats.length} flat masters</li>
            <li>{stop.shopUrl}</li>
            <li>{stop.hashtag}</li>
          </ul>
          {stop.notes ? (
            <p className="mt-2 max-w-3xl text-[12px] text-black/50">{stop.notes}</p>
          ) : null}
        </header>

        <MartBundleExport stop={stop} />

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
            Editable pillar files
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
            Live masters on the approved NEXT gradients. Open any of them in the pillar editor to
            adjust copy, QR placement or arrow direction for this venue.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {pillars.map((p) => (
              <article
                key={p.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                <div className="flex items-center justify-center bg-[#F2F2F2] p-4">
                  <PillarSign config={martStopPillarConfig(stop, p)} pxPerMm={0.06} />
                </div>
                <div className="border-t border-black/10 px-4 py-3">
                  <div className="text-sm font-medium text-[#03002C]">{p.name}</div>
                  <div className="mt-0.5 text-[12px] text-black/55">{p.role}</div>
                  <ul className="mt-2 space-y-0.5 text-[11px] tabular-nums text-black/55">
                    <li>
                      Qty {p.quantity} · {p.substrate}
                    </li>
                    <li>{p.placement}</li>
                  </ul>
                </div>
              </article>
            ))}
          </div>
          <Link
            to="/events/pillars"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7] px-3 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#E0E8F5]"
          >
            Open the pillar editor <ArrowRight size={13} />
          </Link>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
            Flat masters · artwork placed
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
            Measured flat panels with the supplied category artwork placed on its own vector layer.
            Copy carries this stop's hashtag and price bands.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {flats.map(({ sign, config }) => {
              const art = martArtwork(martFlatArtworkId(sign));
              return (
                <article
                  key={sign.id}
                  className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                >
                  <div className="flex items-center justify-center bg-[#F2F2F2] p-4">
                    <PillarSign config={config} pxPerMm={0.16} />
                  </div>
                  <div className="border-t border-black/10 px-4 py-3">
                    <div className="text-sm font-medium text-[#03002C]">{sign.name}</div>
                    <ul className="mt-2 space-y-0.5 text-[11px] tabular-nums text-black/55">
                      <li>
                        {sign.trimW} × {sign.trimH} mm · {sign.bleed} mm bleed · qty {sign.quantity}
                      </li>
                      <li>{art ? `Placed art: ${art.headline}` : "No placed artwork"}</li>
                      <li>{sign.copy.join(" · ")}</li>
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-black/50">
            <Ruler size={13} /> Trims, substrates and finishing match the London build exactly —
            only the stop facts change.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
