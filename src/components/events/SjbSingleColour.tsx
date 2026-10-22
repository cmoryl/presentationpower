import { useState } from "react";
import { Download } from "lucide-react";
import { SjbLink } from "@/components/events/SjbShare";
import { Button } from "@/design-system/element";
import bSvg from "@/assets/san-juan-bowl/1c-black.svg.asset.json";
import bPng from "@/assets/san-juan-bowl/1c-black.png.asset.json";
import nSvg from "@/assets/san-juan-bowl/1c-navy.svg.asset.json";
import nPng from "@/assets/san-juan-bowl/1c-navy.png.asset.json";
import wSvg from "@/assets/san-juan-bowl/1c-white.svg.asset.json";
import wPng from "@/assets/san-juan-bowl/1c-white.png.asset.json";
import fbSvg from "@/assets/san-juan-bowl/1c-framed-black.svg.asset.json";
import fbPng from "@/assets/san-juan-bowl/1c-framed-black.png.asset.json";
import fnSvg from "@/assets/san-juan-bowl/1c-framed-navy.svg.asset.json";
import fnPng from "@/assets/san-juan-bowl/1c-framed-navy.png.asset.json";
import fwSvg from "@/assets/san-juan-bowl/1c-framed-white.svg.asset.json";
import fwPng from "@/assets/san-juan-bowl/1c-framed-white.png.asset.json";
import ubAi from "@/assets/san-juan-bowl/u-sjb-1c-black.ai.asset.json";
import ubEps from "@/assets/san-juan-bowl/u-sjb-1c-black.eps.asset.json";
import ubPng from "@/assets/san-juan-bowl/u-sjb-1c-black.png.asset.json";
import lbAi from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering_black.ai.asset.json";
import lbEps from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering_black.eps.asset.json";
import lbPng from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering-black.png.asset.json";
import lwSvg from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering_white.svg.asset.json";
import lwEps from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering_white.eps.asset.json";
import lwPng from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering-white.png.asset.json";
import unEps from "@/assets/san-juan-bowl/u-sjb-1c-Navy.eps.asset.json";
import unPng from "@/assets/san-juan-bowl/u-sjb-1c-Navy.png.asset.json";
import unSvg from "@/assets/san-juan-bowl/u-sjb-1c-Navy.svg.asset.json";
import uwEps from "@/assets/san-juan-bowl/u-sjb-1c-white.eps.asset.json";
import uwPng from "@/assets/san-juan-bowl/u-sjb-1c-white.png.asset.json";
import uwSvg from "@/assets/san-juan-bowl/u-sjb-1c-white.svg.asset.json";
import lnEps from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering_Navy.eps.asset.json";
import lnSvg from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering_Navy.svg.asset.json";
import lnPng from "@/assets/san-juan-bowl/u-sjb-san-juan-lettering-Navy.png.asset.json";
import pack from "@/assets/san-juan-bowl/1c-pack.zip.asset.json";

/** Supplied single-colour "K2 Night Sea" files. Ink values read from the SVG fills. */
const INKS = [
  { id: "black", name: "Black", hex: "#000000", ground: "#FFFFFF", plain: [bSvg, bPng], framed: [fbSvg, fbPng], use: "Light grounds when only black is available: newsprint, fax, laser, engraving, single-colour screen print, stamps." },
  { id: "navy", name: "Navy", hex: "#0D0E21", ground: "#FFFFFF", plain: [nSvg, nPng], framed: [fnSvg, fnPng], use: "Preferred one-colour version on white or light grounds; matches the event navy." },
  { id: "white", name: "White", hex: "#FFFFFF", ground: "#0D0E21", plain: [wSvg, wPng], framed: [fwSvg, fwPng], use: "Dark grounds: navy, black, dark blues (tested by the designer on #10224A and #1B3270), photos with a dark scrim, embroidery and foil on dark goods." },
] as const;

type Dl = { label: string; url: string };
/** Updated designer-supplied unframed Black, Navy and White masters (Oct 2026): AI, EPS and transparent PNG, served unchanged. */
const UPDATED: Record<string, { preview: string; files: Dl[] }> = {
  black: { preview: ubPng.url, files: [{ label: "AI", url: ubAi.url }, { label: "EPS", url: ubEps.url }, { label: "PNG", url: ubPng.url }] },
  navy: { preview: unSvg.url, files: [{ label: "SVG", url: unSvg.url }, { label: "EPS", url: unEps.url }, { label: "PNG", url: unPng.url }] },
  white: { preview: uwSvg.url, files: [{ label: "SVG", url: uwSvg.url }, { label: "EPS", url: uwEps.url }, { label: "PNG", url: uwPng.url }] },
};

/** Designer-supplied arched text-only lettering taken from the logo, served unchanged. */
const LETTERING = [
  { id: "black", name: "Black", ground: "#FFFFFF", preview: lbPng.url, files: [{ label: "AI", url: lbAi.url }, { label: "EPS", url: lbEps.url }, { label: "PNG", url: lbPng.url }], use: "Light grounds." },
  { id: "navy", name: "Navy", ground: "#FFFFFF", preview: lnSvg.url, files: [{ label: "SVG", url: lnSvg.url }, { label: "EPS", url: lnEps.url }, { label: "PNG", url: lnPng.url }], use: "Preferred on white or light grounds; matches the event navy." },
  { id: "white", name: "White", ground: "#0D0E21", preview: lwPng.url, files: [{ label: "SVG", url: lwSvg.url }, { label: "EPS", url: lwEps.url }, { label: "PNG", url: lwPng.url }], use: "Dark grounds and photos with a dark scrim." },
];

