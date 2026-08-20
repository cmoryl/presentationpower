import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import { PrintSectionPreviewFrame } from "@/components/print/sections/PrintSectionPreviewFrame";
import {
  PRINT_MODULE_COUNT,
  PRINT_MODULE_FAMILIES,
  printModuleFamilyMeta,
  printModuleFamilyRank,
  PRINT_SECTION_MODULES,
  printModuleMatches,
  type PrintModuleFamily,
  type PrintSectionModule,
} from "@/lib/print-library/section-modules";
import { PRINT_TYPES, printTypeMeta } from "@/lib/print-library/catalog";
import {
  examplesForVariant,
  printModuleExampleCoverage,
  hasRealExamples,
} from "@/lib/print-library/module-examples";
import { applyPrintOverrides, useModuleOverrides } from "@/lib/module-overrides";
import type { PrintIconStyle } from "@/components/print/print-doc-mode";
import { usePrintIconPrefs } from "@/lib/print-icon-prefs";
import { IconAccentContrastWarning } from "@/components/print/IconAccentContrastWarning";
import { iconPageBackground } from "@/lib/print-icon-contrast";
import type { PrintAssetKind, PrintSection } from "@/lib/print-assets.types";

export const Route = createFileRoute("/library/print_/modules")({
  component: PrintModuleLibraryPage,
  head: () => ({
    meta: [
      { title: "Print Section Modules · OnDeck Library" },
      {
        name: "description",
        content:
          "Browse every reusable print section module — stats, quotes, client logos, expertise, and feature blocks — with live portrait previews.",
      },
      { property: "og:title", content: "Print Section Modules · OnDeck Library" },
      {
        property: "og:description",
        content:
          "Reusable print section modules with live previews: stats, quotes, logo grids, expertise, and feature blocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const ACCENT = "#003FC7";

const DENSITY_LABEL: Record<PrintSectionModule["density"], string> = {
  compact: "Compact",
  standard: "Standard",
  tall: "Tall",
};

function PrintModuleLibraryPage() {
  const [family, setFamily] = useState<PrintModuleFamily | "all">("all");
  const [kind, setKind] = useState<PrintAssetKind | "all">("all");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");
  const [useReal, setUseReal] = useState(true);
  const [realOnly, setRealOnly] = useState(true);
  // Iconography is a persisted, document-level treatment: whatever is tuned
  // here becomes the default for new print assets and travels into the PDF.
  const { prefs: iconPrefs, patch: patchIconPrefs } = usePrintIconPrefs();
  const showIcons = iconPrefs.icons;
  const setShowIcons = (v: boolean) => patchIconPrefs({ icons: v });
  const iconScale = iconPrefs.scale;
  const setIconScale = (v: number) => patchIconPrefs({ scale: v });
  const iconStroke = iconPrefs.stroke;
  const setIconStroke = (v: number) => patchIconPrefs({ stroke: v });
  const iconAccent = iconPrefs.accent;
  const setIconAccent = (v: string | undefined) => patchIconPrefs({ accent: v });
  const iconStyle: PrintIconStyle = useMemo(
    () => ({ scale: iconScale, stroke: iconStroke, accent: iconAccent }),
    [iconScale, iconStroke, iconAccent],
  );
  const coverage = useMemo(() => printModuleExampleCoverage(), []);

  const { overrides } = useModuleOverrides("print");

  const modules = useMemo(
    () =>
      applyPrintOverrides(PRINT_SECTION_MODULES, overrides)
        .filter((m) => family === "all" || m.family === family)
        .filter((m) => kind === "all" || m.bestFor.includes(kind))
        .filter((m) => printModuleMatches(m, query))
        .filter((m) => !realOnly || hasRealExamples(m.variantId))
        // Canonical family order first (so modules always sit in the same
        // shelf), then real-collateral examples ahead of demo copy.
        .sort(
          (a, b) =>
            printModuleFamilyRank(a.family) - printModuleFamilyRank(b.family) ||
            (hasRealExamples(b.variantId) ? 1 : 0) - (hasRealExamples(a.variantId) ? 1 : 0),
        ),
    [family, kind, query, overrides, realOnly],
  );

  return (
    <AppShell>
      <LibrarySubnav active="/library/print/modules" />

      <header className="mt-8">
        <Link
          to="/library/print"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-black/50 hover:text-[#03002C]"
        >
          <ArrowLeft size={12} /> Print library
        </Link>
        <h1 className="mt-3 text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#03002C]">
          Print section modules
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-[1.5] text-black/60">
          Every module below is a real section extracted from uploaded print collateral — the same
          stats, narrative spines, bullet rails, spec tables, and contact lockups the source PDFs
          use — rendered at true print proportions. All are fully editable once inserted from the
          editor's <em>Shared modules</em> drawer.
        </p>
      </header>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5">
          <Search size={13} className="text-black/40" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules"
            aria-label="Search print section modules"
            className="w-40 bg-transparent text-xs text-[#03002C] outline-none placeholder:text-black/35"
          />
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Module families">
          <FilterPill active={family === "all"} onClick={() => setFamily("all")}>
            All families
          </FilterPill>
          {PRINT_MODULE_FAMILIES.map((f) => (
            <FilterPill key={f.id} active={family === f.id} onClick={() => setFamily(f.id)}>
              {f.label}
            </FilterPill>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Print kinds">
          <FilterPill active={kind === "all"} onClick={() => setKind("all")}>
            Any print type
          </FilterPill>
          {PRINT_TYPES.map((t) => (
            <FilterPill key={t.id} active={kind === t.id} onClick={() => setKind(t.id)}>
              {t.label}
            </FilterPill>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRealOnly(!realOnly)}
            aria-pressed={realOnly}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
              (realOnly
                ? "border-transparent bg-[#03002C] text-white"
                : "border-black/15 bg-white text-[#03002C] hover:border-black/40")
            }
          >
            {realOnly ? "Actual sections only" : "Showing all variants"}
          </button>
          <button
            type="button"
            onClick={() => setUseReal(!useReal)}
            aria-pressed={useReal}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
              (useReal
                ? "border-transparent bg-[#003FC7] text-white"
                : "border-black/15 bg-white text-[#03002C] hover:border-black/40")
            }
          >
            {useReal ? "Real collateral examples" : "Neutral demo copy"}
          </button>
          <button
            type="button"
            onClick={() => setShowIcons(!showIcons)}
            aria-pressed={showIcons}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
              (showIcons
                ? "border-black/15 bg-white text-[#03002C] hover:border-black/40"
                : "border-transparent bg-[#03002C] text-white")
            }
          >
            {showIcons ? "Icons on" : "Document view (no icons)"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "light" ? "dark" : "light")}
            className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
          >
            {mode === "light" ? "Preview on dark" : "Preview on light"}
          </button>
        </div>
      </div>

      {showIcons ? (
        <IconStyleControls
          mode={mode}
          scale={iconScale}
          stroke={iconStroke}
          accent={iconAccent}
          onScale={setIconScale}
          onStroke={setIconStroke}
          onAccent={setIconAccent}
        />
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-black/55">
          Section modules ({PRINT_MODULE_COUNT})
        </span>
        <Link
          to="/library/print/audit"
          className="ml-auto rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-[#E53D2E] hover:text-[#E53D2E]"
        >
          Fit audit →
        </Link>
        <Link
          to="/library/print/heroes"
          className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-[#003FC7] hover:text-[#003FC7]"
        >
          Hero gallery →
        </Link>
      </div>

      <p className="mt-3 text-xs text-black/45">
        {modules.length} of {PRINT_MODULE_COUNT} modules shown · {coverage.variants} modules are
        backed by {coverage.examples} sections extracted from real uploaded print collateral
      </p>

      <div className="mx-auto mb-20 mt-4 grid max-w-[920px] grid-cols-1 items-start gap-8">
        {modules.map((m) => (
          <ModuleCard
            key={m.id}
            module={m}
            mode={mode}
            useReal={useReal}
            icons={showIcons}
            iconStyle={iconStyle}
          />
        ))}
        {modules.length === 0 ? (
          <p className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/55">
            No modules match those filters.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
        (active
          ? "border-transparent bg-[#03002C] text-white"
          : "border-black/15 bg-white text-[#03002C] hover:border-black/40")
      }
    >
      {children}
    </button>
  );
}

function ModuleCard({
  module: m,
  mode,
  useReal,
  icons,
  iconStyle,
}: {
  module: PrintSectionModule;
  mode: "light" | "dark";
  useReal: boolean;
  icons: boolean;
  iconStyle: PrintIconStyle;
}) {
  // Real sections extracted from uploaded/curated print pieces for this variant.
  const examples = useMemo(() => examplesForVariant(m.variantId), [m.variantId]);
  const [exIdx, setExIdx] = useState(0);
  const example = useReal && examples.length ? examples[exIdx % examples.length] : undefined;

  // One stable demo instance per card so previews don't reshuffle on re-render.
  const fallback = useMemo<PrintSection>(() => m.make(), [m]);
  const section = example?.section ?? fallback;

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(section, null, 2));
      toast.success(`${m.label} JSON copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
            {printModuleFamilyMeta(m.family).label} · {DENSITY_LABEL[m.density]}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#03002C]">
            {m.label}
          </h2>
          <p className="mt-1 text-xs leading-[1.5] text-black/55">{m.description}</p>
        </div>
        <button
          type="button"
          onClick={() => void copyJson()}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
        >
          <CopyIcon size={12} /> JSON
        </button>
      </div>

      {/* Provenance strip — which real print piece this preview came from */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-[#F7F9FD] px-5 py-2 text-[11px]">
        {example ? (
          <>
            <span className="font-semibold uppercase tracking-[0.14em] text-[#003FC7]">
              Extracted
            </span>
            <span className="min-w-0 truncate text-black/65">
              {example.itemTitle} · {example.itemKindLabel}
            </span>
            <Link
              to="/library/print"
              className="text-black/45 underline decoration-black/20 hover:text-[#03002C]"
            >
              open source
            </Link>
            {examples.length > 1 ? (
              <button
                type="button"
                onClick={() => setExIdx((i) => i + 1)}
                className="ml-auto rounded-full border border-black/15 bg-white px-2.5 py-0.5 font-medium text-[#03002C] hover:border-black/40"
              >
                Next example ({(exIdx % examples.length) + 1}/{examples.length})
              </button>
            ) : null}
          </>
        ) : (
          <span className="text-black/45">
            {useReal
              ? "No uploaded print piece uses this variant yet — showing neutral demo copy."
              : "Neutral demo copy."}
          </span>
        )}
      </div>

      <div className="px-8 py-8" style={{ background: mode === "dark" ? "#0B0730" : "#EDEEEA" }}>
        <PrintSectionPreviewFrame
          section={section}
          mode={mode}
          accent={ACCENT}
          sheet
          icons={icons}
          iconStyle={iconStyle}
        />
        <p
          className="mt-2 text-center text-[10px] uppercase tracking-[0.16em]"
          style={{ color: mode === "dark" ? "rgba(224,232,245,0.45)" : "rgba(3,0,44,0.35)" }}
        >
          Letter page · 8.5in column at 100%
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-black/10 px-5 py-3">
        {m.bestFor.map((k) => (
          <span
            key={k}
            className="rounded-full bg-[#E0E8F5] px-2 py-0.5 text-[10px] font-medium text-[#03002C]"
          >
            {printTypeMeta(k).label}
          </span>
        ))}
        {m.tags.map((t) => (
          <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/55">
            {t}
          </span>
        ))}
      </div>
    </article>
  );
}

const ICON_ACCENTS: { label: string; value?: string }[] = [
  { label: "Section accent", value: undefined },
  { label: "Blue 500", value: "#003FC7" },
  { label: "Blue 800", value: "#03002C" },
  { label: "Dark gray", value: "#666666" },
  { label: "Aqua", value: "#A1FBF9" },
  { label: "Lavender", value: "#C2A3FF" },
  { label: "Pink", value: "#EC388A" },
  { label: "Green", value: "#A6FA87" },
];

function IconStyleControls({
  mode,
  scale,
  stroke,
  accent,
  onScale,
  onStroke,
  onAccent,
}: {
  mode: "light" | "dark";
  scale: number;
  stroke: number;
  accent: string | undefined;
  onScale: (v: number) => void;
  onStroke: (v: number) => void;
  onAccent: (v: string | undefined) => void;
}) {
  const dirty = scale !== 1 || stroke !== 1 || accent !== undefined;
  return (
    <section
      aria-label="Iconography style"
      className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-black/10 bg-white px-5 py-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
        Iconography
      </p>

      <label className="flex items-center gap-2 text-xs text-black/60">
        <span className="w-10 shrink-0">Size</span>
        <input
          type="range"
          min={0.6}
          max={1.8}
          step={0.05}
          value={scale}
          onChange={(e) => onScale(Number(e.target.value))}
          aria-label="Icon size"
          className="w-32 accent-[#003FC7]"
        />
        <span className="w-10 tabular-nums text-[#03002C]">{scale.toFixed(2)}×</span>
      </label>

      <label className="flex items-center gap-2 text-xs text-black/60">
        <span className="w-14 shrink-0">Stroke</span>
        <input
          type="range"
          min={0.6}
          max={2}
          step={0.05}
          value={stroke}
          onChange={(e) => onStroke(Number(e.target.value))}
          aria-label="Icon stroke weight"
          className="w-32 accent-[#003FC7]"
        />
        <span className="w-10 tabular-nums text-[#03002C]">{stroke.toFixed(2)}×</span>
      </label>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-black/60">Accent</span>
        {ICON_ACCENTS.map((c) => {
          const active = accent === c.value;
          return (
            <button
              key={c.label}
              type="button"
              title={c.label}
              aria-label={c.label}
              aria-pressed={active}
              onClick={() => onAccent(c.value)}
              className={
                "h-6 w-6 rounded-full border transition " +
                (active ? "border-[#03002C] ring-2 ring-[#003FC7]/40" : "border-black/15")
              }
              style={{
                background: c.value ?? "linear-gradient(135deg,#003FC7 50%,#EC388A 50%)",
              }}
            />
          );
        })}
      </div>

      <IconAccentContrastWarning
        accent={accent}
        background={iconPageBackground(mode)}
        stroke={stroke}
        onApplySuggestion={(hex) => onAccent(hex)}
        className="w-full"
      />

      {dirty ? (
        <button
          type="button"
          onClick={() => {
            onScale(1);
            onStroke(1);
            onAccent(undefined);
          }}
          className="ml-auto rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-[#03002C] hover:border-black/40"
        >
          Reset
        </button>
      ) : null}
    </section>
  );
}
