// -----------------------------------------------------------------------------
// OVERRIDE INSPECTOR
//
// Third roadmap item from the module hackathon. Every customisation an admin
// can make now lives in one of three stores:
//
//   1. `module_variant_samples`        — curated copy / ink / per-mode layers
//   2. `skin_backdrops`                — replaced backgrounds (skin- or
//                                        module-scoped via `mod:<VARIANT>`)
//   3. `template_background_overrides` — scene tuning (intensity, tint, swap,
//                                        image priority, motion)
//
// Until now each store was only visible from the surface that wrote it, so a
// stale override was effectively invisible. This page reads all three, shows
// what is overridden and lets an admin jump to the editor or reset the record.
// -----------------------------------------------------------------------------

import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Image as ImageIcon, Layers, RotateCcw, Sparkles } from "lucide-react";

import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import { DESIGN_SKINS } from "@/lib/design-skins";
import { TAKE_LABEL } from "@/lib/skin-backgrounds";
import { isModuleScene } from "@/lib/skin-backdrop-overrides";
import { announceSkinBackdropChange } from "@/components/slide/SkinBackdropContext";
import {
  deleteSkinBackdrop,
  listSkinBackdrops,
  type SkinBackdropRow,
} from "@/lib/skin-backdrop.functions";
import { listVariantSamples, ALL_BRANDS } from "@/lib/variant-samples.functions";
import { deleteBackgroundOverride } from "@/lib/templates.functions";
import {
  useIsModuleAdmin,
  useVariantSampleMutations,
  splitSampleContent,
  readSampleLayout,
  hasSampleLayout,
} from "@/hooks/use-variant-samples";
import { backgroundOverrides } from "@/lib/template-registry";
import { useTemplateRegistryVersion } from "@/hooks/use-template-registry";
import {
  conformanceSpecIssues,
  divisionConformancePresets,
} from "@/lib/division-conformance";

/** Derived once — presets are pure data from the registry + brand taxonomy. */
const CONFORMANCE_PRESETS = divisionConformancePresets();


