// ---------------------------------------------------------------------------
// Division retargeting for the homepage demo decks.
//
// The /demo/deck/$demoId pages ship one authored narrative per demo. A user
// pitching from Legal, Media or Element needs the *same* deck — same slides,
// same numbers, same story beats — wearing another division's brand mode,
// style pack and generated imagery.
//
// `retargetPayload()` is a pure transform over a TemplatePayload: it swaps the
// brand mode + style pack, rewrites the division name wherever the authored
// copy names it, and re-seeds every `mediaSeed` so the background/imagery
// engine renders division-specific art instead of reusing the source plates.
// ---------------------------------------------------------------------------

import type { TemplatePayload } from "./deck-store";
import { applyLexicon, lexiconRules, type LexiconRule } from "./division-lexicon";
import { normalizeLook } from "./look-validate";

export type DemoDivision = {
  /** Canonical bm-* brand mode id. */
  id: string;
  /** Full division name as it should read inside slide copy. */
  name: string;
  /** Short chip label. */
  label: string;
  /** Slug used to seed imagery. */
  slug: string;
  accent: string;
  /** Style pack the retargeted deck should open with. */
  stylePackId: string;
  /**
   * Industry background recipe (R-code) the division's art should paint from.
   * Divisions with an authored plate kit (Gaming = R22) must name it here or
   * the deck falls back to whatever recipe the source narrative carried.
   */
  designRecipeId?: string | null;
  /** Industry stamped into the brief. */
  industry: string;
};

export const DEMO_DIVISIONS: DemoDivision[] = [
  {
    id: "bm-division",
    name: "GlobalLink",
    label: "GlobalLink",
    slug: "globallink",
    accent: "#003FC7",
    stylePackId: "skin-s06",
    industry: "Enterprise localization",
  },
  {
    id: "bm-enterprise",
    name: "TransPerfect",
    label: "Enterprise",
    slug: "enterprise",
    accent: "#003FC7",
    stylePackId: "skin-s02",
    industry: "Enterprise",
  },
  {
    id: "bm-tp-lifesci",
    name: "TransPerfect Life Sciences",
    label: "Life Sciences",
    slug: "lifesci",
    accent: "#58ED21",
    stylePackId: "skin-s14",
    industry: "Life Sciences",
  },
  {
    id: "bm-tp-legal",
    name: "TransPerfect Legal",
    label: "Legal",
    slug: "legal",
    accent: "#3BBEB6",
    stylePackId: "skin-s10",
    industry: "Legal",
  },
  {
    id: "bm-tp-media",
    name: "TransPerfect Media",
    label: "Media",
    slug: "media",
    accent: "#EC388A",
    stylePackId: "skin-s16",
    industry: "Media & Entertainment",
  },
  {
    id: "bm-tp-games",
    name: "TransPerfect Gaming",
    label: "Gaming",
    slug: "gaming",
    accent: "#4ADE80",
    // Gaming wears its own authored plate kit (bm-tp-games, R22): the
    // industry language IS the pack, so no second R recipe rides along.
    stylePackId: "skin-r22",
    designRecipeId: null,
    industry: "Gaming",
  },
  {
    id: "bm-tp-digital",
    name: "TransPerfect Digital",
    label: "Digital",
    slug: "digital",
    accent: "#C2A3FF",
    stylePackId: "skin-s07",
    industry: "Digital marketing",
  },
  {
    id: "bm-trial-interactive",
    name: "Trial Interactive",
    label: "Trial Interactive",
    slug: "trial-interactive",
    accent: "#5CE1E6",
    stylePackId: "skin-s05",
    industry: "eClinical",
  },
  {
    id: "bm-element",
    name: "Element",
    label: "Element",
    slug: "element",
    accent: "#08BFC1",
    stylePackId: "skin-s29",
    industry: "Product marketing",
  },
];

export function demoDivisionById(id: string): DemoDivision | undefined {
  return DEMO_DIVISIONS.find((d) => d.id === id);
}

