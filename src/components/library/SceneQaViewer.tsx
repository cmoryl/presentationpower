/**
 * SCENE QA VIEWER — internal review surface for the authored background system.
 *
 * It renders the *real* engine output (`pack.ground(seed)` layers, exactly what
 * the slide stage and exporters paint) with review instrumentation on top:
 * grayscale, thumbnail size, safe-zone / visual-mass / region overlays, take
 * comparison and all-industry contact sheets.
 *
 * No new art lives here. If a tile looks wrong, the scene must be tuned.
 */

import * as React from "react";
import {
  allBackgroundSets,
  coreBackgroundSets,
  industryBackgroundSets,
  INDUSTRY_BG_FAMILIES,
  type IndustryBackgroundSet,
} from "@/lib/industry-backgrounds";
import {
  REGION_BOX,
  sceneLayout,
  sceneLayoutSummary,
  type SceneLayout,
} from "@/lib/scene-layout-metadata";
import { TAKE_LABEL, type SkinScene } from "@/lib/skin-backgrounds";
import { cn } from "@/lib/utils";

/** Duplicate-cluster comparison sheets called out in the QA brief. */
export const COMPARISON_GROUPS: { label: string; codes: string[] }[] = [
  { label: "Architecture family", codes: ["R01", "R11", "R20", "R25"] },
  { label: "Systems / infrastructure", codes: ["R02", "R07", "R16"] },
  { label: "Networks / movement", codes: ["R04", "R17", "R29"] },
  { label: "Protective / clinical", codes: ["R06", "R08"] },
  { label: "Science / inquiry", codes: ["R09", "R26"] },
  { label: "Terrain / horizon", codes: ["R13", "R24"] },
  { label: "Motion / performance", codes: ["R14", "R23"] },
  { label: "Light space", codes: ["R21", "R30"] },
  { label: "Institutional", codes: ["R10", "R27"] },
  { label: "Material / natural", codes: ["R19", "R28"] },
];

export interface QaOptions {
  grayscale: boolean;
  thumbnail: boolean;
  safeZone: boolean;
  visualMass: boolean;
  regions: boolean;
}

export const DEFAULT_QA_OPTIONS: QaOptions = {
  grayscale: false,
  thumbnail: false,
  safeZone: false,
  visualMass: false,
  regions: false,
};

function RegionBox({
  region,
  className,
  label,
}: {
  region: SceneLayout["safeZone"];
  className: string;
  label: string;
}) {
  const b = REGION_BOX[region];
  if (!b) return null;
  return (
    <div
      className={cn("pointer-events-none absolute border-2 text-[9px] font-medium", className)}
      style={{
        left: `${b.x * 100}%`,
        top: `${b.y * 100}%`,
        width: `${b.w * 100}%`,
        height: `${b.h * 100}%`,
      }}
    >
      <span className="absolute left-1 top-1 rounded bg-background/80 px-1 py-px text-foreground">
        {label}
      </span>
    </div>
  );
}

