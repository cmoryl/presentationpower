// General event pillar sign generator. Live editable pillar files on the
// approved NEXT gradient grounds: selectable pillar footprints, headline and
// sub-line copy, real printable QR codes, saved versions and high-resolution
// print export.

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, QrCode, Ruler, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useSignedIn } from "@/components/CloudDeckControls";
import { PillarSign } from "@/components/next/PillarSign";
import { exportPillarSign } from "@/lib/next-pillar-export";
import {
  deletePillarFile,
  listPillarFiles,
  savePillarFile,
  updatePillarFile,
} from "@/lib/event-pillar.functions";
import {
  PILLAR_ARROWS,
  PILLAR_ARROW_STYLES,
  pillarArrowPath,
  PILLAR_CUSTOM_SIZE,
  PILLAR_DIVISIONS,
  PILLAR_FACES,
  PILLAR_HEADLINE_OFFSET,
  PILLAR_HEADLINE_SIZE,
  PILLAR_KINDS,
  PILLAR_LOCKUP_SCALE,
  PILLAR_QR_SIZE,
  PILLAR_SIZES,
  PILLAR_SPEC,
  PILLAR_STYLE_IDS,
  PILLAR_SUB_SIZE,
  PILLAR_TEXT_COLORS,
  pillarDefault,
  pillarFace,
  pillarGeometry,
  pillarHeadlineInk,
  pillarHeadlineOffset,
  pillarHeadlineSize,
  pillarKind,
  pillarContrastRatio,
  pillarLockupScale,
  pillarName,
  pillarQrBackground,
  pillarQrForeground,
  pillarQrScanSafe,
  pillarQrSize,
  pillarQrStyle,
  PILLAR_QR_MIN_CONTRAST,
  PILLAR_QR_STYLES,
  pillarStyleLabel,
  pillarSubSize,
  withPillarKind,
  type PillarConfig,
} from "@/lib/next-pillar-masters";

const NATIVE_PX_PER_MM = 0.72;

/** Output tiers. Large-format grounds are viewed at distance, so the issued
 * 36 ppi tier stays the default; the higher tiers are for close-read pillars. */
const PPI_TIERS = [
  { ppi: PILLAR_SPEC.rasterPpi, label: `${PILLAR_SPEC.rasterPpi} ppi · issued large-format` },
  { ppi: 72, label: "72 ppi · close-read pillar" },
  { ppi: 150, label: "150 ppi · hand-height panel" },
];

type PillarFileRow = {
  id: string;
  name: string;
  event_label: string;
  notes: string;
  config: PillarConfig;
  updated_at: string;
};

