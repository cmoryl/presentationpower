// Hero gallery — a dedicated shelf for the print Hero module family.
//
// The general module library lists all 40+ families in one column; picking an
// opener needs a side-by-side view of every hero lockup with the real
// curated collateral each one was extracted from.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Copy as CopyIcon, Check } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import { PrintSectionPreviewFrame } from "@/components/print/sections/PrintSectionPreviewFrame";
import {
  PRINT_MARGIN_PRESETS,
  PRINT_PAGE_SIZE_ORDER,
  pagePreset,
  type PrintMarginPreset,
} from "@/lib/print-page-presets";
import type { PrintPageSize } from "@/lib/print-assets.types";
import {
  PRINT_SECTION_MODULES,
  type PrintSectionModule,
} from "@/lib/print-library/section-modules";
import { printTypeMeta } from "@/lib/print-library/catalog";
import { examplesForVariant } from "@/lib/print-library/module-examples";
import { applyPrintOverrides, useModuleOverrides } from "@/lib/module-overrides";
import { usePrintIconPrefs } from "@/lib/print-icon-prefs";
import type { PrintIconStyle } from "@/components/print/print-doc-mode";
import type { PrintSection } from "@/lib/print-assets.types";

export const Route = createFileRoute("/library/print_/heroes")({
  component: PrintHeroGalleryPage,
  head: () => ({
    meta: [
      { title: "Print Hero Modules · Gallery" },
      {
        name: "description",
        content:
          "Preview and pick print hero lockups — Photo Band, Photo Fade, Split Photo, Quote Split, Type Stack, Accent Band, Co-brand Band, Stat Lockup, Client Lockup, and Brief Lockup — rendered at true page proportions.",
      },
      { property: "og:title", content: "Print Hero Modules · Gallery" },
      {
        property: "og:description",
        content: "Side-by-side gallery of every print hero opener with real collateral examples.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const ACCENT = "#003FC7";

function PrintHeroGalleryPage() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [useReal, setUseReal] = useState(true);
  const [columns, setColumns] = useState<1 | 2>(2);
  const [picked, setPicked] = useState<string | null>(null);
  // Mastheads size their band off the page format, so the gallery has to be
  // able to show the same opener on a half-sheet as on Letter.
  const [pageSize, setPageSize] = useState<PrintPageSize>("Letter");
  const [marginPreset, setMarginPreset] = useState<PrintMarginPreset>("standard");

  const { prefs: iconPrefs } = usePrintIconPrefs();
  const iconStyle: PrintIconStyle = useMemo(
    () => ({ scale: iconPrefs.scale, stroke: iconPrefs.stroke, accent: iconPrefs.accent }),
    [iconPrefs.scale, iconPrefs.stroke, iconPrefs.accent],
  );

  const { overrides } = useModuleOverrides("print");
  const heroes = useMemo(
    () => applyPrintOverrides(PRINT_SECTION_MODULES, overrides).filter((m) => m.family === "hero"),
    [overrides],
  );

  return (
    <AppShell>
      <LibrarySubnav active="/library/print/modules" />

      <header className="mt-8">
        <Link
          to="/library/print/modules"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-black/50 hover:text-[#03002C]"
        >
          <ArrowLeft size={12} /> Print section modules
        </Link>
        <h1 className="mt-3 text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#03002C]">
          Hero gallery
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-[1.5] text-black/60">
          Every opening lockup the curated print collateral uses — including the fade-to-page photo
          masthead, the spotlight quote split, and the co-brand MSA band. Every preview renders at
          true Letter proportions with the original hero photography and copy, so you can compare
          openers before inserting one from the editor's <em>Shared modules</em> drawer.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        <Toggle active={useReal} onClick={() => setUseReal(!useReal)}>
          {useReal ? "Real collateral examples" : "Neutral demo copy"}
        </Toggle>
        <Toggle active={columns === 2} onClick={() => setColumns(columns === 2 ? 1 : 2)}>
          {columns === 2 ? "Two up" : "Full width"}
        </Toggle>
        <button
          type="button"
          onClick={() => setMode(mode === "light" ? "dark" : "light")}
          className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
        >
          {mode === "light" ? "Preview on dark" : "Preview on light"}
        </button>
        <select
          aria-label="Page format"
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value as PrintPageSize)}
          className="rounded-full border border-black/12 bg-white px-3 py-1.5 text-xs font-semibold text-[#03002C]"
        >
          {PRINT_PAGE_SIZE_ORDER.map((key) => (
            <option key={key} value={key}>
              {pagePreset(key).label} · {pagePreset(key).dims}
            </option>
          ))}
        </select>
        <select
          aria-label="Margin preset"
          value={marginPreset}
          onChange={(e) => setMarginPreset(e.target.value as PrintMarginPreset)}
          className="rounded-full border border-black/12 bg-white px-3 py-1.5 text-xs font-semibold text-[#03002C]"
        >
          {(Object.keys(PRINT_MARGIN_PRESETS) as PrintMarginPreset[]).map((key) => (
            <option key={key} value={key}>
              {PRINT_MARGIN_PRESETS[key].label} margins
            </option>
          ))}
        </select>
        <p className="ml-auto text-xs text-black/45">{heroes.length} hero modules</p>
      </div>

      <div
        className={
          "mb-20 mt-6 grid items-start gap-6 " +
          (columns === 2 ? "grid-cols-1 lg:grid-cols-2" : "mx-auto max-w-[920px] grid-cols-1")
        }
      >
        {heroes.map((m) => (
          <HeroCard
            key={m.id}
            module={m}
            mode={mode}
            useReal={useReal}
            iconStyle={iconStyle}
            pageSize={pageSize}
            marginPreset={marginPreset}
            picked={picked === m.variantId}
            onPick={() => {
              setPicked(m.variantId);
              toast.success(
                `${m.label} selected — insert it from the editor's Shared modules drawer`,
              );
            }}
          />
        ))}
        {heroes.length === 0 ? (
          <p className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/55">
            No hero modules registered.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function Toggle({
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
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
        (active
          ? "border-transparent bg-[#003FC7] text-white"
          : "border-black/15 bg-white text-[#03002C] hover:border-black/40")
      }
    >
      {children}
    </button>
  );
}

function HeroCard({
  module: m,
  mode,
  useReal,
  iconStyle,
  pageSize,
  marginPreset,
  picked,
  onPick,
}: {
  module: PrintSectionModule;
  mode: "light" | "dark";
  useReal: boolean;
  iconStyle: PrintIconStyle;
  pageSize: PrintPageSize;
  marginPreset: PrintMarginPreset;
  picked: boolean;
  onPick: () => void;
}) {
  const examples = useMemo(() => examplesForVariant(m.variantId), [m.variantId]);
  const [exIdx, setExIdx] = useState(0);
  const example = useReal && examples.length ? examples[exIdx % examples.length] : undefined;
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
            Hero · {m.variantId}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#03002C]">
            {m.label}
          </h2>
          <p className="mt-1 text-xs leading-[1.5] text-black/55">{m.description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={onPick}
            aria-pressed={picked}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition " +
              (picked
                ? "border-transparent bg-[#003FC7] text-white"
                : "border-black/15 text-[#03002C] hover:border-black/40")
            }
          >
            {picked ? <Check size={12} /> : null} {picked ? "Picked" : "Use this hero"}
          </button>
          <button
            type="button"
            onClick={() => void copyJson()}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
          >
            <CopyIcon size={12} /> JSON
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-[#F7F9FD] px-5 py-2 text-[11px]">
        {example ? (
          <>
            <span className="font-semibold uppercase tracking-[0.14em] text-[#003FC7]">
              Extracted
            </span>
            <span className="min-w-0 truncate text-black/65">
              {example.itemTitle} · {example.itemKindLabel}
            </span>
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
              ? "No uploaded print piece uses this hero yet — showing neutral demo copy."
              : "Neutral demo copy."}
          </span>
        )}
      </div>

      <div className="px-6 py-6" style={{ background: mode === "dark" ? "#0B0730" : "#EDEEEA" }}>
        <PrintSectionPreviewFrame
          section={section}
          mode={mode}
          accent={ACCENT}
          sheet
          pageSize={pageSize}
          marginPreset={marginPreset}
          icons={iconPrefsIcons(iconStyle)}
          iconStyle={iconStyle}
        />
        <p
          className="mt-2 text-center text-[10px] uppercase tracking-[0.16em]"
          style={{ color: mode === "dark" ? "rgba(224,232,245,0.45)" : "rgba(3,0,44,0.35)" }}
        >
          {pagePreset(pageSize).label} · {pagePreset(pageSize).dims} ·{" "}
          {PRINT_MARGIN_PRESETS[marginPreset].label.toLowerCase()} margins
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

/** Heroes carry no icon chips of their own; keep glyphs on for meta rails. */
function iconPrefsIcons(_style: PrintIconStyle): boolean {
  return true;
}
