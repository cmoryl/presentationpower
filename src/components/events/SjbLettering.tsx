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
            letter. Corners are the designer's own chamfers. <a href={`${BASE}/sjb-lettering-audit.json`} download className="font-semibold text-[#003FC7]">Full measurements (JSON)</a>
          </p>
        </div>
      </details>
    </div>
  );
}
