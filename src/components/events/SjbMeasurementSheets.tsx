// Designer-supplied San Juan Bowl measurement sheets (SJB-Logo-Measurements.zip),
// measured from the final colour master SJB-Logo-color.eps. Values are copied
// verbatim from sheet 9; units are artboard px (1254 × 1254).
import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import s01 from "@/assets/san-juan-bowl/measurements/sheet-01.png.asset.json";
import s02 from "@/assets/san-juan-bowl/measurements/sheet-02.png.asset.json";
import s03 from "@/assets/san-juan-bowl/measurements/sheet-03.png.asset.json";
import s04 from "@/assets/san-juan-bowl/measurements/sheet-04.png.asset.json";
import s05 from "@/assets/san-juan-bowl/measurements/sheet-05.png.asset.json";
import s06 from "@/assets/san-juan-bowl/measurements/sheet-06.png.asset.json";
import s07 from "@/assets/san-juan-bowl/measurements/sheet-07.png.asset.json";
import s08 from "@/assets/san-juan-bowl/measurements/sheet-08.png.asset.json";
import pdf from "@/assets/san-juan-bowl/measurements/SJB-Logo-Measurements.pdf.asset.json";

const SHEETS = [
  { src: s01.url, title: "Construction and overall dimensions", note: "Centre axis x = 627; apex, bottom point, wall-to-wall 988.6, ribbon 1128.6, art width 1186.6." },
  { src: s02.url, title: "Border stack at the V", note: "Navy border 21.1, yellow band 16.00, clear channel to the water 13.5–20.7." },
  { src: s03.url, title: "Top band, keyline and birds", note: "Navy 21.8, yellow 16.1, white keyline 7.80; birds 84.0 × 46.4, 259.7 apart." },
  { src: s04.url, title: "Ribbon and TRANSPERFECT", note: "Yellow band 127.0 tall, cap height 78.4 with 24.3 clear above and below; stars 64.5." },
  { src: s05.url, title: "SAN JUAN BOWL wordmark", note: "Letters on an arc: S/N 198.8 tall, J 131.6; strokes 27–39; cyan extrusion ≈ 3.5 right, 8.0 down." },
  { src: s06.url, title: "Sun and water", note: "Sun Ø 198.39 cut 72.35 tall, ring 9.84, horizon bar 19.85; four reflection stripes." },
  { src: s07.url, title: "Fort, cupola, windows and clouds", note: "Fort 698.8 wide; windows 19.7 × 44.3; cupola 172 × 244.8; clouds 168 × 101." },
  { src: s08.url, title: "Palms", note: "Crown 278.6 wide at y 300; trunk base on the ribbon at (243.8, 485.9); right palm mirrored." },
];

