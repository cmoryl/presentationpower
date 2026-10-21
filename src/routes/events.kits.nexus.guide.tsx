// /events/kits/nexus/guide — the NeXus London '26 brand guidelines as a page.
// Every sentence, value and don't is from the designers' 6-page PDF (April 2026);
// logos are their supplied files, unchanged. Don't tiles show the supplied mark
// with the mistake applied only as a crossed-out example.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPLIED_KITS } from "@/lib/supplied-event-kits";

const TITLE = "NeXus London ’26 brand guidelines — TransPerfect Element";
const DESC = "NeXus London ’26 logo, variations, Dark Blue and Light Blue with Pantone and CMYK, Poppins typography and logo don’ts.";

export const Route = createFileRoute("/events/kits/nexus/guide")({
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
  component: NexusGuide,
});

const kit = SUPPLIED_KITS.nexus;
const logo = (name: string) => kit.logos.find((l) => l.name === name)?.url ?? "";
const DARK = "#003B71";
const LIGHT = "#139DD8";
const POPPINS = { fontFamily: "Poppins, sans-serif" };

/** HSV as printed in the guide. */
const HSV: Record<string, string> = { "#003B71": "207 · 100 · 44", "#139DD8": "197 · 90 · 84" };

const VARIATIONS = [
  { name: "Full colour", note: "Primary use — gradient on the symbol.", pos: "Nexus_Logo_2026_4inks", rev: "04_Nexus_Logo_DarkBlueBG" },
  { name: "Two colour", note: "Secondary use.", pos: "Nexus_Logo_2026_2inks", rev: "05_Nexus_Logo_2inks_DarkBlueBG" },
  { name: "One colour", note: "Secondary use.", pos: "Nexus_Logo_2026_1inks", rev: "Nexus_Logo_2026_White" },
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
  "Change typeface": { text: "NeXus" },
  "Place over complex backgrounds": {
    ground: { background: `repeating-linear-gradient(45deg, ${LIGHT} 0 10px, #f6c445 10px 20px, ${DARK} 20px 30px)` },
  },
};

function NexusGuide() {
  const full = logo("Nexus_Logo_2026_4inks");
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/events/kits/$kitId" params={{ kitId: "nexus" }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> NeXus London ’26 brand kit
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-lg p-8" style={{ background: DARK }}>
        <div>
          <img src={logo("Nexus_Logo_2026_White")} alt="NeXus London ’26 logo" className="h-20 w-auto" />
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
          {kit.intro} This brand guidelines document provides a clear framework for the correct and consistent use of the
          Nexus visual identity, ensuring that the logo and related elements reflect the event’s spirit and professionalism
          across all applications.
        </p>
      </Section>

      <Section n="02" title="The logo">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border p-6">
            <div className="flex h-44 items-center justify-center"><img src={full} alt="NeXus full-colour logo" className="max-h-full max-w-full" /></div>
            <h3 className="mt-4 font-semibold text-foreground" style={POPPINS}>The symbol</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The “X” symbolizes the connections and collaborations at the event, inspired by the links within a technological network.
            </p>
          </div>
          <div className="rounded-lg border border-border p-6">
            <div className="flex h-44 items-center justify-center">
              <div className="p-6 outline-dashed outline-1 outline-muted-foreground/40"><img src={full} alt="NeXus imagotype with clear space" className="max-h-28" /></div>
            </div>
            <h3 className="mt-4 font-semibold text-foreground" style={POPPINS}>The imagotype</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The translucent gray lines indicate the required safe areas and minimum clear space surrounding the symbol and the
              logotype. Respecting these margins in all layouts guarantees optimal visibility, legibility, and consistent
              presentation of the brand across different formats and backgrounds.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">The dashed box here is indicative; the exact clear space is drawn in the original PDF, page 2.</p>
          </div>
        </div>
      </Section>

      <Section n="03" title="Logo variations">
        <p className="max-w-3xl text-sm text-muted-foreground">
          The logo is primarily designed to be used in full color or as a vector version with gradient applied to the symbol. To
          ensure flexibility across various production contexts, additional two-color and single-color versions, in both
          positive and reverse, are provided for secondary applications where required.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {VARIATIONS.map((v) => (
            <div key={v.name} className="overflow-hidden rounded-lg border border-border">
              <div className="flex h-32 items-center justify-center bg-white p-5"><img src={logo(v.pos)} alt={`${v.name} positive`} className="max-h-full max-w-full" /></div>
              <div className="flex h-32 items-center justify-center p-5" style={{ background: DARK }}><img src={logo(v.rev)} alt={`${v.name} reverse`} className="max-h-full max-w-full" /></div>
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground">{v.name} <span className="font-normal text-muted-foreground">· positive and reverse</span></p>
                <p className="text-xs text-muted-foreground">{v.note}</p>
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
        <p className="max-w-3xl text-sm text-muted-foreground">
          The logo is primarily based on the corporate dark blue and light blue color palette, using white in reversed versions
          and secondary applications to ensure clarity and contrast.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
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
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="h-28" style={{ background: `linear-gradient(90deg, ${DARK}, ${LIGHT})` }} aria-hidden />
            <div className="p-4 text-sm">
              <p className="font-semibold text-foreground" style={POPPINS}>Gradient</p>
              <p className="mt-2 text-muted-foreground">Dark Blue → Light Blue, used on the symbol of the full-colour logo.</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Values as printed in the supplied guidelines, page 4. Print uses Pantone or CMYK; screens use RGB / Web.</p>
      </Section>

      <Section n="05" title="Typography">
        <p className="max-w-3xl text-sm text-muted-foreground">
          The core wordmark “NeXus” is custom illustrated and not based on any existing typeface. The complete Poppins font
          family serves as the primary corporate typeface and should be used consistently with aesthetic judgment. In most
          applications, Regular and Bold weights are prioritized to maintain clarity, hierarchy, and visual coherence.
        </p>
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
        <p className="max-w-3xl text-sm text-muted-foreground">
          While we provide some examples of incorrect logo usage across different visual formats, these are meant as reference
          only. Any deviation from the objective guidelines detailed above should also be considered improper use.
        </p>
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
