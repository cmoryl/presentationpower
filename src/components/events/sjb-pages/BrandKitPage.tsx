// /events/san-juan-bowl/brand-kit — the San Juan Bowl brand kit: supplied
// logo variants with background previews, clear space, minimum sizes,
// approved backgrounds, misuse gallery and badge anatomy, plus the palette,
// type and usage rules, with downloads. Event facts stay "to be confirmed"
// until issued.
import { SjbLettering } from "@/components/events/SjbLettering";

import { useState } from "react";
import { ArrowLeft, Ban, Check, Copy, Download } from "lucide-react";

import { Link } from "@tanstack/react-router";
import { KitSignList } from "@/components/events/KitSignList";
import { SjbLink, SjbShareLinkButton, SjbShell, useSjbShare } from "@/components/events/SjbShare";
import { SjbSingleColour } from "@/components/events/SjbSingleColour";
import { SjbLockups, SjbSmallMark } from "@/components/events/SjbMarkLockups";
import { BRAND } from "@/lib/brand-colors";
import {
  SJB_BACKGROUNDS,
  SJB_CLEAR_SPACE,
  SJB_COLOR_NOTES,
  SJB_COLORS,
  SJB_CONSTRUCTION,
  SJB_EVENT,
  SJB_LOGOS,
  SJB_LOGO_ANATOMY,
  SJB_MIN_SIZES,
  SJB_MISUSE,
  SJB_TYPE_NOTE,
  SJB_TYPE_SCALE,
  SJB_TYPE_RULES,
  SJB_COLOR_PROPORTION,
  SJB_PAIRINGS,
  SJB_NAMING,
  sjbContrast,
  type SjbMisuseDemo,
} from "@/lib/san-juan-bowl";


const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";

/** Backgrounds offered in the per-variant preview switcher. */
const PREVIEW_BGS = [
  { name: "White", hex: BRAND.white },
  { name: "Light Gray", hex: BRAND.lightGray },
  { name: "Caribbean Sky", hex: "#00AAE7" },
  { name: "Bowl Navy", hex: "#0D0E21" },
  { name: "Ink", hex: BRAND.ink },
] as const;

/** CMYK print masters (PDF, EPS, PDF-compatible AI) made 1:1 from the supplied SVGs with the master EPS inks. */
const SJB_PRINT_DIR = "/downloads/sjb-logo/print";

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-[13px] font-semibold">{logo.label}</p>
        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Preview background">
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
        {(["pdf", "eps"] as const).map((ext) => (
          <a
            key={ext}
            href={`${SJB_PRINT_DIR}/sjb-logo-${logo.id}-cmyk.${ext}`}
            download
            className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/25 px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F2F2F2]"
          >
            <Download className="h-3.5 w-3.5" /> {ext.toUpperCase()} (CMYK)
          </a>
        ))}
        <a
          href={`${SJB_PRINT_DIR}/sjb-logo-${logo.id}-cmyk-illustrator.ai`}
          download
          className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/25 px-3 py-1.5 text-[12px] font-semibold hover:bg-[#F2F2F2]"
        >
          <Download className="h-3.5 w-3.5" /> AI (CMYK)
        </a>
      </div>
    </div>
  );
}

