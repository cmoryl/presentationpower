// Upload a vector file onto one London sign and place it.
//
// The upload becomes a real layer inside that panel's live file: live paths in
// the `.svg` master and live PDF path objects in the `.ai` master. Nothing is
// rasterised, and the importer refuses live text or placed photos rather than
// shipping a master that would print with a substituted font.

import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PLACED_ART_NUDGE,
  PLACED_ART_ROTATE,
  PLACED_ART_SIZE,
  parseArtworkFile,
  setLondonPlacedArt,
  type LondonPlacedArt,
} from "@/lib/next-london-placed-art";
import type { LondonPanel } from "@/lib/next-london-signage";

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="flex min-w-[190px] flex-1 items-center gap-2 text-xs text-muted-foreground">
      <span className="w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 accent-primary"
      />
      <span className="w-14 shrink-0 text-right font-mono text-[11px]">{format(value)}</span>
    </label>
  );
}

export function LondonPlacedArtPanel({
  panel,
  art,
  className = "",
}: {
  panel: LondonPanel;
  art: LondonPlacedArt | null;
  className?: string;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setWarnings([]);
    try {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error("That file is over 8 MB — supply a simplified vector version.");
      }
      const text = await file.text();
      const result = parseArtworkFile(text, file.name);
      setLondonPlacedArt(panel.id, result.art);
      setWarnings(result.warnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be read as vector artwork.");
    }
  }

  const mmWide = art ? panel.trimW * art.size : 0;
  const mmHigh = art ? (mmWide * art.h) / art.w : 0;

  return (
    <div className={`rounded-md border border-border p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground">Placed artwork</span>
        <span className="text-[11px] text-muted-foreground">
          .svg or .eps — outlined vector only, printed live
        </span>
        <span className="ml-auto flex items-center gap-2">
          <input
            ref={input}
            type="file"
            accept=".svg,.eps,image/svg+xml,application/postscript"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => input.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> {art ? "Replace" : "Upload"}
          </Button>
          {art ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setLondonPlacedArt(panel.id, null);
                setWarnings([]);
                setError(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          ) : null}
        </span>
      </div>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {warnings.map((w) => (
        <p key={w} className="mt-2 text-xs text-muted-foreground">
          {w}
        </p>
      ))}

      {art ? (
        <>
          <p className="mt-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{art.name}</span> · {art.format.toUpperCase()} ·{" "}
            {art.paths.length} path{art.paths.length === 1 ? "" : "s"} · prints{" "}
            {Math.round(mmWide)}×{Math.round(mmHigh)}mm on the trim
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Slider
              label="Size"
              value={art.size}
              min={PLACED_ART_SIZE.min}
              max={PLACED_ART_SIZE.max}
              step={PLACED_ART_SIZE.step}
              onChange={(size) => setLondonPlacedArt(panel.id, { size })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider
              label="Across"
              value={art.dx}
              min={PLACED_ART_NUDGE.min}
              max={PLACED_ART_NUDGE.max}
              step={PLACED_ART_NUDGE.step}
              onChange={(dx) => setLondonPlacedArt(panel.id, { dx })}
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <Slider
              label="Down"
              value={art.dy}
              min={PLACED_ART_NUDGE.min}
              max={PLACED_ART_NUDGE.max}
              step={PLACED_ART_NUDGE.step}
              onChange={(dy) => setLondonPlacedArt(panel.id, { dy })}
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <Slider
              label="Rotate"
              value={art.rotate}
              min={PLACED_ART_ROTATE.min}
              max={PLACED_ART_ROTATE.max}
              step={PLACED_ART_ROTATE.step}
              onChange={(rotate) => setLondonPlacedArt(panel.id, { rotate })}
              format={(v) => `${v.toFixed(1)}°`}
            />
            <Slider
              label="Opacity"
              value={art.opacity}
              min={0.05}
              max={1}
              step={0.01}
              onChange={(opacity) => setLondonPlacedArt(panel.id, { opacity })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { on: true, label: "Above the lockup" },
              { on: false, label: "Under the copy" },
            ].map((option) => (
              <button
                key={String(option.on)}
                type="button"
                aria-pressed={art.onTop === option.on}
                onClick={() => setLondonPlacedArt(panel.id, { onTop: option.on })}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  art.onTop === option.on
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={!art.on}
              onClick={() => setLondonPlacedArt(panel.id, { on: !art.on })}
              className={`ml-auto rounded-full border px-3 py-1 text-xs transition ${
                art.on
                  ? "border-border text-muted-foreground hover:bg-muted"
                  : "border-primary bg-primary/10 text-foreground"
              }`}
            >
              {art.on ? "Hide on this sign" : "Hidden — show again"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <div>
              <p className="mb-1 text-[11px] text-muted-foreground">Snap it to the trim</p>
              <div className="grid w-[92px] grid-cols-3 gap-1">
                {ALIGN_CELLS.map((cell) => (
                  <button
                    key={cell.key}
                    type="button"
                    title={cell.label}
                    aria-label={cell.label}
                    onClick={() => setLondonPlacedArt(panel.id, align(cell.h, cell.v))}
                    className="h-7 rounded border border-border text-[10px] text-muted-foreground transition hover:bg-muted"
                  >
                    {cell.mark}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-muted-foreground">
                Nudge it {fine ? "0.2%" : "1%"} at a time — arrow keys work too
              </p>
              <div
                tabIndex={0}
                onKeyDown={(e) => {
                  const step = fine ? 0.002 : 0.01;
                  const moves: Record<string, { dx?: number; dy?: number }> = {
                    ArrowLeft: { dx: -step },
                    ArrowRight: { dx: step },
                    ArrowUp: { dy: -step },
                    ArrowDown: { dy: step },
                  };
                  const move = moves[e.key];
                  if (!move) return;
                  e.preventDefault();
                  nudge(move.dx ?? 0, move.dy ?? 0);
                }}
                className="grid w-[92px] grid-cols-3 gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span />
                <button type="button" aria-label="Move up" onClick={() => nudge(0, -1)} className={NUDGE_BTN}>
                  ↑
                </button>
                <span />
                <button type="button" aria-label="Move left" onClick={() => nudge(-1, 0)} className={NUDGE_BTN}>
                  ←
                </button>
                <button
                  type="button"
                  aria-pressed={fine}
                  onClick={() => setFine((v) => !v)}
                  className={`h-7 rounded border text-[10px] transition ${
                    fine ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  fine
                </button>
                <button type="button" aria-label="Move right" onClick={() => nudge(1, 0)} className={NUDGE_BTN}>
                  →
                </button>
                <span />
                <button type="button" aria-label="Move down" onClick={() => nudge(0, 1)} className={NUDGE_BTN}>
                  ↓
                </button>
                <span />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
              onClick={() => setLondonPlacedArt(panel.id, { dx: 0, dy: 0, rotate: 0 })}
            >
              Centre it
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
              onClick={() => setLondonPlacedArt(panel.id, { rotate: 0 })}
            >
              Straighten
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
              onClick={() => setLondonPlacedArt(panel.id, { size: 0.3, opacity: 1 })}
            >
              Reset size
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
