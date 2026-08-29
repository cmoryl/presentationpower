// ---------------------------------------------------------------------------
// DIVISION RUN
//
// The fit engine PLANS a run (which module wins each section, on which face,
// wearing which approved pack). This module BUILDS that run — it seeds real
// slide content, mounts each winner on the canonical 1920×1080 export stage,
// and then compares what actually rendered against the division's spec.
//
// Planning is cheap and pure; building is where drift shows up. A slide can win
// on paper and still land wearing the wrong pack, on the wrong face, with copy
// running past the stage. Everything below is that comparison.
// ---------------------------------------------------------------------------

import { BRAND_MODES, MODULE_VARIANTS, type BrandMode, type ModuleVariant } from "./taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "./library-preview";
import { stylePackById, type StylePack } from "./style-packs";
import { STAGE_H, STAGE_W } from "./export-quality";
import type { DivisionFitPlan, DivisionSlidePlan } from "./division-fit-engine";

export type BuiltDivisionSlide = {
  plan: DivisionSlidePlan;
  variant: ModuleVariant;
  brand: BrandMode;
  pack: StylePack | null;
  mode: "light" | "dark";
  /** Seeded slide record, the same shape the editor and exporter consume. */
  slide: Record<string, unknown>;
};

export type StageCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type StageAudit = {
  index: number;
  sectionId: string;
  variantId: string;
  packId: string;
  face: "light" | "dark";
  ok: boolean;
  checks: StageCheck[];
  /** Measured elements on the stage. */
  entries: number;
  /** Placement digest, so two runs of the same plan can be compared. */
  digest: string | null;
  problems: string[];
  error?: string;
};

export type DivisionRunReport = {
  brandModeId: string;
  name: string;
  slides: StageAudit[];
  builtCount: number;
  passCount: number;
  problems: string[];
};

/** Resolve one planned slide into a mountable, content-seeded slide record. */
export function buildDivisionSlide(plan: DivisionSlidePlan, brandModeId: string): BuiltDivisionSlide | null {
  const variantId = plan.best?.variantId;
  if (!variantId) return null;
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  if (!variant) return null;
  const brand = BRAND_MODES.find((b) => b.id === brandModeId) ?? BRAND_MODES[0];
  const pack = stylePackById(plan.packId);
  // The face the run planned is authoritative: a pack may publish its own mode
  // but the deck decided light/dark, and the stage must honour the deck.
  const mode = plan.face;
  const brief = resolveDivisionBrief(brand);
  const content = seedDivisionContent(variant.id, brief, plan.sectionName, brand) as Record<
    string,
    unknown
  >;
  return {
    plan,
    variant,
    brand,
    pack,
    mode,
    slide: {
      id: `run-${plan.index}-${variant.id}`,
      position: plan.index,
      sectionId: plan.sectionId,
      variantId: variant.id,
      layoutId: plan.best?.layoutId ?? variant.permittedLayoutIds[0],
      content,
      changes: [],
    },
  };
}

export function buildDivisionRun(plan: DivisionFitPlan): BuiltDivisionSlide[] {
  return plan.slides
    .map((s) => buildDivisionSlide(s, plan.brandModeId))
    .filter((s): s is BuiltDivisionSlide => Boolean(s));
}

