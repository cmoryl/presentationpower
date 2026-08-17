CREATE OR REPLACE FUNCTION public.style_profile_aggregate(_profile_key text)
RETURNS TABLE(style_code text, raw numeric, samples bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.style_code,
         SUM(e.polarity * POWER(0.5, EXTRACT(EPOCH FROM (now() - e.created_at)) / 86400.0 / 60.0))::numeric AS raw,
         COUNT(*)::bigint AS samples
  FROM public.style_reco_events e
  WHERE e.learnable
    AND e.profile_key = _profile_key
    AND e.style_code IS NOT NULL
    AND e.polarity <> 0
    AND e.created_at > now() - interval '365 days'
  GROUP BY e.style_code
$$;

REVOKE ALL ON FUNCTION public.style_profile_aggregate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.style_profile_aggregate(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.style_expansion_scan(_min_obs integer DEFAULT 6)
RETURNS TABLE(profile_key text, style_codes text[], observations bigint, evidence jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH picks AS (
    SELECT e.profile_key AS pk,
           e.style_code AS code,
           COUNT(*)::bigint AS hits,
           COUNT(DISTINCT e.user_id)::bigint AS users
    FROM public.style_reco_events e
    WHERE e.learnable
      AND e.polarity > 0
      AND e.style_code IS NOT NULL
      AND e.profile_key <> ''
      AND e.created_at > now() - interval '180 days'
    GROUP BY e.profile_key, e.style_code
  ), ranked AS (
    SELECT p.*, ROW_NUMBER() OVER (PARTITION BY p.pk ORDER BY p.hits DESC, p.code) AS rn
    FROM picks p
  )
  SELECT r.pk,
         ARRAY_AGG(r.code ORDER BY r.hits DESC, r.code) AS style_codes,
         SUM(r.hits)::bigint AS observations,
         jsonb_build_object(
           'picks', jsonb_agg(jsonb_build_object('style', r.code, 'hits', r.hits, 'users', r.users) ORDER BY r.hits DESC),
           'distinctUsers', MAX(r.users)
         ) AS evidence
  FROM ranked r
  WHERE r.rn <= 2
  GROUP BY r.pk
  HAVING SUM(r.hits) >= _min_obs;
END;
$$;

REVOKE ALL ON FUNCTION public.style_expansion_scan(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.style_expansion_scan(integer) TO authenticated, service_role;