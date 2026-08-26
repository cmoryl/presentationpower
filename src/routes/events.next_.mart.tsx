import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Ruler, Store } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PillarSign } from "@/components/next/PillarSign";
import {
  NEXT_MART,
  NEXT_MART_FLAT_SIGNS,
  NEXT_MART_PILLARS,
  martTotalPanels,
} from "@/lib/next-mart";

export const Route = createFileRoute("/events/next_/mart")({
  head: () => ({
    meta: [
      { title: "NEXT MART signage · TransPerfect NEXT 2026 London" },
      {
        name: "description",
        content:
          "The NEXT MART merch shop signage kit for TransPerfect NEXT 2026 London — entrance, till, wayfinding and logo pillars as live editable files, plus measured flat signage specs for print.",
      },
      { property: "og:title", content: "NEXT MART signage kit" },
      {
        property: "og:description",
        content:
          "Signage-only production kit for the NEXT MART merch shop: editable pillar files on approved NEXT gradient grounds and printer-ready flat signage specs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MartPage,
});

function MartPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> NEXT 2026 hub
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E0E8F5] px-2.5 py-1 text-[11px] font-medium text-[#003FC7]">
              <Store size={12} /> {NEXT_MART.name}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">
              NEXT MART signage
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/65">
              {NEXT_MART.intro}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-right">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-black/45">Event</dt>
              <dd className="text-sm font-medium text-[#03002C]">{NEXT_MART.venue}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-black/45">Dates</dt>
              <dd className="text-sm font-medium text-[#03002C]">{NEXT_MART.dates}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-black/45">Panels</dt>
              <dd className="text-sm font-medium text-[#03002C]">{martTotalPanels()}</dd>
            </div>
          </dl>
        </div>

        {/* Pillar signage — live editable files */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
              Mart pillar signs · live editable files
            </h2>
            <Link
              to="/events/next/pillars"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7] px-3 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#E0E8F5]"
            >
              Open the pillar editor <ArrowRight size={13} />
            </Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {NEXT_MART_PILLARS.map((p) => (
              <article
                key={p.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                <div className="flex justify-center bg-[#F2F2F2] p-4">
                  <PillarSign config={p.config} pxPerMm={0.06} />
                </div>
                <div className="px-4 py-3">
                  <div className="text-sm font-medium text-[#03002C]">{p.name}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-black/60">{p.role}</p>
                  <ul className="mt-2.5 space-y-1 text-[11px] text-black/55">
                    <li>Qty {p.quantity} · {p.config.face === "dark" ? "Dark face" : "Light face"}</li>
                    <li>{p.placement}</li>
                    <li>{p.substrate}</li>
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Flat signage specs */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
            Flat signage · production specs
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
            Measured trim and bleed for each printed piece. Copy lines are editable per stop; the
            grounds and lockups stay on the approved NEXT system.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#F2F2F2] text-[11px] uppercase tracking-wide text-black/50">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Sign</th>
                  <th className="px-4 py-2.5 font-medium">Trim (mm)</th>
                  <th className="px-4 py-2.5 font-medium">Bleed</th>
                  <th className="px-4 py-2.5 font-medium">Qty</th>
                  <th className="px-4 py-2.5 font-medium">Substrate + finishing</th>
                  <th className="px-4 py-2.5 font-medium">Copy</th>
                </tr>
              </thead>
              <tbody>
                {NEXT_MART_FLAT_SIGNS.map((s) => (
                  <tr key={s.id} className="border-t border-black/10 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#03002C]">{s.name}</div>
                      <div className="mt-0.5 text-[12px] text-black/55">{s.role}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-black/70">
                      {s.trimW} × {s.trimH}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-black/70">{s.bleed} mm</td>
                    <td className="px-4 py-3 tabular-nums text-black/70">{s.quantity}</td>
                    <td className="px-4 py-3 text-[12px] text-black/65">
                      {s.substrate}
                      <div className="mt-0.5 text-black/50">{s.finishing}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-black/65">{s.copy.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-black/50">
            <Ruler size={13} /> Send us the mart working files and we will place your artwork on
            these masters and add batch print export per size.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
