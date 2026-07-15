
GRANT SELECT ON public.brand_modes TO anon, authenticated;
GRANT SELECT ON public.module_families TO anon, authenticated;
GRANT SELECT ON public.section_frameworks TO anon, authenticated;
GRANT SELECT ON public.layout_frameworks TO anon, authenticated;
GRANT SELECT ON public.module_variants TO anon, authenticated;
GRANT SELECT ON public.narrative_archetypes TO anon, authenticated;
GRANT ALL ON public.brand_modes, public.module_families, public.section_frameworks, public.layout_frameworks, public.module_variants, public.narrative_archetypes TO service_role;
