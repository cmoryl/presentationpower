INSERT INTO public.custom_templates (code, name, reference, description, best_fit, mode, palette, typography, surface_note, imagery, density, base_skin_code, spec, status, notes)
VALUES (
  'ELEMENT-1',
  'Element Build System',
  'TRANSPERFECT ELEMENT · APPLICATION BUILD',
  'The Element application build look for external marketing: paper-white field, five-brick spectrum accents and modular block structure taken straight from the product UI.',
  'Element external marketing · platform launches · partner enablement · product storytelling',
  'light',
  ARRAY['#FFFFFF','#0D131D','#135CFB','#08BFC1','#7C4EF4'],
  'Modular display · confident systematic labels',
  'Light paper field · lifted brick cards · saturated colour blocks',
  'Modular bricks · system diagrams · product UI crops',
  'Medium',
  'S29',
  'GRADIENT G02 / G05  ·  OPACITY O16–82  ·  TYPE T03  ·  LAYOUT L09 / L10  ·  ICON I03',
  'published',
  'Seeded from the approved S29 Element System skin. Uses the Element lockup, never the TransPerfect wordmark.'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  reference = EXCLUDED.reference,
  description = EXCLUDED.description,
  best_fit = EXCLUDED.best_fit,
  mode = EXCLUDED.mode,
  palette = EXCLUDED.palette,
  typography = EXCLUDED.typography,
  surface_note = EXCLUDED.surface_note,
  imagery = EXCLUDED.imagery,
  density = EXCLUDED.density,
  base_skin_code = EXCLUDED.base_skin_code,
  spec = EXCLUDED.spec,
  status = 'published',
  notes = EXCLUDED.notes;