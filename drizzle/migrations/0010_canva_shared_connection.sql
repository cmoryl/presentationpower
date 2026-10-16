CREATE TABLE public.canva_shared_connection (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  connected_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.canva_shared_connection TO service_role;
ALTER TABLE public.canva_shared_connection ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.canva_oauth_states (
  state text PRIMARY KEY,
  verifier text NOT NULL,
  user_id uuid NOT NULL,
  return_to text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.canva_oauth_states TO service_role;
ALTER TABLE public.canva_oauth_states ENABLE ROW LEVEL SECURITY;