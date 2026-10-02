update public.deck_slides d set content = jsonb_set(d.content,'{items}',(
 select jsonb_agg(it || jsonb_build_object('logoWhite','/masters/general-slides/logos-white/'||regexp_replace(regexp_replace(it->>'logoPath','^.*/',''),'\.[a-z]+$','')||'-white.png') order by o)
 from jsonb_array_elements(d.content->'items') with ordinality x(it,o)))
where deck_id='7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001' and position in (3,4);