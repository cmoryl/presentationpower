CREATE TABLE public.next_brand_kit_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE CHECK (length(token) >= 16),
  label text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.next_brand_kit_shares TO authenticated;
GRANT ALL ON public.next_brand_kit_shares TO service_role;
ALTER TABLE public.next_brand_kit_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brand admins manage NEXT kit shares" ON public.next_brand_kit_shares
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_lead'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'brand_lead'));

CREATE OR REPLACE FUNCTION public.get_next_brand_kit_share(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _token IS NULL OR length(_token) < 16 THEN jsonb_build_object('status','invalid')
    ELSE COALESCE((
      SELECT jsonb_build_object(
        'status', CASE WHEN s.revoked THEN 'revoked' WHEN s.expires_at < now() THEN 'expired' ELSE 'valid' END,
        'expires_at', s.expires_at)
      FROM public.next_brand_kit_shares s WHERE s.token = _token
    ), jsonb_build_object('status','invalid'))
  END
$$;
GRANT EXECUTE ON FUNCTION public.get_next_brand_kit_share(text) TO anon, authenticated;