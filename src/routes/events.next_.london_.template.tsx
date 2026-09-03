// /events/next/london/template — the reusable EVENT TEMPLATE page.
//
// One place to compose a whole event's signage: pick a floor, drag the lockup
// where the location team wants it on any individual panel, then generate the
// full pack (.svg + .ai per panel, foldered by floor, with a manifest).

import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crosshair, Download, Move, RotateCcw, Copy, Type, QrCode, Ruler } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LONDON_FLOORS, LONDON_PANELS, LONDON_VENUE } from "@/lib/next-london-signage";
import {
  buildLondonPanelAi,
  buildLondonPanelSvg,
  londonAiBytes,
  londonPanelFileBase,
  londonPanelStops,
  type LondonColorSpace,
} from "@/lib/next-london-revise";
import { cmykLabel, cmykToHex, londonCmykBuild } from "@/lib/next-london-cmyk";
import { londonBrandingPlan } from "@/lib/next-london-branding";
import { LondonPrintGuides, LondonPrintReadout } from "@/components/london/LondonPrintPreview";
import {
  NEXT_LOGO_COLOURWAY_LABELS,
  nextLogoColourways,
  nextLogoFamily,
} from "@/lib/next-logo-vectors";
import {
  copyLondonLogoPlacement,
  DEFAULT_LOGO_PLACEMENT,
  resetAllLondonLogoPlacements,
  resetLondonLogoPlacement,
  setLondonLogoPlacement,
  useLondonLogoPlacements,
  LONDON_TEXT_MAX_CHARS,
  LONDON_TEXT_SCALE,
  LONDON_QR_MAX_CHARS,
  LONDON_QR_SCALE,
} from "@/lib/next-london-logo-placement";
import { buildLondonSignagePack } from "@/lib/next-london-pack";

/** Default QR target: the live London agenda board. */
const LONDON_QR_DEFAULT_LINK = "https://transperfectelement.lovable.app/events/next/london/agenda";