/** One 16:9 scene tile: real layers + optional QA instrumentation. */
export function SceneTile({
  set,
  scene,
  take = 0,
  options,
  caption,
  className,
}: {
  set: IndustryBackgroundSet;
  scene: SkinScene;
  take?: number;
  options: QaOptions;
  caption?: React.ReactNode;
  className?: string;
}) {
  const layers = React.useMemo(() => set.layers(scene, take), [set, scene, take]);
  const layout = React.useMemo(() => sceneLayout(set.recipeId, scene, take), [set, scene, take]);
  return (
    <figure className={cn("min-w-0", className)}>
      <div
        className="relative overflow-hidden rounded-lg ring-1 ring-border"
        style={{
          aspectRatio: "16 / 9",
          background: `${layers.join(", ")}, ${set.palette[0]}`,
          filter: options.grayscale ? "grayscale(1)" : undefined,
        }}
      >
        {options.visualMass ? (
          <RegionBox
            region={layout.visualMass}
            className="border-[#EC388A]/80 bg-[#EC388A]/10"
            label="mass"
          />
        ) : null}
        {options.safeZone ? (
          <RegionBox
            region={layout.safeZone}
            className="border-[#A6FA87]/90 bg-[#A6FA87]/10"
            label="safe"
          />
        ) : null}
        {options.regions ? (
          <>
            <RegionBox
              region={layout.recommendedTitleRegion}
              className="border-dashed border-[#FFEB66]"
              label="title"
            />
            <RegionBox
              region={layout.recommendedChartRegion}
              className="border-dotted border-[#A1FBF9]"
              label="chart"
            />
          </>
        ) : null}
      </div>
      {caption === null ? null : (
        <figcaption className="mt-1 truncate text-[11px] leading-tight text-muted-foreground">
          {caption ?? `${set.recipeId} · ${set.name}`}
        </figcaption>
      )}
      {options.regions ? (
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          {sceneLayoutSummary(layout)}
        </p>
      ) : null}
    </figure>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        on
          ? "border-transparent bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Contact sheet: one scene family across every set in `sets`. */
export function ContactSheet({
  sets,
  scene,
  take,
  options,
  columns,
  id,
}: {
  sets: IndustryBackgroundSet[];
  scene: SkinScene;
  take: number;
  options: QaOptions;
  columns?: number;
  id?: string;
}) {
  const cols = columns ?? (options.thumbnail ? 6 : 4);
  return (
    <div
      id={id}
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {sets.map((s) => (
        <SceneTile
          key={s.recipeId}
          set={s}
          scene={scene}
          take={take}
          options={options}
          caption={`${s.recipeId} · ${s.name}`}
        />
      ))}
    </div>
  );
}

type Mode = "single" | "contact" | "compare";

export function SceneQaViewer() {
  const industry = React.useMemo(() => industryBackgroundSets(), []);
  const core = React.useMemo(() => coreBackgroundSets(), []);
  const all = React.useMemo(() => allBackgroundSets(), []);
  const [mode, setMode] = React.useState<Mode>("single");
  const [code, setCode] = React.useState("R01");
  const [familyKey, setFamilyKey] = React.useState(INDUSTRY_BG_FAMILIES[0]!.key);
  const [take, setTake] = React.useState(0);
  const [scope, setScope] = React.useState<"industry" | "core">("industry");
  const [opts, setOpts] = React.useState<QaOptions>(DEFAULT_QA_OPTIONS);

  const family = INDUSTRY_BG_FAMILIES.find((f) => f.key === familyKey) ?? INDUSTRY_BG_FAMILIES[0]!;
  const set = all.find((s) => s.recipeId === code) ?? industry[0]!;
  const sheetSets = scope === "industry" ? industry : core;
  const toggle = (k: keyof QaOptions) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["single", "contact", "compare"] as Mode[]).map((m) => (
          <Toggle key={m} on={mode === m} onClick={() => setMode(m)}>
            {m === "single" ? "Single system" : m === "contact" ? "Contact sheet" : "Comparison"}
          </Toggle>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {mode === "single" ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Industry
            <select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              {all.map((s) => (
                <option key={s.recipeId} value={s.recipeId}>
                  {s.recipeId} · {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Scope
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "industry" | "core")}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              <option value="industry">Industry R01–R30</option>
              <option value="core">Core S01–S28</option>
            </select>
          </label>
        )}
        {INDUSTRY_BG_FAMILIES.map((f) => (
          <Toggle key={f.key} on={familyKey === f.key} onClick={() => setFamilyKey(f.key)}>
            {f.label}
          </Toggle>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {[0, 1, 2, 3].map((t) => (
          <Toggle key={t} on={take === t} onClick={() => setTake(t)}>
            {TAKE_LABEL[t] ?? `Take ${t + 1}`}
          </Toggle>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Toggle on={opts.grayscale} onClick={toggle("grayscale")}>
          Grayscale
        </Toggle>
        <Toggle on={opts.thumbnail} onClick={toggle("thumbnail")}>
          Thumbnail size
        </Toggle>
        <Toggle on={opts.safeZone} onClick={toggle("safeZone")}>
          Safe zone
        </Toggle>
        <Toggle on={opts.visualMass} onClick={toggle("visualMass")}>
          Visual mass
        </Toggle>
        <Toggle on={opts.regions} onClick={toggle("regions")}>
          Region metadata
        </Toggle>
      </div>

      <p className="text-xs text-muted-foreground">
        {family.label} · {family.band} intensity — {family.note}
      </p>

      {mode === "single" ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">
            {set.recipeId} · {set.name} — {family.label} scenes, all takes
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {family.scenes.map((scene) =>
              [0, 1, 2, 3].map((t) => (
                <SceneTile
                  key={`${scene}-${t}`}
                  set={set}
                  scene={scene}
                  take={t}
                  options={opts}
                  caption={`${scene} · ${TAKE_LABEL[t] ?? t}`}
                  className={opts.thumbnail ? "max-w-[260px]" : undefined}
                />
              )),
            )}
          </div>
        </section>
      ) : mode === "contact" ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            All {sheetSets.length} systems · {family.label} ({family.representative}) ·{" "}
            {TAKE_LABEL[take] ?? take}
          </h2>
          <ContactSheet
            id={`sheet-${family.key}`}
            sets={sheetSets}
            scene={family.representative}
            take={take}
            options={opts}
          />
        </section>
      ) : (
        <section className="space-y-8">
          {COMPARISON_GROUPS.map((g) => (
            <div key={g.label} className="space-y-2">
              <h2 className="text-sm font-semibold">
                {g.label} — {g.codes.join(" / ")}
              </h2>
              <ContactSheet
                sets={industry.filter((s) => g.codes.includes(s.recipeId))}
                scene={family.representative}
                take={take}
                options={opts}
                columns={g.codes.length}
              />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
