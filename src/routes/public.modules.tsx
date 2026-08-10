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
import { useVariantSamples } from "@/hooks/use-variant-samples";
import { overlayLogoHubFillers } from "@/lib/logohub-fillers";
import { useClientWallPool } from "@/hooks/use-client-wall";
import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { BrandSystemThumb, StylePackThumb } from "@/components/slide/StylePackThumb";
import { STYLE_PACKS, packToneBrand, stylePackById, type StylePack } from "@/lib/style-packs";



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
  const samples = useVariantSamples();
  return useMemo(() => {
    // Admin-curated sample copy (edited in the module library) wins over the
    // deterministic seed so the public library shows the approved wording.
    const seeded = samples.apply(
      variant.id,
      brand.id,
      seedDivisionContent(variant.id, brief, "Preview section", brand) as Record<string, unknown>,
    );
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
  }, [variant, brief, brand, wallPool, samples]);
}


/** Live 16:9 render of one variant at 1920×1080, scaled into its container. */
function VariantStage({
  variant,
  brand,
  mode,
  pack,
  index,
  attr,
}: {
  variant: ModuleVariant;
  brand: BrandMode;
  mode: Mode;
  /** Alternate style pack under test, or null for the approved system. */
  pack?: StylePack | null;
  index: number;
  attr?: Record<string, string>;
}) {
  const slide = useSlide(variant, brand);
  const ref = useRef<HTMLDivElement | null>(null);
  // A pack owns its mode — the look IS light or dark, so the grid's toggle
  // steps aside while one is active.
  const effMode: Mode = pack ? pack.mode : mode;

  useEffect(() => {
    const t = window.setTimeout(async () => {
      const el = ref.current;
      if (!el) return;
      const { applyAutoFix, auditAndFixTypography } = await import("@/lib/wcag");
      auditAndFixTypography(el);
      applyAutoFix(el);
    }, 300);
    return () => window.clearTimeout(t);
  }, [variant.id, brand.id, effMode, pack?.id]);

  return (
    <div
      ref={ref}
      data-variant-id={variant.id}
      {...attr}
      className="absolute inset-0"
      style={{
        background: pack
          ? pack.tokens.surface
          : effMode === "dark"
            ? "#03002C"
            : "#F2F2F2",
      }}
    >
      <ScaledSlide>
        <StylePackProvider pack={pack ?? null}>
          <StylePackVars pack={pack ?? null} className="h-full w-full">
            <SlideBackdropContext.Provider
              value={pack ? null : backdropForVariant(variant, brand.id, effMode)}
            >
              <VariantRenderer
                slide={slide as never}
                variant={variant}
                brand={packToneBrand(brand, pack)}
                pageNumber={index + 1}
                mode={effMode}
              />
            </SlideBackdropContext.Provider>
          </StylePackVars>
        </StylePackProvider>
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
  // Alternate style pack under test. `null` = the approved brand system.
  const [packId, setPackId] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const pack = stylePackById(packId);

  // Deep-linkable: /public/modules?style=neo-brutal opens on that look, and
  // switching packs rewrites the URL so reviewers can share exactly what they
  // are looking at without adding a history entry per click.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("style");
    if (initial && stylePackById(initial)) setPackId(initial);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (packId) url.searchParams.set("style", packId);
    else url.searchParams.delete("style");
    window.history.replaceState(null, "", url);
  }, [packId]);

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
              {/* A style pack carries its own mode — the look IS light or dark,
                  so the toggle steps aside while one is active. */}
              {pack ? (
                <span className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs text-black/55">
                  {pack.label} · {pack.mode} look
                </span>
              ) : (
                <ModeToggle mode={mode} onChange={setMode} />
              )}

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

          {/* Alternate design directory — collapsed into a disclosure so the
              module grid stays the focus. One click redresses every module on
              the page; content stays identical so reviewers judge the look. */}
          <details className="group mt-7 rounded-2xl border border-black/10 bg-white">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-black/15 text-[10px] text-black/50 transition group-open:rotate-180"
                >
                  ▾
                </span>
                <span className="block">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                    Design test · alternate looks
                  </span>
                  <span className="mt-1 block text-xs text-black/55">
                    {pack
                      ? `${pack.label} — ${pack.tagline}`
                      : "Approved brand system. Open to redress every module with the same content."}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-3">
                {pack ? (
                  <span aria-hidden className="flex overflow-hidden rounded-full">
                    {pack.swatch.map((c) => (
                      <span key={c} className="h-3 w-2" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                ) : null}
                <span className="rounded-full border border-black/15 px-3 py-1 text-[11px] text-black/60">
                  {STYLE_PACKS.length + 1} looks
                </span>
              </span>
            </summary>

            <div className="border-t border-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <select
                  value={pack?.id ?? ""}
                  onChange={(e) => setPackId(e.target.value || null)}
                  className="h-10 rounded-full border border-black/15 bg-white px-4 text-sm outline-none focus:border-[#003FC7]"
                  aria-label="Design style"
                >
                  <option value="">Brand system (approved)</option>
                  {STYLE_PACKS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {p.reference}
                    </option>
                  ))}
                </select>
                <a
                  href="/public/styles"
                  className="text-xs font-medium text-[#003FC7] underline-offset-4 hover:underline"
                >
                  Open the style directory →
                </a>
              </div>

              {/* Thumbnail picker — every pack previews its own ground, type and
                  card treatment so a look can be chosen at a glance. */}
              <div
                className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
                role="group"
                aria-label="Design style thumbnails"
              >
                <button
                  type="button"
                  onClick={() => setPackId(null)}
                  aria-pressed={!pack}
                  className={`group overflow-hidden rounded-xl border text-left transition ${
                    !pack
                      ? "border-[#003FC7] ring-2 ring-[#003FC7]/25"
                      : "border-black/10 hover:border-black/40"
                  }`}
                >
                  <BrandSystemThumb />
                  <span aria-hidden className="flex gap-px border-t border-black/10">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="block flex-1">
                        <BrandSystemThumb />
                      </span>
                    ))}
                  </span>
                  <span className="block truncate px-2 py-1.5 text-[11px] font-medium text-black/70">
                    Brand system
                  </span>
                </button>
                {STYLE_PACKS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackId(p.id)}
                    aria-pressed={pack?.id === p.id}
                    title={`${p.label} — ${p.reference}`}
                    className={`group overflow-hidden rounded-xl border text-left transition ${
                      pack?.id === p.id
                        ? "border-black ring-2 ring-black/20"
                        : "border-black/10 hover:border-black/40"
                    }`}
                  >
                    {/* Cover plus two of the pack's other page layouts, so the
                        thumb shows a set of designs, not one background. */}
                    <StylePackThumb pack={p} composition="cover" />
                    <span className="flex gap-px border-t border-black/10">
                      {(["statement", "data", "quote"] as const).map((c) => (
                        <span key={c} className="block flex-1">
                          <StylePackThumb pack={p} composition={c} label={false} />
                        </span>
                      ))}
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1.5">
                      <span aria-hidden className="flex overflow-hidden rounded-full">
                        {p.swatch.map((c) => (
                          <span key={c} className="h-2.5 w-1.5" style={{ backgroundColor: c }} />
                        ))}
                      </span>
                      <span className="truncate text-[11px] font-medium text-black/70">
                        {p.label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </details>
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
                        <VariantStage variant={v} brand={brand} mode={mode} pack={pack} index={i} />
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
          pack={pack}
          mode={mode}
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
  pack,
  mode: initialMode,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  variant: ModuleVariant;
  brand: BrandMode;
  pack: StylePack | null;
  mode: Mode;
  onMode?: (m: Mode) => void;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {

  // Local to this enlarged view only — flipping light/dark here must not
  // restyle the whole module grid behind the overlay.
  const [mode, setMode] = useState<Mode>(initialMode);
  useEffect(() => {
    setMode(initialMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.id]);
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
          {pack ? (
            <span className="rounded-full border border-white/25 px-4 py-2 text-xs text-white/70">
              {pack.label} · {pack.mode} look
            </span>
          ) : (
            <ModeToggle mode={mode} onChange={setMode} />
          )}

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
            pack={pack}
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
