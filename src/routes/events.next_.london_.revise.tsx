// /events/next/london/revise — spec revision workflow for the NEXT 2026 London
// signage kit.
//
// The venue team re-issues measurements during build-up. This screen takes those
// changes, shows exactly what moves (including the derived raster size, ppi tier,
// dither band and file weight), works out which panels need new vector artwork
// versus only a re-rendered PNG, regenerates the affected files, and publishes
// the whole panel snapshot as an append-only revision. Nothing overwrites
// history: restoring an older revision republishes it forward.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  FileDown,
  History,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  ScanEye,
  Sparkles,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { LondonPpiPreview } from "@/components/events/LondonPpiPreview";
import { LondonPanelThumb } from "@/components/events/LondonPanelThumb";
import { LondonPanelLiveEditor } from "@/components/events/LondonPanelLiveEditor";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { runWithExportFeedback } from "@/lib/export-feedback";
import {
  auditAi,
  auditPng,
  auditSvg,
  qaReportCsv,
  qaSummary,
  rollup,
  type LondonQaReport,
} from "@/lib/london-signage-qa";
import {
  LONDON_STYLES,
  LONDON_VENUE,
  panelSlug,
  rasterSizeFor,
  type LondonPanel,
} from "@/lib/next-london-signage";
import {
  addedBetween,
  applyLondonEdits,
  baseRevision,
  buildLondonPanelAi,
  buildLondonPanelSvg,
  diffLondonPanels,
  editsBetween,
  effectiveLondonPanels,
  fingerprint,
  isAddedPanel,
  newLondonPanel,
  londonPanelFileBase,
  planLondonRegeneration,
  regenerationSummary,
  type LondonEditMap,
  type LondonPanelAdd,
  type LondonPanelEdit,
  type LondonRevision,
} from "@/lib/next-london-revise";
import { listLondonRevisions, publishLondonRevision } from "@/lib/next-london-revise.functions";
import { announceLondonRevision } from "@/lib/next-london-revision-live";

/** Millimetres as inches — signage specs read in both units. */
const inch = (mm: number) => (mm / 25.4).toFixed(mm < 100 ? 2 : 1);

export const Route = createFileRoute("/events/next_/london_/revise")({
  head: () => ({
    meta: [
      { title: "Revise London signage specs · NEXT 2026" },
      {
        name: "description",
        content:
          "Re-issue QEII Centre panel measurements, see exactly which panels need new .ai/.svg or PNG artwork, regenerate them, and publish the change as a versioned revision.",
      },
      { property: "og:title", content: "Revise NEXT 2026 London signage specs" },
      {
        property: "og:description",
        content:
          "Spec revisions with full version history and targeted artwork regeneration for the QEII Centre panel kit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LondonRevisePage,
});

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function renderDitheredPng(svg: string, w: number, h: number): Promise<Blob> {
  const img = new Image();
  img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterise the regenerated artwork."));
  });
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const n = (Math.random() - Math.random()) * 1.4;
    p[i] = Math.max(0, Math.min(255, p[i]! + n));
    p[i + 1] = Math.max(0, Math.min(255, p[i + 1]! + n));
    p[i + 2] = Math.max(0, Math.min(255, p[i + 2]! + n));
  }
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), "image/png"));
  if (!blob) throw new Error("PNG encoding failed.");
  return blob;
}

const NUM_FIELDS: { key: keyof LondonPanelEdit; label: string; width: string }[] = [
  { key: "trimW", label: "Trim W", width: "w-20" },
  { key: "trimH", label: "Trim H", width: "w-20" },
  { key: "bleedEdge", label: "Bleed/edge", width: "w-20" },
  { key: "rasterPpi", label: "ppi", width: "w-16" },
];

const FLOOR_OPTIONS: LondonPanel["floor"][] = ["GF", "2F", "3F", "4F", "5F"];

