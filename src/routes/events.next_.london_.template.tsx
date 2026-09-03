// /events/next/london/template — the reusable EVENT TEMPLATE page.
//
// One place to compose a whole event's signage: pick a floor, drag the lockup
// where the location team wants it on any individual panel, then generate the
// full pack (.svg + .ai per panel, foldered by floor, with a manifest).

import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crosshair, Download, Move, RotateCcw, Copy, Type } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LONDON_FLOORS, LONDON_PANELS, LONDON_VENUE } from "@/lib/next-london-signage";
import {
  buildLondonPanelAi,
  buildLondonPanelSvg,
  londonAiBytes,
  londonPanelFileBase,
} from "@/lib/next-london-revise";
import { londonBrandingPlan } from "@/lib/next-london-branding";
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
} from "@/lib/next-london-logo-placement";
import { buildLondonSignagePack } from "@/lib/next-london-pack";

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
  const svg = useMemo(() => buildLondonPanelSvg(panel), [panel, placement]);
  const familyLabel = nextLogoFamily(plan.familyId)?.label ?? "TransPerfect";
  const colourways = useMemo(() => nextLogoColourways(plan.familyId), [plan.familyId]);

  // Single-panel handoff: the exact masters the printer opens, hero lockup first.
  const downloadPanel = useCallback(
    (kind: "svg" | "ai") => {
      const base = londonPanelFileBase(panel, 1);
      const blob =
        kind === "svg"
          ? new Blob([buildLondonPanelSvg(panel)], { type: "image/svg+xml" })
          : new Blob([londonAiBytes(buildLondonPanelAi(panel))], {
              type: "application/postscript",
            });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${base}.${kind}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${base}.${kind} downloaded`);
    },
    [panel],
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
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const url = URL.createObjectURL(pack.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `TP-NEXT-2026-London-${floor === "all" ? "full" : floor}-signage-pack.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${pack.files.length} files packed`, { id });
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
  const textBox = plan.copy
    ? {
        left: `${((plan.copyCentreMm - plan.copySizeMm * plan.copy.length * 0.31) / panel.bleedW) * 100}%`,
        top: `${((plan.copyBaselineMm - plan.copySizeMm) / panel.bleedH) * 100}%`,
        width: `${((plan.copySizeMm * plan.copy.length * 0.62) / panel.bleedW) * 100}%`,
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
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Move className="h-3.5 w-3.5" /> drag the lockup or the headline
              </div>
            </div>

            <div
              ref={stageRef}
              className="relative mx-auto mt-4 w-full max-w-[720px] select-none overflow-hidden rounded-lg border border-border"
              style={{ aspectRatio: `${panel.bleedW} / ${panel.bleedH}` }}
            >
              <img src={svgDataUrl(svg)} alt={`${panel.name} artwork preview`} className="h-full w-full" />
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
              <p className="mt-2 text-xs text-muted-foreground">
                Live Geist Bold on the .svg and .ai masters. Drag the amber box on the panel — or
                nudge it with the arrow keys — to place the line. Clear the field to drop the
                headline from this panel.
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
