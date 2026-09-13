// KitQrCreator — the QR creator that ships inside every event kit.
//
// Uses exactly the same QR engine and option set as the pillar / signage
// editors: real level-H codes from buildPillarQr (vector modules, never
// raster), the approved module styles, the same ink / plate rules and the same
// minimum-contrast scan guard. Output is vector SVG plus a 2x PNG proof, so a
// kit recipient can drop the code into print or digital without coming back to
// an admin screen.

import { useMemo, useRef, useState } from "react";
import { Check, Copy, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { buildPillarQr } from "@/lib/pillar-qr";
import { logKitQrDownload } from "@/lib/kit-qr-downloads";
import {
  PILLAR_CAPTION_FONTS,
  PILLAR_QR_MIN_CONTRAST,
  PILLAR_QR_STYLES,
  pillarContrastRatio,
  type PillarCaptionAlign,
  type PillarCaptionFontId,
  type PillarQrStyleId,
} from "@/lib/next-pillar-masters";

export type KitQrCreatorProps = {
  /** Payload the creator opens with — usually the kit's registration URL. */
  defaultData?: string;
  /** Caption the creator opens with. */
  defaultCaption?: string;
  /** Filename stem for downloads. */
  fileStem?: string;
  /** Stable id of the kit this creator sits in — used for download tracking. */
  kitId?: string;
  /** Human name of the kit, shown on the downloads dashboard. */
  kitLabel?: string;
  className?: string;
};

const CAPTION_ALIGNS: PillarCaptionAlign[] = ["left", "center", "right"];

const INKS = [
  { id: "#03002C", label: "Blue 800" },
  { id: "#003FC7", label: "Blue 500" },
  { id: "#FFFFFF", label: "White" },
];

const PLATES = [
  { id: "#FFFFFF", label: "White" },
  { id: "#E0E8F5", label: "Blue white" },
  { id: "#F2F2F2", label: "Light gray" },
  { id: "#03002C", label: "Blue 800" },
];

/** Build the printable SVG for a code — the single source for preview + export. */
function qrSvg(opts: {
  data: string;
  style: PillarQrStyleId;
  ink: string;
  plate: string;
  transparent: boolean;
  radius: number;
  sizeMm: number;
  caption: string;
  captionFont: PillarCaptionFontId;
  captionSizeMm: number;
  captionAlign: PillarCaptionAlign;
  captionPadMm: number;
}): string | null {
  const code = buildPillarQr(opts.data);
  if (!code) return null;
  const font =
    PILLAR_CAPTION_FONTS.find((f) => f.id === opts.captionFont) ?? PILLAR_CAPTION_FONTS[0]!;
  const caption = opts.caption.trim();
  const capBlock = caption ? opts.captionPadMm + opts.captionSizeMm * 1.25 : 0;
  const w = opts.sizeMm;
  const h = opts.sizeMm + capBlock;
  const unit = opts.sizeMm / code.size;

  const modules: string[] = [];
  if (opts.style === "block") {
    modules.push(
      `<g transform="scale(${unit})" shape-rendering="crispEdges"><path d="${code.path}" fill="${opts.ink}"/></g>`,
    );
  } else {
    for (let i = 0; i < code.modules.length; i += 1) {
      if (!code.modules[i]) continue;
      const cx = i % code.size;
      const cy = Math.floor(i / code.size);
      modules.push(
        opts.style === "dot"
          ? `<circle cx="${((cx + 0.5) * unit).toFixed(3)}" cy="${((cy + 0.5) * unit).toFixed(3)}" r="${(unit / 2).toFixed(3)}" fill="${opts.ink}"/>`
          : `<rect x="${(cx * unit).toFixed(3)}" y="${(cy * unit).toFixed(3)}" width="${unit.toFixed(3)}" height="${unit.toFixed(3)}" rx="${(unit * 0.3).toFixed(3)}" fill="${opts.ink}"/>`,
      );
    }
  }

  const anchor =
    opts.captionAlign === "left" ? "start" : opts.captionAlign === "right" ? "end" : "middle";
  const capX = opts.captionAlign === "left" ? 0 : opts.captionAlign === "right" ? w : w / 2;
  const capText = caption
    ? `<text x="${capX.toFixed(2)}" y="${(opts.sizeMm + capBlock - opts.captionSizeMm * 0.15).toFixed(2)}" text-anchor="${anchor}" font-family="Geist, Inter, sans-serif" font-weight="${font.weight}" font-size="${opts.captionSizeMm}" letter-spacing="${(opts.captionSizeMm * font.tracking).toFixed(3)}" fill="${opts.transparent ? opts.ink : opts.ink}">${escapeXml(font.uppercase ? caption.toUpperCase() : caption)}</text>`
    : "";

  const plate = opts.transparent
    ? ""
    : `<rect x="0" y="0" width="${w}" height="${h}" rx="${opts.radius}" fill="${opts.plate}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">${plate}${modules.join("")}${capText}</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function KitQrCreator({
  defaultData = "",
  defaultCaption = "",
  fileStem = "event-kit-qr",
  kitId,
  kitLabel,
  className = "",
}: KitQrCreatorProps) {
  const trackId = kitId || fileStem;
  const [data, setData] = useState(defaultData);
  const [style, setStyle] = useState<PillarQrStyleId>("block");
  const [ink, setInk] = useState("#03002C");
  const [plate, setPlate] = useState("#FFFFFF");
  const [transparent, setTransparent] = useState(false);
  const [sizeMm, setSizeMm] = useState(60);
  const [radius, setRadius] = useState(4);
  const [caption, setCaption] = useState(defaultCaption);
  const [captionFont, setCaptionFont] = useState<PillarCaptionFontId>("bold-caps");
  const [captionSizeMm, setCaptionSizeMm] = useState(6);
  const [captionAlign, setCaptionAlign] = useState<PillarCaptionAlign>("center");
  const [captionPadMm, setCaptionPadMm] = useState(4);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);

  const svg = useMemo(
    () =>
      qrSvg({
        data,
        style,
        ink,
        plate,
        transparent,
        radius,
        sizeMm,
        caption,
        captionFont,
        captionSizeMm,
        captionAlign,
        captionPadMm,
      }),
    [
      data,
      style,
      ink,
      plate,
      transparent,
      radius,
      sizeMm,
      caption,
      captionFont,
      captionSizeMm,
      captionAlign,
      captionPadMm,
    ],
  );

  const contrast = pillarContrastRatio(ink, transparent ? "#FFFFFF" : plate);
  const scanSafe = contrast >= PILLAR_QR_MIN_CONTRAST;

  async function savePng() {
    if (!svg || busy.current) return;
    busy.current = true;
    try {
      const img = new Image();
      const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("render failed"));
        img.src = src;
      });
      const px = Math.round(sizeMm * 12); // ~300 dpi at the stated print size
      const scale = px / (img.width || sizeMm);
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = Math.round((img.height || sizeMm) * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      if (transparent) ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("no blob");
      downloadBlob(blob, `${fileStem}.png`);
      void logKitQrDownload(trackId, kitLabel, "png");
    } catch {
      toast.error("Could not build the PNG — try the SVG download.");
    } finally {
      busy.current = false;
    }
  }

  return (
    <section
      className={`rounded-2xl border border-black/10 bg-white p-4 ${className}`}
      aria-label="QR creator"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
            <QrCode size={12} /> QR creator
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[#03002C]">
            Real level-H codes, vector out — same engine as our signage
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!svg}
            onClick={() => {
              if (!svg) return;
              downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${fileStem}.svg`);
              void logKitQrDownload(trackId, kitLabel, "svg");
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#03002C] disabled:opacity-50"
          >
            <Download size={12} /> SVG (vector)
          </button>
          <button
            type="button"
            disabled={!svg}
            onClick={savePng}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-black/5 disabled:opacity-50"
          >
            <Download size={12} /> PNG
          </button>
          <button
            type="button"
            disabled={!svg}
            onClick={async () => {
              if (!svg) return;
              try {
                await navigator.clipboard.writeText(svg);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              } catch {
                toast.error("Clipboard blocked — use the SVG download.");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-black/5 disabled:opacity-50"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy SVG"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        {/* Controls */}
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
              Link or text the code opens
            </span>
            <input
              type="text"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              maxLength={500}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Module style
              </span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as PillarQrStyleId)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              >
                {PILLAR_QR_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.note}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Printed size · {sizeMm} mm
              </span>
              <input
                type="range"
                min={20}
                max={300}
                step={5}
                value={sizeMm}
                onChange={(e) => setSizeMm(Number(e.target.value))}
                className="w-full"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Code ink
              </span>
              <select
                value={ink}
                onChange={(e) => setInk(e.target.value)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              >
                {INKS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Plate
              </span>
              <select
                value={plate}
                disabled={transparent}
                onChange={(e) => setPlate(e.target.value)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm disabled:opacity-50"
              >
                {PLATES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-[12px] text-black/70">
              <input
                type="checkbox"
                checked={transparent}
                onChange={(e) => setTransparent(e.target.checked)}
              />
              Drop the plate (code prints straight on the artwork)
            </label>
            <label className="inline-flex items-center gap-2 text-[12px] text-black/70">
              Plate corner · {radius} mm
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={radius}
                disabled={transparent}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
              Caption under the code
            </span>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Scan to register"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              maxLength={80}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Caption type
              </span>
              <select
                value={captionFont}
                onChange={(e) => setCaptionFont(e.target.value as PillarCaptionFontId)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              >
                {PILLAR_CAPTION_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Caption alignment
              </span>
              <select
                value={captionAlign}
                onChange={(e) => setCaptionAlign(e.target.value as PillarCaptionAlign)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              >
                {CAPTION_ALIGNS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Caption size · {captionSizeMm} mm
              </span>
              <input
                type="range"
                min={2}
                max={40}
                step={1}
                value={captionSizeMm}
                onChange={(e) => setCaptionSizeMm(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Caption gap · {captionPadMm} mm
              </span>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={captionPadMm}
                onChange={(e) => setCaptionPadMm(Number(e.target.value))}
                className="w-full"
              />
            </label>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-2">
          <div
            className="flex min-h-[200px] items-center justify-center rounded-xl border border-black/10 p-4"
            style={{ background: transparent ? "#E0E8F5" : "#F2F2F2" }}
          >
            {svg ? (
              <div
                className="w-full max-w-[180px] [&>svg]:h-auto [&>svg]:w-full"
                // Generated locally from our own option set — no external input.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <p className="text-center text-[12px] text-black/50">
                Add a link or some text to generate a scannable code.
              </p>
            )}
          </div>
          <p
            className={`text-[11px] leading-relaxed ${scanSafe ? "text-black/55" : "text-[#E53D2E]"}`}
          >
            {scanSafe
              ? `Contrast ${contrast.toFixed(1)}:1 — safe to scan. Error correction level H, so the code survives scuffs and angles.`
              : `Contrast is only ${contrast.toFixed(1)}:1 — phones will struggle. Use a darker ink or a lighter plate.`}
          </p>
          {!scanSafe ? (
            <button
              type="button"
              onClick={() => {
                setInk("#03002C");
                setPlate("#FFFFFF");
                setTransparent(false);
              }}
              className="rounded-full border border-[#E53D2E]/40 px-3 py-1.5 text-[11px] font-semibold text-[#E53D2E] hover:bg-[#E53D2E]/5"
            >
              Fix contrast
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
