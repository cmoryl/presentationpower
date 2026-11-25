// /events/san-juan-bowl/email-banners — the approved email banners that are
// live in Canva, with downloads for the marketing team.
import { ArrowLeft, Download, ExternalLink } from "lucide-react";

import { SjbLink, SjbShell } from "@/components/events/SjbShare";
import {
  SJB_EMAIL_BANNERS,
  SJB_EMAIL_BANNER_CANVA_URL,
  SJB_EMAIL_BANNER_SIZE,
} from "@/lib/sjb-email-banners";
import { SJB_EVENT } from "@/lib/san-juan-bowl";

export function EmailBannersPage() {
  return (
    <SjbShell>
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8 text-[#03002C]">
        <SjbLink page="kit" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]">
          <ArrowLeft className="h-4 w-4" /> {SJB_EVENT.name} brand kit
        </SjbLink>

        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#666666]">Approved marketing assets</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">Email banners</h1>
          <p className="mt-1 max-w-3xl text-[14px] text-[#666666]">
            Six approved banners, live in Canva: three artwork looks in English and Spanish, all{" "}
            {SJB_EMAIL_BANNER_SIZE.width} × {SJB_EMAIL_BANNER_SIZE.height} px. Each carries the Bowl shield,
            {" "}{SJB_EVENT.venue} · {SJB_EVENT.city.split(",")[0]}, {SJB_EVENT.datesLabel} and
            {" "}WWW.SANJUANBOWL.COM.
          </p>
          <p className="mt-1 max-w-3xl text-[14px] text-[#666666]">
            The pictures below are exports of the live Canva design with the AI-generation tags removed, so an
            email client or platform does not read them as machine-made. They are proofs of the design — edit the
            artwork in Canva, not in these files.
          </p>
          <a
            href={SJB_EMAIL_BANNER_CANVA_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#003FC7] underline"
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> Open the design in Canva
          </a>
        </header>

        <section aria-labelledby="bowl-email-banner-list">
          <h2 id="bowl-email-banner-list" className="text-[20px] font-bold">
            All six banners
          </h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2">
            {SJB_EMAIL_BANNERS.map((b) => (
              <li key={b.id} className="rounded-xl border border-[#03002C]/12 bg-white p-4 shadow-sm">
                <img
                  src={b.image}
                  alt={b.alt}
                  width={b.width}
                  height={b.height}
                  className="w-full rounded-md border border-[#03002C]/10"
                />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold">{b.label}</h3>
                    <p className="text-[12px] text-[#666666]">
                      {b.languageLabel} · {b.width} × {b.height} px · Canva page {b.page}
                    </p>
                  </div>
                  <a
                    href={b.image}
                    download={b.download}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#03002C]/25 px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F2F2F2]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden /> PNG
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SjbShell>
  );
}
