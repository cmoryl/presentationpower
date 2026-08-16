// -----------------------------------------------------------------------------
// ALTERNATE LOOKS — the all-in-one page.
//
// One surface for every look in the system: browse and preview the full curated
// catalog (built-in packs, the OnDeck skins, the industry signatures and every
// published custom look), then — for admins — edit the selected look's fields,
// retune its section backgrounds, fork a catalog skin into an editable custom
// look, run the upload-driven intake wizard, or read the runbook.
// -----------------------------------------------------------------------------

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LookPreviewTile } from "@/components/skins/SkinPreviewTile";
import { LookFieldsEditor } from "@/components/templates/LookFieldsEditor";
import { BackgroundOverrideEditor } from "@/components/templates/BackgroundOverrideEditor";
import { AlternateLookWizard } from "@/components/templates/AlternateLookWizard";
import { TemplateDocs } from "@/components/templates/TemplateDocs";
import { useSelectablePacks } from "@/hooks/use-selectable-packs";
import { stylePackById, type StylePack } from "@/lib/style-packs";
import { listAllTemplates } from "@/lib/templates.functions";
import type { CustomTemplate } from "@/lib/custom-templates";
import { isTemplatePackId, templateCodeFromPackId } from "@/lib/custom-templates";
import type { TemplateBackgroundOverride } from "@/lib/template-registry";
import { SKIN_SCENES } from "@/lib/skin-backgrounds";
import { designSkinByCode } from "@/lib/design-skins";
import { industrySkinByCode } from "@/lib/industry-skins";

