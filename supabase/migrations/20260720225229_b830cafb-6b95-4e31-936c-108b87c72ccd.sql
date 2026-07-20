
UPDATE public.brand_asset_chunks SET division_id = CASE division_id
  WHEN 'globallink' THEN 'bm-division'
  WHEN 'global' THEN 'bm-enterprise'
  WHEN 'master' THEN 'bm-enterprise'
  WHEN 'life-sciences' THEN 'bm-tp-lifesci'
  WHEN 'dataforce' THEN 'bm-product'
  WHEN 'media' THEN 'bm-tp-media'
  WHEN 'gaming' THEN 'bm-tp-games'
  WHEN 'legal' THEN 'bm-tp-legal'
  ELSE division_id
END
WHERE division_id IN ('globallink','global','master','life-sciences','dataforce','media','gaming','legal');

UPDATE public.brand_assets SET division_id = CASE division_id
  WHEN 'globallink' THEN 'bm-division'
  WHEN 'global' THEN 'bm-enterprise'
  WHEN 'master' THEN 'bm-enterprise'
  WHEN 'life-sciences' THEN 'bm-tp-lifesci'
  WHEN 'dataforce' THEN 'bm-product'
  WHEN 'media' THEN 'bm-tp-media'
  WHEN 'gaming' THEN 'bm-tp-games'
  WHEN 'legal' THEN 'bm-tp-legal'
  ELSE division_id
END
WHERE division_id IN ('globallink','global','master','life-sciences','dataforce','media','gaming','legal');
