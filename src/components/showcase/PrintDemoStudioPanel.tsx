// PRINT DEMO STUDIO PANEL
// ---------------------------------------------------------------------------
// The demo print pages ship a live copy editor; this panel adds the *layout*
// half of the studio so a finished example can be fitted to the page without
// leaving the demo: hero band height + crop ratio, page size / density, the
// auto content-fit switch, and module ordering / removal with a live capacity
// readout driven by the same print-capacity engine the real editor uses.

import { useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  LayoutTemplate,
  RotateCcw,
  Sliders,
  Trash2,
  Wand2,
} from "lucide-react";

import {
  analyzePrintAsset,
  effectiveModuleBudget,
  maxHeroHeightPct,
  weightForSection,
  type PrintTemplateKind,
} from "@/lib/print-capacity";
import type {
  PrintAssetKind,
  PrintDensity,
  PrintHeroAspect,
  PrintHeroMedia,
  PrintPageSize,
  PrintSection,
} from "@/lib/print-assets.types";

export type DemoLook = { pageSize: PrintPageSize; density: PrintDensity; fit: boolean };

type Props = {
  kind: PrintAssetKind;
  content: unknown;
  onChange: (next: unknown) => void;
  look: DemoLook;
  onLook: (next: DemoLook) => void;
  onResetLayout: () => void;
  accent?: string;
};

const PAGE_SIZES: PrintPageSize[] = ["Letter", "A4", "A5", "HalfLetter", "Square"];
const DENSITIES: PrintDensity[] = ["compact", "standard", "airy"];
const ASPECTS: PrintHeroAspect[] = ["fill", "21:9", "16:9", "3:2", "4:3", "1:1"];

const CAPACITY_KINDS = new Set<string>([
  "case-study",
  "spotlight",
  "ebrochure",
  "adaptor-brief",
  "msa-partnership",
  "solution-proposal",
]);

function moduleTitle(m: PrintSection, i: number): string {
  const bag = m as unknown as Record<string, unknown>;
  const t = bag["title"] ?? bag["eyebrow"];
  return typeof t === "string" && t.trim() ? t : `${m.kind} block ${i + 1}`;
}

