CREATE TABLE public.template_intakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  brief TEXT NOT NULL DEFAULT '',
  base_skin_code TEXT NOT NULL DEFAULT 'S01',
  mode_intent TEXT NOT NULL DEFAULT 'auto',
  stage TEXT NOT NULL DEFAULT 'assets',
  assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  approvals JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_id UUID NULL REFERENCES public.custom_templates(id) ON DELETE SET NULL,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX template_intakes_code_key ON public.template_intakes (upper(code));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_intakes TO authenticated;
GRANT ALL ON public.template_intakes TO service_role;

ALTER TABLE public.template_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage template intakes"
ON public.template_intakes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_template_intakes_updated_at
BEFORE UPDATE ON public.template_intakes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins read intake assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'template-intake' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write intake assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'template-intake' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update intake assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'template-intake' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete intake assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'template-intake' AND public.has_role(auth.uid(), 'admin'));