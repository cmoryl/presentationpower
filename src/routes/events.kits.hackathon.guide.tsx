// /events/kits/hackathon/guide — the GlobalLink Hackathon London '26 brand guidelines as a page.
// Every value and don't is from the designers' 6-page PDF; text the PDF lacks is not invented;
// logos are their supplied files, unchanged. Don't tiles show the supplied mark
// with the mistake applied only as a crossed-out example.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPLIED_KITS } from "@/lib/supplied-event-kits";

const TITLE = "GlobalLink Hackathon London ’26 brand guidelines — TransPerfect Element";
const DESC = "GlobalLink Hackathon London ’26 logo, variations, Dark Blue and Light Blue with Pantone and CMYK, Poppins typography and logo don’ts.";

export const Route = createFileRoute("/events/kits/hackathon/guide")({
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
  component: HackathonGuide,
});

const kit = SUPPLIED_KITS.hackathon;
const logo = (name: string) => kit.logos.find((l) => l.name === name)?.url ?? "";
const DARK = "#003B71";
const LIGHT = "#139DD8";
const POPPINS = { fontFamily: "Poppins, sans-serif" };

/** HSV as printed in the guide. */
const HSV: Record<string, string> = { "#003B71": "207 · 100 · 44", "#139DD8": "197 · 90 · 84" };

const VARIATIONS = [
  { name: "Two colour", pos: "01_Hackathon2026_Logo", rev: "03_Hackathon_Logo_2Ink_DarkBlueBG" },
  { name: "One colour · Dark Blue", pos: "02_Hackathon2026_Logo_1Ink_DarkBlue", rev: "04_Hackathon2026_Logo_White" },
  { name: "One colour · Light Blue", pos: "03_Hackathon2026_Logo_1Ink_LightBlue", rev: "04_Hackathon2026_Logo_White" },
];

/** How each don't is illustrated on the supplied full-colour mark. */
const DONT_STYLE: Record<string, { img?: React.CSSProperties; ground?: React.CSSProperties; text?: string }> = {
  "Use off-brand colours": { img: { filter: "hue-rotate(150deg) saturate(1.6)" } },
  "Resize or reorder elements": { img: { transform: "scale(1.35, 0.8)" } },
  Rotate: { img: { transform: "rotate(-18deg)" } },
  "Skew or distort": { img: { transform: "skewX(-22deg)" } },
  "Add effects": { img: { filter: "drop-shadow(6px 6px 3px rgba(0,0,0,.55)) blur(0.4px)" } },
  Flip: { img: { transform: "scaleX(-1)" } },
  "Reproduce as a keyline": { img: { filter: "grayscale(1) brightness(1.9) contrast(0.6)", WebkitTextStroke: "1px" } },
  "Change typeface": { text: "Hackathon" },
  "Place over complex backgrounds": {
    ground: { background: `repeating-linear-gradient(45deg, ${LIGHT} 0 10px, #f6c445 10px 20px, ${DARK} 20px 30px)` },
  },
};

