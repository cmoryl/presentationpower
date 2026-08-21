UPDATE public.decks SET brand_mode_id = 'bm-element', updated_at = now()
WHERE title ILIKE '%Element%Platform Overview%' AND brand_mode_id IS DISTINCT FROM 'bm-element';