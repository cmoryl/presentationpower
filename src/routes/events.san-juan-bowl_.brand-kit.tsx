// /events/san-juan-bowl/brand-kit — the San Juan Bowl brand kit: supplied
// logo variants with background previews, clear space, minimum sizes,
// approved backgrounds, misuse gallery and badge anatomy, plus the palette,
// type and usage rules, with downloads. Event facts stay "to be confirmed"
// until issued.

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Ban, Check, Download } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { BRAND } from "@/lib/brand-colors";
import {
  SJB_BACKGROUNDS,
  SJB_CLEAR_SPACE,
  SJB_COLORS,
  SJB_EVENT,
  SJB_LOGOS,
  SJB_LOGO_ANATOMY,
  SJB_MIN_SIZES,
  SJB_MISUSE,
  SJB_TYPE_NOTE,
  type SjbMisuseDemo,
} from "@/lib/san-juan-bowl";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl brand kit · TransPerfect Element" },
      {
        name: "description",
        content:
          "The TransPerfect San Juan Bowl brand kit — logo variants, clear space, sizing, approved backgrounds, misuse rules, palette and typography, with downloads.",
      },
      { property: "og:title", content: "San Juan Bowl brand kit" },
      { property: "og:description", content: "Logo, palette, typography and rules for the TransPerfect San Juan Bowl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SjbBrandKit,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";

/** Backgrounds offered in the per-variant preview switcher. */
const PREVIEW_BGS = [
  { name: "White", hex: BRAND.white },
  { name: "Light Gray", hex: BRAND.lightGray },
  { name: "Caribbean Sky", hex: "#00AAE7" },
  { name: "Bowl Navy", hex: "#0D0E21" },
  { name: "Ink", hex: BRAND.ink },
] as const;

function LogoVariantCard({ logo }: { logo: (typeof SJB_LOGOS)[number] }) {
  const [bg, setBg] = useState<string>(logo.previewBg);
  return (
    <div className={`${card} space-y-3`}>
      <div
        className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#03002C]/10 p-8 transition-colors"
        style={{ background: bg }}
      >
        <img src={logo.svg} alt={`${SJB_EVENT.name} logo — ${logo.label}`} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">{logo.label}</p>
        <div className="flex items-center gap-1" role="group" aria-label="Preview background">
          {PREVIEW_BGS.map((b) => (
            <button
              key={b.hex}
              type="button"
              title={b.name}
              aria-label={`Preview on ${b.name}`}
              aria-pressed={bg === b.hex}
              onClick={() => setBg(b.hex)}
              className={`h-5 w-5 rounded-full border transition ${
                bg === b.hex ? "ring-2 ring-[#003FC7] ring-offset-1" : "hover:scale-110"
              } border-[#03002C]/20`}
              style={{ background: b.hex }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={logo.svg}
          download
          className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/25 px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F2F2F2]"
        >
          <Download className="h-3.5 w-3.5" /> SVG
        </a>
        <a
          href={logo.png}
          download
          className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/25 px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F2F2F2]"
        >
          <Download className="h-3.5 w-3.5" /> PNG
        </a>
      </div>
    </div>
  );
}

function ClearSpaceDiagram() {
  const unit = SJB_CLEAR_SPACE.unitPct;
  const badgeSize = 100 - unit * 2;
  return (
    <div className={`${card} space-y-3`}>
      <h3 className="text-[15px] font-bold">Clear space</h3>
      <p className="text-[13px] text-[#03002C]/80">{SJB_CLEAR_SPACE.rule}</p>
      <div className="flex justify-center rounded-xl border border-[#03002C]/10 bg-[#F2F2F2] p-6">
        <div className="relative aspect-square w-full max-w-[320px]">
          <div className="absolute inset-0 rounded-lg border-2 border-dashed border-[#003FC7]/60" aria-hidden="true" />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: `${badgeSize}%`, height: `${badgeSize}%` }}
          >
            <img src={SJB_LOGOS[0].svg} alt="San Juan Bowl badge with clear-space ring" className="h-full w-full object-contain" />
          </div>
          <div
            className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center gap-0.5"
            style={{ height: `${unit}%` }}
            aria-hidden="true"
          >
            <div className="h-full w-px bg-[#FFD600]" />
            <span className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-[#03002C]">
              1 banner height
            </span>
          </div>
        </div>
      </div>
      <p className="text-[12px] text-[#666666]">
        Nothing — type, rules, other logos, page edges — enters the dashed area.
      </p>
    </div>
  );
}

function MinSizeCard() {
  return (
    <div className={`${card} space-y-3`}>
      <h3 className="text-[15px] font-bold">Minimum sizes</h3>
      <p className="text-[13px] text-[#03002C]/80">
        The badge holds fine detail; below these sizes the lettering and waves are lost.
      </p>
      <ul className="space-y-2">
        {SJB_MIN_SIZES.map((m) => (
          <li key={m.context} className="flex items-start gap-3 rounded-xl border border-[#03002C]/10 bg-[#F2F2F2]/60 px-3 py-2.5">
            <span className="mt-0.5 min-w-[120px] text-[12px] font-bold uppercase tracking-wide text-[#03002C]/60">
              {m.context}
            </span>
            <span className="text-[13px]">
              <strong>{m.minimum}</strong>
              <span className="block text-[12px] text-[#666666]">{m.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MisuseTile({ id, title, detail }: { id: SjbMisuseDemo; title: string; detail: string }) {
  const logo = SJB_LOGOS[0].svg;
  let boxStyle: React.CSSProperties = { background: BRAND.white };
  let imgStyle: React.CSSProperties = {};
  let overlay: React.ReactNode = null;

  switch (id) {
    case "stretch":
      imgStyle = { transform: "scaleX(1.45)" };
      break;
    case "recolour":
      imgStyle = { filter: "hue-rotate(150deg) saturate(1.6)" };
      break;
    case "crop":
      imgStyle = { transform: "scale(1.7)" };
      break;
    case "rotate":
      imgStyle = { transform: "rotate(-14deg)" };
      break;
    case "busy":
      boxStyle = {
        background:
          "repeating-linear-gradient(45deg, #00AAE7 0 10px, #FFD600 10px 20px, #EC388A 20px 30px, #0D0E21 30px 40px)",
      };
      break;
    case "lowContrast":
      boxStyle = { background: "#00AAE7" };
      break;
    case "shadow":
      imgStyle = { filter: "drop-shadow(6px 8px 6px rgba(3,0,44,0.55))" };
      break;
    case "retype":
      overlay = (
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-[#FFD600] px-2 py-0.5 text-[13px] font-black italic text-[#0D0E21]"
          style={{ fontFamily: "cursive" }}
          aria-hidden="true"
        >
          TRANSPERFECT
        </span>
      );
      break;
  }

  return (
    <div className="space-y-2">
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#03002C]/10 p-6"
        style={boxStyle}
      >
        <img src={logo} alt="" aria-hidden="true" className="max-h-full max-w-full object-contain" style={imgStyle} />
        {overlay}
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#E53D2E] text-white">
          <Ban className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="text-[12px] text-[#666666]">{detail}</p>
    </div>
  );
}

function SjbBrandKit() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-8 text-[#03002C]">
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

        <section className="space-y-4">
          <div>
            <h2 className="text-[20px] font-bold">Logo</h2>
            <p className="mt-1 text-[13px] text-[#666666]">
              Two supplied variants from the designer's final package. Try each on different backgrounds before
              downloading — the right variant is the one that stays crisp.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SJB_LOGOS.map((logo) => (
              <LogoVariantCard key={logo.id} logo={logo} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ClearSpaceDiagram />
            <MinSizeCard />
          </div>

          <div className={`${card} space-y-3`}>
            <h3 className="text-[15px] font-bold">Approved backgrounds</h3>
            <p className="text-[13px] text-[#03002C]/80">
              These are the only grounds the badge sits on. Each pair below shows the correct variant.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SJB_BACKGROUNDS.map((b) => {
                const logo = SJB_LOGOS.find((l) => l.id === b.variant)!;
                return (
                  <div key={b.id} className="space-y-2">
                    <div
                      className="flex aspect-[4/3] items-center justify-center rounded-xl border border-[#03002C]/10 p-5"
                      style={{ background: b.hex }}
                    >
                      <img
                        src={logo.svg}
                        alt={`San Juan Bowl logo on ${b.name}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                      <Check className="h-3.5 w-3.5 text-[#003FC7]" /> {b.name}
                    </p>
                    <p className="text-[12px] text-[#666666]">{b.note}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${card} space-y-3`}>
            <h3 className="text-[15px] font-bold">Misuse — never do these</h3>
            <p className="text-[13px] text-[#03002C]/80">
              Each tile shows the actual mistake. If a layout needs any of these, the layout is wrong, not the logo.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SJB_MISUSE.map((m) => (
                <MisuseTile key={m.id} id={m.id} title={m.title} detail={m.detail} />
              ))}
            </div>
          </div>

          <div className={`${card} space-y-3`}>
            <h3 className="text-[15px] font-bold">Badge anatomy</h3>
            <p className="text-[13px] text-[#03002C]/80">
              What the artwork contains — useful when briefing vendors or describing the mark.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {SJB_LOGO_ANATOMY.map((a) => (
                <div key={a.part} className="rounded-xl border border-[#03002C]/10 bg-[#F2F2F2]/60 px-3 py-2.5">
                  <dt className="text-[13px] font-bold">{a.part}</dt>
                  <dd className="mt-0.5 text-[12px] text-[#03002C]/75">{a.detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#03002C]/80">
            <li>Use the artwork exactly as supplied — never redraw, stretch, recolour or crop the badge.</li>
            <li>On dark backgrounds, use the dark-background variant; on light backgrounds, the full-colour variant.</li>
            <li>{SJB_CLEAR_SPACE.rule}</li>
            <li>Don't place the badge over busy photography or patterns that fight the artwork.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[17px] font-bold">Event palette</h2>
          <p className="text-[13px] text-[#666666]">
            Read from the supplied artwork. These are for San Juan Bowl material; everything else stays on the
            TransPerfect enterprise palette.
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
