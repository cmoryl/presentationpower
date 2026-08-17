# Audit: `/library` visual presets, and how to replace them safely

## What the audit found (verified by reading the code)

The system you describe as the target is **already partly in place**: the approved
catalog is 28 visual languages `S01`–`S28` in `src/lib/design-skins.ts`, exposed as
`skin-s01` … `skin-s28` style packs and surfaced by the picker on `/library`. What is
inconsistent today is the *visual/metadata layer* (background art per skin, gradient and
opacity tokens, mode handling, preview treatment), not the plumbing.

Confirmed facts:

- `/library` (`src/routes/library.index.tsx`, 4,363 lines) holds one style state,
  `packId`, resolved through `useSelectablePacks()` then `stylePackById(packId)`, and
  passed to `LibraryPackProvider`. The only style UI is `<StyleLookPicker value={packId} onChange={setPackId} intent={q} />`.
- Selection contract: **a `StylePack` id string, or `null` = TransPerfect brand system.**
  Everything downstream (deck editor, agent, share, export, MCP) reads that same id.
- The approved set is filtered by code, not hardcoded lists: `APPROVED_STYLE_CODES = DESIGN_SKINS.map(s => s.code)`,
  and `isApprovedStyleId()` accepts only `skin-s##`.
- Industry tagging already exists twice: `DesignSkin.bestFit` (chips) and the 30
  industry recipes `R01`–`R30`, which act as **filters** (`industryFilters()`,
  `recipeDnaCodes()`), plus `src/lib/style-intent.ts` (brief-driven ranking incl. a
  `highContrast` flag).
- Modes: `APPROVED_MODES = ["Light","Dark","High contrast"]` is currently **metadata
  only** — the render path uses `DesignSkin.mode` (`light` | `dark`) as the native mode.
  There is no HC token resolution in `design-skin-pack.ts` today.
- Backgrounds: `src/lib/skin-backgrounds.ts` (1,384 lines) owns motifs, per-skin
  signature, 10 scenes, 4 takes, intensity tiers and gain — this is the file that
  actually determines what a "background" looks like, and where the abstract art work
  belongs. `skinBackgroundLayers()` and `sceneFromSeed()` are consumed by
  `design-skin-pack.ts` (`ground`), preview thumbs and AI backdrop tooling.

## Downstream dependencies that must keep working

| Consumer | What it reads |
| --- | --- |
| Deck data | `DeckContext.stylePackId` (`src/lib/deck-store.ts:301`), persisted in `decks.context` JSON |
| Deck editor / share / export routes | `stylePackId` → `DeckPackScope` → `stylePackById()` |
| Agent | `AgentQuickStart`, `AgentDeckPreview`, `src/lib/agent/design-knowledge.ts` (skin codes and pack ids in prompts/tools) |
| MCP | `create-deck.ts` validates `style_pack_id` and documents `'skin-s01'…'skin-s28'`; `get-deck.ts` returns it |
| SQL | migration `20260816163724` reads `_deck.context->>'stylePackId'` |
| Learning / governance | `style_reco_events.style_code`, `style_learning_prefs.style_codes` store bare `S##` codes |
| Admin templates | `template_looks.base_skin_code` default `'S01'`; `template-registry` custom packs and background overrides merge into `allSelectablePacks()` |
| PPTX / PDF | `single-slide-pptx.ts`, `pptx-export.ts` via pack tokens/ground, plus `pack-background-raster.ts` |
| Tests | `pack-compose`, `pack-readability`, `industry-skins`, `mcp-tools` |

## Must be preserved (breaking these breaks saved decks)

1. Pack id scheme `skin-s01`…`skin-s28` and the helpers `skinPackId()`,
   `skinCodeFromPackId()`, `isSkinPackId()` (regex `^skin-[sr]\d{2}$`).
2. Skin codes `S01`–`S28` themselves — they are stored in the database (learning
   events, prefs, `template_looks.base_skin_code`). Renaming a skin's `name` is safe;
   re-mapping a code to different art silently changes existing decks, so any
   re-ordering needs a deliberate decision.
3. `null` = brand system, and `R01`–`R30` + legacy `STYLE_PACKS` ids remaining
   *resolvable* through `stylePackById()` even though hidden from approved results.
4. The `StylePack` interface (`tokens`, `card`, `type`, `ground`, `swatch`, `layout`,
   `geometry`, `topBar`, `grain`) — every renderer and the export path read it.
5. `DesignSkin` field names, since `approved-visual-styles.ts`, `style-intent.ts`,
   `skin-backgrounds.ts` and agent tooling all derive from them.

## Proposed change set (files, in order)

**Data / visual language**
1. `src/lib/design-skins.ts` — normalise the 28 entries: name, reference, description,
   `bestFit` industry tags, `palette` (5 stops), `density`, `spec`. Add optional
   `industries?: string[]` (explicit tags instead of splitting `bestFit`) and an optional
   `hc?: { surface: string; ink: string; accent: string }` HC token triple. Additive
   only — no field removals, no code re-assignment.
2. `src/lib/skin-backgrounds.ts` — the real work: one abstract background language per
   skin (`SKIN_MOTIF`, `SKIN_SIGNATURE`, scene/tier gain) so each of the 28 is unique,
   text-safe and consistent across scenes. Add explicit gradient/opacity tokens so the
   sheet's `GRADIENT G##` / `OPACITY O##` specs drive the art instead of ad-hoc values.
3. `src/lib/design-skin-pack.ts` — consume the new tokens; add HC resolution so
   "High contrast" stops being a label-only claim (falls back to today's behaviour when
   a skin has no `hc` block).

**Selector / metadata layer**
4. `src/lib/approved-visual-styles.ts` — read `industries` when present, keep
   `chipsFrom(bestFit)` as fallback; expose gradient/opacity summary for the card.
5. `src/lib/style-intent.ts` — retag `StyleTraits` for any skin whose character changes.

**UI (behaviour unchanged, visuals normalised)**
6. `src/components/skins/ApprovedStyleThumb.tsx` — single background preview treatment
   (abstract 16:9, shared ground plane, mode toggle incl. HC).
7. `src/components/skins/StyleLookPicker.tsx` — keep the value contract and industry-first
   flow; align card chrome, chips and mode badges to the normalised metadata.
8. `src/components/skins/SkinLookbook.tsx` / `SkinPreviewTile.tsx` — same treatment for
   the deeper look view.

**Explicitly not changed:** `deck-store.ts`, MCP tools, export libraries, `PackShell`,
`DeckPackScope`, `template-registry`, and every route that only passes `stylePackId`
through.

## Verification before it ships

- `S01`–`S28` still resolve: `stylePackById('skin-s01'…'skin-s28')` non-null; legacy and
  `R##` ids still resolve.
- Existing test suites: `pack-compose`, `pack-readability`, `industry-skins`, `mcp-tools`,
  the PPTX package-order/parity suites.
- Contrast: `pack-contrast-regression` / `wcag` checks across light, dark and HC.
- Open a saved deck with a stored `stylePackId` and confirm the look is the same skin.
- Export one deck per mode to PPTX and confirm background + text render layered.

## Open questions

1. Should skin codes stay bound to their current art, or may `S01`–`S28` be re-assigned
   (which would visually change existing decks and stored learning data)?
2. Are you supplying the 28 background definitions (reference art, gradient/opacity
   specs) or should this pass derive them from the current catalog fields?
3. Should "High contrast" become a real selectable render mode (deck + export), or stay a
   preview-only mode in the library?
