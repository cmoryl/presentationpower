/**
 * INDUSTRY BACKGROUND GALLERY — review surface for R01–R30.
 *
 * Inspection only: every tile paints the REAL `pack.ground(seed)` output of the
 * industry background engine at true slide size (via GroundPlane), pure
 * background, no fake slide copy, charts or UI. Nothing here authors, forks or
 * mutates a style.
 *
 * Tiles lazy-mount on first intersection so the "All backgrounds" mode can walk
 * all 30 × 44 = 1,320 compositions without painting them at once.
 */

import * as React from "react";
import { ApprovedStyleThumb } from "@/components/skins/ApprovedStyleThumb";
import {
  INDUSTRY_BG_COMBOS,
  INDUSTRY_BG_FAMILIES,
  industryBackgroundSets,
  type IndustryBackgroundSet,
  type IndustryBgFamilyKey,
} from "@/lib/industry-backgrounds";
import { SKIN_BG_TAKES, SKIN_SCENES, TAKE_LABEL, type SkinScene } from "@/lib/skin-backgrounds";

/* ------------------------------------------------------------------ lazy tile */

function useOnScreen<T extends HTMLElement>(rootMargin = "300px") {
  const ref = React.useRef<T | null>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return { ref, seen };
}

/** One 16:9 pure-background tile with an `Rxx · scene · take` caption. */
export function BackgroundTile({
  set,
  scene,
  take,
  radius = 6,
  compact = false,
}: {
  set: IndustryBackgroundSet;
  scene: SkinScene;
  take: number;
  radius?: number;
  compact?: boolean;
}) {
  const { ref, seen } = useOnScreen<HTMLElement>();
  return (
    <figure ref={ref} className="min-w-0" data-testid="bg-tile">
      {seen ? (
        <ApprovedStyleThumb pack={set.pack} scene={scene} take={take} radius={radius} />
      ) : (
        <div
          aria-hidden
          style={{
            aspectRatio: "16 / 9",
            width: "100%",
            borderRadius: radius,
            background: set.pack.tokens.surface,
          }}
        />
      )}
      <figcaption
        className={`mt-1 truncate text-center uppercase tracking-wider text-[#03002C]/45 dark:text-white/45 ${
          compact ? "text-[8px]" : "text-[9px]"
        }`}
      >
        {set.recipeId} · {scene} · take {take + 1}
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------- filters */

export interface GalleryFilters {
  q: string;
  family: IndustryBgFamilyKey | "all";
  scene: SkinScene | "all";
  take: number | "all";
}

export const DEFAULT_FILTERS: GalleryFilters = {
  q: "",
  family: "all",
  scene: "all",
  take: "all",
};

/** Scenes that survive the family + scene filters, in canonical order. */
export function activeScenes(f: GalleryFilters): SkinScene[] {
  const familyScenes =
    f.family === "all"
      ? SKIN_SCENES
      : (INDUSTRY_BG_FAMILIES.find((x) => x.key === f.family)?.scenes ?? SKIN_SCENES);
  return SKIN_SCENES.filter(
    (s) => familyScenes.includes(s) && (f.scene === "all" || f.scene === s),
  );
}

export function activeTakes(f: GalleryFilters): number[] {
  const all = Array.from({ length: SKIN_BG_TAKES }, (_, i) => i);
  return f.take === "all" ? all : all.filter((t) => t === f.take);
}

export function matchesIndustry(set: IndustryBackgroundSet, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [set.recipeId, set.name, set.motifLabel, set.recipe.keywords.join(" ")]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

const chip = (on: boolean) =>
  `rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
    on
      ? "bg-[#003FC7] text-white"
      : "border border-black/12 text-[#03002C]/60 hover:border-[#003FC7]/40 hover:text-[#003FC7] dark:border-white/15 dark:text-white/60"
  }`;

export function GalleryFilterBar({
  filters,
  onChange,
  onReset,
  resultLabel,
}: {
  filters: GalleryFilters;
  onChange: (next: GalleryFilters) => void;
  onReset: () => void;
  resultLabel: string;
}) {
  const set = (patch: Partial<GalleryFilters>) => onChange({ ...filters, ...patch });
  return (
    <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-black/12 px-3 py-1.5 dark:border-white/15">
          <span className="sr-only">Search industry name or code</span>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search industry or code (e.g. R07, life sciences)"
            className="w-full bg-transparent text-[12px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35"
          />
        </label>
        <button type="button" onClick={onReset} className={chip(false)}>
          Show all 30
        </button>
        <span className="text-[11px] tabular-nums text-black/45 dark:text-white/45">
          {resultLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
          Family
        </span>
        <button type="button" className={chip(filters.family === "all")} onClick={() => set({ family: "all", scene: "all" })}>
          All
        </button>
        {INDUSTRY_BG_FAMILIES.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filters.family === f.key}
            className={chip(filters.family === f.key)}
            onClick={() => set({ family: f.key, scene: "all" })}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
          Scene
        </span>
        <button type="button" className={chip(filters.scene === "all")} onClick={() => set({ scene: "all" })}>
          All
        </button>
        {activeScenes({ ...filters, scene: "all" }).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filters.scene === s}
            className={chip(filters.scene === s)}
            onClick={() => set({ scene: s })}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
          Take
        </span>
        <button type="button" className={chip(filters.take === "all")} onClick={() => set({ take: "all" })}>
          All
        </button>
        {Array.from({ length: SKIN_BG_TAKES }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={filters.take === i}
            className={chip(filters.take === i)}
            onClick={() => set({ take: i })}
          >
            {TAKE_LABEL[i] ?? `Take ${i + 1}`}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- industry card */

export function IndustryOverviewCard({
  set,
  filters,
  open,
  onToggle,
}: {
  set: IndustryBackgroundSet;
  filters: GalleryFilters;
  open: boolean;
  onToggle: () => void;
}) {
  const scenes = activeScenes(filters);
  const takes = activeTakes(filters);
  const heroScene = scenes.includes("cover") ? "cover" : (scenes[0] ?? "cover");
  const count = scenes.length * takes.length;

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <div className="p-3">
        <BackgroundTile set={set} scene={heroScene} take={takes[0] ?? 0} radius={8} />
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-[#03002C] dark:text-white">
              <span className="text-[#003FC7]">{set.recipeId}</span> · {set.name}
            </div>
            <div className="truncate text-[11px] text-black/50 dark:text-white/50">
              {set.motifLabel} · {set.mode} · {INDUSTRY_BG_COMBOS} compositions
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1" aria-hidden>
            {set.palette.slice(0, 5).map((c) => (
              <span
                key={c}
                className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                style={{ background: c }}
              />
            ))}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="mt-2 text-[11px] font-semibold text-[#003FC7] hover:underline"
        >
          {open ? "Hide" : `View all ${count}`} scene × take backgrounds
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.02]">
          {INDUSTRY_BG_FAMILIES.map((f) => {
            const famScenes = scenes.filter((s) => f.scenes.includes(s));
            if (!famScenes.length) return null;
            return (
              <div key={f.key} className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
                  {f.label} · {famScenes.join(" / ")} · {f.band}
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {famScenes.flatMap((scene) =>
                    takes.map((take) => (
                      <BackgroundTile
                        key={`${scene}-${take}`}
                        set={set}
                        scene={scene}
                        take={take}
                        radius={4}
                        compact
                      />
                    )),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ all mode */

const PAGE_SIZE = 132;

export function AllBackgroundsGrid({ filters }: { filters: GalleryFilters }) {
  const sets = React.useMemo(
    () => industryBackgroundSets().filter((s) => matchesIndustry(s, filters.q)),
    [filters.q],
  );
  const scenes = activeScenes(filters);
  const takes = activeTakes(filters);

  const rows = React.useMemo(() => {
    const out: { set: IndustryBackgroundSet; scene: SkinScene; take: number }[] = [];
    for (const set of sets) {
      for (const scene of scenes) {
        for (const take of takes) out.push({ set, scene, take });
      }
    }
    return out;
  }, [sets, scenes, takes]);

  const [shown, setShown] = React.useState(PAGE_SIZE);
  React.useEffect(() => setShown(PAGE_SIZE), [filters.q, filters.family, filters.scene, filters.take]);

  const visible = rows.slice(0, shown);
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-black/50 dark:text-white/50">
        Showing {visible.length} of {rows.length} compositions — tiles paint on scroll.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {visible.map((r) => (
          <BackgroundTile
            key={`${r.set.recipeId}-${r.scene}-${r.take}`}
            set={r.set}
            scene={r.scene}
            take={r.take}
            radius={4}
            compact
          />
        ))}
      </div>
      {shown < rows.length && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE_SIZE)}
            className="rounded-full border border-[#003FC7]/40 px-4 py-1.5 text-[12px] font-semibold text-[#003FC7] transition hover:bg-[#003FC7]/10"
          >
            Load {Math.min(PAGE_SIZE, rows.length - shown)} more
          </button>
        </div>
      )}
    </div>
  );
}
