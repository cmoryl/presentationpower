import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Star, Copy, Check, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { LazyMount } from "@/components/LazyMount";
import { WcagBadge } from "@/components/WcagBadge";
import { TypeBadge } from "@/components/TypeBadge";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import { seedContent, useDeckStore, type Brief, type TemplatePayload } from "@/lib/deck-store";
import { byId, MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { MODULE_PRESET_KITS, validateKit } from "@/lib/module-preset-kits";
import { formatKitValidationError } from "@/lib/kit-validation";

// ─── Pinned variants (per-user, local) ──────────────────────────────────────
const PINS_KEY = "library.pinnedVariants.v1";
function readPins(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PINS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}
function writePins(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PINS_KEY, JSON.stringify([...set]));
  } catch { /* quota */ }
}
function usePins() {
  const [pins, setPins] = useState<Set<string>>(() => new Set());
  // Hydrate after mount to avoid SSR mismatch.
  useEffect(() => { setPins(readPins()); }, []);
  const toggle = useCallback((id: string) => {
    setPins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      writePins(next);
      return next;
    });
  }, []);
  return { pins, toggle } as const;
}



const SAMPLE_BRIEF: Brief = {
  id: "preview",
  createdAt: "2026-01-01T00:00:00.000Z",
  prospect: "Acme Corp",
  industry: "Life sciences",
  meetingObjective: "Strategic partnership review",
  audience: "Executive team",
  brandModeId: "bm-corporate",
  archetypeId: "arch-problem-solution",
  lengthTarget: 12,
  clientFacts: "",
};

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library · TransPerfect Modular" },
      { name: "description", content: "Approved module variants ready to drop into a deck." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: Library,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Library failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

// Structural tags derived from variant id prefixes + capacity signals.
// This avoids inventing new taxonomy metadata — we key off patterns that
// already exist across MODULE_VARIANTS.
type StructuralTag = { id: string; label: string; test: (v: ModuleVariant) => boolean };
const STRUCTURAL_TAGS: StructuralTag[] = [
  { id: "stat", label: "Stats", test: (v) => /^MV-(NUMBERS|KPI|DASH|PROOF|COUNTDOWN|ICEBERG)/.test(v.id) },
  { id: "chart", label: "Charts", test: (v) => /^MV-(GRAPH|DASH|KPI)/.test(v.id) },
  { id: "bento", label: "Bento", test: (v) => /^MV-BENTO/.test(v.id) },
  { id: "image", label: "Image-led", test: (v) => /^MV-(IMG|EDITORIAL|OP-COVER-MEDIA)/.test(v.id) },
  { id: "editorial", label: "Editorial", test: (v) => /^MV-(EDITORIAL|PULL|QUOTE|SPLIT|DEFINITION|PRINCIPLES)/.test(v.id) },
  { id: "timeline", label: "Timeline & journey", test: (v) => /^MV-(TIMELINE|JOURNEY|ROADMAP|HORIZON|PROC|FLYWHEEL|MATURITY|FUNNEL)/.test(v.id) },
  { id: "comparison", label: "Comparison", test: (v) => /^MV-(COMPARE|MATRIX|DEC|CLIENT-COMPARE)/.test(v.id) },
  { id: "logo", label: "Logo walls", test: (v) => /^MV-LOGO/.test(v.id) },
  { id: "case", label: "Case & proof", test: (v) => /^MV-(CASE|PROOF)/.test(v.id) },
  { id: "cover", label: "Cover & close", test: (v) => /^MV-(OP|CLOSE|REC|CTA)/.test(v.id) },
];

function Library() {
  const { brandModes, moduleFamilies, moduleVariants, layoutFrameworks, sectionFrameworks } = useTaxonomy();
  const [q, setQ] = useState("");
  const [familyIds, setFamilyIds] = useState<Set<string>>(new Set());
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [scopeBrandId, setScopeBrandId] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"light" | "dark" | "ab">("light");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sort, setSort] = useState<"default" | "most-used" | "pinned-first">("default");

  const [showImagery, setShowImagery] = useState(false);
  const autoFixOn = true;
  const tpMasterIdx = Math.max(0, brandModes.findIndex((b) => b.id === "bm-enterprise"));
  const [brandIdx, setBrandIdx] = useState(tpMasterIdx);

  const { pins, toggle: togglePin } = usePins();

  // Usage counts across the local deck store — cheap, client-only.
  const decks = useDeckStore((s) => s.decks);
  const usageByVariant = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of Object.values(decks)) {
      for (const sl of d.slides) m.set(sl.variantId, (m.get(sl.variantId) ?? 0) + 1);
    }
    return m;
  }, [decks]);

  const scopeBrand = scopeBrandId === "all" ? undefined : brandModes.find((b) => b.id === scopeBrandId);
  const tpMaster = brandModes.find((b) => b.id === "bm-enterprise") ?? brandModes[0];
  const restricted = new Set(scopeBrand?.contentScope?.restrictedFamilyIds ?? []);
  const preferred = new Set(scopeBrand?.contentScope?.preferredVariantIds ?? []);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const activeTags = useMemo(
    () => STRUCTURAL_TAGS.filter((t) => tagIds.has(t.id)),
    [tagIds],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matched = moduleVariants.filter((v) => {
      if (pinnedOnly && !pins.has(v.id)) return false;
      if (familyIds.size > 0 && !familyIds.has(v.familyId)) return false;
      if (scopeBrand && restricted.has(v.familyId)) return false;
      if (activeTags.length > 0 && !activeTags.every((t) => t.test(v))) return false;
      if (!needle) return true;
      const familyName = byId(moduleFamilies, v.familyId)?.name.toLowerCase() ?? "";
      return (
        v.id.toLowerCase().includes(needle) ||
        v.name.toLowerCase().includes(needle) ||
        v.description.toLowerCase().includes(needle) ||
        v.familyId.toLowerCase().includes(needle) ||
        familyName.includes(needle)
      );
    });
    const scored = [...matched];
    if (sort === "most-used") {
      scored.sort((a, b) => (usageByVariant.get(b.id) ?? 0) - (usageByVariant.get(a.id) ?? 0));
    } else if (sort === "pinned-first") {
      scored.sort((a, b) => (pins.has(b.id) ? 1 : 0) - (pins.has(a.id) ? 1 : 0));
    } else if (scopeBrand) {
      scored.sort((a, b) => (preferred.has(a.id) ? 0 : 1) - (preferred.has(b.id) ? 0 : 1));
    }
    return scored;
  }, [q, familyIds, activeTags, moduleVariants, moduleFamilies, scopeBrand, restricted, preferred, pinnedOnly, pins, sort, usageByVariant]);

  const hasFilters =
    q.trim().length > 0 || familyIds.size > 0 || tagIds.size > 0 || scopeBrandId !== "all" || pinnedOnly || sort !== "default";
  const clearFilters = () => {
    setQ("");
    setFamilyIds(new Set());
    setTagIds(new Set());
    setScopeBrandId("all");
    setPinnedOnly(false);
    setSort("default");
  };


  const active = openId ? moduleVariants.find((v) => v.id === openId) : null;

  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Library</div>
        <h1 className="mt-3 text-4xl font-semibold">Approved module variants.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Search and preview the modules the assembler pulls from. Scope by brand to hide off-limits families and float the preferred variants for that identity.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-80">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, id, family, description…"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 pr-8 text-sm shadow-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-black/40 hover:bg-black/5 hover:text-black"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={scopeBrandId}
            onChange={(e) => setScopeBrandId(e.target.value)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            title="Filter to what's in-scope for a brand"
          >
            <option value="all">Any brand scope</option>
            {brandModes.map((b) => (
              <option key={b.id} value={b.id}>Scope: {b.name}</option>
            ))}
          </select>
          {scopeBrand && (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/70">
              {preferred.size} preferred · {restricted.size} family restrictions
            </span>
          )}
          <button
            type="button"
            onClick={() => setPinnedOnly((v) => !v)}
            aria-pressed={pinnedOnly}
            title={pins.size > 0 ? `${pins.size} pinned` : "No pins yet — star a card"}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
              pinnedOnly
                ? "border-amber-500 bg-amber-400/20 text-amber-900"
                : "border-black/15 bg-white text-black/70 hover:border-amber-400 hover:text-amber-800"
            }`}
          >
            <Star size={12} className={pinnedOnly ? "fill-amber-500 text-amber-600" : ""} />
            Pinned{pins.size > 0 ? ` · ${pins.size}` : ""}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-black/15 bg-white px-2.5 py-2 text-xs text-black/70"
            title="Sort variants"
          >
            <option value="default">Sort: default</option>
            <option value="pinned-first">Pinned first</option>
            <option value="most-used">Most used by you</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:border-black/30 hover:text-black"
            >
              Clear filters
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-full border border-black/15 bg-white text-xs">
              <button
                type="button"
                onClick={() => setMode("light")}
                className={`px-3 py-1.5 ${mode === "light" ? "bg-[#03002C] text-white" : "text-black/60 hover:text-black"}`}
                aria-pressed={mode === "light"}
              >
                ☀︎ Light
              </button>
              <button
                type="button"
                onClick={() => setMode("dark")}
                className={`px-3 py-1.5 ${mode === "dark" ? "bg-[#03002C] text-white" : "text-black/60 hover:text-black"}`}
                aria-pressed={mode === "dark"}
              >
                ☾ Dark
              </button>
              <button
                type="button"
                onClick={() => setMode("ab")}
                className={`px-3 py-1.5 ${mode === "ab" ? "bg-[#03002C] text-white" : "text-black/60 hover:text-black"}`}
                aria-pressed={mode === "ab"}
                title="Compare light vs dark side-by-side"
              >
                ⇋ A/B
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowImagery((v) => !v)}
              aria-pressed={showImagery}
              title="Render each module with sample background imagery"
              className={`rounded-full border px-3 py-1.5 text-xs ${
                showImagery
                  ? "border-[#03002C] bg-[#03002C] text-white"
                  : "border-black/15 bg-white text-black/70 hover:text-black"
              }`}
            >
              ▤ Sample imagery {showImagery ? "on" : "off"}
            </button>
            <span className="text-sm tabular-nums text-black/50">{filtered.length} of {moduleVariants.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">Family</span>
          {moduleFamilies.map((mf) => {
            const on = familyIds.has(mf.id);
            return (
              <button
                key={mf.id}
                type="button"
                onClick={() => setFamilyIds((s) => toggle(s, mf.id))}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  on
                    ? "border-[#03002C] bg-[#03002C] text-white shadow-sm"
                    : "border-black/15 bg-white text-black/70 hover:border-black/30 hover:text-black"
                }`}
                title={mf.name}
              >
                {mf.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">Structure</span>
          {STRUCTURAL_TAGS.map((t) => {
            const on = tagIds.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTagIds((s) => toggle(s, t.id))}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  on
                    ? "border-[#003FC7] bg-[#003FC7] text-white shadow-sm"
                    : "border-black/15 bg-white text-black/70 hover:border-[#003FC7]/40 hover:text-black"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>


      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/15 bg-white/50 px-8 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#03002C]/5 text-2xl">
            ⌕
          </div>
          <h3 className="text-lg font-semibold text-[#03002C]">No modules match those filters.</h3>
          <p className="mt-2 max-w-md text-sm text-black/60">
            Try loosening your search, removing a structural tag, or clearing the brand scope. The library holds {moduleVariants.length} approved variants.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full bg-[#03002C] px-4 py-2 text-sm text-white hover:bg-[#003FC7]"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
      <div className="mt-6 grid grid-cols-2 gap-6 xl:grid-cols-3">
        {filtered.map((v) => (
          <VariantCard
            key={v.id}
            variant={v}
            familyName={byId(moduleFamilies, v.familyId)?.name}
            brand={scopeBrand ?? tpMaster}
            sectionId={sectionFrameworks.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? ""}
            preferred={preferred.has(v.id)}
            pinned={pins.has(v.id)}
            usageCount={usageByVariant.get(v.id) ?? 0}
            onTogglePin={() => togglePin(v.id)}
            mode={mode}
            showImagery={showImagery}
            autoFixOn={autoFixOn}
            onOpen={() => setOpenId(v.id)}
          />
        ))}
      </div>
      )}


      

      <div className="mt-10">
        <Link to="/brief/new" className="rounded-full bg-[#03002C] px-5 py-2.5 text-sm text-white">
          Start a brief →
        </Link>
      </div>

      {active && (
        <VariantDetailModal
          variant={active}
          brand={brandModes[Math.min(brandIdx, brandModes.length - 1)]}
          brands={brandModes}
          brandIdx={brandIdx}
          setBrandIdx={setBrandIdx}
          mode={mode === "ab" ? "light" : mode}
          setMode={setMode}
          showImagery={showImagery}
          setShowImagery={setShowImagery}
          family={byId(moduleFamilies, active.familyId)}
          fallback={active.fallbackVariantId ? byId(moduleVariants, active.fallbackVariantId) : undefined}
          layouts={active.permittedLayoutIds
            .map((id) => byId(layoutFrameworks, id))
            .filter(Boolean) as ReturnType<typeof useTaxonomy>["layoutFrameworks"]}
          sections={sectionFrameworks.filter((s) => s.permittedFamilyIds.includes(active.familyId))}
          pinned={pins.has(active.id)}
          onTogglePin={() => togglePin(active.id)}
          usageCount={usageByVariant.get(active.id) ?? 0}
          onClose={() => setOpenId(null)}
        />
      )}
    </AppShell>
  );
}

