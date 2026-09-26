// The supplied GlobalLinkNEXT 3D directional arrow: the live Illustrator file,
// the example PDFs, and a proof of each printed face.
//
// Presentational only. The proofs are renders of the supplied artwork — they are
// labelled as proofs so nobody sends one to press in place of the master.

import { Download, FileText, Ruler } from "lucide-react";

import {
  ARROW_FACES,
  ARROW_FLOOR_LISTING,
  ARROW_FOOT_LINE,
  NEXT_DIRECTIONAL_ARROW,
  arrowPrintedAreaSqFt,
} from "@/lib/next-directional-arrow";

const FILES = [
  NEXT_DIRECTIONAL_ARROW.files.live,
  NEXT_DIRECTIONAL_ARROW.files.facePdf,
  NEXT_DIRECTIONAL_ARROW.files.noGuidesPdf,
];

export function DirectionalArrowPanel() {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#03002C]">
        <Ruler className="h-4 w-4 text-[#003FC7]" />
        {NEXT_DIRECTIONAL_ARROW.event} — {NEXT_DIRECTIONAL_ARROW.name}
      </h2>
      <p className="mt-1 max-w-3xl text-[13px] text-black/60">{NEXT_DIRECTIONAL_ARROW.intro}</p>
      <p className="mt-2 text-[12px] text-black/50">
        {NEXT_DIRECTIONAL_ARROW.structure} · {NEXT_DIRECTIONAL_ARROW.substrate} ·{" "}
        {arrowPrintedAreaSqFt()} sq ft printed across the three faces · issued{" "}
        {NEXT_DIRECTIONAL_ARROW.issued}
      </p>

      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {ARROW_FACES.map((face) => (
          <li key={face.id} className="rounded-xl border border-black/10 bg-white p-3">
            <div className="overflow-hidden rounded-lg border border-black/10 bg-muted">
              <img
                src={face.proofUrl}
                alt={`${face.name} — supplied artwork proof`}
                className="block h-40 w-full object-contain"
              />
            </div>
            <p className="mt-2 text-[13px] font-medium text-[#03002C]">{face.name}</p>
            <p className="font-mono text-[11px] text-black/45">
              page {face.page} · {face.sizeLabel} · {face.bleedIn}&quot; bleed
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-black/60">{face.role}</p>
            <p className="mt-1 text-[11px] text-black/40">Screen proof — not a press master.</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h3 className="text-[12px] font-semibold tracking-[0.12em] text-[#666] uppercase">
            Files
          </h3>
          <ul className="mt-2 space-y-2">
            {FILES.map((file) => (
              <li key={file.url}>
                <a
                  href={file.url}
                  download={file.filename}
                  className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-[13px] text-[#03002C] hover:bg-[#F2F2F2]"
                >
                  {file.format.startsWith("PDF") ? (
                    <FileText className="h-3.5 w-3.5 text-[#003FC7]" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-[#003FC7]" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                  <span className="text-[11px] text-black/45">{file.format}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-black/45">
            {NEXT_DIRECTIONAL_ARROW.colourSpace}.
          </p>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h3 className="text-[12px] font-semibold tracking-[0.12em] text-[#666] uppercase">
            What the face says
          </h3>
          <dl className="mt-2 space-y-2">
            {ARROW_FLOOR_LISTING.map((group) => (
              <div key={group.floor}>
                <dt className="text-[12px] font-semibold text-[#03002C]">{group.floor}</dt>
                <dd className="text-[13px] text-black/65">{group.rooms.join(" · ")}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-black/40">
            {ARROW_FOOT_LINE}
          </p>
          <p className="mt-2 text-[11px] text-black/45">
            Copy as issued in the supplied file — change it in the live file, not here.
          </p>
        </div>
      </div>
    </section>
  );
}
