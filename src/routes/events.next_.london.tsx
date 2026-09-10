// /events/next/london — TransPerfect NEXT 2026 London location signage kit.
//
// Job 2281 · QEII Centre Westminster · 54 scenic panels. Renders the venue's
// own artwork (live vector gradients) against the issued print schedule, with
// spec-compliant downloads: vector .ai / .svg for the RIP, plus dithered PNG
// rasters generated in-browser at the spec resolution tiers.

import { loadLondonSignageFace } from "@/lib/next-london-text-outline";
import { useEffect, useMemo, useState } from "react";

import { useLondonSignageFace } from "@/hooks/use-london-signage-face";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Download,
  FileDown,
  ImageIcon,
  Info,
  Layers,
  MapPin,
  Ruler,
  ShieldCheck,
  Table2,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useBoothTemplates } from "@/hooks/use-booth-templates";
import { BoothTemplatePanel } from "@/components/events/BoothTemplatePanel";
import { LondonPpiPreview } from "@/components/events/LondonPpiPreview";
import { BoothRenderPreview } from "@/components/events/BoothRenderPreview";
import { LondonLocationRenderPreview } from "@/components/events/LondonLocationRenderPreview";

import { LondonAgendaBoards } from "@/components/events/LondonAgendaBoards";
import { LondonGradientGrounds } from "@/components/events/LondonGradientGrounds";
import { LondonPanelLiveEditor } from "@/components/events/LondonPanelLiveEditor";
import {
  londonLogoPlacements,
  setLondonLogoPlacement,
  useLondonLogoPlacements,
} from "@/lib/next-london-logo-placement";
import { useLondonPlacedArt } from "@/lib/next-london-placed-art";
import { useStepRepeatConfigs } from "@/lib/next-london-step-repeat";
import { londonSuppliedMaster } from "@/lib/next-london-supplied-masters";
import { buildLondonKitZip } from "@/lib/next-london-kit-zip";
import { listLondonLiveFiles } from "@/lib/london-live-files.functions";
import { setLondonLiveFiles, useLondonLiveFileSignature } from "@/lib/next-london-live-files";
import { LondonLiveFilePanel } from "@/components/events/LondonLiveFilePanel";
import { applyLondonBoardSize, applyLondonBoardSizes, useLondonBoardSizes } from "@/lib/next-london-board-size";
import {
  createLondonVariation,
  londonVariationsOf,
  removeLondonVariation,
  renameLondonVariation,
  setLondonVariationStyle,
  useLondonVariations,
  withLondonVariations,
} from "@/lib/next-london-variations";
import {
  removeLondonPanel,
  restoreAllLondonPanels,
  restoreLondonPanel,
  useLondonRemovals,
  withoutLondonRemovals,
} from "@/lib/next-london-removals";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { runWithExportFeedback } from "@/lib/export-feedback";
import { handleLondonDirectoryDownload } from "@/lib/london-directory-pdf";
import { renderDitheredPng } from "@/lib/london-panel-raster";
import {
  LONDON_SIGNAGE_FONT,
  brandingSummary,
  londonBrandingPlan,
} from "@/lib/next-london-branding";
import { nextLogoFamily } from "@/lib/next-logo-vectors";
import logoSetAsset from "@/assets/next-2026-logo-set.zip.asset.json";
import {
  auditAi,
  auditSvg,
  auditPng,
  gateOnQa,
  auditPrintPdf,
  qaReportCsv,
  qaSummary,
  rollup,
  type LondonQaReport,
} from "@/lib/london-signage-qa";
import {
  LONDON_PANELS,
  londonBoothArtworkUrl,
  LONDON_PRINT_SPEC,
  LONDON_STYLES,
  LONDON_VENUE,
  loadLondonArtwork,
  LONDON_FLOORS,
  londonPanelsByFloor,
  londonRasterWeightMb,
  londonScheduleCsv,
  rasterSizeFor,
  recommendedPpi,
  type LondonArtwork,
  type LondonPanel,
  isBoothPanel,
  isVenueTemplatePanel,
  londonBoothPanelMeta,
  londonPanelCount,
  londonVenueItemMeta,
} from "@/lib/next-london-signage";
import {
  effectiveLondonPanels,
  EMPTY_LONDON_OVERRIDES,
  londonOverrideOptions,
  londonPanelFileBase,
  type LondonOverrides,
  isAddedPanel,
  londonAiBytes,
  buildLondonPanelPrintPdfAsync,
  LONDON_MARKS_MARGIN_MM,
  londonPanelSvgFor,
  resolveLondonArtwork,
  resolveLondonArtworkAsync,
} from "@/lib/next-london-revise";

import { getLondonHeadRevision } from "@/lib/next-london-revise.functions";
import { onLondonRevisionPublished } from "@/lib/next-london-revision-live";
import { LondonAutoPublish } from "@/components/events/LondonAutoPublish";
import { adoptLondonPublishedOverrides } from "@/lib/next-london-adopt-published";
import {
  londonEditsArePublished,
  setLondonPublishedOverrides,
} from "@/lib/next-london-published-overrides";

/** Millimetres as inches — every signage spec reads in both units. */
const inch = (mm: number) => (mm / 25.4).toFixed(mm < 100 ? 2 : 1);

