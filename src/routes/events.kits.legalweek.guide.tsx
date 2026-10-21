// /events/kits/legalweek/guide — TransPerfect Legal at Legalweek 2026 brand guide page.
// Legalweek shipped no brand guide: colours are the values read from its live files
// (see LEGALWEEK_COLOURS), type is the supplied Poppins, and no logo rules or don'ts
// are invented — the page says so where the package is silent.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPLIED_KITS, LEGALWEEK_EVENT } from "@/lib/supplied-event-kits";

const TITLE = "Legalweek 2026 brand guide — TransPerfect Element";
const DESC = "TransPerfect Legal at Legalweek 2026: screen and print colours read from the live files, Poppins typography and supplied artwork.";

export const Route = createFileRoute("/events/kits/legalweek/guide")({
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
  component: LegalweekGuide,
});

const kit = SUPPLIED_KITS.legalweek;
const POPPINS = { fontFamily: "Poppins, sans-serif" };
const NAVY = kit.colours[0].hex;
const isPrint = (source?: string) => source?.startsWith("Print") ?? false;

function LegalweekGuide() {
  const screen = kit.colours.filter((c) => !isPrint(c.source) && c.hex !== "#FFFFFF");
  const print = kit.colours.filter((c) => isPrint(c.source));
  const white = kit.colours.filter((c) => c.hex === "#FFFFFF");
  const examples = kit.pieces.filter((p) => p.preview).slice(0, 3);
  void LEGALWEEK_EVENT;
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/events/kits/$kitId" params={{ kitId: "legalweek" }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Legalweek 2026 brand kit
      </Link>

      <header className="mt-4 rounded-lg p-8" style={{ background: NAVY }}>
        <p className="text-sm font-medium text-white/80" style={POPPINS}>TransPerfect Legal at Legalweek 2026</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-white" style={POPPINS}>Brand guide</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/80">Built from the supplied live files. No brand guide PDF was supplied for this event.</p>
      </header>

      <Section n="01" title="Introduction">
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{kit.intro}</p>
        {examples.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {examples.map((p) => (
              <figure key={p.title} className="overflow-hidden rounded-lg border border-border">
                <div className="flex h-48 items-center justify-center bg-muted p-3"><img src={p.preview!} alt={p.title} className="max-h-full max-w-full" /></div>
                <figcaption className="p-3 text-sm font-semibold text-foreground">{p.title}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </Section>

      <Section n="02" title="The logo">
        <p className="max-w-3xl text-sm text-muted-foreground">{kit.logoNote}</p>
      </Section>

      <Section n="03" title="Screen colours">
        <Swatches colours={[...screen, ...white]} />
        {kit.gradientNote && <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{kit.gradientNote}</p>}
      </Section>

      <Section n="04" title="Print colours">
        <Swatches colours={print} />
        {kit.colourNote && <p className="mt-3 max-w-3xl text-xs text-muted-foreground">{kit.colourNote}</p>}
      </Section>

      <Section n="05" title="Typography">
        <p className="max-w-3xl text-sm text-muted-foreground">{kit.typography}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {([["Poppins Regular", 400], ["Poppins SemiBold", 600], ["Poppins Bold", 700]] as const).map(([name, w]) => (
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
          The Legalweek package contains no don’ts list. None are shown here until the brand team supplies one.
        </p>
      </Section>
    </main>
  );
}

function Swatches({ colours }: { colours: typeof kit.colours }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {colours.map((c) => (
        <div key={c.name} className="overflow-hidden rounded-lg border border-border">
          <div className="h-24 border-b border-border" style={{ background: c.hex }} aria-hidden />
          <div className="p-4 text-sm">
            <p className="font-semibold text-foreground" style={POPPINS}>{c.name}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted-foreground">
              {c.cmyk && (<><dt className="font-medium text-foreground">CMYK</dt><dd>{c.cmyk}</dd></>)}
              {c.rgb && (<><dt className="font-medium text-foreground">RGB</dt><dd>{c.rgb}</dd></>)}
              <dt className="font-medium text-foreground">Web</dt><dd>{c.hex}{isPrint(c.source) ? " (screen preview)" : ""}</dd>
            </dl>
            {c.source && <p className="mt-2 text-xs text-muted-foreground">{c.source}</p>}
          </div>
        </div>
      ))}
    </div>
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
