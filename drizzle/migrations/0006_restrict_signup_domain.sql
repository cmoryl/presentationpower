CREATE OR REPLACE FUNCTION public.enforce_signup_domain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.email, '')) LIKE '%@transperfect.com'
     OR lower(coalesce(NEW.email, '')) = 'team@presentationpower.app' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Sign-up is limited to @transperfect.com email addresses.' USING ERRCODE = '42501';
END $$;

CREATE TRIGGER enforce_signup_domain
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_signup_domain();