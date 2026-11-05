CREATE TABLE public.internal_job_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);
GRANT ALL ON public.internal_job_tokens TO service_role;
ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_job_tokens(name) VALUES ('logo_scrub') ON CONFLICT DO NOTHING;