// /events/san-juan-bowl/brand-kit/single-colour — one-colour usage by process
// (embroidery, foil, etching, one-ink print) with event-colour ink choices.
// Sizes are recommended starting points; the vendor's proof decides.

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/design-system/element";
import { SJB_COLORS, SJB_EVENT, sjbContrast } from "@/lib/san-juan-bowl";
import whiteSvg from "@/assets/san-juan-bowl/1c-white.svg.asset.json";
import pack from "@/assets/san-juan-bowl/1c-pack.zip.asset.json";

export const Route = createFileRoute("/events/san-juan-bowl_/brand-kit_/single-colour")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl single-colour logo usage · TransPerfect Element" },
      { name: "description", content: "How to use the San Juan Bowl one-colour logo for embroidery, foil, etching and one-ink print, with sizes and event-colour inks." },
      { property: "og:title", content: "San Juan Bowl single-colour usage" },
      { property: "og:description", content: "Embroidery, foil, etching and one-ink print sizes and inks for the San Juan Bowl logo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SingleColourPage,
});

const hex = (n: string) => SJB_COLORS.find(c => c.name === n)!.hex;
const NAVY = hex("Bowl Navy"), SKY = hex("Caribbean Sky"), GOLD = hex("Banner Gold"), WHITE = hex("White");

/** Ink × ground pairs. Navy and White are supplied files; Sky and Gold are tints of the supplied drawing. */
const PAIRS = [
  { ink: "Bowl Navy", inkHex: NAVY, ground: "White", groundHex: WHITE, supplied: true },
  { ink: "White", inkHex: WHITE, ground: "Bowl Navy", groundHex: NAVY, supplied: true },
  { ink: "Banner Gold", inkHex: GOLD, ground: "Bowl Navy", groundHex: NAVY, supplied: false },
  { ink: "Caribbean Sky", inkHex: SKY, ground: "Bowl Navy", groundHex: NAVY, supplied: false },
  { ink: "White", inkHex: WHITE, ground: "Caribbean Sky", groundHex: SKY, supplied: false },
  { ink: "Bowl Navy", inkHex: NAVY, ground: "Banner Gold", groundHex: GOLD, supplied: false },
];

const PROCESSES = [
  {
    id: "embroidery", name: "Embroidery", intro: "Stitched thread on apparel, caps and bags. The digitiser converts the vector file into stitches.",
    sizes: [["Minimum badge width", "60 mm"], ["Cap front", "60–65 mm"], ["Left chest", "75–90 mm"], ["Full back / jacket", "200–280 mm"]],
    inks: "Navy thread on white or light goods; white or gold thread on navy goods. Thread matched to the event colour by the supplier (e.g. Madeira or Isacord card).",
    rules: ["Below 75 mm the wave stripes and TRANSPERFECT letters need digitiser simplification; approve a stitch-out before production.", "Keep stitched lines at least 1 mm wide; finer detail fills in.", "Use the framed version on textured or heathered fabric so the edge holds."],
  },
  {
    id: "foil", name: "Foil stamping", intro: "Metallic or pigment foil pressed with a heated die onto card, covers and packaging.",
    sizes: [["Minimum badge width", "30 mm"], ["Recommended", "40 mm and up"], ["Finest line", "0.3 mm"], ["Smallest gap", "0.4 mm"]],
    inks: "Gold metallic foil on navy stock is the signature finish; white or navy pigment foil on light stock. Metallic foil has no hex value — approve from the foil maker's swatch.",
    rules: ["Very fine reflection stripes can fill in on soft or textured stock; ask the die-maker to check before cutting.", "Do not combine foil with a printed version of the logo on the same piece at the same size.", "Send the vector file; the die is made from it."],
  },
  {
    id: "etching", name: "Laser etching & engraving", intro: "Marks burned or cut into metal, glass, wood or acrylic for awards, gifts and plaques.",
    sizes: [["Minimum on metal / glass", "20 mm"], ["Minimum on wood / acrylic", "25 mm"], ["Awards / plaques", "50–100 mm"], ["Finest line", "0.2 mm"]],
    inks: "No ink — the mark is the material's own tone. Treat the etched area as the logo colour and the surface as the ground; check the etch reads darker or lighter than the surface, never similar.",
    rules: ["Use the black file as the etch map: black areas are etched.", "On dark anodised metal etched areas turn light, so the result looks like the white version — that is correct.", "Test on a sample of the real material first."],
  },
  {
    id: "one-ink", name: "One-ink print", intro: "A single printed colour: screen print, pad print, offset or digital one-colour jobs.",
    sizes: [["Offset / digital minimum", "25 mm"], ["Screen print minimum", "40 mm"], ["Pad print (pens, small items)", "20 mm"], ["Finest line", "0.25 mm offset · 0.5 mm screen"]],
    inks: "Navy on white, white on navy, or one of the event colours below. Spot inks are matched by the printer to the event colour from a physical swatch, never from a screen.",
    rules: ["Under 25 mm the reflection stripes merge; that is accepted for pad print only.", "Never print a tint (screen) of the ink to fake a second colour.", "Gold ink on white is not allowed — it does not read."],
  },
] as const;