export const Route = createFileRoute("/events/next_/london")({
  head: () => ({
    meta: [
      { title: "NEXT 2026 London signage · QEII Centre panel kit" },
      {
        name: "description",
        content:
          "All 54 scenic panels for TransPerfect NEXT 2026 at the QEII Centre — trim and bleed geometry, gradient treatments, measured banding, and spec-compliant vector and dithered raster downloads.",
      },
      { property: "og:title", content: "NEXT 2026 London location signage" },
      {
        property: "og:description",
        content:
          "Job 2281 — 54 QEII Centre panels with print schedule, print specification, and vector-first downloads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LondonSignagePage,
});

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function PanelThumb({ panel, svg }: { panel: LondonPanel; svg?: string }) {
  const style = LONDON_STYLES[panel.style];
  const ratio = panel.bleedW / panel.bleedH;
  // Vendor booths and hand-finished live files show the supplied proof as the
  // ground: a data-URL SVG in an <img> cannot load the linked artwork. The
  // generated layers (lockup, headline, code, uploaded vector art) are painted
  // straight on top, so an edit to a supplied sign shows on the card too.
  const boothArt = londonSuppliedMaster(panel)?.previewUrl ?? londonBoothArtworkUrl(panel.id);
  const svgUrl = svg
    ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    : null;
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-black/10 bg-[#E0E8F5]"
      style={{ aspectRatio: `${Math.max(ratio, 0.08)}` }}
    >
      {boothArt ? (
        <img
          src={boothArt}
          alt={`${panel.room} — ${panel.name}, supplied artwork`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : null}
      {svgUrl ? (
        <img
          src={svgUrl}
          alt={`${panel.room} panel ${panel.name} — ${style?.label ?? panel.style} gradient ground`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : boothArt ? null : (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${(style?.stops ?? ["#7C4EF4", "#7FE3E8"]).join(", ")})`,
          }}
        />
      )}
    </div>
  );
}

function PanelCard({
  panel,
  svg,
  draft,
  variation,
  onClick,
}: {
  panel: LondonPanel;
  svg?: string;
  /** This browser has unpublished edits for the sign. */
  draft?: boolean;
  /** The sign is a copy made from another sign in the kit. */
  variation?: boolean;
  onClick?: (panel: LondonPanel) => void;
}) {
  const booth = londonBoothPanelMeta(panel);
  return (
    <button
      type="button"
      onClick={() => onClick?.(panel)}
      className="group flex h-full flex-col rounded-xl border border-black/10 bg-white p-3 text-left transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]"
    >
      <div className="shrink-0">
        <PanelThumb panel={panel} svg={svg} />
      </div>
      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        <p
          className="text-[13px] font-semibold leading-snug text-[#03002C]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
          title={panel.name}
        >
          {panel.name}
          {isAddedPanel(panel) ? (
            <span className="ml-1.5 inline-flex align-middle rounded bg-[#A6FA87]/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Added
            </span>
          ) : null}
          {isVenueTemplatePanel(panel) ? (
            <span className="ml-1.5 inline-flex align-middle rounded bg-[#C2A3FF]/45 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Venue
            </span>
          ) : null}
          {booth ? (
            <span className="ml-1.5 inline-flex align-middle rounded bg-[#A1FBF9]/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Booth
            </span>
          ) : null}
          {londonSuppliedMaster(panel) ? (
            <span className="ml-1.5 inline-flex align-middle rounded bg-[#A6FA87]/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Supplied master
            </span>
          ) : null}
          {variation ? (
            <span className="ml-1.5 inline-flex align-middle rounded bg-[#FF9B70]/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Copy
            </span>
          ) : null}
          {draft ? (
            <span className="ml-1.5 inline-flex align-middle rounded bg-[#FFEB66]/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Unpublished edit
            </span>
          ) : null}
        </p>
        {londonVenueItemMeta(panel) ? (
          <p className="mt-1 text-[12px] font-medium leading-snug text-[#03002C]/75">
            {londonVenueItemMeta(panel)!.note}
          </p>
        ) : null}
        {booth ? (
          <p className="mt-1 text-[12px] font-medium leading-snug text-[#03002C]/75">
            {booth.artboard.label} · {booth.artboard.trimW} × {booth.artboard.trimH} mm
          </p>
        ) : null}
        <p className="mt-auto pt-1.5 font-mono text-[11px] text-[#03002C]/60">
          {panel.trimW} × {panel.trimH} mm ({inch(panel.trimW)} × {inch(panel.trimH)} in) ·{" "}
          {panel.ground}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-[#03002C]/45">
          bleed {panel.bleedEdge} mm/edge · band {panel.bandMm.toFixed(2)} mm
        </p>
      </div>
    </button>
  );
}

function LondonSignagePage() {
  const fetchHead = useServerFn(getLondonHeadRevision);
  const faceReady = useLondonSignageFace();
  const [headError, setHeadError] = useState(false);
  // The revision number and the design overrides in force. Every download,
  // thumbnail and QA audit builds from THESE, never from the local stores, so a
  // print master does not depend on the downloading browser.
  const [headRev, setHeadRev] = useState(0);
  const [headOverrides, setHeadOverrides] = useState<LondonOverrides>(EMPTY_LONDON_OVERRIDES);
  // `undefined` while the session resolves, `null` when signed out. The kit is
  // public — downloads and QA are available to everyone — but editor entry
  // points (revise workflow, production studio) are only shown to signed-in
  // users.
  const userId = useSessionUser();
  const isAdmin = useIsAdmin();
  // The kit shows the panel set IN FORCE: the newest published revision, or the
  // issued venue pack when there is none (or when the viewer is not signed in).
  const [publishedPanels, setPanels] = useState<LondonPanel[]>(LONDON_PANELS);
  // Unpublished edits made in this browser (live editor / template studio).
  // Subscribing here means saving a logo move, a re-measured board or uploaded
  // artwork repaints the hub cards and re-flows the layout immediately.
  const localPlacements = useLondonLogoPlacements();
  const localPlacedArt = useLondonPlacedArt();
  // Wall recipes are edits like any other: a download must carry the QR payload,
  // colours and mark mix saved in this browser, not a stale published recipe.
  const localStepRepeat = useStepRepeatConfigs();
  const localBoardSizes = useLondonBoardSizes();
  // Subscribe the whole hub to live-file replacements. Without this, the
  // module-level live-file registry changed but card SVGs and supplied proof
  // URLs could remain from the previous render until some unrelated click.
  const liveFileSignature = useLondonLiveFileSignature();
  // A re-measured board changes the card's shape as well as its artwork, so the
  // whole schedule reads from the resized panels.
  // Copies made from an existing sign ("Version B" of a pillar, say) stand in the
  // schedule right after the sign they came from, with their own edits.
  const variations = useLondonVariations();
  // Signs taken out of the kit here disappear from the schedule and from the
  // vendor pack on the next publish, and can be put back at any time.
  const removals = useLondonRemovals();
  const panels = useMemo(
    () =>
      withoutLondonRemovals(
        applyLondonBoardSizes(withLondonVariations(publishedPanels, variations), localBoardSizes),
        removals,
      ),
    [publishedPanels, variations, localBoardSizes, removals],
  );
  // Booth masters live in the backend: applying them patches the booth specs
  // and panel records in place, so `applied` is what re-renders the cards.
  const boothTemplates = useBoothTemplates();
  const boothPanels = useMemo(
    () => panels.filter(isBoothPanel),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- templates mutate the panel records
    [panels, boothTemplates.applied],
  );
  // Booths belong to the floor they stand on, so they group with the rest of
  // that floor's schedule instead of sitting above every floor view. The
  // "booths" filter is the one place the whole partner set is listed together.
  const floors = useMemo(() => londonPanelsByFloor(panels), [panels]);
  const [floorId, setFloorId] = useState<string>("all");
  const [artwork, setArtwork] = useState<LondonArtwork | null>(null);
  const [artworkError, setArtworkError] = useState<string | null>(null);
  const [openPanelRaw, setOpenPanel] = useState<LondonPanel | null>(null);
  // The open dialog follows a re-measured board too.
  const openPanel = useMemo(
    () => (openPanelRaw ? applyLondonBoardSize(openPanelRaw, localBoardSizes) : null),
    [openPanelRaw, localBoardSizes],
  );
  const [editing, setEditing] = useState(false);
  const [ppi, setPpi] = useState<number>(72);
  const [qa, setQa] = useState<LondonQaReport[] | null>(null);

  useEffect(() => {
    let live = true;
    loadLondonArtwork()
      .then((pack) => {
        if (live) setArtwork(pack);
      })
      .catch((err: unknown) => {
        if (live) setArtworkError(err instanceof Error ? err.message : "Artwork pack unavailable.");
      });
    return () => {
      live = false;
    };
  }, []);

  // The finished live file in force for each sign is read from the backend, so
  // replacing a file updates every preview card here without a code change.
  const fetchLiveFiles = useServerFn(listLondonLiveFiles);
  const [liveFileTick, setLiveFileTick] = useState(0);
  useEffect(() => {
    let live = true;
    fetchLiveFiles()
      .then((rows) => {
        if (live) setLondonLiveFiles(rows);
      })
      .catch(() => {
        /* no stored versions reachable — the bundled artwork still prints */
      });
    return () => {
      live = false;
    };
  }, [fetchLiveFiles, liveFileTick]);

  const [revisionTick, setRevisionTick] = useState(0);

  // A revision published in the revise studio pushes here, so an open kit page
  // swaps to the new spec without a reload.
  useEffect(() => onLondonRevisionPublished(() => setRevisionTick((n) => n + 1)), []);

  // The revision in force is public: signed in or not, every viewer sees the
  // spec that is actually being printed.
  useEffect(() => {
    let live = true;
    fetchHead({})
      .then((res) => {
        if (!live) return;
        setHeadError(false);
        setHeadRev(res.revision?.rev ?? 0);
        setHeadOverrides(res.revision?.overrides ?? EMPTY_LONDON_OVERRIDES);
        // Tell the auto-publisher what is already live, so a saved edit that has
        // been published stops counting as a draft.
        setLondonPublishedOverrides(
          adoptLondonPublishedOverrides(res.revision?.overrides ?? null) ??
            EMPTY_LONDON_OVERRIDES,
        );
        const inForce = effectiveLondonPanels(res.revision ? [res.revision] : []);
        if (inForce.length) setPanels(inForce);
      })
      .catch(() => {
        if (live) setHeadError(true);
      });
    return () => {
      live = false;
    };
  }, [fetchHead, revisionTick]);

  useEffect(() => {
    if (openPanel) setPpi(recommendedPpi(openPanel));
  }, [openPanel]);

  // Opening the live editor starts from what was PUBLISHED: if this browser has
  // no local override for the panel, seed it from the revision in force.
  useEffect(() => {
    if (!editing || !openPanel) return;
    const seed = headOverrides.placements?.[openPanel.id];
    if (seed && !londonLogoPlacements()[openPanel.id]) {
      setLondonLogoPlacement(openPanel.id, seed);
    }
  }, [editing, openPanel, headOverrides]);

  const boothsOnly = floorId === "booths";
  const shown = boothsOnly
    ? []
    : floorId === "all"
      ? floors
      : floors.filter((f) => f.id === floorId);
  const styleCount = new Set(panels.map((p) => p.style)).size;
  const roomCount = new Set(panels.map((p) => `${p.floor}·${p.room}`)).size;
  const worstBand = Math.max(...panels.map((p) => p.bandMm));

  const target = openPanel ? rasterSizeFor(openPanel, ppi) : null;



  /** Builder options for a panel, taken from the revision in force. */
  const artOptions = (panel: LondonPanel) => londonOverrideOptions(panel.id, headOverrides);

  // Preview options layer THIS browser's unpublished edits over the revision in
  // force, so a sign edited in the live editor or template studio reads the same
  // on its hub card.
  const previewOptions = (panel: LondonPanel) => {
    const base = artOptions(panel);
    const placement = localPlacements[panel.id];
    const boardSize = localBoardSizes[panel.id];
    const placedArt = localPlacedArt[panel.id];
    const stepRepeat = localStepRepeat[panel.id];
    return {
      ...base,
      ...(placement ? { placement } : {}),
      ...(boardSize ? { boardSize } : {}),
      ...(placedArt ? { placedArt } : {}),
      ...(stepRepeat ? { stepRepeat } : {}),
    };
  };
  // A copy that has not been published counts as unpublished too, so its files are
  // never stamped with a revision number that does not contain it.
  // Saved edits are auto-published, so a sign is only a draft while its local
  // state is not yet contained in the revision in force.
  const isDraft = (panel: LondonPanel) =>
    Boolean(variations[panel.id]) ||
    (Boolean(
      localPlacements[panel.id] ||
        localBoardSizes[panel.id] ||
        localPlacedArt[panel.id] ||
        localStepRepeat[panel.id],
    ) &&
      !londonEditsArePublished(
        panel.id,
        {
          placement: localPlacements[panel.id],
          boardSize: localBoardSizes[panel.id],
          placedArt: localPlacedArt[panel.id],
          stepRepeat: localStepRepeat[panel.id],
        },
        headOverrides,
      ));

  // A download must show what the card shows: when this browser holds unpublished
  // edits (uploaded vector artwork, moved logo, resized board) the file is built
  // from them and stamped `rdraft-`, never with a revision number that has not
  // been published. With no local edits it is the revision in force, unchanged.
  const exportOptions = (panel: LondonPanel) =>
    isDraft(panel) ? previewOptions(panel) : artOptions(panel);
  const fileBase = (panel: LondonPanel) =>
    londonPanelFileBase(panel, isDraft(panel) ? "draft" : headRev);


  // Previews outline their copy with the shipped signage face. Until it is in
  // memory the synchronous builder throws by design, so the tile simply stays
  // blank rather than taking the whole page down with it.
  const previewSvg = (panel: LondonPanel): string | undefined => {
    // Reading the signature here documents that a live-file replacement is a
    // preview dependency; the hook above supplies the actual render signal.
    void liveFileSignature;
    if (!faceReady) return undefined;
    try {
      return londonPanelSvgFor(panel, artwork, previewOptions(panel));
    } catch {
      return undefined;
    }
  };


  const packOrNull = async () => {
    if (artwork) return artwork;
    try {
      return await loadLondonArtwork();
    } catch {
      // Added and revised panels do not need the packaged masters at all.
      return null;
    }
  };

  const downloadVector = (panel: LondonPanel, fmt: "svg" | "ai") =>
    runWithExportFeedback(
      {
        pending: `Preparing ${fileBase(panel)}.${fmt}…`,
        success: `${fileBase(panel)}.${fmt} downloaded`,
        failure: "Vector download failed",
        successDescription:
          fmt === "ai"
            ? "Live vector gradient with trim and bleed boxes set — this is the file to print."
            : "Live vector gradient sized to bleed.",
      },
      async () => {
        await loadLondonSignageFace();
        const pack = await packOrNull();
        // The `.ai` path always resolves supplied booth artwork, so a vendor
        // booth downloads the real wall rather than the house ground.
        const art =
          fmt === "ai"
            ? await resolveLondonArtworkAsync(panel, pack, exportOptions(panel))
            : resolveLondonArtwork(panel, pack, exportOptions(panel));
        gateOnQa(fmt === "svg" ? auditSvg(panel, art.svg) : auditAi(panel, art.ai));
        if (fmt === "svg") {
          download(new Blob([art.svg], { type: "image/svg+xml" }), `${fileBase(panel)}.svg`);
          return;
        }
        // .ai is PDF-compatible binary — never let Blob UTF-8 the bytes.
        const bytes = londonAiBytes(art.ai);
        download(new Blob([bytes], { type: "application/illustrator" }), `${fileBase(panel)}.ai`);
      },
    );

  // Print-ready PDF: the same vector master, wrapped in a marks margin with
  // crop marks, bleed ticks and registration targets, boxes set for the printer.
  const downloadPrintPdf = (panel: LondonPanel) =>
    runWithExportFeedback(
      {
        pending: `Preparing ${fileBase(panel)}-print.pdf…`,
        success: `${fileBase(panel)}-print.pdf downloaded`,
        failure: "Print PDF failed",
        successDescription:
          "Bleed, trim and crop marks in place — hand this file straight to the printer.",
      },
      async () => {
        await loadLondonSignageFace();
        // The async builder resolves supplied vendor artwork itself.
        const bytes = await buildLondonPanelPrintPdfAsync(panel, exportOptions(panel));
        gateOnQa(auditPrintPdf(panel, bytes, LONDON_MARKS_MARGIN_MM));
        download(new Blob([londonAiBytes(bytes)], { type: "application/pdf" }), `${fileBase(panel)}-print.pdf`);
      },
    );

  const downloadRaster = (panel: LondonPanel) =>
    runWithExportFeedback(
      {
        pending: `Rendering ${fileBase(panel)} at ${ppi} ppi…`,
        success: `${fileBase(panel)}-${ppi}ppi.png downloaded`,
        failure: "Raster render failed",
        successDescription: "Lossless PNG, sized to bleed, triangular-PDF dither applied.",
      },
      async () => {
        await loadLondonSignageFace();
        const pack = await packOrNull();
        const size = rasterSizeFor(panel, ppi);
        const blob = await renderDitheredPng(
          resolveLondonArtwork(panel, pack, exportOptions(panel)).svg,
          size.w,
          size.h,
        );
        gateOnQa(auditPng(panel, ppi, new Uint8Array(await blob.arrayBuffer())));
        download(blob, `${fileBase(panel)}-${ppi}ppi.png`);
      },
    );

  // The whole kit in one file: every sign's live vector master and print-ready
  // PDF, filed Floor / Room, plus the supplied master where the design team
  // hand-finished one. A sign that fails QA is listed in SKIPPED.txt instead of
  // silently landing in the pack.
  const [zipProgress, setZipProgress] = useState<string | null>(null);
  const isDraftKit = panels.some((p) => isDraft(p));
  const downloadWholeKit = () =>
    runWithExportFeedback(
      {
        pending: `Packing all ${panels.length} signs…`,
        success: "Master kit ZIP downloaded",
        failure: "Kit pack failed",
        successDescription: "Live AI masters and print-ready PDFs, filed by floor and room.",
      },
      async () => {
        await loadLondonSignageFace();
        const pack = await packOrNull();
        const floorLabels = new Map(LONDON_FLOORS.map((f) => [f.id, f.label] as const));
        try {
          const result = await buildLondonKitZip(
            panels,
            {
              fileBase,
              floorLabel: (panel) => floorLabels.get(panel.floor) ?? panel.floor,
              ai: async (panel) => {
                const art = await resolveLondonArtworkAsync(panel, pack, exportOptions(panel));
                gateOnQa(auditAi(panel, art.ai));
                return londonAiBytes(art.ai);
              },
              printPdf: async (panel) => {
                const bytes = await buildLondonPanelPrintPdfAsync(panel, exportOptions(panel));
                gateOnQa(auditPrintPdf(panel, bytes, LONDON_MARKS_MARGIN_MM));
                return londonAiBytes(bytes);
              },
              supplied: async (panel) => {
                const master = londonSuppliedMaster(panel);
                if (!master) return null;
                const res = await fetch(master.aiUrl);
                if (!res.ok) return null;
                return {
                  filename: master.filename,
                  bytes: new Uint8Array(await res.arrayBuffer()),
                };
              },
            },
            {
              revLabel: isDraftKit ? "rdraft" : `r${String(headRev).padStart(3, "0")}`,
              scheduleCsv: londonScheduleCsv(panels),
              onProgress: (done, total, panel) =>
                setZipProgress(`${done} of ${total} — ${panel.name}`),
            },
          );
          download(result.blob, result.filename);
          if (result.skipped.length) {
            toast.warning(`${result.skipped.length} sign(s) left out of the pack`, {
              description: "Open SKIPPED.txt in the ZIP for the reason on each one.",
            });
          }
        } finally {
          setZipProgress(null);
        }
      },
    );

  const downloadSchedule = () =>
    runWithExportFeedback(
      {
        pending: "Building the print schedule…",
        success: "NEXT-London-print-schedule.csv downloaded",
        failure: "Schedule export failed",
        successDescription: `${panels.length} panels with trim, bleed, ground, raster size and measured banding.`,
      },
      async () => {
        download(
          new Blob([londonScheduleCsv(panels)], { type: "text/csv" }),
          "NEXT-London-print-schedule.csv",
        );
      },
    );

  const runKitQa = () =>
    runWithExportFeedback(
      {
        pending: `Auditing all ${panels.length} panels…`,
        success: "NEXT-London-qa-report.csv downloaded",
        failure: "QA sweep failed",
        successDescription: "Trim, bleed, ppi tier and banding checked for every vector master.",
      },
      async () => {
        await loadLondonSignageFace();
        const pack = await packOrNull();
        const reports: LondonQaReport[] = [];
        for (const panel of panels) {
          const art = resolveLondonArtwork(panel, pack, exportOptions(panel));
          reports.push(auditSvg(panel, art.svg), auditAi(panel, art.ai));
        }
        setQa(reports);
        download(
          new Blob([qaReportCsv(reports)], { type: "text/csv" }),
          "NEXT-London-qa-report.csv",
        );
      },
    );

  const chip = "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";

  return (
    <AppShell bare={!userId}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {userId && (
          <Link
            to="/events/next"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#003FC7] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> NEXT 2026 event system
          </Link>
        )}

        {headError && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[#E53D2E]/40 bg-[#E53D2E]/10 px-4 py-3 text-sm font-medium text-[#8f2318]"
          >
            Showing the issued pack — the revision in force could not be loaded. Do not send these
            files to print.
          </p>
        )}

        <header className="mt-5 overflow-hidden rounded-2xl border border-black/10">
          <div
            className="px-6 py-9 sm:px-10 sm:py-12"
            style={{
              background:
                "radial-gradient(60% 90% at 12% 92%, #8C82F0 0%, transparent 62%), radial-gradient(52% 80% at 62% 18%, #CFF6F7 0%, transparent 62%), radial-gradient(60% 90% at 96% 55%, #A9E8F2 0%, transparent 64%), #B7EEF3",
            }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#03002C]/70">
              Location signage · Job {LONDON_VENUE.job}
            </p>
            <h1 className="mt-3 max-w-[22ch] text-3xl font-bold leading-[1.05] tracking-tight text-[#03002C] sm:text-5xl">
              NEXT 2026 London — scenic panel kit
            </h1>
            <p className="mt-4 max-w-[54ch] text-sm leading-relaxed text-[#03002C]/75 sm:text-base">
              {LONDON_VENUE.venue}, {LONDON_VENUE.city} · {LONDON_VENUE.datesLabel}. Every panel the
              London location team specified, held against the issued print schedule and
              specification, with vector-first downloads for the RIP.
            </p>
            <dl className="mt-8 flex flex-wrap gap-x-9 gap-y-4">
              {[
                { k: "Panels", v: String(londonPanelCount()) },
                { k: "Rooms", v: String(roomCount) },
                { k: "Gradient grounds", v: String(styleCount) },
                { k: "Worst measured band", v: `${worstBand.toFixed(2)} mm` },
                { k: "Packaged rasters", v: `${londonRasterWeightMb().toFixed(0)} MB` },
              ].map((s) => (
                <div key={s.k}>
                  <dd className="text-2xl font-semibold tracking-tight text-[#03002C]">{s.v}</dd>
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
                    {s.k}
                  </dt>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadSchedule}
                className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Table2 className="h-4 w-4" /> Print schedule (CSV)
              </button>
              <button
                type="button"
                onClick={downloadWholeKit}
                disabled={Boolean(zipProgress)}
                className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {zipProgress ? `Packing — ${zipProgress}` : "Download whole kit (ZIP)"}
              </button>
              <button
                type="button"
                onClick={() => handleLondonDirectoryDownload(panels)}
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-white"
              >
                <BookOpen className="h-4 w-4" /> Master directory (PDF)
              </button>
              <Link
                to="/events/next/london/maps"
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-white"
              >
                <MapPin className="h-4 w-4" /> Install location maps
              </Link>
              <Link
                to="/events/next/london/template"
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-white"
              >
                <Layers className="h-4 w-4" /> Event template & pack
              </Link>
              <a
                href={logoSetAsset.url}
                download="TP-NEXT-2026-Logo-Set.zip"
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-white"
              >
                <Download className="h-4 w-4" /> Logo set (EPS + SVG)
              </a>

              {userId ? (
                <Link
                  to="/events/next/london/revise"
                  className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-white"
                >
                  <Ruler className="h-4 w-4" /> Revise &amp; regenerate
                </Link>
              ) : null}
              <button
                type="button"
                onClick={runKitQa}
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-white"
              >
                <ShieldCheck className="h-4 w-4" /> Run spec QA (all panels)
              </button>
            </div>

            {/* Result of the last kit-wide audit. */}
            {qa ? (
              <div className="mt-5 max-w-2xl rounded-xl border border-black/10 bg-white/80 p-4">
                <p className="text-sm font-semibold text-[#03002C]">
                  {(() => {
                    const r = rollup(qa);
                    return `${r.total} files audited — ${r.pass} pass, ${r.warn} warning, ${r.fail} fail`;
                  })()}
                </p>
                {qa.filter((r) => r.status !== "pass").length ? (
                  <ul className="mt-2 space-y-1.5">
                    {qa
                      .filter((r) => r.status !== "pass")
                      .slice(0, 6)
                      .map((r) => (
                        <li key={`${r.file}-${r.kind}`} className="text-[12.5px] leading-relaxed">
                          <span
                            className={`mr-2 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                              r.status === "fail"
                                ? "bg-[#E53D2E]/15 text-[#8f1d13]"
                                : "bg-[#FFEB66] text-[#03002C]"
                            }`}
                          >
                            {r.status}
                          </span>
                          <span className="font-medium text-[#03002C]">{r.file}</span>{" "}
                          <span className="text-[#03002C]/70">{qaSummary(r)}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[12.5px] text-[#03002C]/70">
                    Every vector master matches its trim, bleed, ppi tier and banding spec.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </header>

        {/* Print specification */}
        <details className="group mt-10 rounded-2xl border border-black/10 bg-white/70 p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#03002C]">
              <Info className="h-4.5 w-4.5 text-[#003FC7]" /> Print specification — London run
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#03002C]/55">
              <span className="group-open:hidden">Show</span>
              <span className="hidden group-open:inline">Hide</span>
            </span>
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {LONDON_PRINT_SPEC.map((rule) => (
              <article key={rule.id} className="rounded-xl border border-black/10 bg-white p-5">
                <h3 className="text-sm font-semibold text-[#03002C]">{rule.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#03002C]/70">{rule.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 rounded-xl border border-[#003FC7]/25 bg-[#E0E8F5] p-4 text-[13px] leading-relaxed text-[#03002C]/80">
            Colour space: {LONDON_VENUE.colourSpace}. Production partner: {LONDON_VENUE.producer}.
            Venue: {LONDON_VENUE.address}.
          </p>
        </details>

        {/* Gradient grounds */}
        <details className="group mt-6 rounded-2xl border border-black/10 bg-white/70 p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#03002C]">
              <ImageIcon className="h-4.5 w-4.5 text-[#003FC7]" /> Gradient grounds in this location
              · house and division
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#03002C]/55">
              <span className="group-open:hidden">Show</span>
              <span className="hidden group-open:inline">Hide</span>
            </span>
          </summary>
          <LondonGradientGrounds panels={panels} />
        </details>

        {/* Division agendas — the London kit's own agenda boards */}
        <details className="group mt-6 rounded-2xl border border-black/10 bg-white/70 p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#03002C]">
              <CalendarDays className="h-4.5 w-4.5 text-[#003FC7]" /> Division agendas · editable
              agenda boards, A4 to A1, every division
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#03002C]/55">
              <span className="group-open:hidden">Show</span>
              <span className="hidden group-open:inline">Hide</span>
            </span>
          </summary>
          <LondonAgendaBoards />
        </details>


        {/* Floor spine */}
        <section className="mt-12">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 flex items-center gap-2 text-lg font-semibold text-[#03002C]">
              <MapPin className="h-4.5 w-4.5 text-[#003FC7]" /> Panels by floor
            </h2>
            <button
              type="button"
              onClick={() => setFloorId("all")}
              className={`${chip} ${
                floorId === "all"
                  ? "border-[#03002C] bg-[#03002C] text-white"
                  : "border-black/15 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
              }`}
            >
              All floors · {panels.length}
            </button>
            {floors.map((floor) => (
              <button
                key={floor.id}
                type="button"
                onClick={() => setFloorId(floor.id)}
                className={`${chip} ${
                  floorId === floor.id
                    ? "border-[#03002C] bg-[#03002C] text-white"
                    : "border-black/15 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
                }`}
              >
                {floor.id} · {floor.rooms.reduce((n, r) => n + r.panels.length, 0)}
              </button>
            ))}
            {boothPanels.length > 0 ? (
              <button
                type="button"
                onClick={() => setFloorId("booths")}
                className={`${chip} ${
                  boothsOnly
                    ? "border-[#03002C] bg-[#03002C] text-white"
                    : "border-black/15 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
                }`}
              >
                Partner booths · {boothPanels.length}
              </button>
            ) : null}
          </div>

          {artworkError ? (
            <p className="mt-4 rounded-xl border border-[#E53D2E]/30 bg-[#E53D2E]/8 p-4 text-[13px] text-[#03002C]">
              {artworkError} Geometry and specification are still available; retry the download to
              fetch the vector pack again.
            </p>
          ) : null}

          {boothsOnly && boothPanels.length > 0 ? (
            <div className="mt-10">
              <div className="flex flex-wrap items-baseline gap-3 border-b border-black/10 pb-2">
                <h3 className="text-xl font-semibold tracking-tight text-[#03002C]">
                  Partner booths
                </h3>
                <span className="ml-auto font-mono text-[11px] text-[#03002C]/55">
                  {boothPanels.length} panels
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {boothPanels.map((panel) => (
                  <PanelCard
                    key={panel.id}
                    panel={panel}
                    svg={previewSvg(panel)}
                    draft={isDraft(panel)}
                    variation={Boolean(variations[panel.id])}
                    onClick={setOpenPanel}
                  />
                ))}
              </div>
              {isAdmin && boothTemplates.templates.length > 0 ? (
                <BoothTemplatePanel
                  templates={boothTemplates.templates}
                  panelIdBySlug={Object.fromEntries(
                    boothPanels.flatMap((panel) => {
                      const meta = londonBoothPanelMeta(panel);
                      return meta ? [[meta.booth.id, panel.id] as const] : [];
                    }),
                  )}
                  canEdit={isAdmin}
                  saving={boothTemplates.saving}
                  saveError={boothTemplates.saveError}
                  onSave={boothTemplates.save}
                />
              ) : null}
            </div>
          ) : null}

          {shown.map((floor) => (
            <div key={floor.id} className="mt-8">
              <div className="flex flex-wrap items-baseline gap-3 border-b border-black/10 pb-2">
                <span className="rounded border border-[#03002C] px-2 py-0.5 font-mono text-[11px] tracking-[0.1em] text-[#03002C]">
                  {floor.id}
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-[#03002C]">
                  {floor.label}
                </h3>
                <span className="ml-auto font-mono text-[11px] text-[#03002C]/55">
                  {floor.rooms.length} rooms ·{" "}
                  {floor.rooms.reduce((n, r) => n + r.panels.length, 0)} panels
                </span>
              </div>

              {floor.rooms.map((room) => {
                // Booths are pulled out of their one-per-room groups below, so a
                // room that only holds a booth does not print a lonely single row.
                const roomPanels = room.panels.filter((p) => !isBoothPanel(p));
                if (roomPanels.length === 0) return null;
                return (
                  <div key={room.room} className="mt-6">
                    <h4 className="font-mono text-[12px] uppercase tracking-[0.12em] text-[#03002C]/70">
                      {room.room}
                    </h4>
                    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {roomPanels.map((panel) => (
                        <PanelCard
                          key={panel.id}
                          panel={panel}
                          svg={previewSvg(panel)}
                          draft={isDraft(panel)}
                          variation={Boolean(variations[panel.id])}
                          onClick={setOpenPanel}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {(() => {
                // Every booth on this floor, laid out as one matrix.
                const floorBooths = floor.rooms.flatMap((room) =>
                  room.panels.filter((p) => isBoothPanel(p)),
                );
                if (floorBooths.length === 0) return null;
                return (
                  <div className="mt-6">
                    <h4 className="font-mono text-[12px] uppercase tracking-[0.12em] text-[#03002C]/70">
                      Partner booths · {floorBooths.length}
                    </h4>
                    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {floorBooths.map((panel) => (
                        <PanelCard
                          key={panel.id}
                          panel={panel}
                          svg={previewSvg(panel)}
                          draft={isDraft(panel)}
                          variation={Boolean(variations[panel.id])}
                          onClick={setOpenPanel}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </section>
      </div>

      <Dialog
        open={!!openPanel}
        onOpenChange={(o) => {
          if (!o) {
            setOpenPanel(null);
            setEditing(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {openPanel ? (
            <>
              <DialogTitle className="text-base font-semibold text-[#03002C]">
                {openPanel.name}
              </DialogTitle>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#03002C]/55">
                {openPanel.floor} · {openPanel.room} · {openPanel.proof} p
                {String(openPanel.page).padStart(2, "0")}
              </p>
              {/* Cap the hero thumb so the tier preview and downloads stay in view. */}
              <div className="mx-auto w-full max-w-[240px]">
                <PanelThumb panel={openPanel} svg={previewSvg(openPanel)} />
              </div>

              {londonVenueItemMeta(openPanel) ? (
                <div className="rounded-lg border border-[#C2A3FF]/60 bg-[#C2A3FF]/12 p-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
                    Venue template item
                    {londonVenueItemMeta(openPanel)!.qty
                      ? ` · ${londonVenueItemMeta(openPanel)!.qty}\u00d7 on site`
                      : ""}
                  </p>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[#03002C]">
                    {londonVenueItemMeta(openPanel)!.note}
                  </p>
                  <p className="mt-2 break-all font-mono text-[11px] text-[#03002C]/60">
                    Template: {londonVenueItemMeta(openPanel)!.template}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[#03002C]/50">
                    {londonVenueItemMeta(openPanel)!.dimsSource === "list"
                      ? "Trim size as stated on the venue signage list."
                      : londonVenueItemMeta(openPanel)!.dimsSource === "template-1:10"
                        ? "Trim size read from the 1:10 venue template (scaled \u00d710) — confirm on site."
                        : "Trim size read from the venue template artboard \u2014 confirm on site."}
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border border-[#A1FBF9]/70 bg-[#A1FBF9]/15 p-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
                  Branding applied
                </p>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[#03002C]">
                  {brandingSummary(
                    londonBrandingPlan(openPanel),
                    nextLogoFamily(londonBrandingPlan(openPanel).familyId)?.label ?? "TransPerfect",
                  )}
                </p>
                <p className="mt-1 font-mono text-[11px] text-[#03002C]/55">
                  {LONDON_SIGNAGE_FONT.pdfBaseFont} · official EPS outlines, live vector paths in
                  .ai and .svg
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  {
                    k: "Trim",
                    v: `${openPanel.trimW} × ${openPanel.trimH} mm (${inch(openPanel.trimW)} × ${inch(openPanel.trimH)} in)`,
                  },
                  {
                    k: "Bleed",
                    v: `${openPanel.bleedW} × ${openPanel.bleedH} mm (${inch(openPanel.bleedW)} × ${inch(openPanel.bleedH)} in · ${openPanel.bleedEdge}/edge)`,
                  },
                  { k: "Ground", v: `${openPanel.ground} · ${openPanel.style}` },
                  {
                    k: "Packaged raster",
                    v: `${openPanel.rasterPx} px at ${openPanel.rasterPpi} ppi`,
                  },
                  { k: "Measured banding", v: `${openPanel.bandMm.toFixed(2)} mm` },
                  { k: "Raster weight", v: `${openPanel.rasterMb.toFixed(1)} MB` },
                ].map((row) => (
                  <div key={row.k} className="rounded-lg border border-black/10 bg-[#F2F2F2] p-3">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/55">
                      {row.k}
                    </dt>
                    <dd className="mt-1 text-[13px] font-medium text-[#03002C]">{row.v}</dd>
                  </div>
                ))}
              </dl>

              {/* Remove this sign from the kit. Copies are deleted outright;
                  originals are taken out and can be put back at any time. */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E53D2E]/30 bg-[#E53D2E]/[0.04] p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
                    Remove this sign
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#03002C]/70">
                    Takes it out of this area and out of the vendor pack on the next save. You can
                    put it back from the list at the bottom of this page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const isCopy = Boolean(variations[openPanel.id]);
                    if (
                      !window.confirm(
                        isCopy
                          ? `Delete "${openPanel.name}"? Its own edits go with it.`
                          : `Remove "${openPanel.name}" from the kit? You can put it back later.`,
                      )
                    )
                      return;
                    // A copy that has already been published is part of the panel
                    // set in force, so it is taken out of the kit as well as
                    // dropped locally — otherwise it would come straight back.
                    removeLondonPanel(openPanel);
                    if (isCopy) removeLondonVariation(openPanel.id);
                    setOpenPanel(null);
                    setEditing(false);
                    toast.success(isCopy ? "Version deleted" : `${openPanel.name} removed`, {
                      description: isCopy
                        ? "The original is untouched."
                        : "It is out of this area — restore it from the removed list any time.",
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#E53D2E]/50 px-4 py-2 text-xs font-semibold text-[#E53D2E] hover:bg-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove sign
                </button>
              </div>


              {/* The finished live file in force for this sign. Replacing it here
                  re-paints every preview card in the kit at once. */}
              {isBoothPanel(openPanel) ? null : (
                <LondonLiveFilePanel
                  panel={openPanel}
                  canEdit={isAdmin}
                  onChanged={() => setLiveFileTick((n) => n + 1)}
                />
              )}

              {/* Copies of this sign — a second pillar version, a different
                  treatment on the same board. Each copy is its own asset. */}
              {isBoothPanel(openPanel) ? null : (
                <div className="rounded-xl border border-black/10 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
                      Versions of this sign
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const made = createLondonVariation(openPanel);
                        if (!made) {
                          toast.error("That sign already has the maximum number of versions.");
                          return;
                        }
                        toast.success(`${made.label} created`, {
                          description:
                            "A copy of this sign, starting from how it looks now. Edit it on its own without touching the original.",
                        });
                        setOpenPanel({ ...openPanel, id: made.id, name: made.name });
                        setEditing(true);
                      }}
                      className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Make another version
                    </button>
                  </div>

                  {(() => {
                    const mine = variations[openPanel.id];
                    const sourceId = mine ? mine.sourceId : openPanel.id;
                    const family = londonVariationsOf(sourceId);
                    const source = panels.find((p) => p.id === sourceId);
                    if (family.length === 0) {
                      return (
                        <p className="mt-3 text-[13px] leading-relaxed text-[#03002C]/70">
                          Only the original exists so far. A new version copies this sign's board
                          size, logo placement and any artwork you have added, then keeps its own
                          edits from there.
                        </p>
                      );
                    }
                    return (
                      <ul className="mt-3 space-y-2">
                        {[
                          ...(source
                            ? [{ id: source.id, name: source.name, label: "Original" }]
                            : []),
                          ...family.map((v) => ({ id: v.id, name: v.name, label: v.label })),
                        ].map((row) => {
                          const isCopy = Boolean(variations[row.id]);
                          const current = row.id === openPanel.id;
                          return (
                            <li
                              key={row.id}
                              className={`flex flex-wrap items-center gap-2 rounded-lg border p-2.5 ${
                                current
                                  ? "border-[#003FC7] bg-[#E0E8F5]"
                                  : "border-black/10 bg-[#F2F2F2]"
                              }`}
                            >
                              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#03002C]/60">
                                {row.label}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#03002C]">
                                {row.name}
                              </span>
                              {current ? (
                                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#003FC7]">
                                  Open
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = panels.find((p) => p.id === row.id);
                                    if (next) setOpenPanel(next);
                                  }}
                                  className="rounded-full border border-[#03002C]/25 px-3 py-1 text-[11px] font-semibold text-[#03002C] hover:bg-white"
                                >
                                  Open
                                </button>
                              )}
                              {isCopy ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const name = window.prompt("Name this version", row.name);
                                      if (name) renameLondonVariation(row.id, name);
                                    }}
                                    className="rounded-full border border-[#03002C]/25 px-3 py-1 text-[11px] font-semibold text-[#03002C] hover:bg-white"
                                  >
                                    Rename
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          `Delete "${row.name}"? Its own edits go with it. The original is untouched.`,
                                        )
                                      )
                                        return;
                                      removeLondonPanel({ id: row.id, name: row.name });
                                      removeLondonVariation(row.id);
                                      if (current && source) setOpenPanel(source);
                                      toast.success("Version deleted");
                                    }}
                                    className="rounded-full border border-[#E53D2E]/40 px-3 py-1 text-[11px] font-semibold text-[#E53D2E] hover:bg-white"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>
              )}

              {/* Partner booths: the finished stand, visualised in the room. */}
              {isBoothPanel(openPanel) ? <BoothRenderPreview panel={openPanel} /> : null}

              {/* Every other item: the artwork in place at the venue. */}
              {isBoothPanel(openPanel) ? null : (
                <LondonLocationRenderPreview panel={openPanel} baseOptions={artOptions(openPanel)} />
              )}


              {/* Check every resolution tier on screen before downloading. */}
              <LondonPpiPreview panel={openPanel} svg={previewSvg(openPanel)} />

              {/* Live panel editing, same editor as the revise screen. Placement,
                  copy and board size write to the shared stores, so thumbnails
                  and downloads here update without a reload. */}
              <div className="rounded-xl border border-black/10 p-4">
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  aria-expanded={editing}
                  className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Ruler className="h-3.5 w-3.5" />
                  {editing ? "Hide panel editor" : "Edit this panel"}
                </button>
                {editing ? (
                  <div className="mt-4">
                    <LondonPanelLiveEditor
                      panel={openPanel}
                      revisionLabel={headRev}
                      siblingIds={panels.filter((p) => p.id !== openPanel.id).map((p) => p.id)}
                      onStyleChange={(styleId) => {
                        const style = styleId as LondonPanel["style"];
                        // A copy keeps its treatment in the variations store, so it
                        // survives a reload; originals patch the panel list.
                        if (variations[openPanel.id]) {
                          setLondonVariationStyle(openPanel.id, style);
                        } else {
                          setPanels((prev) =>
                            prev.map((p) => (p.id === openPanel.id ? { ...p, style } : p)),
                          );
                        }
                        setOpenPanel((prev) => (prev ? { ...prev, style } : prev));
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-black/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                    Vector
                  </span>
                  {londonSuppliedMaster(openPanel) ? (
                    <>
                      <a
                        href={londonSuppliedMaster(openPanel)!.aiUrl}
                        download={londonSuppliedMaster(openPanel)!.filename}
                        className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                      >
                        <FileDown className="h-3.5 w-3.5" /> AI · supplied master
                      </a>
                      <button
                        type="button"
                        onClick={() => void downloadVector(openPanel, "ai")}
                        className="inline-flex items-center gap-2 rounded-full border border-[#003FC7]/40 px-4 py-2 text-xs font-semibold text-[#003FC7] hover:bg-[#003FC7]/10"
                      >
                        <FileDown className="h-3.5 w-3.5" /> AI · with your edits
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void downloadVector(openPanel, "ai")}
                      className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <FileDown className="h-3.5 w-3.5" /> AI
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void downloadPrintPdf(openPanel)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#003FC7]/40 px-4 py-2 text-xs font-semibold text-[#003FC7] hover:bg-[#003FC7]/10"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Print PDF · marks
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadVector(openPanel, "svg")}
                    className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
                  >
                    <FileDown className="h-3.5 w-3.5" /> SVG
                  </button>
                  <em className="text-[11.5px] not-italic text-[#03002C]/55">
                    live gradients — print these
                  </em>
                </div>

                {isDraft(openPanel) ? (
                  <p className="mt-3 rounded-lg border border-[#FFEB66]/70 bg-[#FFEB66]/25 p-3 text-[12.5px] leading-relaxed text-[#03002C]">
                    This sign has edits that are not published yet — uploaded vector artwork, logo
                    moves or a new board size. The downloads below include them and are named{" "}
                    <code>rdraft-…</code> until the revision is published.
                  </p>
                ) : null}

                {londonSuppliedMaster(openPanel) ? (
                  <p className="mt-3 rounded-lg border border-[#A6FA87]/60 bg-[#A6FA87]/15 p-3 text-[12.5px] leading-relaxed text-[#03002C]">
                    {londonSuppliedMaster(openPanel)!.note} Handed back{" "}
                    {londonSuppliedMaster(openPanel)!.issued} from r
                    {String(londonSuppliedMaster(openPanel)!.fromRevision).padStart(3, "0")}. “AI ·
                    supplied master” serves that exact file, untouched. “AI · with your edits”
                    rebuilds it here so anything you added on top — uploaded vector artwork, logo,
                    copy — is live in the file.
                  </p>
                ) : null}



                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                    Raster
                  </span>
                  <label className="sr-only" htmlFor="ldn-ppi">
                    Output resolution
                  </label>
                  <select
                    id="ldn-ppi"
                    value={ppi}
                    onChange={(e) => setPpi(Number(e.target.value))}
                    className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs text-[#03002C]"
                  >
                    <option value={36}>36 ppi — panels over 2000 mm</option>
                    <option value={72}>72 ppi — up to 2000 mm</option>
                    <option value={120}>120 ppi — up to 800 mm</option>
                    <option value={300}>300 ppi — close-viewed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void downloadRaster(openPanel)}
                    className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </button>
                  <em className="text-[11.5px] not-italic text-[#03002C]/55">
                    {target ? `${target.w} × ${target.h} px` : ""}
                    {ppi === recommendedPpi(openPanel) ? " · spec tier" : ""}
                  </em>
                </div>

                <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-[#03002C]/60">
                  <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Rasters are generated from the vector here and triangular-PDF dithered before
                  export, so they carry the same anti-banding treatment as the packaged files. Sized
                  to bleed; cut lines come from your proofs.
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      {/* Signs taken out of the kit. Nothing is destroyed — put any of them
          back and the card returns to its floor and area. */}
      {Object.keys(removals).length > 0 ? (
        <details className="mt-10 rounded-2xl border border-black/10 bg-white p-5">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.14em] text-[#03002C]/70">
            Removed signs · {Object.keys(removals).length}
          </summary>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[#03002C]/70">
              These are out of the kit and out of the vendor pack. Put one back and it returns to
              its floor and area exactly as it was, with its edits intact.
            </p>
            <button
              type="button"
              onClick={() => {
                restoreAllLondonPanels();
                toast.success("All removed signs are back");
              }}
              className="rounded-full border border-[#03002C]/25 px-4 py-2 text-[11px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
            >
              Put them all back
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {Object.entries(removals).map(([id, name]) => (
              <li
                key={id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-[#F2F2F2] p-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#03002C]">
                  {name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    restoreLondonPanel(id);
                    toast.success(`${name} is back in the kit`);
                  }}
                  className="rounded-full border border-[#003FC7]/40 px-3 py-1 text-[11px] font-semibold text-[#003FC7] hover:bg-white"
                >
                  Put it back
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {/* Saving a sign publishes it forward, so these cards and the vendor
          downloads always carry the newest version. */}
      <LondonAutoPublish panels={panels} removedIds={Object.keys(removals)} />
    </AppShell>
  );
}