const RULES = [
  "Use one-colour only when full colour cannot reproduce: one-ink print, embroidery, laser etch, foil, deboss, vinyl cut, stencil, fax and newsprint.",
  "Use the supplied file for the ink you need. Never make your own by recolouring or flattening the full-colour logo; the one-colour drawing is redrawn (white sun on dark sky, white reflections on a dark sea, 6 px wave lines) so it reads in a single ink.",
  "Only the three supplied inks: Black, Navy (#0D0E21) or White. When we get to choose the one colour, navy is preferred. If only black and white are available, use black on light backgrounds and white on dark backgrounds. Any other single ink needs designer approval.",
  "Dark on light, white on dark. Never place navy or black on a dark ground, or white on a light one.",
  "Framed adds an outer border line around the badge. Use it on busy or mid-tone grounds and merchandise where the edge must stay clear; use unframed on clean flat grounds.",
  "Clear space, minimum sizes and misuse rules are the same as the full-colour logo.",
  "For print and production, send the vector files (SVG, PDF, EPS or AI) in the pack. PNGs are for screens and documents only.",
];

export interface SjbSingleColourProps { className?: string }

export function SjbSingleColour({ className }: SjbSingleColourProps) {
  const [framed, setFramed] = useState(false);
  return <section className={`space-y-4 ${className ?? ""}`} aria-labelledby="sjb-1c">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="sjb-1c" className="text-[20px] font-bold">Single-colour logo</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Supplied "K2 Night Sea" one-colour versions, in three inks, framed and unframed.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={framed ? "outline" : "default"} aria-pressed={!framed} onClick={() => setFramed(false)}>Unframed</Button>
        <Button size="sm" variant={framed ? "default" : "outline"} aria-pressed={framed} onClick={() => setFramed(true)}>Framed</Button>
        <Button asChild size="sm" variant="outline"><SjbLink page="single">Usage by process</SjbLink></Button>
        <Button asChild size="sm" variant="outline"><a href={pack.url} download><Download />Full pack (SVG, PDF, EPS, AI, PNG)</a></Button>
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {INKS.map(ink => { const [svg, png] = framed ? ink.framed : ink.plain; const upd = framed ? undefined : UPDATED[ink.id]; const files: Dl[] = upd ? upd.files : [{ label: "SVG", url: svg.url }, { label: "PNG", url: png.url }]; return <article key={ink.id} className="overflow-hidden rounded-md border border-border">
        <div className="aspect-square p-6" style={{ background: ink.ground }}><img src={upd ? upd.preview : svg.url} alt={`San Juan Bowl single-colour logo, ${ink.name}${framed ? ", framed" : ""}`} className="h-full w-full object-contain" /></div>
        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm border border-border" style={{ background: ink.hex }} /><h3 className="text-sm font-semibold">{ink.name}</h3><span className="font-mono text-xs text-muted-foreground">{ink.hex}</span></div>
          <p className="text-sm text-muted-foreground">{ink.use}</p>
          <div className="flex flex-wrap gap-2">{files.map(f => <Button key={f.label} asChild size="sm" variant="outline"><a href={f.url} download><Download />{f.label}</a></Button>)}</div>
        </div>
      </article>; })}
    </div>
    <ul className="list-disc space-y-1 pl-5 text-sm">{RULES.map(r => <li key={r}>{r}</li>)}</ul>
    <div className="space-y-3 pt-4">
      <div><h3 id="sjb-1c-lettering" className="text-[17px] font-bold">Lettering only (arched)</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">The arched TRANSPERFECT / SAN JUAN / BOWL wording from the logo, without the badge. Supplied files in one colour, transparent background.</p></div>
      <p role="note" className="rounded-md border border-border bg-muted p-3 text-sm font-semibold">Limited use, by approval only. This is not an official Bowl logo.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {LETTERING.map(l => <article key={l.id} className="overflow-hidden rounded-md border border-border">
          <div className="aspect-[5/2] p-6" style={{ background: l.ground }}><img src={l.preview} alt={`San Juan Bowl arched lettering only, ${l.name}`} className="h-full w-full object-contain" /></div>
          <div className="space-y-2 p-4">
            <h4 className="text-sm font-semibold">{l.name}</h4>
            <p className="text-sm text-muted-foreground">{l.use}</p>
            <div className="flex flex-wrap gap-2">{l.files.map(f => <Button key={f.label} asChild size="sm" variant="outline"><a href={f.url} download><Download />{f.label}</a></Button>)}</div>
          </div>
        </article>)}
      </div>
      <p className="text-sm text-muted-foreground">Use the lettering only where the badge cannot fit or is already shown nearby. Never re-set, stretch or flatten the arch; use the supplied files.</p>
    </div>
  </section>;
}