export function PrintDemoStudioPanel({
  kind,
  content,
  onChange,
  look,
  onLook,
  onResetLayout,
  accent = "#003FC7",
}: Props) {
  const bag = (content ?? {}) as Record<string, unknown>;
  const hero = bag["heroMedia"] as PrintHeroMedia | undefined;
  const modules = Array.isArray(bag["modules"]) ? (bag["modules"] as PrintSection[]) : [];
  const capacityKind = CAPACITY_KINDS.has(kind) ? (kind as PrintTemplateKind) : null;

  const copy = {
    hasTitle: typeof bag["title"] === "string" && !!bag["title"],
    hasSummary: typeof bag["summary"] === "string" && !!bag["summary"],
  };
  const used = useMemo(() => modules.reduce((n, m) => n + weightForSection(m), 0), [modules]);
  const budget = capacityKind ? effectiveModuleBudget(capacityKind, hero, copy) : 0;
  const heroMax = capacityKind ? maxHeroHeightPct(capacityKind, used, hero, copy) : 70;
  const report = useMemo(
    () => (capacityKind ? analyzePrintAsset(capacityKind, content as never) : null),
    [capacityKind, content],
  );
  const over = capacityKind ? used > budget + 0.001 : false;

  function patch(next: Record<string, unknown>) {
    onChange({ ...bag, ...next });
  }
  function patchHero(next: Partial<PrintHeroMedia>) {
    if (!hero) return;
    patch({ heroMedia: { ...hero, ...next } });
  }

  const heightPct = Math.round(hero?.heightPct ?? 46);

  /** One-click fit: pull the hero back to the capacity-safe max, then relax
   *  density and turn on auto content-fit if the page is still over budget. */
  function fitToPage() {
    const next: Record<string, unknown> = {};
    if (hero?.imageUrl && heightPct > heroMax) {
      next["heroMedia"] = { ...hero, heightPct: heroMax };
    }
    if (Object.keys(next).length) patch(next);
    const stillOver = over && !(next["heroMedia"] as PrintHeroMedia | undefined);
    onLook({
      ...look,
      density: stillOver || over ? "compact" : look.density,
      fit: true,
    });
  }

  function moveModule(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    const next = modules.slice();
    const a = next[i]!;
    const b = next[j]!;
    next[i] = b;
    next[j] = a;
    patch({ modules: next });
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sliders size={15} className="shrink-0" />
          <span className="truncate text-sm font-semibold text-[#03002C] dark:text-white">
            Layout studio
          </span>
        </div>
        <button
          type="button"
          onClick={onResetLayout}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 text-[12px] font-medium text-black/70 transition hover:bg-black/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
        >
          <RotateCcw size={13} /> Reset layout
        </button>
      </div>

      {/* HERO BAND ---------------------------------------------------------- */}
      <div className="mt-4 rounded-xl border border-black/10 p-3 dark:border-white/10">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
          <ImageIcon size={12} /> Hero band
        </div>
        {hero?.imageUrl ? (
          <>
            <label
              className="mt-3 flex items-center justify-between text-[12px] font-medium text-black/70 dark:text-white/70"
              htmlFor="demo-hero-height"
            >
              <span>Hero height</span>
              <span className="tabular-nums">{heightPct}% of page</span>
            </label>
            <input
              id="demo-hero-height"
              type="range"
              min={20}
              max={70}
              step={1}
              value={heightPct}
              onChange={(e) => patchHero({ heightPct: Number(e.target.value) })}
              className="mt-2 w-full accent-[#003FC7]"
              style={{ accentColor: accent }}
              data-testid="demo-hero-height"
            />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-black/50 dark:text-white/50">
              <span>
                Capacity-safe max for this content: <strong>{heroMax}%</strong>
              </span>
              {heightPct > heroMax && (
                <button
                  type="button"
                  onClick={() => patchHero({ heightPct: heroMax })}
                  className="rounded-full border border-black/15 px-2 py-0.5 font-medium text-black/70 hover:bg-black/5 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
                >
                  Snap to {heroMax}%
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {ASPECTS.map((a) => {
                const on = (hero.aspect ?? "fill") === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => patchHero({ aspect: a })}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
                    style={
                      on
                        ? { background: accent, borderColor: accent, color: "#fff" }
                        : { borderColor: "rgba(0,0,0,0.14)" }
                    }
                  >
                    {a === "fill" ? "Fill" : a}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-black/55 dark:text-white/55">
            This piece has no hero photo, so there is no band to resize.
          </p>
        )}
      </div>

      {/* PAGE --------------------------------------------------------------- */}
      <div className="mt-3 rounded-xl border border-black/10 p-3 dark:border-white/10">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
          <LayoutTemplate size={12} /> Page
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-[12px] font-medium text-black/70 dark:text-white/70">
            Trim size
            <select
              value={look.pageSize}
              onChange={(e) => onLook({ ...look, pageSize: e.target.value as PrintPageSize })}
              className="mt-1 min-h-[40px] w-full rounded-lg border border-black/15 bg-white px-2 text-[13px] text-[#03002C] dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="text-[12px] font-medium text-black/70 dark:text-white/70">
            Density
            <div className="mt-1 flex gap-1.5">
              {DENSITIES.map((d) => {
                const on = look.density === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onLook({ ...look, density: d })}
                    className="min-h-[40px] flex-1 rounded-lg border text-[12px] font-medium capitalize transition"
                    style={
                      on
                        ? { background: accent, borderColor: accent, color: "#fff" }
                        : { borderColor: "rgba(0,0,0,0.14)" }
                    }
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <label className="mt-3 flex items-start gap-2 text-[12px] text-black/70 dark:text-white/70">
          <input
            type="checkbox"
            checked={look.fit}
            onChange={(e) => onLook({ ...look, fit: e.target.checked })}
            className="mt-0.5 h-4 w-4 shrink-0"
            data-testid="demo-fit-toggle"
          />
          <span>
            Auto-fit content to the page — pulls margins in, then scales type and spacing uniformly
            until the page stops clipping.
          </span>
        </label>

        <button
          type="button"
          onClick={fitToPage}
          className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-[12px] font-semibold text-white transition hover:opacity-90"
          style={{ background: accent }}
          data-testid="demo-fit-to-page"
        >
          <Wand2 size={14} /> Fit this piece to the page
        </button>
      </div>

      {/* MODULES ------------------------------------------------------------ */}
      {modules.length > 0 && (
        <div className="mt-3 rounded-xl border border-black/10 p-3 dark:border-white/10">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
              Sections · {modules.length}
            </div>
            {capacityKind && (
              <div
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                style={
                  over
                    ? { background: "#E53D2E", color: "#fff" }
                    : { background: "rgba(0,0,0,0.06)", color: "rgba(3,0,44,0.7)" }
                }
                data-testid="demo-capacity-badge"
              >
                {used.toFixed(1)} / {budget.toFixed(1)} units
              </div>
            )}
          </div>

          <ul className="mt-2 space-y-1.5">
            {modules.map((m, i) => (
              <li
                key={m.id ?? `${m.kind}-${i}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-black/10 px-2.5 py-2 dark:border-white/10"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-[#03002C] dark:text-white">
                    {moduleTitle(m, i)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-black/45 dark:text-white/45">
                    {m.kind} · {weightForSection(m).toFixed(1)} units
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${moduleTitle(m, i)} up`}
                    disabled={i === 0}
                    onClick={() => moveModule(i, -1)}
                    className="grid h-8 w-8 place-items-center rounded-md border border-black/10 text-black/60 enabled:hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:text-white/60"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${moduleTitle(m, i)} down`}
                    disabled={i === modules.length - 1}
                    onClick={() => moveModule(i, 1)}
                    className="grid h-8 w-8 place-items-center rounded-md border border-black/10 text-black/60 enabled:hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:text-white/60"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${moduleTitle(m, i)}`}
                    onClick={() => patch({ modules: modules.filter((_, k) => k !== i) })}
                    className="grid h-8 w-8 place-items-center rounded-md border border-black/10 text-[#E53D2E] hover:bg-black/5 dark:border-white/15"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {report && report.issues.length > 0 && (
            <ul className="mt-2 space-y-1 text-[11px] text-black/60 dark:text-white/60">
              {report.issues.slice(0, 4).map((issue, i) => (
                <li key={i} className="flex gap-1.5">
                  <span
                    aria-hidden
                    className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-[2px]"
                    style={{ background: issue.level === "block" ? "#E53D2E" : "#FFEB66" }}
                  />
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
