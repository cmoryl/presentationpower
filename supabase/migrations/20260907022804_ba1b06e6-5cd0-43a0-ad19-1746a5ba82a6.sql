DROP POLICY IF EXISTS "Active booth templates are readable" ON public.booth_templates;

CREATE POLICY "Active booth templates are readable"
ON public.booth_templates FOR SELECT TO anon, authenticated
USING (is_active);

CREATE POLICY "Admins can read all booth templates"
ON public.booth_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));