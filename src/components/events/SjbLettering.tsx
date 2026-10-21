import { Download } from "lucide-react";
import audit from "../../../public/downloads/sjb-lettering/sjb-lettering-audit.json";

/** Straight-on "SAN JUAN BOWL" lettering rebuilt letter by letter from the badge by
 *  scripts/sjb-straight-lettering.py (one cap height, one gap, one shadow). Upright only. */
const BASE = "/downloads/sjb-lettering";
export const SJB_LETTERING = [
  { id: "sjb-lettering-straight", name: "Straight — single line", note: "Front-on view for banners, headers and marketing lines." },
  { id: "sjb-lettering-straight-stacked", name: "Straight — stacked", note: "SAN JUAN over BOWL for square and narrow spaces." },
] as const;

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
      <div className="flex aspect-[16/4] items-center justify-center rounded-xl bg-[#03002C] p-8">
        <img src={`${BASE}/${EXACT.id}.svg`} alt="SAN JUAN BOWL lettering, exact master" className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`${BASE}/${EXACT.id}.svg`} download={`${EXACT.id}.svg`} className="inline-flex items-center gap-1 rounded-full border border-[#03002C]/15 px-3 py-1 text-[12px] font-semibold hover:border-[#003FC7] hover:text-[#003FC7]">
          <Download className="h-3.5 w-3.5" /> SVG (editable)
        </a>
        {EXACT.pngWidths.map((w) => (
          <a key={w} href={`${BASE}/${EXACT.id}-${w}.png`} download={`${EXACT.id}-${w}.png`} className="inline-flex items-center gap-1 rounded-full border border-[#03002C]/15 px-3 py-1 text-[12px] font-semibold hover:border-[#003FC7] hover:text-[#003FC7]">
            <Download className="h-3.5 w-3.5" /> PNG transparent {w} × {Math.round(w / ratio)} px
          </a>
        ))}
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
  const cap = audit.cap_height;
  return (
    <div className="rounded-2xl border border-[#03002C]/10 bg-white p-5 space-y-4">
      <h3 className="text-[15px] font-bold">Event name lettering</h3>
      <p className="text-[13px] text-[#03002C]/80">
        The badge's own SAN JUAN BOWL letters, taken off the arch and stood upright. Every letter has the same height,
        every gap is the same, and every letter carries the same shadow. Files are editable vectors (one group per letter);
        scale by the corners only. White letters: dark backgrounds only.
      </p>
      <SjbLetteringExact />
      <h4 className="text-[13px] font-bold">Earlier rebuilds</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        {SJB_LETTERING.map((l) => (
          <div key={l.id} className="space-y-2">
            <div className="flex aspect-[16/7] items-center justify-center rounded-xl bg-[#03002C] p-6">
              <img src={`${BASE}/${l.id}.svg`} alt={`SAN JUAN BOWL lettering, ${l.name}`} className="max-h-full max-w-full object-contain" />
            </div>
            <p className="text-[13px] font-semibold">{l.name}</p>
            <p className="text-[12px] text-[#666666]">{l.note}</p>
            <div className="flex flex-wrap gap-2">
              {(["svg", "pdf", "png"] as const).map((ext) => (
                <a key={ext} href={`${BASE}/${l.id}.${ext}`} download={`${l.id}.${ext}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[#03002C]/15 px-3 py-1 text-[12px] font-semibold hover:border-[#003FC7] hover:text-[#003FC7]">
                  <Download className="h-3.5 w-3.5" /> {ext === "png" ? "PNG (transparent)" : ext.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-[13px] font-bold">Spacing and shadow — as a share of letter height</h4>
        <dl className="grid gap-2 sm:grid-cols-4 text-[12px]">
          {[
            ["Letter height", "100%"],
            ["Gap between letters", pct((audit.letter_gap / cap) * 100)],
            ["Word space", pct((audit.word_space / cap) * 100)],
            ["Shadow", `${pct((audit.shadow_offset.dx / cap) * 100)} right · ${pct((audit.shadow_offset.dy / cap) * 100)} down`],
            ["Line gap (stacked)", pct((audit.stacked_line_gap / cap) * 100)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-[#03002C]/10 bg-[#F2F2F2]/60 px-3 py-2">
              <dt className="text-[#666666]">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <details className="text-[12px]">
        <summary className="cursor-pointer font-semibold text-[#003FC7]">Letter-by-letter audit</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[#666666]">
              <tr><th className="py-1 pr-3">Letter</th><th className="pr-3">Lean removed</th><th className="pr-3">Tilt removed</th><th className="pr-3">Drawing</th><th className="pr-3">Badge shadow (right · down)</th><th>Shadow match</th></tr>
            </thead>
            <tbody>
              {audit.letters.map((r, i) => (
                <tr key={i} className="border-t border-[#03002C]/10">
                  <td className="py-1 pr-3 font-semibold">{r.letter}</td>
                  <td className="pr-3">{r.lean_removed_deg.toFixed(1)}°</td>
                  <td className="pr-3">{r.tilt_removed_deg.toFixed(1)}°</td>
                  <td className="pr-3">{r.drawing_used}</td>
                  <td className="pr-3">{r.shadow_fit.dx} · {r.shadow_fit.dy}</td>
                  <td>{(r.shadow_fit.iou * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[#666666]">
            The badge's shadow drifts from letter to letter because of the arch; the lettering uses the middle value for every
            letter. Every edge within a few degrees of level, upright or 45° is set exactly to it, broken edges are joined into one line, and level edges that sit at nearly the same height across letters (tops, bars, serifs) share one height. <a href={`${BASE}/sjb-lettering-audit.json`} download className="font-semibold text-[#003FC7]">Full measurements (JSON)</a>
          </p>
        </div>
      </details>
    </div>
  );
}