export const Route = createFileRoute("/library/overrides")({
  head: () => ({
    meta: [
      { title: "Override inspector · TransPerfect Element" },
      {
        name: "description",
        content:
          "Audit every module customisation in one place: curated samples, replaced backgrounds and scene tuning — with one-click reset.",
      },
      { property: "og:title", content: "Override inspector · TransPerfect Element" },
      {
        property: "og:description",
        content: "Every module override across looks, divisions and scenes, with reset controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OverrideInspector,
});

const VARIANT_NAME = new Map(MODULE_VARIANTS.map((v) => [v.id, v.name]));
const BRAND_NAME = new Map(BRAND_MODES.map((b) => [b.id, b.name]));
const SKIN_NAME = new Map(DESIGN_SKINS.map((s) => [s.code?.toUpperCase?.() ?? "", s.name]));

function skinLabel(code: string): string {
  const up = code.toUpperCase();
  return SKIN_NAME.get(up) ? `${SKIN_NAME.get(up)} · ${up}` : up;
}

function moduleLabel(variantId: string): string {
  return VARIANT_NAME.get(variantId) ? `${VARIANT_NAME.get(variantId)} · ${variantId}` : variantId;
}

const card =
  "rounded-xl border border-black/10 bg-white/80 p-4 shadow-[0_1px_0_rgba(3,0,44,0.04)] dark:border-white/12 dark:bg-white/[0.04]";
const chip =
  "inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#03002C]/65 dark:border-white/15 dark:text-white/65";
const btn =
  "inline-flex items-center gap-1 rounded-md border border-black/12 px-2 py-1 text-[11px] font-semibold text-[#03002C]/75 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50 dark:border-white/15 dark:text-white/75";

function Section({
  title,
  note,
  count,
  children,
}: {
  title: string;
  note: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <header className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#03002C] dark:text-white">
          {title}
        </h2>
        <span className={chip}>{count} active</span>
      </header>
      <p className="mt-1 max-w-3xl text-sm leading-[1.5] text-[#03002C]/65 dark:text-white/65">
        {note}
      </p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="rounded-xl border border-dashed border-black/12 px-4 py-6 text-sm text-[#03002C]/55 dark:border-white/15 dark:text-white/55">
      {label}
    </p>
  );
}

function OverrideInspector() {
  const isAdmin = useIsModuleAdmin();
  const qc = useQueryClient();

  const samplesFn = useServerFn(listVariantSamples);
  const backdropsFn = useServerFn(listSkinBackdrops);
  const delBackdrop = useServerFn(deleteSkinBackdrop);
  const delSceneOverride = useServerFn(deleteBackgroundOverride);
  const { reset: resetSample } = useVariantSampleMutations();

  const samples = useQuery({
    queryKey: ["override-inspector", "samples"],
    queryFn: () => samplesFn(),
    staleTime: 30_000,
  });

  const backdrops = useQuery({
    queryKey: ["override-inspector", "backdrops"],
    queryFn: async (): Promise<SkinBackdropRow[]> => {
      try {
        return await backdropsFn();
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  // Scene tuning lands in the runtime registry after first render.
  const registryVersion = useTemplateRegistryVersion();
  const scenes = React.useMemo(() => backgroundOverrides(), [registryVersion]);

  const [filter, setFilter] = React.useState("");
  const match = React.useCallback(
    (...parts: (string | null | undefined)[]) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return parts.some((p) => (p ?? "").toLowerCase().includes(q));
    },
    [filter],
  );

  const sampleRows = React.useMemo(
    () =>
      (samples.data ?? [])
        .map((s) => {
          const { copy, ink, modes } = splitSampleContent(s.content);
          const layout = readSampleLayout(s.content as Record<string, unknown>);
          return {
            ...s,
            copyCount: Object.keys(copy).length,
            inkCount:
              Object.keys(ink.inkOverrides ?? {}).length +
              Object.keys(ink.inkScopeOverrides ?? {}).length,
            modeKeys: Object.keys(modes),
            arranged: hasSampleLayout(layout),
          };
        })
        .filter((s) =>
          match(s.variantId, VARIANT_NAME.get(s.variantId), s.brandModeId, BRAND_NAME.get(s.brandModeId)),
        )
        .sort((a, b) => a.variantId.localeCompare(b.variantId)),
    [samples.data, match],
  );

  const moduleBackdrops = React.useMemo(
    () => (backdrops.data ?? []).filter((r) => isModuleScene(r.scene)),
    [backdrops.data],
  );
  const skinBackdrops = React.useMemo(
    () => (backdrops.data ?? []).filter((r) => !isModuleScene(r.scene)),
    [backdrops.data],
  );

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["override-inspector"] });
    announceSkinBackdropChange();
  }

  async function onDropBackdrop(row: SkinBackdropRow) {
    try {
      await delBackdrop({
        data: { skinCode: row.skinCode, scene: row.scene, take: row.take },
      });
      toast.success(`Reset background for ${row.scene} · ${row.skinCode}`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset that background.");
    }
  }

  async function onDropScene(skinCode: string, scene: string) {
    try {
      await delSceneOverride({ data: { skinCode, scene } });
      toast.success(`Cleared scene tuning for ${skinCode} · ${scene}`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear that tuning.");
    }
  }

  const backdropRow = (row: SkinBackdropRow, scopeLabel: string) => (
    <div key={`${row.skinCode}|${row.scene}|${row.take}`} className={`${card} flex gap-4`}>
      {row.imageUrl ? (
        <img
          src={row.imageUrl}
          alt=""
          loading="lazy"
          className="h-16 w-28 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="grid h-16 w-28 shrink-0 place-items-center rounded-md bg-black/5 dark:bg-white/10">
          <ImageIcon className="h-4 w-4 opacity-40" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#03002C] dark:text-white">{scopeLabel}</p>
        <p className="mt-0.5 text-xs text-[#03002C]/60 dark:text-white/60">
          {skinLabel(row.skinCode)} · {TAKE_LABEL[row.take] ?? `Take ${row.take + 1}`}
        </p>
        {row.prompt ? (
          <p className="mt-1 line-clamp-2 text-[11px] text-[#03002C]/50 dark:text-white/50">
            {row.prompt}
          </p>
        ) : null}
      </div>
      {isAdmin ? (
        <button type="button" className={btn} onClick={() => void onDropBackdrop(row)}>
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      ) : null}
    </div>
  );

  const loading = samples.isLoading || backdrops.isLoading;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className={chip}>
        <Layers className="h-3 w-3" /> Module governance
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#03002C] dark:text-white">
        Override inspector
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-[1.5] text-[#03002C]/70 dark:text-white/70">
        Every customisation layered on top of the authored module system — curated samples, replaced
        backgrounds and scene tuning. Reset a record here and the library, deck editor and exports
        fall back to the authored default immediately.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by module, look or division…"
          className="w-72 rounded-md border border-black/12 bg-white px-3 py-2 text-sm text-[#03002C] outline-none placeholder:text-[#03002C]/40 focus:border-[#003FC7] dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
        />
        <Link to="/library" className={btn}>
          <ExternalLink className="h-3 w-3" /> Module library
        </Link>
        {!isAdmin ? <span className={chip}>Read-only — admin sign-in required to reset</span> : null}
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-[#03002C]/60 dark:text-white/60">Loading overrides…</p>
      ) : null}

      <Section
        title="Curated module samples"
        count={sampleRows.length}
        note="Copy, text colours, per-mode layers and arrange-mode nudges saved from Slide Studio. Scoped to one division, or to every division when marked all brands."
      >
        {sampleRows.length === 0 ? (
          <Empty label="No curated samples — every module renders its seeded content." />
        ) : (
          sampleRows.map((s) => (
            <div key={`${s.variantId}|${s.brandModeId}`} className={`${card} flex gap-4`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#03002C] dark:text-white">
                  {moduleLabel(s.variantId)}
                </p>
                <p className="mt-0.5 text-xs text-[#03002C]/60 dark:text-white/60">
                  {s.brandModeId === ALL_BRANDS
                    ? "All divisions"
                    : (BRAND_NAME.get(s.brandModeId) ?? s.brandModeId)}{" "}
                  · updated {new Date(s.updatedAt).toLocaleDateString()}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.copyCount ? <span className={chip}>{s.copyCount} copy fields</span> : null}
                  {s.inkCount ? <span className={chip}>{s.inkCount} colour rules</span> : null}
                  {s.modeKeys.map((m) => (
                    <span key={m} className={chip}>
                      {m}-only layer
                    </span>
                  ))}
                  {s.arranged ? <span className={chip}>arranged layout</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Link
                  to="/library"
                  search={{ variant: s.variantId, brand: s.brandModeId } as never}
                  className={btn}
                >
                  <Sparkles className="h-3 w-3" /> Open
                </Link>
                {isAdmin ? (
                  <button
                    type="button"
                    className={btn}
                    disabled={resetSample.isPending}
                    onClick={() =>
                      resetSample.mutate(
                        { variantId: s.variantId, brandModeId: s.brandModeId },
                        {
                          onSuccess: () => {
                            toast.success(`Reset sample for ${s.variantId}`);
                            invalidate();
                          },
                          onError: (err) =>
                            toast.error(
                              err instanceof Error ? err.message : "Could not reset that sample.",
                            ),
                        },
                      )
                    }
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </Section>

      <Section
        title="Module-scoped backgrounds"
        count={moduleBackdrops.length}
        note="Backgrounds replaced for a single module inside one look. These outrank the look's scene artwork everywhere, including PPTX, PDF and PNG exports."
      >
        {moduleBackdrops.length === 0 ? (
          <Empty label="No module-scoped background replacements." />
        ) : (
          moduleBackdrops
            .filter((r) => match(r.skinCode, r.scene, VARIANT_NAME.get(r.scene.slice(4))))
            .map((r) => backdropRow(r, moduleLabel(r.scene.slice(4))))
        )}
      </Section>

      <Section
        title="Look background sets"
        count={skinBackdrops.length}
        note="Replaced artwork for a look's scene family — covers, stats, grids and section plates."
      >
        {skinBackdrops.length === 0 ? (
          <Empty label="No replaced look backgrounds." />
        ) : (
          skinBackdrops
            .filter((r) => match(r.skinCode, r.scene, SKIN_NAME.get(r.skinCode.toUpperCase())))
            .map((r) => backdropRow(r, r.scene))
        )}
      </Section>

      <Section
        title="Scene tuning"
        count={scenes.length}
        note="Intensity, tint, scene swaps, image priority and motion treatments saved from the background tuner."
      >
        {scenes.length === 0 ? (
          <Empty label="No scene tuning saved." />
        ) : (
          scenes
            .filter((o) => match(o.skinCode, o.scene, SKIN_NAME.get(o.skinCode.toUpperCase())))
            .map((o) => (
              <div key={`${o.skinCode}|${o.scene}`} className={`${card} flex gap-4`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#03002C] dark:text-white">
                    {skinLabel(o.skinCode)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#03002C]/60 dark:text-white/60">
                    {o.scene === "*" ? "every scene" : o.scene}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={chip}>intensity {o.intensity}</span>
                    {o.tint ? (
                      <span className={chip}>
                        tint {o.tint} @ {Math.round((o.tintStrength ?? 0) * 100)}%
                      </span>
                    ) : null}
                    {o.sceneSwap ? <span className={chip}>swap → {o.sceneSwap}</span> : null}
                    {o.imageUrl ? <span className={chip}>image {o.imagePriority}</span> : null}
                    {o.videoUrl ? <span className={chip}>motion {o.videoVariant ?? "on"}</span> : null}
                  </div>
                  {o.note ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-[#03002C]/50 dark:text-white/50">
                      {o.note}
                    </p>
                  ) : null}
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    className={`${btn} self-start`}
                    onClick={() => void onDropScene(o.skinCode, o.scene)}
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                ) : null}
              </div>
            ))
        )}
      </Section>

      <Section
        title="Division conformance presets"
        count={CONFORMANCE_PRESETS.length}
        note="Derived from the module registry: each brand scope's module set, the look it wears, both faces, and the palette rule its slides must satisfy. Issues mean a division's slides no longer match its own design spec."
      >
        {CONFORMANCE_PRESETS.filter((p) => match(p.name, p.brandModeId, p.packId)).map((p) => {
          const issues = conformanceSpecIssues(p);
          return (
            <div key={p.brandModeId} className={`${card} flex gap-4`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#03002C] dark:text-white">
                  {p.name}
                </p>
                <p className="mt-0.5 text-xs text-[#03002C]/60 dark:text-white/60">
                  {p.brandModeId}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={chip}>{p.moduleIds.length} modules</span>
                  <span className={chip}>
                    light {p.packId ? skinLabel(p.packId) : "brand default"}
                  </span>
                  <span className={chip}>dark {skinLabel(p.darkPackId)}</span>
                  {p.recipe ? <span className={chip}>recipe {p.recipe}</span> : null}
                  <span className={chip}>
                    {p.enterprisePalette ? "enterprise palette" : `own accent ${p.tokens.accent}`}
                  </span>
                  <span className={chip}>
                    {issues.length === 0 ? "conformant" : `${issues.length} issue(s)`}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[#03002C]/60 dark:text-white/60">
                  {p.rationale}
                </p>
                {issues.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-[#EC388A]">
                    {issues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {p.slug ? (
                <Link
                  to="/showcase/$presetId"
                  params={{ presetId: p.slug }}
                  className={`${btn} self-start`}
                >
                  <ExternalLink className="h-3 w-3" /> Open set
                </Link>
              ) : null}
            </div>
          );
        })}
      </Section>
    </main>
  );
}

