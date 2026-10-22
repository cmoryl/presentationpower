// Stacked SAN JUAN BOWL lettering (2-line and 3-line; centred, left, right; BOWL full width)
// in the three lettering colourways. Files in public/downloads/sjb-lettering/stacked/ are
// built from the same exact construction as the single-line master (letters are exact copies,
// lines only moved; the full-width BOWL is the master scaled by exactly 13/8) — never redraw.
import { useState } from "react";
import { Download } from "lucide-react";
import { SjbLink } from "@/components/events/SjbShare";
import stacked from "@/lib/sjb-lettering-stacked.json";

const DIR = "/downloads/sjb-lettering/stacked";
const PNG = [1200, 2400, 4800] as const;
const chip =
  "inline-flex items-center gap-1 rounded-full border border-[#03002C]/15 px-2.5 py-0.5 text-[11.5px] font-semibold hover:border-[#003FC7] hover:text-[#003FC7]";

/** Compact = brand guide: centred 2-line, 3-line and full-width only, White on Navy. */
export function SjbLetteringStacked({ compact = false }: { compact?: boolean }) {
  const [cw, setCw] = useState(0);
  const colour = stacked.colourways[compact ? 0 : cw];
  const layouts = compact
    ? stacked.layouts.filter((l) => ["2-line", "full-width-bowl", "3-line"].includes(l.id))
    : stacked.layouts;
  return (
    <div className="space-y-3 rounded-xl border border-[#03002C]/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-[14px] font-bold">Stacked lettering</p>
          <p className="text-[12px] text-[#666666]">
            SAN JUAN / BOWL and SAN / JUAN / BOWL — centred, left or right aligned, plus BOWL spanning the full width of SAN JUAN.
            Same letters, gaps and shadow as the single-line master; lines 29 apart. Scale from the corners only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${DIR}/sjb-lettering-stacked-pack.zip`} download="sjb-lettering-stacked-pack.zip" className={`${chip} bg-[#03002C] text-white hover:bg-[#003FC7] hover:text-white`}>
            <Download className="h-3.5 w-3.5" /> All stacked files (ZIP)
          </a>
          <SjbLink page="lettering" className={chip}>Stacked rules →</SjbLink>
        </div>
      </div>
      {!compact && (
        <div role="radiogroup" aria-label="Colourway" className="flex flex-wrap gap-1">
          {stacked.colourways.map((c, i) => (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={cw === i}
              onClick={() => setCw(i)}
              className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${cw === i ? "border-[#03002C] bg-[#03002C] text-white" : "border-[#03002C]/15 hover:border-[#003FC7]"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className={`grid gap-4 ${compact ? "md:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {layouts.map((l) => {
          const id = `sjb-lettering-stacked-${l.id}${colour.suffix}`;
          return (
            <div key={l.id} className="space-y-2">
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-[#03002C]/15 p-5" style={{ background: colour.bg }}>
                <img src={`${DIR}/${id}.svg`} alt={`SAN JUAN BOWL stacked lettering, ${l.lines}, ${l.align.toLowerCase()}, ${colour.name}`} className="max-h-full max-w-full object-contain" />
              </div>
              <p className="text-[12px] font-semibold">
                {l.lines} <span className="font-normal text-[#666666]">· {l.align} · {l.aspect} : 1</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <a href={`${DIR}/${id}.svg`} download={`${id}.svg`} className={chip}><Download className="h-3 w-3" /> SVG</a>
                {PNG.map((w) => (
                  <a key={w} href={`${DIR}/${id}-${w}.png`} download={`${id}-${w}.png`} className={chip}>PNG {w}</a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {compact && (
        <p className="text-[12px] text-[#666666]">
          Left- and right-aligned versions and the Navy on White / Navy on Blue colourways are in the ZIP and on the brand kit.
        </p>
      )}
    </div>
  );
}