function ClearSpaceDiagram() {
  // Exact geometry: the ring box is the visible badge plus x on every side; the artwork
  // file (with its own padding) is placed so its badge edge lands exactly x inside the ring.
  const { xUnits: x, art } = SJB_CLEAR_SPACE;
  const boxW = art.width + 2 * x;
  const boxH = art.height + 2 * x;
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`;
  return (
    <div className={`${card} space-y-3`}>
      <h3 className="text-[15px] font-bold">Clear space</h3>
      <p className="text-[13px] text-[#03002C]/80">{SJB_CLEAR_SPACE.rule}</p>
      <div className="flex justify-center rounded-xl border border-[#03002C]/10 bg-[#F2F2F2] p-6">
        <div className="relative w-full max-w-[320px]" style={{ aspectRatio: `${boxW} / ${boxH}` }}>
          <div className="absolute inset-0 rounded-sm border-2 border-dashed border-[#003FC7]/60" aria-hidden="true" />
          <img
            src={SJB_LOGOS[0].svg}
            alt="San Juan Bowl badge with clear-space ring"
            className="absolute max-w-none"
            style={{
              left: pct(x - art.left, boxW),
              top: pct(x - art.top, boxH),
              width: pct(art.artboard, boxW),
              height: pct(art.artboard, boxH),
            }}
          />
          <div
            className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center gap-0.5"
            style={{ height: pct(x, boxH) }}
            aria-hidden="true"
          >
            <div className="h-full w-px bg-[#FFD600]" />
            <span className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-[#03002C]">
              x = ribbon height
            </span>
          </div>
        </div>
      </div>
      <p className="text-[12px] text-[#666666]">
        Nothing — type, rules, other logos, page edges — enters the dashed area. Drawn to scale: the ring is exactly x from the badge on every side.
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

function ConstructionDiagram() {
  const g = SJB_CONSTRUCTION.grid;
  const cells = Array.from({ length: g - 1 }, (_, i) => ((i + 1) * 100) / g);
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-[#03002C]/10 bg-white">
      <img
        src={SJB_LOGOS[0].svg}
        alt="San Juan Bowl badge on its construction grid"
        className="absolute inset-0 h-full w-full object-contain"
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {cells.map((p) => (
          <line key={`v${p}`} x1={p} y1={0} x2={p} y2={100} stroke="#003FC7" strokeWidth={0.18} opacity={0.22} />
        ))}
        {cells.map((p) => (
          <line key={`h${p}`} x1={0} y1={p} x2={100} y2={p} stroke="#003FC7" strokeWidth={0.18} opacity={0.22} />
        ))}
        {/* centre axes */}
        <line x1={50} y1={0} x2={50} y2={100} stroke="#003FC7" strokeWidth={0.4} strokeDasharray="2 1.4" />
        <line x1={0} y1={50} x2={100} y2={50} stroke="#003FC7" strokeWidth={0.4} strokeDasharray="2 1.4" />
        {/* banner unit bar, top left */}
        <line x1={4} y1={6} x2={4} y2={6 + SJB_CLEAR_SPACE.bannerPctOfBadge} stroke="#E53D2E" strokeWidth={0.7} />
        <line x1={3} y1={6} x2={5} y2={6} stroke="#E53D2E" strokeWidth={0.7} />
        <line x1={3} y1={6 + SJB_CLEAR_SPACE.bannerPctOfBadge} x2={5} y2={6 + SJB_CLEAR_SPACE.bannerPctOfBadge} stroke="#E53D2E" strokeWidth={0.7} />
        <text x={6.5} y={6 + SJB_CLEAR_SPACE.bannerPctOfBadge / 2 + 1.2} fontSize={3.2} fill="#E53D2E" fontWeight={700}>
          1x
        </text>
        {/* width dimension, bottom */}
        <line x1={2.7} y1={97.2} x2={97.3} y2={97.2} stroke="#03002C" strokeWidth={0.45} />
        <line x1={2.7} y1={96.2} x2={2.7} y2={98.2} stroke="#03002C" strokeWidth={0.45} />
        <line x1={97.3} y1={96.2} x2={97.3} y2={98.2} stroke="#03002C" strokeWidth={0.45} />
        <text x={50} y={95.4} fontSize={3.2} fill="#03002C" fontWeight={700} textAnchor="middle">
          {SJB_CONSTRUCTION.badge.w}x
        </text>
        {/* height dimension, right */}
        <line x1={99.2} y1={3.7} x2={99.2} y2={96.3} stroke="#03002C" strokeWidth={0.45} />
        <line x1={98.2} y1={3.7} x2={100} y2={3.7} stroke="#03002C" strokeWidth={0.45} />
        <line x1={98.2} y1={96.3} x2={100} y2={96.3} stroke="#03002C" strokeWidth={0.45} />
        <text x={97.6} y={50} fontSize={3.2} fill="#03002C" fontWeight={700} textAnchor="middle" transform="rotate(-90 97.6 50)">
          {SJB_CONSTRUCTION.badge.h}x
        </text>
      </svg>
    </div>
  );
}

function CopyCode({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label} value ${value}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — value stays visible for manual copy */
        }
      }}
      className="inline-flex items-center gap-1 rounded-full border border-[#03002C]/20 px-2 py-0.5 text-[11px] font-semibold text-[#03002C]/70 hover:bg-[#F2F2F2]"
    >
      {copied ? <Check className="h-3 w-3 text-[#003FC7]" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function SjbBrandKit() {
  const share = useSjbShare();
  return (
    <SjbShell>
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-8 text-[#03002C]">
        <SjbLink page="event"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]"
        >
          <ArrowLeft className="h-4 w-4" /> {SJB_EVENT.name}
        </SjbLink>

        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#666666]">Brand kit</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">{SJB_EVENT.name}</h1>
          <p className="mt-1 text-[14px] text-[#666666]">
            {SJB_EVENT.venue}, {SJB_EVENT.city} · Dates to be confirmed — nothing is printed until the organisers issue them.
          </p>
          <a
            href="/__l5e/assets-v1/dfe14e4f-ff8b-41c7-beb5-60a8c4c5ac67/san-juan-bowl-brand-guide.pdf"
            download="san-juan-bowl-brand-guide.pdf"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#03002C] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#003FC7]"
          >
            <Download className="h-4 w-4" /> Full brand guide (PDF)
          </a>
          {!share && (
            <Link
              to="/events/san-juan-bowl/brand-kit/guide"
              className="ml-2 mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#03002C] px-4 py-2 text-[13px] font-semibold text-[#03002C] hover:bg-[#EEF1F7]"
            >
              Open brand guide page
            </Link>
          )}
          <SjbShareLinkButton />
        </header>

        <SjbBrandKitBody />
        {!share && <KitSignList kit="san-juan-bowl" />}

        <section className={`${card} space-y-2`}>
          <h2 className="text-[17px] font-bold">What's next</h2>
          <p className="text-[14px] text-[#03002C]/80">
            Maps, signage and badges open from the event home as soon as the venue's floor plans and sign list arrive.
            Room colours and uses are set per event, so nothing here is overwritten by other events.
          </p>
        </section>
      </div>
    </SjbShell>
  );
}

/** Every brand-kit section (logo through naming); reused on the designers page. */
export function SjbBrandKitBody({ embedded = false }: { embedded?: boolean }) {
  return (
    <>
        <section className="space-y-4">
          <div>
            <h2 className="text-[20px] font-bold">Logo</h2>
            <p className="mt-1 text-[13px] text-[#666666]">
              Two supplied variants from the designer's final package. Try each on different backgrounds before
              downloading — the right variant is the one that stays crisp.
             Print vendors: each card has CMYK PDF, EPS and AI files with the master inks, or{" "}
              <a href="/downloads/sjb-logo/sjb-logo-print-masters.zip" download className="font-semibold text-[#003FC7] hover:underline">download all print masters (ZIP)</a>.
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

          <SjbSmallMark />
          {/* The designers page already shows the lockups in its guide sections. */}
          {!embedded && <SjbLockups />}

          <SjbSingleColour className="pt-2" />

          <SjbLettering />

          {!embedded && (<SjbLink page="designers"
            className={`${card} flex flex-wrap items-center justify-between gap-3 hover:border-[#003FC7]`}
          >
            <div>
              <h3 className="text-[15px] font-bold">For designers and print vendors</h3>
              <p className="mt-1 text-[13px] text-[#03002C]/80">
                Exact construction grid, measurements, the dissected 3D logo, every separated shape, and large-format signage specs.
              </p>
            </div>
            <span className="text-[13px] font-semibold text-[#003FC7]">Open designer pages →</span>
          </SjbLink>)}

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
          <h2 className="text-[17px] font-bold">Logo palette — print &amp; web codes</h2>
          <p className="text-[13px] text-[#666666]">
            Read from the supplied artwork. These are for San Juan Bowl material; everything else stays on the
            TransPerfect enterprise palette. Click any code to copy it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {SJB_COLORS.map((c) => (
              <div key={c.id} className={`${card} space-y-3`}>
                <div
                  className="flex h-20 items-end rounded-lg border border-[#03002C]/10 p-2"
                  style={{ background: c.hex }}
                >
                  <span
                    className="rounded px-1.5 py-0.5 text-[11px] font-bold"
                    style={{
                      background: c.id === "navy" ? "#FFFFFF" : "#0D0E21",
                      color: c.id === "navy" ? "#0D0E21" : "#FFFFFF",
                    }}
                  >
                    Text on this colour: {c.textOn}
                  </span>
                </div>
                <div>
                  <div className="text-[15px] font-bold">{c.name}</div>
                  <p className="text-[12px] text-[#03002C]/70">{c.role}</p>
                </div>
                <table className="w-full text-left text-[12px]">
                  <tbody>
                    {(
                      [
                        ["HEX", c.hex],
                        ["RGB", c.rgb],
                        ["HSL", c.hsl],
                        ["CMYK", c.cmyk],
                        ["Pantone", "Vendor-matched"],
                      ] as const
                    ).map(([label, value]) => (
                      <tr key={label} className="border-t border-[#03002C]/8">
                        <td className="w-20 py-1.5 pr-2 text-[11px] font-semibold uppercase tracking-wide text-[#666666]">
                          {label}
                        </td>
                        <td className="py-1.5 font-mono text-[12px]">{value}</td>
                        <td className="py-1.5 text-right">
                          {label !== "Pantone" && <CopyCode value={value} label={`${c.name} ${label}`} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className={`${card} space-y-1.5`}>
            <h3 className="text-[14px] font-bold">Before you print</h3>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#03002C]/80">
              {SJB_COLOR_NOTES.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[17px] font-bold">Colour balance &amp; readable pairings</h2>
          <p className="text-[13px] text-[#666666]">
            A suggested share of each colour in a layout, then every text/background pair checked against web
            accessibility contrast (AA needs 4.5:1 for body text, 3:1 for large headlines).
          </p>
          <div className={`${card} space-y-2`}>
            <div className="flex h-10 overflow-hidden rounded-lg border border-[#03002C]/10">
              {SJB_COLOR_PROPORTION.map((p) => {
                const c = SJB_COLORS.find((x) => x.id === p.id)!;
                return (
                  <div key={p.id} style={{ width: `${p.pct}%`, background: c.hex }} title={`${c.name} ${p.pct}%`} />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 text-[12px]">
              {SJB_COLOR_PROPORTION.map((p) => (
                <span key={p.id}>
                  <b>{SJB_COLORS.find((x) => x.id === p.id)!.name}</b> {p.pct}%
                </span>
              ))}
            </div>
            <p className="text-[12px] text-[#666666]">Guidance only — gold stays the smallest share so it keeps its punch.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SJB_PAIRINGS.map((p) => {
              const fg = SJB_COLORS.find((x) => x.id === p.fg)!;
              const bg = SJB_COLORS.find((x) => x.id === p.bg)!;
              const r = sjbContrast(fg.hex, bg.hex);
              const verdict = r >= 4.5 ? "Any text" : r >= 3 ? "Large headlines only" : "Never for text";
              return (
                <div key={`${p.fg}-${p.bg}`} className="overflow-hidden rounded-xl border border-[#03002C]/10">
                  <div className="px-3 py-4 text-[18px] font-bold" style={{ background: bg.hex, color: fg.hex }}>
                    Aa Bowl
                  </div>
                  <div className="space-y-0.5 px-3 py-2 text-[12px]">
                    <div className="font-semibold">
                      {fg.name} on {bg.name}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r >= 3 ? <Check className="h-3.5 w-3.5 text-[#003FC7]" /> : <Ban className="h-3.5 w-3.5 text-[#E53D2E]" />}
                      <span className="font-mono">{r.toFixed(1)}:1</span> · {verdict}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[17px] font-bold">Typography</h2>
          <p className="text-[13px] text-[#666666]">{SJB_TYPE_NOTE}</p>
          <div className={`${card} divide-y divide-[#03002C]/8`}>
            {SJB_TYPE_SCALE.map((t) => (
              <div key={t.role} className="grid gap-2 py-3 sm:grid-cols-[1fr_220px]">
                <div
                  style={{ fontWeight: t.weight, lineHeight: t.leading, fontSize: `min(${t.web}, 7vw)` }}
                  className="truncate"
                >
                  {t.sample}
                </div>
                <dl className="grid grid-cols-2 gap-x-2 text-[11px]">
                  <dt className="font-semibold uppercase text-[#666666]">{t.role}</dt>
                  <dd>Geist {t.weight}</dd>
                  <dt className="text-[#666666]">Web</dt>
                  <dd className="font-mono">{t.web}</dd>
                  <dt className="text-[#666666]">Print</dt>
                  <dd className="font-mono">{t.print}</dd>
                  <dt className="text-[#666666]">Leading</dt>
                  <dd className="font-mono">{t.leading}</dd>
                  <dt className="text-[#666666]">Signage</dt>
                  <dd>{t.signage}</dd>
                </dl>
              </div>
            ))}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#03002C]/80">
            {SJB_TYPE_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className={`${card} space-y-2`}>
          <h2 className="text-[17px] font-bold">Naming the event</h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            {SJB_NAMING.map((n) => (
              <div key={n.label} className="rounded-xl border border-[#03002C]/10 bg-[#F2F2F2]/60 px-3 py-2.5">
                <dt className="text-[11px] font-semibold uppercase text-[#666666]">{n.label}</dt>
                <dd className="mt-0.5 text-[13px] font-bold">{n.value}</dd>
              </div>
            ))}
          </dl>
        </section>

    </>
  );
}
