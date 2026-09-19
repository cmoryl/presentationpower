// Live brand-guide editor.
//
// Edits the colours, typography, logo rules and intro copy of one guide, plus
// the division's glossary terms. Everything is stored as an overlay on top of
// the authored baseline, so "Reset to approved" always restores the original.

import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  getBrandGuide,
  type BrandGuide,
  type ColorSwatch,
  type LogoRule,
  type TypeStyle,
} from "@/lib/brand-guides";
import {
  applyBrandGuidePatch,
  colorEditsRetheme,
  isBrandHex,
  type BrandGuidePatch,
} from "@/lib/brand-guide-edits";
import {
  getBrandGuideEdit,
  resetBrandGuideEdit,
  saveBrandGuideEdit,
} from "@/lib/brand-guide-edits.functions";
import {
  deleteGlossaryTerm,
  listGlossary,
  upsertGlossaryTerm,
} from "@/lib/translation.functions";
import { BrandDocReadPanel, type DocApply } from "@/components/brand/BrandDocReadPanel";
import type { ColorGroupKey } from "@/lib/brand-guide-doc-read";


export const Route = createFileRoute("/knowledge/brand-guides/$slug_/edit")({
  loader: async ({ params }) => {
    const base = getBrandGuide(params.slug);
    if (!base) throw notFound();
    const edit = await getBrandGuideEdit({ data: { slug: base.slug } });
    return { base, patch: edit?.patch ?? null, editedAt: edit?.updatedAt ?? null };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Edit ${loaderData?.base.title} Brand Guide · TransPerfect` },
      {
        name: "description",
        content: `Edit the colours, typography, logo rules and glossary for the ${loaderData?.base.title} brand guide.`,
      },
      { property: "og:title", content: `Edit ${loaderData?.base.title} Brand Guide` },
      {
        property: "og:description",
        content: "Live brand guide editing — guide pages and decks update automatically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="rounded-xl border border-border p-8 text-sm text-muted-foreground">
        Brand guide not found.{" "}
        <Link to="/knowledge/brand-guides" className="underline">
          Back to guides
        </Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        {(error as Error).message}
      </div>
    </AppShell>
  ),
  component: BrandGuideEditor,
});

type Draft = {
  intro: string;
  tagline: string;
  typefacePrimary: string;
  typefaceWeb: string;
  primaryColors: ColorSwatch[];
  secondaryColors: ColorSwatch[];
  tertiaryColors: ColorSwatch[];
  neutrals: ColorSwatch[];
  headingScale: TypeStyle[];
  bodyScale: TypeStyle[];
  logoNotesHeadline: string;
  logoNotesBody: string;
  logoRules: LogoRule[];
};

function draftFrom(guide: BrandGuide): Draft {
  return {
    intro: guide.intro,
    tagline: guide.tagline ?? "",
    typefacePrimary: guide.typefacePrimary,
    typefaceWeb: guide.typefaceWeb,
    primaryColors: guide.primaryColors.map((c) => ({ ...c })),
    secondaryColors: guide.secondaryColors.map((c) => ({ ...c })),
    tertiaryColors: guide.tertiaryColors.map((c) => ({ ...c })),
    neutrals: guide.neutrals.map((c) => ({ ...c })),
    headingScale: guide.headingScale.map((t) => ({ ...t })),
    bodyScale: guide.bodyScale.map((t) => ({ ...t })),
    logoNotesHeadline: guide.logoNotes?.headline ?? "",
    logoNotesBody: guide.logoNotes?.body ?? "",
    logoRules: guide.logoRules.map((r) => ({ ...r })),
  };
}

function draftToPatch(draft: Draft): BrandGuidePatch {
  return {
    intro: draft.intro,
    tagline: draft.tagline,
    typefacePrimary: draft.typefacePrimary,
    typefaceWeb: draft.typefaceWeb,
    primaryColors: draft.primaryColors,
    secondaryColors: draft.secondaryColors,
    tertiaryColors: draft.tertiaryColors,
    neutrals: draft.neutrals,
    headingScale: draft.headingScale,
    bodyScale: draft.bodyScale,
    logoNotes: { headline: draft.logoNotesHeadline, body: draft.logoNotesBody },
    logoRules: draft.logoRules,
  };
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm font-semibold">{title}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function SwatchRows({
  label,
  list,
  onChange,
}: {
  label: string;
  list: ColorSwatch[];
  onChange: (next: ColorSwatch[]) => void;
}) {
  const set = (i: number, patch: Partial<ColorSwatch>) =>
    onChange(list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div>
      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      <div className="mt-2 space-y-2">
        {list.map((c, i) => {
          const valid = isBrandHex(c.hex);
          return (
            <div key={`${label}-${i}`} className="flex flex-wrap items-center gap-2">
              <span
                className="h-8 w-8 shrink-0 rounded-md border border-border"
                style={{ background: valid ? c.hex : "transparent" }}
                aria-hidden
              />
              <Input
                className="h-9 w-40"
                value={c.name}
                aria-label={`${label} name ${i + 1}`}
                onChange={(e) => set(i, { name: e.target.value })}
              />
              <Input
                className={`h-9 w-28 font-mono ${valid ? "" : "border-red-400"}`}
                value={c.hex}
                aria-label={`${label} colour ${i + 1}`}
                onChange={(e) => set(i, { hex: e.target.value })}
              />
              <Input
                className="h-9 w-40"
                placeholder="Role"
                value={c.role ?? ""}
                aria-label={`${label} role ${i + 1}`}
                onChange={(e) => set(i, { role: e.target.value })}
              />
              <Input
                className="h-9 w-32"
                placeholder="Pantone"
                value={c.pantone ?? ""}
                aria-label={`${label} pantone ${i + 1}`}
                onChange={(e) => set(i, { pantone: e.target.value })}
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove ${c.name || "colour"}`}
                onClick={() => onChange(list.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {!valid && <span className="text-xs text-red-600">Needs a hex like #003FC7</span>}
            </div>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => onChange([...list, { name: "New colour", hex: "#003FC7" }])}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add colour
      </Button>
    </div>
  );
}

function TypeRows({
  label,
  list,
  onChange,
}: {
  label: string;
  list: TypeStyle[];
  onChange: (next: TypeStyle[]) => void;
}) {
  const set = (i: number, patch: Partial<TypeStyle>) =>
    onChange(list.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  return (
    <div>
      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      <div className="mt-2 space-y-2">
        {list.map((t, i) => (
          <div key={`${label}-${i}`} className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 w-32"
              value={t.label}
              aria-label={`${label} name ${i + 1}`}
              onChange={(e) => set(i, { label: e.target.value })}
            />
            <Input
              className="h-9 w-20"
              type="number"
              value={t.sizePx}
              aria-label={`${label} size ${i + 1}`}
              onChange={(e) => set(i, { sizePx: Number(e.target.value) })}
            />
            <Input
              className="h-9 w-24"
              value={String(t.weight)}
              aria-label={`${label} weight ${i + 1}`}
              onChange={(e) => set(i, { weight: e.target.value })}
            />
            <Input
              className="h-9 w-28"
              placeholder="Tracking"
              value={t.tracking ?? ""}
              aria-label={`${label} tracking ${i + 1}`}
              onChange={(e) => set(i, { tracking: e.target.value })}
            />
            <Input
              className="h-9 w-28"
              placeholder="Leading"
              value={t.leading ?? ""}
              aria-label={`${label} leading ${i + 1}`}
              onChange={(e) => set(i, { leading: e.target.value })}
            />
            <Input
              className="h-9 min-w-[10rem] flex-1"
              placeholder="Sample text"
              value={t.sample}
              aria-label={`${label} sample ${i + 1}`}
              onChange={(e) => set(i, { sample: e.target.value })}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove ${t.label || "style"}`}
              onClick={() => onChange(list.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() =>
          onChange([...list, { label: "New style", sample: "Sample", sizePx: 24, weight: 500 }])
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Add style
      </Button>
    </div>
  );
}

function GlossaryPanel({ divisionId }: { divisionId: string }) {
  const load = useServerFn(listGlossary);
  const save = useServerFn(upsertGlossaryTerm);
  const remove = useServerFn(deleteGlossaryTerm);
  const [term, setTerm] = useState("");
  const [note, setNote] = useState("");
  const [doNotTranslate, setDoNotTranslate] = useState(true);
  const [busy, setBusy] = useState(false);

  const scope = divisionId === "master" ? "global" : "division";
  const q = useQuery({
    queryKey: ["guide-glossary", divisionId],
    queryFn: () =>
      load({
        data: scope === "global" ? { scope: "global" } : { scope: "division", scopeId: divisionId },
      }),
  });

  const rows = (q.data ?? []) as unknown as Array<{
    id: string;
    term: string;
    do_not_translate: boolean;
    notes: string | null;
  }>;

  async function addTerm() {
    if (!term.trim()) return;
    setBusy(true);
    try {
      await save({
        data: {
          term: term.trim(),
          do_not_translate: doNotTranslate,
          translations: {},
          scope,
          ...(scope === "division" ? { scope_id: divisionId } : {}),
          notes: note.trim() || undefined,
        },
      });
      setTerm("");
      setNote("");
      await q.refetch();
      toast.success("Term added — it is live in translations and Oracle answers now");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Glossary"
      hint={
        scope === "global"
          ? "Shared terms — used by every division's translations, Oracle answers and deck copy checks."
          : "Terms for this division only, on top of the shared list."
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Term</Label>
          <Input
            className="mt-1 h-9 w-56"
            value={term}
            placeholder="GlobalLink"
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Note</Label>
          <Input
            className="mt-1 h-9"
            value={note}
            placeholder="Why this rule exists"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={doNotTranslate}
            onChange={(e) => setDoNotTranslate(e.target.checked)}
          />
          Never translate
        </label>
        <Button size="sm" disabled={busy || !term.trim()} onClick={addTerm}>
          <Plus className="mr-1 h-4 w-4" />
          Add term
        </Button>
      </div>

      {q.isLoading ? (
        <div className="text-xs text-muted-foreground">Loading terms…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">No terms yet.</div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <span className="text-sm font-medium">{r.term}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {r.do_not_translate ? "Never translate" : "Translatable"}
              </span>
              {r.notes && <span className="truncate text-xs text-muted-foreground">{r.notes}</span>}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                aria-label={`Remove ${r.term}`}
                onClick={async () => {
                  try {
                    await remove({ data: { id: r.id } });
                    await q.refetch();
                    toast.success(`${r.term} removed`);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function BrandGuideEditor() {
  const { base, patch, editedAt } = Route.useLoaderData() as {
    base: BrandGuide;
    patch: BrandGuidePatch | null;
    editedAt: string | null;
  };
  const router = useRouter();
  const live = useMemo(() => applyBrandGuidePatch(base, patch), [base, patch]);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(live));
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveBrandGuideEdit);
  const reset = useServerFn(resetBrandGuideEdit);
  const retheme = colorEditsRetheme(base.divisionId);
  const queryClient = useQueryClient();

  /** Folds what a brand document says into the unsaved draft. */
  function applyFromDocument(apply: DocApply) {
    setDraft((prev) => {
      const next: Draft = { ...prev };
      const groups: ColorGroupKey[] = [
        "primaryColors",
        "secondaryColors",
        "tertiaryColors",
        "neutrals",
      ];
      for (const key of groups) {
        const found = apply.colors[key];
        if (!found?.length) continue;
        if (apply.mode === "replace") {
          next[key] = found.map((c) => ({ ...c }));
        } else {
          const have = new Set(prev[key].map((c) => c.hex.toUpperCase()));
          next[key] = [
            ...prev[key],
            ...found.filter((c) => !have.has(c.hex.toUpperCase())).map((c) => ({ ...c })),
          ];
        }
      }
      if (apply.typefacePrimary) next.typefacePrimary = apply.typefacePrimary;
      if (apply.typefaceWeb) next.typefaceWeb = apply.typefaceWeb;
      return next;
    });
  }


  const badHex = [
    ...draft.primaryColors,
    ...draft.secondaryColors,
    ...draft.tertiaryColors,
    ...draft.neutrals,
  ].filter((c) => !isBrandHex(c.hex));

  async function onSave() {
    if (badHex.length) {
      toast.error(`${badHex.length} colour${badHex.length > 1 ? "s" : ""} need a valid hex value`);
      return;
    }
    setBusy(true);
    try {
      const res = await save({
        data: { slug: base.slug, divisionId: base.divisionId, patch: draftToPatch(draft) },
      });
      toast.success("Guide updated — the guide page shows this now");
      if (res.retheme?.applied) toast.success("Decks and print now use the new colours");
      else if (res.retheme?.reason) toast.message(res.retheme.reason);
      await router.invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    if (!window.confirm(`Reset ${base.title} back to the approved guide? Your edits are removed.`))
      return;
    setBusy(true);
    try {
      await reset({ data: { slug: base.slug } });
      setDraft(draftFrom(base));
      toast.success("Reset to the approved guide");
      await router.invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="text-xs text-muted-foreground">
        <Link to="/knowledge/brand-guides" className="hover:underline">
          Brand Guides
        </Link>
        <span className="mx-2">/</span>
        <Link
          to="/knowledge/brand-guides/$slug"
          params={{ slug: base.slug }}
          className="hover:underline"
        >
          {base.title}
        </Link>
      </div>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-medium tracking-[-0.03em]">Edit {base.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Changes appear on the guide page straight away.{" "}
            {retheme
              ? "Colour changes also re-theme new decks and print for this brand."
              : "Colours here are documentation only — every TransPerfect division renders in the approved enterprise palette."}
            {editedAt ? ` Last edited ${new Date(editedAt).toLocaleDateString()}.` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={onReset}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Reset to approved
          </Button>
          <Button disabled={busy} onClick={onSave}>
            <Save className="mr-1 h-4 w-4" />
            Save changes
          </Button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <Panel title="Wording" hint="Tagline and opening paragraph shown on the guide.">
          <div>
            <Label className="text-xs text-muted-foreground">Tagline</Label>
            <Input
              className="mt-1"
              value={draft.tagline}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Intro</Label>
            <Textarea
              className="mt-1 min-h-28"
              value={draft.intro}
              onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
            />
          </div>
        </Panel>

        <Panel
          title="Colours"
          hint={
            retheme
              ? "The first primary and first secondary colour also drive this brand's decks and print."
              : "Guide documentation only — renders stay on the approved enterprise palette."
          }
        >
          <SwatchRows
            label="Primary"
            list={draft.primaryColors}
            onChange={(primaryColors) => setDraft({ ...draft, primaryColors })}
          />
          <SwatchRows
            label="Secondary"
            list={draft.secondaryColors}
            onChange={(secondaryColors) => setDraft({ ...draft, secondaryColors })}
          />
          <SwatchRows
            label="Tertiary"
            list={draft.tertiaryColors}
            onChange={(tertiaryColors) => setDraft({ ...draft, tertiaryColors })}
          />
          <SwatchRows
            label="Neutrals"
            list={draft.neutrals}
            onChange={(neutrals) => setDraft({ ...draft, neutrals })}
          />
        </Panel>

        <Panel title="Typography" hint="Typeface names and the heading / body scales.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Primary typeface</Label>
              <Input
                className="mt-1"
                value={draft.typefacePrimary}
                onChange={(e) => setDraft({ ...draft, typefacePrimary: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Web typeface</Label>
              <Input
                className="mt-1"
                value={draft.typefaceWeb}
                onChange={(e) => setDraft({ ...draft, typefaceWeb: e.target.value })}
              />
            </div>
          </div>
          <TypeRows
            label="Headings"
            list={draft.headingScale}
            onChange={(headingScale) => setDraft({ ...draft, headingScale })}
          />
          <TypeRows
            label="Body"
            list={draft.bodyScale}
            onChange={(bodyScale) => setDraft({ ...draft, bodyScale })}
          />
        </Panel>

        <Panel title="Logo rules" hint="Each rule shows as a do or a don't on the guide.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Headline</Label>
              <Input
                className="mt-1"
                value={draft.logoNotesHeadline}
                onChange={(e) => setDraft({ ...draft, logoNotesHeadline: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Note</Label>
              <Input
                className="mt-1"
                value={draft.logoNotesBody}
                onChange={(e) => setDraft({ ...draft, logoNotesBody: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            {draft.logoRules.map((r, i) => (
              <div key={`rule-${i}`} className="flex flex-wrap items-center gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={r.do ? "do" : "dont"}
                  aria-label={`Rule ${i + 1} type`}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      logoRules: draft.logoRules.map((x, idx) =>
                        idx === i ? { ...x, do: e.target.value === "do" } : x,
                      ),
                    })
                  }
                >
                  <option value="do">Do</option>
                  <option value="dont">Don&apos;t</option>
                </select>
                <Input
                  className="h-9 w-56"
                  value={r.title}
                  aria-label={`Rule ${i + 1} title`}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      logoRules: draft.logoRules.map((x, idx) =>
                        idx === i ? { ...x, title: e.target.value } : x,
                      ),
                    })
                  }
                />
                <Input
                  className="h-9 min-w-[12rem] flex-1"
                  value={r.description}
                  aria-label={`Rule ${i + 1} description`}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      logoRules: draft.logoRules.map((x, idx) =>
                        idx === i ? { ...x, description: e.target.value } : x,
                      ),
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove rule ${i + 1}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      logoRules: draft.logoRules.filter((_, idx) => idx !== i),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft({
                ...draft,
                logoRules: [
                  ...draft.logoRules,
                  { title: "New rule", description: "", do: true },
                ],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add rule
          </Button>
        </Panel>

        <GlossaryPanel divisionId={base.divisionId} />
      </div>
    </AppShell>
  );
}
