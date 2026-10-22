// Shared San Juan Bowl brand guide sections (intro, logo, variations, colours,
// type, don'ts). Rendered by the guide page and the designers kit so both carry
// the full regular guide. Values come only from src/lib/san-juan-bowl.ts.
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SjbLink } from "@/components/events/SjbShare";
import { SjbLetteringStacked } from "@/components/events/SjbLetteringStacked";
import {
  SJB_CLEAR_SPACE,
  SJB_COLORS,
  SJB_COLOR_NOTES,
  SJB_EVENT,
  SJB_LOGOS,
  SJB_LOGO_ANATOMY,
  SJB_MIN_SIZES,
  SJB_MISUSE,
  SJB_TYPE_NOTE,
  type SjbMisuseDemo,
} from "@/lib/san-juan-bowl";
import curvedAi from "@/assets/sjb/curved-lettering.ai.asset.json";
import curvedSvg from "@/assets/sjb/curved-lettering.svg.asset.json";
import curvedPng from "@/assets/sjb/curved-lettering.png.asset.json";

const NAVY = SJB_COLORS[0].hex;
const color = SJB_LOGOS[0];
const dark = SJB_LOGOS[1];

const DONT: Record<SjbMisuseDemo, { img?: React.CSSProperties; ground?: React.CSSProperties; text?: string }> = {
  stretch: { img: { transform: "scale(1.4, 0.75)" } },
  recolour: { img: { filter: "hue-rotate(140deg) saturate(1.5)" } },
  crop: { img: { transform: "scale(1.9) translateY(18%)" } },
  rotate: { img: { transform: "rotate(-18deg)" } },
  busy: { ground: { background: `repeating-linear-gradient(45deg, ${SJB_COLORS[1].hex} 0 10px, ${SJB_COLORS[2].hex} 10px 20px, ${NAVY} 20px 30px)` } },
  lowContrast: { ground: { background: SJB_COLORS[1].hex } },
  shadow: { img: { filter: "drop-shadow(8px 8px 4px rgba(0,0,0,.6))" } },
  retype: { text: "San Juan Bowl" },
};

