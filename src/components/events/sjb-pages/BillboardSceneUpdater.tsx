import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/design-system/element";
import quads from "@/lib/sjb-billboard-scene-quads.json";
import { billboardBlankScene, SJB_BILLBOARD_SIZES } from "@/lib/sjb-billboards";

type Pt = [number, number];

/** Homography mapping the unit square onto quad (tl, tr, br, bl). */
function squareToQuad(q: Pt[]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  return (u: number, v: number): Pt => {
    const z = g * u + h * v + 1;
    return [(a * u + b * v + x0) / z, (d * u + e * v + y0) / z];
  };
}

function drawTri(ctx: CanvasRenderingContext2D, img: CanvasImageSource, s: Pt[], d: Pt[]) {
  const [[u0, v0], [u1, v1], [u2, v2]] = s;
  const [[x0, y0], [x1, y1], [x2, y2]] = d;
  ctx.save();
  // expand slightly to hide seams
  const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
  ctx.beginPath();
  d.forEach(([x, y], i) => {
    const px = x + (x - cx) * 0.03, py = y + (y - cy) * 0.03;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  });
  ctx.closePath();
  ctx.clip();
  const den = u0 * (v2 - v1) - u1 * v2 + u2 * v1 + (u1 - u2) * v0;
  const a = -(v0 * (x2 - x1) - v1 * x2 + v2 * x1 + (v1 - v2) * x0) / den;
  const b = (v1 * y2 + v0 * (y1 - y2) - v2 * y1 + (v2 - v1) * y0) / den;
  const c = (u0 * (x2 - x1) - u1 * x2 + u2 * x1 + (u1 - u2) * x0) / den;
  const dd = -(u1 * y2 + u0 * (y1 - y2) - u2 * y1 + (u2 - u1) * y0) / den;
  const e = (u0 * (v2 * x1 - v1 * x2) + v0 * (u1 * x2 - u2 * x1) + (u2 * v1 - u1 * v2) * x0) / den;
  const f = (u0 * (v2 * y1 - v1 * y2) + v0 * (u1 * y2 - u2 * y1) + (u2 * v1 - u1 * v2) * y0) / den;
  ctx.transform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = src;
  });
}

/** Places updated board artwork onto the same illustrative roadside scenes, in the browser. */
export function BillboardSceneUpdater() {
  const [w, setW] = useState<number>(840);
  const [tod, setTod] = useState<"day" | "dusk">("day");
  const [art, setArt] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const cv = canvas.current;
      if (!cv) return;
      const info = (quads as Record<string, { w: number; h: number; quad: Pt[] }>)[`${w}-${tod}`];
      const scene = await loadImage(billboardBlankScene(w, tod));
      if (!live) return;
      cv.width = info.w;
      cv.height = info.h;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(scene, 0, 0);
      if (!art) return;
      const board = await loadImage(art);
      if (!live) return;
      const size = SJB_BILLBOARD_SIZES.find((s) => s.w === w)!;
      const ratio = board.width / board.height, want = size.w / size.h;
      setWarn(Math.abs(ratio - want) / want > 0.02 ? `This file is ${board.width}×${board.height}; the ${size.w}×${size.h} board will stretch it.` : null);
      const map = squareToQuad(info.quad);
      const N = 16, bw = board.width, bh = board.height;
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N;
          const S: Pt[] = [[u0 * bw, v0 * bh], [u1 * bw, v0 * bh], [u1 * bw, v1 * bh], [u0 * bw, v1 * bh]];
          const D = [map(u0, v0), map(u1, v0), map(u1, v1), map(u0, v1)];
          drawTri(ctx, board, [S[0], S[1], S[2]], [D[0], D[1], D[2]]);
          drawTri(ctx, board, [S[0], S[2], S[3]], [D[0], D[2], D[3]]);
        }
    })().catch(() => setWarn("Could not read that image."));
    return () => {
      live = false;
    };
  }, [w, tod, art]);

  const download = () => {
    const cv = canvas.current;
    if (!cv) return;
    const a = document.createElement("a");
    a.download = `sjb-billboard-${w}-${tod}-mockup.jpg`;
    a.href = cv.toDataURL("image/jpeg", 0.88);
    a.click();
  };

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      <div className="space-y-3 text-sm">
        <label className="block space-y-1">
          <span className="font-medium">Board size</span>
          <select className="w-full rounded-md border border-border bg-background px-2 py-1.5" value={w} onChange={(e) => setW(Number(e.target.value))}>
            {SJB_BILLBOARD_SIZES.map((s) => (
              <option key={s.w} value={s.w}>{s.w.toLocaleString()} × {s.h}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Scene light</span>
          <select className="w-full rounded-md border border-border bg-background px-2 py-1.5" value={tod} onChange={(e) => setTod(e.target.value as "day" | "dusk")}>
            <option value="day">Day</option>
            <option value="dusk">Dusk</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Updated board artwork (PNG or JPG exported from Canva)</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="block w-full text-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setArt(URL.createObjectURL(f));
            }}
          />
        </label>
        {warn && <p className="text-xs text-destructive">{warn}</p>}
        <Button size="sm" onClick={download} disabled={!art}>
          <Download className="h-3.5 w-3.5" /> Download mockup
        </Button>
        <p className="text-xs text-muted-foreground">
          <Upload className="mr-1 inline h-3 w-3" />
          Your file is placed on the screen exactly as exported — nothing is redrawn. The scene stays an illustrative, generated location.
        </p>
      </div>
      <canvas ref={canvas} className="h-auto w-full rounded-md border border-border" aria-label="Billboard mockup preview" />
    </div>
  );
}