function norm(color: string): string {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return color.trim().toLowerCase();
  const parts = m[1].split(",").map((p) => Number(p.trim()));
  const hex = parts
    .slice(0, 3)
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

/**
 * Compare a mounted stage against the plan that asked for it. Pure DOM reads —
 * nothing here mutates the tree, so it is safe to run before a rasterisation.
 */
export type StageExpectation = {
  variantId: string;
  packId: string;
  pack: StylePack | null;
  mode: "light" | "dark";
  /** Winner sits inside the division's conformance set. */
  inSpec: boolean;
};

export function auditStageAgainstSpec(stage: HTMLElement, built: BuiltDivisionSlide): StageCheck[] {
  return auditStageAgainstExpectation(stage, {
    variantId: built.variant.id,
    packId: built.plan.packId,
    pack: built.pack,
    mode: built.mode,
    inSpec: built.plan.inSpec,
  });
}

/** The same seven checks, against any expectation — plan-built or deck-built. */
export function auditStageAgainstExpectation(
  stage: HTMLElement,
  expect: StageExpectation,
): StageCheck[] {
  const checks: StageCheck[] = [];
  const { pack, mode } = expect;
  const plan = { packId: expect.packId, inSpec: expect.inSpec };
  const variant = { id: expect.variantId };

  const stageVariant = stage.getAttribute("data-variant-id");
  checks.push({
    id: "variant",
    label: "Rendered module matches the winner",
    ok: stageVariant === variant.id,
    detail: `stage ${stageVariant ?? "none"} · planned ${variant.id}`,
  });

  const packHost = stage.querySelector<HTMLElement>("[data-style-pack]");
  const stagePack = packHost?.getAttribute("data-style-pack") ?? null;
  checks.push({
    id: "pack",
    label: "Wears the division's approved pack",
    ok: Boolean(pack) && stagePack === plan.packId,
    detail: `stage ${stagePack ?? "no pack"} · spec ${plan.packId}`,
  });

  const isDarkClass = stage.classList.contains("dark");
  checks.push({
    id: "face",
    label: "Renders on the planned face",
    ok: isDarkClass === (mode === "dark"),
    detail: `stage ${isDarkClass ? "dark" : "light"} · planned ${mode}`,
  });

  if (pack) {
    const bg = norm(getComputedStyle(stage).backgroundColor);
    const want = norm(pack.tokens.surface);
    checks.push({
      id: "surface",
      label: "Stage surface is the pack surface token",
      ok: bg === want,
      detail: `${bg} · token ${want}`,
    });
    const readability = packHost?.getAttribute("data-pack-readability") ?? "unknown";
    checks.push({
      id: "readability",
      label: "Pack ink clears the readability guard unaided",
      ok: readability === "pass",
      detail: readability === "pass" ? "pass" : `guard applied: ${readability}`,
    });
  }

  const contentPlane = stage.querySelector<HTMLElement>("[data-slide-content-plane]");
  checks.push({
    id: "content-plane",
    label: "Content plane mounted",
    ok: Boolean(contentPlane),
    detail: contentPlane ? "present" : "missing",
  });

  // Overflow: any measurable node whose box escapes the stage by more than a
  // rounding tolerance means the copy-fit pass failed for this brief.
  const box = stage.getBoundingClientRect();
  const sx = box.width > 0 ? STAGE_W / box.width : 1;
  const sy = box.height > 0 ? STAGE_H / box.height : 1;
  const TOL = 2;
  let worst = 0;
  let worstKey = "";
  const nodes = Array.from(
    stage.querySelectorAll<HTMLElement>(
      "[data-slide-content-plane] *, [data-slide-footer-plane] *, [data-slide-logo-plane] *",
    ),
  );
  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const over = Math.max(
      (box.left - r.left) * sx,
      (r.right - box.right) * sx,
      (box.top - r.top) * sy,
      (r.bottom - box.bottom) * sy,
    );
    if (over > worst) {
      worst = over;
      worstKey = node.getAttribute("data-plane") ?? node.tagName.toLowerCase();
    }
  }
  checks.push({
    id: "overflow",
    label: "Nothing runs past the stage",
    ok: worst <= TOL,
    detail: worst <= TOL ? "inside bounds" : `${worstKey} escapes by ${Math.round(worst)}px`,
  });

  checks.push({
    id: "conformance",
    label: "Winner sits in the division conformance set",
    ok: plan.inSpec,
    detail: plan.inSpec ? "in set" : "outside the set — needs a spec decision",
  });

  return checks;
}

export type RunStagesOptions = {
  /** Report progress as each slide is mounted. */
  onProgress?: (done: number, total: number) => void;
};

/**
 * Build and mount every planned slide, then compare each stage to the spec.
 * Sequential by design: each mount is a full-size tree with imagery, and
 * parallel mounts starve the compositor and produce half-painted stages.
 */
export async function runDivisionStages(
  plan: DivisionFitPlan,
  opts: RunStagesOptions = {},
): Promise<DivisionRunReport> {
  const built = buildDivisionRun(plan);
  const slides: StageAudit[] = [];
  const { withExactStage } = await import("./slide-exact-raster");
  const { capturePlacement } = await import("./export-placement");

  for (let i = 0; i < built.length; i += 1) {
    const item = built[i];
    const base: StageAudit = {
      index: item.plan.index,
      sectionId: item.plan.sectionId,
      variantId: item.variant.id,
      packId: item.plan.packId,
      face: item.mode,
      ok: false,
      checks: [],
      entries: 0,
      digest: null,
      problems: [],
    };
    try {
      const out = await withExactStage(
        {
          slide: item.slide,
          variant: item.variant,
          brand: item.brand,
          mode: item.mode,
          pack: item.pack,
          industryId: item.plan.recipe,
        },
        (stage) => {
          const checks = auditStageAgainstSpec(stage, item);
          const shot = capturePlacement(stage, {
            designWidth: STAGE_W,
            designHeight: STAGE_H,
          });
          return { checks, entries: shot.entries.length, digest: shot.digest };
        },
      );
      if (!out) {
        slides.push({ ...base, problems: ["stage failed to mount"] });
      } else {
        const problems = out.checks.filter((c) => !c.ok).map((c) => `${c.label} — ${c.detail}`);
        if (out.entries === 0) problems.push("nothing measurable on stage");
        slides.push({
          ...base,
          ok: problems.length === 0,
          checks: out.checks,
          entries: out.entries,
          digest: out.digest,
          problems,
        });
      }
    } catch (err) {
      slides.push({
        ...base,
        problems: ["threw while mounting"],
        error: err instanceof Error ? err.message : String(err),
      });
    }
    opts.onProgress?.(i + 1, built.length);
  }

  const problems: string[] = [];
  const missing = plan.slides.length - built.length;
  if (missing > 0) problems.push(`${missing} planned slide(s) had no buildable module.`);
  const failed = slides.filter((s) => !s.ok);
  if (failed.length === 0 && slides.length > 0)
    problems.push("Every built stage matches the division spec.");
  else
    for (const f of failed)
      problems.push(`${f.index + 1}. ${f.variantId}: ${f.problems.join("; ")}`);

  return {
    brandModeId: plan.brandModeId,
    name: plan.name,
    slides,
    builtCount: built.length,
    passCount: slides.filter((s) => s.ok).length,
    problems,
  };
}