function Tinted({ ink, ground, label }: { ink: string; ground: string; label: string }) {
  const mask = `url(${whiteSvg.url}) center / contain no-repeat`;
  return <div className="aspect-square p-6" style={{ background: ground }}>
    <div role="img" aria-label={label} className="h-full w-full" style={{ background: ink, WebkitMask: mask, mask }} />
  </div>;
}

function SingleColourPage() {
  const [proc, setProc] = useState<string>(PROCESSES[0].id);
  const p = PROCESSES.find(x => x.id === proc)!;
  return <AppShell>
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-8 text-foreground">
      <Link to="/events/san-juan-bowl/brand-kit" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Brand kit
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Brand kit · Single colour</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">{SJB_EVENT.name}: one-colour usage</h1>
          <p className="mt-1 text-sm text-muted-foreground">Embroidery, foil, etching and one-ink print. Sizes are recommended starting points — the vendor's sample or proof has the final say.</p></div>
        <Button asChild variant="outline"><a href={pack.url} download><Download />Single-colour pack</a></Button>
      </header>

      <section className="space-y-4" aria-labelledby="inks">
        <div><h2 id="inks" className="text-[20px] font-bold">Event-colour inks</h2>
          <p className="mt-1 text-sm text-muted-foreground">Contrast is calculated from the event colours. Navy and White are supplied files; the others are the same drawing in an event colour and need designer sign-off before use.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAIRS.map(x => { const r = sjbContrast(x.inkHex, x.groundHex); return <article key={x.ink + x.ground} className="overflow-hidden rounded-md border border-border">
            <Tinted ink={x.inkHex} ground={x.groundHex} label={`${x.ink} logo on ${x.ground}`} />
            <div className="space-y-1 p-4 text-sm">
              <h3 className="font-semibold">{x.ink} on {x.ground}</h3>
              <p className="font-mono text-xs text-muted-foreground">{x.inkHex} on {x.groundHex} · {r.toFixed(1)}:1</p>
              <p className={x.supplied ? "text-foreground" : "text-muted-foreground"}>{x.supplied ? "Supplied file — approved." : "Event-colour option — needs designer sign-off."}</p>
            </div>
          </article>; })}
        </div>
        <p className="text-sm text-muted-foreground">Not allowed: Gold or Sky on white, Navy on Sky, any ink on a ground of similar lightness.</p>
      </section>

      <section className="space-y-4" aria-labelledby="proc">
        <h2 id="proc" className="text-[20px] font-bold">By process</h2>
        <div role="tablist" aria-label="Process" className="flex flex-wrap gap-2">
          {PROCESSES.map(x => <Button key={x.id} role="tab" aria-selected={proc === x.id} size="sm" variant={proc === x.id ? "default" : "outline"} onClick={() => setProc(x.id)}>{x.name}</Button>)}
        </div>
        <div role="tabpanel" className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm">{p.intro}</p>
            <table className="w-full text-sm"><tbody>{p.sizes.map(([k, v]) => <tr key={k} className="border-b border-border"><th scope="row" className="py-2 text-left font-normal text-muted-foreground">{k}</th><td className="py-2 text-right font-mono">{v}</td></tr>)}</tbody></table>
            <p className="text-xs text-muted-foreground">Badge width is the full badge, edge to edge. Clear space (one banner height, about 1/7 of the width) applies on every side.</p>
          </div>
          <div className="space-y-3 text-sm">
            <div><h3 className="font-semibold">Inks</h3><p className="mt-1 text-muted-foreground">{p.inks}</p></div>
            <div><h3 className="font-semibold">Rules</h3><ul className="mt-1 list-disc space-y-1 pl-5">{p.rules.map(r => <li key={r}>{r}</li>)}</ul></div>
          </div>
        </div>
      </section>

      <section className="space-y-2" aria-labelledby="all-sizes">
        <h2 id="all-sizes" className="text-[20px] font-bold">Minimum sizes at a glance</h2>
        <table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2 font-normal">Process</th><th className="py-2 font-normal">Minimum width</th><th className="py-2 font-normal">Finest line</th></tr></thead>
          <tbody>{[["Embroidery", "60 mm", "1 mm"], ["Foil stamping", "30 mm", "0.3 mm"], ["Laser etching (metal / glass)", "20 mm", "0.2 mm"], ["Offset / digital one-ink", "25 mm", "0.25 mm"], ["Screen print", "40 mm", "0.5 mm"], ["Pad print", "20 mm", "—"]].map(r => <tr key={r[0]} className="border-b border-border">{r.map((c, i) => <td key={i} className={`py-2 ${i ? "font-mono" : ""}`}>{c}</td>)}</tr>)}</tbody></table>
      </section>
    </div>
  </AppShell>;
}