function HackathonGuide() {
  const full = logo("01_Hackathon2026_Logo");
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/events/kits/$kitId" params={{ kitId: "hackathon" }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> GlobalLink Hackathon London ’26 brand kit
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-lg p-8" style={{ background: DARK }}>
        <div>
          <img src={logo("04_Hackathon2026_Logo_White")} alt="GlobalLink Hackathon London ’26 logo" className="h-20 w-auto" />
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white" style={POPPINS}>Brand guidelines</h1>
        </div>
        {kit.guide && (
          <Button asChild variant="secondary">
            <a href={kit.guide.file} download><Download className="h-4 w-4" /> Original guidelines (PDF)</a>
          </Button>
        )}
      </header>

      <Section n="01" title="Introduction">
        <h3 className="text-lg font-semibold text-foreground" style={POPPINS}>The event</h3>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          {kit.intro} The event brings together innovators, developers, and thinkers to explore new approaches, experiment
          with emerging technologies, and generate impactful outcomes that can extend beyond the Hackathon itself.
        </p>
      </Section>

      <Section n="02" title="The logo">
        <div className="rounded-lg border border-border p-6">
          <div className="flex h-48 items-center justify-center"><img src={full} alt="Hackathon logo" className="max-h-full max-w-full" /></div>
          <p className="mt-4 text-xs text-muted-foreground">The supplied guide shows the logo on page 2 without written rules; clear space and minimum size are not specified, so none are given here.</p>
        </div>
      </Section>

      <Section n="03" title="Logo variations">
        <p className="max-w-3xl text-sm text-muted-foreground">Two-colour and one-colour versions, each in positive and reverse.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {VARIATIONS.map((v) => (
            <div key={v.name} className="overflow-hidden rounded-lg border border-border">
              <div className="flex h-32 items-center justify-center bg-white p-5"><img src={logo(v.pos)} alt={`${v.name} positive`} className="max-h-full max-w-full" /></div>
              <div className="flex h-32 items-center justify-center p-5" style={{ background: DARK }}><img src={logo(v.rev)} alt={`${v.name} reverse`} className="max-h-full max-w-full" /></div>
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground">{v.name} <span className="font-normal text-muted-foreground">· positive and reverse</span></p>
                                <div className="mt-2 flex gap-3 text-xs font-semibold">
                  <a href={logo(v.pos)} download className="text-primary hover:underline">Positive SVG</a>
                  <a href={logo(v.rev)} download className="text-primary hover:underline">Reverse {logo(v.rev).endsWith(".svg") ? "SVG" : "PNG"}</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section n="04" title="Colour palette">
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {kit.colours.map((c) => (
            <div key={c.hex} className="overflow-hidden rounded-lg border border-border">
              <div className="h-28" style={{ background: c.hex }} aria-hidden />
              <div className="p-4 text-sm">
                <p className="font-semibold text-foreground" style={POPPINS}>{c.name}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground">
                  <dt className="font-medium text-foreground">Pantone</dt><dd>{c.pantone}</dd>
                  <dt className="font-medium text-foreground">CMYK</dt><dd>{c.cmyk}</dd>
                  <dt className="font-medium text-foreground">RGB</dt><dd>{c.rgb}</dd>
                  <dt className="font-medium text-foreground">Web</dt><dd>{c.hex}</dd>
                  <dt className="font-medium text-foreground">HSV</dt><dd>{HSV[c.hex]}</dd>
                </dl>
              </div>
            </div>
          ))}
        <p className="mt-3 text-xs text-muted-foreground">Values as printed in the supplied guidelines, page 4. Print uses Pantone or CMYK; screens use RGB / Web.</p>
      </Section>

      <Section n="05" title="Typography">
        <p className="max-w-3xl text-sm text-muted-foreground">Poppins font family — Regular and Bold.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {([["Poppins Regular", 400], ["Poppins Bold", 700]] as const).map(([name, w]) => (
            <div key={name} className="rounded-lg border border-border p-6 text-foreground" style={{ ...POPPINS, fontWeight: w }}>
              <p className="text-sm text-muted-foreground" style={{ fontWeight: 500 }}>{name}</p>
              <p className="mt-2 text-6xl leading-none">Aa</p>
              <p className="mt-4 break-all text-base">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
              <p className="break-all text-base">abcdefghijklmnopqrstuvwxyz</p>
              <p className="text-base">0123456789</p>
            </div>
          ))}
        </div>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href="https://fonts.google.com/specimen/Poppins" target="_blank" rel="noreferrer">Get Poppins (Google Fonts, free)</a>
        </Button>
      </Section>

      <Section n="06" title="Logo don’ts">
        <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {kit.donts.map((d) => {
            const s = DONT_STYLE[d] ?? {};
            return (
              <li key={d} className="overflow-hidden rounded-lg border border-border">
                <div className="relative flex h-36 items-center justify-center overflow-hidden bg-white p-6" style={s.ground}>
                  {s.text ? (
                    <span className="text-4xl text-[#003B71]" style={{ fontFamily: "'Libre Baskerville', serif" }}>{s.text}</span>
                  ) : (
                    <img src={full} alt="" className="max-h-full max-w-full" style={s.img} />
                  )}
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#E53D2E] text-white">
                    <X className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <p className="p-3 text-sm font-semibold text-foreground">Don’t {d.charAt(0).toLowerCase() + d.slice(1)}</p>
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
      <h2 className="text-2xl font-bold text-foreground" style={POPPINS}>
        <span className="mr-2 text-primary">{n}.</span>{title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
