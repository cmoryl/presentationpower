import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Star,
  Copy,
  Check,
  Plus,
  Play,
  Eye,
  Package,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { LazyMount } from "@/components/LazyMount";
import { WcagBadge } from "@/components/WcagBadge";
import { TypeBadge } from "@/components/TypeBadge";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import {
  SlideVideoPreviewContext,
  SlideThumbnailContext,
  SlideForceVideoAutoplayContext,
} from "@/lib/slide-media-refresh";
import { backdropForVariant } from "@/components/slide/variantBackdrop";

import { useDeckStore, type TemplatePayload } from "@/lib/deck-store";
import {
  resolveDivisionBrief,
  seedDivisionContent,
  validateDivisionContent,
  COVERAGE_FIX_HINTS,
  OVERLAY_SLOT_LABELS,
  type OverlaySlot,
} from "@/lib/library-preview";
import { byId, MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { MODULE_PRESET_KITS, validateKit } from "@/lib/module-preset-kits";
import { formatKitValidationError } from "@/lib/kit-validation";
import { VIDEO_SLIDE_EXAMPLES, type VideoSlideExample } from "@/lib/video-slide-examples";
import { listClientLogos } from "@/lib/client-logos.functions";
import { toLogoFillers, overlayLogoHubFillers, type LogoFiller } from "@/lib/logohub-fillers";
import { SaveModuleDialog } from "@/components/SaveModuleDialog";
import type { exportDeckToPptx as ExportDeckToPptxFn } from "@/lib/pptx-export";
// Loaded on demand — pptxgenjs is large and only needed when a user exports.
const loadPptxExport = async () => (await import("@/lib/pptx-export")).exportDeckToPptx;

// ─── Pinned variants (per-user, local) ──────────────────────────────────────
const PINS_KEY = "library.pinnedVariants.v1";

// Export resolution is stored as an ABSOLUTE OUTPUT WIDTH in pixels so
// results are consistent regardless of on-screen preview size. The old
// key stored a 1×/2× multiplier of the preview DOM (~500-700px), which
// silently produced sub-HD exports. This key is bumped to v2 to discard
// stale legacy values.
const EXPORT_TARGET_WIDTH_KEY = "library.exportTargetWidth.v2";
export type ExportTargetWidth = 1920 | 3840;
const DEFAULT_TARGET_WIDTH: ExportTargetWidth = 1920;

function useExportPixelRatio(): [ExportTargetWidth, (v: ExportTargetWidth) => void] {
  const [value, setValue] = useState<ExportTargetWidth>(() => {
    if (typeof window === "undefined") return DEFAULT_TARGET_WIDTH;
    const raw = window.localStorage.getItem(EXPORT_TARGET_WIDTH_KEY);
    return raw === "3840" ? 3840 : DEFAULT_TARGET_WIDTH;
  });
  const update = (v: ExportTargetWidth) => {
    setValue(v);
    try {
      window.localStorage.setItem(EXPORT_TARGET_WIDTH_KEY, String(v));
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new CustomEvent("library:pixel-ratio", { detail: v }));
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ExportTargetWidth>).detail;
      if (detail === 1920 || detail === 3840) setValue(detail);
    };
    window.addEventListener("library:pixel-ratio", handler);
    return () => window.removeEventListener("library:pixel-ratio", handler);
  }, []);
  return [value, update];
}

function ResolutionToggle({
  value,
  onChange,
  disabled,
  tone = "light",
}: {
  value: ExportTargetWidth;
  onChange: (v: ExportTargetWidth) => void;
  disabled?: boolean;
  tone?: "light" | "compact";
}) {
  const base =
    tone === "compact"
      ? "inline-flex items-center rounded-full border border-black/15 bg-white p-0.5 text-[10px] font-medium uppercase tracking-widest"
      : "inline-flex items-center rounded-full border border-black/20 bg-white p-0.5 text-[11px] font-medium";
  const pill = (active: boolean) =>
    `rounded-full px-2 py-0.5 transition ${active ? "bg-[#03002C] text-white" : "text-black/60 hover:text-[#003FC7]"}`;
  return (
    <div className={base} role="group" aria-label="Export resolution">
      <button
        type="button"
        onClick={() => onChange(1920)}
        disabled={disabled}
        className={pill(value === 1920)}
        title="HD · 1920×1080 · smaller file, faster export"
      >
        HD
      </button>
      <button
        type="button"
        onClick={() => onChange(3840)}
        disabled={disabled}
        className={pill(value === 3840)}
        title="4K · 3840×2160 · sharpest text and hairlines, larger file"
      >
        4K
      </button>
    </div>
  );
}

function VectorToggle() {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = window.localStorage.getItem("pptx.preferVector.v1");
      if (raw === "true") return true;
      if (raw === "false") return false;
    } catch {
      /* ignore */
    }
    return true;
  });
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") setOn(detail);
    };
    window.addEventListener("pptx:prefer-vector", handler);
    return () => window.removeEventListener("pptx:prefer-vector", handler);
  }, []);
  const set = (v: boolean) => {
    setOn(v);
    import("@/lib/pptx-vector-pref").then((m) => m.setPreferVector(v));
  };
  const pill = (active: boolean) =>
    `rounded-full px-2 py-0.5 transition ${active ? "bg-[#03002C] text-white" : "text-black/60 hover:text-[#003FC7]"}`;
  return (
    <div
      className="inline-flex items-center rounded-full border border-black/15 bg-white p-0.5 text-[10px] font-medium uppercase tracking-widest"
      role="group"
      aria-label="PPTX embed mode"
    >
      <button
        type="button"
        onClick={() => set(true)}
        className={pill(on)}
        title="Vector · SVG passthrough for icons/logos/maps · smaller file, sharp at any zoom (PowerPoint 2019+/M365)"
      >
        Vector
      </button>
      <button
        type="button"
        onClick={() => set(false)}
        className={pill(!on)}
        title="Raster · flatten SVG to PNG · maximum compatibility (older PowerPoint, Google Slides)"
      >
        Raster
      </button>
    </div>
  );
}

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
  } catch {
    /* quota */
  }
}
function usePins() {
  const [pins, setPins] = useState<Set<string>>(() => new Set());
  // Hydrate after mount to avoid SSR mismatch.
  useEffect(() => {
    setPins(readPins());
  }, []);
  const toggle = useCallback((id: string) => {
    setPins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writePins(next);
      return next;
    });
  }, []);
  return { pins, toggle } as const;
}

