import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Download, Ruler, Store } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PillarSign } from "@/components/next/PillarSign";
import { MartBundleExport } from "@/components/next/MartBundleExport";
import { MartStopManager } from "@/components/next/MartStopManager";
import { MartArtworkStudio } from "@/components/next/MartArtworkStudio";
import { MartSignEditor } from "@/components/next/MartSignEditor";
import {
  listMartFlatMasters,
  listMartFlatSigns,
  listMartPillarSigns,
  resolvedMartPillarConfig,
} from "@/lib/next-mart-signs";
import { MART_LAYOUT_PRESETS } from "@/lib/next-mart-layouts";
import { martArtwork, martFlatArtworkId } from "@/lib/next-mart-placement";
import { PILLAR_SIZES, pillarKind } from "@/lib/next-pillar-masters";
import { NEXT_MART, NEXT_MART_LOGOS, martTotalPanels } from "@/lib/next-mart";

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
            {listMartPillarSigns().map((p) => (
              <article
                key={p.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                <div className="flex justify-center bg-[#F2F2F2] p-4">
                  <PillarSign config={resolvedMartPillarConfig(p)} pxPerMm={0.06} />
                </div>
                <div className="px-4 py-3">
                  <div className="text-sm font-medium text-[#03002C]">{p.name}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-black/60">{p.role}</p>
                  <ul className="mt-2.5 space-y-1 text-[11px] text-black/55">
                    <li>
                      Qty {p.quantity} · {p.config.face === "dark" ? "Dark face" : "Light face"}
                    </li>
                    <li>{p.placement}</li>
                    <li>{p.substrate}</li>
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <MartBundleExport />

        <MartStopManager />

        {/* Reusable layout presets — QR + wayfinding geometry per template */}
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
                Mart layout presets · QR &amp; wayfinding
              </h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
                Issued layouts for the mart signage. Each preset fixes the QR block placement and
                caption formatting together with the wayfinding geometry — headline size, vertical
                run, downward offset, lockup scale and arrow — as fractions of the trim sheet, so a
                layout re-lays itself on any pillar footprint instead of being re-dragged. Apply
                them from the “NEXT MART layouts” panel in the pillar editor.
              </p>
            </div>
            <Link
              to="/events/next/pillars"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7] px-3 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#E0E8F5]"
            >
              Apply in the editor <ArrowRight size={13} />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {MART_LAYOUT_PRESETS.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3.5"
              >
                <div className="text-sm font-medium text-[#03002C]">{p.name}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-black/60">{p.note}</p>
                <ul className="mt-2.5 space-y-1 text-[11px] tabular-nums text-black/55">
                  <li>Templates: {p.kinds.map((k) => pillarKind(k).name).join(", ")}</li>
                  <li>
                    Footprints:{" "}
                    {p.sizes.length === 0
                      ? "any (rescaled)"
                      : p.sizes
                          .map((s) => PILLAR_SIZES.find((x) => x.id === s)?.name ?? s)
                          .join(", ")}
                  </li>
                  <li>
                    {p.qrFracX === null
                      ? "No code — direction only"
                      : `QR ${Math.round(p.qrFracSize * 100)}% of width${p.qrTransparent ? " · no plate" : ""}`}
                  </li>
                  <li>
                    Headline {p.verticalHeadline ? "vertical" : "horizontal"} ·{" "}
                    {Math.round(p.headlineFracSize * 1000) / 10}% of height · lockup{" "}
                    {Math.round(p.lockupScale * 100)}%
                  </li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <MartArtworkStudio />

        <MartSignEditor />

        {/* Mart lockup pack */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
            NEXT MART lockup · master files
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
            The supplied mart mark in both approved faces. EPS is the print master used on all
            signage; SVG and PNG are the derived screen and proof files. Do not rebuild, recolour or
            stretch the lockup.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {NEXT_MART_LOGOS.map((logo) => (
              <article
                key={logo.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                <div
                  className="flex items-center justify-center p-8"
                  style={{ background: logo.face === "dark" ? "#03002C" : "#E0E8F5" }}
                >
                  <img
                    src={logo.previewUrl}
                    alt={`${logo.name} artwork`}
                    className="h-28 w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium text-[#03002C]">{logo.name}</div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-black/60">{logo.usage}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "EPS master", url: logo.epsUrl },
                      { label: "SVG", url: logo.svgUrl },
                      { label: "PNG proof", url: logo.pngUrl },
                    ].map((f) => (
                      <a
                        key={f.label}
                        href={f.url}
                        download
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7] px-2.5 py-1.5 text-[11px] font-medium text-[#003FC7] hover:bg-[#E0E8F5]"
                      >
                        <Download size={12} /> {f.label}
                      </a>
                    ))}
                  </div>
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
                {listMartFlatSigns().map((s) => (
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
            <Ruler size={13} /> Every flat panel below is a live master: the supplied artwork is
            placed on its own vector layer and everything else stays editable.
          </p>
        </section>

        {/* Editable flat masters with the supplied artwork placed */}
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
                Editable flat masters · artwork placed
              </h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
                The London category masters dropped onto the measured flat panels. The gradient
                ground, lockup, headline, sub-line and QR all remain live, and the placed artwork
                exports as vector on its own <code>08 Placed artwork</code> layer.
              </p>
            </div>
            <Link
              to="/events/pillars"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7] px-3 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#E0E8F5]"
            >
              Open the editor <ArrowRight size={13} />
            </Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {listMartFlatMasters().map(({ sign, config }) => {
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
                    <div className="mt-0.5 text-[12px] text-black/55">{sign.role}</div>
                    <ul className="mt-2 space-y-0.5 text-[11px] tabular-nums text-black/55">
                      <li>
                        {sign.trimW} × {sign.trimH} mm · {sign.bleed} mm bleed · qty {sign.quantity}
                      </li>
                      <li>{art ? `Placed art: ${art.headline}` : "No placed artwork"}</li>
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