export function SjbGuideSections() {
  return (
    <>
      <Section n="01" title="Introduction">
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          The {SJB_EVENT.name}, {SJB_EVENT.venue}, {SJB_EVENT.city}. Dates are to be confirmed and are not printed until the organisers issue them.
        </p>
      </Section>

      <Section n="02" title="The logo">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border p-6">
            <div className="flex h-56 items-center justify-center"><img src={color.svg} alt="San Juan Bowl badge" className="max-h-full" /></div>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {SJB_LOGO_ANATOMY.map((a) => <li key={a.part}><span className="font-semibold text-foreground">{a.part}:</span> {a.detail}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground">Clear space</h3>
            <p className="mt-1 text-sm text-muted-foreground">{SJB_CLEAR_SPACE.rule}</p>
            <h3 className="mt-4 font-semibold text-foreground">Minimum sizes</h3>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              {SJB_MIN_SIZES.map((m) => <li key={m.context}><span className="font-semibold text-foreground">{m.context} · {m.minimum}.</span> {m.note}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      <Section n="03" title="Logo variations">
        <div className="grid gap-4 md:grid-cols-2">
          {SJB_LOGOS.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-lg border border-border">
              <div className="flex h-56 items-center justify-center p-6" style={{ background: v.previewBg }}><img src={v.svg} alt={v.label} className="max-h-full" /></div>
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground">{v.label}</p>
                <div className="mt-2 flex gap-3 text-xs font-semibold">
                  <a href={v.svg} download className="text-primary hover:underline">SVG</a>
                  <a href={v.png} download className="text-primary hover:underline">PNG</a>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <div className="flex h-56 items-center justify-center p-6" style={{ background: NAVY }}>
            <img src={curvedSvg.url} alt="SAN JUAN BOWL curved lettering" className="max-h-full max-w-full" />
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold text-foreground">Curved lettering — SAN JUAN BOWL only <span className="font-normal text-muted-foreground">· for dark backgrounds</span></p>
            <p className="text-xs text-muted-foreground">The badge's own arched lettering on its own, white with the Caribbean Sky shadow. Use as supplied; never retype, re-curve or stretch it.</p>
            <div className="mt-2 flex gap-3 text-xs font-semibold">
              <a href={curvedSvg.url} download="sjb-san-juan-bowl-curved-lettering.svg" className="text-primary hover:underline">SVG</a>
              <a href={curvedAi.url} download="sjb-san-juan-bowl-curved-lettering.ai" className="text-primary hover:underline">AI</a>
              <a href={curvedPng.url} download="sjb-san-juan-bowl-curved-lettering.png" className="text-primary hover:underline">Transparent PNG</a>
            </div>
          </div>
        </div>
        <div className="mt-4"><SjbLetteringStacked compact /></div>
        <h3 className="mt-6 text-sm font-bold text-foreground">Palm trees from the logo</h3>
        <p className="text-xs text-muted-foreground">The badge's own palms, supplied as standalone artwork for patterns, corners and merchandise. Use as supplied; never redraw, recolour (except the one-colour file) or stretch.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["sjb-palms-pair", "Palm pair — full colour", "#FFFFFF"],
            ["sjb-palms-pair-1color", "Palm pair — one colour", "#FFFFFF"],
            ["sjb-palm-left", "Left palm", "#FFFFFF"],
            ["sjb-palm-right", "Right palm", "#FFFFFF"],
          ].map(([id, label, bg]) => (
            <div key={id} className="overflow-hidden rounded-lg border border-border">
              <div className="flex h-40 items-center justify-center p-4" style={{ background: bg }}>
                <img src={`/downloads/sjb-palms/${id}.svg`} alt={label} className="max-h-full max-w-full" />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <div className="mt-2 flex gap-3 text-xs font-semibold">
                  <a href={`/downloads/sjb-palms/${id}.svg`} download={`${id}.svg`} className="text-primary hover:underline">SVG</a>
                  <a href={`/downloads/sjb-palms/${id}-2400.png`} download={`${id}-2400.png`} className="text-primary hover:underline">Transparent PNG</a>
                </div>
              </div>
            </div>
          ))}
        </div>
        <SjbLink page="single" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Single-colour versions</SjbLink>
      </Section>

      <Section n="04" title="Colour palette">
        <div className="grid gap-4 md:grid-cols-4">
          {SJB_COLORS.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-lg border border-border">
              <div className="h-28 border-b border-border" style={{ background: c.hex }} aria-hidden />
              <div className="p-4 text-sm">
                <p className="font-semibold text-foreground">{c.name}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground">
                  <dt className="font-medium text-foreground">Pantone</dt><dd>Matched by vendor</dd>
                  <dt className="font-medium text-foreground">CMYK</dt><dd>{c.cmyk}</dd>
                  <dt className="font-medium text-foreground">RGB</dt><dd>{c.rgb}</dd>
                  <dt className="font-medium text-foreground">Web</dt><dd>{c.hex}</dd>
                  <dt className="font-medium text-foreground">HSL</dt><dd>{c.hsl}</dd>
                </dl>
                <p className="mt-2 text-xs text-muted-foreground">{c.role}</p>
              </div>
            </div>
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{SJB_COLOR_NOTES.map((n) => <li key={n}>{n}</li>)}</ul>
      </Section>

      <Section n="05" title="Typography">
        <p className="max-w-3xl text-sm text-muted-foreground">{SJB_TYPE_NOTE}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {([["Geist Regular", 400], ["Geist Bold", 700]] as const).map(([name, w]) => (
            <div key={name} className="rounded-lg border border-border p-6 text-foreground" style={{ fontWeight: w }}>
              <p className="text-sm text-muted-foreground" style={{ fontWeight: 500 }}>{name}</p>
              <p className="mt-2 text-6xl leading-none">Aa</p>
              <p className="mt-4 break-all text-base">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
              <p className="break-all text-base">abcdefghijklmnopqrstuvwxyz</p>
              <p className="text-base">0123456789</p>
            </div>
          ))}
        </div>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href="https://fonts.google.com/specimen/Geist" target="_blank" rel="noreferrer">Get Geist (Google Fonts, free)</a>
        </Button>
      </Section>

      <Section n="06" title="Logo don’ts">
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {SJB_MISUSE.map((d) => {
            const s = DONT[d.id] ?? {};
            return (
              <li key={d.id} className="overflow-hidden rounded-lg border border-border">
                <div className="relative flex h-40 items-center justify-center overflow-hidden bg-white p-6" style={s.ground}>
                  {s.text ? (
                    <span className="text-2xl text-foreground" style={{ fontFamily: "'Libre Baskerville', serif" }}>{s.text}</span>
                  ) : (
                    <img src={color.svg} alt="" className="max-h-full max-w-full" style={s.img} />
                  )}
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white">
                    <X className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-foreground">{d.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{d.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-foreground"><span className="mr-2 text-primary">{n}.</span>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