const VariantCard = memo(function VariantCard({
  variant,
  familyName,
  brand,
  sectionId,
  preferred,
  pinned = false,
  usageCount = 0,
  onTogglePin,
  mode = "light",
  showImagery = false,
  autoFixOn = false,
  onOpen,
}: {
  variant: ModuleVariant;
  familyName?: string;
  brand: ReturnType<typeof useTaxonomy>["brandModes"][number];
  sectionId: string;
  preferred?: boolean;
  pinned?: boolean;
  usageCount?: number;
  onTogglePin?: () => void;
  mode?: "light" | "dark" | "ab";
  showImagery?: boolean;
  autoFixOn?: boolean;
  onOpen: () => void;
}) {
  const previewSlide = {
    id: variant.id,
    position: 0,
    sectionId,
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: seedContent(variant.id, SAMPLE_BRIEF, "Preview section") as Record<string, unknown>,
    changes: [],
  };
  const isDark = mode === "dark";
  const isAB = mode === "ab";
  const lightBackdrop = showImagery ? backdropForVariant(variant, brand.id, "light") : null;
  const darkBackdrop = showImagery ? backdropForVariant(variant, brand.id, "dark") : null;
  const singleBackdrop = showImagery ? backdropForVariant(variant, brand.id, isDark ? "dark" : "light") : null;
  const lightRef = useRef<HTMLDivElement | null>(null);
  const darkRef = useRef<HTMLDivElement | null>(null);
  const singleRef = useRef<HTMLDivElement | null>(null);
  const [mountTick, setMountTick] = useState(0);
  const bumpMount = useCallback(() => setMountTick((n) => n + 1), []);
  // Apply / revert the auto-fix on the currently-visible slide refs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const targets = isAB
      ? [lightRef.current, darkRef.current]
      : [singleRef.current];
    if (!targets.some(Boolean)) return;
    const t = window.setTimeout(async () => {
      const { applyAutoFix, revertAutoFix, auditAndFixTypography, revertTypeFix } = await import("@/lib/wcag");
      for (const el of targets) {
        if (!el) continue;
        revertAutoFix(el);
        revertTypeFix(el);
        // Type fix first so contrast audit sees the final rendered sizes.
        auditAndFixTypography(el);
        if (autoFixOn) applyAutoFix(el);
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [autoFixOn, isAB, variant.id, brand.id, showImagery, isDark, mountTick]);

  return (
    <div className="group relative">
    <button
      type="button"
      onClick={onOpen}
      data-variant-card=""
      data-variant-id={variant.id}
      data-variant-family={variant.familyId}
      data-variant-layout={variant.permittedLayoutIds[0] ?? ""}
      data-variant-mode={mode}
      data-variant-pinned={pinned ? "1" : "0"}
      data-variant-usage={usageCount}
      className="block w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-2px_rgba(0,0,0,0.02)] transition-all duration-500 hover:-translate-y-1 hover:border-[#003FC7]/20 hover:shadow-[0_20px_50px_-12px_rgba(3,0,44,0.15)]"
    >
      {isAB ? (
        <div className="m-2 grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((m) => (
            <div key={m} className="relative">
              <LazyMount
                className={`relative aspect-[16/10] overflow-hidden rounded-[14px] ${m === "dark" ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}
                placeholder={<PreviewSkeleton dark={m === "dark"} label={variant.familyId} />}
                onMount={bumpMount}
              >
                <div
                  ref={m === "dark" ? darkRef : lightRef}
                  className="absolute inset-0"
                >
                  <ScaledSlide>
                    <SlideBackdropContext.Provider value={m === "dark" ? darkBackdrop : lightBackdrop}>
                      <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} mode={m} />
                    </SlideBackdropContext.Provider>
                  </ScaledSlide>
                </div>
              </LazyMount>
              <WcagBadge variantId={variant.id} mode={m} targetRef={m === "dark" ? darkRef : lightRef} enabled={isAB} compact />
              <TypeBadge targetRef={m === "dark" ? darkRef : lightRef} compact />
              <div className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest backdrop-blur ${m === "dark" ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-black/70 text-white"}`}>
                {m === "dark" ? "☾ B · Dark" : "☀︎ A · Light"}
              </div>
            </div>
          ))}
          {preferred && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-emerald-500/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white shadow ring-1 ring-white/30 backdrop-blur-md">
              In scope
            </div>
          )}
        </div>
      ) : (
      <LazyMount
        className={`relative m-2 aspect-[16/10] overflow-hidden rounded-[18px] ${isDark ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}
        placeholder={<PreviewSkeleton dark={isDark} label={variant.familyId} />}
        onMount={bumpMount}
      >
      <div ref={singleRef} className="absolute inset-0">
        <ScaledSlide>
          <SlideBackdropContext.Provider value={singleBackdrop}>
            <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} mode={isDark ? "dark" : "light"} />
          </SlideBackdropContext.Provider>
        </ScaledSlide>

        {/* Subtle top-right specular gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08]" />

        {/* Diagonal light sweep on hover */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />

        {/* Quick-action overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-[#03002C]/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
          <span className="translate-y-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#03002C] shadow-lg transition-transform duration-300 group-hover:translate-y-0">
            Preview
          </span>
          <span className="translate-y-2 rounded-full border border-white/30 bg-white/20 p-2 text-white backdrop-blur-md transition-transform delay-75 duration-300 group-hover:translate-y-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
        </div>

        {preferred && (
          <div className="absolute left-3 top-3 rounded-full bg-emerald-500/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white shadow ring-1 ring-white/30 backdrop-blur-md">
            In scope
          </div>
        )}
      </div>
      </LazyMount>
      )}

      {/* Metadata footer */}
      <div className="space-y-4 p-6 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#003FC7]">
              {variant.id}
            </div>
            <h3 className="truncate text-lg font-semibold tracking-tight text-[#03002C]">
              {variant.name}
            </h3>
          </div>
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {variant.familyId}
          </span>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
          {variant.description}
        </p>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">Family</span>
              <span className="truncate text-xs font-medium text-[#03002C]">{familyName ?? "—"}</span>
            </div>
            <div className="h-6 w-px bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">Layouts</span>
              <span className="text-xs font-medium text-[#03002C]">
                {variant.permittedLayoutIds.length} {variant.permittedLayoutIds.length === 1 ? "variant" : "variants"}
              </span>
            </div>
            {variant.capacity.items && (
              <>
                <div className="h-6 w-px bg-slate-100" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">Items</span>
                  <span className="text-xs font-medium text-[#03002C]">
                    {variant.capacity.items.min}–{variant.capacity.items.max}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#003FC7]">
            <span>Details</span>
            <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </button>
    {onTogglePin && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        aria-pressed={pinned}
        aria-label={pinned ? "Unpin variant" : "Pin variant"}
        title={pinned ? "Pinned — click to unpin" : "Pin to Favorites"}
        data-variant-pin=""
        className={`absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition ${
          pinned
            ? "bg-amber-400 text-[#03002C] shadow ring-1 ring-amber-500/40"
            : "bg-white/85 text-black/60 shadow-sm ring-1 ring-black/10 hover:bg-white hover:text-amber-600"
        }`}
      >
        <Star size={14} className={pinned ? "fill-current" : ""} />
      </button>
    )}
    {usageCount > 0 && (
      <span
        data-variant-usage-badge=""
        className="pointer-events-none absolute right-3 bottom-3 z-10 rounded-full bg-[#03002C]/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white shadow-sm ring-1 ring-white/10 backdrop-blur"
        title={`Used in ${usageCount} of your slides`}
      >
        Used · {usageCount}
      </span>
    )}
    </div>
  );
});

function PreviewSkeleton({ dark = false, label }: { dark?: boolean; label?: string }) {
  const bg = dark ? "#03002C" : "#F2F2F2";
  const line = dark ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.06)";
  const tint = dark ? "rgba(161,251,249,0.14)" : "rgba(0,63,199,0.08)";
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: `radial-gradient(120% 100% at 50% 0%, ${tint}, ${bg} 55%)` }}
    >
      <div className="flex w-4/5 flex-col gap-3">
        <div className="h-3 w-1/3 rounded" style={{ background: line }} />
        <div className="h-6 w-3/4 rounded" style={{ background: line }} />
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div className="h-10 rounded" style={{ background: line }} />
          <div className="h-10 rounded" style={{ background: line }} />
          <div className="h-10 rounded" style={{ background: line }} />
        </div>
      </div>
      {label && (
        <div
          className="absolute bottom-2 right-2 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
          style={{ color: dark ? "rgba(255,255,255,0.55)" : "rgba(3,0,44,0.45)", background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}


function VariantDetailModal({
  variant,
  brand,
  brands,
  brandIdx,
  setBrandIdx,
  mode,
  setMode,
  showImagery,
  setShowImagery,
  family,
  fallback,
  layouts,
  sections,
  pinned,
  onTogglePin,
  usageCount,
  onClose,
}: {
  variant: ModuleVariant;
  brand: ReturnType<typeof useTaxonomy>["brandModes"][number];
  brands: ReturnType<typeof useTaxonomy>["brandModes"];
  brandIdx: number;
  setBrandIdx: (i: number) => void;
  mode: "light" | "dark";
  setMode: (m: "light" | "dark") => void;
  showImagery: boolean;
  setShowImagery: (b: boolean) => void;
  family: ReturnType<typeof useTaxonomy>["moduleFamilies"][number] | undefined;
  fallback: ModuleVariant | undefined;
  layouts: ReturnType<typeof useTaxonomy>["layoutFrameworks"];
  sections: ReturnType<typeof useTaxonomy>["sectionFrameworks"];
  pinned: boolean;
  onTogglePin: () => void;
  usageCount: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyId = async () => {
    try {
      if (navigator?.clipboard) await navigator.clipboard.writeText(variant.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const previewSlide = {
    id: variant.id,
    position: 0,
    sectionId: sections[0]?.id ?? "",
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: seedContent(variant.id, SAMPLE_BRIEF, sections[0]?.name ?? "Preview section") as Record<string, unknown>,
    changes: [],
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#03002C]/70 p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass glass-sheen my-6 w-full max-w-6xl overflow-hidden rounded-2xl"
      >

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-black/10 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-xs text-black/50">
              <span>{variant.id}</span>
              <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 text-[10px] text-[#0B2A4A]">{variant.familyId}</span>
              {family && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  family.reviewLevel === "strict" ? "bg-red-100 text-red-800" :
                  family.reviewLevel === "standard" ? "bg-amber-100 text-amber-800" :
                  "bg-emerald-100 text-emerald-800"
                }`}>
                  {family.reviewLevel} review
                </span>
              )}
            </div>
            <div className="mt-1 truncate text-xl font-semibold">{variant.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyId}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:border-[#003FC7]/40 hover:text-[#003FC7]"
              title="Copy variant ID to clipboard"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy ID"}
            </button>
            <button
              type="button"
              onClick={onTogglePin}
              aria-pressed={pinned}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                pinned
                  ? "border-amber-500 bg-amber-400/20 text-amber-900"
                  : "border-black/15 bg-white text-black/70 hover:border-amber-400 hover:text-amber-800"
              }`}
              title={pinned ? "Unpin from favorites" : "Pin to favorites"}
            >
              <Star size={12} className={pinned ? "fill-amber-500 text-amber-600" : ""} />
              {pinned ? "Pinned" : "Pin"}
            </button>
            {usageCount > 0 && (
              <span className="rounded-full bg-[#03002C]/90 px-2.5 py-1 text-[11px] font-medium text-white" title={`Used in ${usageCount} of your slides`}>
                Used · {usageCount}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
            >
              Close ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Large preview */}
          <div className="border-b border-black/10 bg-neutral-50 p-6 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-widest text-black/50">Preview</div>
              <div className="flex items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-full border border-black/15 bg-white text-[11px]">
                  <button
                    type="button"
                    onClick={() => setMode("light")}
                    className={`px-2.5 py-1 ${mode === "light" ? "bg-[#03002C] text-white" : "text-black/60"}`}
                  >
                    ☀︎
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("dark")}
                    className={`px-2.5 py-1 ${mode === "dark" ? "bg-[#03002C] text-white" : "text-black/60"}`}
                  >
                    ☾
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImagery(!showImagery)}
                  aria-pressed={showImagery}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    showImagery
                      ? "border-[#03002C] bg-[#03002C] text-white"
                      : "border-black/15 bg-white text-black/60"
                  }`}
                  title="Toggle background imagery"
                >
                  ▤ Imagery
                </button>
                <select
                  value={brandIdx}
                  onChange={(e) => setBrandIdx(Number(e.target.value))}
                  className="rounded-lg border border-black/15 bg-white px-2 py-1 text-xs"
                >
                  {brands.map((b, i) => (
                    <option key={b.id} value={i}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <ModalABPreview variant={variant} brand={brand} previewSlide={previewSlide} showImagery={showImagery} />

            <p className="mt-4 text-sm text-black/60">{variant.description}</p>
          </div>

          {/* Specifics */}
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6 text-sm">
            <AddToDeckPanel variant={variant} onDone={onClose} />

            <Spec label="Module family">
              <div className="font-mono text-xs text-black/50">{variant.familyId}</div>
              <div>{family?.name ?? "—"}</div>
              {family?.description && <div className="mt-1 text-black/60">{family.description}</div>}
            </Spec>

            <Spec label="Capacity">
              {variant.capacity.items && (
                <Row k="Items" v={`${variant.capacity.items.min}–${variant.capacity.items.max}`} />
              )}
              {variant.capacity.titleChars != null && (
                <Row k="Title max chars" v={String(variant.capacity.titleChars)} />
              )}
              {variant.capacity.bodyChars != null && (
                <Row k="Body max chars" v={String(variant.capacity.bodyChars)} />
              )}
              {!variant.capacity.items && variant.capacity.titleChars == null && variant.capacity.bodyChars == null && (
                <div className="text-black/50">No capacity rules.</div>
              )}
            </Spec>

            <Spec label={`Permitted layouts (${layouts.length})`}>
              <ul className="space-y-1.5">
                {layouts.map((lf) => (
                  <li key={lf.id} className="rounded-lg border border-black/10 bg-white px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-mono text-xs text-black/50">{lf.id}</div>
                      <div className="font-medium">{lf.name}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-black/60">{lf.description}</div>
                    {lf.zones.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {lf.zones.map((z) => (
                          <span key={z} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/70">{z}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Spec>

            <Spec label={`Editable fields (${variant.editableFields.length})`}>
              <FieldChips fields={variant.editableFields} tone="emerald" />
            </Spec>

            <Spec label={`Locked fields (${variant.lockedFields.length})`}>
              {variant.lockedFields.length > 0 ? (
                <FieldChips fields={variant.lockedFields} tone="red" />
              ) : (
                <div className="text-black/50">None locked.</div>
              )}
            </Spec>

            <Spec label={`Used in section frameworks (${sections.length})`}>
              {sections.length > 0 ? (
                <ul className="space-y-1">
                  {sections.map((sf) => (
                    <li key={sf.id} className="flex items-baseline gap-2 text-xs">
                      <span className="font-mono text-black/50">{sf.id}</span>
                      <span>{sf.name}</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-black/50">—</div>}
            </Spec>

            <Spec label="Smart fallback">
              {fallback ? (
                <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
                  <div className="font-mono text-xs text-black/50">{fallback.id}</div>
                  <div className="font-medium">{fallback.name}</div>
                  <div className="mt-0.5 text-xs text-black/60">
                    Used when content exceeds capacity of {variant.id}.
                  </div>
                </div>
              ) : (
                <div className="text-black/50">No fallback declared.</div>
              )}
            </Spec>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalABPreview({
  variant,
  brand,
  previewSlide,
  showImagery,
}: {
  variant: ModuleVariant;
  brand: ReturnType<typeof useTaxonomy>["brandModes"][number];
  previewSlide: Parameters<typeof VariantRenderer>[0]["slide"];
  showImagery: boolean;
}) {
  const lightRef = useRef<HTMLDivElement | null>(null);
  const darkRef = useRef<HTMLDivElement | null>(null);
  const lightBackdrop = showImagery ? backdropForVariant(variant, brand.id, "light") : null;
  const darkBackdrop = showImagery ? backdropForVariant(variant, brand.id, "dark") : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const targets = [lightRef.current, darkRef.current];
    const t = window.setTimeout(async () => {
      const { applyAutoFix, revertAutoFix } = await import("@/lib/wcag");
      for (const el of targets) {
        if (!el) continue;
        revertAutoFix(el);
        applyAutoFix(el);
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [variant.id, brand.id, showImagery]);

  const [zoom, setZoom] = useState<null | "light" | "dark">(null);

  return (
    <>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {(["light", "dark"] as const).map((m) => (
        <div key={m} className="relative">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
              {m === "light" ? "☀︎ A · Light" : "☾ B · Dark"}
            </span>
            <span className="text-[10px] text-black/40">Click to zoom</span>
          </div>
          <button
            type="button"
            onClick={() => setZoom(m)}
            aria-label={`Zoom ${m} preview`}
            className="group relative block w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition hover:border-[#003FC7]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#003FC7]/40"
          >
            <div
              ref={m === "dark" ? darkRef : lightRef}
              className={`relative aspect-[16/9] overflow-hidden ${m === "dark" ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}
            >
              <ScaledSlide>
                <SlideBackdropContext.Provider value={m === "dark" ? darkBackdrop : lightBackdrop}>
                  <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} mode={m} />
                </SlideBackdropContext.Provider>
              </ScaledSlide>
              <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-2 opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white">⤢ Zoom</span>
              </div>
            </div>
            <WcagBadge variantId={variant.id} mode={m} targetRef={m === "dark" ? darkRef : lightRef} enabled />
          </button>
        </div>
      ))}
    </div>
    {zoom && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
        onClick={() => setZoom(null)}
        role="dialog"
        aria-modal="true"
        aria-label="Enlarged slide preview"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoom(null); }}
          className="absolute right-6 top-6 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Close ✕
        </button>
        <div className="absolute left-6 top-6 flex items-center gap-2">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoom(m); }}
              className={`rounded-full border px-3 py-1.5 text-xs ${zoom === m ? "border-white bg-white text-black" : "border-white/30 bg-white/10 text-white hover:bg-white/20"}`}
            >
              {m === "light" ? "☀︎ Light" : "☾ Dark"}
            </button>
          ))}
        </div>
        <div
          className="relative w-full max-w-[92vw]"
          style={{ aspectRatio: "16 / 9", maxHeight: "86vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`relative h-full w-full overflow-hidden rounded-2xl border border-white/15 shadow-2xl ${zoom === "dark" ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}>
            <ScaledSlide>
              <SlideBackdropContext.Provider value={zoom === "dark" ? darkBackdrop : lightBackdrop}>
                <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} mode={zoom} />
              </SlideBackdropContext.Provider>
            </ScaledSlide>
          </div>
        </div>
      </div>
    )}
    </>
  );
}


function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-black/50">{label}</div>
      <div>{children}</div>
    </div>
  );
}


function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-black/5 py-1 text-xs last:border-0">
      <span className="text-black/60">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}

function FieldChips({ fields, tone }: { fields: string[]; tone: "emerald" | "red" }) {
  const cls = tone === "emerald"
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-red-50 text-red-800 border-red-200";
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((f) => (
        <span key={f} className={`rounded border px-2 py-0.5 font-mono text-[10px] ${cls}`}>{f}</span>
      ))}
    </div>
  );
}

function AddToDeckPanel({ variant, onDone }: { variant: ModuleVariant; onDone: () => void }) {
  const decks = useDeckStore((s) => s.decks);
  const insertVariantSlide = useDeckStore((s) => s.insertVariantSlide);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const list = useMemo(
    () => Object.values(decks).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 8),
    [decks],
  );

  function addTo(deckId: string, andOpen: boolean) {
    setBusy(deckId);
    const res = insertVariantSlide(deckId, variant.id);
    setBusy(null);
    if (!res) {
      setNote("Couldn't add — deck brief missing.");
      return;
    }
    if (andOpen) {
      onDone();
      navigate({ to: "/decks/$deckId", params: { deckId } });
    } else {
      setNote(`Added to “${decks[deckId]?.title ?? "deck"}”.`);
      window.setTimeout(() => setNote(null), 2200);
    }
  }

  return (
    <div className="rounded-xl border border-[#003FC7]/25 bg-gradient-to-br from-[#003FC7]/5 to-transparent p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">Add to deck</div>
          <div className="mt-1 text-sm text-black/70">
            Append <span className="font-mono text-xs">{variant.id}</span> as a new slide with its default content seed.
          </div>
        </div>
        <Plus size={16} className="text-[#003FC7]" />
      </div>
      {list.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-black/15 bg-white/60 p-3 text-xs text-black/60">
          No decks yet. <Link to="/brief/new" className="font-medium text-[#003FC7] hover:underline">Start a brief</Link> to create one.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {list.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#03002C]">{d.title}</div>
                <div className="text-[10px] uppercase tracking-widest text-black/45">
                  {d.slides.length} slides{d.isTemplate ? " · template" : ""}
                </div>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => addTo(d.id, false)}
                className="rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] text-black/70 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50"
              >
                {busy === d.id ? "…" : "Add"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => addTo(d.id, true)}
                className="rounded-full bg-[#03002C] px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Add & open
              </button>
            </li>
          ))}
        </ul>
      )}
      {note && (
        <div className="mt-2 text-[11px] text-emerald-700">{note}</div>
      )}
    </div>
  );
}



// ────────────────────────────────────────────────────────────────────────────
// Module preset kits — curated slide libraries integrated into the Library.
// ────────────────────────────────────────────────────────────────────────────
function ModulePresetKitsBlock() {
  const createDeckFromTemplate = useDeckStore((s) => s.createDeckFromTemplate);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  function importKit(kit: (typeof MODULE_PRESET_KITS)[number]) {
    const result = validateKit(kit);
    if (!result.valid) {
      alert(formatKitValidationError(kit.title, result));
      return;
    }
    setBusy(kit.key);
    // layoutId fallback is enforced inside createDeckFromTemplate.
    const { deckId } = createDeckFromTemplate(kit.payload);
    navigate({ to: "/decks/$deckId", params: { deckId } });
  }


  return (
    <section className="mt-16">
      <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">Preset kits</div>
          <h2 className="mt-2 text-2xl font-semibold text-[#03002C]">Curated module collections</h2>
          <p className="mt-2 max-w-2xl text-sm text-black/60">
            Full editorial and infographic sets pre-mapped onto the module variants above. Import a whole kit into a new editable deck.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
          {MODULE_PRESET_KITS.length} kits
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {MODULE_PRESET_KITS.map((kit) => {
          const familyCounts = kit.payload.slides.reduce<Record<string, number>>((acc, s) => {
            const mv = byId(MODULE_VARIANTS, s.variantId);
            const fam = mv?.familyId ?? "unknown";
            acc[fam] = (acc[fam] ?? 0) + 1;
            return acc;
          }, {});
          return (
            <div key={kit.key} className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#003FC7]">{kit.tag}</div>
                  <div className="mt-1 text-lg font-semibold text-[#03002C]">{kit.title}</div>
                </div>
                <span className="shrink-0 rounded-full bg-[#003FC7]/10 px-2.5 py-0.5 text-xs font-medium text-[#003FC7]">
                  {kit.payload.slides.length} slides
                </span>
              </div>
              <p className="mt-3 text-sm text-black/60">{kit.blurb}</p>

              <div className="mt-4 border-t border-black/10 pt-3">
                <div className="text-[9px] uppercase tracking-widest text-black/40">Variant mix</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(familyCounts).map(([fam, n]) => (
                    <span key={fam} className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-[10px] text-[#0B2A4A]">
                      {fam} · {n}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => importKit(kit)}
                disabled={busy !== null}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#03002C] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy === kit.key ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {busy === kit.key ? "Importing…" : "Import kit into new deck"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// User-imported decks — any deck flagged as a template or brought in via
// the PPTX import flow surfaces here as a one-click reusable kit.
// ────────────────────────────────────────────────────────────────────────────
function UserImportedKitsBlock() {
  const decks = useDeckStore((s) => s.decks);
  const briefs = useDeckStore((s) => s.briefs);
  const createDeckFromTemplate = useDeckStore((s) => s.createDeckFromTemplate);
  const setDeckTemplateFlag = useDeckStore((s) => s.setDeckTemplateFlag);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const imported = useMemo(() => {
    const list = Object.values(decks).filter((d) => {
      if (d.isTemplate) return true;
      const b = briefs[d.briefId];
      return b?.prospect === "Imported deck";
    });
    return list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }, [decks, briefs]);

  if (imported.length === 0) return null;

  function importAsKit(deck: (typeof imported)[number]) {
    const payload: TemplatePayload = {
      title: `${deck.title} · copy`,
      brandModeId: deck.brandModeId,
      archetypeId: deck.archetypeId,
      subCompany: deck.subCompany ?? null,
      context: deck.context ?? null,
      slides: deck.slides.map((s) => ({
        sectionId: s.sectionId,
        variantId: s.variantId,
        layoutId: s.layoutId,
        content: s.content,
        notes: s.notes ?? null,
      })),
    };
    setBusy(deck.id);
    const { deckId } = createDeckFromTemplate(payload);
    navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">Your imports</div>
          <h2 className="mt-2 text-2xl font-semibold text-[#03002C]">Imported graphs & uploads</h2>
          <p className="mt-2 max-w-2xl text-sm text-black/60">
            Decks you brought in via PPTX import or flagged as a template — reusable as module kits alongside the curated collections above.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
          {imported.length} deck{imported.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {imported.map((deck) => {
          const familyCounts = deck.slides.reduce<Record<string, number>>((acc, s) => {
            const mv = byId(MODULE_VARIANTS, s.variantId);
            const fam = mv?.familyId ?? "unknown";
            acc[fam] = (acc[fam] ?? 0) + 1;
            return acc;
          }, {});
          const graphCount = deck.slides.filter((s) => s.variantId.startsWith("MV-GRAPH")).length;
          return (
            <div key={deck.id} className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#003FC7]">
                    {deck.isTemplate ? "Template" : "Imported"}
                    {graphCount > 0 ? ` · ${graphCount} graph${graphCount === 1 ? "" : "s"}` : ""}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[#03002C]">{deck.title}</div>
                </div>
                <span className="shrink-0 rounded-full bg-[#003FC7]/10 px-2.5 py-0.5 text-xs font-medium text-[#003FC7]">
                  {deck.slides.length} slides
                </span>
              </div>

              <div className="mt-4 border-t border-black/10 pt-3">
                <div className="text-[9px] uppercase tracking-widest text-black/40">Variant mix</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(familyCounts).map(([fam, n]) => (
                    <span key={fam} className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-[10px] text-[#0B2A4A]">
                      {fam} · {n}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => importAsKit(deck)}
                  disabled={busy !== null}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#03002C] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy === deck.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {busy === deck.id ? "Duplicating…" : "Use as kit"}
                </button>
                {!deck.isTemplate && (
                  <button
                    type="button"
                    onClick={() => setDeckTemplateFlag(deck.id, true)}
                    className="rounded-full border border-black/15 bg-white px-4 py-2.5 text-xs uppercase tracking-widest text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
                  >
                    Pin as template
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
