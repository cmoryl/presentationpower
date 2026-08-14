/**
 * Skill-pack exporter.
 *
 * Bundles everything the app uses to populate modules per division into a
 * portable folder (markdown for a Claude project skill + JSON for machines),
 * then zips it. Re-run whenever the taxonomy or brand data changes:
 *
 *   bun scripts/export-skill-pack.ts
 *
 * Code data is imported straight from src/lib so exported values are exactly
 * what the app renders. Database data is read with psql (read-only).
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  BRAND_MODES,
  SECTION_FRAMEWORKS,
  MODULE_FAMILIES,
  LAYOUT_FRAMEWORKS,
  MODULE_VARIANTS,
  NARRATIVE_ARCHETYPES,
} from "../src/lib/taxonomy";
import { BRAND_PROFILES } from "../src/lib/brand-profiles";
import { DIVISION_LOGOS } from "../src/lib/division-logos";
import { CASE_STUDIES } from "../src/lib/case-studies";
import { ENTERPRISE_GROUNDS, GROUND_BY_LAYOUT } from "../src/lib/enterprise-grounds";
import { STYLE_PACKS } from "../src/lib/style-packs";
import {
  ICON_SIZES,
  ICON_PLACEMENTS_META,
  ICON_TREATMENTS_META,
  ICON_EMPHASIS_META,
  PLACEMENT_DEFAULTS,
  MODULE_FAMILY_ICONS,
} from "../src/lib/iconography";
import palette from "../public/canva-master-reference/next-2026-color-palette.json";

const OUT_ROOT = process.env["SKILL_PACK_OUT"] ?? "/mnt/documents";
const OUT = join(OUT_ROOT, "module-skill-pack");

// ---------------------------------------------------------------------------
// Database reads — psql to JSON, one array per table.
// ---------------------------------------------------------------------------
function sqlJson<T = unknown>(sql: string): T[] {
  // -tA gives the raw json text; COPY would escape backslashes and break JSON.parse.
  const wrapped = `SELECT coalesce(json_agg(t), '[]'::json)::text FROM (${sql}) t`;
  const raw = execFileSync("psql", ["-X", "-q", "-tA", "-c", wrapped], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  return JSON.parse(raw) as T[];
}

const db = {
  moduleVariants: sqlJson("select * from module_variants order by id"),
  moduleSamples: sqlJson("select * from module_variant_samples order by variant_id"),
  brandModes: sqlJson("select * from brand_modes order by id"),
  divisionImagery: sqlJson("select * from division_imagery order by division, id"),
  clientLogos: sqlJson("select * from client_logos order by name"),
  knowledgeEntries: sqlJson(
    "select id, title, division, category, tags, summary, body, source_url, created_at from knowledge_entries order by created_at",
  ),
  brandIntelligence: sqlJson("select * from brand_intelligence"),
  divisionStats: sqlJson("select * from division_stats"),
  divisionQuotes: sqlJson("select * from division_quotes"),
};

// ---------------------------------------------------------------------------
// Derived / merged views
// ---------------------------------------------------------------------------
const divisions = BRAND_MODES.map((mode) => {
  const profile = BRAND_PROFILES[mode.id];
  const imageryCount = db.divisionImagery.filter(
    (r) => (r as { division?: string }).division === mode.id,
  ).length;
  return {
    id: mode.id,
    name: mode.name,
    description: mode.description,
    tokens: mode.tokens,
    role: profile?.role ?? mode.role ?? null,
    parentId: profile?.parentId ?? mode.parentId ?? null,
    logo: profile?.logo ?? mode.logo ?? null,
    contentScope: profile?.contentScope ?? mode.contentScope ?? null,
    logoSet: DIVISION_LOGOS[mode.id] ?? null,
    imageryCount,
  };
});

const familyById = new Map(MODULE_FAMILIES.map((f) => [f.id, f]));
const layoutById = new Map(LAYOUT_FRAMEWORKS.map((l) => [l.id, l]));

// ---------------------------------------------------------------------------
// Integrity gates — fail loudly rather than shipping a thin pack.
// ---------------------------------------------------------------------------
const expect = (label: string, actual: number, min: number) => {
  if (actual < min) throw new Error(`${label}: expected at least ${min}, got ${actual}`);
};

expect("module variants (code)", MODULE_VARIANTS.length, 189);
expect("module variants (db)", db.moduleVariants.length, 189);
expect("brand modes", BRAND_MODES.length, 11);
expect("division imagery", db.divisionImagery.length, 900);
expect("client logos", db.clientLogos.length, 390);
expect("knowledge entries", db.knowledgeEntries.length, 380);
expect("module families", MODULE_FAMILIES.length, 1);
expect("layout frameworks", LAYOUT_FRAMEWORKS.length, 1);
expect("style packs", STYLE_PACKS.length, 1);

for (const v of MODULE_VARIANTS) {
  if (!familyById.has(v.familyId)) throw new Error(`${v.id}: unknown familyId ${v.familyId}`);
  for (const l of v.permittedLayoutIds) {
    if (!layoutById.has(l)) throw new Error(`${v.id}: unknown layout ${l}`);
  }
}
const divisionIds = new Set(divisions.map((d) => d.id));
for (const d of divisions) {
  if (d.parentId && !divisionIds.has(d.parentId)) {
    throw new Error(`${d.id}: parent ${d.parentId} is not a known division`);
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "data"), { recursive: true });
mkdirSync(join(OUT, "reference"), { recursive: true });

const writeJson = (rel: string, value: unknown) =>
  writeFileSync(join(OUT, rel), JSON.stringify(value, null, 2) + "\n");
const writeText = (rel: string, value: string) => writeFileSync(join(OUT, rel), value);

writeJson("data/taxonomy.json", {
  brandModes: BRAND_MODES,
  moduleFamilies: MODULE_FAMILIES,
  sectionFrameworks: SECTION_FRAMEWORKS,
  layoutFrameworks: LAYOUT_FRAMEWORKS,
  narrativeArchetypes: NARRATIVE_ARCHETYPES,
});
writeJson("data/module-variants.json", MODULE_VARIANTS);
writeJson("data/divisions.json", divisions);
writeJson("data/module-samples.json", {
  note:
    "Per-division sample copy is currently code-driven, not database-driven. " +
    "module_variant_samples holds only admin-authored overrides; division_stats and " +
    "division_quotes are empty in this environment.",
  moduleVariantSamples: db.moduleSamples,
  divisionStats: db.divisionStats,
  divisionQuotes: db.divisionQuotes,
});
writeJson("data/imagery.json", db.divisionImagery);
writeJson("data/client-logos.json", db.clientLogos);
writeJson("data/case-studies.json", {
  caseStudies: CASE_STUDIES,
  enterpriseGrounds: ENTERPRISE_GROUNDS,
  groundByLayout: GROUND_BY_LAYOUT,
});
writeJson("data/style-packs.json", {
  stylePacks: STYLE_PACKS,
  iconography: {
    sizes: ICON_SIZES,
    placements: ICON_PLACEMENTS_META,
    placementDefaults: PLACEMENT_DEFAULTS,
    treatments: ICON_TREATMENTS_META,
    emphasis: ICON_EMPHASIS_META,
    moduleFamilyIcons: MODULE_FAMILY_ICONS,
  },
});
writeJson("data/knowledge.json", {
  entries: db.knowledgeEntries,
  brandIntelligence: db.brandIntelligence,
});
writeJson("data/palette.json", palette);

// ---------------------------------------------------------------------------
// Markdown — generated from the same in-memory data so md/JSON can't drift.
// ---------------------------------------------------------------------------
const byFamily = MODULE_FAMILIES.map((f) => ({
  family: f,
  variants: MODULE_VARIANTS.filter((v) => v.familyId === f.id),
}));

writeText(
  "SKILL.md",
  `# TransPerfect Presentation Module System

A portable reference to the module + division system used by the TransPerfect
presentation builder. Use it to reason about which module to pick, what content
it can hold, and how a given division should look.

## The model

- **Division (brand mode)** — ${divisions.length} brands, from the TransPerfect master brand to
  divisions and products. Each carries palette tokens, a logo lockup, a role in the
  brand hierarchy, and a content scope.
- **Section framework (SF-xx)** — the narrative slot a slide fills. Each framework
  permits a set of module families.
- **Module family (MF-xx)** — a group of modules with a shared review level.
- **Module variant (MV-xx)** — ${MODULE_VARIANTS.length} concrete slide designs. Each declares its
  capacity (item counts, title/body character budgets), the layout frameworks it
  may use, which fields are editable vs locked, and an optional iconography contract.
- **Layout framework (LF-xx)** — declarative zones a renderer maps to grid regions.
- **Narrative archetype** — an ordered recipe of section frameworks; the deck spine.

Selection order used by the app: archetype → section frameworks → permitted
families → variant that fits the content's capacity → layout framework → division
tokens and imagery.

## Files

| File | Contents |
| --- | --- |
| \`reference/modules.md\` | All ${MODULE_VARIANTS.length} variants grouped by family, with capacity and fields |
| \`reference/divisions.md\` | Each division: palette, logos, content scope, imagery counts |
| \`reference/content-rules.md\` | Iconography, style packs, layout zones, review levels |
| \`data/taxonomy.json\` | Brand modes, families, section + layout frameworks, archetypes |
| \`data/module-variants.json\` | Variant records (authoritative for capacity + fields) |
| \`data/divisions.json\` | Divisions merged with brand profiles and logo sets |
| \`data/module-samples.json\` | Admin sample overrides (sparse — see note inside) |
| \`data/imagery.json\` | ${db.divisionImagery.length} division imagery records (metadata + URLs) |
| \`data/client-logos.json\` | ${db.clientLogos.length} client logo records |
| \`data/case-studies.json\` | Case studies, enterprise grounds, ground-by-layout map |
| \`data/style-packs.json\` | ${STYLE_PACKS.length} style packs + full iconography contracts |
| \`data/knowledge.json\` | ${db.knowledgeEntries.length} knowledge entries + brand intelligence |
| \`data/palette.json\` | NEXT 2026 per-division hex / RGB / CMYK / Pantone |
| \`manifest.json\` | Row counts, source files, generated timestamp |

## Rules that matter when authoring content

1. Never exceed a variant's declared capacity — pick the \`fallbackVariantId\` instead.
2. Only \`editableFields\` may be rewritten; \`lockedFields\` belong to the brand system.
3. Accent colors come from the division's tokens (or \`palette.json\`), never invented.
4. Secondary/tertiary brand colors are accents only — roughly 10% of a composition.
5. Imagery and client logos must come from the records in \`data/\` — no external stock.
6. Per-division sample copy is code-driven today; treat \`module-samples.json\` as
   overrides, not as the full body of division content.

## Binary assets

Images and logos are referenced by URL and slug, not embedded. Fetch from the
recorded URLs when a rendering task needs the actual files.
`,
);

writeText(
  "reference/modules.md",
  `# Module variants (${MODULE_VARIANTS.length})

Grouped by family. Capacity is a hard budget: content that exceeds it must move
to the fallback variant.

${byFamily
  .map(
    ({ family, variants }) => `## ${family.id} — ${family.name}

Review level: **${family.reviewLevel}**. ${family.description}

${variants
  .map((v) => {
    const cap: string[] = [];
    if (v.capacity.items) cap.push(`items ${v.capacity.items.min}-${v.capacity.items.max}`);
    if (v.capacity.titleChars) cap.push(`title ≤${v.capacity.titleChars} chars`);
    if (v.capacity.bodyChars) cap.push(`body ≤${v.capacity.bodyChars} chars`);
    return `### ${v.id} — ${v.name}

${v.description}

- Capacity: ${cap.join(", ") || "not constrained"}
- Layouts: ${v.permittedLayoutIds.join(", ") || "—"}
- Editable: ${v.editableFields.join(", ") || "—"}
- Locked: ${v.lockedFields.join(", ") || "—"}
- Fallback: ${v.fallbackVariantId ?? "—"}${
      v.iconography
        ? `\n- Iconography: ${v.iconography.placement}${v.iconography.treatment ? ` / ${v.iconography.treatment}` : ""}${v.iconography.size ? ` / ${v.iconography.size}` : ""}`
        : ""
    }`;
  })
  .join("\n\n")}`,
  )
  .join("\n\n")}
`,
);

writeText(
  "reference/divisions.md",
  `# Divisions (${divisions.length})

${divisions
  .map(
    (d) => `## ${d.name} — \`${d.id}\`

${d.description}

- Role: ${d.role ?? "—"}${d.parentId ? ` (child of \`${d.parentId}\`)` : ""}
- Primary: \`${d.tokens.primary}\` · Accent: \`${d.tokens.accent}\` · Surface: \`${d.tokens.surface}\` · Ink: \`${d.tokens.ink}\`
- Logo lockup: ${d.logo ? JSON.stringify(d.logo) : "—"}
- Logo files: ${d.logoSet ? Object.keys(d.logoSet).join(", ") : "—"}
- Imagery records: ${d.imageryCount}
- Content scope: ${d.contentScope ? JSON.stringify(d.contentScope) : "—"}`,
  )
  .join("\n\n")}

## NEXT 2026 palette

| Division | Hex | Pantone |
| --- | --- | --- |
${(palette as Array<Record<string, string>>)
  .map(
    (row) =>
      `| ${row["Division"] ?? row["division"] ?? "—"} | ${row["Hex"] ?? row["hex"] ?? "—"} | ${row["Pantone"] ?? row["pantone"] ?? "—"} |`,
  )
  .join("\n")}
`,
);

writeText(
  "reference/content-rules.md",
  `# Content rules

## Section frameworks (${SECTION_FRAMEWORKS.length})

${SECTION_FRAMEWORKS.map(
  (s) => `- **${s.id} ${s.name}** — ${s.purpose} Permits: ${s.permittedFamilyIds.join(", ")}`,
).join("\n")}

## Narrative archetypes (${NARRATIVE_ARCHETYPES.length})

${NARRATIVE_ARCHETYPES.map(
  (a) => `- **${a.name}** (\`${a.id}\`) — ${a.description} Recipe: ${a.sectionRecipe.join(" → ")}`,
).join("\n")}

## Layout frameworks (${LAYOUT_FRAMEWORKS.length})

${LAYOUT_FRAMEWORKS.map((l) => `- **${l.id} ${l.name}** — ${l.description} Zones: ${l.zones.join(", ")}`).join("\n")}

## Review levels

${MODULE_FAMILIES.map((f) => `- **${f.id} ${f.name}** — ${f.reviewLevel}`).join("\n")}

## Style packs (${STYLE_PACKS.length})

${STYLE_PACKS.map((p) => `- **${(p as { name?: string }).name ?? p.id}** (\`${p.id}\`)`).join("\n")}

## Iconography

- Placements: ${ICON_PLACEMENTS_META.map((p) => p.id).join(", ")}
- Treatments: ${ICON_TREATMENTS_META.map((t) => t.id).join(", ")}
- Emphasis: ${ICON_EMPHASIS_META.map((e) => e.id).join(", ")}
- Size tokens: ${Object.keys(ICON_SIZES).join(", ")}

Full per-placement defaults and per-family icon assignments live in
\`data/style-packs.json\`.
`,
);

writeJson("manifest.json", {
  generatedAt: new Date().toISOString(),
  counts: {
    moduleVariantsCode: MODULE_VARIANTS.length,
    moduleVariantsDb: db.moduleVariants.length,
    moduleFamilies: MODULE_FAMILIES.length,
    sectionFrameworks: SECTION_FRAMEWORKS.length,
    layoutFrameworks: LAYOUT_FRAMEWORKS.length,
    narrativeArchetypes: NARRATIVE_ARCHETYPES.length,
    divisions: divisions.length,
    stylePacks: STYLE_PACKS.length,
    caseStudies: CASE_STUDIES.length,
    enterpriseGrounds: Object.keys(ENTERPRISE_GROUNDS).length,
    divisionImagery: db.divisionImagery.length,
    clientLogos: db.clientLogos.length,
    knowledgeEntries: db.knowledgeEntries.length,
    moduleVariantSamples: db.moduleSamples.length,
  },
  sources: {
    code: [
      "src/lib/taxonomy.ts",
      "src/lib/brand-profiles.ts",
      "src/lib/division-logos.ts",
      "src/lib/case-studies.ts",
      "src/lib/enterprise-grounds.ts",
      "src/lib/style-packs.ts",
      "src/lib/iconography.ts",
      "public/canva-master-reference/next-2026-color-palette.json",
    ],
    database: [
      "module_variants",
      "module_variant_samples",
      "brand_modes",
      "division_imagery",
      "client_logos",
      "knowledge_entries",
      "brand_intelligence",
      "division_stats",
      "division_quotes",
    ],
  },
});

execFileSync("zip", ["-qr", join(OUT_ROOT, "module-skill-pack.zip"), "module-skill-pack"], {
  cwd: OUT_ROOT,
});

console.log(`Skill pack written to ${OUT} (+ module-skill-pack.zip)`);
