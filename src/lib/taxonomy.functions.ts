import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { enrichBrandProfile } from "./brand-profiles";
import type {
  BrandMode,
  ModuleFamily,
  SectionFramework,
  LayoutFramework,
  ModuleVariant,
  NarrativeArchetype,
} from "./taxonomy";

export type TaxonomyPayload = {
  brandModes: BrandMode[];
  moduleFamilies: ModuleFamily[];
  sectionFrameworks: SectionFramework[];
  layoutFrameworks: LayoutFramework[];
  moduleVariants: ModuleVariant[];
  narrativeArchetypes: NarrativeArchetype[];
};

export const getTaxonomy = createServerFn({ method: "GET" }).handler(
  async (): Promise<TaxonomyPayload> => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const [bm, mf, sf, lf, mv, na] = await Promise.all([
      supabase.from("brand_modes").select("*").order("id"),
      supabase.from("module_families").select("*").order("id"),
      supabase.from("section_frameworks").select("*").order("id"),
      supabase.from("layout_frameworks").select("*").order("id"),
      supabase.from("module_variants").select("*").order("id"),
      supabase.from("narrative_archetypes").select("*").order("id"),
    ]);

    const err = bm.error || mf.error || sf.error || lf.error || mv.error || na.error;
    if (err) throw new Error(err.message);

    return {
      brandModes: (bm.data ?? []).map((r) => {
        const profile = enrichBrandProfile(r.id, r.name);
        return {
          id: r.id,
          name: r.name,
          description: r.description ?? "",
          tokens: (r.tokens as BrandMode["tokens"]) ?? { primary: "", accent: "", surface: "", ink: "" },
          role: profile.role,
          parentId: profile.parentId,
          logo: profile.logo,
          contentScope: profile.contentScope,
        };
      }),
      moduleFamilies: (mf.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        reviewLevel: (r.review_level as ModuleFamily["reviewLevel"]) ?? "standard",
      })),
      sectionFrameworks: (sf.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        purpose: r.purpose ?? "",
        permittedFamilyIds: r.permitted_family_ids ?? [],
      })),
      layoutFrameworks: (lf.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        zones: r.zones ?? [],
      })),
      moduleVariants: (mv.data ?? []).map((r) => ({
        id: r.id,
        familyId: r.family_id,
        name: r.name,
        description: r.description ?? "",
        permittedLayoutIds: r.permitted_layout_ids ?? [],
        capacity: (r.capacity as ModuleVariant["capacity"]) ?? {},
        fallbackVariantId: r.fallback_variant_id ?? undefined,
        editableFields: r.editable_fields ?? [],
        lockedFields: r.locked_fields ?? [],
      })),
      narrativeArchetypes: (na.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        sectionRecipe: r.section_recipe ?? [],
      })),
    };
  },
);
