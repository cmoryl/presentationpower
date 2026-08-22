// Social asset editor — a modal that pairs a live-scaled SocialRenderer with
// controls for the asset's text blocks, caption line, and photo-panel
// geometry. Works for light and dark assets; light assets are the ones that
// need it most because the photo panel and copy share the frame.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, RotateCcw, Pencil, Upload, Images, Move, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SocialRenderer, type SocialRendererProps } from "@/components/campaigns/SocialRenderer";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { SocialAssetEdit } from "@/lib/social-asset-edit";
import { clearSocialAssetDefault, saveSocialAssetDefault } from "@/lib/social-asset-edit";
import { photoForFormat, SOCIAL_PHOTO_SETS } from "@/lib/social-photography";
import { aspectClass } from "@/lib/social-formats";
import { listSlideMedia, uploadSlideMedia, type SlideMediaItem } from "@/lib/slide-media";

type RendererProps = Omit<SocialRendererProps, "displayShortEdge" | "edit">;

export function SocialAssetEditorButton({
  rendererProps,
  formatLabel,
  edit,
  onChange,
  onReset,
  className,
  label = "Edit",
  editKey,
}: {
  rendererProps: RendererProps;
  formatLabel: string;
  edit: SocialAssetEdit;
  onChange: (next: SocialAssetEdit) => void;
  onReset: () => void;
  /** Stable asset key — enables the admin "save as the approved default" action. */
  editKey?: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Edit ${formatLabel}`}
        className={
          className ??
          "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] font-medium text-black/70 transition hover:border-[#003FC7]/50 hover:text-[#003FC7]"
        }
      >
        <Pencil size={12} /> {label}
      </button>
      {open ? (
        <SocialAssetEditorModal
          rendererProps={rendererProps}
          formatLabel={formatLabel}
          edit={edit}
          editKey={editKey}
          onChange={onChange}
          onReset={onReset}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function SocialAssetEditorModal({
  rendererProps,
  formatLabel,
  edit,
  editKey,
  onChange,
  onReset,
  onClose,
}: {
  rendererProps: RendererProps;
  formatLabel: string;
  edit: SocialAssetEdit;
  editKey?: string;
  onChange: (next: SocialAssetEdit) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, onClose, containerRef: ref });
  const format = rendererProps.format;

  const [shortEdge, setShortEdge] = useState(420);
  useEffect(() => {
    function recompute() {
      const vw = window.innerWidth;
      const vh = window.innerHeight - 140;
      const stageW = vw > 1024 ? Math.min(620, vw * 0.46) : vw - 64;
      const short = Math.min(format.width, format.height);
      const long = Math.max(format.width, format.height);
      const byWidth =
        format.width >= format.height ? (stageW * short) / long : Math.min(stageW, short);
      const byHeight =
        format.height >= format.width ? (Math.min(vh, 640) * short) / long : Math.min(vh, 640);
      setShortEdge(Math.max(200, Math.floor(Math.min(byWidth, byHeight, 640))));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [format.width, format.height]);

  const patch = useCallback(
    (p: Partial<SocialAssetEdit>) => onChange({ ...edit, ...p }),
    [edit, onChange],
  );

  const isAdmin = useIsAdmin();
  const [publishing, setPublishing] = useState<"save" | "clear" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState<SlideMediaItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const baseCopy = rendererProps.copy;
  // Photography can be attached by the edit itself, so assets the pipeline
  // produced without imagery (common on dark variants for divisions with no
  // photo pool) still get the full panel toolkit.
  const fallbackPhoto =
    photoForFormat(rendererProps.brandId, format) ?? photoForFormat("bm-tp-master", format);
  const effectiveImage =
    edit.imageUrl !== undefined ? edit.imageUrl || undefined : rendererProps.imageUrl;
  const hasImage = Boolean(effectiveImage);
  const panelActive = hasImage && (edit.imageLayout ?? rendererProps.imageLayout) === "panel";

  const focalX = edit.focalXPct ?? 50;
  const focalY = edit.focalYPct ?? 42;
  const zoom = edit.photoZoom ?? 1;

  // Drag the photo inside its crop. Pointer movement is inverted (dragging the
  // image left reveals what is to its right) and scaled by the stage size, so
  // it feels like nudging the print rather than moving a slider.
  const dragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasImage) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, fx: focalX, fy: focalY };
  };
  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const span = Math.max(120, Math.min(rect.width, rect.height));
    const nx = clampPct(d.fx - ((e.clientX - d.x) / span) * 100);
    const ny = clampPct(d.fy - ((e.clientY - d.y) / span) * 100);
    if (nx !== focalX || ny !== focalY) patch({ focalXPct: nx, focalYPct: ny });
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const { signedUrl } = await uploadSlideMedia(file, file.name);
      patch({ imageUrl: signedUrl, imageLayout: edit.imageLayout ?? "panel" });
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const openPicker = () => {
    setPickerOpen(true);
    void listSlideMedia(40)
      .then(setLibrary)
      .catch(() => setLibrary([]));
  };

  const publish = async (mode: "save" | "clear") => {
    if (!editKey) return;
    setPublishing(mode);
    try {
      if (mode === "save") {
        await saveSocialAssetDefault(editKey, edit);
        toast.success("Saved as the approved version for everyone");
      } else {
        await clearSocialAssetDefault(editKey);
        toast.success("Approved version cleared — the asset renders as generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the approved version.");
    } finally {
      setPublishing(null);
    }
  };

  const preview = useMemo(
    () => <SocialRenderer {...rendererProps} edit={edit} displayShortEdge={shortEdge} />,
    [rendererProps, edit, shortEdge],
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#03002C]/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-asset-editor-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-3">
          <div className="min-w-0">
            <div
              id="social-asset-editor-title"
              className="truncate text-sm font-semibold text-[#03002C]"
            >
              Edit · {formatLabel}
            </div>
            <div className="text-[11px] text-black/55">
              {format.width}×{format.height} · {rendererProps.mode} mode
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black/65 hover:bg-black/5"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-icon-muted hover:bg-black/5 hover:text-[#03002C]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Live stage */}
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 overflow-auto bg-[#F2F2F2] p-5">
            <div
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={hasImage ? "cursor-grab touch-none active:cursor-grabbing" : undefined}
            >
              {preview}
            </div>
            {hasImage ? (
              <p className="flex items-center gap-1.5 text-[11px] text-black/50">
                <Move size={12} /> Drag the artwork to reposition the photo
              </p>
            ) : null}
          </div>

          {/* Controls */}
          <div className="min-h-0 space-y-5 overflow-y-auto border-t border-black/10 p-4 lg:border-l lg:border-t-0">
            <Group title="Text blocks">
              <Field
                label="Eyebrow"
                value={edit.eyebrow ?? baseCopy.eyebrow ?? ""}
                onChange={(v) => patch({ eyebrow: v })}
              />
              <Field
                label="Headline"
                value={edit.title ?? baseCopy.title}
                onChange={(v) => patch({ title: v })}
                multiline
              />
              <Field
                label="Body"
                value={edit.summary ?? baseCopy.summary ?? ""}
                onChange={(v) => patch({ summary: v })}
                multiline
              />
              <Field
                label="Caption line"
                value={edit.caption ?? ""}
                onChange={(v) => patch({ caption: v })}
                placeholder="Optional caption, handle, or legal line"
              />
              <Field
                label="Call to action"
                value={edit.cta ?? baseCopy.cta ?? ""}
                onChange={(v) => patch({ cta: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Stat value"
                  value={edit.statValue ?? baseCopy.stat?.value ?? ""}
                  onChange={(v) => patch({ statValue: v })}
                />
                <Field
                  label="Stat label"
                  value={edit.statLabel ?? baseCopy.stat?.label ?? ""}
                  onChange={(v) => patch({ statLabel: v })}
                />
              </div>
            </Group>

            <Group title="Copy block">
              <Segmented
                label="Anchor"
                value={edit.copyAlign ?? "auto"}
                options={[
                  { id: "auto", label: "Auto" },
                  { id: "start", label: "Top" },
                  { id: "end", label: "Bottom" },
                ]}
                onChange={(v) =>
                  patch({ copyAlign: v === "auto" ? undefined : (v as "start" | "end") })
                }
              />
              <Slider
                label="Type scale"
                value={edit.typeScale ?? 1}
                min={0.7}
                max={1.35}
                step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => patch({ typeScale: v })}
              />
            </Group>

            <Group title="Photography">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onUpload(f);
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-black/15 px-3 text-[11px] font-medium text-black/70 transition hover:border-[#003FC7]/50 hover:text-[#003FC7] disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                  {hasImage ? "Upload replacement" : "Upload photo"}
                </button>
                <button
                  type="button"
                  onClick={openPicker}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-black/15 px-3 text-[11px] font-medium text-black/70 transition hover:border-[#003FC7]/50 hover:text-[#003FC7]"
                >
                  <Images size={12} /> {hasImage ? "Switch photo" : "Choose photo"}
                </button>
                {!hasImage ? (
                  <button
                    type="button"
                    disabled={!fallbackPhoto}
                    onClick={() =>
                      patch({ imageUrl: fallbackPhoto, imageLayout: edit.imageLayout ?? "panel" })
                    }
                    className="inline-flex min-h-[32px] items-center rounded-full border border-black/15 px-3 text-[11px] font-medium text-black/70 transition hover:border-[#003FC7]/50 hover:text-[#003FC7] disabled:opacity-40"
                  >
                    {fallbackPhoto ? "Attach division photo" : "No photography available"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => patch({ imageUrl: "" })}
                    className="inline-flex min-h-[32px] items-center rounded-full border border-black/15 px-3 text-[11px] font-medium text-black/70 transition hover:border-[#003FC7]/50 hover:text-[#003FC7]"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              {pickerOpen ? (
                <PhotoPicker
                  brandId={rendererProps.brandId}
                  format={format}
                  library={library}
                  onPick={(url) => {
                    patch({ imageUrl: url, imageLayout: edit.imageLayout ?? "panel" });
                    setPickerOpen(false);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              ) : null}
              {!hasImage ? (
                <p className="text-xs text-black/55">
                  This asset renders copy-only — attach photography to unlock the panel controls.
                </p>
              ) : (
                <>

                  <Segmented
                    label="Layout"
                    value={edit.imageLayout ?? rendererProps.imageLayout ?? "bleed"}
                    options={[
                      { id: "bleed", label: "Full bleed" },
                      { id: "panel", label: "Photo panel" },
                    ]}
                    onChange={(v) => patch({ imageLayout: v as "bleed" | "panel" })}
                  />
                  {panelActive ? (
                    <>
                      <Segmented
                        label="Panel position"
                        value={edit.panelSide ?? "auto"}
                        options={[
                          { id: "auto", label: "Auto" },
                          { id: "top", label: "Top band" },
                          { id: "right", label: "Right column" },
                        ]}
                        onChange={(v) =>
                          patch({ panelSide: v === "auto" ? undefined : (v as "right" | "top") })
                        }
                      />
                      <Slider
                        label="Panel size"
                        value={edit.panelSizePct ?? 44}
                        min={24}
                        max={70}
                        step={1}
                        format={(v) => `${Math.round(v)}%`}
                        onChange={(v) => patch({ panelSizePct: v })}
                      />
                    </>
                  ) : null}
                  <Slider
                    label="Focal X"
                    value={edit.focalXPct ?? 50}
                    min={0}
                    max={100}
                    step={1}
                    format={(v) => `${Math.round(v)}%`}
                    onChange={(v) => patch({ focalXPct: v })}
                  />
                  <Slider
                    label="Focal Y"
                    value={edit.focalYPct ?? 42}
                    min={0}
                    max={100}
                    step={1}
                    format={(v) => `${Math.round(v)}%`}
                    onChange={(v) => patch({ focalYPct: v })}
                  />
                  <Slider
                    label="Photo zoom"
                    value={zoom}
                    min={1}
                    max={2.5}
                    step={0.01}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => patch({ photoZoom: v === 1 ? undefined : v })}
                  />
                </>
              )}
            </Group>

            {isAdmin && editKey ? (
              <Group title="Approved version (admin)">
                <p className="text-xs text-black/55">
                  Save this photo, crop and copy as the version everyone sees for this asset —
                  including public demo pages. Personal edits still layer on top.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={publishing !== null}
                    onClick={() => void publish("save")}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#003FC7] px-3.5 text-[11px] font-semibold text-white transition hover:bg-[#0033a3] disabled:opacity-50"
                  >
                    {publishing === "save" ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={12} />
                    )}
                    Save as approved version
                  </button>
                  <button
                    type="button"
                    disabled={publishing !== null}
                    onClick={() => void publish("clear")}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-black/15 px-3.5 text-[11px] font-medium text-black/65 hover:bg-black/5 disabled:opacity-50"
                  >
                    <RotateCcw size={12} /> Clear approved version
                  </button>
                </div>
              </Group>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function clampPct(v: number): number {
  return Math.round(Math.min(100, Math.max(0, v)));
}

/** Photo source picker — division photography sets plus the curator's own
 *  uploaded imagery, so switching a photo never needs a re-upload. */
function PhotoPicker({
  brandId,
  format,
  library,
  onPick,
  onClose,
}: {
  brandId: string;
  format: { width: number; height: number };
  library: SlideMediaItem[];
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const cls = aspectClass(format as never);
  const key = cls === "portrait-tall" || cls === "portrait" ? "tall" : cls.startsWith("landscape") ? "wide" : "square";
  const sets = Object.entries(SOCIAL_PHOTO_SETS);
  const ordered = [
    ...sets.filter(([id]) => id === brandId),
    ...sets.filter(([id]) => id !== brandId),
  ];
  return (
    <div className="rounded-xl border border-black/10 bg-black/[0.02] p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/45">
          Choose a photo
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-medium text-black/50 hover:text-[#03002C]"
        >
          Done
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ordered.map(([id, set]) => {
          const url = (set as Record<string, string>)[key] ?? set.wide;
          return (
            <button
              key={id}
              type="button"
              title={set.label}
              onClick={() => onPick(url)}
              className="overflow-hidden rounded-lg border border-black/10 transition hover:border-[#003FC7]"
            >
              <img src={url} alt={set.label} className="aspect-[4/3] w-full object-cover" />
            </button>
          );
        })}
      </div>
      {library.length ? (
        <>
          <div className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-widest text-black/45">
            Your uploads
          </div>
          <div className="grid grid-cols-3 gap-2">
            {library.map((item) => (
              <button
                key={item.path}
                type="button"
                title={item.name}
                onClick={() => onPick(item.url)}
                className="overflow-hidden rounded-lg border border-black/10 transition hover:border-[#003FC7]"
              >
                <img src={item.url} alt={item.name} className="aspect-[4/3] w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-black/45">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-black/45">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          rows={2}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] focus:border-[#003FC7] focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] focus:border-[#003FC7] focus:outline-none"
        />
      )}
    </label>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-black/45">
        {label}
      </span>
      <div className="inline-flex flex-wrap gap-1 rounded-full border border-black/10 bg-black/[0.03] p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`min-h-[32px] rounded-full px-3 text-[11px] font-medium transition ${
              value === o.id ? "bg-[#03002C] text-white" : "text-black/60 hover:text-[#03002C]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-black/45">
        {label}
        <span className="tabular-nums text-black/60">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full accent-[#003FC7]"
      />
    </label>
  );
}
