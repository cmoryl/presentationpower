import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";

import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import { seedContent, useDeckStore, type Brief, type TemplatePayload } from "@/lib/deck-store";
import { byId, MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { MODULE_PRESET_KITS, validateKit } from "@/lib/module-preset-kits";
import { formatKitValidationError } from "@/lib/kit-validation";


const SAMPLE_BRIEF: Brief = {
  id: "preview",
  createdAt: new Date().toISOString(),
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

function Library() {
  const { brandModes, moduleFamilies, moduleVariants, layoutFrameworks, sectionFrameworks } = useTaxonomy();
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string>("all");
  const [scopeBrandId, setScopeBrandId] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"light" | "dark" | "ab">("light");
  
  const [showImagery, setShowImagery] = useState(false);
  const autoFixOn = true;
  const tpMasterIdx = Math.max(0, brandModes.findIndex((b) => b.id === "bm-enterprise"));
  const [brandIdx, setBrandIdx] = useState(tpMasterIdx);


  const scopeBrand = scopeBrandId === "all" ? undefined : brandModes.find((b) => b.id === scopeBrandId);
  // Master TransPerfect brand is the default lockup for library previews.
  const tpMaster = brandModes.find((b) => b.id === "bm-enterprise") ?? brandModes[0];
  const restricted = new Set(scopeBrand?.contentScope?.restrictedFamilyIds ?? []);
  const preferred = new Set(scopeBrand?.contentScope?.preferredVariantIds ?? []);


  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matched = moduleVariants.filter((v) => {
      if (family !== "all" && v.familyId !== family) return false;
      if (scopeBrand && restricted.has(v.familyId)) return false;
      if (!needle) return true;
      return (
        v.id.toLowerCase().includes(needle) ||
        v.name.toLowerCase().includes(needle) ||
        v.description.toLowerCase().includes(needle)
      );
    });
    // Rank preferred variants first when a brand scope is chosen.
    if (!scopeBrand) return matched;
    return [...matched].sort((a, b) => {
      const ap = preferred.has(a.id) ? 0 : 1;
      const bp = preferred.has(b.id) ? 0 : 1;
      return ap - bp;
    });
  }, [q, family, moduleVariants, scopeBrand, restricted, preferred]);

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

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search modules…"
          className="w-72 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All families</option>
          {moduleFamilies.map((mf) => (
            <option key={mf.id} value={mf.id}>{mf.id} · {mf.name}</option>
          ))}
        </select>
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
          <span className="text-sm text-black/50">{filtered.length} of {moduleVariants.length}</span>
        </div>
      </div>


      <div className="mt-6 grid grid-cols-2 gap-6 xl:grid-cols-3">
        {filtered.map((v) => (
          <VariantCard
            key={v.id}
            variant={v}
            familyName={byId(moduleFamilies, v.familyId)?.name}
            brand={scopeBrand ?? tpMaster}
            sectionId={sectionFrameworks.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? ""}
            preferred={preferred.has(v.id)}
            mode={mode}
            showImagery={showImagery}
            autoFixOn={autoFixOn}
            onOpen={() => setOpenId(v.id)}
          />
        ))}
      </div>

      

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
          onClose={() => setOpenId(null)}
        />
      )}
    </AppShell>
  );
}

function VariantCard({
  variant,
  familyName,
  brand,
  sectionId,
  preferred,
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
  // Apply / revert the auto-fix on the currently-visible slide refs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const targets = isAB
      ? [lightRef.current, darkRef.current]
      : [singleRef.current];
    const t = window.setTimeout(async () => {
      const { applyAutoFix, revertAutoFix } = await import("@/lib/wcag");
      for (const el of targets) {
        if (!el) continue;
        revertAutoFix(el);
        if (autoFixOn) applyAutoFix(el);
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [autoFixOn, isAB, variant.id, brand.id, showImagery, isDark]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-2px_rgba(0,0,0,0.02)] transition-all duration-500 hover:-translate-y-1 hover:border-[#003FC7]/20 hover:shadow-[0_20px_50px_-12px_rgba(3,0,44,0.15)]"
    >
      {isAB ? (
        <div className="m-2 grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((m) => (
            <div key={m} className="relative">
              <div
                ref={m === "dark" ? darkRef : lightRef}
                className={`relative aspect-[16/10] overflow-hidden rounded-[14px] ${m === "dark" ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}
              >
                <ScaledSlide>
                  <SlideBackdropContext.Provider value={m === "dark" ? darkBackdrop : lightBackdrop}>
                    <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} mode={m} />
                  </SlideBackdropContext.Provider>
                </ScaledSlide>
              </div>
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
      <div
        ref={singleRef}
        className={`relative m-2 aspect-[16/10] overflow-hidden rounded-[18px] ${isDark ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}
      >
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
  onClose: () => void;
}) {
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
          <button
            onClick={onClose}
            className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
          >
            Close ✕
          </button>
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
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
              <div className="aspect-[16/9]">
                <ScaledSlide>
                  <SlideBackdropContext.Provider value={showImagery ? backdropForVariant(variant, brand.id, mode) : null}>
                    <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} mode={mode} />
                    
                  </SlideBackdropContext.Provider>
                </ScaledSlide>
              </div>
            </div>
            <p className="mt-4 text-sm text-black/60">{variant.description}</p>
          </div>

          {/* Specifics */}
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6 text-sm">
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
