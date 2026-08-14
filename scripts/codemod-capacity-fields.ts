/**
 * One-shot codemod: rewrite every `capacity: { … }` literal in src/lib/taxonomy.ts
 * so budgets are keyed BY FIELD NAME instead of the old generic
 * `titleChars` / `bodyChars` pair.
 *
 * Why a codemod and not 190 hand edits: the invariant is the point. Every
 * editable text field must carry a budget and every budget must name a real
 * field, so the mapping is derived mechanically from `editableFields` — the
 * single source of truth for what a caller may write. `assertCapacityIntegrity`
 * in src/lib/taxonomy-capacity.ts then keeps it true for anything added later.
 *
 * Run:  bun run scripts/codemod-capacity-fields.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

import { MODULE_VARIANTS } from "../src/lib/taxonomy";
import { fieldSpecFor, serializeFieldSpec } from "../src/lib/taxonomy-field-kinds";

const FILE = "src/lib/taxonomy.ts";

type Cap = { items?: { min: number; max: number }; titleChars?: number; bodyChars?: number };

/**
 * Root of the repeating collection the `items` count governs. Usually `items`,
 * but several viz/graph variants count `series`, `stages`, `bars`, `points`…
 * and the count must name the array it applies to.
 */
function collectionRoot(paths: string[]): string | null {
  if (paths.some((p) => p.startsWith("items[]."))) return "items";
  const roots = new Map<string, number>();
  for (const p of paths) {
    const m = p.match(/^([A-Za-z0-9_.]+)\[\]\./);
    if (m) roots.set(m[1], (roots.get(m[1]) ?? 0) + 1);
  }
  if (roots.size) return [...roots.entries()].sort((a, b) => b[1] - a[1])[0][0];
  // Data-viz variants expose one opaque row list (`rows`, `cells`) rather than
  // named item fields; the count bounds that list.
  const list = paths.find((p) => fieldSpecFor(p).kind === "list");
  return list ?? null;
}

function build(variant: (typeof MODULE_VARIANTS)[number]): string {
  const cap = variant.capacity as Cap;
  const root = collectionRoot(variant.editableFields);
  // A count over an opaque list has no per-field sub-paths to strip.
  const prefix = root && variant.editableFields.some((f) => f.startsWith(`${root}[].`))
    ? `${root}[].`
    : null;
  const flat: string[] = [];
  const itemFields: string[] = [];

  for (const path of variant.editableFields) {
    const spec = fieldSpecFor(path, cap);
    const body = serializeFieldSpec(spec);
    if (prefix && path.startsWith(prefix)) {
      itemFields.push(`${JSON.stringify(path.slice(prefix.length))}: ${body}`);
    } else {
      flat.push(`${JSON.stringify(path)}: ${body}`);
    }
  }

  const parts: string[] = [`fields: { ${flat.join(", ")} }`];
  if (cap.items || itemFields.length) {
    const min = cap.items?.min ?? 1;
    const max = cap.items?.max ?? Math.max(min, 6);
    const pathAttr = root && root !== "items" ? `path: ${JSON.stringify(root)}, ` : "";
    parts.push(`items: { ${pathAttr}min: ${min}, max: ${max}, fields: { ${itemFields.join(", ")} } }`);
  }
  // Deprecated generic aliases stay for existing readers (library UI, export
  // verifier, skill-pack writer). They are documentation of the old contract,
  // never the addressable one.
  if (cap.titleChars != null) parts.push(`titleChars: ${cap.titleChars}`);
  if (cap.bodyChars != null) parts.push(`bodyChars: ${cap.bodyChars}`);
  return `    capacity: { ${parts.join(", ")} },`;
}

const src = readFileSync(FILE, "utf8");
const lines = src.split("\n");
let cursor = 0;
let rewritten = 0;

for (let i = 0; i < lines.length; i += 1) {
  if (!/^    capacity: \{.*\},$/.test(lines[i])) continue;
  const variant = MODULE_VARIANTS[cursor];
  if (!variant) throw new Error(`more capacity literals than variants at line ${i + 1}`);
  lines[i] = build(variant);
  cursor += 1;
  rewritten += 1;
}

if (cursor !== MODULE_VARIANTS.length) {
  throw new Error(`rewrote ${cursor} literals but there are ${MODULE_VARIANTS.length} variants`);
}

writeFileSync(FILE, lines.join("\n"));
console.log(`rewrote ${rewritten} capacity literals`);
