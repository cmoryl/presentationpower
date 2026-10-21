import { Download } from "lucide-react";

/** Straight-on "SAN JUAN BOWL" lettering rebuilt letter by letter from the badge by
 *  scripts/sjb-straight-lettering.py (one cap height, one gap, one shadow). Upright only. */
const BASE = "/downloads/sjb-lettering";
const pct = (v: number) => `${v.toFixed(1)}%`;

/** Supplied exact-construction master (SJB-Lettering-Exact.svg). Units: cap height 120. */
const EXACT = {
  id: "sjb-lettering-exact",
  w: 1453.0390625,
  h: 132.5625,
  cap: 120,
  pngWidths: [1200, 2400, 4800],
};
const ratio = EXACT.w / EXACT.h;

/** Colourways from the supplied lettering board. Same geometry; only face/shadow fills change. */
const COLOURWAYS = [
  { suffix: "", name: "White on Navy", bg: "#0D0E21", use: "white letters, blue shadow · dark backgrounds" },
  { suffix: "-navy", name: "Navy on White", bg: "#FFFFFF", use: "navy letters, blue shadow · white or light backgrounds" },
  { suffix: "-navy-white", name: "Navy on Blue", bg: "#00AAE7", use: "navy letters, white shadow · Bowl blue backgrounds" },
];
const capPct = (u: number) => pct((u / EXACT.cap) * 100);

function SjbLetteringExact() {
  const specs: [string, string][] = [
    ["Artwork size", `${EXACT.w} × ${EXACT.h} units (cap height 120)`],
    ["Aspect ratio", `${ratio.toFixed(4)} : 1 — fixed`],
    ["Stroke / stem", `33 units · ${capPct(33)} of letter height`],
    ["Letter gap", `12 units · ${capPct(12)}`],
    ["Word space", `29 units · ${capPct(29)}`],
    ["Shadow", `6.5625 right · 6.5625 down (${capPct(6.5625)}, exactly 45°)`],
    ["Chamfers / serifs", "17 at 45° · serifs 10.7266"],
    ["Diagonals", "A and W lean 7:24 (16.26°) · N slope 2:1"],
  ];
  const rules = [
    "Use the file as supplied: scale from the corners only, never stretch, squash, slant or re-space.",
    "Keep the blue shadow (#00AAE7) with its white letters; never move, recolour or remove it.",
    "White letters are for dark backgrounds only (Navy or darker); never place on busy photography.",
    "Leave clear space of at least one letter height (cap height) on every side.",
    "Don't retype the name in a font; always use this artwork.",
  ];
  return (
    <div className="space-y-3 rounded-xl border border-[#003FC7]/30 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-bold">Exact master — single line</p>
        <span className="text-[11px] font-semibold text-[#003FC7]">Use this version</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {COLOURWAYS.map((c) => {
          const id = `${EXACT.id}${c.suffix}`;
          return (
            <div key={c.suffix} className="space-y-2">
              <div className="flex aspect-[16/4] items-center justify-center rounded-xl border border-[#03002C]/15 p-8" style={{ background: c.bg }}>
                <img src={`${BASE}/${id}.svg`} alt={`SAN JUAN BOWL lettering, ${c.name}`} className="max-h-full max-w-full object-contain" />
              </div>
              <p className="text-[12px] font-semibold">{c.name} <span className="font-normal text-[#666666]">— {c.use}</span></p>
              <div className="flex flex-wrap gap-2">
                <a href={`${BASE}/${id}.svg`} download={`${id}.svg`} className="inline-flex items-center gap-1 rounded-full border border-[#03002C]/15 px-3 py-1 text-[12px] font-semibold hover:border-[#003FC7] hover:text-[#003FC7]">
                  <Download className="h-3.5 w-3.5" /> SVG (editable)
                </a>
                {EXACT.pngWidths.map((w) => (
                  <a key={w} href={`${BASE}/${id}-${w}.png`} download={`${id}-${w}.png`} className="inline-flex items-center gap-1 rounded-full border border-[#03002C]/15 px-3 py-1 text-[12px] font-semibold hover:border-[#003FC7] hover:text-[#003FC7]">
                    <Download className="h-3.5 w-3.5" /> PNG {w} × {Math.round(w / ratio)} px
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-1 text-[13px] font-bold">Construction and sizing</h4>
          <dl className="grid gap-1 text-[12px]">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-[#03002C]/10 py-1">
                <dt className="text-[#666666]">{k}</dt><dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[12px] text-[#666666]">
            Height at a given width = width ÷ {ratio.toFixed(4)}. E.g. 600 mm wide → {(600 / ratio).toFixed(1)} mm tall; 1920 px → {Math.round(1920 / ratio)} px.
          </p>
        </div>
        <div>
          <h4 className="mb-1 text-[13px] font-bold">Rules</h4>
          <ul className="list-disc space-y-1 pl-4 text-[12px] text-[#03002C]/80">
            {rules.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function SjbLettering() {
  return (
    <div className="rounded-2xl border border-[#03002C]/10 bg-white p-5 space-y-4">
      <h3 className="text-[15px] font-bold">Event name lettering</h3>
      <p className="text-[13px] text-[#03002C]/80">
        The approved SAN JUAN BOWL lettering, built to exact construction. Editable vector; scale by the corners only.
        White letters: dark backgrounds only.
      </p>
      <SjbLetteringExact />
    </div>
  );
}
