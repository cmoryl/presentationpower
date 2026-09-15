ALTER TABLE public.next_city_badge_versions DROP CONSTRAINT IF EXISTS next_city_badge_versions_face_check;
UPDATE public.next_city_badge_versions SET face = 'next' WHERE face IN ('dark','light');
ALTER TABLE public.next_city_badge_versions ADD CONSTRAINT next_city_badge_versions_face_check CHECK (face = 'next');
ALTER TABLE public.next_city_badge_versions ALTER COLUMN face SET DEFAULT 'next';