with p as (
  select distinct s2.path
  from imported_decks d,
       jsonb_array_elements(d.slides) s,
       jsonb_array_elements_text(s->'imagePaths') s2(path)
  where d.id = 'c05e6eb4-6537-4856-9d4b-22a4f5337df3'
)
update division_imagery di
set note = replace(di.note, 'deck.pptx', 'TransPerfect_General_Slides.pptx'),
    filename = replace(di.filename, 'deck__', 'TransPerfect_General_Slides__'),
    tags = (select array_agg(distinct t) from unnest(coalesce(di.tags, '{}') || array['TransPerfect_General_Slides.pptx']) t)
from p
where di.storage_path = p.path
  and (di.note like '%deck.pptx%' or di.filename like 'deck__%');