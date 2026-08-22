// Social asset editor — a modal that pairs a live-scaled SocialRenderer with
// controls for the asset's text blocks, caption line, and photo-panel
// geometry. Works for light and dark assets; light assets are the ones that
// need it most because the photo panel and copy share the frame.

import { useEffect, useMemo, useRef, useState } from "react";
import { X, RotateCcw, Pencil } from "lucide-react";
import { SocialRenderer, type SocialRendererProps } from "@/components/campaigns/SocialRenderer";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import type { SocialAssetEdit } from "@/lib/social-asset-edit";

type RendererProps = Omit<SocialRendererProps, "displayShortEdge" | "edit">;

export function SocialAssetEditorButton({
  rendererProps,
  formatLabel,
  edit,
  onChange,
  onReset,
  className,
  label = "Edit",
}: {
  rendererProps: RendererProps;
  formatLabel: string;
  edit: SocialAssetEdit;
  onChange: (next: SocialAssetEdit) => void;
  onReset: () => void;
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
  onChange,
  onReset,
  onClose,
}: {
  rendererProps: RendererProps;
  formatLabel: string;
  edit: SocialAssetEdit;
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

  const patch = (p: Partial<SocialAssetEdit>) => onChange({ ...edit, ...p });

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
          <div className="flex min-h-[280px] items-center justify-center overflow-auto bg-[#F2F2F2] p-5">
            {preview}
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
              {!hasImage ? (
                <p className="text-xs text-black/55">
                  This asset has no photo attached — panel controls unlock once imagery is set.
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
                </>
              )}
            </Group>
          </div>
        </div>
      </div>
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
