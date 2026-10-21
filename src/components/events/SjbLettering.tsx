import { Download } from "lucide-react";

/** Straight-on and angled "SAN JUAN BOWL" lettering, flattened from the badge's own paths
 *  by scripts/sjb-straight-lettering.py. Angled versions are rotation/skew only — fixed aspect. */
const BASE = "/downloads/sjb-lettering";
export const SJB_LETTERING = [
  { id: "sjb-lettering-straight", name: "Straight — single line", note: "Front-on view. The default for banners, headers and marketing lines." },
  { id: "sjb-lettering-straight-stacked", name: "Straight — stacked", note: "SAN JUAN over BOWL for square and narrow spaces." },
  { id: "sjb-lettering-angled-rise", name: "Angled — rising 6°", note: "Single line tilted upward for energetic layouts." },
  { id: "sjb-lettering-angled-forward", name: "Angled — forward lean", note: "4° rise with a forward lean for motion and sport-style graphics." },
] as const;

export function SjbLettering() {
  return (
    <div className="rounded-2xl border border-[#03002C]/10 bg-white p-5 space-y-3">
      <h3 className="text-[15px] font-bold">Event name lettering</h3>
      <p className="text-[13px] text-[#03002C]/80">
        The badge's own SAN JUAN BOWL letters, straightened from the arch. Use these when the full badge
        won't fit. Files are editable vectors; scale them by the corners only — never stretch. White
        letters: dark backgrounds only.
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
    </div>
  );
}
