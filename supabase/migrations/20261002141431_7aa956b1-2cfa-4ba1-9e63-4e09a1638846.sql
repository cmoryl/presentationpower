UPDATE public.deck_slides SET variant_id='MV-COMPARE-SLIDER', layout_id='LF-15', content = jsonb_build_object(
 'title','Translation Memory',
 'subtitle','AI-enhanced · Never pay to translate the same phrase twice · Improved quality and consistency · Faster time-to-market',
 '__extras', content->'__extras',
 'before', jsonb_build_object('label','Match Type','headline','Fuzzy','rows', jsonb_build_array(
    jsonb_build_object('label','Text','value','Please consult with your healthcare professional.'),
    jsonb_build_object('label','TM Match','value','Please consult with your healthcare provider.'))),
 'after', jsonb_build_object('label','Match Type','headline','Exact','rows', jsonb_build_array(
    jsonb_build_object('label','Text','value','Take one tablet daily with food.'),
    jsonb_build_object('label','TM Match','value','Take one tablet daily with food.'))))
WHERE deck_id='7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001' AND position=25;