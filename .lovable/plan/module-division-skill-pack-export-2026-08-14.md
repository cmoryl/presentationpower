# Module + Division Skill Pack Export

Goal: one downloadable folder you can drop into a Claude project as a skill, containing everything this app uses to populate modules per division — described in markdown for Claude, and mirrored as JSON for machine reading.

## Where the data actually lives

Confirmed by reading the code and querying the database:

- Module system lives in code (`src/lib/taxonomy.ts`): 189 module variants, plus families, layout frameworks, section frameworks, narrative archetypes, and 11 brand modes.
- Division identity lives in `src/lib/brand-profiles.ts` (role, parent, logo lockups, content scope) and `src/lib/division-logos.ts`.
- Content the modules get filled with lives partly in code (`case-studies.ts`, `enterprise-grounds.ts`, `style-packs.ts`, `iconography.ts`, `imagery-library.ts`) and partly in the database.
- Database today: `module_variants` 189 rows, `division_imagery` 910, `client_logos` 392, `brand_modes` 11, `knowledge_entries` 386. `module_variant_samples` has only 1 row, `division_stats`/`division_quotes`/`slide_modules` are empty — so per-division sample copy is currently code-driven, not DB-driven. The export will say this plainly rather than imply a rich sample table exists.

## What gets produced

A folder under generated files: `module-skill-pack/`

```text
module-skill-pack/
  SKILL.md                     how the module + division system works, how to use the JSON
  reference/
    modules.md                 all 189 variants grouped by family, with capacity + editable fields
    divisions.md               each division: palette, logos, content scope, imagery counts
    content-rules.md           iconography, style packs, layout zones, review levels
  data/
    taxonomy.json              brand modes, families, section + layout frameworks, archetypes
    module-variants.json       189 variants: ids, family, capacity, permitted layouts, fields
    divisions.json             brand profiles merged with palette tokens + logo lockups
    module-samples.json        module_variant_samples rows (+ note on sparsity)
    imagery.json               division_imagery 910 rows (metadata + URLs, no binaries)
    client-logos.json          392 logo records
    case-studies.json          case studies + enterprise grounds
    style-packs.json           style packs, motifs, iconography contracts
    knowledge.json             386 knowledge entries + brand intelligence
    palette.json               NEXT 2026 per-division hex/RGB/CMYK/Pantone
  manifest.json                row counts, source files, generated-at timestamp
```

Also delivered as a single `module-skill-pack.zip` so it can be attached in one step.

## How it's built

- A Node script (`scripts/export-skill-pack.ts`) imports the taxonomy/brand/content modules directly so exported values are exactly what the app renders — no re-typing.
- Database portions are pulled with read-only queries against `module_variants`, `module_variant_samples`, `division_imagery`, `client_logos`, `brand_modes`, `knowledge_entries`, `brand_intelligence`.
- Markdown files are generated from the same in-memory data, so md and JSON can't drift.
- Image/logo binaries are not copied; records keep their public URLs and slugs.
- Output is written to the generated-files area and zipped; the script is re-runnable whenever the taxonomy changes.

## Verification before delivery

- Assert counts: 189 variants, 11 brand modes, 910 imagery, 392 logos, 386 knowledge entries; fail loudly on mismatch.
- Assert every variant's `familyId` and `permittedLayoutIds` resolve to real families/layouts, and every division referenced by content exists in `divisions.json`.
- Spot-read `SKILL.md` and two reference pages for truncation or empty sections.