const TABLE: [string, string][] = [
  ["Artboard", "1254 × 1254"],
  ["Art bounds", "1186.602 × 1161.699, offset (33.699, 46.151)"],
  ["Centre axis", "x = 627.000 (artwork mirror-exact outside the lettering)"],
  ["Apex / bottom point", "(627.00, 46.15) / (627.00, 1207.85)"],
  ["Upper edges", "23.1° from horizontal; 133.8° at the apex"],
  ["V edges", "≈ 32.7° chord, slightly bowed (30° at the walls → 23° at the point)"],
  ["Side walls", "x = 134.0 and 1122.6; wall-to-wall 988.6; walls 635.2 / 632.6 tall"],
  ["Navy outer border", "21.8 (top band), 21.1 (V), measured perpendicular"],
  ["Yellow band", "16.00 (top band 16.1)"],
  ["White keyline (fort, cupola, sky)", "7.80 (cupola 7.79–7.82)"],
  ["K frame (single-colour files)", "7.80, inner edge = silhouette"],
  ["Channel water → yellow V", "13.5–20.7 along the V (freehand water edge); 9.8 at the tip"],
  ["Ribbon", "1128.6 wide (62.7 → 1191.3); yellow band 127.0 tall; navy strips 11.6 above / 15.3 below"],
  ["TRANSPERFECT", "825 wide (215 → 1040); cap height 78.4; 24.3 clear above and below"],
  ["Stars", "64.5 × 64.3, centres (160.8, 575.1) and (1093.1, 575.1)"],
  ["SAN JUAN", "934 wide (158 → 1092); S 198.8, N 148.5, J 131.6 tall; strokes 27–39"],
  ["BOWL", "408 wide (421 → 829); B 101.5, O 90, W 85.8, L 98 tall"],
  ["Letter extrusion", "cyan 3D shadow ≈ 3.5 right, 8.0 down"],
  ["Sun", "Ø 198.39 (527.78 → 726.17), cut 72.35 tall (924.63 → 996.98); white ring 9.84; horizon bar 19.85"],
  ["Reflection stripes", "13.5 / 12.3 / 12.0 / 7.9 tall; 200.8 / 140.4 / 126.4 / 88.2 long; gaps 10.1 then ≈14.4 ×3; centred on x = 627"],
  ["Waves", "799.4 wide (227.3 → 1026.7), 862.3 → 1158.0 tall; white crests 265.4 → 988.6"],
  ["Fort", "698.8 wide (277.6 → 976.4), base y 506.65; windows 19.7 × 44.3"],
  ["Cupola", "172 wide at the drum (y 300), 244.8 tall (177.7 → 422.6)"],
  ["Sky", "532.5 × 300.7 (360.7 → 893.1, 90.4 → 391.0)"],
  ["Clouds", "168 × 101 each, mirrored (355 → 523, 218 → 319)"],
  ["Birds", "84.0 × 46.4 each; centres (497.5, 219.8) and (757.2, 219.8), 259.7 apart"],
  ["Palms", "crown 278.6 wide at y 300; frond tips (157.6, 221) (182.7, 226) (210.5, 238); trunk base on the ribbon at (243.8, 485.9); right palm mirrored"],
  ["Scale", "1 px = 0.0843 mm at a 100 mm-wide logo; = 1/1186.6 of the logo width"],
];

/** Linear features worth scaling for production (artboard px, from sheet 9). */
export const SJB_SCALE_FEATURES: [string, number][] = [
  ["Logo height", 1161.699],
  ["Navy outer border", 21.8],
  ["Yellow band", 16.0],
  ["White keyline / K frame", 7.8],
  ["Ribbon yellow band", 127.0],
  ["TRANSPERFECT cap height", 78.4],
  ["Star", 64.5],
  ["SAN JUAN outer letters (S/N)", 198.8],
  ["Letter extrusion (down)", 8.0],
  ["Sun diameter", 198.39],
  ["Thinnest reflection stripe", 7.9],
  ["Fort window width", 19.7],
];
export const SJB_ART_WIDTH = 1186.602;

export function scaleSjb(px: number, logoWidth: number): number {
  return (px / SJB_ART_WIDTH) * logoWidth;
}

type Unit = "mm" | "in" | "ft" | "m";

