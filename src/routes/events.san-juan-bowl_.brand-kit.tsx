// /events/san-juan-bowl/brand-kit — the San Juan Bowl brand kit: supplied
// logo variants, the palette read from the artwork, type and usage rules,
// with downloads. Event facts stay "to be confirmed" until issued.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { SJB_COLORS, SJB_EVENT, SJB_LOGOS, SJB_LOGO_RULES, SJB_TYPE_NOTE } from "@/lib/san-juan-bowl";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl brand kit · TransPerfect Element" },
      {
        name: "description",
        content: "The TransPerfect San Juan Bowl brand kit — supplied logo variants, event palette, typography and usage rules, with downloads.",
      },
      { property: "og:title", content: "San Juan Bowl brand kit" },
      { property: "og:description", content: "Logo variants, palette, typography and rules for the TransPerfect San Juan Bowl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SjbBrandKit,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";

function SjbBrandKit() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 text-[#03002C]">
        <Link
          to="/events/$eventId"
          params={{ eventId: SJB_EVENT.id }}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]"
        >
          <ArrowLeft className="h-4 w-4" /> {SJB_EVENT.name}
        </Link>

        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#666666]">Brand kit</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">{SJB_EVENT.name}</h1>
          <p className="mt-1 text-[14px] text-[#666666]">
            {SJB_EVENT.city} · Venue and dates to be confirmed — nothing is printed until the organisers issue them.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-[17px] font-bold">Logo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {SJB_LOGOS.map((logo) => (
              <div key={logo.id} className={`${card} space-y-3`}>
                <div
                  className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#03002C]/10 p-6"
                  style={{ background: logo.previewBg }}
                >
                  <img src={logo.svg} alt={`${SJB_EVENT.name} logo — ${logo.label}`} className="max-h-full max-w-full object-contain" />
                </div>
                <p className="text-[13px] font-semibold">{logo.label}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={logo.svg} download className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/25 px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F2F2F2]">
                    <Download className="h-3.5 w-3.5" /> SVG
                  </a>
                  <a href={logo.png} download className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/25 px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F2F2F2]">
                    <Download className="h-3.5 w-3.5" /> PNG
                  </a>
                </div>
              </div>
            ))}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#03002C]/80">
            {SJB_LOGO_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[17px] font-bold">Event palette</h2>
          <p className="text-[13px] text-[#666666]">
            Read from the supplied artwork. These are for San Juan Bowl material; everything else stays on the TransPerfect enterprise palette.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SJB_COLORS.map((c) => (
              <div key={c.id} className={`${card} space-y-2`}>
                <div className="h-16 rounded-lg border border-[#03002C]/10" style={{ background: c.hex }} />
                <div className="text-[14px] font-bold">{c.name}</div>
                <div className="font-mono text-[12px] text-[#666666]">{c.hex}</div>
                <p className="text-[12px] text-[#03002C]/70">{c.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${card} space-y-2`}>
          <h2 className="text-[17px] font-bold">Typography</h2>
          <p className="text-[14px] text-[#03002C]/80">{SJB_TYPE_NOTE}</p>
        </section>

        <section className={`${card} space-y-2`}>
          <h2 className="text-[17px] font-bold">What's next</h2>
          <p className="text-[14px] text-[#03002C]/80">
            Maps, signage and badges open from the event home as soon as the venue's floor plans and sign list arrive.
            Room colours and uses are set per event, so nothing here is overwritten by other events.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
