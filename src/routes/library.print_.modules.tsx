import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import { PrintSectionRenderer } from "@/components/print/sections/PrintSectionRenderer";
import {
  PRINT_MODULE_COUNT,
  PRINT_MODULE_FAMILIES,
  PRINT_SECTION_MODULES,
  printModuleMatches,
  type PrintModuleFamily,
  type PrintSectionModule,
} from "@/lib/print-library/section-modules";
import { PRINT_TYPES, printTypeMeta } from "@/lib/print-library/catalog";
import {
  examplesForVariant,
  printModuleExampleCoverage,
} from "@/lib/print-library/module-examples";
import { applyPrintOverrides, useModuleOverrides } from "@/lib/module-overrides";
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
  const coverage = useMemo(() => printModuleExampleCoverage(), []);


  const { overrides } = useModuleOverrides("print");

  const modules = useMemo(
    () =>
      applyPrintOverrides(PRINT_SECTION_MODULES, overrides)
        .filter((m) => family === "all" || m.family === family)
        .filter((m) => kind === "all" || m.bestFor.includes(kind))
        .filter((m) => printModuleMatches(m, query)),
    [family, kind, query, overrides],
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
          {PRINT_MODULE_COUNT} reusable blocks any print asset can host. Every module is fully
          editable once inserted — insert them from the editor's <em>Shared modules</em> drawer, and
          imported briefs now arrive with their stats, quotes, and capability blocks already wired
          as modules.
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
            onClick={() => setMode(mode === "light" ? "dark" : "light")}
            className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
          >
            {mode === "light" ? "Preview on dark" : "Preview on light"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-black/45">
        {modules.length} of {PRINT_MODULE_COUNT} modules · {coverage.variants} variants preview with{" "}
        {coverage.examples} sections extracted from real uploaded print pieces
      </p>

      <div className="mb-20 mt-4 grid items-start gap-5 lg:grid-cols-2">
        {modules.map((m) => (
          <ModuleCard key={m.id} module={m} mode={mode} useReal={useReal} />
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

function ModuleCard({ module: m, mode }: { module: PrintSectionModule; mode: "light" | "dark" }) {
  // One stable demo instance per card so previews don't reshuffle on re-render.
  const section = useMemo<PrintSection>(() => m.make(), [m]);

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
            {m.family.replace("-", " ")} · {DENSITY_LABEL[m.density]}
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

      <div className="px-5 py-6" style={{ background: mode === "dark" ? "#03002C" : "#f5f5f2" }}>
        <div className="mx-auto w-full max-w-[560px]">
          <PrintSectionRenderer section={section} mode={mode} accent={ACCENT} />
        </div>
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