export const Route = createFileRoute("/events/next_/london_/template")({
  head: () => ({
    meta: [
      { title: "London signage template — TransPerfect NEXT 2026" },
      {
        name: "description",
        content:
          "Compose the TransPerfect NEXT 2026 London signage pack: place the lockup on any panel and generate every .svg and .ai master.",
      },
      { property: "og:title", content: "London signage template — TransPerfect NEXT 2026" },
      {
        property: "og:description",
        content:
          "Drag the NEXT 2026 lockup per panel and export the full QEII Centre signage pack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LondonTemplatePage,
});

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function LondonTemplatePage() {
  const placements = useLondonLogoPlacements();
  const [floor, setFloor] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>(LONDON_PANELS[0]?.id ?? "");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Output colour space for every download on this page. RGB stays the house
  // default (the RIP separates); CMYK is the explicit vibrant-corrected master.
  const [colorSpace, setColorSpace] = useState<LondonColorSpace>("rgb");
  const [vibrance, setVibrance] = useState(1);
  // Print preview: draws the real bleed / trim / safe boxes over the stage.
  const [printPreview, setPrintPreview] = useState(true);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const panels = useMemo(
    () => (floor === "all" ? LONDON_PANELS : LONDON_PANELS.filter((p) => p.floor === floor)),
    [floor],
  );
  const panel = useMemo(
    () => panels.find((p) => p.id === selectedId) ?? panels[0] ?? LONDON_PANELS[0]!,
    [panels, selectedId],
  );
  const placement = placements[panel.id] ?? DEFAULT_LOGO_PLACEMENT;
  const plan = useMemo(() => londonBrandingPlan(panel, placement), [panel, placement]);
  const art = useMemo(() => ({ colorSpace, vibrance }), [colorSpace, vibrance]);
  // Preview paints the chosen space, so a CMYK master is soft-proofed on screen.
  const svg = useMemo(() => buildLondonPanelSvg(panel, art), [panel, placement, art]);
  const familyLabel = nextLogoFamily(plan.familyId)?.label ?? "TransPerfect";
  const colourways = useMemo(() => nextLogoColourways(plan.familyId), [plan.familyId]);
  const groundBuilds = useMemo(
    () =>
      londonPanelStops(panel).map((hex) => ({
        hex,
        build: londonCmykBuild(hex, vibrance),
      })),
    [panel, vibrance],
  );

  // Single-panel handoff: the exact masters the printer opens, hero lockup first.
  const downloadPanel = useCallback(
    (kind: "svg" | "ai") => {
      const base = londonPanelFileBase(panel, 1, colorSpace);
      const blob =
        kind === "svg"
          ? new Blob([buildLondonPanelSvg(panel, art)], { type: "image/svg+xml" })
          : new Blob([londonAiBytes(buildLondonPanelAi(panel, art))], {
              type: "application/postscript",
            });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${base}.${kind}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${base}.${kind} downloaded · ${colorSpace.toUpperCase()}`);
    },
    [panel, art, colorSpace],
  );


  // Drag with window-level listeners so the pointer can leave the box.
  // `target` picks which object moves: the hero lockup or the headline copy.
  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, target: "logo" | "text") => {
      event.preventDefault();
      event.stopPropagation();
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const start = {
        x: event.clientX,
        y: event.clientY,
        dx: target === "logo" ? placement.dx : placement.textDx,
        dy: target === "logo" ? placement.dy : placement.textDy,
      };
      const move = (moveEvent: PointerEvent) => {
        // Screen delta → trim fraction, using the panel's own bleed/trim ratio.
        const dx = start.dx + ((moveEvent.clientX - start.x) / rect.width) * (panel.bleedW / panel.trimW);
        const dy = start.dy + ((moveEvent.clientY - start.y) / rect.height) * (panel.bleedH / panel.trimH);
        setLondonLogoPlacement(
          panel.id,
          target === "logo" ? { dx, dy } : { textDx: dx, textDy: dy },
        );
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [panel, placement.dx, placement.dy, placement.textDx, placement.textDy],
  );

  const nudge = (dx: number, dy: number) =>
    setLondonLogoPlacement(panel.id, { dx: placement.dx + dx, dy: placement.dy + dy });

  const nudgeText = (dx: number, dy: number) =>
    setLondonLogoPlacement(panel.id, {
      textDx: placement.textDx + dx,
      textDy: placement.textDy + dy,
    });


  async function generatePack() {
    const id = toast.loading(`Building ${panels.length} panels…`);
    try {
      const pack = await buildLondonSignagePack(panels, {
        colorSpace,
        vibrance,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const url = URL.createObjectURL(pack.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `TP-NEXT-2026-London-${floor === "all" ? "full" : floor}-signage-pack${
        colorSpace === "cmyk" ? "-cmyk" : ""
      }.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${pack.files.length} files packed · ${colorSpace.toUpperCase()}`, { id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pack failed", { id });
    } finally {
      setProgress(null);
    }
  }

  const logoBox = {
    left: `${(plan.logo.x / panel.bleedW) * 100}%`,
    top: `${(plan.logo.y / panel.bleedH) * 100}%`,
    width: `${(plan.logo.w / panel.bleedW) * 100}%`,
    height: `${(plan.logo.h / panel.bleedH) * 100}%`,
  };

  // Headline hit box: the cap band around the copy baseline, centred on the
  // planned copy centre — the same numbers the .svg and .ai masters use.
  // Vertical copy (pillars) runs DOWN the panel, so the band is transposed.
  const runMm = plan.copy ? plan.copySizeMm * plan.copy.length * 0.62 : 0;
  const textBox = plan.copy
    ? plan.copyVertical
      ? {
          left: `${((plan.copyCentreMm - plan.copySizeMm * 0.35) / panel.bleedW) * 100}%`,
          top: `${((plan.copyBaselineMm - runMm / 2) / panel.bleedH) * 100}%`,
          width: `${((plan.copySizeMm * 1.25) / panel.bleedW) * 100}%`,
          height: `${(runMm / panel.bleedH) * 100}%`,
        }
      : {
          left: `${((plan.copyCentreMm - runMm / 2) / panel.bleedW) * 100}%`,
          top: `${((plan.copyBaselineMm - plan.copySizeMm) / panel.bleedH) * 100}%`,
          width: `${(runMm / panel.bleedW) * 100}%`,
          height: `${((plan.copySizeMm * 1.25) / panel.bleedH) * 100}%`,
        }
    : null;



  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-5 py-8">
        <Link
          to="/events/next/london"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> London signage kit
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Event signage template</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {LONDON_VENUE.name} · place the NEXT 2026 lockup panel by panel, then generate the
              full pack. Placement is saved per panel and applies to the .svg and .ai masters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={floor}
              onChange={(event) => setFloor(event.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              aria-label="Filter panels by floor"
            >
              <option value="all">All floors ({LONDON_PANELS.length})</option>
              {LONDON_FLOORS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} ({LONDON_PANELS.filter((p) => p.floor === f.id).length})
                </option>
              ))}
            </select>
            <Button onClick={generatePack} className="gap-2">
              <Download className="h-4 w-4" />
              {progress ? `Packing ${progress.done}/${progress.total}` : `Generate pack (${panels.length})`}
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{panel.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {panel.room} · trim {panel.trimW}×{panel.trimH}mm · {familyLabel} ·{" "}
                  {plan.orientation === "side" ? "side-by-side" : "stacked"}{" "}
                  {NEXT_LOGO_COLOURWAY_LABELS[plan.colourway].toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Move className="h-3.5 w-3.5" /> drag the lockup or the headline
                <Button
                  variant={printPreview ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  aria-pressed={printPreview}
                  onClick={() => setPrintPreview((v) => !v)}
                >
                  <Ruler className="h-3.5 w-3.5" /> Print preview
                </Button>
              </div>
            </div>

            <div
              ref={stageRef}
              className="relative mx-auto mt-4 w-full max-w-[720px] select-none overflow-hidden rounded-lg border border-border"
              style={{ aspectRatio: `${panel.bleedW} / ${panel.bleedH}` }}
            >
              <img src={svgDataUrl(svg)} alt={`${panel.name} artwork preview`} className="h-full w-full" />
              {printPreview ? <LondonPrintGuides panel={panel} /> : null}
              <div
                role="button"
                tabIndex={0}
                aria-label="Move lockup"
                onPointerDown={(event) => startDrag(event, "logo")}
                onKeyDown={(event) => {
                  const step = event.shiftKey ? 0.02 : 0.005;
                  if (event.key === "ArrowLeft") nudge(-step, 0);
                  else if (event.key === "ArrowRight") nudge(step, 0);
                  else if (event.key === "ArrowUp") nudge(0, -step);
                  else if (event.key === "ArrowDown") nudge(0, step);
                  else return;
                  event.preventDefault();
                }}
                className="absolute cursor-move rounded-sm border border-dashed border-white/70 bg-white/5 outline-none ring-offset-0 focus-visible:ring-2 focus-visible:ring-white"
                style={logoBox}
              />
              {textBox ? (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Move headline"
                  onPointerDown={(event) => startDrag(event, "text")}
                  onKeyDown={(event) => {
                    const step = event.shiftKey ? 0.02 : 0.005;
                    if (event.key === "ArrowLeft") nudgeText(-step, 0);
                    else if (event.key === "ArrowRight") nudgeText(step, 0);
                    else if (event.key === "ArrowUp") nudgeText(0, -step);
                    else if (event.key === "ArrowDown") nudgeText(0, step);
                    else return;
                    event.preventDefault();
                  }}
                  className="absolute cursor-move rounded-sm border border-dashed border-amber-300/80 bg-amber-200/10 outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  style={textBox}
                />
              ) : null}
            </div>

            {printPreview ? (
              <div className="mt-4">
                <LondonPrintReadout panel={panel} plan={plan} />
              </div>
            ) : null}




            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Logo colourway</span>
              {colourways.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={plan.colourway === key}
                  onClick={() => setLondonLogoPlacement(panel.id, { colourway: key })}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    plan.colourway === key
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {NEXT_LOGO_COLOURWAY_LABELS[key]}
                </button>
              ))}
              <span className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadPanel("svg")}>
                  <Download className="h-3.5 w-3.5" /> SVG
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadPanel("ai")}>
                  <Download className="h-3.5 w-3.5" /> AI
                </Button>
              </span>
            </div>

            {/* Output colour space — applies to the preview above and to every
                download on this page, single panel or full pack. */}
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium">Output colour space</span>
                {(["rgb", "cmyk"] as const).map((space) => (
                  <button
                    key={space}
                    type="button"
                    aria-pressed={colorSpace === space}
                    onClick={() => setColorSpace(space)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      colorSpace === space
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {space === "rgb" ? "RGB · RIP separates" : "CMYK · print master"}
                  </button>
                ))}
                {colorSpace === "cmyk" ? (
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    Vibrance
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.1}
                      value={vibrance}
                      onChange={(event) => setVibrance(Number(event.target.value))}
                      className="w-28"
                      aria-label="CMYK vibrance correction"
                    />
                    <span className="tabular-nums">{vibrance.toFixed(1)}×</span>
                  </label>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {colorSpace === "cmyk"
                  ? "DeviceCMYK masters: signed-off brand builds are used verbatim, everything else converts with skeletal black (no black under saturated colour) and a 300% ink ceiling. Copy prints 100K or 0-0-0-0 knockout. Files are suffixed -cmyk."
                  : "Brand RGB ships untouched and the printer's RIP performs the separation — the house default. Switch to CMYK only when the printer asks for separated masters."}
              </p>
              {colorSpace === "cmyk" ? (
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {groundBuilds.map(({ hex, build }) => (
                    <li key={hex} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/20"
                        style={{ background: cmykToHex(build) }}
                      />
                      <span className="font-mono text-muted-foreground">{hex}</span>
                      <span className={build.approved ? "text-foreground" : "text-muted-foreground"}>
                        {cmykLabel(build)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>


            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-w-[240px] flex-1 items-center gap-2 text-xs text-muted-foreground">
                  <Type className="h-3.5 w-3.5" /> Panel text
                  <input
                    type="text"
                    value={placement.text ?? plan.copy ?? ""}
                    maxLength={LONDON_TEXT_MAX_CHARS}
                    placeholder="No headline on this panel"
                    onChange={(event) =>
                      setLondonLogoPlacement(panel.id, { text: event.target.value.toUpperCase() })
                    }
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Text size
                  <input
                    type="range"
                    min={LONDON_TEXT_SCALE.min}
                    max={LONDON_TEXT_SCALE.max}
                    step={LONDON_TEXT_SCALE.step}
                    value={placement.textScale}
                    onChange={(event) =>
                      setLondonLogoPlacement(panel.id, { textScale: Number(event.target.value) })
                    }
                    className="w-36"
                  />
                  <span className="tabular-nums">{plan.copySizeMm.toFixed(0)}mm</span>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    setLondonLogoPlacement(panel.id, {
                      text: null,
                      textScale: 1,
                      textDx: 0,
                      textDy: 0,
                    })
                  }
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset text
                </Button>
              </div>
              {/* Direction: pillars and tall fascias run their copy DOWN the
                  panel. "Auto" follows the panel shape; either direction can be
                  forced per panel. */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Text direction</span>
                {(
                  [
                    { key: null, label: "Auto" },
                    { key: false, label: "Across" },
                    { key: true, label: "Down the panel" },
                  ] as const
                ).map((option) => (
                  <button
                    key={String(option.key)}
                    type="button"
                    aria-pressed={placement.textVertical === option.key}
                    onClick={() => setLondonLogoPlacement(panel.id, { textVertical: option.key })}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      placement.textVertical === option.key
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <span className="text-[11px] text-muted-foreground">
                  now running {plan.copyVertical ? "down the panel" : "across"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Live Geist Bold on the .svg and .ai masters. Drag the amber box on the panel — or
                nudge it with the arrow keys — to place the line. Clear the field to drop the
                headline from this panel.
              </p>
            </div>

            {/* QR: a real encoded, scannable code generated as vector modules,
                sized and placed per panel. */}
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-w-[260px] flex-1 items-center gap-2 text-xs text-muted-foreground">
                  <QrCode className="h-3.5 w-3.5" /> QR link
                  <input
                    type="text"
                    value={placement.qr ?? ""}
                    maxLength={LONDON_QR_MAX_CHARS}
                    placeholder="No code on this panel"
                    onChange={(event) => setLondonLogoPlacement(panel.id, { qr: event.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                  />
                </label>
                <label className="flex min-w-[200px] items-center gap-2 text-xs text-muted-foreground">
                  Caption
                  <input
                    type="text"
                    value={placement.qrCaption}
                    maxLength={LONDON_TEXT_MAX_CHARS}
                    onChange={(event) =>
                      setLondonLogoPlacement(panel.id, { qrCaption: event.target.value.toUpperCase() })
                    }
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Code size
                  <input
                    type="range"
                    min={LONDON_QR_SCALE.min}
                    max={LONDON_QR_SCALE.max}
                    step={LONDON_QR_SCALE.step}
                    value={placement.qrScale}
                    onChange={(event) =>
                      setLondonLogoPlacement(panel.id, { qrScale: Number(event.target.value) })
                    }
                    className="w-32"
                  />
                  <span className="tabular-nums">{plan.qr ? `${plan.qr.size.toFixed(0)}mm` : "—"}</span>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Position</span>
                {(
                  [
                    { label: "←", dx: -0.02, dy: 0 },
                    { label: "→", dx: 0.02, dy: 0 },
                    { label: "↑", dx: 0, dy: -0.02 },
                    { label: "↓", dx: 0, dy: 0.02 },
                  ] as const
                ).map((step) => (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() =>
                      setLondonLogoPlacement(panel.id, {
                        qrDx: placement.qrDx + step.dx,
                        qrDy: placement.qrDy + step.dy,
                      })
                    }
                    className="h-7 w-7 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted"
                    aria-label={`Move QR ${step.label}`}
                  >
                    {step.label}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    setLondonLogoPlacement(panel.id, {
                      qr: `${LONDON_QR_DEFAULT_LINK}`,
                      qrScale: 1,
                      qrDx: 0,
                      qrDy: 0,
                    })
                  }
                >
                  <QrCode className="h-3.5 w-3.5" /> Generate agenda code
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    setLondonLogoPlacement(panel.id, { qr: null, qrScale: 1, qrDx: 0, qrDy: 0 })
                  }
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Remove code
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Encoded at error-correction level H and drawn as vector modules on a white plate, so
                it stays scannable at any signage size in both the .svg and .ai masters.
              </p>
            </div>


            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Scale
                <input
                  type="range"
                  min={0.3}
                  max={2}

                  step={0.01}
                  value={placement.scale}
                  onChange={(event) =>
                    setLondonLogoPlacement(panel.id, { scale: Number(event.target.value) })
                  }
                  className="w-40"
                />
                <span className="tabular-nums">{Math.round(placement.scale * 100)}%</span>
              </label>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => resetLondonLogoPlacement(panel.id)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset panel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  copyLondonLogoPlacement(
                    panel.id,
                    panels.filter((p) => p.id !== panel.id).map((p) => p.id),
                  );
                  toast.success(`Placement applied to ${panels.length - 1} panels`);
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Apply to selection
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => {
                  resetAllLondonLogoPlacements();
                  toast.success("All placements reset");
                }}
              >
                <Crosshair className="h-3.5 w-3.5" /> Reset all
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                x {plan.logo.x.toFixed(0)}mm · y {plan.logo.y.toFixed(0)}mm · w {plan.logo.w.toFixed(0)}mm
              </span>
            </div>
          </section>

          <aside className="rounded-xl border border-border bg-card p-3">
            <h2 className="px-1 pb-2 text-sm font-semibold">Panels ({panels.length})</h2>
            <ul className="max-h-[640px] space-y-1 overflow-y-auto pr-1">
              {panels.map((item) => {
                const moved = !!placements[item.id];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-xs transition ${
                        item.id === panel.id ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <span className="block font-medium">{item.name}</span>
                      <span className="block text-muted-foreground">
                        {item.floor} · {item.trimW}×{item.trimH}mm{moved ? " · placed" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