export function PillarStudio({
  scope = "events",
  heading = "Event pillar signs",
  intro = "Welcome, registration, logo and directional pillars on the approved NEXT gradient grounds. Set the measured pillar footprint, add a sub-line and a real scannable QR code, save the live file and export press-ready art.",
  showDivisionGallery = true,
}: {
  scope?: string;
  heading?: string;
  intro?: string;
  showDivisionGallery?: boolean;
}) {
  const [config, setConfig] = useState<PillarConfig>(pillarDefault());
  const [guides, setGuides] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ppi, setPpi] = useState<number>(PILLAR_SPEC.rasterPpi);
  const [fileName, setFileName] = useState("");
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);

  const signedIn = useSignedIn();
  const qc = useQueryClient();
  const list = useServerFn(listPillarFiles);
  const create = useServerFn(savePillarFile);
  const update = useServerFn(updatePillarFile);
  const remove = useServerFn(deletePillarFile);

  const files = useQuery({
    queryKey: ["event-pillar-files"],
    queryFn: async () => (await list()) as unknown as PillarFileRow[],
    enabled: signedIn === true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = fileName.trim() || pillarName(config);
      if (openFileId) {
        return update({
          data: { id: openFileId, name, eventLabel: config.eventLabel ?? "", scope, config },
        });
      }
      return create({ data: { name, eventLabel: config.eventLabel ?? "", scope, notes: "", config } });
    },
    onSuccess: (row: unknown) => {
      const saved = row as PillarFileRow | null;
      if (saved?.id) setOpenFileId(saved.id);
      if (saved?.name) setFileName(saved.name);
      void qc.invalidateQueries({ queryKey: ["event-pillar-files"] });
      toast.success(openFileId ? "Pillar file updated" : "Pillar file saved");
    },
    onError: (e: Error) => toast.error("Could not save", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: (_r, id) => {
      if (id === openFileId) {
        setOpenFileId(null);
        setFileName("");
      }
      void qc.invalidateQueries({ queryKey: ["event-pillar-files"] });
      toast.success("Pillar file deleted");
    },
    onError: (e: Error) => toast.error("Could not delete", { description: e.message }),
  });

  const set = <K extends keyof PillarConfig>(key: K, value: PillarConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const geo = pillarGeometry(config);
  // Fit the whole pillar into a tall viewing plate, then let the user zoom in.
  const fitScale = Math.min(0.95, 820 / (geo.bleedH * NATIVE_PX_PER_MM));
  const previewScale = fitScale * zoom;


  const runExport = async () => {
    const node = plateRef.current?.querySelector<HTMLElement>('[data-kit-asset-frame="true"]');
    if (!node) return;
    setBusy(true);
    const id = toast.loading("Preparing the pillar print package…");
    try {
      const result = await exportPillarSign({
        node,
        nativeWidth: geo.bleedW * NATIVE_PX_PER_MM,
        nativeHeight: geo.bleedH * NATIVE_PX_PER_MM,
        config,
        ppi,
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
    <>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">{heading}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/65">{intro}</p>

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
                width: geo.bleedW * NATIVE_PX_PER_MM * previewScale,
                height: geo.bleedH * NATIVE_PX_PER_MM * previewScale,
              }}
            >
              <PillarSign
                config={config}
                pxPerMm={NATIVE_PX_PER_MM}
                guides={guides}
                style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}
              />
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-black/55">
            <Ruler size={13} /> {geo.sizeName} · trim {geo.trimW} × {geo.trimH} mm · bleed{" "}
            {geo.bleedEdge} mm per edge · safe {Math.round(geo.safeInset)} mm · {geo.exportPreset}
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Pillar footprint */}
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <div className={label}>Pillar size</div>
            <select
              className={`${field} mt-2`}
              value={config.sizeId}
              onChange={(e) =>
                setConfig((c) => {
                  const next = PILLAR_SIZES.find((s) => s.id === e.target.value)!;
                  return {
                    ...c,
                    sizeId: next.id,
                    trimW: next.trimW,
                    trimH: next.trimH,
                  };
                })
              }
            >
              {PILLAR_SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.trimW} × {s.trimH} mm
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-relaxed text-black/55">
              {PILLAR_SIZES.find((s) => s.id === config.sizeId)?.note}
            </p>
            {config.sizeId === "custom" ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Trim width (mm)</span>
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    min={PILLAR_CUSTOM_SIZE.w.min}
                    max={PILLAR_CUSTOM_SIZE.w.max}
                    step={PILLAR_CUSTOM_SIZE.w.step}
                    value={config.trimW}
                    onChange={(e) => set("trimW", Number(e.target.value))}
                  />
                </label>
                <label className="block">
                  <span className={label}>Trim height (mm)</span>
                  <input
                    type="number"
                    className={`${field} mt-1`}
                    min={PILLAR_CUSTOM_SIZE.h.min}
                    max={PILLAR_CUSTOM_SIZE.h.max}
                    step={PILLAR_CUSTOM_SIZE.h.step}
                    value={config.trimH}
                    onChange={(e) => set("trimH", Number(e.target.value))}
                  />
                </label>
              </div>
            ) : null}
          </div>

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
                    {Math.round(geo.trimW * 0.58 * pillarLockupScale(config))} mm wide
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
                <div className={label}>Sub-line (optional)</div>
                <input
                  className={`${field} mt-1`}
                  placeholder="e.g. Doors open 08:00 · Level 2"
                  value={config.subheadline}
                  onChange={(e) => set("subheadline", e.target.value)}
                />
              </div>
              {config.subheadline.trim() ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div className={label}>Sub-line size</div>
                    <div className="text-xs tabular-nums text-black/55">
                      {pillarSubSize(config)} mm
                    </div>
                  </div>
                  <input
                    type="range"
                    className="mt-2 w-full accent-[#003FC7]"
                    min={PILLAR_SUB_SIZE.min}
                    max={PILLAR_SUB_SIZE.max}
                    step={PILLAR_SUB_SIZE.step}
                    value={pillarSubSize(config)}
                    onChange={(e) => set("subheadlineSize", Number(e.target.value))}
                  />
                </div>
              ) : null}
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
                <div className="flex items-center justify-between">
                  <div className={label}>Headline drop</div>
                  <div className="text-xs tabular-nums text-black/55">
                    +{pillarHeadlineOffset(config)} mm
                  </div>
                </div>
                <input
                  type="range"
                  className="mt-2 w-full accent-[#003FC7]"
                  min={PILLAR_HEADLINE_OFFSET.min}
                  max={PILLAR_HEADLINE_OFFSET.max}
                  step={PILLAR_HEADLINE_OFFSET.step}
                  value={pillarHeadlineOffset(config)}
                  onChange={(e) => set("headlineOffset", Number(e.target.value))}
                />
                <p className="mt-1 text-[11px] text-black/45">
                  Pushes the headline block further down the column. It can never move up into the
                  lockup zone.
                </p>
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
                  <div className={`${label} mt-3`}>Arrow style</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {PILLAR_ARROW_STYLES.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        title={a.note}
                        onClick={() => set("arrowStyle", a.id)}
                        className={`rounded-xl border p-2 text-center transition ${
                          (config.arrowStyle ?? "solid") === a.id
                            ? "border-[#003FC7] bg-[#003FC7]/5"
                            : "border-black/10 hover:border-black/25"
                        }`}
                      >
                        <svg viewBox="0 0 100 100" className="mx-auto h-7 w-7" aria-hidden>
                          <path d={pillarArrowPath(a.id)} fill="#03002C" />
                        </svg>
                        <div className="mt-1 text-[10px] leading-tight text-black/65">{a.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {config.kind === "logo" ? (
            <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-3">
              <div className={label}>Under the logo (optional)</div>
              <input
                className={field}
                placeholder="URL — e.g. transperfect.com/next"
                value={config.logoUrl ?? ""}
                onChange={(e) => set("logoUrl", e.target.value)}
              />
              <input
                className={field}
                placeholder="Socials — e.g. @transperfect · #TPNEXT"
                value={config.logoSocial ?? ""}
                onChange={(e) => set("logoSocial", e.target.value)}
              />
              <p className="text-[11px] leading-relaxed text-black/55">
                The lockup sits a quarter of the column lower on a general logo pillar; these lines
                print under it as live vector text.
              </p>
            </div>
          ) : null}

          {/* QR stylizer */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-black/60">
              <QrCode size={14} /> Printed QR stylizer
            </div>
            <input
              className={field}
              placeholder="https://next.transperfect.com/london"
              value={config.qrData}
              onChange={(e) => set("qrData", e.target.value)}
            />
            {config.qrData.trim() ? (
              <>
                <input
                  className={field}
                  placeholder="Caption under the code (optional)"
                  value={config.qrCaption}
                  onChange={(e) => set("qrCaption", e.target.value)}
                />
                <div>
                  <div className="flex items-center justify-between">
                    <div className={label}>QR size</div>
                    <div className="text-xs tabular-nums text-black/55">
                      {pillarQrSize(config)} mm square
                    </div>
                  </div>
                  <input
                    type="range"
                    className="mt-2 w-full accent-[#003FC7]"
                    min={PILLAR_QR_SIZE.min}
                    max={PILLAR_QR_SIZE.max}
                    step={PILLAR_QR_SIZE.step}
                    value={pillarQrSize(config)}
                    onChange={(e) => set("qrSize", Number(e.target.value))}
                  />
                </div>

                <div>
                  <div className={label}>Module style</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {PILLAR_QR_STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        title={s.note}
                        onClick={() => set("qrStyle", s.id)}
                        className={`rounded-lg border px-2 py-2 text-center text-xs ${
                          pillarQrStyle(config) === s.id
                            ? "border-[#003FC7] bg-[#E0E8F5] text-[#03002C]"
                            : "border-black/15 text-black/60 hover:border-[#003FC7]/50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(
                  [
                    ["Ink colour", "qrForeground", pillarQrForeground(config)],
                    ["Plate colour", "qrBackground", pillarQrBackground(config)],
                  ] as const
                ).map(([labelText, key, current]) => (
                  <div key={key}>
                    <div className={label}>{labelText}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {PILLAR_TEXT_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={c.label}
                          aria-label={`${labelText}: ${c.label}`}
                          onClick={() => set(key, c.hex)}
                          className={`h-7 w-7 rounded-full border-2 ${
                            current.toLowerCase() === c.hex.toLowerCase()
                              ? "border-[#003FC7]"
                              : "border-black/15"
                          }`}
                          style={{ background: c.hex }}
                        />
                      ))}
                      <input
                        type="color"
                        aria-label={`Custom ${labelText.toLowerCase()}`}
                        className="h-7 w-9 cursor-pointer rounded border border-black/15 bg-white"
                        value={current}
                        onChange={(e) => set(key, e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                ))}

                {pillarQrScanSafe(config) ? (
                  <p className="rounded-lg bg-[#A6FA87]/30 px-3 py-2 text-[11px] font-medium text-[#03002C]">
                    Scan-safe · contrast{" "}
                    {pillarContrastRatio(pillarQrForeground(config), pillarQrBackground(config)).toFixed(1)}
                    :1 · error-correction H · quiet zone included. Encoded live from the payload and
                    drawn as vector modules, so the printed code is 100% scannable.
                  </p>
                ) : (
                  <div className="rounded-lg bg-[#FFEB66]/40 px-3 py-2 text-[11px] text-[#03002C]">
                    <p>
                      Low contrast (
                      {pillarContrastRatio(pillarQrForeground(config), pillarQrBackground(config)).toFixed(1)}
                      :1 — needs {PILLAR_QR_MIN_CONTRAST}:1). This pairing may not scan in the
                      hall.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        set("qrForeground", "");
                        set("qrBackground", "");
                      }}
                      className="mt-2 rounded-lg border border-[#003FC7] px-3 py-1.5 font-medium text-[#003FC7]"
                    >
                      Reset to scan-safe colours
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[11px] text-black/45">
                Paste a link or text to print a real scannable code on the pillar.
              </p>
            )}
          </div>

          {/* Output */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-3">
            <div className={label}>Print resolution</div>
            <select
              className={field}
              value={ppi}
              onChange={(e) => setPpi(Number(e.target.value))}
            >
              {PPI_TIERS.map((t) => (
                <option key={t.ppi} value={t.ppi}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={runExport}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#003FC7] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              <Download size={15} /> {busy ? "Exporting…" : "Export print package"}
            </button>
          </div>

          {/* Live files */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-3">
            <div className={label}>Live event file</div>
            <input
              className={field}
              placeholder="Event (e.g. NEXT 2026 London)"
              value={config.eventLabel}
              onChange={(e) => set("eventLabel", e.target.value)}
            />
            <input
              className={field}
              placeholder={pillarName(config)}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={signedIn !== true || saveMutation.isPending}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#003FC7] px-4 py-2.5 text-sm font-medium text-[#003FC7] disabled:opacity-50"
              >
                <Save size={14} />
                {openFileId ? "Update file" : "Save file"}
              </button>
              {openFileId ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenFileId(null);
                    setFileName("");
                  }}
                  className="rounded-xl border border-black/15 px-3 py-2.5 text-sm text-black/60"
                >
                  New
                </button>
              ) : null}
            </div>
            {signedIn === false ? (
              <p className="text-[11px] text-black/45">Sign in to save live pillar files.</p>
            ) : null}
            {(files.data ?? []).length ? (
              <ul className="space-y-1.5 pt-1">
                {(files.data ?? []).map((row) => (
                  <li
                    key={row.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                      row.id === openFileId ? "border-[#003FC7] bg-[#E0E8F5]" : "border-black/10"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => {
                        setConfig({ ...pillarDefault(), ...row.config });
                        setOpenFileId(row.id);
                        setFileName(row.name);
                      }}
                    >
                      <span className="font-medium text-[#03002C]">{row.name}</span>
                      {row.event_label ? (
                        <span className="text-black/50"> · {row.event_label}</span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${row.name}`}
                      onClick={() => deleteMutation.mutate(row.id)}
                      className="text-black/40 hover:text-[#E53D2E]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {showDivisionGallery ? (
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
              const preview: PillarConfig = { ...config, divisionId: d.id, face: "light" };
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
      ) : null}
    </>
  );
}
