// Preview of the current artboard mapped onto its location photo. Drag the four
// corners onto the photographed steps; the artwork follows with true perspective.
// Reference only — never printed, never saved into the file.
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { StepGuides } from "@/lib/venue-step-guides";

type Pt = [number, number];

/** Step sizes read from the live file's step lines (inches). */
export function stepSizesFromGuides(g: StepGuides): { width: number; steps: number[] } {
  const ys = Array.from(new Set(g.lines.filter((l) => l[1] === l[3]).map((l) => l[1])))
    .filter((y) => y > 0.5 && y < g.h * 72 - 0.5).sort((a, b) => a - b);
  const edges = [0, ...ys, g.h * 72];
  return { width: g.w, steps: edges.slice(1).map((y, i) => Math.round(((y - edges[i]!) / 72) * 100) / 100) };
}

// Homography mapping the unit square onto quad → CSS matrix3d.
function matrix3d(w: number, h: number, q: Pt[]): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q as [Pt, Pt, Pt, Pt];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  // scale from element px (w,h) to unit square
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.join(",")})`;
}

export function StepPhotoPreview({ photoUrl, label, svg, guides, onClose }: {
  photoUrl: string; label: string; svg: SVGSVGElement | null; guides?: StepGuides; onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [art, setArt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [q, setQ] = useState<Pt[] | null>(null);
  const [alpha, setAlpha] = useState(0.85);
  const drag = useRef<number | null>(null);
  const ratio = guides ? guides.w / guides.h : 3;

  useEffect(() => {
    if (!svg) return;
    toPng(svg as unknown as HTMLElement, { includeQueryParams: true, pixelRatio: 1,
      filter: (n) => !(n instanceof Element && n.getAttribute("data-export-ignore") === "true") })
      .then(setArt).catch(() => setErr("Couldn't capture the artwork for the preview."));
  }, [svg]);

  const onImg = (el: HTMLImageElement) => {
    const w = el.clientWidth, h = el.clientHeight;
    setSize({ w, h });
    if (!q) {
      const qw = w * 0.7, qh = Math.min(h * 0.5, qw / Math.max(1, ratio) * 1.6);
      const x = (w - qw) / 2, y = h * 0.45;
      setQ([[x + qw * 0.15, y], [x + qw * 0.85, y], [x + qw, y + qh], [x, y + qh]]);
    }
  };

  const move = (e: React.PointerEvent) => {
    if (drag.current == null || !box.current || !q) return;
    const r = box.current.getBoundingClientRect();
    const p: Pt = [Math.max(0, Math.min(size.w, e.clientX - r.left)), Math.max(0, Math.min(size.h, e.clientY - r.top))];
    setQ(q.map((v, i) => (i === drag.current ? p : v)));
  };
  const AW = 1000, AH = AW / ratio;
  const sizes = guides ? stepSizesFromGuides(guides) : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Artwork preview on ${label}`} tabIndex={-1} ref={(el) => el?.focus()}
      onKeyDown={(e) => e.key === "Escape" && onClose()} className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-black/90 p-6 outline-none">
      <div ref={box} className="relative select-none touch-none" onPointerMove={move} onPointerUp={() => (drag.current = null)}>
        <img src={photoUrl} alt={`${label} of the location`} className="max-h-[78vh] w-auto rounded-sm" onLoad={(e) => onImg(e.currentTarget)} draggable={false} />
        {art && q ? (
          <img src={art} alt="" aria-hidden draggable={false} style={{ position: "absolute", left: 0, top: 0, width: AW, height: AH, transformOrigin: "0 0", transform: matrix3d(AW, AH, q), opacity: alpha, mixBlendMode: "multiply", pointerEvents: "none" }} />
        ) : null}
        {q?.map((p, i) => (
          <button key={i} type="button" aria-label={`Drag corner ${i + 1}`} onPointerDown={(e) => { drag.current = i; (e.currentTarget.parentElement as HTMLElement).setPointerCapture?.(e.pointerId); }}
            style={{ left: p[0] - 8, top: p[1] - 8 }} className="absolute h-4 w-4 rounded-full border-2 border-white bg-[#003FC7] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-white/80">
        <span>Drag the four dots onto the corners of the steps.</span>
        <label className="flex items-center gap-2">Strength <input type="range" min={0.3} max={1} step={0.05} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} /></label>
        <button type="button" className="rounded-sm border border-white/20 px-2 py-0.5 hover:bg-white/10" onClick={onClose}>Close</button>
      </div>
      {sizes ? (
        <p className="max-w-3xl text-center text-[11px] text-white/60">
          From the live file: {sizes.width}″ wide, {sizes.steps.length} steps, each {Array.from(new Set(sizes.steps)).join("″ / ")}″ tall. Sizes are the designer's — confirm on site before print. Preview only, never printed.
        </p>
      ) : null}
      {err ? <p className="text-[11px] text-[#FF9B70]">{err}</p> : null}
    </div>
  );
}
