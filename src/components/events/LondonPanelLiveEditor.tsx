// Live, click-into editor for one London signage panel.
//
// Everything here writes to the shared placement / board-size stores, so an edit
// made in this editor is immediately visible on the template page, the panel
// thumbnails, the print preview and both vector masters — no reload, no save
// step. The editor is intentionally self-contained so it can be mounted in a
// dialog from any panel listing.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Crosshair, Download, Move, QrCode, RotateCcw, Ruler, Type } from "lucide-react";
import { toast } from "sonner";
import {
  artworkPpi,
  artworkPpiVerdict,
  loadLondonGroundImage,
  type LondonGroundImage,
} from "@/lib/next-london-artwork";

import { Button } from "@/components/ui/button";
import { LondonPrintGuides, LondonPrintReadout } from "@/components/london/LondonPrintPreview";
import { StepRepeatWallPanel } from "@/components/events/StepRepeatWallPanel";
import {
  isStepRepeatPanel,
  mmToIn,
  useStepRepeatConfigs,
} from "@/lib/next-london-step-repeat";
import { londonBrandingPlan } from "@/lib/next-london-branding";
import {
  buildLondonPanelAiAsync,
  londonGroundBox,
  buildLondonPanelSvg,
  londonAiBytes,
  londonPanelFileBase,
  type LondonColorSpace,
} from "@/lib/next-london-revise";
import {
  LONDON_STYLES,
  isBoothPanel,
  londonBoothArtworkUrl,
  londonBoothMasterUrl,
  londonBoothPanelMeta,
  type LondonPanel,
} from "@/lib/next-london-signage";
import {
  NEXT_LOGO_COLOURWAY_LABELS,
  nextLogoColourways,
  nextLogoFamily,
} from "@/lib/next-logo-vectors";
import {
  copyLondonLogoPlacement,
  DEFAULT_LOGO_PLACEMENT,
  LONDON_QR_MAX_CHARS,
  LONDON_QR_SCALE,
  LONDON_GROUND_SCALE,
  LONDON_TEXT_MAX_CHARS,
  LONDON_TEXT_SCALE,
  resetLondonLogoPlacement,
  setLondonLogoPlacement,
  useLondonLogoPlacements,
} from "@/lib/next-london-logo-placement";
import {
  applyLondonBoardSize,
  LONDON_BOARD_LIMITS,
  resetLondonBoardSize,
  setLondonBoardSize,
  useLondonBoardSizes,
} from "@/lib/next-london-board-size";

/** Default QR target: the live London agenda board. */
const QR_DEFAULT_LINK = "https://transperfectelement.lovable.app/events/next/london/agenda";

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Millimetre field. Keystrokes edit a local draft so a half-typed number is
 * never clamped; the value commits on blur or Enter and cancels on Escape.
 */
function MmInput({
  value,
  min,
  max,
  onCommit,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (next: number) => void;
  label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) onCommit(Math.max(min, Math.min(max, parsed)));
    setDraft(null);
  };
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") setDraft(null);
      }}
      className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm tabular-nums text-foreground"
    />
  );
}

export interface LondonPanelLiveEditorProps {
  /** Panel as specified (board-size overrides are resolved internally). */
  panel: LondonPanel;
  /** Other panel ids the "apply to all" action should copy placement onto. */
  siblingIds?: string[];
  /** Called when the gradient style changes, so a host list can persist it. */
  onStyleChange?: (styleId: string) => void;
}

