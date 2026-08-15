/**
 * Live preview of a data or process visual the agent has planned but not yet
 * saved to the deck. Renders the real slide with the same renderer the editor
 * and deck preview use, next to the validation report and the underlying rows,
 * so the user can approve or redirect before anything is written.
 */
import { useMemo, useState } from "react";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { packToneBrand, stylePackById, type StylePack } from "@/lib/style-packs";
import type { BrandMode } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
// Registers the ECharts adapter so MV-VIZ-* specs render in the preview.
import "@/components/slide/echarts-adapter";

export type VisualPreview = {
  module_id: string;
  name?: string;
  family?: string;
  chart_kind?: string;
  style_pack_id?: string | null;
  why?: string | null;
  content?: Record<string, unknown>;
  validation?: { ok?: boolean; problems?: string[]; notes?: string[] };
  error?: string;
};

/** Narrow a preview_data_visual tool output into a renderable preview. */
export function visualPreviewFromToolOutput(output: unknown): VisualPreview | null {
  if (!output || typeof output !== "object") return null;
  const o = output as VisualPreview & { preview?: boolean };
  if (o.error) return o;
  if (!o.preview || typeof o.module_id !== "string") return null;
  return o;
}

function Scope({ pack, children }: { pack: StylePack | null; children: React.ReactNode }) {
  if (!pack) return <>{children}</>;
  return (
    <StylePackProvider pack={pack}>
      <StylePackVars pack={pack} className="h-full w-full">
        {children}
      </StylePackVars>
    </StylePackProvider>
  );
}

export function AgentVisualPreview({
  preview,
  actionable = false,
  busy = false,
  onSubmit,
}: {
  preview: VisualPreview;
  actionable?: boolean;
  busy?: boolean;
  onSubmit?: (text: string) => void;
}) {
  const [showData, setShowData] = useState(false);

  const variant = useMemo(() => byId(MODULE_VARIANTS, preview.module_id) ?? null, [preview.module_id]);
  const pack = useMemo(
    () => (preview.style_pack_id ? stylePackById(preview.style_pack_id) ?? null : null),
    [preview.style_pack_id],
  );
  const brand = useMemo(() => {
    const base = BRAND_MODES[0]!;
    return pack ? (packToneBrand(base as never, pack) as unknown as BrandMode) : base;
  }, [pack]);

  const slide: DeckSlide | null = useMemo(() => {
    if (!variant) return null;
    return {
      id: `preview-${variant.id}`,
      position: 0,
      sectionId: "SEC-01",
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0]!,
      content: (preview.content ?? {}) as DeckSlide["content"],
      changes: [],
    };
  }, [variant, preview.content]);

  if (preview.error || !variant || !slide) {
    return (
      <div className="rounded-xl border border-[#E53D2E]/30 bg-[#E53D2E]/[0.06] px-3 py-2 text-xs text-foreground/70">
        {preview.error ?? `No preview available for ${preview.module_id}.`}
      </div>
    );
  }

  const problems = preview.validation?.problems ?? [];
  const notes = preview.validation?.notes ?? [];
  const rows = Array.isArray((preview.content ?? {})["rows"])
    ? ((preview.content ?? {})["rows"] as unknown[])
    : Array.isArray((preview.content ?? {})["items"])
      ? ((preview.content ?? {})["items"] as unknown[])
      : Array.isArray((preview.content ?? {})["series"])
        ? ((preview.content ?? {})["series"] as unknown[])
        : [];

  return (
    <section className="w-full space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-xl">
      <header className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/45">
          {preview.family === "process" ? "Process visual · preview" : "Data visual · preview"}
        </p>
        <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-widest text-foreground/55">
          {variant.name}
        </span>
        {preview.chart_kind ? (
          <span className="rounded-full bg-[#A1FBF9]/35 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#0c6470]">
            {preview.chart_kind}
          </span>
        ) : null}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
            problems.length
              ? "bg-[#E53D2E]/15 text-[#a02a20]"
              : "bg-[#A6FA87]/35 text-[#2c6a1c]"
          }`}
        >
          {problems.length ? `${problems.length} to fix` : "Checks passed"}
        </span>
      </header>

      {preview.why ? <p className="text-xs leading-relaxed text-foreground/70">{preview.why}</p> : null}

      <div
        className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-[#03002C]"
        style={{ aspectRatio: "16 / 9", minHeight: 180 }}
      >
        <SlideThumbnailContext.Provider value={true}>
          <Scope pack={pack}>
            <ScaledSlide>
              <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} />
            </ScaledSlide>
          </Scope>
        </SlideThumbnailContext.Provider>
      </div>

      {problems.length || notes.length ? (
        <ul className="space-y-1 text-[11px] leading-snug">
          {problems.map((p) => (
            <li key={p} className="flex gap-1.5 text-[#a02a20]">
              <span aria-hidden>✕</span>
              <span>{p}</span>
            </li>
          ))}
          {notes.map((n) => (
            <li key={n} className="flex gap-1.5 text-foreground/55">
              <span aria-hidden>·</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {rows.length ? (
          <button
            type="button"
            onClick={() => setShowData((v) => !v)}
            className="rounded-lg border border-border/60 px-2.5 py-1 text-[11px] font-medium text-foreground/70 transition hover:bg-foreground/[0.05]"
            aria-expanded={showData}
          >
            {showData ? "Hide data" : `Show data (${rows.length})`}
          </button>
        ) : null}
        {actionable && onSubmit ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubmit("Looks good — save that visual to the deck as previewed.")}
              className="rounded-lg bg-[#003FC7] px-3 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-40 hover:brightness-110"
            >
              Save to deck
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubmit("Try a different visual for that data — show me another option first.")}
              className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground/70 transition disabled:opacity-40 hover:bg-foreground/[0.05]"
            >
              Try another
            </button>
          </>
        ) : null}
      </div>

      {showData && rows.length ? (
        <div className="max-h-56 overflow-auto rounded-lg border border-border/50">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-foreground/[0.04] font-mono text-[9px] uppercase tracking-widest text-foreground/45">
              <tr>
                {Object.keys((rows[0] ?? {}) as Record<string, unknown>).map((k) => (
                  <th key={k} className="px-2 py-1.5">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((r, i) => (
                <tr key={i} className="border-t border-border/40 text-foreground/70">
                  {Object.values((r ?? {}) as Record<string, unknown>).map((v, j) => (
                    <td key={j} className="px-2 py-1">
                      {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