export const Route = createFileRoute("/looks")({
  head: () => ({
    meta: [
      { title: "Alternate Looks · Browse, edit and publish deck styles" },
      {
        name: "description",
        content:
          "Every deck look in one place: preview the curated catalog by section, edit palettes and geometry, retune backgrounds, and publish new looks from brand uploads.",
      },
      { property: "og:title", content: "Alternate Looks studio" },
      {
        property: "og:description",
        content:
          "Browse, preview, customise and publish every alternate deck look from a single page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LooksPage,
});

type Family = "all" | "custom" | "core" | "industry" | "signature";

const FAMILIES: Array<{ id: Family; label: string }> = [
  { id: "all", label: "All looks" },
  { id: "custom", label: "Custom" },
  { id: "core", label: "OnDeck core" },
  { id: "industry", label: "Industry" },
  { id: "signature", label: "Built-in packs" },
];

/** The code an override row is keyed by, for any pack id. */
function codeForPack(pack: StylePack): string {
  if (isTemplatePackId(pack.id)) return templateCodeFromPackId(pack.id);
  if (pack.id.startsWith("skin-")) return pack.id.replace(/^skin-/, "").toUpperCase();
  return pack.id.toUpperCase();
}

function familyOf(pack: StylePack): Family {
  if (isTemplatePackId(pack.id)) return "custom";
  if (/^skin-s/i.test(pack.id)) return "core";
  if (/^skin-r/i.test(pack.id)) return "industry";
  return "signature";
}

const BLANK_DRAFT: CustomTemplate = {
  id: "",
  code: "",
  name: "",
  reference: "",
  description: "",
  bestFit: "",
  mode: "light",
  palette: ["#F7F7F5", "#111214", "#003FC7", "#A1FBF9", "#E0E8F5"],
  typography: "Large scale · restrained weight",
  surfaceNote: "Flat canvas · one lifted plane",
  imagery: "Monumental crop · natural shadow",
  density: "Medium",
  baseSkinCode: "S01",
  spec: "",
  status: "draft",
  notes: "",
};

/** Seed an editable custom look from a catalog pack. */
function forkFromPack(pack: StylePack): CustomTemplate {
  const code = codeForPack(pack);
  const skin = designSkinByCode(code) ?? industrySkinByCode(code);
  const t = pack.tokens;
  return {
    ...BLANK_DRAFT,
    code: "",
    name: `${pack.label} — variant`,
    reference: pack.reference ?? skin?.reference ?? "",
    description: skin?.description ?? pack.tagline ?? "",
    bestFit: skin?.bestFit ?? "",
    mode: pack.mode === "dark" ? "dark" : "light",
    palette: skin?.palette?.length === 5
      ? [...skin.palette]
      : [t.surface, t.ink, t.accent, t.accentAlt, t.hairline],
    typography: skin?.typography ?? BLANK_DRAFT.typography,
    surfaceNote: skin?.surfaceNote ?? BLANK_DRAFT.surfaceNote,
    imagery: skin?.imagery ?? BLANK_DRAFT.imagery,
    density: skin?.density ?? "Medium",
    baseSkinCode: /^(S|R)\d/i.test(code) ? code.toUpperCase() : "S01",
    notes: `Forked from ${pack.label} (${code}).`,
  };
}

type PanelId = "preview" | "fields" | "backgrounds" | "intake" | "docs";

function LooksPage() {
  const packs = useSelectablePacks();
  const load = useServerFn(listAllTemplates);

  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [overrides, setOverrides] = useState<TemplateBackgroundOverride[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [family, setFamily] = useState<Family>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelId>("preview");
  const [draft, setDraft] = useState<CustomTemplate | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    load()
      .then((r) => {
        setTemplates(r.templates);
        setOverrides(r.overrides);
        setIsAdmin(true);
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => refresh(), [refresh]);

  // Draft looks aren't in the pack registry, so list them alongside it.
  const rows = useMemo(() => {
    const published = new Set(packs.map((p) => codeForPack(p).toUpperCase()));
    const drafts = templates
      .filter((t) => t.status !== "published" && !published.has(t.code.toUpperCase()))
      .map((t) => ({ id: `draft-${t.code}`, template: t, pack: null as StylePack | null }));
    return [
      ...packs.map((p) => ({
        id: p.id,
        pack: p,
        template: templates.find((t) => t.code.toUpperCase() === codeForPack(p)) ?? null,
      })),
      ...drafts,
    ];
  }, [packs, templates]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const fam = r.pack ? familyOf(r.pack) : "custom";
      if (family !== "all" && fam !== family) return false;
      if (!needle) return true;
      const hay = [
        r.pack?.label,
        r.pack?.tagline,
        r.pack?.reference,
        r.template?.name,
        r.template?.code,
        r.template?.bestFit,
        r.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, family, q]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? rows.find((r) => r.id === selectedId) ?? filtered[0] ?? null,
    [filtered, rows, selectedId],
  );

  const selectedPack = selected?.pack ?? (selected?.template ? stylePackById(`tpl-${selected.template.code.toLowerCase()}`) : null);
  const selectedCode = selectedPack ? codeForPack(selectedPack) : (selected?.template?.code ?? "");

  // Keep the fields editor in step with the selection.
  useEffect(() => {
    if (panel !== "fields") return;
    if (selected?.template) setDraft(selected.template);
    else if (selectedPack) setDraft(forkFromPack(selectedPack));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, selected?.id]);

  const PANELS: Array<{ id: PanelId; label: string; admin?: boolean }> = [
    { id: "preview", label: "Preview" },
    { id: "fields", label: "Edit look", admin: true },
    { id: "backgrounds", label: "Backgrounds", admin: true },
    { id: "intake", label: "New from uploads", admin: true },
    { id: "docs", label: "Runbook", admin: true },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br from-[#E0E8F5] via-white to-[#F2F2F2] p-6 dark:border-white/10 dark:from-[#03002C] dark:via-[#050427] dark:to-[#0A0A2E]">
          <div className="relative">
            <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7] dark:text-[#A1FBF9]">
              Design system
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em]">Alternate Looks</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65 dark:text-white/65">
              Every look a deck can wear — {rows.length} in total — with live section previews.
              Admins can edit palettes and geometry, retune each section background, fork a catalog
              skin into an editable variant, or publish a brand-new look from uploaded brand files.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <Link
                to="/library"
                className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 font-medium text-white hover:opacity-90"
              >
                <Sparkles size={14} /> Use a look in the library
              </Link>
              <Link
                to="/admin/templates"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 hover:border-[#003FC7] dark:border-white/20"
              >
                Template Studio
              </Link>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 hover:border-[#003FC7] dark:border-white/20"
              >
                <RefreshCw size={14} /> Reload
              </button>
            </div>
          </div>
        </header>

        {loading && (
          <p className="flex items-center gap-2 text-sm opacity-60" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading looks…
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* ── catalog rail ───────────────────────────────────────────── */}
          <aside className="space-y-3">
            <label className="relative block">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                aria-hidden="true"
              />
              <span className="sr-only">Search looks</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search looks…"
                className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/5"
              />
            </label>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by family">
              {FAMILIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFamily(f.id)}
                  aria-pressed={family === f.id}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    family === f.id
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/12 hover:border-[#003FC7]/50 dark:border-white/15"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] uppercase tracking-[0.16em] opacity-55">
              {filtered.length} look{filtered.length === 1 ? "" : "s"}
            </p>

            <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {filtered.map((r) => {
                const active = selected?.id === r.id;
                const label = r.pack?.label ?? r.template?.name ?? r.id;
                const code = r.pack ? codeForPack(r.pack) : (r.template?.code ?? "");
                const swatch = r.pack
                  ? [r.pack.tokens.surface, r.pack.tokens.accent]
                  : [r.template?.palette[0] ?? "#fff", r.template?.palette[2] ?? "#003FC7"];
                const tuned = overrides.some((o) => o.skinCode.toUpperCase() === code.toUpperCase());
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                        active
                          ? "border-[#003FC7] bg-[#003FC7]/5"
                          : "border-black/10 hover:border-[#003FC7]/40 dark:border-white/12"
                      }`}
                    >
                      <span
                        className="h-9 w-9 shrink-0 rounded-lg border border-black/10 dark:border-white/15"
                        style={{
                          background: `linear-gradient(135deg, ${swatch[0]} 0 50%, ${swatch[1]} 50% 100%)`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{label}</span>
                        <span className="block truncate text-[10px] uppercase tracking-[0.16em] opacity-55">
                          {code}
                          {r.template ? ` · ${r.template.status}` : ""}
                          {tuned ? " · tuned" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* ── detail ─────────────────────────────────────────────────── */}
          <section className="min-w-0 space-y-4">
            <nav className="flex flex-wrap gap-2" aria-label="Look panels">
              {PANELS.filter((p) => !p.admin || isAdmin).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPanel(p.id)}
                  aria-current={panel === p.id ? "page" : undefined}
                  className={`rounded-xl border px-3.5 py-2 text-sm transition ${
                    panel === p.id
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/10 bg-white hover:border-[#003FC7]/40 dark:border-white/15 dark:bg-white/5"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </nav>

            {!isAdmin && !loading && (
              <p className="rounded-xl border border-black/10 bg-white p-3 text-xs opacity-70 dark:border-white/15 dark:bg-white/5">
                You're browsing the read-only catalog. Editing, background tuning and publishing
                need an admin role.
              </p>
            )}

            {!selected && <p className="text-sm opacity-60">No looks match that search.</p>}

            {selected && (
              <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedPack?.label ?? selected.template?.name}
                    </h2>
                    <p className="text-xs opacity-60">
                      {selectedCode}
                      {selectedPack?.reference ? ` · ${selectedPack.reference}` : ""}
                      {selected.template ? ` · ${selected.template.status}` : " · catalog look"}
                    </p>
                  </div>
                  {isAdmin && selectedPack && !selected.template && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(forkFromPack(selectedPack));
                        setPanel("fields");
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-black/15 px-3 py-2 text-xs hover:border-[#003FC7] dark:border-white/20"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Fork into editable look
                    </button>
                  )}
                </div>

                {panel === "preview" && selectedPack && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {SKIN_SCENES.map((scene) => (
                      <figure key={scene}>
                        <figcaption className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-50">
                          {scene}
                        </figcaption>
                        <LookPreviewTile
                          pack={selectedPack}
                          kicker={`${selectedCode} · ${scene}`}
                          seed={scene}
                        />
                      </figure>
                    ))}
                  </div>
                )}
                {panel === "preview" && !selectedPack && (
                  <p className="text-sm opacity-65">
                    This look is still a draft, so it isn't in the render registry yet. Publish it
                    from <strong>Edit look</strong> to preview it here.
                  </p>
                )}

                {panel === "fields" && isAdmin && (
                  <LookFieldsEditor
                    draft={draft ?? BLANK_DRAFT}
                    onDraftChange={setDraft}
                    siblings={templates}
                    onSaved={(saved) => {
                      setDraft(saved);
                      setSelectedId(`tpl-${saved.code.toLowerCase()}`);
                      refresh();
                    }}
                    onDeleted={() => {
                      setDraft(null);
                      setSelectedId(null);
                      setPanel("preview");
                      refresh();
                    }}
                  />
                )}

                {panel === "backgrounds" && isAdmin && selectedPack && (
                  <BackgroundOverrideEditor
                    code={selectedCode}
                    pack={selectedPack}
                    overrides={overrides}
                    onChanged={refresh}
                  />
                )}
                {panel === "backgrounds" && isAdmin && !selectedPack && (
                  <p className="text-sm opacity-65">Publish this look first to tune its backgrounds.</p>
                )}

                {panel === "intake" && isAdmin && (
                  <AlternateLookWizard
                    existingTemplateCodes={templates.map((t) => t.code)}
                    onPublished={() => {
                      refresh();
                      toast.success("Look published — it's now in the catalog list.");
                    }}
                  />
                )}

                {panel === "docs" && isAdmin && <TemplateDocs />}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
