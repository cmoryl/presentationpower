CREATE TABLE public.team_access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX team_access_attempts_key_time_idx
  ON public.team_access_attempts (client_key, created_at DESC);

GRANT ALL ON public.team_access_attempts TO service_role;

ALTER TABLE public.team_access_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: only server-side privileged code may read or write this table.