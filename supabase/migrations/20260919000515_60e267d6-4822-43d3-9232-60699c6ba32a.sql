GRANT SELECT ON public.languages TO anon;
CREATE POLICY "Active languages readable by anyone" ON public.languages FOR SELECT TO anon USING (active = true);