import { useState } from "react";
import { Download } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
import pack from "@/assets/san-juan-bowl/1c-pack.zip.asset.json";

/** Supplied single-colour "K2 Night Sea" files. Ink values read from the SVG fills. */
const INKS = [
  { id: "black", name: "Black", hex: "#000000", ground: "#FFFFFF", plain: [bSvg, bPng], framed: [fbSvg, fbPng], use: "Light grounds when only black is available: newsprint, fax, laser, engraving, single-colour screen print, stamps." },
  { id: "navy", name: "Navy", hex: "#0D0E21", ground: "#FFFFFF", plain: [nSvg, nPng], framed: [fnSvg, fnPng], use: "Preferred one-colour version on white or light grounds; matches the event navy." },
  { id: "white", name: "White", hex: "#FFFFFF", ground: "#0D0E21", plain: [wSvg, wPng], framed: [fwSvg, fwPng], use: "Dark grounds: navy, black, dark blues (tested by the designer on #10224A and #1B3270), photos with a dark scrim, embroidery and foil on dark goods." },
] as const;

const RULES = [
  "Use one-colour only when full colour cannot reproduce: one-ink print, embroidery, laser etch, foil, deboss, vinyl cut, stencil, fax and newsprint.",
  "Use the supplied file for the ink you need. Never make your own by recolouring or flattening the full-colour logo; the one-colour drawing is redrawn (white sun on dark sky, white reflections on a dark sea, 6 px wave lines) so it reads in a single ink.",
  "Only the three supplied inks: Black, Navy (#0D0E21) or White. Any other single ink needs designer approval.",
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
        <Button asChild size="sm" variant="outline"><Link to="/events/san-juan-bowl/brand-kit/single-colour">Usage by process</Link></Button>
        <Button asChild size="sm" variant="outline"><a href={pack.url} download><Download />Full pack (SVG, PDF, EPS, AI, PNG)</a></Button>
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {INKS.map(ink => { const [svg, png] = framed ? ink.framed : ink.plain; return <article key={ink.id} className="overflow-hidden rounded-md border border-border">
        <div className="aspect-square p-6" style={{ background: ink.ground }}><img src={svg.url} alt={`San Juan Bowl single-colour logo, ${ink.name}${framed ? ", framed" : ""}`} className="h-full w-full object-contain" /></div>
        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2"><span className="h-4 w-4 rounded-sm border border-border" style={{ background: ink.hex }} /><h3 className="text-sm font-semibold">{ink.name}</h3><span className="font-mono text-xs text-muted-foreground">{ink.hex}</span></div>
          <p className="text-sm text-muted-foreground">{ink.use}</p>
          <div className="flex gap-2"><Button asChild size="sm" variant="outline"><a href={svg.url} download><Download />SVG</a></Button><Button asChild size="sm" variant="outline"><a href={png.url} download><Download />PNG</a></Button></div>
        </div>
      </article>; })}
    </div>
    <ul className="list-disc space-y-1 pl-5 text-sm">{RULES.map(r => <li key={r}>{r}</li>)}</ul>
  </section>;
}
