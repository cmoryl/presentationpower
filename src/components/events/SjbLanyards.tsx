import { Download } from "lucide-react";
import { SJB_LANYARDS, type SjbLanyardInk } from "@/lib/sjb-lanyards";

const ink = (i: SjbLanyardInk) => (i.pantone ? `${i.label} ${i.pantone}` : i.label);

/** Lanyard spec: one row per colourway with a live material + imprint swatch strip. */
export function SjbLanyards() {
  const { title, subtitle, note, colourways, files } = SJB_LANYARDS;
  return (
    <section id="bowl-lanyards" className="space-y-3">
      <div>
        <h2 className="text-[17px] font-bold">{title}</h2>
        <p className="text-[13px] text-[#666666]">{subtitle}</p>
      </div>
      {files.preview && <img src={files.preview} alt="San Juan Bowl lanyard template: Sky, White, Navy, Gold Staff and Red lanyards repeating SAN JUAN BOWL and TRANSPERFECT" className="w-full rounded-lg border border-border bg-white" />}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12px]">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wide text-[#666666]">
              <th className="py-2 pr-3">Colourway</th><th className="py-2 pr-3">Material</th><th className="py-2">Imprint</th>
            </tr>
          </thead>
          <tbody>
            {colourways.map((w) => (
              <tr key={w.id} className="border-t border-border align-top">
                <td className="py-2 pr-3 font-semibold">{w.name}</td>
                <td className="py-2 pr-3 font-mono">{ink(w.material)}</td>
                <td className="py-2 font-mono">{w.imprint.map((i) => <div key={i.label}>{ink(i)}{i.text ? ` (${i.text})` : ""}</div>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-[#666666]">{note}</p>
      {files.pdf && (
        <a href={files.pdf} download="SJB_lanyard_template.pdf" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
          <Download className="h-3.5 w-3.5" /> Download print file (PDF)
        </a>
      )}
      {files.ai && (
        <a href={files.ai} download="SJB_lanyard_template.ai" className="ml-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
          <Download className="h-3.5 w-3.5" /> Download Illustrator file (AI)
        </a>
      )}
    </section>
  );
}
