DELETE FROM public.glossary_terms
WHERE scope = 'global'
  AND term IN ('TransPerfect Financial','TransPerfect Travel','TransPerfect Manufacturing','TransPerfect Connect');

INSERT INTO public.glossary_terms (scope, term, do_not_translate)
VALUES
  ('global', 'TransPerfect Digital', true),
  ('global', 'Trial Interactive',    true)
ON CONFLICT DO NOTHING;