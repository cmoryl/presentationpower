// DIVISION SEEDS (master admin)
// ---------------------------------------------------------------------------
// Lockups, accent + deep ink, gradient fields and the "Why <division>" copy
// used to be code constants. This route edits them as data: a sparse row per
// division in `division_seeds`. Blank fields fall back to the built-in default,
// so an admin can override one colour without owning the whole seed.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPage";
import { BRAND_MODES } from "@/lib/taxonomy";
import { resolveProposalBrand } from "@/lib/print-library/proposal-brand";
import {
  deleteDivisionSeed,
  divisionSeedsQueryKey,
  saveDivisionSeed,
  useDivisionSeeds,
  type DivisionSeed,
  type DivisionWhyCard,
} from "@/lib/division-seeds";

export const Route = createFileRoute("/admin/division-seeds")({
  head: () => ({
    meta: [
      { title: "Division Seeds · Admin · TransPerfect Element" },
      {
        name: "description",
        content:
          "Edit each division's proposal lockups, accent and deep ink, gradient fields, and Why-division copy without a code change.",
      },
      { property: "og:title", content: "Division Seeds · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Data-driven division branding: lockups, accents, gradients, and Why-division copy for solution proposals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DivisionSeedsPage,
});

type Draft = {
  displayName: string;
  accent: string;
  deep: string;
  logoDark: string;
  logoWhite: string;
  brightField: string;
  deepField: string;
  whyEyebrow: string;
  whyTitle: string;
  whyLines: string;
  whyCards: string;
};

const EMPTY: Draft = {
  displayName: "",
  accent: "",
  deep: "",
  logoDark: "",
  logoWhite: "",
  brightField: "",
  deepField: "",
  whyEyebrow: "",
  whyTitle: "",
  whyLines: "",
  whyCards: "",
};

function toDraft(seed?: DivisionSeed): Draft {
  if (!seed) return EMPTY;
  return {
    displayName: seed.displayName ?? "",
    accent: seed.accent ?? "",
    deep: seed.deep ?? "",
    logoDark: seed.logoDark ?? "",
    logoWhite: seed.logoWhite ?? "",
    brightField: seed.brightField ?? "",
    deepField: seed.deepField ?? "",
    whyEyebrow: seed.whyEyebrow ?? "",
    whyTitle: seed.whyTitle ?? "",
    whyLines: (seed.whyLines ?? []).join("\n"),
    whyCards: (seed.whyCards ?? [])
      .map((c) => [c.title, c.body, c.icon ?? ""].join(" | "))
      .join("\n"),
  };
}

function parseCards(text: string): DivisionWhyCard[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = "", body = "", icon = ""] = line.split("|").map((p) => p.trim());
      const card: DivisionWhyCard = { title, body };
      if (icon) card.icon = icon;
      return card;
    })
    .filter((c) => c.title || c.body);
}

function DivisionSeedsPage() {
  const { data, isLoading } = useDivisionSeeds();
  const queryClient = useQueryClient();
  const [divisionId, setDivisionId] = useState(BRAND_MODES[0]?.id ?? "");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  const brand = useMemo(() => BRAND_MODES.find((b) => b.id === divisionId), [divisionId]);
  const saved = divisionId ? data?.[divisionId] : undefined;

  useEffect(() => {
    setDraft(toDraft(saved));
  }, [saved, divisionId]);

  const preview = useMemo(
    () =>
      resolveProposalBrand(brand, {
        divisionId,
        displayName: draft.displayName,
        accent: draft.accent,
        deep: draft.deep,
        logoDark: draft.logoDark,
        logoWhite: draft.logoWhite,
        brightField: draft.brightField,
        deepField: draft.deepField,
      }),
    [brand, divisionId, draft],
  );

  const whyLabel =
    draft.whyEyebrow.trim() || `Why ${draft.displayName.trim() || brand?.name || "TransPerfect"}`;

  async function save() {
    if (!divisionId) return;
    setBusy(true);
    try {
      await saveDivisionSeed({
        divisionId,
        displayName: draft.displayName,
        accent: draft.accent,
        deep: draft.deep,
        logoDark: draft.logoDark,
        logoWhite: draft.logoWhite,
        brightField: draft.brightField,
        deepField: draft.deepField,
        whyEyebrow: draft.whyEyebrow,
        whyTitle: draft.whyTitle,
        whyLines: draft.whyLines
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        whyCards: parseCards(draft.whyCards),
      });
      await queryClient.invalidateQueries({ queryKey: divisionSeedsQueryKey });
      toast.success("Division seed saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save this seed");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!divisionId) return;
    setBusy(true);
    try {
      await deleteDivisionSeed(divisionId);
      await queryClient.invalidateQueries({ queryKey: divisionSeedsQueryKey });
      setDraft(EMPTY);
      toast.success("Reverted to the built-in defaults");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset this seed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <AdminPageHeader
        eyebrow="Brand assets"
        title="Division seeds"
        description="Lockups, accent and deep ink, gradient fields and the Why-division copy for every solution proposal. Leave a field blank to keep the built-in default."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void reset()}
              disabled={busy || !saved}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 text-xs font-medium text-black/70 hover:bg-black/[0.04] disabled:opacity-50"
            >
              <RotateCcw size={13} /> Revert to default
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#003FC7] px-4 text-xs font-semibold text-white hover:bg-[#0033a3] disabled:opacity-50"
            >
              <Save size={13} /> {busy ? "Saving…" : "Save seed"}
            </button>
          </div>
        }
      />

      {/* Division picker */}
      <div className="mb-6">
        <label
          htmlFor="division-seed-picker"
          className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45"
        >
          Division
        </label>
        <select
          id="division-seed-picker"
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
          className="min-h-[44px] w-full max-w-md rounded-xl border border-black/15 bg-white px-3 text-sm text-black/80"
        >
          {BRAND_MODES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {data?.[b.id] ? " · overridden" : ""}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-black/50">
          {isLoading
            ? "Loading saved seeds…"
            : saved?.updatedAt
              ? `Last saved ${new Date(saved.updatedAt).toLocaleString()}`
              : "No override yet — this division uses the built-in seed."}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section>
            <SectionTitle>Identity</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Display name"
                value={draft.displayName}
                placeholder={brand?.name ?? "TransPerfect"}
                onChange={(v) => setDraft({ ...draft, displayName: v })}
              />
              <Field
                label="Accent colour"
                value={draft.accent}
                placeholder={brand?.tokens.accent ?? "#003FC7"}
                onChange={(v) => setDraft({ ...draft, accent: v })}
              />
              <Field
                label="Deep ink colour"
                value={draft.deep}
                placeholder={brand?.tokens.primary ?? "#03002C"}
                onChange={(v) => setDraft({ ...draft, deep: v })}
              />
            </div>
          </section>

          <section>
            <SectionTitle>Lockups</SectionTitle>
            <div className="grid gap-4">
              <Field
                label="Full-colour lockup URL (light pages)"
                value={draft.logoDark}
                placeholder="https://…"
                onChange={(v) => setDraft({ ...draft, logoDark: v })}
              />
              <Field
                label="Reversed lockup URL (dark pages)"
                value={draft.logoWhite}
                placeholder="https://…"
                onChange={(v) => setDraft({ ...draft, logoWhite: v })}
              />
            </div>
          </section>

          <section>
            <SectionTitle>Gradient fields</SectionTitle>
            <div className="grid gap-4">
              <Field
                label="Bright field (CSS gradient)"
                value={draft.brightField}
                placeholder="linear-gradient(…)"
                onChange={(v) => setDraft({ ...draft, brightField: v })}
              />
              <Field
                label="Deep field (CSS gradient)"
                value={draft.deepField}
                placeholder="linear-gradient(…)"
                onChange={(v) => setDraft({ ...draft, deepField: v })}
              />
            </div>
          </section>

          <section>
            <SectionTitle>{whyLabel} copy</SectionTitle>
            <div className="grid gap-4">
              <Field
                label="Eyebrow / nav label"
                value={draft.whyEyebrow}
                placeholder={`Why ${brand?.name ?? "TransPerfect"}`}
                onChange={(v) => setDraft({ ...draft, whyEyebrow: v })}
              />
              <Field
                label="Page title"
                value={draft.whyTitle}
                placeholder="WHY"
                onChange={(v) => setDraft({ ...draft, whyTitle: v })}
              />
              <Area
                label="Reason lines — one per line, *wrap* words for accent"
                value={draft.whyLines}
                placeholder={"UNMATCHED *GLOBAL SCALE* & RESOURCES\nGLOBAL *REACH*, LOCAL *FOCUS*"}
                rows={7}
                onChange={(v) => setDraft({ ...draft, whyLines: v })}
              />
              <Area
                label="Reason cards — one per line: Title | Body | icon"
                value={draft.whyCards}
                placeholder={"One partner, every language | 200+ languages, one team | globe-alt"}
                rows={7}
                onChange={(v) => setDraft({ ...draft, whyCards: v })}
              />
            </div>
            <p className="mt-2 text-xs text-black/50">
              Copy is stamped into new proposals when someone uses a template; existing documents
              stay editable and untouched.
            </p>
          </section>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SectionTitle>Preview</SectionTitle>
          <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-sm font-semibold text-black/80">{preview.name}</div>
            <div className="flex gap-2">
              <Swatch color={preview.accent} label="Accent" />
              <Swatch color={preview.deep} label="Deep" />
            </div>
            <div
              className="flex h-20 items-center justify-center rounded-xl px-3"
              style={{ background: preview.brightField }}
            >
              <img
                src={preview.logoDark}
                alt={`${preview.name} full-colour lockup`}
                className="max-h-8 max-w-full object-contain"
              />
            </div>
            <div
              className="flex h-20 items-center justify-center rounded-xl px-3"
              style={{ background: preview.deepField }}
            >
              <img
                src={preview.logoWhite}
                alt={`${preview.name} reversed lockup`}
                className="max-h-8 max-w-full object-contain"
              />
            </div>
            <div className="rounded-xl border border-black/10 p-3">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: preview.accent }}
              >
                {whyLabel}
              </div>
              <ul className="mt-1.5 space-y-1 text-xs text-black/70">
                {(draft.whyLines.split("\n").filter(Boolean).slice(0, 6).length
                  ? draft.whyLines.split("\n").filter(Boolean).slice(0, 6)
                  : ["Using the built-in reason lines"]
                ).map((line, i) => (
                  <li key={i}>{line.replace(/\*/g, "")}</li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
      {children}
    </h2>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-black/60">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-black/85"
      />
    </label>
  );
}

function Area({
  label,
  value,
  placeholder,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-black/60">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/15 bg-white p-3 font-mono text-xs text-black/85"
      />
    </label>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-black/10 p-2">
      <div className="h-8 rounded-lg" style={{ background: color }} />
      <div className="mt-1 text-[10px] uppercase tracking-wide text-black/45">{label}</div>
      <div className="font-mono text-[10px] text-black/60">{color}</div>
    </div>
  );
}
