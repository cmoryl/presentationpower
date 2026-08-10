// Public, no-login module variant library.
import { BackToTop } from "@/components/BackToTop";
// Read-only gallery of every approved module variant, rendered live in both
// light and dark modes so external reviewers can browse and download stills
// without a Lovable/app account. No server functions, no session reads.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Download, Link2, Loader2, Moon, Search, Sun, X } from "lucide-react";

import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { LazyMount } from "@/components/LazyMount";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import {
  BRAND_MODES,
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  byId,
  type BrandMode,
  type ModuleVariant,
} from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { overlayLogoHubFillers } from "@/lib/logohub-fillers";
import { useClientWallPool } from "@/hooks/use-client-wall";


type Mode = "light" | "dark";

export const Route = createFileRoute("/public/modules")({
  head: () => ({
    meta: [
      { title: "Module Variant Library · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Public, read-only library of every approved TransPerfect slide module variant — browse layouts in light and dark, filter by family and brand, and download stills.",
      },
      { property: "og:title", content: "Module Variant Library · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "Browse every approved TransPerfect slide module variant in light and dark mode. No login required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicModuleLibrary,
});

function sectionForVariant(v: ModuleVariant): string {
  return SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? "SF-01";
}

const WALL_VARIANTS =
  /^MV-(PROOF-LOGOS|CASE-LOGO-GRID|LOGO-WALL|CLIENT-MATRIX|CLIENT-COMPARE|STAT-PORTRAIT-PROOF)/;

function useSlide(variant: ModuleVariant, brand: BrandMode) {
  const brief = useMemo(() => resolveDivisionBrief(brand), [brand]);
  const wallPool = useClientWallPool(brand.id);
  return useMemo(() => {
    const seeded = seedDivisionContent(variant.id, brief, "Preview section", brand) as Record<
      string,
      unknown
    >;
    const content =
      wallPool.length > 0 && WALL_VARIANTS.test(variant.id)
        ? overlayLogoHubFillers(seeded, variant.id, wallPool)
        : seeded;
    return {
      id: `${variant.id}:${brand.id}`,
      position: 0,
      sectionId: sectionForVariant(variant),
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0],
      content,
      changes: [],
    };
  }, [variant, brief, brand, wallPool]);
}


/** Live 16:9 render of one variant at 1920×1080, scaled into its container. */
function VariantStage({
  variant,
  brand,
  mode,
  index,
  attr,
}: {
  variant: ModuleVariant;
  brand: BrandMode;
  mode: Mode;
  index: number;
  attr?: Record<string, string>;
}) {
  const slide = useSlide(variant, brand);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(async () => {
      const el = ref.current;
      if (!el) return;
      const { applyAutoFix, auditAndFixTypography } = await import("@/lib/wcag");
      auditAndFixTypography(el);
      applyAutoFix(el);
    }, 300);
    return () => window.clearTimeout(t);
  }, [variant.id, brand.id, mode]);

  return (
    <div
      ref={ref}
      data-variant-id={variant.id}
      {...attr}
      className="absolute inset-0"
      style={{ background: mode === "dark" ? "#03002C" : "#F2F2F2" }}
    >
      <ScaledSlide>
        <SlideBackdropContext.Provider value={backdropForVariant(variant, brand.id, mode)}>
          <VariantRenderer
            slide={slide as never}
            variant={variant}
            brand={brand}
            pageNumber={index + 1}
            mode={mode}
          />
        </SlideBackdropContext.Provider>
      </ScaledSlide>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
      active ? "bg-[#03002C] text-white" : "text-black/60 hover:text-[#003FC7]"
    }`;
  return (
    <div
      className="inline-flex items-center rounded-full border border-black/15 bg-white p-0.5"
      role="group"
      aria-label="Preview mode"
    >
      <button type="button" className={pill(mode === "light")} onClick={() => onChange("light")}>
        <Sun size={13} strokeWidth={1.75} /> Light
      </button>
      <button type="button" className={pill(mode === "dark")} onClick={() => onChange("dark")}>
        <Moon size={13} strokeWidth={1.75} /> Dark
      </button>
    </div>
  );
}

// Enterprise White is the default look for the public library — it's the
// approved external-facing brand mode, so visitors land on it without picking.
const DEFAULT_BRAND_ID =
  BRAND_MODES.find((b) => b.id === "bm-enterprise")?.id ?? BRAND_MODES[0]!.id;

function PublicModuleLibrary() {
  const [query, setQuery] = useState("");
  const [familyId, setFamilyId] = useState<string>("all");
  const [brandId, setBrandId] = useState<string>(DEFAULT_BRAND_ID);
  const [mode, setMode] = useState<Mode>("light");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const brand =
    byId(BRAND_MODES, brandId) ?? byId(BRAND_MODES, DEFAULT_BRAND_ID) ?? BRAND_MODES[0]!;


  const variants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODULE_VARIANTS.filter((v) => {
      if (familyId !== "all" && v.familyId !== familyId) return false;
      if (!q) return true;
      return (
        v.id.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      );
    });
  }, [query, familyId]);

  const open = openIndex === null ? null : (variants[openIndex] ?? null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <main className="min-h-screen bg-[#F2F2F2] text-[#03002C]">
      <BackToTop />
      <header className="border-b border-black/10 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
                Public review · read only
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Module variant library
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60">
                Every approved slide module in the TransPerfect modular system, rendered live with
                sample content. Filter by family or brand, switch between light and dark, enlarge
                any module, and download a still — no sign-in required.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ModeToggle mode={mode} onChange={setMode} />
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-medium hover:border-black/35"
              >
                {copied ? (
                  <Check size={13} strokeWidth={1.75} />
                ) : (
                  <Link2 size={13} strokeWidth={1.75} />
                )}
                {copied ? "Link copied" : "Copy share link"}
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <label className="relative">
              <span className="sr-only">Search modules</span>
              <Search
                size={14}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, ID, or purpose"
                className="h-10 w-72 rounded-full border border-black/15 bg-white pl-9 pr-4 text-sm outline-none placeholder:text-black/35 focus:border-[#003FC7]"
              />
            </label>

            <select
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className="h-10 rounded-full border border-black/15 bg-white px-4 text-sm outline-none focus:border-[#003FC7]"
              aria-label="Module family"
            >
              <option value="all">All families ({MODULE_VARIANTS.length})</option>
              {MODULE_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="h-10 rounded-full border border-black/15 bg-white px-4 text-sm outline-none focus:border-[#003FC7]"
              aria-label="Brand mode"
            >
              {BRAND_MODES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <span className="text-xs text-black/50">
              {variants.length} module{variants.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        {variants.length === 0 ? (
          <p className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/60">
            No modules match that filter.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {variants.map((v, i) => {
              const family = byId(MODULE_FAMILIES, v.familyId);
              return (
                <li
                  key={v.id}
                  className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
                >
                  <div className="group relative aspect-video w-full overflow-hidden bg-[#E0E8F5]">
                    <div className="pointer-events-none absolute inset-0">
                      <LazyMount
                        placeholder={
                          <div className="absolute inset-0 grid place-items-center text-black/30">
                            <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
                          </div>
                        }
                      >
                        <VariantStage variant={v} brand={brand} mode={mode} index={i} />
                      </LazyMount>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(i)}
                      aria-label={`Enlarge ${v.name}`}
                      className="absolute inset-0 z-10 ring-1 ring-inset ring-black/10 transition group-hover:ring-[#003FC7]/50"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                        {v.id} · {family?.name ?? v.familyId}
                      </div>
                      <h2 className="mt-1 text-sm font-semibold">{v.name}</h2>
                      <p className="mt-1 text-xs leading-relaxed text-black/55">{v.description}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && openIndex !== null && (
        <Lightbox
          variant={open}
          brand={brand}
          mode={mode}
          onMode={setMode}
          index={openIndex}
          total={variants.length}
          onClose={() => setOpenIndex(null)}
          onPrev={() => setOpenIndex((i) => (i === null ? null : (i - 1 + variants.length) % variants.length))}
          onNext={() => setOpenIndex((i) => (i === null ? null : (i + 1) % variants.length))}
        />
      )}
    </main>
  );
}

function Lightbox({
  variant,
  brand,
  mode,
  onMode,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  variant: ModuleVariant;
  brand: BrandMode;
  mode: Mode;
  onMode: (m: Mode) => void;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const download = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const node = document.querySelector<HTMLElement>(
        `[data-public-preview="1"][data-variant-id="${variant.id}"]`,
      );
      if (!node) throw new Error("Preview not ready");
      const mod = await import("@/lib/slide-image-export");
      await mod.exportSlideAsPng(node, {
        mode,
        targetWidth: 1920,
        filename: `${variant.id}-${brand.id}-${mode}.png`,
      });
    } catch {
      toast.error("Could not export this module");
    } finally {
      setBusy(false);
    }
  }, [busy, variant.id, brand.id, mode]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#03002C]/90 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${variant.id} ${variant.name}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-white">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            {variant.id} · {index + 1} of {total}
          </div>
          <h2 className="mt-1 text-lg font-semibold">{variant.name}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModeToggle mode={mode} onChange={onMode} />
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-[#03002C] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Download size={13} strokeWidth={1.75} />
            )}
            PNG · HD
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white hover:border-white/60"
          >
            <X size={13} strokeWidth={1.75} /> Close
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="hidden shrink-0 rounded-full border border-white/25 px-3 py-6 text-white hover:border-white/60 sm:block"
          aria-label="Previous module"
        >
          ‹
        </button>
        <div className="relative mx-auto aspect-video w-full max-w-[1400px] overflow-hidden rounded-xl">
          <VariantStage
            variant={variant}
            brand={brand}
            mode={mode}
            index={index}
            attr={{ "data-public-preview": "1" }}
          />
        </div>
        <button
          type="button"
          onClick={onNext}
          className="hidden shrink-0 rounded-full border border-white/25 px-3 py-6 text-white hover:border-white/60 sm:block"
          aria-label="Next module"
        >
          ›
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-white/55">
        {variant.description}
      </p>
    </div>
  );
}