/** Every division name that authored demo copy may already mention. */
const DIVISION_ALIASES: string[] = [
  ...DEMO_DIVISIONS.map((d) => d.name),
  "TransPerfect Life Sciences",
  "GlobalLink",
];

function rewriteText(text: string, target: DemoDivision, rules: LexiconRule[] = []): string {
  // 1. Domain vocabulary: rewrite the source division's world into the target's
  //    (annexes → exhibit sets, clinician review → attorney review, …). Runs
  //    first so division names inserted in step 2 are never re-matched.
  let out = applyLexicon(text, rules);
  // 2. Division naming. Longest-first so "TransPerfect Life Sciences" wins
  //    over "TransPerfect".
  const aliases = Array.from(new Set(DIVISION_ALIASES)).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (alias === target.name) continue;
    out = out.split(alias).join(target.name);
  }
  return out;
}

function rewriteValue(
  value: unknown,
  target: DemoDivision,
  seedSuffix: string,
  rules: LexiconRule[],
  key?: string,
): unknown {
  if (typeof value === "string") {
    if (key === "mediaSeed" || key === "seed" || key === "imageSeed") {
      return `${value}-${seedSuffix}`;
    }
    return rewriteText(value, target, rules);
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteValue(v, target, seedSuffix, rules));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteValue(v, target, seedSuffix, rules, k);
    }
    return out;
  }
  return value;
}

/** Which division authored a payload, so we know which vocabulary to translate from. */
function sourceDivision(payload: TemplatePayload): DemoDivision | undefined {
  const byMode = payload.brandModeId
    ? DEMO_DIVISIONS.find((d) => d.id === payload.brandModeId)
    : undefined;
  if (byMode) return byMode;
  const industry = payload.brief?.industry ?? "";
  return DEMO_DIVISIONS.find((d) => d.industry === industry);
}

/** Deck title for a retargeted demo — stable, so copies are reused not duplicated. */
export function retargetedTitle(baseTitle: string, target: DemoDivision): string {
  const core = baseTitle.replace(/^[^·]+·\s*/, "").replace(/\s*\(demo\)$/, "");
  return `${target.label} · ${core} (demo)`;
}

export function retargetPayload(payload: TemplatePayload, target: DemoDivision): TemplatePayload {
  const seedSuffix = target.slug;
  const from = sourceDivision(payload);
  const rules = from ? lexiconRules(from.slug, target.slug) : [];
  const slides = payload.slides.map((s) => ({
    ...s,
    content: rewriteValue(s.content, target, seedSuffix, rules) as typeof s.content,
    notes: s.notes ? rewriteText(s.notes, target, rules) : s.notes,
  }));

  // Keep the source recipe only when the target division has no authored
  // background family of its own. An explicit `null` clears it, so design-led
  // divisions never inherit the source industry plates. The pairing is then
  // validated so a division can never end up wearing another sector's ground.
  const wantedRecipe =
    target.designRecipeId === null
      ? null
      : (target.designRecipeId ??
        (payload.context?.designRecipeId as string | null | undefined) ??
        null);
  const look = normalizeLook({
    stylePackId: target.stylePackId,
    designRecipeId: wantedRecipe,
    industry: target.industry,
  });
  const mismatched = look.issues.some((i) => i.code === "industry-mismatch");

  return {
    ...payload,
    title: retargetedTitle(payload.title, target),
    brandModeId: target.id,
    context: {
      ...(payload.context ?? {}),
      stylePackId: look.stylePackId ?? undefined,
      // An inherited recipe from another sector is dropped rather than shipped;
      // a recipe the division names itself always wins.
      designRecipeId: mismatched && !target.designRecipeId ? null : look.designRecipeId,
    },
    slides,
    brief: payload.brief
      ? {
          ...payload.brief,
          industry: target.industry,
          audience: rewriteText(payload.brief.audience ?? "", target, rules),
          meetingObjective: rewriteText(payload.brief.meetingObjective ?? "", target, rules),
        }
      : payload.brief,
  };
}
