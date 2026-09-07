// Booth template editor — the admin-side control for the stored booth masters.
//
// A booth is three things: the vendor's supplied wall (a file in the private
// booth-masters bucket), the geometry it prints at, and the overlay the brand
// team adds on top. This panel edits all three against the backend record, so a
// future stand size or a new artwork round is a save, not a code change. The
// overlay itself is edited with the existing live panel editor; here it is
// captured to the template so it reproduces for everyone.

import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  boothOverlayFromPlacement,
  type BoothTemplateRecord,
} from "@/lib/booth-templates";
import {
  LONDON_BOOTH_TRIM_PRESETS,
  resizeBoothArtboard,
} from "@/lib/next-london-booths";
import { londonLogoPlacement } from "@/lib/next-london-logo-placement";
import type { BoothTemplatePatch } from "@/lib/booth-templates.functions";

export type BoothTemplatePanelProps = {
  templates: BoothTemplateRecord[];
  /** Panel id for the booth's main artboard, keyed by template slug. */
  panelIdBySlug: Record<string, string>;
  canEdit: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: (patch: BoothTemplatePatch) => Promise<unknown>;
};

const LABEL = "font-mono text-[11px] uppercase tracking-[0.12em] text-[#03002C]/60";
const FIELD =
  "mt-1 w-full rounded-lg border border-black/12 bg-white px-3 py-2 text-[13px] text-[#03002C] outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]/40";

export function BoothTemplatePanel({
  templates,
  panelIdBySlug,
  canEdit,
  saving,
  saveError,
  onSave,
}: BoothTemplatePanelProps) {
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const template = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0] ?? null,
    [templates, selectedId],
  );

  const resizes = useMemo(() => {
    if (!template) return [];
    return LONDON_BOOTH_TRIM_PRESETS.map((preset) =>
      resizeBoothArtboard(
        { trimW: template.trim_w, trimH: template.trim_h, bleedMm: template.bleed_mm },
        preset,
      ),
    );
  }, [template]);

  if (!template) return null;

  const patch = async (next: BoothTemplatePatch, message: string) => {
    setStatus(null);
    try {
      await onSave(next);
      setStatus(message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    }
  };

  const uploadMaster = async (file: File, kind: "master" | "proof") => {
    setUploading(true);
    setStatus(null);
    try {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase() || ".ai";
      const path = `${template.venue}/${template.slug}-r${template.revision + 1}${ext}`;
      const { error } = await supabase.storage
        .from("booth-masters")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw new Error(error.message);
      await patch(
        kind === "master"
          ? {
              id: template.id,
              master_path: path,
              master_content_type: file.type || null,
              source_file: file.name,
            }
          : { id: template.id, proof_path: path },
        kind === "master" ? "New Illustrator master stored." : "New proof stored.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const panelId = panelIdBySlug[template.slug];

  return (
    <section className="mt-8 rounded-2xl border border-black/10 bg-[#F2F2F2] p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h4 className="text-base font-semibold tracking-tight text-[#03002C]">
          Booth templates
        </h4>
        <span className="font-mono text-[11px] text-[#03002C]/55">
          {templates.length} stored · revision r{template.revision}
        </span>
        {!canEdit ? (
          <span className="rounded border border-[#03002C]/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#03002C]/60">
            Read only
          </span>
        ) : null}
      </div>
      <p className="mt-2 max-w-3xl text-[13px] leading-[1.5] text-[#03002C]/75">
        Each booth master is held in the backend with its own trim size, bleed and overlay, so it
        can be re-issued at another stand size or replaced with a new artwork round without a
        rebuild. Downloads always serve the stored master.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <label className={LABEL} htmlFor="booth-template-select">
            Booth
          </label>
          <select
            id="booth-template-select"
            className={FIELD}
            value={template.id}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setStatus(null);
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.vendor}
              </option>
            ))}
          </select>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                ["trim_w", "Trim W (mm)"],
                ["trim_h", "Trim H (mm)"],
                ["bleed_mm", "Bleed (mm)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className={LABEL} htmlFor={`booth-${key}`}>
                  {label}
                </label>
                <input
                  id={`booth-${key}`}
                  className={FIELD}
                  type="number"
                  min={1}
                  disabled={!canEdit || saving}
                  defaultValue={template[key]}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (!Number.isFinite(value) || value <= 0 || value === template[key]) return;
                    void patch({ id: template.id, [key]: value }, "Geometry saved.");
                  }}
                />
              </div>
            ))}
          </div>

          <label className={`${LABEL} mt-3 block`} htmlFor="booth-vendor">
            Vendor name
          </label>
          <input
            id="booth-vendor"
            className={FIELD}
            disabled={!canEdit || saving}
            defaultValue={template.vendor}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (!value || value === template.vendor) return;
              void patch({ id: template.id, vendor: value }, "Vendor name saved.");
            }}
          />

          <p className="mt-3 font-mono text-[11px] text-[#03002C]/55">
            Supplied file: {template.source_file ?? "none"}
          </p>

          {canEdit ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-[#003FC7]/30 bg-white px-3 py-2 text-[12px] font-medium text-[#003FC7]">
                Replace Illustrator master
                <input
                  type="file"
                  accept=".ai,.pdf,application/pdf,application/postscript"
                  className="hidden"
                  disabled={uploading || saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadMaster(file, "master");
                  }}
                />
              </label>
              <label className="cursor-pointer rounded-lg border border-black/12 bg-white px-3 py-2 text-[12px] font-medium text-[#03002C]">
                Replace proof image
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  disabled={uploading || saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadMaster(file, "proof");
                  }}
                />
              </label>
              {panelId ? (
                <button
                  type="button"
                  className="rounded-lg border border-black/12 bg-white px-3 py-2 text-[12px] font-medium text-[#03002C]"
                  disabled={saving}
                  onClick={() =>
                    void patch(
                      {
                        id: template.id,
                        overlay: boothOverlayFromPlacement(londonLogoPlacement(panelId)),
                      },
                      "Overlay saved to this booth template.",
                    )
                  }
                >
                  Save current overlay
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <span className={LABEL}>Re-issue at another stand size</span>
          <ul className="mt-2 space-y-2">
            {resizes.map((resize) => {
              const active = template.trim_preset_id === resize.preset.id;
              return (
                <li
                  key={resize.preset.id}
                  className={`rounded-xl border p-3 ${
                    active ? "border-[#003FC7]/40 bg-white" : "border-black/10 bg-white/70"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13px] font-medium text-[#03002C]">
                      {resize.preset.label}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-[#03002C]/55">
                      {Math.round(resize.scale * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.45] text-[#03002C]/70">
                    {resize.note}
                  </p>
                  {canEdit ? (
                    <button
                      type="button"
                      className="mt-2 rounded-lg border border-[#003FC7]/30 px-2.5 py-1 text-[12px] font-medium text-[#003FC7] disabled:opacity-40"
                      disabled={saving || active}
                      onClick={() =>
                        void patch(
                          {
                            id: template.id,
                            trim_w: resize.preset.trimW,
                            trim_h: resize.preset.trimH,
                            bleed_mm: resize.preset.bleedMm,
                            trim_preset_id: resize.preset.id,
                          },
                          `Booth re-issued at ${resize.preset.label}.`,
                        )
                      }
                    >
                      {active ? "Current size" : "Apply this size"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {status || saveError ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-black/10 bg-white p-3 text-[12px] text-[#03002C]"
        >
          {status ?? saveError}
        </p>
      ) : null}
    </section>
  );
}
