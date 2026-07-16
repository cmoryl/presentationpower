# BrandHub → Presentation Power System — Knowledge Bundle

Self-contained export of BrandHub's knowledge base + Oracle intelligence for
seeding an independent project. **Not connected** to the source — this is a
one-way snapshot.

## What's here

- `database-seed.json` — Oracle + Brand Intelligence rows (see structure below)
- Static knowledge files live at `public/knowledge/**` in the source project
  (markdown, VTT voiceover captions, JSON manifests). Pull that folder verbatim.

## database-seed.json structure

```json
{
  "exported_at": "ISO timestamp",
  "oracle_intelligence": [ /* 1 row: org-level synthesis */ ],
  "oracle_knowledge_base": [ /* 30 rows: title, content, content_type, tags, ... */ ],
  "brand_intelligence": [ /* 40 rows: per-entity summaries, knowledge_entries, etc. */ ]
}
```

## Source code to pull (independent copies — do NOT wire to BrandHub's DB)

- `src/hooks/useOracleBrain.ts` — Oracle intelligence hook (adapt table names to new project schema)
- `src/pages/KnowledgeBase.tsx` — UI page rendering knowledge entries
- `public/knowledge/**` — static docs, voiceover captions
- `public/knowledge-export/database-seed.json` — this file

## How to seed the new project

1. Create matching tables in the new project's Lovable Cloud (`oracle_intelligence`,
   `oracle_knowledge_base`, `brand_intelligence` — schema mirrors this one). Enable
   RLS and grant policies per the new project's auth model.
2. Insert rows from `database-seed.json` (bulk insert via a one-shot edge function
   or SQL). Regenerate UUIDs if org/entity IDs don't exist in the new project.
3. Port `useOracleBrain.ts` and `KnowledgeBase.tsx`, replacing the `oracle-brain`
   edge-function reference with the new project's equivalent (or stub to read-only
   until synthesis is rebuilt).
4. Static files: copy `public/knowledge/**` into the new project's `public/knowledge/`.

## Independence guarantee

Nothing here contains BrandHub Supabase URLs or keys. The new project runs on its
own backend; this bundle is dumb data + reference code.