export function LondonPanelLiveEditor({
  panel: input,
  siblingIds = [],
  onStyleChange,
}: LondonPanelLiveEditorProps) {
  const placements = useLondonLogoPlacements();
  const boardSizes = useLondonBoardSizes();
  const panel = useMemo(() => applyLondonBoardSize(input, boardSizes), [input, boardSizes]);
  const placement = placements[panel.id] ?? DEFAULT_LOGO_PLACEMENT;

  const [colorSpace, setColorSpace] = useState<LondonColorSpace>("rgb");
  const [printPreview, setPrintPreview] = useState(true);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Photo walls are a repeating pattern, so their artwork is driven by the wall
  // recipe rather than by a single lockup / headline placement.
  const wallConfigs = useStepRepeatConfigs();
  const isWall = isStepRepeatPanel(panel);

  const plan = useMemo(() => londonBrandingPlan(panel, placement), [panel, placement]);
  const art = useMemo(() => ({ colorSpace, vibrance: 1 }), [colorSpace]);
  const svg = useMemo(
    () => buildLondonPanelSvg(panel, art),
    [panel, placement, art, wallConfigs],
  );
  const colourways = useMemo(() => nextLogoColourways(plan.familyId), [plan.familyId]);
  const familyLabel = nextLogoFamily(plan.familyId)?.label ?? "TransPerfect";
  const boardOverridden = !!boardSizes[panel.id];

  // Vendor booth kiosks: the vendor's supplied artwork is the ground and their
  // Illustrator template is the print deliverable.
  const booth = isBoothPanel(panel);
  const boothArt = londonBoothArtworkUrl(panel.id);
  const boothMaster = londonBoothMasterUrl(panel.id);
  const boothMeta = londonBoothPanelMeta(panel);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, target: "logo" | "text" | "ground") => {
      event.preventDefault();
      event.stopPropagation();
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const start = {
        x: event.clientX,
        y: event.clientY,
        dx:
          target === "logo"
            ? placement.dx
            : target === "ground"
              ? placement.groundDx
              : placement.textDx,
        dy:
          target === "logo"
            ? placement.dy
            : target === "ground"
              ? placement.groundDy
              : placement.textDy,
      };
      const move = (moveEvent: PointerEvent) => {
        const dx =
          start.dx + ((moveEvent.clientX - start.x) / rect.width) * (panel.bleedW / panel.trimW);
        const dy =
          start.dy + ((moveEvent.clientY - start.y) / rect.height) * (panel.bleedH / panel.trimH);
        setLondonLogoPlacement(
          panel.id,
          target === "logo"
            ? { dx, dy }
            : target === "ground"
              ? { groundDx: dx, groundDy: dy }
              : { textDx: dx, textDy: dy },
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
    [
      panel,
      placement.dx,
      placement.dy,
      placement.textDx,
      placement.textDy,
      placement.groundDx,
      placement.groundDy,
    ],
  );

  const nudge = (dx: number, dy: number) =>
    setLondonLogoPlacement(panel.id, { dx: placement.dx + dx, dy: placement.dy + dy });
  const nudgeText = (dx: number, dy: number) =>
    setLondonLogoPlacement(panel.id, {
      textDx: placement.textDx + dx,
      textDy: placement.textDy + dy,
    });

  const downloadPanel = async (kind: "svg" | "ai") => {
    const base = londonPanelFileBase(panel, 1, colorSpace);
    const blob =
      kind === "svg"
        ? new Blob([buildLondonPanelSvg(panel, art)], { type: "image/svg+xml" })
        : new Blob([londonAiBytes(await buildLondonPanelAiAsync(panel, art))], {
            type: "application/postscript",
          });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${base}.${kind}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.success(`${base}.${kind} downloaded · ${colorSpace.toUpperCase()}`);
  };

  // Supplied artwork: read the real pixel size so the designer sees the true
  // print resolution at this board size, and so zooming warns before it softens.
  const [groundImage, setGroundImage] = useState<LondonGroundImage | null>(null);
  useEffect(() => {
    let live = true;
    setGroundImage(null);
    if (!boothArt) return;
    void loadLondonGroundImage(boothArt).then((image) => {
      if (live) setGroundImage(image);
    });
    return () => {
      live = false;
    };
  }, [boothArt]);

  const groundBox = londonGroundBox(panel, placement);
  const groundStyle = {
    left: `${(groundBox.x / panel.bleedW) * 100}%`,
    top: `${(groundBox.y / panel.bleedH) * 100}%`,
    width: `${(groundBox.w / panel.bleedW) * 100}%`,
    height: `${(groundBox.h / panel.bleedH) * 100}%`,
  };
  const groundPpi = groundImage ? artworkPpi(groundImage.width, groundBox.w) : 0;
  const groundVerdict = artworkPpiVerdict(groundPpi);

  const logoBox = {
    left: `${(plan.logo.x / panel.bleedW) * 100}%`,
    top: `${(plan.logo.y / panel.bleedH) * 100}%`,
    width: `${(plan.logo.w / panel.bleedW) * 100}%`,
    height: `${(plan.logo.h / panel.bleedH) * 100}%`,
  };

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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* Live stage */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Move className="h-3.5 w-3.5" />{" "}
            {isWall
              ? "step & repeat pattern — set the recipe on the right"
              : booth
              ? boothArt
                ? `${boothMeta?.artboard.label ?? "Booth"} · supplied vendor artwork`
                : "Booth artwork pending — brand ground shown"
              : "drag the lockup or the headline"}
          </span>
          <Button
            variant={printPreview ? "default" : "outline"}
            size="sm"
            className="gap-2"
            aria-pressed={printPreview}
            onClick={() => setPrintPreview((v) => !v)}
          >
            <Ruler className="h-3.5 w-3.5" /> Guides
          </Button>
        </div>
        <div
          ref={stageRef}
          className="relative mx-auto w-full max-w-[420px] select-none overflow-hidden rounded-lg border border-border"
          style={{ aspectRatio: `${panel.bleedW} / ${panel.bleedH}` }}
        >
          <>
            {boothArt ? (
              <img
                src={boothArt}
                alt={`${panel.name} supplied booth artwork`}
                className="absolute"
                style={groundStyle}
              />
            ) : null}
            <img
              src={svgDataUrl(svg)}
              alt={`${panel.name} live artwork`}
              className="relative h-full w-full"
            />
          </>
          {printPreview ? <LondonPrintGuides panel={panel} /> : null}
          {boothArt ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Move supplied artwork"
              onPointerDown={(event) => startDrag(event, "ground")}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 0.02 : 0.005;
                const move = (dx: number, dy: number) =>
                  setLondonLogoPlacement(panel.id, {
                    groundDx: placement.groundDx + dx,
                    groundDy: placement.groundDy + dy,
                  });
                if (event.key === "ArrowLeft") move(-step, 0);
                else if (event.key === "ArrowRight") move(step, 0);
                else if (event.key === "ArrowUp") move(0, -step);
                else if (event.key === "ArrowDown") move(0, step);
                else return;
                event.preventDefault();
              }}
              className="absolute inset-0 cursor-move outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            />
          ) : null}
          {isWall || !plan.lockupOn ? null : (
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
            className="absolute cursor-move rounded-sm border border-dashed border-white/70 bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={logoBox}
          />
          )}
          {textBox && !isWall ? (
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
          <div className="mt-3">
            <LondonPrintReadout panel={panel} plan={plan} />
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {panel.room} · {familyLabel} · {plan.orientation === "side" ? "side-by-side" : "stacked"}{" "}
          {NEXT_LOGO_COLOURWAY_LABELS[plan.colourway].toLowerCase()} · every edit here is live across
          the kit.
        </p>

        {isWall ? <StepRepeatWallPanel panel={panel} /> : null}

        {/* Supplied vendor artwork: place it, zoom it, and decide whether the
            house lockup prints over it. Everything here rides into the .ai. */}
        {boothArt ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium">Supplied artwork</span>
              {groundImage ? (
                <span
                  className={
                    groundVerdict.tone === "ok"
                      ? "text-emerald-500"
                      : groundVerdict.tone === "warn"
                        ? "text-amber-500"
                        : "text-destructive"
                  }
                >
                  {groundImage.width}×{groundImage.height}px · {groundPpi} PPI at{" "}
                  {Math.round(groundBox.w)}mm ({(groundBox.w / 25.4).toFixed(1)}in) ·{" "}
                  {groundVerdict.label}
                </span>
              ) : (
                <span className="text-muted-foreground">reading artwork…</span>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Zoom
              <input
                type="range"
                min={LONDON_GROUND_SCALE.min}
                max={LONDON_GROUND_SCALE.max}
                step={LONDON_GROUND_SCALE.step}
                value={placement.groundScale}
                onChange={(event) =>
                  setLondonLogoPlacement(panel.id, {
                    groundScale: Number(event.target.value),
                  })
                }
                className="flex-1"
              />
              <span className="tabular-nums">{Math.round(placement.groundScale * 100)}%</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={plan.lockupOn ? "default" : "outline"}
                size="sm"
                aria-pressed={plan.lockupOn}
                onClick={() =>
                  setLondonLogoPlacement(panel.id, { lockup: !plan.lockupOn })
                }
              >
                {plan.lockupOn ? "NEXT lockup on" : "Add NEXT lockup"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLondonLogoPlacement(panel.id, {
                    groundScale: 1,
                    groundDx: 0,
                    groundDy: 0,
                  })
                }
              >
                Reset artwork
              </Button>
              <span className="text-[11px] text-muted-foreground">
                drag the wall to reposition · arrows nudge
              </span>
            </div>
          </div>
        ) : null}

        {/* Gradient */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Gradient
            <select
              value={panel.style}
              onChange={(event) => onStyleChange?.(event.target.value)}
              disabled={!onStyleChange}
              className="h-9 min-w-[220px] flex-1 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
            >
              {Object.entries(LONDON_STYLES).map(([id, style]) => (
                <option key={id} value={id}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Copy — a wall repeats its own text, so the single headline is hidden */}
        <div className={`rounded-lg border border-border bg-muted/30 p-3 ${isWall ? "hidden" : ""}`}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 text-xs text-muted-foreground">
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
                className="w-32"
              />
              <span className="tabular-nums">{plan.copySizeMm.toFixed(0)}mm</span>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Direction</span>
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
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-2"
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
        </div>

        {/* Lockup */}
        <div className={`rounded-lg border border-border bg-muted/30 p-3 ${isWall ? "hidden" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Logo scale
              <input
                type="range"
                min={0.3}
                max={2}
                step={0.01}
                value={placement.scale}
                onChange={(event) =>
                  setLondonLogoPlacement(panel.id, { scale: Number(event.target.value) })
                }
                className="w-32"
              />
              <span className="tabular-nums">{Math.round(placement.scale * 100)}%</span>
            </label>
            <span className="text-xs tabular-nums text-muted-foreground">
              x {plan.logo.x.toFixed(0)}mm · y {plan.logo.y.toFixed(0)}mm · w{" "}
              {plan.logo.w.toFixed(0)}mm
            </span>
          </div>
        </div>

        {/* QR */}
        <div className={`rounded-lg border border-border bg-muted/30 p-3 ${isWall ? "hidden" : ""}`}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 text-xs text-muted-foreground">
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
                className="w-28"
              />
              <span className="tabular-nums">{plan.qr ? `${plan.qr.size.toFixed(0)}mm` : "—"}</span>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex min-w-[200px] flex-1 items-center gap-2 text-xs text-muted-foreground">
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
                  qr: QR_DEFAULT_LINK,
                  qrScale: 1,
                  qrDx: 0,
                  qrDy: 0,
                })
              }
            >
              <QrCode className="h-3.5 w-3.5" /> Agenda code
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setLondonLogoPlacement(panel.id, { qr: null, qrScale: 1, qrDx: 0, qrDy: 0 })
              }
            >
              <RotateCcw className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>

        {/* Board size */}
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Ruler className="h-3.5 w-3.5" /> Real signboard size
            </h4>
            <span className="text-xs text-muted-foreground">
              {boardOverridden ? "Measured on site" : "Shipped spec"} · file {panel.bleedW}×
              {panel.bleedH}mm ({mmToIn(panel.bleedW).toFixed(1)}×{mmToIn(panel.bleedH).toFixed(1)}
              in)
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            {(
              [
                {
                  key: "trimW" as const,
                  label: "Width (mm)",
                  value: panel.trimW,
                  ...LONDON_BOARD_LIMITS.trim,
                },
                {
                  key: "trimH" as const,
                  label: "Height (mm)",
                  value: panel.trimH,
                  ...LONDON_BOARD_LIMITS.trim,
                },
                {
                  key: "bleedEdge" as const,
                  label: "Bleed / edge (mm)",
                  value: panel.bleedEdge,
                  ...LONDON_BOARD_LIMITS.bleed,
                },
              ]
            ).map((field) => (
              <label key={field.key} className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="flex items-baseline gap-1">
                  {field.label}
                  <span className="tabular-nums text-[10px] opacity-70">
                    {mmToIn(field.value).toFixed(2)}″
                  </span>
                </span>
                <MmInput
                  label={`${panel.name} ${field.label}`}
                  value={field.value}
                  min={field.min}
                  max={field.max}
                  onCommit={(next) => setLondonBoardSize(input, { [field.key]: next })}
                />
              </label>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!boardOverridden}
              onClick={() => {
                resetLondonBoardSize(panel.id);
                toast.success("Board size back to the shipped spec");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset size
            </Button>
          </div>
        </div>

        {/* Output + panel actions */}
        <div className="flex flex-wrap items-center gap-2">
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
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadPanel("svg")}>
            <Download className="h-3.5 w-3.5" /> SVG
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadPanel("ai")}>
            <Download className="h-3.5 w-3.5" /> AI
          </Button>
          {boothMaster ? (
            <Button variant="default" size="sm" className="gap-2" asChild>
              <a href={boothMaster} download={boothMeta?.booth.sourceFile ?? undefined}>
                <Download className="h-3.5 w-3.5" /> Supplied booth master (.ai)
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => resetLondonLogoPlacement(panel.id)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset panel
          </Button>
          {siblingIds.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => {
                copyLondonLogoPlacement(panel.id, siblingIds);
                toast.success(`Placement applied to ${siblingIds.length} panels`);
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Apply to all
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Crosshair className="h-3.5 w-3.5" /> single panel
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
