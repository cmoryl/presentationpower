CREATE TABLE public.canva_check_gate (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  locked_at timestamptz NOT NULL DEFAULT '2000-01-01T00:00:00Z'::timestamptz
);
GRANT ALL ON public.canva_check_gate TO service_role;
ALTER TABLE public.canva_check_gate ENABLE ROW LEVEL SECURITY;
INSERT INTO public.canva_check_gate (id, locked_at) VALUES (1, '2000-01-01T00:00:00Z'::timestamptz) ON CONFLICT DO NOTHING;