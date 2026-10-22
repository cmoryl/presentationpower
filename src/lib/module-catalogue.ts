import { PRINT_SECTION_MODULES } from "./print-library/section-modules";
import { STARTER_TEMPLATES } from "./print-library/starter-templates";
import { SOCIAL_MODULE_LAYOUTS } from "./social-module-layouts";
import { moduleLifecycle, usageFromReferences, type ModuleManifest, type ModuleReference } from "./module-catalogue-core";
import type { getModuleCatalogue } from "./module-catalogue.functions";
type CatalogueData = Awaited<ReturnType<typeof getModuleCatalogue>>;
type Row = Record<string, unknown>;
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
const text = (v: unknown): string | null => typeof v === "string" && v.length ? v : null;

/** A projection, never a second registry: all ids, factories and lifecycle states belong to their original authority. */
export function buildModuleManifests(data: CatalogueData, authority: (id: string) => { owner: string | null; authority: string }): ModuleManifest[] {
  const familyNames = new Map(data.families.map((r) => [String(r.id), String(r.name)]));
  const overrides = new Map(data.overrides.map((r) => [`${r.scope}:${r.module_id}`, r]));
  const base = (id: string, classification: ModuleManifest["classification"], row: Row = {}, scope = ""): ModuleManifest => {
    const ov = overrides.get(`${scope}:${id}`);
    const historyTable = classification === "team" ? "custom_modules" : classification === "template" ? "print_page_templates" : scope ? "module_overrides" : null;
    const historyKey = historyTable === "module_overrides" ? `${scope}:${id}` : id;
    const versions = data.history.filter((r) => r.source_table === historyTable && r.source_key === historyKey);
    const latest = versions.reduce<Row | null>((a, b) => Number(b.revision) > Number(a?.revision ?? 0) ? b : a, null);
    const refs = [...(data.references[id] ?? [])];
    const ownerId = text(row.created_by ?? row.owner_id);
    const modifier = text(ov?.updated_by ?? latest?.created_by);
    return { key: `${classification}:${id}`, id, classification, label: text(ov?.label ?? row.name ?? row.title) ?? id,
      description: text(ov?.description ?? row.description) ?? "", family: String(row.family_id ?? ""),
      surfaces: [], lifecycle: ov?.hidden || row.hidden ? "retired" : "shipped", ownerId,
      owner: ownerId ? data.people[ownerId] ?? "Team member" : "System", source: "System registry",
      brandSupport: ["All approved brand modes"], editableFields: [], lockedFields: [], capacity: null,
      allowedContexts: [], exports: [], dependencies: [], renderer: "", reviewRule: "Code release + regression checks",
      modifiedAt: text(ov?.updated_at ?? row.updated_at), modifiedBy: modifier ? data.people[modifier] ?? "Team member" : null,
      version: latest ? Number(latest.revision) : null, historyTable, historyKey: historyTable ? historyKey : null,
      references: refs, usage: usageFromReferences(refs), usageComplete: data.complete,
      warnings: [], tags: strings(ov?.tags ?? row.tags), preview: text(row.thumbnail_url),
    };
  };
  const system = data.variants.map((r) => {
    const m = base(String(r.id), "system", r, "deck"); const a = authority(m.id);
    m.family = familyNames.get(String(r.family_id)) ?? String(r.family_id);
    m.surfaces = ["Presentation"]; m.source = "System taxonomy";
    m.editableFields = strings(r.editable_fields); m.lockedFields = strings(r.locked_fields);
    m.capacity = r.capacity; m.allowedContexts = strings(r.permitted_layout_ids);
    m.dependencies = r.fallback_variant_id ? [String(r.fallback_variant_id)] : [];
    m.renderer = a.owner ? `${a.owner} · ${a.authority}` : "Unregistered · fallback";
    m.exports = ["PPTX via deck QA", "PDF / PNG via deck export"];
    if (!a.owner) m.warnings.push("No registered renderer; verify output before release.");
    return m;
  });
  const team = data.custom.map((r) => {
    const m = base(String(r.id), "team", r); m.label = String(r.name); m.source = "Module Studio";
    m.lifecycle = moduleLifecycle(String(r.status), String(r.review_status)); m.family = familyNames.get(String(r.family_id)) ?? String(r.family_id);
    m.dependencies = [String(r.base_variant_id)]; m.renderer = authority(String(r.base_variant_id)).owner ?? "Unregistered base";
    m.surfaces = ["Presentation"]; m.brandSupport = r.brand_mode ? [String(r.brand_mode)] : ["All approved brand modes"];
    m.allowedContexts = r.section_id ? [String(r.section_id)] : []; m.editableFields = strings(r.editable_fields);
    m.exports = ["Editable PPTX via Module Studio / deck QA", "PDF / PNG via deck export"];
    m.reviewRule = "Draft → Approvals → approved publication; content edits require a new review";
    m.warnings.push("Legacy inserted copies may lack source identity; recorded usage is a lower bound.");
    return m;
  });
  const print = PRINT_SECTION_MODULES.map((r) => {
    const m = base(r.id, "print", {}, "print"); const ov = overrides.get(`print:${r.id}`);
    const section = r.make(); const kind = section.kind;
    m.label = text(ov?.label) ?? r.label; m.description = text(ov?.description) ?? r.description;
    m.family = r.family; m.surfaces = ["Print"]; m.capacity = { density: text(ov?.density) ?? r.density };
    m.allowedContexts = strings(ov?.best_for).length ? strings(ov?.best_for) : r.bestFor;
    m.tags = strings(ov?.tags).length ? strings(ov?.tags) : r.tags;
    m.editableFields = Object.keys(section).filter((k) => !["id", "kind", "variantId"].includes(k)); m.lockedFields = ["id", "kind"];
    m.renderer = "PrintSectionRenderer"; m.exports = ["PDF via print QA", "PNG proof", "Editable section JSON"];
    m.references.push(...(data.references[`section:${kind}:${r.variantId}`] ?? []));
    for (const t of STARTER_TEMPLATES) if (t.sections.some((s) => s.kind === kind && s.variantId === r.variantId)) m.references.push({ id: `starter:${t.id}`, title: t.title, kind: "templates", href: "/asset/new" });
    m.usage = usageFromReferences(m.references); m.reviewRule = "System release checks; admin master/metadata edits publish immediately";
    return m;
  });
  const adaptations = SOCIAL_MODULE_LAYOUTS.map((layout) => {
    const parent = print.find((m) => m.id === layout.id);
    if (!parent) throw new Error(`Missing print master for ${layout.id}`);
    const refs: ModuleReference[] = parent.references.filter((r) => ["social", "events"].includes(r.kind));
    return { ...parent, key: `adaptation:${layout.id}`, classification: "adaptation" as const,
      surfaces: ["Social", "Event"], source: "Derived from print master", dependencies: [layout.id],
      allowedContexts: layout.suitedFor, exports: ["PNG proof via social / Convert", "Other formats subject to destination QA"],
      renderer: "SocialModuleFrame → PrintSectionRenderer + social reflow", reviewRule: "Inherits print master; format fit/export QA remains mandatory",
      references: refs, usage: usageFromReferences(refs), historyTable: parent.historyTable, historyKey: parent.historyKey,
    };
  });
  const templates = data.templates.map((r) => {
    const m = base(String(r.id), "template", r); m.source = "Saved page arrangement"; m.family = String(r.kind);
    m.surfaces = ["Print"]; m.lifecycle = r.hidden ? "retired" : r.scope === "shared" ? "approved" : "draft";
    m.dependencies = strings(r.references); m.allowedContexts = [String(r.kind)]; m.renderer = "Print page + section stack";
    m.exports = ["PDF via print QA", "PNG proof"]; m.reviewRule = "Personal capture → admin shared publication; restored versions are private";
    return m;
  });
  return [...system, ...team, ...print, ...adaptations, ...templates];
}