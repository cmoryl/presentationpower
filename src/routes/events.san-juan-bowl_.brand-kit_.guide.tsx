// /events/san-juan-bowl/brand-kit/guide — San Juan Bowl brand guide page in the
// NeXus guide layout. Every value comes from src/lib/san-juan-bowl.ts: Geist is
// the Bowl's face (not Poppins) and no Pantone is approved, so none is invented.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const TITLE = "San Juan Bowl brand guide — TransPerfect Element";
const DESC = "San Juan Bowl badge, variants, clear space, colours with CMYK/RGB/HEX, Geist typography and logo don’ts.";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit_/guide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SjbGuide,
});

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

function SjbGuide() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/events/san-juan-bowl/brand-kit" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> {SJB_EVENT.name} brand kit
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-lg p-8" style={{ background: NAVY }}>
        <div className="flex items-center gap-6">
          <img src={dark.svg} alt="San Juan Bowl logo" className="h-28 w-auto" />
          <h1 className="text-3xl font-bold leading-tight text-white">Brand guidelines</h1>
        </div>
        <Button asChild variant="secondary">
          <a href="/downloads/san-juan-bowl-brand-guide.pdf" download><Download className="h-4 w-4" /> Full brand guide (PDF)</a>
        </Button>
      </header>

      <Section n="01" title="Introduction">
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          The TransPerfect {SJB_EVENT.name}, {SJB_EVENT.city}. Dates are to be confirmed and are not printed until the organisers issue them.
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
        <Link to="/events/san-juan-bowl/brand-kit/single-colour" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Single-colour versions</Link>
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
    </main>
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
