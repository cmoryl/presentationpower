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
  PILLAR_FACES,
  PILLAR_KINDS,
  PILLAR_HEADLINE_SIZE,
  PILLAR_SPEC,
  PILLAR_STYLE_IDS,
  PILLAR_TEXT_COLORS,
  pillarDefault,
  pillarHeadlineInk,
  pillarHeadlineSize,

  pillarFace,
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
              <div className={label}>Face</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PILLAR_FACES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => set("face", f.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      config.face === f.id
                        ? "border-[#003FC7] bg-[#E0E8F5] text-[#03002C]"
                        : "border-black/15 text-black/70 hover:border-[#003FC7]/50"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-black/55">
                {pillarFace(config.face).note}
              </p>

              <div className={`${label} mt-5`}>Division area</div>
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

              {config.showLockup ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className={label}>Lockup size</div>
                    <div className="text-xs tabular-nums text-black/55">
                      {Math.round(pillarLockupScale(config) * 100)}% ·{" "}
                      {Math.round(PILLAR_SPEC.trimW * 0.58 * pillarLockupScale(config))} mm wide
                    </div>
                  </div>
                  <input
                    type="range"
                    className="mt-2 w-full accent-[#003FC7]"
                    min={PILLAR_LOCKUP_SCALE.min}
                    max={PILLAR_LOCKUP_SCALE.max}
                    step={PILLAR_LOCKUP_SCALE.step}
                    value={pillarLockupScale(config)}
                    onChange={(e) => set("lockupScale", Number(e.target.value))}
                  />
                </div>
              ) : null}



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
                  <div className="flex items-center justify-between">
                    <div className={label}>Headline size</div>
                    <div className="text-xs tabular-nums text-black/55">
                      {pillarHeadlineSize(config)} mm
                    </div>
                  </div>
                  <input
                    type="range"
                    className="mt-2 w-full accent-[#003FC7]"
                    min={PILLAR_HEADLINE_SIZE.min}
                    max={PILLAR_HEADLINE_SIZE.max}
                    step={PILLAR_HEADLINE_SIZE.step}
                    value={pillarHeadlineSize(config)}
                    onChange={(e) => set("headlineSize", Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className={label}>Headline colour</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => set("headlineColor", "")}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                        !config.headlineColor
                          ? "border-[#003FC7] bg-[#E0E8F5] text-[#03002C]"
                          : "border-black/15 text-black/60 hover:border-[#003FC7]/50"
                      }`}
                    >
                      Face default
                    </button>
                    {PILLAR_TEXT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        onClick={() => set("headlineColor", c.hex)}
                        className={`h-7 w-7 rounded-full border-2 ${
                          config.headlineColor?.toLowerCase() === c.hex.toLowerCase()
                            ? "border-[#003FC7]"
                            : "border-black/15"
                        }`}
                        style={{ background: c.hex }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="Custom headline colour"
                      className="h-7 w-9 cursor-pointer rounded border border-black/15 bg-white"
                      value={pillarHeadlineInk(config)}
                      onChange={(e) => set("headlineColor", e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-black/60">
                  <input
                    type="checkbox"
                    checked={config.verticalHeadline}
                    onChange={(e) => set("verticalHeadline", e.target.checked)}
                  />
                  Run the headline vertically up the column
                </label>
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

        {/* Light-face pillar set, one per NEXT division area */}
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-[#03002C]">
            Light-face pillars · every NEXT division
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/65">
            The same approved geometry and gradient grounds tinted back for bright concourses, with
            the colour division lockup and Blue 800 copy. Pick one to load it into the editor above.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {PILLAR_DIVISIONS.map((d) => {
              const preview: PillarConfig = {
                ...config,
                divisionId: d.id,
                face: "light",
              };
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setConfig((c) => ({ ...c, divisionId: d.id, face: "light" }));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group rounded-xl border border-black/10 bg-white p-2 text-left transition hover:border-[#003FC7]"
                >
                  <div className="flex justify-center overflow-hidden rounded-lg bg-[#F2F2F2] py-2">
                    <PillarSign config={preview} pxPerMm={0.13} />
                  </div>
                  <div className="mt-2 px-1 pb-1 text-xs font-medium text-[#03002C]">{d.name}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
