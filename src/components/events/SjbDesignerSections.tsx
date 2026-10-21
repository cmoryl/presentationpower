// Technical San Juan Bowl logo sections for designers and print vendors:
// construction grid + measurements (with the 3D dissection) and large format.
import { Download } from "lucide-react";
import { SjbPrecisionConstruction } from "@/components/events/SjbPrecisionConstruction";
import { SjbMeasurementSheets } from "@/components/events/SjbMeasurementSheets";
import { SJB_CLEAR_SPACE, SJB_CONSTRUCTION, SJB_LARGE_FORMAT } from "@/lib/san-juan-bowl";

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";

export function ConstructionSection() {
  const c = SJB_CONSTRUCTION;
  const rows = [
    { el: "Badge width", x: `${c.badge.w}x`, pct: "100%" },
    { el: "Badge height", x: `${c.badge.h}x`, pct: "98.6% of width" },
    { el: "Yellow banner", x: `${c.banner.w}x × 1x`, pct: `${SJB_CLEAR_SPACE.bannerPctOfBadge}% of badge height` },
    { el: "Clear space", x: `${c.clearSpace}x per side`, pct: "Scales with the badge" },
    { el: "Minimum footprint", x: `${c.footprint.w}x × ${c.footprint.h}x`, pct: "Badge + clear space" },
    { el: "Artboard padding", x: `${c.canvasPadPct.x}% / ${c.canvasPadPct.y}%`, pct: "Horizontal / vertical, inside the supplied file" },
  ];
  return (
    <div className={`${card} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold">Construction &amp; measurements</h3>
          <p className="mt-1 text-[13px] text-[#03002C]/80">
            Every distance is measured from the supplied artwork and expressed in <strong>x</strong>, where{" "}
            <strong>{c.unit}</strong>. Use these ratios to size, space and align the badge at any scale.
          </p>
        </div>
        <a
          href="/downloads/san-juan-bowl-logo-construction-sheet.pdf"
          download="san-juan-bowl-logo-construction-sheet.pdf"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#03002C]"
        >
          <Download className="h-3.5 w-3.5" /> Construction sheet (PDF)
        </a>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SjbPrecisionConstruction className="lg:col-span-2" />
        <div className="lg:col-span-2">
          <SjbMeasurementSheets />
        </div>
        <div className="space-y-3">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#03002C]/15 text-[11px] uppercase tracking-wide text-[#666666]">
                <th className="py-1.5 pr-3 font-semibold">Element</th>
                <th className="py-1.5 pr-3 font-semibold">x-units</th>
                <th className="py-1.5 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.el} className="border-b border-[#03002C]/8">
                  <td className="py-1.5 pr-3 font-semibold">{r.el}</td>
                  <td className="py-1.5 pr-3 font-mono text-[12px]">{r.x}</td>
                  <td className="py-1.5 text-[12px] text-[#666666]">{r.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="list-disc space-y-1 pl-5 text-[12px] text-[#03002C]/80">
            <li>Use the measured source-coordinate bounds above for exact placement; the ratios below are rounded reference values.</li>
            <li>{c.scaleNote}</li>
            <li>The supplied file is a square artboard; keep that square intact when placing the artwork.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function LargeFormatSection() {
  const lf = SJB_LARGE_FORMAT;
  return (
    <div className={`${card} space-y-4`}>
      <div>
        <h3 className="text-[15px] font-bold">Large-format &amp; signage</h3>
        <p className="mt-1 text-[13px] text-[#03002C]/80">{lf.intro}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#03002C]/15 text-[11px] uppercase tracking-wide text-[#666666]">
              <th className="py-1.5 pr-3 font-semibold">Badge width</th>
              <th className="py-1.5 pr-3 font-semibold">x (clear space)</th>
              <th className="py-1.5 font-semibold">Typical use</th>
            </tr>
          </thead>
          <tbody>
            {lf.scale.map((r) => (
              <tr key={r.width} className="border-b border-[#03002C]/8">
                <td className="py-1.5 pr-3 font-semibold">{r.width}</td>
                <td className="py-1.5 pr-3 font-mono text-[12px]">{r.x}</td>
                <td className="py-1.5 text-[12px] text-[#666666]">{r.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="list-disc space-y-1.5 pl-5 text-[12px] text-[#03002C]/80">
          {lf.production.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

