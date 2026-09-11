ALTER TABLE public.london_live_files
  ADD COLUMN IF NOT EXISTS print_path text,
  ADD COLUMN IF NOT EXISTS print_filename text;