import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { moduleReferenceIds, usageFromReferences, retirementIssue, type ModuleReference, type ModuleCatalogueData } from "./module-catalogue-core";
type Client = SupabaseClient<Database>;
type Row = Record<string, unknown>;
type Table = keyof Database["public"]["Tables"];
/** Page every source instead of treating the API's first 1,000 rows as the entire estate. */
async function readAll(client: Client, table: Table, columns: string): Promise<Row[]> {
  if (table === "module_catalogue_versions") {
    const result = await client.from(table).select(columns).order("id", { ascending: false }).limit(1000);
    if (result.error) throw new Error(`${table}: ${result.error.message}`);
    return (result.data ?? []) as unknown as Row[];
  }
  const rows: Row[] = [];
  for (let from = 0; ; from += 500) {
    const result = await client.from(table).select(columns).order(table === "kiosk_layer_edits" ? "booth_id" : "id").range(from, from + 499);
    if (result.error) throw new Error(`${table}: ${result.error.message}`);
    const page = (result.data ?? []) as unknown as Row[]; rows.push(...page);
    if (page.length < 500) return rows;
  }
}
export async function requireCatalogueAdmin(client: Client, userId: string) {
  const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Only admins can manage the module catalogue.");
}
export async function readCatalogue(client: Client): Promise<ModuleCatalogueData> {
  const sources = [
    ["module_variants", "*"], ["module_families", "*"], ["custom_modules", "*"], ["module_overrides", "*"],
    ["print_page_templates", "*"], ["decks", "id,title,status,is_template,context"],
    ["deck_slides", "id,deck_id,variant_id,content"],
    ["print_assets", "id,title,status,content,context,source_module_ids"],
    ["campaign_kits", "id,name,surface,event_facts,copy"], ["surfaces", "id,title,kind,modules,context"],
    ["event_signs", "id,event_id,status,template_id,fields"], ["sign_templates", "id,name,layout_id,edits,status"],
    ["module_catalogue_versions", "id,source_table,source_key,revision,created_at,created_by,operation"],
  ] as const;
  const results = await Promise.allSettled(sources.map(([table, columns]) => readAll(client, table, columns)));
  const data: Record<string, Row[]> = {}; const errors: string[] = [];
  results.forEach((r, i) => { const source = sources[i]; if (!source) return; if (r.status === "fulfilled") data[source[0]] = r.value; else errors.push(`${source[0]} could not be checked`); });
  const required = ["module_variants", "custom_modules", "module_overrides", "print_page_templates"];
  if (required.some((table) => !data[table])) throw new Error(`Catalogue unavailable: ${errors.join("; ")}`);
  const references: Record<string, ModuleReference[]> = {};
  function add(ids: Iterable<string>, ref: ModuleReference) {
    for (const id of ids) { const list = references[id] ?? (references[id] = []); if (!list.some((r) => r.kind === ref.kind && r.id === ref.id)) list.push(ref); }
  }
  const decks = new Map((data.decks ?? []).map((r) => [String(r.id), r]));
  for (const r of data.deck_slides ?? []) {
    const deck = decks.get(String(r.deck_id)); if (!deck || ["archived", "deleted"].includes(String(deck.status))) continue;
    const kind = deck.is_template ? "templates" : "decks";
    add(moduleReferenceIds(r), { id: String(deck.id), title: String(deck.title), kind, href: `/decks/${deck.id}` });
  }
  for (const r of data.print_assets ?? []) {
    if (["archived", "deleted"].includes(String(r.status))) continue;
    add(moduleReferenceIds(r), { id: String(r.id), title: String(r.title), kind: "print", href: `/asset/${r.id}` });
  }
  for (const r of data.print_page_templates ?? []) {
    if (r.hidden) continue;
    add(moduleReferenceIds(r), { id: String(r.id), title: String(r.title), kind: "templates", href: "/admin/modules?tab=page-templates" });
  }
  for (const r of data.campaign_kits ?? []) add(moduleReferenceIds(r), { id: String(r.id), title: String(r.name), kind: r.surface === "event" ? "events" : "social", href: null });
  for (const r of data.surfaces ?? []) add(moduleReferenceIds(r), { id: String(r.id), title: String(r.title), kind: r.kind === "social" ? "social" : "print", href: null });
  const signs = new Map((data.sign_templates ?? []).map((r) => [String(r.id), r]));
  for (const r of data.event_signs ?? []) {
    if (["archived", "deleted"].includes(String(r.status))) continue;
    const sign = signs.get(String(r.template_id));
    add(moduleReferenceIds({ ...r, sign }), { id: String(r.id), title: `${r.event_id} · ${sign?.name ?? "Sign"}`, kind: "events", href: null });
  }
  // Read-only DTO: payloads used for indexing do not leave the server.
  const history = data.module_catalogue_versions ?? [];
  const peopleIds = new Set<string>();
  for (const table of ["module_overrides", "custom_modules", "print_page_templates"]) for (const r of data[table] ?? []) for (const field of ["created_by", "updated_by", "owner_id"]) if (typeof r[field] === "string") peopleIds.add(r[field]);
  const { data: people, error: peopleError } = peopleIds.size ? await client.rpc("display_names", { _ids: [...peopleIds] }) : { data: [], error: null };
  if (peopleError) errors.push("Member names could not be checked");
  const result = {
    variants: data.module_variants ?? [], families: data.module_families ?? [],
    custom: (data.custom_modules ?? []).map(({ content, canvas_blocks, ...row }) => ({ ...row, editable_fields: Object.keys((content ?? {}) as Row) })),
    overrides: data.module_overrides ?? [],
    templates: (data.print_page_templates ?? []).map(({ sections, layout, ...row }) => ({ ...row, references: [...moduleReferenceIds({ sections, layout })] })),
    references, history, people: Object.fromEntries((people ?? []).map((p) => [p.id, p.display_name || "Team member"])),
    errors, complete: errors.length === 0, checkedAt: new Date().toISOString(),
  };
  // PostgreSQL JSON and scalar columns are serialized into an explicit DTO contract.
  return JSON.parse(JSON.stringify(result)) as ModuleCatalogueData;
}
export async function checkRetirement(client: Client, id: string, acknowledged = false) {
  const estate = await readCatalogue(client);
  const refs = estate.references[id] ?? [];
  // Print blocks carry a section kind + variant, not always their catalogue id.
  if (id.startsWith("pm-")) {
    const variant = id.replace(/^pm-[^-]+-/, "");
    for (const [key, list] of Object.entries(estate.references)) if (key.startsWith("section:") && key.endsWith(`:${variant}`)) refs.push(...list);
  }
  const issue = retirementIssue(usageFromReferences(refs), estate.complete, acknowledged);
  if (issue) throw new Error(issue);
  return estate;
}