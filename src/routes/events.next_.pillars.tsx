import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Ruler } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PillarSign } from "@/components/next/PillarSign";
import { exportPillarSign } from "@/lib/next-pillar-export";
import {
  PILLAR_ARROWS,
  PILLAR_DIVISIONS,
  PILLAR_KINDS,
  PILLAR_SPEC,
  PILLAR_STYLE_IDS,
  pillarDefault,
  pillarKind,
  pillarName,
  pillarStyleLabel,
  withPillarKind,
  type PillarConfig,
} from "@/lib/next-pillar-masters";

export const Route = createFileRoute("/events/next_/pillars")({
  head: () => ({
    meta: [
      { title: "NEXT master pillar signs · Welcome, registration, logo, directional" },
      {
        name: "description",
        content:
          "Press-ready TransPerfect NEXT pillar signs — welcome, registration, general logo and directional — on the approved London gradient grounds, available for every NEXT division area.",
      },
      { property: "og:title", content: "NEXT master pillar signs" },
      {
        property: "og:description",
        content:
          "Four master pillar kinds on the approved NEXT gradient grounds, with division lockup swapping and PDF + .ai + proof exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PillarPage,
});

const NATIVE_PX_PER_MM = 0.72;

function PillarPage() {
  const [config, setConfig] = useState<PillarConfig>(pillarDefault());
  const [guides, setGuides] = useState(true);
  const [busy, setBusy] = useState(false);
  const plateRef = useRef<HTMLDivElement | null>(null);

  const set = <K extends keyof PillarConfig>(key: K, value: PillarConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const runExport = async () => {
    const node = plateRef.current?.querySelector<HTMLElement>('[data-kit-asset-frame="true"]');
    if (!node) return;
    setBusy(true);
    const id = toast.loading("Preparing the pillar print package…");
    try {
      const result = await exportPillarSign({
        node,
        nativeWidth: PILLAR_SPEC.bleedW * NATIVE_PX_PER_MM,
        nativeHeight: PILLAR_SPEC.bleedH * NATIVE_PX_PER_MM,
        config,
        onProgress: (p) => toast.loading(p.label, { id }),
      });
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Pillar package downloaded", {
        id,
        description: `PDF + .ai + editable vector ground + proof · plate ${result.plate.width}×${result.plate.height}px at ${result.plate.ppi} ppi`,
      });
    } catch (e) {
      toast.error("Export failed", { id, description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]";
  const label = "text-xs font-medium text-black/60";
  const kind = pillarKind(config.kind);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> NEXT 2026 hub
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">
          Master pillar signs
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/65">
          Welcome, registration, general logo and directional pillars on the approved NEXT gradient
          grounds. The palette and geometry are fixed for every division area — only the approved
          division lockup and the copy change.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Preview */}
          <div className="rounded-2xl border border-black/10 bg-[#F2F2F2] p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-black/50">
                {pillarName(config)}
              </div>
              <label className="flex items-center gap-2 text-xs text-black/60">
                <input
                  type="checkbox"
                  checked={guides}
                  onChange={(e) => setGuides(e.target.checked)}
                />
                Trim &amp; safe guides
              </label>
            </div>
            <div className="mt-6 flex justify-center overflow-hidden" ref={plateRef}>
              <div
                style={{
                  width: PILLAR_SPEC.bleedW * NATIVE_PX_PER_MM * 0.62,
                  height: PILLAR_SPEC.bleedH * NATIVE_PX_PER_MM * 0.62,
                }}
              >
                <PillarSign
                  config={config}
                  pxPerMm={NATIVE_PX_PER_MM}
                  guides={guides}
                  style={{ transform: "scale(0.62)", transformOrigin: "top left" }}
                />
              </div>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-black/55">
              <Ruler size={13} /> Trim {PILLAR_SPEC.trimW} × {PILLAR_SPEC.trimH} mm · bleed{" "}
              {PILLAR_SPEC.bleedEdge} mm per edge · safe {PILLAR_SPEC.safeInset} mm · issued raster{" "}
              {PILLAR_SPEC.rasterPpi} ppi · {PILLAR_SPEC.exportPreset}
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <div className={label}>Sign kind</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PILLAR_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setConfig((c) => withPillarKind(c, k.id))}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      config.kind === k.id
                        ? "border-[#003FC7] bg-[#E0E8F5] text-[#03002C]"
                        : "border-black/15 text-black/70 hover:border-[#003FC7]/50"
                    }`}
                  >
                    {k.name}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-black/55">{kind.note}</p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <div className={label}>Division area</div>
              <select
                className={`${field} mt-2`}
                value={config.divisionId}
                onChange={(e) => set("divisionId", e.target.value)}
              >
                {PILLAR_DIVISIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <label className="mt-3 flex items-center gap-2 text-xs text-black/60">
                <input
                  type="checkbox"
                  checked={config.showLockup}
                  onChange={(e) => set("showLockup", e.target.checked)}
                />
                Print the division lockup
              </label>

              <div className={`${label} mt-5`}>Gradient ground</div>
              <select
                className={`${field} mt-2`}
                value={config.styleId}
                onChange={(e) => set("styleId", e.target.value)}
              >
                {PILLAR_STYLE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {pillarStyleLabel(id)}
                  </option>
                ))}
              </select>
            </div>

            {config.kind === "logo" ? null : (
              <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-3">
                <div>
                  <div className={label}>Headline</div>
                  <input
                    className={`${field} mt-1`}
                    value={config.headline}
                    onChange={(e) => set("headline", e.target.value)}
                  />
                </div>
                <div>
                  <div className={label}>Subline</div>
                  <input
                    className={`${field} mt-1`}
                    value={config.subline}
                    onChange={(e) => set("subline", e.target.value)}
                  />
                </div>
                <div>
                  <div className={label}>Footer detail</div>
                  <input
                    className={`${field} mt-1`}
                    value={config.detail}
                    onChange={(e) => set("detail", e.target.value)}
                  />
                </div>
                {config.kind === "directional" ? (
                  <div>
                    <div className={label}>Arrow</div>
                    <select
                      className={`${field} mt-1`}
                      value={config.arrow}
                      onChange={(e) => set("arrow", e.target.value as PillarConfig["arrow"])}
                    >
                      {PILLAR_ARROWS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            )}

            <button
              type="button"
              onClick={runExport}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#003FC7] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              <Download size={15} /> {busy ? "Exporting…" : "Export print package"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
