// Print preview for the London signage template.
//
// Two pieces, both driven by `londonPrintGeometry` (the same numbers the .svg /
// .ai masters are built from):
//   • LondonPrintGuides — bleed / trim / safe rectangles drawn over the panel
//     stage, plus corner crop ticks, so you can see what the cutter removes.
//   • LondonPrintReadout — the printer-facing table: file size, finished
//     signboard size, bleed per edge, safe inset, issued raster tier, and a
//     pass/fail line on whether the lockup and headline sit inside safe.

import { AlertTriangle, CheckCircle2, Ruler } from "lucide-react";

import type { LondonPanel } from "@/lib/next-london-signage";
import type { LondonBrandingPlan } from "@/lib/next-london-branding";
import {
  boxStyle,
  insideSafe,
  londonPrintGeometry,
  type LondonPrintGeometry,
} from "@/lib/next-london-print-geometry";

const mm = (n: number) => `${Math.round(n)}mm`;

export type LondonPrintGuidesProps = {
  panel: LondonPanel;
  /** Draw the crop ticks at the trim corners. */
  showCrop?: boolean;
};

/** Absolute overlay — render inside the panel stage (which is sized to bleed). */
export function LondonPrintGuides({ panel, showCrop = true }: LondonPrintGuidesProps) {
  const geo = londonPrintGeometry(panel);
  const trim = boxStyle(geo.trim);
  const safe = boxStyle(geo.safe);

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* Bleed = the whole file. */}
      <div className="absolute inset-0 border border-rose-400/70" />
      {/* Trim = the cut line. */}
      <div className="absolute border-2 border-dashed border-white/90" style={trim} />
      {/* Safe = where copy and the lockup must stay. */}
      <div className="absolute border border-dashed border-emerald-300/90" style={safe} />

      {showCrop
        ? (
            [
              { x: geo.trim.left, y: geo.trim.top },
              { x: geo.trim.left + geo.trim.width, y: geo.trim.top },
              { x: geo.trim.left, y: geo.trim.top + geo.trim.height },
              { x: geo.trim.left + geo.trim.width, y: geo.trim.top + geo.trim.height },
            ] as const
          ).map((c, i) => (
            <div
              key={i}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
            >
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/90" />
              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/90" />
            </div>
          ))
        : null}

      <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-rose-200">
        bleed {mm(geo.bleedW)} × {mm(geo.bleedH)}
      </div>
      <div
        className="absolute rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-emerald-200"
        style={{ left: safe.left, top: safe.top }}
      >
        safe {mm(geo.safeMm)}
      </div>
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs tabular-nums text-foreground">
        {value}
        {note ? <span className="ml-1 text-muted-foreground">{note}</span> : null}
      </span>
    </div>
  );
}

export type LondonPrintReadoutProps = {
  panel: LondonPanel;
  plan: LondonBrandingPlan;
};

/** Printer-facing geometry table plus a safe-area verdict for this panel. */
export function LondonPrintReadout({ panel, plan }: LondonPrintReadoutProps) {
  const geo: LondonPrintGeometry = londonPrintGeometry(panel);

  const logoSafe = insideSafe(geo, {
    x: plan.logo.x,
    y: plan.logo.y,
    w: plan.logo.w,
    h: plan.logo.h,
  });
  const runMm = plan.copy ? plan.copySizeMm * plan.copy.length * 0.62 : 0;
  const copySafe = !plan.copy
    ? true
    : insideSafe(
        geo,
        plan.copyVertical
          ? {
              x: plan.copyCentreMm - plan.copySizeMm * 0.35,
              y: plan.copyBaselineMm - runMm / 2,
              w: plan.copySizeMm * 1.25,
              h: runMm,
            }
          : {
              x: plan.copyCentreMm - runMm / 2,
              y: plan.copyBaselineMm - plan.copySizeMm,
              w: runMm,
              h: plan.copySizeMm * 1.25,
            },
      );
  const qrSafe = plan.qr
    ? insideSafe(geo, { x: plan.qr.x, y: plan.qr.y, w: plan.qr.size, h: plan.qr.size })
    : true;
  const clean = logoSafe && copySafe && qrSafe;
  const offenders = [
    logoSafe ? null : "lockup",
    copySafe ? null : "headline",
    qrSafe ? null : "QR code",
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Print preview</h3>
        <span className="text-[11px] text-muted-foreground">
          the geometry written into the .svg and .ai masters
        </span>
      </div>

      <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
        <div>
          <Row
            label="Finished signboard (trim)"
            value={`${mm(geo.trimW)} × ${mm(geo.trimH)}`}
            note={`${geo.trimWin.toFixed(2)} × ${geo.trimHin.toFixed(2)} in`}
          />
          <Row label="File size (bleed)" value={`${mm(geo.bleedW)} × ${mm(geo.bleedH)}`} />
          <Row
            label="Bleed per edge"
            value={
              Math.abs(geo.bleedEdgeX - geo.bleedEdgeY) < 0.5
                ? mm(geo.bleedEdgeX)
                : `${mm(geo.bleedEdgeX)} sides · ${mm(geo.bleedEdgeY)} top/bottom`
            }
          />
        </div>
        <div>
          <Row label="Safe inset from trim" value={mm(geo.safeMm)} />
          <Row label="Live (safe) area" value={`${mm(geo.liveW)} × ${mm(geo.liveH)}`} />
          <Row
            label="Issued raster tier"
            value={`${geo.ppi} ppi · ${geo.rasterW}×${geo.rasterH}px`}
            note={geo.rasterCapped ? "capped — print the vector" : undefined}
          />
          <Row label="Area" value={`${geo.areaM2.toFixed(2)} m²`} />
        </div>
      </div>

      <div
        className={`mt-2 flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
          clean ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        }`}
      >
        {clean ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <span>
          {clean
            ? "Lockup, headline and code all sit inside the safe area — this master prints to signboard size with nothing in the cut."
            : `Outside the safe area: ${offenders.join(", ")}. Nudge or scale it back inside the green guide before you generate the pack.`}
        </span>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Red = bleed (the file), white dashed = trim (the cut), green dashed = safe. Artwork is
        full-bleed to the red edge; shaped panels still take their cutting paths from the venue
        proofs.
      </p>
    </div>
  );
}