export function SjbMeasurementSheets() {
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const [width, setWidth] = useState(100);
  const [unit, setUnit] = useState<Unit>("mm");
  const digits = unit === "mm" ? 2 : 3;

  return (
    <section className="space-y-5" aria-labelledby="sjb-measure-h">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id="sjb-measure-h" className="text-xl font-semibold text-[#03002C]">Measurement sheets</h2>
          <p className="mt-1 text-[13px] leading-[1.4] text-[#666666]">
            Eight measured views and a full table from the designer, taken from the final colour master
            (SJB-Logo-color.eps). Units are artboard px on the 1254 × 1254 artboard.
          </p>
        </div>
        <a
          href={pdf.url}
          download="SJB-Logo-Measurements.pdf"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#03002C]"
        >
          <Download className="h-3.5 w-3.5" /> Measurements (PDF)
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SHEETS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setOpen(i)}
            className="group rounded-lg border border-[#03002C]/10 bg-white p-2 text-left focus-visible:outline-2 focus-visible:outline-[#003FC7]"
            aria-label={`View sheet ${i + 1}: ${s.title} larger`}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded bg-[#F2F2F2]">
              <img src={s.src} alt={`${s.title} measurement sheet`} loading="lazy" className="h-full w-full object-contain" />
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-[#03002C] shadow-sm group-hover:bg-[#003FC7] group-hover:text-white">
                <Maximize2 className="h-3.5 w-3.5" /> View larger
              </span>
            </div>
            <p className="mt-2 text-[12px] font-semibold text-[#03002C]">{i + 1} · {s.title}</p>
            <p className="mt-0.5 text-[11px] leading-[1.4] text-[#666666]">{s.note}</p>
          </button>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) { setOpen(null); setZoom(false); } }}>
        <DialogContent className="flex h-[94dvh] w-[96vw] max-w-[96vw] flex-col gap-3 p-4">
          {open !== null && (
            <>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <DialogTitle className="mr-auto">{open + 1} · {SHEETS[open].title}</DialogTitle>
                <button type="button" onClick={() => setOpen((open + SHEETS.length - 1) % SHEETS.length)} className="inline-flex items-center rounded border px-2 py-1 text-[12px]" aria-label="Previous sheet"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => setOpen((open + 1) % SHEETS.length)} className="inline-flex items-center rounded border px-2 py-1 text-[12px]" aria-label="Next sheet"><ChevronRight className="h-4 w-4" /></button>
                <button type="button" onClick={() => setZoom((z) => !z)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] font-semibold">
                  {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />} {zoom ? "Fit to screen" : "Zoom 200%"}
                </button>
                <a href={SHEETS[open].src} target="_blank" rel="noreferrer" className="rounded border px-2 py-1 text-[12px] font-semibold">Open full size</a>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded bg-[#F2F2F2]">
                <img
                  src={SHEETS[open].src}
                  alt={`${SHEETS[open].title} measurement sheet, enlarged`}
                  onClick={() => setZoom((z) => !z)}
                  className={zoom ? "max-w-none cursor-zoom-out" : "mx-auto h-full w-full cursor-zoom-in object-contain"}
                  style={zoom ? { width: "200%" } : undefined}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="overflow-x-auto">
          <h3 className="mb-2 text-[14px] font-semibold text-[#03002C]">Measurement table</h3>
          <table className="w-full text-left text-[12px]">
            <tbody>
              {TABLE.map(([k, v]) => (
                <tr key={k} className="border-b border-[#03002C]/10 align-top">
                  <th scope="row" className="py-1.5 pr-3 font-semibold text-[#03002C]">{k}</th>
                  <td className="py-1.5 text-[#03002C]">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-[#03002C]/10 bg-[#EEF1F7] p-4">
          <h3 className="text-[14px] font-semibold text-[#03002C]">Scale to your size</h3>
          <p className="mt-1 text-[12px] leading-[1.4] text-[#666666]">
            Enter the finished logo width; every feature scales by width ÷ 1186.6.
          </p>
          <div className="mt-3 flex gap-2">
            <label className="flex-1 text-[11px] font-semibold text-[#03002C]">
              Logo width
              <input
                type="number"
                min={1}
                step="any"
                value={width}
                onChange={(e) => setWidth(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-full rounded border border-[#03002C]/20 bg-white px-2 py-1.5 text-[13px]"
              />
            </label>
            <label className="text-[11px] font-semibold text-[#03002C]">
              Unit
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="mt-1 block rounded border border-[#03002C]/20 bg-white px-2 py-1.5 text-[13px]"
              >
                <option value="mm">mm</option>
                <option value="in">in</option>
                <option value="ft">ft</option>
                <option value="m">m</option>
              </select>
            </label>
          </div>
          <table className="mt-3 w-full text-[12px]">
            <tbody>
              {SJB_SCALE_FEATURES.map(([k, px]) => (
                <tr key={k} className="border-b border-[#03002C]/10">
                  <th scope="row" className="py-1 pr-2 text-left font-medium text-[#03002C]">{k}</th>
                  <td className="py-1 text-right tabular-nums text-[#03002C]">
                    {scaleSjb(px, width).toFixed(digits)} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