export const Route = createFileRoute("/library/")({
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
  {
    id: "stat",
    label: "Stats",
    test: (v) => /^MV-(NUMBERS|KPI|DASH|PROOF|COUNTDOWN|ICEBERG)/.test(v.id),
  },
  { id: "chart", label: "Charts", test: (v) => /^MV-(GRAPH|DASH|KPI)/.test(v.id) },
  { id: "bento", label: "Bento", test: (v) => /^MV-BENTO/.test(v.id) },
  { id: "image", label: "Image-led", test: (v) => /^MV-(IMG|EDITORIAL|OP-COVER-MEDIA)/.test(v.id) },
  {
    id: "editorial",
    label: "Editorial",
    test: (v) => /^MV-(EDITORIAL|PULL|QUOTE|SPLIT|DEFINITION|PRINCIPLES)/.test(v.id),
  },
  {
    id: "timeline",
    label: "Timeline & journey",
    test: (v) => /^MV-(TIMELINE|JOURNEY|ROADMAP|HORIZON|PROC|FLYWHEEL|MATURITY|FUNNEL)/.test(v.id),
  },
  {
    id: "comparison",
    label: "Comparison",
    test: (v) => /^MV-(COMPARE|MATRIX|DEC|CLIENT-COMPARE)/.test(v.id),
  },
  { id: "logo", label: "Logo walls", test: (v) => /^MV-LOGO/.test(v.id) },
  { id: "case", label: "Case & proof", test: (v) => /^MV-(CASE|PROOF)/.test(v.id) },
  { id: "cover", label: "Cover & close", test: (v) => /^MV-(OP|CLOSE|REC|CTA)/.test(v.id) },
];

function Library() {
  const { brandModes, moduleFamilies, moduleVariants, layoutFrameworks, sectionFrameworks } =
    useTaxonomy();
  const [q, setQ] = useState("");
  const [familyIds, setFamilyIds] = useState<Set<string>>(new Set());
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [scopeBrandId, setScopeBrandId] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"light" | "dark" | "ab">("light");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sort, setSort] = useState<"default" | "most-used" | "pinned-first">("default");
  // Multi-select mode → build a deck from N chosen variants in one shot.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const clearSelection = useCallback(() => setSelected([]), []);

  const [showImagery, setShowImagery] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "thumb">("comfortable");
  const densityHydrated = useRef(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("library:density");
    if (saved === "thumb" || saved === "comfortable") setDensity(saved);
    densityHydrated.current = true;
  }, []);
  useEffect(() => {
    if (densityHydrated.current) window.localStorage.setItem("library:density", density);
  }, [density]);
  const autoFixOn = true;
  const tpMasterIdx = Math.max(
    0,
    brandModes.findIndex((b) => b.id === "bm-enterprise"),
  );
  const [brandIdx, setBrandIdx] = useState(tpMasterIdx);

  const { pins, toggle: togglePin } = usePins();

  // LogoHub filler pool — used to replace built-in APPROVED_LOGOS fillers on
  // every MV-PROOF-LOGOS-* card so previews reflect the real client roster.
  // Falls back gracefully when the user isn't signed in or LogoHub is empty.
  const listLogosFn = useServerFn(listClientLogos);
  const logoHubQuery = useQuery({
    queryKey: ["logohub", "fillers"],
    queryFn: () => listLogosFn().catch(() => []),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const logoHubPool = useMemo<LogoFiller[]>(
    () => toLogoFillers(logoHubQuery.data),
    [logoHubQuery.data],
  );

  // Usage counts across the local deck store — cheap, client-only.
  const decks = useDeckStore((s) => s.decks);
  const usageByVariant = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of Object.values(decks)) {
      for (const sl of d.slides) m.set(sl.variantId, (m.get(sl.variantId) ?? 0) + 1);
    }
    return m;
  }, [decks]);

  // Validate that every brand mode has division-specific content coverage
  // before we render the grid. Runs once (cached inside the helper).
  const coverage = useMemo(() => validateDivisionContent(), []);
  useEffect(() => {
    if (!coverage.ok && import.meta.env.DEV) {
      console.warn("[library] division content coverage gaps", coverage.failing);
    }
  }, [coverage]);

  const scopeBrand =
    scopeBrandId === "all" ? undefined : brandModes.find((b) => b.id === scopeBrandId);
  const tpMaster = brandModes.find((b) => b.id === "bm-enterprise") ?? brandModes[0];
  const restricted = new Set(scopeBrand?.contentScope?.restrictedFamilyIds ?? []);
  const preferred = new Set(scopeBrand?.contentScope?.preferredVariantIds ?? []);

  // Keep the modal's brand preview in sync with the active scope filter so
  // opening a card while scope=TP Media (etc.) shows that brand's imagery in
  // the A/B previews instead of defaulting back to Enterprise.
  useEffect(() => {
    if (!scopeBrand) return;
    const i = brandModes.findIndex((b) => b.id === scopeBrand.id);
    if (i >= 0) setBrandIdx(i);
  }, [scopeBrand?.id, brandModes]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const activeTags = useMemo(() => STRUCTURAL_TAGS.filter((t) => tagIds.has(t.id)), [tagIds]);

  // Merged entry list — each variant contributes its canonical card, and,
  // when a video example exists for that variant, a second entry that
  // renders the same VariantCard component with the example content plus a
  // pink ▶ Video badge. Both entries share the variant's family / tag /
  // scope, so filters and search apply uniformly.
  type LibraryEntry =
    | { kind: "variant"; variant: ModuleVariant }
    | { kind: "video"; variant: ModuleVariant; example: VideoSlideExample };

  const allEntries = useMemo<LibraryEntry[]>(() => {
    const out: LibraryEntry[] = [];
    for (const v of moduleVariants) {
      out.push({ kind: "variant", variant: v });
      const ex = VIDEO_SLIDE_EXAMPLES.find((e) => e.variantId === v.id);
      if (ex) out.push({ kind: "video", variant: v, example: ex });
    }
    return out;
  }, [moduleVariants]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matched = allEntries.filter((e) => {
      const v = e.variant;
      if (pinnedOnly && !pins.has(v.id)) return false;
      if (familyIds.size > 0 && !familyIds.has(v.familyId)) return false;
      if (scopeBrand && restricted.has(v.familyId)) return false;
      if (activeTags.length > 0 && !activeTags.every((t) => t.test(v))) return false;
      if (!needle) return true;
      const familyName = byId(moduleFamilies, v.familyId)?.name.toLowerCase() ?? "";
      const baseMatch =
        v.id.toLowerCase().includes(needle) ||
        v.name.toLowerCase().includes(needle) ||
        v.description.toLowerCase().includes(needle) ||
        v.familyId.toLowerCase().includes(needle) ||
        familyName.includes(needle);
      if (baseMatch) return true;
      if (e.kind === "video") {
        return (
          e.example.title.toLowerCase().includes(needle) ||
          e.example.blurb.toLowerCase().includes(needle) ||
          "video".includes(needle) ||
          "motion".includes(needle)
        );
      }
      return false;
    });
    const scored = [...matched];
    if (sort === "most-used") {
      scored.sort(
        (a, b) => (usageByVariant.get(b.variant.id) ?? 0) - (usageByVariant.get(a.variant.id) ?? 0),
      );
    } else if (sort === "pinned-first") {
      scored.sort((a, b) => (pins.has(b.variant.id) ? 1 : 0) - (pins.has(a.variant.id) ? 1 : 0));
    } else if (scopeBrand) {
      scored.sort(
        (a, b) => (preferred.has(a.variant.id) ? 0 : 1) - (preferred.has(b.variant.id) ? 0 : 1),
      );
    }
    return scored;
  }, [
    q,
    familyIds,
    activeTags,
    allEntries,
    moduleFamilies,
    scopeBrand,
    restricted,
    preferred,
    pinnedOnly,
    pins,
    sort,
    usageByVariant,
  ]);

  const hasFilters =
    q.trim().length > 0 ||
    familyIds.size > 0 ||
    tagIds.size > 0 ||
    scopeBrandId !== "all" ||
    pinnedOnly ||
    sort !== "default";
  const clearFilters = () => {
    setQ("");
    setFamilyIds(new Set());
    setTagIds(new Set());
    setScopeBrandId("all");
    setPinnedOnly(false);
    setSort("default");
  };

  const active = openId ? moduleVariants.find((v) => v.id === openId) : null;

  // Video example zoom (uses the same LightboxPortal as before, so the
  // ▶ badge inside the enlarged stage still plays the clip in-place).
  // Video card previews in the grid intentionally do NOT provide
  // SlideVideoPreviewContext — they're wrapped in the outer zoom <button>,
  // which forbids a nested <button> from MediaTile's badge.
  const [videoZoomKey, setVideoZoomKey] = useState<string | null>(null);
  const [videoZoomMode, setVideoZoomMode] = useState<"light" | "dark">(
    mode === "dark" ? "dark" : "light",
  );
  const [videoBusy, setVideoBusy] = useState<string | null>(null);

  const createDeckFromTemplate = useDeckStore((s) => s.createDeckFromTemplate);
  const navigate = useNavigate();

  function sectionForVariant(variantId: string): string {
    const v = byId(MODULE_VARIANTS, variantId);
    if (!v) return "SF-01";
    return sectionFrameworks.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? "SF-01";
  }

  function importVideoExample(ex: VideoSlideExample) {
    const variant = byId(MODULE_VARIANTS, ex.variantId);
    if (!variant) return;
    setVideoBusy(ex.key);
    const brand = scopeBrand ?? tpMaster;
    const payload: TemplatePayload = {
      title: `${ex.title} · Video starter`,
      brandModeId: brand.id,
      archetypeId: "arch-product-pitch",
      subCompany: null,
      context: null,
      brief: {
        prospect: "Video Example",
        industry: "Media",
        audience: "Internal review",
        meetingObjective: `Demonstrate the ${variant.name} video layout`,
        lengthTarget: 1,
        clientFacts: ex.blurb,
      },
      slides: [
        {
          sectionId: sectionForVariant(ex.variantId),
          variantId: ex.variantId,
          layoutId: variant.permittedLayoutIds[0] ?? "",
          content: structuredClone(ex.content) as Record<string, unknown>,
        },
      ],
    };
    const { deckId } = createDeckFromTemplate(payload);
    navigate({ to: "/decks/$deckId", params: { deckId } });
  }
  function createDeckFromSelection() {
    const ids = selected;
    if (ids.length === 0) return;
    const brand = scopeBrand ?? tpMaster;
    const brief = resolveDivisionBrief(brand);
    const slides: TemplatePayload["slides"] = [];
    for (const vid of ids) {
      const variant = byId(MODULE_VARIANTS, vid);
      if (!variant) continue;
      const content = seedDivisionContent(vid, brief, "Selected module", brand) as Record<
        string,
        unknown
      >;
      slides.push({
        sectionId: sectionForVariant(vid),
        variantId: vid,
        layoutId: variant.permittedLayoutIds[0] ?? "",
        content: content as unknown as TemplatePayload["slides"][number]["content"],
      });
    }
    if (slides.length === 0) return;
    const payload: TemplatePayload = {
      title: `Custom deck · ${slides.length} module${slides.length === 1 ? "" : "s"}`,
      brandModeId: brand.id,
      archetypeId: "arch-product-pitch",
      subCompany: null,
      context: null,
      brief: {
        prospect: brief.prospect,
        industry: brief.industry,
        audience: brief.audience,
        meetingObjective: `Custom deck built from ${slides.length} library module${slides.length === 1 ? "" : "s"}`,
        lengthTarget: slides.length,
        clientFacts: brief.clientFacts,
      },
      slides,
    };
    const { deckId } = createDeckFromTemplate(payload);
    toast.success(`Deck created from ${slides.length} module${slides.length === 1 ? "" : "s"}`);
    setSelected([]);
    setSelectMode(false);
    navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  return (
    <AppShell>
      <header className="full-bleed relative -mt-6 mb-10 overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#003FC70a] via-white/70 to-[#A1FBF922] py-14 sm:-mt-10 lg:py-20 dark:from-white/[0.03] dark:via-white/[0.02] dark:to-white/[0.04] dark:border-white/10">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
            Library
          </div>
          <div className="mt-3">
            <LibrarySubnav active="/library" />
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Approved module variants.
          </h1>
          <p className="mt-3 max-w-2xl text-black/60 dark:text-white/60">
            Search and preview the modules the assembler pulls from. Scope by brand to hide
            off-limits families and float the preferred variants for that identity. Staging area for
            freshly imported PPTX slides lives under{" "}
            <Link to="/library/imported" className="underline hover:text-[#003FC7]">
              Imported slides
            </Link>
            .
          </p>
        </div>
      </header>

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
            aria-label="Scope Brand"
            value={scopeBrandId}
            onChange={(e) => setScopeBrandId(e.target.value)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            title="Filter to what's in-scope for a brand"
          >
            <option value="all">Any brand scope</option>
            {brandModes.map((b) => (
              <option key={b.id} value={b.id}>
                Scope: {b.name}
              </option>
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
            aria-label="Sort"
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
          <button
            type="button"
            onClick={() => {
              setSelectMode((v) => {
                if (v) setSelected([]);
                return !v;
              });
            }}
            aria-pressed={selectMode}
            title="Pick multiple modules, then build a deck from the selection"
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              selectMode
                ? "border-[#003FC7] bg-[#003FC7] text-white"
                : "border-black/15 bg-white text-black/70 hover:border-black/30 hover:text-black"
            }`}
          >
            {selectMode ? "✓ Selecting" : "☐ Select modules"}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-full border border-black/15 bg-white text-xs">
              <button
                type="button"
                onClick={() => setMode("light")}
                className={`px-3 py-1.5 ${mode === "light" ? "bg-[#05041A] text-white" : "text-black/60 hover:text-black"}`}
                aria-pressed={mode === "light"}
              >
                ☀︎ Light
              </button>
              <button
                type="button"
                onClick={() => setMode("dark")}
                className={`px-3 py-1.5 ${mode === "dark" ? "bg-[#05041A] text-white" : "text-black/60 hover:text-black"}`}
                aria-pressed={mode === "dark"}
              >
                ☾ Dark
              </button>
              <button
                type="button"
                onClick={() => setMode("ab")}
                className={`px-3 py-1.5 ${mode === "ab" ? "bg-[#05041A] text-white" : "text-black/60 hover:text-black"}`}
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
              data-testid="library-imagery-toggle"
              title="Render each module with sample background imagery"
              className={`rounded-full border px-3 py-1.5 text-xs ${
                showImagery
                  ? "border-[#05041A] bg-[#05041A] text-white"
                  : "border-black/15 bg-white text-black/70 hover:text-black"
              }`}
            >
              ▤ Sample imagery {showImagery ? "on" : "off"}
            </button>
            <div
              className="inline-flex overflow-hidden rounded-full border border-black/15 bg-white text-xs"
              role="group"
              aria-label="Card density"
            >
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={`px-3 py-1.5 ${density === "comfortable" ? "bg-[#05041A] text-white" : "text-black/60 hover:text-black"}`}
                aria-pressed={density === "comfortable"}
                title="Comfortable cards with full metadata"
              >
                ▦ Cards
              </button>
              <button
                type="button"
                onClick={() => setDensity("thumb")}
                className={`px-3 py-1.5 ${density === "thumb" ? "bg-[#05041A] text-white" : "text-black/60 hover:text-black"}`}
                aria-pressed={density === "thumb"}
                title="Compact thumbnails — pick modules faster"
              >
                ▨ Thumbs
              </button>
            </div>
            <span className="text-sm tabular-nums text-black/50">
              {filtered.length} of {allEntries.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
            Family
          </span>
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
                    ? "border-[#05041A] bg-[#05041A] text-white shadow-sm"
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
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
            Structure
          </span>
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
      {!coverage.ok && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-amber-300/70 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 text-lg">
              ⚠︎
            </span>
            <div className="flex-1">
              <div className="font-semibold">
                {coverage.failing.length} brand mode
                {coverage.failing.length === 1 ? "" : "s"} missing division-specific content
              </div>
              <ul className="mt-3 space-y-3">
                {coverage.failing.map((r) => (
                  <li
                    key={r.brandId}
                    className="rounded-xl border border-amber-300/60 bg-white/70 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-amber-950">{r.brandName}</span>
                      <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900/80">
                        {r.brandId}
                      </code>
                    </div>
                    {r.notes.length > 0 && (
                      <div className="mt-1 text-[12px] text-amber-900/70">
                        {r.notes.join(" · ")}
                      </div>
                    )}
                    {r.brandId !== "__inventory__" && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(Object.keys(OVERLAY_SLOT_LABELS) as OverlaySlot[]).map((slot) => {
                          const m = r.metrics[slot];
                          const state = m.skipped ? "skipped" : m.ok ? "ok" : "fail";
                          const cls =
                            state === "ok"
                              ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
                              : state === "skipped"
                                ? "border-black/10 bg-white/60 text-black/50"
                                : "border-amber-400/70 bg-amber-100 text-amber-950";
                          const title = m.note
                            ? `${OVERLAY_SLOT_LABELS[slot]} — ${m.note}`
                            : `${OVERLAY_SLOT_LABELS[slot]} ${m.count}/${m.expected}`;
                          return (
                            <span
                              key={slot}
                              title={title}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${cls}`}
                            >
                              <span aria-hidden>
                                {state === "ok" ? "✓" : state === "skipped" ? "–" : "!"}
                              </span>
                              {OVERLAY_SLOT_LABELS[slot]}
                              <span className="opacity-70">
                                {m.count}/{m.expected}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <ul className="mt-2 space-y-1.5">
                      {r.issues.map((code) => {
                        const fix = COVERAGE_FIX_HINTS[code];
                        return (
                          <li key={code} className="text-[12px] leading-snug">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-950">
                                {code}
                              </span>
                              {fix && (
                                <>
                                  <span className="text-amber-900/60">edit</span>
                                  <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-[11px] text-amber-950">
                                    {fix.file}
                                  </code>
                                  <span className="text-amber-900/60">→</span>
                                  <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-[11px] text-amber-950">
                                    {fix.field.replace(/<brandId>/g, r.brandId)}
                                  </code>
                                </>
                              )}
                            </div>
                            {fix && <div className="mt-0.5 pl-1 text-amber-900/75">{fix.hint}</div>}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-amber-900/70">
                Previews still render but may fall back to generic copy for the flagged brands.
              </p>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/15 bg-white/50 px-8 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#03002C]/5 text-2xl">
            ⌕
          </div>
          <h3 className="text-lg font-semibold text-[#03002C]">No modules match those filters.</h3>
          <p className="mt-2 max-w-md text-sm text-black/60">
            Try loosening your search, removing a structural tag, or clearing the brand scope. The
            library holds {moduleVariants.length} approved variants.
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
        <div
          className={
            density === "thumb"
              ? "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              : "mt-6 grid grid-cols-2 gap-6 xl:grid-cols-3"
          }
        >
          {filtered.map((entry) => {
            const v = entry.variant;
            const isVideo = entry.kind === "video";
            return (
              <VariantCard
                key={isVideo ? `video:${entry.example.key}` : v.id}
                variant={v}
                familyName={byId(moduleFamilies, v.familyId)?.name}
                brand={scopeBrand ?? tpMaster}
                sectionId={
                  sectionFrameworks.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? ""
                }
                preferred={preferred.has(v.id)}
                pinned={pins.has(v.id)}
                usageCount={usageByVariant.get(v.id) ?? 0}
                onTogglePin={() => togglePin(v.id)}
                mode={mode}
                showImagery={showImagery}
                autoFixOn={autoFixOn}
                logoHubPool={logoHubPool}
                compact={density === "thumb"}
                onOpen={() => (isVideo ? setVideoZoomKey(entry.example.key) : setOpenId(v.id))}
                videoExample={isVideo ? entry.example : undefined}
                onImportExample={isVideo ? () => importVideoExample(entry.example) : undefined}
                importBusy={isVideo && videoBusy === entry.example.key}
                selectable={selectMode && !isVideo}
                selected={selectedSet.has(v.id)}
                onToggleSelect={() => toggleSelected(v.id)}
              />
            );
          })}
        </div>
      )}

      <div className="mt-10">
        <Link to="/brief/new" className="rounded-full bg-[#03002C] px-5 py-2.5 text-sm text-white">
          Start a brief →
        </Link>
      </div>

      {selectMode && selected.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-[#03002C] px-4 py-2 text-sm text-white shadow-2xl">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
              {selected.length} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-white/70 hover:text-white"
            >
              Clear
            </button>
            <div className="h-4 w-px bg-white/20" />
            <button
              type="button"
              onClick={createDeckFromSelection}
              className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-medium hover:bg-[#0053ff]"
            >
              <Plus size={14} /> Create deck from selection →
            </button>
          </div>
        </div>
      )}

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
          fallback={
            active.fallbackVariantId ? byId(moduleVariants, active.fallbackVariantId) : undefined
          }
          layouts={
            active.permittedLayoutIds
              .map((id) => byId(layoutFrameworks, id))
              .filter(Boolean) as ReturnType<typeof useTaxonomy>["layoutFrameworks"]
          }
          sections={sectionFrameworks.filter((s) => s.permittedFamilyIds.includes(active.familyId))}
          pinned={pins.has(active.id)}
          onTogglePin={() => togglePin(active.id)}
          usageCount={usageByVariant.get(active.id) ?? 0}
          onClose={() => setOpenId(null)}
          logoHubPool={logoHubPool}
        />
      )}

      {(() => {
        if (!videoZoomKey) return null;
        const ex = VIDEO_SLIDE_EXAMPLES.find((e) => e.key === videoZoomKey);
        if (!ex) return null;
        const variant = byId(MODULE_VARIANTS, ex.variantId);
        if (!variant) return null;
        const brand = scopeBrand ?? tpMaster;
        const previewSlide = {
          id: ex.key,
          position: 0,
          sectionId: sectionForVariant(ex.variantId),
          variantId: ex.variantId,
          layoutId: variant.permittedLayoutIds[0] ?? "",
          content: ex.content as Record<string, unknown>,
          changes: [],
        };
        return (
          <LightboxPortal
            mode={videoZoomMode}
            setMode={(m) => {
              if (m === null) setVideoZoomKey(null);
              else setVideoZoomMode(m);
            }}
            variant={variant}
            brand={brand}
            previewSlide={previewSlide}
            lightBackdrop={backdropForVariant(variant, brand.id, "light")}
            darkBackdrop={backdropForVariant(variant, brand.id, "dark")}
          />
        );
      })()}
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
  videoExample,
  onImportExample,
  importBusy = false,
  logoHubPool,
  compact = false,
  selectable = false,
  selected = false,
  onToggleSelect,
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
  /** When set, the card renders as a video demonstration of `variant`:
   *  swap in the example content, show the pink ▶ Video badge, and expose
   *  an "Import as starter deck" quick action. Click-to-zoom uses a video-
   *  aware lightbox in the parent. */
  videoExample?: VideoSlideExample;
  onImportExample?: () => void;
  importBusy?: boolean;
  /** LogoHub filler pool; when non-empty, MV-PROOF-LOGOS-* variants swap
   *  their filler logos for real LogoHub rows. */
  logoHubPool?: LogoFiller[];
  /** Compact thumbnail layout: smaller preview + condensed metadata. */
  compact?: boolean;
  /** When true, clicking the card toggles selection instead of opening the
   *  detail modal — used by the library's multi-select → build deck flow. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const brief = useMemo(() => resolveDivisionBrief(brand), [brand]);
  const rawContent = videoExample
    ? (videoExample.content as Record<string, unknown>)
    : (seedDivisionContent(variant.id, brief, "Preview section", brand) as Record<string, unknown>);
  const previewContent = useMemo(() => {
    if (videoExample) return rawContent;
    if (!logoHubPool || logoHubPool.length === 0) return rawContent;
    if (!/^MV-(PROOF-LOGOS|CASE-LOGO-GRID|LOGO-WALL)/.test(variant.id)) return rawContent;
    return overlayLogoHubFillers(rawContent, variant.id, logoHubPool);
  }, [rawContent, videoExample, logoHubPool, variant.id]);
  const previewSlide = {
    id: videoExample ? `${variant.id}:video:${videoExample.key}` : variant.id,
    position: 0,
    sectionId,
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: previewContent,

    changes: [],
  };
  const isDark = mode === "dark";
  const isAB = mode === "ab";
  // Dark-mode backdrops are always shown — the curated Corporate / TP Media /
  // TP Gaming PNG sets (and aurora fallback) are integral to the dark look, so
  // the "Sample imagery" toggle only gates LIGHT-mode photo washes.
  const lightBackdrop = showImagery ? backdropForVariant(variant, brand.id, "light") : null;
  const darkBackdrop = backdropForVariant(variant, brand.id, "dark");
  const singleBackdrop = isDark
    ? backdropForVariant(variant, brand.id, "dark")
    : showImagery
      ? backdropForVariant(variant, brand.id, "light")
      : null;
  const lightRef = useRef<HTMLDivElement | null>(null);
  const darkRef = useRef<HTMLDivElement | null>(null);
  const singleRef = useRef<HTMLDivElement | null>(null);
  const [mountTick, setMountTick] = useState(0);
  const bumpMount = useCallback(() => setMountTick((n) => n + 1), []);
  // Apply / revert the auto-fix on the currently-visible slide refs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const targets = isAB ? [lightRef.current, darkRef.current] : [singleRef.current];
    if (!targets.some(Boolean)) return;
    const t = window.setTimeout(async () => {
      const { applyAutoFix, revertAutoFix, auditAndFixTypography, revertTypeFix } =
        await import("@/lib/wcag");
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
    <div
      className={`group relative ${selectable && selected ? "rounded-[24px] ring-2 ring-[#003FC7] ring-offset-2 ring-offset-white" : ""}`}
    >
      {selectable && (
        <div
          className="absolute left-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[13px] shadow-md ring-1 ring-black/10 backdrop-blur"
          aria-hidden
          title={selected ? "Selected — click card to deselect" : "Click card to select"}
        >
          {selected ? (
            <Check size={16} className="text-[#003FC7]" />
          ) : (
            <span className="h-4 w-4 rounded-sm border border-black/30" />
          )}
        </div>
      )}
      <button
        type="button"
        onClick={selectable ? onToggleSelect : onOpen}
        data-variant-card=""
        data-variant-id={variant.id}
        data-variant-family={variant.familyId}
        data-variant-layout={variant.permittedLayoutIds[0] ?? ""}
        data-variant-mode={mode}
        data-variant-pinned={pinned ? "1" : "0"}
        data-variant-selected={selected ? "1" : "0"}
        data-variant-usage={usageCount}
        className={`block w-full overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-2px_rgba(0,0,0,0.02)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgba(3,0,44,0.15)] ${selectable && selected ? "border-[#003FC7]" : "border-slate-200 hover:border-[#003FC7]/20"}`}
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
                    data-preview-mode={m}
                    data-preview-role="module-preview"
                  >
                    <ScaledSlide>
                      <SlideBackdropContext.Provider
                        value={m === "dark" ? darkBackdrop : lightBackdrop}
                      >
                        <SlideThumbnailContext.Provider value={true}>
                          <SlideForceVideoAutoplayContext.Provider value={Boolean(videoExample)}>
                            <VariantRenderer
                              slide={previewSlide}
                              variant={variant}
                              brand={brand}
                              pageNumber={1}
                              mode={m}
                            />
                          </SlideForceVideoAutoplayContext.Provider>
                        </SlideThumbnailContext.Provider>
                      </SlideBackdropContext.Provider>
                    </ScaledSlide>
                  </div>
                </LazyMount>
                <WcagBadge
                  variantId={variant.id}
                  mode={m}
                  targetRef={m === "dark" ? darkRef : lightRef}
                  enabled={isAB}
                  compact
                />
                <TypeBadge targetRef={m === "dark" ? darkRef : lightRef} compact />
                <div
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest backdrop-blur ${m === "dark" ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-black/70 text-white"}`}
                >
                  {m === "dark" ? "☾ B · Dark" : "☀︎ A · Light"}
                </div>
              </div>
            ))}
            {preferred && !videoExample && (
              <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-emerald-500/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white shadow ring-1 ring-white/30 backdrop-blur-md">
                In scope
              </div>
            )}
            {videoExample && (
              <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#EC388A]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow ring-1 ring-white/25 backdrop-blur">
                <Play size={12} className="fill-white" /> Video
              </div>
            )}
          </div>
        ) : (
          <LazyMount
            className={`relative m-2 aspect-[16/10] overflow-hidden rounded-[18px] ${isDark ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}
            placeholder={<PreviewSkeleton dark={isDark} label={variant.familyId} />}
            onMount={bumpMount}
          >
            <div
              ref={singleRef}
              className="absolute inset-0"
              data-preview-mode={isDark ? "dark" : "light"}
              data-preview-role="module-preview"
            >
              <ScaledSlide>
                <SlideBackdropContext.Provider value={singleBackdrop}>
                  <SlideThumbnailContext.Provider value={true}>
                    <SlideForceVideoAutoplayContext.Provider value={Boolean(videoExample)}>
                      <VariantRenderer
                        slide={previewSlide}
                        variant={variant}
                        brand={brand}
                        pageNumber={1}
                        mode={isDark ? "dark" : "light"}
                      />
                    </SlideForceVideoAutoplayContext.Provider>
                  </SlideThumbnailContext.Provider>
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
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </span>
              </div>

              {preferred && !videoExample && (
                <div className="absolute left-3 top-3 rounded-full bg-emerald-500/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white shadow ring-1 ring-white/30 backdrop-blur-md">
                  In scope
                </div>
              )}
              {videoExample && (
                <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#EC388A]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow ring-1 ring-white/25 backdrop-blur">
                  <Play size={12} className="fill-white" /> Video
                </div>
              )}
            </div>
          </LazyMount>
        )}

        {/* Metadata footer */}
        {compact ? (
          <div className="space-y-1 px-3 pb-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <h3
                className="truncate text-sm font-semibold tracking-tight text-[#03002C]"
                title={videoExample ? videoExample.title : variant.name}
              >
                {videoExample ? videoExample.title : variant.name}
              </h3>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                {variant.familyId}
              </span>
            </div>
            <div
              className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-[#003FC7]/80"
              title={variant.id}
            >
              {variant.id}
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#003FC7]">
                  {videoExample ? `${variant.id} · Video demo` : variant.id}
                </div>
                <h3 className="truncate text-lg font-semibold tracking-tight text-[#03002C]">
                  {videoExample ? videoExample.title : variant.name}
                </h3>
              </div>
              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {variant.familyId}
              </span>
            </div>

            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
              {videoExample ? videoExample.blurb : variant.description}
            </p>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">
                    Family
                  </span>
                  <span className="truncate text-xs font-medium text-[#03002C]">
                    {familyName ?? "—"}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-100" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">
                    {videoExample ? "Variant" : "Layouts"}
                  </span>
                  <span className="text-xs font-medium text-[#03002C]">
                    {videoExample
                      ? variant.name
                      : `${variant.permittedLayoutIds.length} ${variant.permittedLayoutIds.length === 1 ? "variant" : "variants"}`}
                  </span>
                </div>
                {!videoExample && variant.capacity.items && (
                  <>
                    <div className="h-6 w-px bg-slate-100" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-400">
                        Items
                      </span>
                      <span className="text-xs font-medium text-[#03002C]">
                        {variant.capacity.items.min}–{variant.capacity.items.max}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#003FC7]">
                <span>{videoExample ? "Zoom" : "Details"}</span>
                <svg
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </button>
      {videoExample && onImportExample && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImportExample();
          }}
          disabled={importBusy}
          className="absolute inset-x-6 bottom-6 z-10 inline-flex items-center justify-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-[#003FC7] disabled:opacity-60"
        >
          {importBusy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          {importBusy ? "Importing…" : "Import as starter deck"}
        </button>
      )}
      {onTogglePin && !videoExample && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
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
      {usageCount > 0 && !videoExample && (
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
          style={{
            color: dark ? "rgba(255,255,255,0.55)" : "rgba(3,0,44,0.45)",
            background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
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
  logoHubPool,
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
  logoHubPool?: LogoFiller[];
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const copyId = async () => {
    try {
      if (navigator?.clipboard) await navigator.clipboard.writeText(variant.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };
  const [pdfBusy, setPdfBusy] = useState<null | "light" | "dark">(null);
  const [pdfStage, setPdfStage] = useState<string | null>(null);
  const [bothBusy, setBothBusy] = useState(false);
  const [pixelRatio, setPixelRatio] = useExportPixelRatio();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewStage, setPreviewStage] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<{
    light: string;
    dark: string;
    filenameLight: string;
    filenameDark: string;
    ratio: ExportTargetWidth;
  } | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipStage, setZipStage] = useState<string | null>(null);
  type ZipItemKey = "pptxLight" | "pptxDark" | "pdfLight" | "pdfDark" | "pngLight" | "pngDark";
  const ZIP_STORAGE_KEY = "library:zip-selection";
  const [zipSelection, setZipSelection] = useState<Record<ZipItemKey, boolean>>(() => {
    if (typeof window === "undefined")
      return {
        pptxLight: true,
        pptxDark: true,
        pdfLight: true,
        pdfDark: true,
        pngLight: true,
        pngDark: true,
      };
    try {
      const raw = window.localStorage.getItem(ZIP_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      pptxLight: true,
      pptxDark: true,
      pdfLight: true,
      pdfDark: true,
      pngLight: true,
      pngDark: true,
    };
  });
  useEffect(() => {
    if (typeof window !== "undefined")
      window.localStorage.setItem(ZIP_STORAGE_KEY, JSON.stringify(zipSelection));
  }, [zipSelection]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const zipSelectedCount = Object.values(zipSelection).filter(Boolean).length;

  useEffect(() => {
    return () => {
      if (previewUrls) {
        URL.revokeObjectURL(previewUrls.light);
        URL.revokeObjectURL(previewUrls.dark);
      }
    };
  }, [previewUrls]);

  const openPdfPreview = async () => {
    if (previewBusy || pdfBusy || bothBusy) return;
    setPreviewBusy(true);
    setPreviewStage(null);
    try {
      const findNode = (m: "light" | "dark") =>
        document.querySelector<HTMLElement>(
          `[data-modal-preview="${m}"][data-variant-id="${variant.id}"]`,
        );
      const lightNode = findNode("light");
      const darkNode = findNode("dark");
      if (!lightNode || !darkNode) throw new Error("Preview nodes not found");
      const mod = await import("@/lib/slide-image-export");
      const resLabel = pixelRatio === 3840 ? "4k" : "hd";
      const filenameLight = `${variant.id}-${brand.id}-light-${resLabel}-review.pdf`;
      const filenameDark = `${variant.id}-${brand.id}-dark-${resLabel}-review.pdf`;
      setPreviewStage("Rendering light…");
      const lightBlob = await mod.exportSlidesAsImagePdf([{ node: lightNode, mode: "light" }], {
        filename: filenameLight,
        targetWidth: pixelRatio,
        returnBlob: true,
        onProgress: (p) => setPreviewStage(`Light · ${p.message ?? p.stage}`),
      });
      setPreviewStage("Rendering dark…");
      const darkBlob = await mod.exportSlidesAsImagePdf([{ node: darkNode, mode: "dark" }], {
        filename: filenameDark,
        targetWidth: pixelRatio,
        returnBlob: true,
        onProgress: (p) => setPreviewStage(`Dark · ${p.message ?? p.stage}`),
      });

      if (!lightBlob || !darkBlob) throw new Error("Failed to build preview PDFs");
      setPreviewUrls({
        light: URL.createObjectURL(lightBlob),
        dark: URL.createObjectURL(darkBlob),
        filenameLight,
        filenameDark,
        ratio: pixelRatio,
      });
    } catch (err) {
      console.error("[library] PDF preview failed", err);
      toast.error("PDF preview failed", { description: "Check console for details." });
    } finally {
      setPreviewBusy(false);
      setPreviewStage(null);
    }
  };

  const closePdfPreview = () => {
    if (previewUrls) {
      URL.revokeObjectURL(previewUrls.light);
      URL.revokeObjectURL(previewUrls.dark);
    }
    setPreviewUrls(null);
  };

  const downloadPreviewBlob = (which: "light" | "dark") => {
    if (!previewUrls) return;
    const url = which === "light" ? previewUrls.light : previewUrls.dark;
    const filename = which === "light" ? previewUrls.filenameLight : previewUrls.filenameDark;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(
      `${which === "light" ? "Light" : "Dark"} PDF downloaded at ${previewUrls.ratio === 3840 ? "4K" : "HD"} (${previewUrls.ratio}×${Math.round((previewUrls.ratio * 9) / 16)})`,
      { description: filename },
    );
  };

  const downloadPptx = async (exportMode: "light" | "dark") => {
    if (downloading) return;
    setDownloading(true);
    try {
      const singleSlideDeck = {
        id: `library-${variant.id}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        title: `${variant.name} — ${brand.name} (${exportMode})`,
        briefId: "library-preview",
        brandModeId: brand.id,
        archetypeId: "single-module",
        slides: [
          {
            id: `slide-${variant.id}`,
            position: 0,
            sectionId: sections[0]?.id ?? "",
            variantId: variant.id,
            layoutId: variant.permittedLayoutIds[0],
            content: detailContent,
            changes: [],
          },
        ],
      } as Parameters<typeof ExportDeckToPptxFn>[0];
      console.info(
        `[library] downloading module ${variant.id} · division=${brand.id} · mode=${exportMode}`,
      );
      const { fileName } = await (
        await loadPptxExport()
      )(singleSlideDeck, brand, {
        forceMode: exportMode,
      });
      toast.success("Module PPTX exported", {
        description: `${fileName ?? `${variant.name} — ${brand.name} (${exportMode}).pptx`} (${exportMode})`,
      });
    } catch (err) {
      console.error("[library] module download failed", err);
      toast.error("PPTX export failed", { description: "Check console for details." });
    } finally {
      setDownloading(false);
    }
  };
  const downloadImagePdf = async (exportMode: "light" | "dark") => {
    if (pdfBusy) return;
    setPdfBusy(exportMode);
    setPdfStage(null);
    const resLabel = pixelRatio === 3840 ? "4k" : "hd";
    const filename = `${variant.id}-${brand.id}-${exportMode}-${resLabel}-review.pdf`;
    const toastId = `export-pdf-${variant.id}-${exportMode}`;
    const modeLabel = exportMode === "light" ? "Light" : "Dark";
    toast.loading(`Preparing ${modeLabel} PDF · ${resLabel.toUpperCase()}`, {
      id: toastId,
      description: `${filename} — starting…`,
      duration: Infinity,
    });
    try {
      const node = document.querySelector<HTMLElement>(
        `[data-modal-preview="${exportMode}"][data-variant-id="${variant.id}"]`,
      );
      if (!node) throw new Error(`Preview node not found for ${exportMode} mode`);
      const mod = await import("@/lib/slide-image-export");
      await mod.exportSlidesAsImagePdf([{ node, mode: exportMode }], {
        filename,
        targetWidth: pixelRatio,
        onProgress: (p) => {
          const msg = p.message ?? p.stage;
          setPdfStage(msg);
          toast.loading(`Exporting ${modeLabel} PDF · ${resLabel.toUpperCase()}`, {
            id: toastId,
            description: `${filename} — ${msg}`,
            duration: Infinity,
          });
        },
      });
      toast.success(
        `${modeLabel} PDF downloaded · ${resLabel.toUpperCase()} (${pixelRatio}×${Math.round((pixelRatio * 9) / 16)})`,
        {
          id: toastId,
          description: filename,
          duration: 5000,
        },
      );
    } catch (err) {
      console.error("[library] image PDF export failed", err);
      toast.error("PDF export failed", {
        id: toastId,
        description: "Check console for details.",
        duration: 6000,
      });
    } finally {
      setPdfBusy(null);
      setPdfStage(null);
    }
  };
  const downloadBothPdfs = async () => {
    if (pdfBusy || bothBusy) return;
    setBothBusy(true);
    setPdfStage(null);
    const resLabel = pixelRatio === 3840 ? "4k" : "hd";
    const filename = `${variant.id}-${brand.id}-both-${resLabel}-review.pdf`;
    const toastId = `export-pdf-both-${variant.id}`;
    toast.loading(`Preparing combined PDF · ${resLabel.toUpperCase()}`, {
      id: toastId,
      description: `${filename} — starting…`,
      duration: Infinity,
    });
    try {
      const findNode = (m: "light" | "dark") =>
        document.querySelector<HTMLElement>(
          `[data-modal-preview="${m}"][data-variant-id="${variant.id}"]`,
        );
      const lightNode = findNode("light");
      const darkNode = findNode("dark");
      if (!lightNode || !darkNode) throw new Error("Preview nodes not found for both modes");
      const mod = await import("@/lib/slide-image-export");
      await mod.exportSlidesAsImagePdf(
        [
          { node: lightNode, mode: "light" },
          { node: darkNode, mode: "dark" },
        ],
        {
          filename,
          targetWidth: pixelRatio,
          onProgress: (p) => {
            const msg = p.message ?? p.stage;
            setPdfStage(msg);
            toast.loading(`Exporting combined PDF · ${resLabel.toUpperCase()}`, {
              id: toastId,
              description: `${filename} — ${msg}`,
              duration: Infinity,
            });
          },
        },
      );
      toast.success(
        `Combined PDF downloaded · ${resLabel.toUpperCase()} (${pixelRatio}×${Math.round((pixelRatio * 9) / 16)})`,
        {
          id: toastId,
          description: filename,
          duration: 5000,
        },
      );
    } catch (err) {
      console.error("[library] both-theme PDF export failed", err);
      toast.error("Combined PDF export failed", {
        id: toastId,
        description: "Check console for details.",
        duration: 6000,
      });
    } finally {
      setBothBusy(false);
      setPdfStage(null);
    }
  };

  const downloadModuleZip = async () => {
    if (zipBusy || pdfBusy || bothBusy || previewBusy || downloading) return;
    if (zipSelectedCount === 0) {
      toast.error("Select at least one export to include in the ZIP");
      return;
    }
    setZipBusy(true);
    const zipToastId = `export-zip-${variant.id}`;
    const updateStage = (msg: string) => {
      setZipStage(msg);
      toast.loading("Building module bundle", {
        id: zipToastId,
        description: msg,
        duration: Infinity,
      });
    };
    updateStage("Starting…");
    try {
      const findNode = (m: "light" | "dark") =>
        document.querySelector<HTMLElement>(
          `[data-modal-preview="${m}"][data-variant-id="${variant.id}"]`,
        );
      const needsLightNode = zipSelection.pdfLight || zipSelection.pngLight;
      const needsDarkNode = zipSelection.pdfDark || zipSelection.pngDark;
      const lightNode = needsLightNode ? findNode("light") : null;
      const darkNode = needsDarkNode ? findNode("dark") : null;
      if (needsLightNode && !lightNode) throw new Error("Light preview node not found");
      if (needsDarkNode && !darkNode) throw new Error("Dark preview node not found");

      const buildDeck = (exportMode: "light" | "dark") =>
        ({
          id: `library-${variant.id}-${Date.now()}-${exportMode}`,
          createdAt: new Date().toISOString(),
          title: `${variant.name} — ${brand.name} (${exportMode})`,
          briefId: "library-preview",
          brandModeId: brand.id,
          archetypeId: "single-module",
          slides: [
            {
              id: `slide-${variant.id}`,
              position: 0,
              sectionId: sections[0]?.id ?? "",
              variantId: variant.id,
              layoutId: variant.permittedLayoutIds[0],
              content: detailContent,
              changes: [],
            },
          ],
        }) as Parameters<typeof ExportDeckToPptxFn>[0];

      let lightPptx: Awaited<ReturnType<typeof ExportDeckToPptxFn>> | null = null;
      let darkPptx: Awaited<ReturnType<typeof ExportDeckToPptxFn>> | null = null;
      if (zipSelection.pptxLight) {
        updateStage("Building light PPTX…");
        lightPptx = await (
          await loadPptxExport()
        )(buildDeck("light"), brand, {
          forceMode: "light",
          output: "blob",
        });
      }
      if (zipSelection.pptxDark) {
        updateStage("Building dark PPTX…");
        darkPptx = await (
          await loadPptxExport()
        )(buildDeck("dark"), brand, {
          forceMode: "dark",
          output: "blob",
        });
      }

      const imgMod = await import("@/lib/slide-image-export");
      let lightPdf: Blob | null = null;
      let darkPdf: Blob | null = null;
      let lightPng: string | null = null;
      let darkPng: string | null = null;
      if (zipSelection.pdfLight && lightNode) {
        updateStage("Rendering light PDF…");
        lightPdf = (await imgMod.exportSlidesAsImagePdf([{ node: lightNode, mode: "light" }], {
          filename: "light.pdf",
          targetWidth: pixelRatio,
          returnBlob: true,
          onProgress: (p) => updateStage(`Light PDF · ${p.message ?? p.stage}`),
        })) as Blob;
      }
      if (zipSelection.pdfDark && darkNode) {
        updateStage("Rendering dark PDF…");
        darkPdf = (await imgMod.exportSlidesAsImagePdf([{ node: darkNode, mode: "dark" }], {
          filename: "dark.pdf",
          targetWidth: pixelRatio,
          returnBlob: true,
          onProgress: (p) => updateStage(`Dark PDF · ${p.message ?? p.stage}`),
        })) as Blob;
      }
      if (zipSelection.pngLight && lightNode) {
        updateStage("Rendering light PNG…");
        lightPng = await imgMod.captureSlide(lightNode, { targetWidth: pixelRatio });
      }
      if (zipSelection.pngDark && darkNode) {
        updateStage("Rendering dark PNG…");
        darkPng = await imgMod.captureSlide(darkNode, { targetWidth: pixelRatio });
      }

      const dataUrlToBlob = async (u: string) => (await fetch(u)).blob();

      updateStage("Zipping…");
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const base = `${variant.id}-${brand.id}`;
      const resLabel = pixelRatio === 3840 ? "4k" : "hd";
      const resDisplay = pixelRatio === 3840 ? "4K" : "HD";
      const included: string[] = [];
      if (lightPptx?.blob) {
        zip.file(`pptx/${lightPptx.fileName ?? `${base}-light.pptx`}`, lightPptx.blob);
        included.push("pptx/light");
      }
      if (darkPptx?.blob) {
        zip.file(`pptx/${darkPptx.fileName ?? `${base}-dark.pptx`}`, darkPptx.blob);
        included.push("pptx/dark");
      }
      if (lightPdf) {
        zip.file(`pdf/${base}-light-${resLabel}.pdf`, lightPdf);
        included.push("pdf/light");
      }
      if (darkPdf) {
        zip.file(`pdf/${base}-dark-${resLabel}.pdf`, darkPdf);
        included.push("pdf/dark");
      }
      if (lightPng) {
        zip.file(`png/${base}-light-${resLabel}.png`, await dataUrlToBlob(lightPng));
        included.push("png/light");
      }
      if (darkPng) {
        zip.file(`png/${base}-dark-${resLabel}.png`, await dataUrlToBlob(darkPng));
        included.push("png/dark");
      }
      zip.file(
        "README.txt",
        `${variant.name} — ${brand.name}\nModule: ${variant.id}\nDivision: ${brand.id}\nResolution: ${resDisplay} (${pixelRatio}×${Math.round((pixelRatio * 9) / 16)})\nExported: ${new Date().toISOString()}\n\nIncluded:\n  ${included.join("\n  ")}\n`,
      );

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const filename = `${base}-bundle-${resLabel}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Module ZIP downloaded", {
        id: zipToastId,
        description: `${filename} · ${included.length} file${included.length === 1 ? "" : "s"} at ${resDisplay}`,
        duration: 5000,
      });
    } catch (err) {
      console.error("[library] module ZIP export failed", err);
      toast.error("ZIP export failed", {
        id: zipToastId,
        description: "Check console for details.",
        duration: 6000,
      });
    } finally {
      setZipBusy(false);
      setZipStage(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const brief = useMemo(() => resolveDivisionBrief(brand), [brand]);
  const detailContent = useMemo(() => {
    const raw = seedDivisionContent(
      variant.id,
      brief,
      sections[0]?.name ?? "Preview section",
      brand,
    ) as Record<string, unknown>;
    if (!logoHubPool || logoHubPool.length === 0) return raw;
    if (!/^MV-(PROOF-LOGOS|CASE-LOGO-GRID|LOGO-WALL)/.test(variant.id)) return raw;
    return overlayLogoHubFillers(raw, variant.id, logoHubPool);
  }, [variant.id, brief, sections, brand, logoHubPool]);
  const previewSlide = {
    id: variant.id,
    position: 0,
    sectionId: sections[0]?.id ?? "",
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: detailContent,
    changes: [],
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#03002C]/70 p-6 backdrop-blur-md"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass glass-sheen my-6 w-full max-w-6xl overflow-hidden rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-black/10 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-xs text-black/50">
                <span>{variant.id}</span>
                <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 text-[10px] text-[#0B2A4A]">
                  {variant.familyId}
                </span>
                {family && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      family.reviewLevel === "strict"
                        ? "bg-red-100 text-red-800"
                        : family.reviewLevel === "standard"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
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
                {copied ? (
                  <Check size={12} className="text-accent-foreground" />
                ) : (
                  <Copy size={12} />
                )}
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
              {pinned ? (
                <Link
                  to="/admin/campaigns/kit"
                  search={{ source: variant.id }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/30 bg-[#003FC7]/5 px-3 py-1.5 text-xs font-medium text-[#003FC7] transition hover:bg-[#003FC7] hover:text-white"
                  title="Generate a social kit from this favorited module"
                >
                  <Sparkles size={12} /> Create social kit
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => setSaveOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/30 bg-[#003FC7]/5 px-3 py-1.5 text-xs font-medium text-[#003FC7] transition hover:bg-[#003FC7] hover:text-white"
                title="Save this variant + content as a reusable module"
              >
                <Star size={12} /> Save
              </button>

              {/* Unified Export menu — collapses PPTX / PDF / PNG / ZIP into one control */}
              <div className="relative inline-flex items-stretch rounded-full border border-[#03002C] bg-[#03002C] text-xs font-medium text-white shadow-sm">
                <button
                  type="button"
                  onClick={downloadModuleZip}
                  disabled={
                    zipBusy ||
                    previewBusy ||
                    pdfBusy !== null ||
                    bothBusy ||
                    downloading ||
                    zipSelectedCount === 0
                  }
                  className="inline-flex items-center gap-1.5 rounded-l-full px-3.5 py-1.5 transition hover:bg-[#003FC7] disabled:opacity-60"
                  title={
                    zipSelectedCount === 0
                      ? "Open the menu and pick at least one file to bundle"
                      : `Download a ZIP with ${zipSelectedCount} file${zipSelectedCount === 1 ? "" : "s"}`
                  }
                >
                  {zipBusy ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                  {zipBusy ? (zipStage ?? "Bundling…") : `Export ZIP · ${zipSelectedCount}`}
                </button>
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  aria-label="Open export options"
                  className="inline-flex items-center border-l border-white/25 rounded-r-full px-2 transition hover:bg-[#003FC7]"
                >
                  <svg
                    className={`h-3 w-3 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 9l6 6 6-6"
                    />
                  </svg>
                </button>

                {exportMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close export menu"
                      className="fixed inset-0 z-40 cursor-default bg-transparent"
                      onClick={() => setExportMenuOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-[22rem] rounded-2xl border border-black/10 bg-white p-4 text-[#03002C] shadow-2xl ring-1 ring-black/5"
                    >
                      {/* Resolution row */}
                      <div className="flex items-center justify-between pb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">
                          Resolution
                        </span>
                        <ResolutionToggle
                          value={pixelRatio}
                          onChange={setPixelRatio}
                          disabled={pdfBusy !== null || bothBusy || zipBusy}
                        />
                      </div>
                      {/* Vector-first PPTX row */}
                      <div className="flex items-center justify-between border-t border-black/5 pt-3 pb-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">
                            PPTX embeds
                          </span>
                          <span className="text-[10px] text-black/45">
                            Vector = crisp + smaller · Raster = max compat
                          </span>
                        </div>
                        <VectorToggle />
                      </div>

                      {/* Quick single-shot exports */}
                      <div className="space-y-3 border-t border-black/5 pt-3">
                        <div>
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-black/50">
                            Editable · PPTX
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => downloadPptx("light")}
                              disabled={downloading}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs font-medium hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-60"
                            >
                              {downloading ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Download size={12} />
                              )}{" "}
                              Light
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadPptx("dark")}
                              disabled={downloading}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#03002C] bg-[#03002C] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7] disabled:opacity-60"
                            >
                              {downloading ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Download size={12} />
                              )}{" "}
                              Dark
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-black/50">
                            Pixel-perfect · PDF
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => downloadImagePdf("light")}
                              disabled={pdfBusy !== null}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs font-medium hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-60"
                            >
                              {pdfBusy === "light" ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : null}
                              {pdfBusy === "light" && pdfStage ? pdfStage : "Light"}
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadImagePdf("dark")}
                              disabled={pdfBusy !== null}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#03002C] bg-[#03002C] px-2 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7] disabled:opacity-60"
                            >
                              {pdfBusy === "dark" ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : null}
                              {pdfBusy === "dark" && pdfStage ? pdfStage : "Dark"}
                            </button>
                            <button
                              type="button"
                              onClick={downloadBothPdfs}
                              disabled={pdfBusy !== null || bothBusy}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#003FC7] bg-[#003FC7]/5 px-2 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#003FC7] hover:text-white disabled:opacity-60"
                            >
                              {bothBusy ? <Loader2 size={12} className="animate-spin" /> : null}
                              {bothBusy ? "…" : "Both"}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={openPdfPreview}
                          disabled={previewBusy || pdfBusy !== null || bothBusy}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#003FC7]/30 bg-[#003FC7]/5 px-3 py-1.5 text-xs font-medium text-[#003FC7] transition hover:bg-[#003FC7] hover:text-white disabled:opacity-60"
                        >
                          {previewBusy ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Eye size={12} />
                          )}
                          {previewBusy
                            ? (previewStage ?? "Rendering…")
                            : "Preview Light & Dark PDFs"}
                        </button>
                      </div>

                      {/* ZIP bundle selection */}
                      <div className="mt-4 border-t border-black/5 pt-3">
                        <div className="flex items-center justify-between pb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">
                            ZIP bundle
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setZipSelection({
                                  pptxLight: true,
                                  pptxDark: true,
                                  pdfLight: true,
                                  pdfDark: true,
                                  pngLight: true,
                                  pngDark: true,
                                })
                              }
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-[#003FC7] hover:bg-[#003FC7]/10"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setZipSelection({
                                  pptxLight: false,
                                  pptxDark: false,
                                  pdfLight: false,
                                  pdfDark: false,
                                  pngLight: false,
                                  pngDark: false,
                                })
                              }
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-black/60 hover:bg-black/5"
                            >
                              None
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3">
                          {(
                            [
                              { key: "pptxLight", label: "PPTX · Light" },
                              { key: "pptxDark", label: "PPTX · Dark" },
                              { key: "pdfLight", label: "PDF · Light" },
                              { key: "pdfDark", label: "PDF · Dark" },
                              { key: "pngLight", label: "PNG · Light" },
                              { key: "pngDark", label: "PNG · Dark" },
                            ] as { key: ZipItemKey; label: string }[]
                          ).map((item) => (
                            <label
                              key={item.key}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs font-medium hover:bg-black/5"
                            >
                              <input
                                type="checkbox"
                                checked={zipSelection[item.key]}
                                onChange={(e) =>
                                  setZipSelection((s) => ({ ...s, [item.key]: e.target.checked }))
                                }
                                className="h-3.5 w-3.5 accent-[#003FC7]"
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                        <p className="mt-2 border-t border-black/5 pt-2 text-[10px] text-black/50">
                          Saved for next time · rendered at {pixelRatio === 3840 ? "4K" : "HD"} ·{" "}
                          {zipSelectedCount} file{zipSelectedCount === 1 ? "" : "s"} selected
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {usageCount > 0 && (
                <span
                  className="rounded-full bg-[#03002C]/90 px-2.5 py-1 text-[11px] font-medium text-white"
                  title={`Used in ${usageCount} of your slides`}
                >
                  Used · {usageCount}
                </span>
              )}
              <button
                onClick={onClose}
                className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
                aria-label="Close"
              >
                ✕
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
                      className={`px-2.5 py-1 ${mode === "light" ? "bg-[#05041A] text-white" : "text-black/60"}`}
                    >
                      ☀︎
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("dark")}
                      className={`px-2.5 py-1 ${mode === "dark" ? "bg-[#05041A] text-white" : "text-black/60"}`}
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
                        ? "border-[#05041A] bg-[#05041A] text-white"
                        : "border-black/15 bg-white text-black/60"
                    }`}
                    title="Toggle background imagery"
                  >
                    ▤ Imagery
                  </button>
                  <select
                    aria-label="Brand Idx"
                    value={brandIdx}
                    onChange={(e) => setBrandIdx(Number(e.target.value))}
                    className="rounded-lg border border-black/15 bg-white px-2 py-1 text-xs"
                  >
                    {brands.map((b, i) => (
                      <option key={b.id} value={i}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ModalABPreview
                variant={variant}
                brand={brand}
                previewSlide={previewSlide}
                showImagery={showImagery}
              />

              <p className="mt-4 text-sm text-black/60">{variant.description}</p>
            </div>

            {/* Specifics */}
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6 text-sm">
              <AddToDeckPanel variant={variant} onDone={onClose} />

              <Spec label="Module family">
                <div className="font-mono text-xs text-black/50">{variant.familyId}</div>
                <div>{family?.name ?? "—"}</div>
                {family?.description && (
                  <div className="mt-1 text-black/60">{family.description}</div>
                )}
              </Spec>

              <Spec label="Capacity">
                {variant.capacity.items && (
                  <Row
                    k="Items"
                    v={`${variant.capacity.items.min}–${variant.capacity.items.max}`}
                  />
                )}
                {variant.capacity.titleChars != null && (
                  <Row k="Title max chars" v={String(variant.capacity.titleChars)} />
                )}
                {variant.capacity.bodyChars != null && (
                  <Row k="Body max chars" v={String(variant.capacity.bodyChars)} />
                )}
                {!variant.capacity.items &&
                  variant.capacity.titleChars == null &&
                  variant.capacity.bodyChars == null && (
                    <div className="text-black/50">No capacity rules.</div>
                  )}
              </Spec>

              <Spec label={`Permitted layouts (${layouts.length})`}>
                <ul className="space-y-1.5">
                  {layouts.map((lf) => (
                    <li
                      key={lf.id}
                      className="rounded-lg border border-black/10 bg-white px-3 py-2"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-mono text-xs text-black/50">{lf.id}</div>
                        <div className="font-medium">{lf.name}</div>
                      </div>
                      <div className="mt-0.5 text-xs text-black/60">{lf.description}</div>
                      {lf.zones.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {lf.zones.map((z) => (
                            <span
                              key={z}
                              className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/70"
                            >
                              {z}
                            </span>
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
                ) : (
                  <div className="text-black/50">—</div>
                )}
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
      <SaveModuleDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        variantId={variant.id}
        variantName={variant.name}
        content={detailContent}
        brandMode={brand.id}
        subCompany={null}
        divisionId={brand.id}
      />
      {previewUrls && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03002C]/85 p-6 backdrop-blur-md"
          onClick={closePdfPreview}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[92vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0821] text-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 py-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest text-white/60">
                  PDF preview · {previewUrls.ratio === 3840 ? "4K" : "HD"} · {previewUrls.ratio}×
                  {Math.round((previewUrls.ratio * 9) / 16)}
                  {previewUrls.ratio !== pixelRatio
                    ? ` (current selection: ${pixelRatio === 3840 ? "4K" : "HD"} — re-render to update)`
                    : ""}
                </div>
                <div className="mt-1 truncate text-lg font-semibold">
                  {variant.name} — {brand.name}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPreviewBlob("light")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:bg-white/90"
                  title={previewUrls.filenameLight}
                >
                  <Download size={12} /> Download Light ({previewUrls.ratio === 3840 ? "4K" : "HD"})
                </button>
                <button
                  type="button"
                  onClick={() => downloadPreviewBlob("dark")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7] bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0050ff]"
                  title={previewUrls.filenameDark}
                >
                  <Download size={12} /> Download Dark ({previewUrls.ratio === 3840 ? "4K" : "HD"})
                </button>
                <button
                  type="button"
                  onClick={closePdfPreview}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
                >
                  Close ✕
                </button>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden bg-[#050416] p-4 md:grid-cols-2">
              <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white">
                <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 text-xs font-medium text-black/70">
                  <span>☀︎ Light</span>
                  <span className="font-mono text-[10px] text-black/40">
                    {previewUrls.filenameLight}
                  </span>
                </div>
                <iframe
                  title="Light PDF preview"
                  src={previewUrls.light}
                  className="h-full w-full flex-1 bg-neutral-100"
                />
              </div>
              <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#03002C]">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs font-medium text-white/70">
                  <span>☾ Dark</span>
                  <span className="font-mono text-[10px] text-white/40">
                    {previewUrls.filenameDark}
                  </span>
                </div>
                <iframe
                  title="Dark PDF preview"
                  src={previewUrls.dark}
                  className="h-full w-full flex-1 bg-[#03002C]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
  const darkBackdrop = backdropForVariant(variant, brand.id, "dark");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const targets = [lightRef.current, darkRef.current];
    const t = window.setTimeout(async () => {
      const { applyAutoFix, revertAutoFix, auditAndFixTypography, revertTypeFix } =
        await import("@/lib/wcag");
      for (const el of targets) {
        if (!el) continue;
        revertAutoFix(el);
        revertTypeFix(el);
        auditAndFixTypography(el);
        applyAutoFix(el);
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [variant.id, brand.id, showImagery]);

  const [zoom, setZoom] = useState<null | "light" | "dark">(null);
  const [imageBusy, setImageBusy] = useState<null | `${"png" | "pdf"}-${"light" | "dark"}`>(null);
  const [imageStage, setImageStage] = useState<string | null>(null);
  const [pixelRatio, setPixelRatio] = useExportPixelRatio();

  const runImageExport = async (m: "light" | "dark", kind: "png" | "pdf") => {
    const node = m === "dark" ? darkRef.current : lightRef.current;
    if (!node) return;
    setImageBusy(`${kind}-${m}`);
    setImageStage(null);
    const resLabel = pixelRatio === 3840 ? "4k" : "hd";
    const base = `${variant.id}-${brand.id}-${m}-${resLabel}`;
    const filename = `${base}.${kind}`;
    const toastId = `export-${variant.id}-${m}-${kind}`;
    const kindLabel = kind.toUpperCase();
    const modeLabel = m === "light" ? "Light" : "Dark";
    toast.loading(`Preparing ${modeLabel} ${kindLabel} · ${resLabel.toUpperCase()}`, {
      id: toastId,
      description: `${filename} — starting…`,
      duration: Infinity,
    });
    try {
      const mod = await import("@/lib/slide-image-export");
      const onProgress = (p: { stage: string; message?: string }) => {
        const msg = p.message ?? p.stage;
        setImageStage(msg);
        toast.loading(`Exporting ${modeLabel} ${kindLabel} · ${resLabel.toUpperCase()}`, {
          id: toastId,
          description: `${filename} — ${msg}`,
          duration: Infinity,
        });
      };
      if (kind === "png") {
        await mod.exportSlideAsPng(node, {
          mode: m,
          filename,
          targetWidth: pixelRatio,
          onProgress,
        });
      } else {
        await mod.exportSlidesAsImagePdf([{ node, mode: m }], {
          filename,
          targetWidth: pixelRatio,
          onProgress,
        });
      }
      toast.success(
        `${modeLabel} ${kindLabel} downloaded · ${resLabel.toUpperCase()} (${pixelRatio}×${Math.round((pixelRatio * 9) / 16)})`,
        {
          id: toastId,
          description: filename,
          duration: 5000,
        },
      );
    } catch (err) {
      console.error("[library] image export failed", err);
      toast.error(`${kindLabel} export failed`, {
        id: toastId,
        description: "See console for details.",
        duration: 6000,
      });
    } finally {
      setImageBusy(null);
      setImageStage(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(["light", "dark"] as const).map((m) => (
          <div key={m} className="relative">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                {m === "light" ? "☀︎ A · Light" : "☾ B · Dark"}
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                {m === "light" && (
                  <ResolutionToggle
                    value={pixelRatio}
                    onChange={setPixelRatio}
                    disabled={imageBusy !== null}
                    tone="compact"
                  />
                )}
                <button
                  type="button"
                  onClick={() => runImageExport(m, "png")}
                  disabled={imageBusy !== null}
                  className="rounded-full border border-black/15 bg-white px-2 py-0.5 font-medium uppercase tracking-widest text-black/60 hover:border-[#003FC7]/50 hover:text-[#003FC7] disabled:opacity-50"
                  title={`Export exact ${m} preview as high-res PNG (pixel-perfect, not editable)`}
                >
                  {imageBusy === `png-${m}` ? (imageStage ?? "…") : "PNG"}
                </button>
                <button
                  type="button"
                  onClick={() => runImageExport(m, "pdf")}
                  disabled={imageBusy !== null}
                  className="rounded-full border border-black/15 bg-white px-2 py-0.5 font-medium uppercase tracking-widest text-black/60 hover:border-[#003FC7]/50 hover:text-[#003FC7] disabled:opacity-50"
                  title={`Export exact ${m} preview as image PDF (16:9, review copy — not editable)`}
                >
                  {imageBusy === `pdf-${m}` ? (imageStage ?? "…") : "PDF"}
                </button>
                <span className="text-black/30">·</span>
                <span className="text-black/40">Click to zoom</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setZoom(m)}
              aria-label={`Zoom ${m} preview`}
              className="group relative block w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition hover:border-[#003FC7]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#003FC7]/40"
            >
              <div
                ref={m === "dark" ? darkRef : lightRef}
                data-modal-preview={m}
                data-variant-id={variant.id}
                className={`relative aspect-[16/9] overflow-hidden ${m === "dark" ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}
              >
                <ScaledSlide>
                  <SlideBackdropContext.Provider
                    value={m === "dark" ? darkBackdrop : lightBackdrop}
                  >
                    <VariantRenderer
                      slide={previewSlide}
                      variant={variant}
                      brand={brand}
                      pageNumber={1}
                      mode={m}
                    />
                  </SlideBackdropContext.Provider>
                </ScaledSlide>
                <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-2 opacity-0 transition group-hover:opacity-100">
                  <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white">
                    ⤢ Zoom
                  </span>
                </div>
              </div>
              <WcagBadge
                variantId={variant.id}
                mode={m}
                targetRef={m === "dark" ? darkRef : lightRef}
                enabled
              />
            </button>
          </div>
        ))}
      </div>
      {zoom && (
        <LightboxPortal
          mode={zoom}
          setMode={setZoom}
          variant={variant}
          brand={brand}
          previewSlide={previewSlide}
          lightBackdrop={lightBackdrop}
          darkBackdrop={darkBackdrop}
        />
      )}
    </>
  );
}

function LightboxPortal({
  mode,
  setMode,
  variant,
  brand,
  previewSlide,
  lightBackdrop,
  darkBackdrop,
}: {
  mode: "light" | "dark";
  setMode: (m: null | "light" | "dark") => void;
  variant: ModuleVariant;
  brand: ReturnType<typeof useTaxonomy>["brandModes"][number];
  previewSlide: Parameters<typeof VariantRenderer>[0]["slide"];
  lightBackdrop: ReturnType<typeof backdropForVariant>;
  darkBackdrop: ReturnType<typeof backdropForVariant>;
}) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (playUrl) {
          setPlayUrl(null);
          return;
        }
        setMode(null);
      }
      if (!playUrl && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ")) {
        e.preventDefault();
        setMode(mode === "light" ? "dark" : "light");
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mode, setMode, playUrl]);

  // Run the same typography + WCAG auto-fix on the zoomed stage that the
  // grid A/B compare uses, so dark-mode primitives with hardcoded ink text
  // (e.g. LabelBlock, comparison tables) don't render as ghost text on the
  // navy backdrop. Re-runs whenever the mode or variant changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = stageRef.current;
    if (!el) return;
    const t = window.setTimeout(async () => {
      const { applyAutoFix, revertAutoFix, auditAndFixTypography, revertTypeFix } =
        await import("@/lib/wcag");
      revertAutoFix(el);
      revertTypeFix(el);
      auditAndFixTypography(el);
      applyAutoFix(el);
    }, 320);
    return () => window.clearTimeout(t);
  }, [mode, variant.id, brand.id]);

  const isDark = mode === "dark";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#03002C]/95 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged slide preview"
      onClick={() => setMode(null)}
    >
      {/* Top chrome */}
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="h-8 w-8 shrink-0 rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${brand.tokens.primary}, ${brand.tokens.accent ?? brand.tokens.primary})`,
            }}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{variant.name}</div>
            <div className="truncate text-[11px] uppercase tracking-widest text-white/50">
              {variant.id} · {brand.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-white/15 bg-white/5 p-1">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  mode === m
                    ? "bg-white text-[#03002C] shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {m === "light" ? "☀ Light" : "☾ Dark"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMode(null)}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-6 md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full"
          style={{ aspectRatio: "16 / 9", maxWidth: "min(96vw, 168vh)", maxHeight: "100%" }}
        >
          <div
            ref={stageRef}
            data-preview-mode={isDark ? "dark" : "light"}
            data-preview-role="module-lightbox"
            className={`relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] ${isDark ? "bg-[#03002C]" : "bg-[#F2F2F2]"}`}
          >
            <ScaledSlide>
              <SlideBackdropContext.Provider value={isDark ? darkBackdrop : lightBackdrop}>
                <SlideVideoPreviewContext.Provider value={setPlayUrl}>
                  <SlideForceVideoAutoplayContext.Provider value={true}>
                    <VariantRenderer
                      slide={previewSlide}
                      variant={variant}
                      brand={brand}
                      pageNumber={1}
                      mode={mode}
                    />
                  </SlideForceVideoAutoplayContext.Provider>
                </SlideVideoPreviewContext.Provider>
              </SlideBackdropContext.Provider>
            </ScaledSlide>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div
        className="shrink-0 border-t border-white/10 py-3 text-center text-[11px] text-white/40"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-2">
          <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
            Esc
          </kbd>{" "}
          close
        </span>
        <span className="mx-2">
          <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
            ← →
          </kbd>{" "}
          toggle theme
        </span>
        <span className="mx-2">
          Click{" "}
          <span className="inline-block rounded-full bg-white/10 px-1.5 py-0.5 text-white/70">
            ▶
          </span>{" "}
          to play video
        </span>
      </div>

      {/* Video overlay */}
      {playUrl && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setPlayUrl(null);
          }}
        >
          <video
            key={playUrl}
            src={playUrl}
            autoPlay
            controls
            playsInline
            className="max-h-[88vh] max-w-[94vw] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPlayUrl(null);
            }}
            aria-label="Close video"
            className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white/90 hover:bg-white/20"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-black/50">
        {label}
      </div>
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
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : "bg-red-50 text-red-800 border-red-200";
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((f) => (
        <span key={f} className={`rounded border px-2 py-0.5 font-mono text-[10px] ${cls}`}>
          {f}
        </span>
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
    () =>
      Object.values(decks)
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
        .slice(0, 8),
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
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
            Add to deck
          </div>
          <div className="mt-1 text-sm text-black/70">
            Append <span className="font-mono text-xs">{variant.id}</span> as a new slide with its
            default content seed.
          </div>
        </div>
        <Plus size={16} className="text-[#003FC7]" />
      </div>
      {list.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-black/15 bg-white/60 p-3 text-xs text-black/60">
          No decks yet.{" "}
          <Link to="/brief/new" className="font-medium text-[#003FC7] hover:underline">
            Start a brief
          </Link>{" "}
          to create one.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {list.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2"
            >
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
      {note && <div className="mt-2 text-[11px] text-emerald-700">{note}</div>}
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
            Full editorial and infographic sets pre-mapped onto the module variants above. Import a
            whole kit into a new editable deck.
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
            <div
              key={kit.key}
              className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#003FC7]">
                    {kit.tag}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[#03002C]">{kit.title}</div>
                </div>
                <span className="shrink-0 rounded-full bg-[#003FC7]/10 px-2.5 py-0.5 text-xs font-medium text-[#003FC7]">
                  {kit.payload.slides.length} slides
                </span>
              </div>
              <p className="mt-3 text-sm text-black/60">{kit.blurb}</p>

              <div className="mt-4 border-t border-black/10 pt-3">
                <div className="text-[9px] uppercase tracking-widest text-black/40">
                  Variant mix
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(familyCounts).map(([fam, n]) => (
                    <span
                      key={fam}
                      className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-[10px] text-[#0B2A4A]"
                    >
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
                {busy === kit.key ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
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
            Decks you brought in via PPTX import or flagged as a template — reusable as module kits
            alongside the curated collections above.
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
            <div
              key={deck.id}
              className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]"
            >
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
                <div className="text-[9px] uppercase tracking-widest text-black/40">
                  Variant mix
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(familyCounts).map(([fam, n]) => (
                    <span
                      key={fam}
                      className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-[10px] text-[#0B2A4A]"
                    >
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
                  {busy === deck.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
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
