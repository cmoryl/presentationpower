// ---------------------------------------------------------------------------
// Deterministic deck origination.
//
// `generate_deck` needs a model, and therefore a secret. External clients still
// need a deck to exist before `insert_slide` has anything to point at, so this
// module expands a narrative archetype into an ordered, empty slide plan with
// no model call at all: pure taxonomy resolution, same input → same output.
//
// The plan is computed before anything is written, so an impermissible
// variant/section pairing fails with a clear message instead of leaving a
// half-built deck behind.
// ---------------------------------------------------------------------------

import {
  BRAND_MODES,
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  NARRATIVE_ARCHETYPES,
  SECTION_FRAMEWORKS,
  byId,
  variantsForSection,
} from "./taxonomy";
import { BRAND_PROFILES } from "./brand-profiles";

export type PlannedSlide = {
  position: number;
  sectionId: string;
  sectionName: string;
  variantId: string;
  variantName: string;
  layoutId: string;
  /** Why this variant: caller-supplied, division-preferred, or first permitted. */
  chosenBy: "explicit" | "division-preferred" | "default";
};

export type OriginatePlan = {
  title: string;
  brandModeId: string;
  archetypeId: string | null;
  slides: PlannedSlide[];
};

export type PlanResult =
  | { ok: true; value: OriginatePlan }
  | { ok: false; error: string };

/** An explicit slide request: a section, optionally pinned to a variant. */
export type SlideRequest = { section_id: string; variant_id?: string };

export type OriginateInput = {
  brand_mode_id: string;
  archetype_id?: string;
  /** Overrides the archetype recipe when supplied. */
  slides?: SlideRequest[];
  /** Restrict/reorder the archetype recipe to these sections. */
  section_framework_ids?: string[];
  title?: string;
  client_name?: string;
};

function defaultTitle(input: OriginateInput): string {
  const archetype = input.archetype_id ? byId(NARRATIVE_ARCHETYPES, input.archetype_id) : null;
  const stem = archetype?.name ?? "Presentation";
  return input.client_name ? `${input.client_name} — ${stem}` : stem;
}

/**
 * Resolve one section to a concrete variant + layout. Rejects a variant whose
 * family the section framework does not permit, naming both so the caller can
 * fix it without reading the taxonomy source.
 */
function pickVariant(
  sectionId: string,
  explicit: string | undefined,
  preferred: Set<string>,
): { ok: true; value: Omit<PlannedSlide, "position"> } | { ok: false; error: string } {
  const section = byId(SECTION_FRAMEWORKS, sectionId);
  if (!section) return { ok: false, error: `Unknown section_framework_id ${sectionId}` };

  const permitted = variantsForSection(sectionId);
  if (!permitted.length) {
    return { ok: false, error: `Section ${sectionId} (${section.name}) permits no module variants` };
  }

  let chosen = permitted[0];
  let chosenBy: PlannedSlide["chosenBy"] = "default";

  if (explicit) {
    const match = permitted.find((v) => v.id === explicit);
    if (!match) {
      const known = byId(MODULE_VARIANTS, explicit);
      if (!known) return { ok: false, error: `Unknown variant_id ${explicit}` };
      const family = byId(MODULE_FAMILIES, known.familyId);
      return {
        ok: false,
        error:
          `Variant ${explicit} belongs to family ${known.familyId} (${family?.name ?? "unknown"}), ` +
          `which section ${sectionId} (${section.name}) does not permit. ` +
          `Permitted families: ${section.permittedFamilyIds.join(", ")}.`,
      };
    }
    chosen = match;
    chosenBy = "explicit";
  } else {
    const pref = permitted.find((v) => preferred.has(v.id));
    if (pref) {
      chosen = pref;
      chosenBy = "division-preferred";
    }
  }

  return {
    ok: true,
    value: {
      sectionId,
      sectionName: section.name,
      variantId: chosen.id,
      variantName: chosen.name,
      layoutId: chosen.permittedLayoutIds[0],
      chosenBy,
    },
  };
}

/** Expand input into an ordered plan, or explain exactly why it cannot. */
export function planDeck(input: OriginateInput): PlanResult {
  if (!byId(BRAND_MODES, input.brand_mode_id)) {
    return {
      ok: false,
      error: `Unknown brand_mode_id ${input.brand_mode_id}. Call get_taxonomy for the division list.`,
    };
  }

  const profile = BRAND_PROFILES[input.brand_mode_id];
  const preferred = new Set(profile?.contentScope.preferredVariantIds ?? []);
  const restricted = new Set(profile?.contentScope.restrictedFamilyIds ?? []);

  let requests: SlideRequest[];
  if (input.slides?.length) {
    requests = input.slides;
  } else {
    if (!input.archetype_id) {
      return { ok: false, error: "Supply either archetype_id or an explicit slides list." };
    }
    const archetype = byId(NARRATIVE_ARCHETYPES, input.archetype_id);
    if (!archetype) {
      return {
        ok: false,
        error: `Unknown archetype_id ${input.archetype_id}. Call get_taxonomy for the archetype list.`,
      };
    }
    let recipe = archetype.sectionRecipe;
    if (input.section_framework_ids?.length) {
      const keep = new Set(input.section_framework_ids);
      const filtered = recipe.filter((s) => keep.has(s));
      if (!filtered.length) {
        return {
          ok: false,
          error:
            `None of the requested section_framework_ids appear in archetype ${archetype.id}'s ` +
            `recipe (${recipe.join(", ")}).`,
        };
      }
      recipe = filtered;
    }
    requests = recipe.map((section_id) => ({ section_id }));
  }

  if (!requests.length) return { ok: false, error: "Deck plan resolved to zero slides." };

  const slides: PlannedSlide[] = [];
  for (const [index, req] of requests.entries()) {
    const picked = pickVariant(req.section_id, req.variant_id, preferred);
    if (!picked.ok) return { ok: false, error: picked.error };
    const variant = byId(MODULE_VARIANTS, picked.value.variantId);
    if (variant && restricted.has(variant.familyId)) {
      return {
        ok: false,
        error:
          `Variant ${variant.id} is in family ${variant.familyId}, which division ` +
          `${input.brand_mode_id} does not use.`,
      };
    }
    slides.push({ position: index, ...picked.value });
  }

  return {
    ok: true,
    value: {
      title: input.title?.trim() || defaultTitle(input),
      brandModeId: input.brand_mode_id,
      archetypeId: input.slides?.length ? (input.archetype_id ?? null) : (input.archetype_id ?? null),
      slides,
    },
  };
}
