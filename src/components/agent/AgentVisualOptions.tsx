/**
 * Side-by-side rendered options for a slide the agent has recognised as a
 * visual. Each option is the real slide renderer, so the user picks a
 * visualisation by looking at it rather than by reading a module name.
 */
import { useResolvedStylePack } from "@/hooks/use-template-registry";
import { useMemo, useState } from "react";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { packToneBrand, stylePackById, type StylePack } from "@/lib/style-packs";
import type { BrandMode } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
import "@/components/slide/echarts-adapter";

export type VisualOption = {
  module_id: string;
  name?: string;
  family?: string;
  chart_kind?: string;
  label?: string;
  why?: string | null;
  content?: Record<string, unknown>;
  validation?: { ok?: boolean; problems?: string[]; notes?: string[] };
};

export type VisualOptionSet = {
  headline: string;
  shape?: string | null;
  style_pack_id?: string | null;
  recommended_module_id?: string;
  items: VisualOption[];
  error?: string;
};

/** Narrow an offer_visual_options tool output into a renderable option set. */
export function visualOptionsFromToolOutput(output: unknown): VisualOptionSet | null {
  if (!output || typeof output !== "object") return null;
  const o = output as VisualOptionSet & { options?: boolean };
  if (o.error) return { headline: "", items: [], error: o.error };
  if (!o.options || !Array.isArray(o.items) || o.items.length === 0) return null;
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

function OptionCard({
  option,
  index,
  recommended,
  pack,
  brand,
  actionable,
  busy,
  onSubmit,
}: {
  option: VisualOption;
  index: number;
  recommended: boolean;
  pack: StylePack | null;
  brand: BrandMode;
  actionable: boolean;
  busy: boolean;
  onSubmit?: (text: string) => void;
}) {
  const [showData, setShowData] = useState(false);
  const variant = useMemo(() => byId(MODULE_VARIANTS, option.module_id) ?? null, [option.module_id]);
  const slide: DeckSlide | null = useMemo(() => {
    if (!variant) return null;
    return {
      id: `option-${variant.id}-${index}`,
      position: 0,
      sectionId: "SEC-01",
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0]!,
      content: (option.content ?? {}) as DeckSlide["content"],
      changes: [],
    };
  }, [variant, option.content, index]);

  if (!variant || !slide) return null;

  const problems = option.validation?.problems ?? [];
  const label = option.label || option.name || variant.name;
  const content = (option.content ?? {}) as Record<string, unknown>;
  const rows = ["rows", "items", "series", "steps"].reduce<unknown[]>(
    (acc, k) => (acc.length ? acc : Array.isArray(content[k]) ? (content[k] as unknown[]) : acc),
    [],
  );

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-background/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/45">
          Option {String.fromCharCode(65 + index)}
        </span>
        <span className="min-w-0 truncate text-xs font-semibold text-foreground">{label}</span>
        {recommended ? (
          <span className="rounded-full bg-[#003FC7]/12 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#003FC7]">
            Recommended
          </span>
        ) : null}
        {problems.length ? (
          <span className="ml-auto rounded-full bg-[#E53D2E]/15 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#a02a20]">
            {problems.length} to fix
          </span>
        ) : null}
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg border border-border/50 bg-[#03002C]"
        style={{ aspectRatio: "16 / 9", minHeight: 130 }}
      >
        <SlideThumbnailContext.Provider value={true}>
          <Scope pack={pack}>
            <ScaledSlide>
              <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} />
            </ScaledSlide>
          </Scope>
        </SlideThumbnailContext.Provider>
      </div>

      {option.why ? <p className="text-[11px] leading-snug text-foreground/65">{option.why}</p> : null}
      {problems.length ? (
        <ul className="space-y-0.5 text-[10px] leading-snug text-[#a02a20]">
          {problems.map((p) => (
            <li key={p}>✕ {p}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {actionable && onSubmit ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onSubmit(
                `Use option ${String.fromCharCode(65 + index)} (${label}) for that slide — save it to the deck as previewed.`,
              )
            }
            className="rounded-lg bg-[#003FC7] px-2.5 py-1.5 text-[11px] font-semibold text-white transition disabled:opacity-40 hover:brightness-110"
          >
            Use this
          </button>
        ) : null}
        {rows.length ? (
          <button
            type="button"
            onClick={() => setShowData((v) => !v)}
            className="rounded-lg border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground/65 transition hover:bg-foreground/[0.05]"
            aria-expanded={showData}
          >
            {showData ? "Hide data" : `Data (${rows.length})`}
          </button>
        ) : null}
      </div>

      {showData && rows.length ? (
        <pre className="max-h-40 overflow-auto rounded-lg border border-border/50 bg-foreground/[0.03] p-2 text-[10px] leading-snug text-foreground/70">
          {JSON.stringify(rows, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export function AgentVisualOptions({
  optionSet,
  actionable = false,
  busy = false,
  onSubmit,
}: {
  optionSet: VisualOptionSet;
  actionable?: boolean;
  busy?: boolean;
  onSubmit?: (text: string) => void;
}) {
  const pack = useResolvedStylePack(optionSet.style_pack_id ?? null);
  const brand = useMemo(() => {
    const base = BRAND_MODES[0]!;
    return pack ? (packToneBrand(base as never, pack) as unknown as BrandMode) : base;
  }, [pack]);

  if (optionSet.error) {
    return (
      <div className="rounded-xl border border-[#E53D2E]/30 bg-[#E53D2E]/[0.06] px-3 py-2 text-xs text-foreground/70">
        {optionSet.error}
      </div>
    );
  }

  const items = optionSet.items.slice(0, 4);

  return (
    <section className="w-full space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-xl">
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/45">
          This slide is a visual · pick a treatment
        </p>
        <h3 className="text-sm font-semibold leading-snug text-foreground">{optionSet.headline}</h3>
      </header>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 2)}, minmax(0, 1fr))` }}
      >
        {items.map((o, i) => (
          <OptionCard
            key={`${o.module_id}-${i}`}
            option={o}
            index={i}
            recommended={
              optionSet.recommended_module_id ? o.module_id === optionSet.recommended_module_id && i === 0 : i === 0
            }
            pack={pack}
            brand={brand}
            actionable={actionable}
            busy={busy}
            onSubmit={onSubmit}
          />
        ))}
      </div>

      {actionable && onSubmit ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSubmit("None of these fit — show me a different set of visual options for that slide.")}
          className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground/70 transition disabled:opacity-40 hover:bg-foreground/[0.05]"
        >
          Show other options
        </button>
      ) : null}
    </section>
  );
}