/** Spec form for a panel the venue team adds mid-build. */
function AddPanelForm({
  rooms,
  onAdd,
  onClose,
}: {
  rooms: string[];
  onAdd: (spec: LondonPanelAdd) => void;
  onClose: () => void;
}) {
  const [floor, setFloor] = useState<LondonPanel["floor"]>("GF");
  const [room, setRoom] = useState(rooms[0] ?? "ADDITIONAL");
  const [name, setName] = useState("");
  const [ground, setGround] = useState("Banner wash");
  const [style, setStyle] = useState(Object.keys(LONDON_STYLES)[0]!);
  const [trimW, setTrimW] = useState("2000");
  const [trimH, setTrimH] = useState("1000");
  const [bleedEdge, setBleedEdge] = useState("25");
  const [ppi, setPpi] = useState("");

  const w = Number(trimW);
  const h = Number(trimH);
  const edge = Number(bleedEdge);
  const valid =
    [w, h].every((n) => Number.isFinite(n) && n > 0) && Number.isFinite(edge) && edge >= 0;
  const autoName = `${(room || "ADDITIONAL").toUpperCase()} ADDITION - ${valid ? `${w}x${h}mm` : "…"}`;

  const field =
    "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] placeholder:text-[#999]";
  const label = "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#666]";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd({
          floor,
          room,
          name: name.trim() || autoName,
          ground,
          style,
          trimW: w,
          trimH: h,
          bleedEdge: edge,
          rasterPpi: ppi ? Number(ppi) : undefined,
        });
        setName("");
      }}
      className="mt-3 grid gap-3 rounded-2xl border border-[#003FC7]/25 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="sm:col-span-2">
        <span className={label}>Panel name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={autoName}
          className={field}
        />
      </label>
      <label>
        <span className={label}>Floor</span>
        <select
          value={floor}
          onChange={(e) => setFloor(e.target.value as LondonPanel["floor"])}
          className={field}
        >
          {FLOOR_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={label}>Room</span>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          list="london-rooms"
          className={field}
        />
        <datalist id="london-rooms">
          {rooms.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </label>
      <label>
        <span className={label}>Gradient</span>
        <select value={style} onChange={(e) => setStyle(e.target.value)} className={field}>
          {Object.entries(LONDON_STYLES).map(([id, st]) => (
            <option key={id} value={id}>
              {st.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={label}>Ground</span>
        <input value={ground} onChange={(e) => setGround(e.target.value)} className={field} />
      </label>
      <label>
        <span className={label}>Trim W (mm)</span>
        <input
          type="number"
          min={1}
          step={0.5}
          value={trimW}
          onChange={(e) => setTrimW(e.target.value)}
          className={field}
        />
      </label>
      <label>
        <span className={label}>Trim H (mm)</span>
        <input
          type="number"
          min={1}
          step={0.5}
          value={trimH}
          onChange={(e) => setTrimH(e.target.value)}
          className={field}
        />
      </label>
      <label>
        <span className={label}>Bleed / edge (mm)</span>
        <input
          type="number"
          min={0}
          step={0.5}
          value={bleedEdge}
          onChange={(e) => setBleedEdge(e.target.value)}
          className={field}
        />
      </label>
      <label>
        <span className={label}>ppi (blank = auto tier)</span>
        <input
          type="number"
          min={18}
          max={300}
          step={1}
          value={ppi}
          onChange={(e) => setPpi(e.target.value)}
          placeholder="auto"
          className={field}
        />
      </label>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <p className="mr-auto text-xs text-[#666]">
          {valid
            ? `Bleed box ${(w + edge * 2).toFixed(1)}×${(h + edge * 2).toFixed(1)}mm · artwork is built from this spec, then spec-QA'd on regeneration.`
            : "Enter a positive trim size to continue."}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#03002C]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#003FC7] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add panel
        </button>
      </div>
    </form>
  );
}

function LondonRevisePage() {
  const fetchRevisions = useServerFn(listLondonRevisions);
  const publish = useServerFn(publishLondonRevision);
  // The London kit hub is public, but this revision workflow is an editor —
  // signed-out visitors are bounced to the public kit instead.
  const userId = useSessionUser();

  const [revisions, setRevisions] = useState<LondonRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [edits, setEdits] = useState<LondonEditMap>({});
  const [added, setAdded] = useState<LondonPanel[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [note, setNote] = useState("");
  const [restoredFrom, setRestoredFrom] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [floor, setFloor] = useState<string>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [qa, setQa] = useState<LondonQaReport[] | null>(null);
  const [artId, setArtId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRevisions({});
      setRevisions(res.revisions);
      setHistoryError(null);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Could not load the revision history.");
    } finally {
      setLoading(false);
    }
  }, [fetchRevisions]);

  useEffect(() => {
    void load();
  }, [load]);

  const history = useMemo<LondonRevision[]>(
    () => [...revisions, baseRevision()].sort((a, b) => b.rev - a.rev),
    [revisions],
  );
  const head = history[0] ?? baseRevision();
  const current = useMemo(() => effectiveLondonPanels(revisions), [revisions]);
  const draft = useMemo(
    () =>
      applyLondonEdits(
        edits,
        current.filter((p) => !removed.includes(p.id)),
        added,
      ),
    [edits, current, added, removed],
  );
  const changes = useMemo(() => diffLondonPanels(current, draft), [current, draft]);
  const plan = useMemo(() => planLondonRegeneration(changes), [changes]);
  const dirty = changes.length > 0;
  const previewPanel = useMemo(
    () => draft.find((p) => p.id === previewId) ?? null,
    [draft, previewId],
  );

  const artPanel = useMemo(() => draft.find((p) => p.id === artId) ?? null, [draft, artId]);

  const floors = useMemo(() => [...new Set(draft.map((p) => p.floor))], [draft]);
  const visible = floor === "all" ? draft : draft.filter((p) => p.floor === floor);

  const setField = (panelId: string, field: keyof LondonPanelEdit, raw: string) => {
    setEdits((prev) => {
      const next: LondonEditMap = { ...prev, [panelId]: { ...prev[panelId] } };
      const entry = next[panelId]!;
      if (raw === "") delete (entry as Record<string, unknown>)[field];
      else if (field === "style" || field === "room" || field === "name" || field === "ground") {
        (entry as Record<string, unknown>)[field] = raw;
      } else {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) (entry as Record<string, unknown>)[field] = n;
        else delete (entry as Record<string, unknown>)[field];
      }
      if (Object.keys(entry).length === 0) delete next[panelId];
      return next;
    });
  };

  const addPanel = (spec: LondonPanelAdd) => {
    const panel = newLondonPanel(spec, draft);
    setAdded((prev) => [...prev, panel]);
    setFloor(panel.floor);
    toast.success(`${panel.name} added as a draft panel`, {
      description:
        "Its bleed box, ppi tier, band and weight are derived — regenerate to build the .ai/.svg/PNG.",
    });
  };

  const dropPanel = (panel: LondonPanel) => {
    if (isAddedPanel(panel) && added.some((p) => p.id === panel.id)) {
      setAdded((prev) => prev.filter((p) => p.id !== panel.id));
    } else {
      setRemoved((prev) => (prev.includes(panel.id) ? prev : [...prev, panel.id]));
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[panel.id];
      return next;
    });
    if (previewId === panel.id) setPreviewId(null);
    toast.info(`${panel.name} removed from the draft schedule`, {
      description:
        "Publish the revision to take it out of the kit — history keeps the old snapshot.",
    });
  };

  const regenerate = async (
    panels: LondonPanel[],
    rev: number,
    kind: "vector" | "raster",
    zipName?: string,
  ) => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const manifest: string[] = ["file,panel,room,trim_mm,bleed_mm,ppi,fingerprint,qa"];
    // Every regenerated file is audited against the revised spec before it is
    // packaged, and the audit ships inside the ZIP as qa-report.csv.
    const reports: LondonQaReport[] = [];
    for (const panel of panels) {
      const base = londonPanelFileBase(panel, rev);
      const svg = buildLondonPanelSvg(panel);
      if (kind === "vector") {
        const ai = buildLondonPanelAi(panel);
        const svgQa = auditSvg(panel, svg);
        const aiQa = auditAi(panel, ai);
        reports.push(svgQa, aiQa);
        zip.file(`vector/${base}.svg`, svg);
        zip.file(`vector/${base}.ai`, ai);
        manifest.push(
          `${base}.ai,${panel.name},${panel.room},${panel.trimW}x${panel.trimH},${panel.bleedW}x${panel.bleedH},${panel.rasterPpi},${fingerprint(ai)},${aiQa.status}`,
        );
      }
      const size = rasterSizeFor(panel, panel.rasterPpi);
      const png = await renderDitheredPng(svg, size.w, size.h);
      const pngQa = auditPng(panel, panel.rasterPpi, new Uint8Array(await png.arrayBuffer()));
      reports.push(pngQa);
      zip.file(`raster/${base}-${panel.rasterPpi}ppi.png`, png);
      manifest.push(
        `${base}-${panel.rasterPpi}ppi.png,${panel.name},${panel.room},${panel.trimW}x${panel.trimH},${panel.bleedW}x${panel.bleedH},${panel.rasterPpi},${fingerprint(svg)},${pngQa.status}`,
      );
    }
    zip.file("manifest.csv", manifest.join("\n"));
    zip.file("qa-report.csv", qaReportCsv(reports));
    const blob = await zip.generateAsync({ type: "blob" });
    download(blob, zipName ?? `NEXT-London-r${String(rev).padStart(3, "0")}-${kind}.zip`);

    const r = rollup(reports);
    setQa(reports);
    if (r.fail) {
      toast.error(`${r.fail} of ${r.total} regenerated files failed spec QA`, {
        description: qaSummary(reports.find((x) => x.status === "fail")!),
      });
    } else if (r.warn) {
      toast.warning(`${r.warn} of ${r.total} regenerated files carry QA warnings`, {
        description: qaSummary(reports.find((x) => x.status === "warn")!),
      });
    } else {
      toast.success(`Spec QA passed on all ${r.total} regenerated files`, {
        description: "Trim, bleed, ppi and banding verified against the revised spec.",
      });
    }
  };

  // One panel at a time: rebuild just this board's .svg, .ai and dithered PNG,
  // audited against its current (possibly edited) spec.
  const regenPanel = (panel: LondonPanel) => {
    void runWithExportFeedback(
      {
        pending: `Rebuilding ${panel.name}…`,
        success: `${panel.name} artwork downloaded`,
        failure: `Could not rebuild ${panel.name}`,
      },
      async () => {
        const rev = head.rev + (dirty ? 1 : 0);
        await regenerate(
          [panel],
          rev,
          "vector",
          `NEXT-London-r${String(rev).padStart(3, "0")}-${panelSlug(panel)}.zip`,
        );
      },
    );
  };

  const regenAffected = () => {
    const vectorPanels = draft.filter((p) => plan.vector.includes(p.id));
    const rasterPanels = draft.filter((p) => plan.raster.includes(p.id));
    if (vectorPanels.length === 0 && rasterPanels.length === 0) {
      toast.info("No artwork is affected — these changes are schedule-only.");
      return;
    }
    void runWithExportFeedback(
      {
        pending: `Regenerating ${vectorPanels.length + rasterPanels.length} panels…`,
        success: "Regenerated artwork downloaded",
        failure: "Regeneration failed",
      },
      async () => {
        const rev = head.rev + 1;
        if (vectorPanels.length) await regenerate(vectorPanels, rev, "vector");
        if (rasterPanels.length) await regenerate(rasterPanels, rev, "raster");
      },
    );
  };

  const publishRevision = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await publish({
        data: {
          note: note.trim() || undefined,
          panels: draft,
          changes: changes as unknown as Record<string, unknown>[],
          regen: plan as unknown as Record<string, unknown>,
          restoredFrom,
        },
      });
      setRevisions((prev) => [res.revision, ...prev]);
      setEdits({});
      setAdded([]);
      setRemoved([]);
      setNote("");
      setRestoredFrom(undefined);
      // Push the new spec to any already-open London kit page.
      announceLondonRevision(res.revision.rev);
      toast.success(`Revision ${res.revision.rev} published`, {
        description: regenerationSummary(plan),
      });
    } catch (err) {
      toast.error("Could not publish the revision", {
        description: err instanceof Error ? err.message : "Unexpected error.",
      });
    } finally {
      setSaving(false);
    }
  };

  const restore = (rev: LondonRevision) => {
    setEdits(editsBetween(current, rev.panels));
    setAdded(addedBetween(current, rev.panels));
    setRemoved(current.filter((p) => !rev.panels.some((q) => q.id === p.id)).map((p) => p.id));
    setRestoredFrom(rev.rev);
    setNote(`Restore revision ${rev.rev}${rev.note ? ` — ${rev.note}` : ""}`);
    toast.info(`Loaded revision ${rev.rev} as a draft`, {
      description: "Publish it to move the restore forward — earlier revisions stay untouched.",
    });
  };

  if (userId === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#03002C]">
            Sign in to revise the London kit
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#03002C]/70">
            The scenic panel kit is public — anyone can view and download the artwork — but
            changing venue specifications and publishing revisions requires an account.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link
              to="/events/next/london"
              className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the panel kit
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-[#03002C]/5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/events/next/london"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#003FC7] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the London signage kit
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#666]">
              Job {LONDON_VENUE.job} · {LONDON_VENUE.venue}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[#03002C]">
              Revise signage specifications
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-[1.45] text-[#666]">
              Re-issue trim, bleed or gradient for any panel. Element recomputes the raster tier,
              dither band and file weight, works out which panels need new vector artwork versus a
              PNG re-render, and stores the full snapshot as revision {head.rev + 1}.
            </p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#666]">
              In force
            </p>
            <p className="mt-0.5 text-lg font-semibold text-[#03002C]">Revision {head.rev}</p>
            <p className="text-xs text-[#666]">{head.note ?? "No note"}</p>
          </div>
        </header>

        {/* Change summary + publish */}
        <section className="mt-6 rounded-2xl border border-black/10 bg-[#F2F2F2] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
              <Sparkles className="h-4 w-4 text-[#003FC7]" aria-hidden="true" />
              {dirty
                ? `${changes.filter((c) => !c.derived).length} spec change${changes.filter((c) => !c.derived).length === 1 ? "" : "s"} · ${regenerationSummary(plan)}`
                : "No pending changes"}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEdits({});
                  setAdded([]);
                  setRemoved([]);
                  setRestoredFrom(undefined);
                }}
                disabled={!dirty}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#03002C] disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                Discard
              </button>
              <button
                type="button"
                onClick={regenAffected}
                disabled={!dirty}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#03002C] disabled:opacity-40"
              >
                <FileDown className="h-4 w-4" aria-hidden="true" />
                Regenerate affected artwork
              </button>
              <button
                type="button"
                onClick={() => void publishRevision()}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#003FC7] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                Publish revision {head.rev + 1}
              </button>
            </div>
          </div>

          {/* Audit of the most recent regeneration, mirroring qa-report.csv. */}
          {qa ? (
            <div className="mt-3 rounded-lg border border-black/10 bg-[#F7F9FC] p-3">
              <p className="text-[13px] font-semibold text-[#03002C]">
                {(() => {
                  const r = rollup(qa);
                  return `Spec QA — ${r.pass} pass · ${r.warn} warning · ${r.fail} fail of ${r.total} files`;
                })()}
              </p>
              <ul className="mt-1.5 space-y-1">
                {qa
                  .filter((r) => r.status !== "pass")
                  .slice(0, 5)
                  .map((r) => (
                    <li
                      key={`${r.file}-${r.kind}`}
                      className="text-[12px] leading-relaxed text-[#666]"
                    >
                      <span className="font-medium text-[#03002C]">{r.file}</span> — {qaSummary(r)}
                    </li>
                  ))}
                {qa.every((r) => r.status === "pass") ? (
                  <li className="text-[12px] text-[#666]">
                    Trim, bleed, ppi and banding verified on every regenerated file.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <label className="mt-3 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#666]">
              Revision note
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Churchill columns re-measured on site, 3mm bleed added"
              className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] placeholder:text-[#999]"
            />
          </label>

          {dirty ? (
            <ul className="mt-3 max-h-52 space-y-1 overflow-y-auto text-xs">
              {changes.map((c, i) => (
                <li
                  key={`${c.panelId}-${c.field}-${i}`}
                  className="flex flex-wrap items-baseline gap-x-2 rounded-md bg-white px-2.5 py-1.5"
                >
                  <span className="font-semibold text-[#03002C]">{c.panelName}</span>
                  <span className="text-[#666]">{c.label}</span>
                  <span className="text-[#666] line-through">{String(c.from)}</span>
                  <span aria-hidden="true" className="text-[#666]">
                    →
                  </span>
                  <span className="font-semibold text-[#003FC7]">{String(c.to)}</span>
                  {c.derived ? (
                    <span className="rounded bg-[#E0E8F5] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#003FC7]">
                      derived
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Panel editor */}
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[#03002C]">Panel schedule</h2>
              <button
                type="button"
                onClick={() => setAddOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003FC7]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add panel
              </button>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {["all", ...floors].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFloor(f)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      floor === f
                        ? "bg-[#003FC7] text-white"
                        : "border border-black/10 bg-white text-[#03002C]"
                    }`}
                  >
                    {f === "all" ? `All ${draft.length}` : f}
                  </button>
                ))}
              </div>
            </div>

            {addOpen ? (
              <AddPanelForm
                rooms={[...new Set(draft.map((p) => p.room))]}
                onAdd={addPanel}
                onClose={() => setAddOpen(false)}
              />
            ) : null}

            {removed.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#E53D2E]/25 bg-[#E53D2E]/5 px-3 py-2 text-xs text-[#03002C]">
                <span className="font-semibold">
                  {removed.length} panel{removed.length === 1 ? "" : "s"} removed in this draft
                </span>
                {removed.map((id) => {
                  const panel = current.find((p) => p.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRemoved((prev) => prev.filter((x) => x !== id))}
                      className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 font-medium"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      Restore {panel?.name ?? id}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 bg-white">
              <table className="w-full min-w-[880px] text-sm">
                <caption className="sr-only">
                  Editable panel specifications with recomputed raster values
                </caption>
                <thead>
                  <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-[0.12em] text-[#666]">
                    <th scope="col" className="px-3 py-2.5">
                      Panel
                    </th>
                    <th scope="col" className="px-3 py-2.5">
                      Gradient
                    </th>
                    {NUM_FIELDS.map((f) => (
                      <th key={String(f.key)} scope="col" className="px-2 py-2.5">
                        {f.label}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2.5">
                      Derived
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((panel) => {
                    const touched = plan.touched.includes(panel.id);
                    return (
                      <tr
                        key={panel.id}
                        className={`border-b border-black/5 align-top ${touched ? "bg-[#E0E8F5]/60" : ""}`}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-start gap-2.5">
                            <LondonPanelThumb panel={panel} size={64} onOpen={(p) => setArtId(p.id)} />
                            <div>
                              <p className="font-semibold text-[#03002C]">{panel.name}</p>
                              <p className="text-xs text-[#666]">
                                {panel.floor} · {panel.room}
                              </p>
                              {isAddedPanel(panel) ? (
                                <span className="mt-1 inline-block rounded bg-[#A6FA87]/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#03002C]">
                                  Added
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <select
                            aria-label={`Gradient style for ${panel.name}`}
                            value={panel.style}
                            onChange={(e) => setField(panel.id, "style", e.target.value)}
                            className="w-40 rounded-md border border-black/15 bg-white px-2 py-1.5 text-xs text-[#03002C]"
                          >
                            {Object.entries(LONDON_STYLES).map(([id, s]) => (
                              <option key={id} value={id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        {NUM_FIELDS.map((f) => (
                          <td key={String(f.key)} className="px-2 py-2.5">
                            <input
                              type="number"
                              min={1}
                              step={f.key === "rasterPpi" ? 1 : 0.5}
                              aria-label={`${f.label} for ${panel.name}`}
                              value={String(panel[f.key as keyof LondonPanel] ?? "")}
                              onChange={(e) => setField(panel.id, f.key, e.target.value)}
                              className={`${f.width} rounded-md border border-black/15 bg-white px-2 py-1.5 text-xs text-[#03002C]`}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-xs text-[#666]">
                          <p>
                            {panel.bleedW}×{panel.bleedH}mm bleed · {inch(panel.trimW)}×
                            {inch(panel.trimH)} in trim
                          </p>
                          <p>
                            {panel.rasterPx}px · {panel.rasterMb}MB · band {panel.bandMm}mm
                          </p>
                          <button
                            type="button"
                            onClick={() => setPreviewId(panel.id)}
                            className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-black/10 px-2 py-1 text-[11px] font-semibold text-[#03002C]"
                          >
                            <ScanEye className="h-3.5 w-3.5" aria-hidden="true" />
                            Preview ppi tiers
                          </button>
                          <button
                            type="button"
                            onClick={() => regenPanel(panel)}
                            className="ml-1.5 mt-1 inline-flex items-center gap-1.5 rounded-md border border-[#003FC7]/30 px-2 py-1 text-[11px] font-semibold text-[#003FC7]"
                          >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            Rebuild this panel
                          </button>

                          <button
                            type="button"
                            onClick={() => dropPanel(panel)}
                            className="ml-1.5 mt-1 inline-flex items-center gap-1.5 rounded-md border border-[#E53D2E]/30 px-2 py-1 text-[11px] font-semibold text-[#E53D2E]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* History */}
          <aside>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#03002C]">
              <History className="h-4 w-4 text-[#003FC7]" aria-hidden="true" />
              Version history
            </h2>
            {loading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-[#666]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading revisions…
              </p>
            ) : null}
            {historyError ? (
              <p className="mt-3 rounded-lg border border-[#E53D2E]/30 bg-[#E53D2E]/5 px-3 py-2 text-xs text-[#03002C]">
                {historyError} The issued pack is still editable — publishing will retry.
              </p>
            ) : null}
            <ol className="mt-3 space-y-2">
              {history.map((rev) => (
                <li key={rev.id} className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[#03002C]">
                      Revision {rev.rev}
                      {rev.rev === head.rev ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded bg-[#A6FA87]/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#03002C]">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          In force
                        </span>
                      ) : null}
                    </p>
                    <time className="text-[11px] text-[#666]" dateTime={rev.createdAt}>
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  <p className="mt-1 text-xs leading-[1.45] text-[#666]">{rev.note ?? "No note"}</p>
                  {rev.restoredFrom != null ? (
                    <p className="mt-1 text-[11px] text-[#666]">
                      Restored from revision {rev.restoredFrom}
                    </p>
                  ) : null}
                  {rev.changes.length ? (
                    <p className="mt-1 text-[11px] text-[#666]">
                      {rev.changes.filter((c) => !c.derived).length} spec change(s) ·{" "}
                      {regenerationSummary(
                        "vector" in rev.regen
                          ? (rev.regen as ReturnType<typeof planLondonRegeneration>)
                          : { vector: [], raster: [], metadata: [], touched: [] },
                      )}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => restore(rev)}
                      disabled={rev.rev === head.rev}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-[#03002C] disabled:opacity-40"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runWithExportFeedback(
                          {
                            pending: `Rebuilding revision ${rev.rev}`,
                            success: `Revision ${rev.rev} artwork downloaded`,
                            failure: "Rebuild failed",
                          },
                          () => regenerate(rev.panels, rev.rev, "vector"),
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-[#03002C]"
                    >
                      <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                      Rebuild files
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>

      {/* On-screen check of every resolution tier before anything is generated. */}
      <Dialog open={!!previewPanel} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {previewPanel ? (
            <>
              <DialogTitle className="text-base font-semibold text-[#03002C]">
                {previewPanel.name}
              </DialogTitle>
              <p className="text-xs text-[#666]">
                {previewPanel.floor} · {previewPanel.room} · previewing the{" "}
                {plan.touched.includes(previewPanel.id) ? "revised" : "current"} specification (
                {previewPanel.trimW}×{previewPanel.trimH}mm ({inch(previewPanel.trimW)}×
                {inch(previewPanel.trimH)} in) trim, {previewPanel.bleedEdge}mm bleed
                per edge).
              </p>
              <LondonPpiPreview panel={previewPanel} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Click-through live editor: full panel editing at the panel's true aspect. */}
      <Dialog open={!!artPanel} onOpenChange={(o) => !o && setArtId(null)}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
          {artPanel ? (
            <>
              <DialogTitle className="text-base font-semibold text-[#03002C]">
                Edit {artPanel.name}
              </DialogTitle>
              <p className="text-xs text-[#666]">
                {artPanel.floor} · {artPanel.room} · {artPanel.trimW}×{artPanel.trimH}mm (
                {inch(artPanel.trimW)}×{inch(artPanel.trimH)} in) trim ·{" "}
                {artPanel.bleedW}×{artPanel.bleedH}mm bleed · {artPanel.rasterPx}px at{" "}
                {artPanel.rasterPpi}ppi
              </p>
              <LondonPanelLiveEditor
                panel={artPanel}
                siblingIds={visible.filter((p) => p.id !== artPanel.id).map((p) => p.id)}
                onStyleChange={(styleId) => setField(artPanel.id, "style", styleId)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => regenPanel(artPanel)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#003FC7] px-3 py-2 text-sm font-semibold text-white"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Rebuild this panel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArtId(null);
                    setPreviewId(artPanel.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-sm font-semibold text-[#03002C]"
                >
                  <ScanEye className="h-4 w-4" aria-hidden="true" />
                  Preview ppi tiers
                </button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
